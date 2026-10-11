import { Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { ApiError } from "../lib/api-error.js";
import { interpretProviderSearch } from "../lib/ai-provider-search.js";
import { CURITIBA_REGIONS, findCuritibaRegion } from "../lib/curitiba-regions.js";
import { prisma } from "../lib/prisma.js";

const router = Router();

const listQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  categoryId: z.coerce.number().int().positive().max(2_147_483_647).optional(),
  neighborhoodId: z.coerce.number().int().positive().max(2_147_483_647).optional(),
  regionSlug: z.string().trim().min(1).max(64).optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(12),
});

const coverageQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  categoryId: z.coerce.number().int().positive().max(2_147_483_647).optional(),
});

const idParamSchema = z.object({ id: z.coerce.number().int().positive().max(2_147_483_647) });
const aiSearchBodySchema = z.object({
  query: z.string().trim().min(3).max(500),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  limit: z.coerce.number().int().min(1).max(24).default(12),
}).strict();

const aiSearchRequests = new Map<string, { count: number; resetsAt: number }>();

router.post("/ai-search", async (request, response) => {
  const parsed = aiSearchBodySchema.safeParse(request.body);
  if (!parsed.success) {
    throw new ApiError(400, "INVALID_AI_SEARCH", "Descreva o que você precisa em até 500 caracteres.");
  }
  enforceAiSearchLimit(request.ip ?? "unknown");

  const [categories, neighborhoods] = await Promise.all([
    prisma.category.findMany({
      where: { services: { some: { isActive: true } } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.neighborhood.findMany({
      where: { city: "Curitiba", state: "PR" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const intent = await interpretProviderSearch(parsed.data.query, {
    categories: categories.map(({ name }) => name),
    neighborhoods: neighborhoods.map(({ name }) => name),
  });

  if (intent.minPrice !== null && intent.maxPrice !== null && intent.minPrice > intent.maxPrice) {
    throw new ApiError(502, "AI_SEARCH_INVALID_FILTERS", "A faixa de preço interpretada não é válida. Reformule o limite informado.");
  }

  const category = findCatalogMatch(categories, intent.categoryName);
  const neighborhood = findCatalogMatch(neighborhoods, intent.neighborhoodName);
  const priceRange: Prisma.DecimalFilter = {};
  if (intent.minPrice !== null) priceRange.gte = new Prisma.Decimal(intent.minPrice.toFixed(2));
  if (intent.maxPrice !== null) priceRange.lte = new Prisma.Decimal(intent.maxPrice.toFixed(2));

  const serviceWhere: Prisma.ServiceWhereInput = {
    isActive: true,
    ...(category ? { categoryId: category.id } : {}),
    ...(Object.keys(priceRange).length ? { referencePrice: priceRange } : {}),
  };
  const conditions: Prisma.ProviderProfileWhereInput[] = [{ services: { some: serviceWhere } }];

  conditions.push({
    OR: intent.searchTerms.flatMap((term) => [
      { user: { name: { contains: term } } },
      { bio: { contains: term } },
      { serviceArea: { contains: term } },
      {
        services: {
          some: {
            ...serviceWhere,
            OR: [
              { title: { contains: term } },
              { description: { contains: term } },
              { category: { name: { contains: term } } },
            ],
          },
        },
      },
    ]),
  });

  if (neighborhood) {
    conditions.push({
      OR: [
        { referenceNeighborhoodId: neighborhood.id },
        { serviceAreas: { some: { neighborhoodId: neighborhood.id } } },
      ],
    });
  }
  if (intent.minExperienceYears !== null) {
    conditions.push({ yearsExperience: { gte: intent.minExperienceYears } });
  }
  if (intent.availableSaturday === true) {
    conditions.push({ availability: { some: { isActive: true, dayOfWeek: 6 } } });
  }

  const page = await getProviderPage({ AND: conditions }, parsed.data.page, parsed.data.limit, serviceWhere);
  response.json({
    ...page,
    interpretation: {
      summary: intent.summary,
      category: category ? { id: category.id, name: category.name } : null,
      neighborhood: neighborhood ? { id: neighborhood.id, name: neighborhood.name } : null,
      minPrice: intent.minPrice,
      maxPrice: intent.maxPrice,
      minExperienceYears: intent.minExperienceYears,
      availableSaturday: intent.availableSaturday === true ? true : null,
      searchTerms: intent.searchTerms,
    },
  });
});

router.get("/", async (request, response) => {
  const parsed = listQuerySchema.safeParse(request.query);
  if (!parsed.success) {
    throw new ApiError(400, "INVALID_QUERY", "Os filtros informados são inválidos.");
  }

  const { q, categoryId, neighborhoodId, regionSlug, page, limit } = parsed.data;
  const conditions = buildProviderConditions(q, categoryId);

  if (neighborhoodId !== undefined) {
    conditions.push({
      OR: [
        { referenceNeighborhoodId: neighborhoodId },
        { serviceAreas: { some: { neighborhoodId } } },
      ],
    });
  }

  if (regionSlug !== undefined) {
    const region = await getRegionNeighborhoods(regionSlug);
    conditions.push(providerCoverageCondition(region.neighborhoods.map((neighborhood) => neighborhood.id)));
  }

  const where: Prisma.ProviderProfileWhereInput = { AND: conditions };
  response.json(await getProviderPage(where, page, limit));
});

router.get("/coverage", async (request, response) => {
  const parsed = coverageQuerySchema.safeParse(request.query);
  if (!parsed.success) {
    throw new ApiError(400, "INVALID_QUERY", "Os filtros informados para o mapa são inválidos.");
  }

  const allNeighborhoodSlugs = CURITIBA_REGIONS.flatMap((region) => region.neighborhoodSlugs);
  const neighborhoods = allNeighborhoodSlugs.length
    ? await prisma.neighborhood.findMany({
        where: { city: "Curitiba", state: "PR", slug: { in: allNeighborhoodSlugs } },
        select: { id: true, slug: true, name: true },
      })
    : [];
  const neighborhoodsBySlug = new Map(neighborhoods.map((neighborhood) => [neighborhood.slug, neighborhood]));
  const searchConditions = buildProviderConditions(parsed.data.q, parsed.data.categoryId);
  const totalProviderCount = await prisma.providerProfile.count({ where: { AND: searchConditions } });
  const regions = await Promise.all(CURITIBA_REGIONS.map(async (region) => {
    const regionNeighborhoods = region.neighborhoodSlugs
      .map((slug) => neighborhoodsBySlug.get(slug))
      .filter((neighborhood): neighborhood is NonNullable<typeof neighborhood> => neighborhood !== undefined);
    const providerCount = regionNeighborhoods.length
      ? await prisma.providerProfile.count({
          where: {
            AND: [
              ...searchConditions,
              providerCoverageCondition(regionNeighborhoods.map((neighborhood) => neighborhood.id)),
            ],
          },
        })
      : null;

    return {
      slug: region.slug,
      name: region.name,
      providerCount,
      neighborhoods: regionNeighborhoods.map(({ id, slug, name }) => ({ id, slug, name })),
    };
  }));

  response.json({ data: regions, totalProviderCount, city: "Curitiba", state: "PR" });
});

router.get("/:id", async (request, response) => {
  const parsed = idParamSchema.safeParse(request.params);
  if (!parsed.success) {
    throw new ApiError(400, "INVALID_PROVIDER_ID", "O identificador do prestador é inválido.");
  }

  const provider = await prisma.providerProfile.findUnique({
    where: { id: parsed.data.id },
    include: {
      user: { select: { name: true, avatarUrl: true, isDemo: true } },
      referenceNeighborhood: { select: { id: true, slug: true, name: true } },
      serviceAreas: {
        orderBy: { neighborhood: { name: "asc" } },
        select: { neighborhood: { select: { id: true, slug: true, name: true } } },
      },
      services: {
        where: { isActive: true },
        orderBy: { title: "asc" },
        select: {
          id: true,
          title: true,
          description: true,
          referencePrice: true,
          category: { select: { id: true, name: true, slug: true } },
        },
      },
      availability: {
        where: { isActive: true },
        orderBy: [{ dayOfWeek: "asc" }, { startMinute: "asc" }],
        select: { id: true, dayOfWeek: true, startMinute: true, endMinute: true, timeZone: true },
      },
      portfolioItems: {
        orderBy: { createdAt: "desc" },
        include: {
          images: { orderBy: { position: "asc" }, select: { id: true, imageUrl: true, altText: true } },
          service: { select: { id: true, title: true } },
          serviceOrder: {
            select: {
              isDemo: true,
              status: true,
              acceptedQuoteVersion: {
                select: {
                  quote: {
                    select: {
                      conversation: { select: { providerProfileId: true } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!provider) {
    throw new ApiError(404, "PROVIDER_NOT_FOUND", "Prestador não encontrado.");
  }

  const reviewScope = {
    serviceOrder: {
      status: "COMPLETED" as const,
      acceptedQuoteVersion: {
        quote: { conversation: { providerProfileId: provider.id } },
      },
    },
  };
  const [realReviews, demoReviews] = await Promise.all([
    provider.user.isDemo
      ? Promise.resolve({ _avg: { rating: null }, _count: { _all: 0 } })
      : prisma.review.aggregate({
          where: { ...reviewScope, isDemo: false, serviceOrder: { ...reviewScope.serviceOrder, isDemo: false } },
          _avg: { rating: true },
          _count: { _all: true },
        }),
    prisma.review.findMany({
      where: { ...reviewScope, isDemo: true, serviceOrder: { ...reviewScope.serviceOrder, isDemo: true } },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, rating: true, comment: true, createdAt: true },
    }),
  ]);
  const referencePrices = provider.services
    .map((service) => service.referencePrice)
    .filter((price): price is NonNullable<typeof price> => price !== null)
    .map(Number);

  response.json({
    data: {
      id: provider.id,
      name: provider.user.name,
      avatarUrl: provider.user.avatarUrl,
      isDemo: provider.user.isDemo,
      bio: provider.bio,
      serviceArea: provider.serviceArea,
      yearsExperience: provider.yearsExperience,
      referenceNeighborhood: provider.referenceNeighborhood,
      serviceAreas: provider.serviceAreas.map((area) => area.neighborhood),
      services: provider.services.map((service) => ({
        ...service,
        referencePrice: service.referencePrice === null ? null : Number(service.referencePrice),
      })),
      minReferencePrice: referencePrices.length ? Math.min(...referencePrices) : null,
      availability: provider.availability,
      portfolio: provider.portfolioItems.map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        isDemo: item.isDemo,
        service: item.service,
        isVerified: !item.isDemo
          && item.serviceOrder !== null
          && !item.serviceOrder.isDemo
          && item.serviceOrder.status === "COMPLETED"
          && item.serviceOrder.acceptedQuoteVersion.quote.conversation.providerProfileId === provider.id,
        images: item.images,
      })),
      reputation: {
        average: realReviews._avg.rating === null ? null : Number(realReviews._avg.rating.toFixed(1)),
        count: realReviews._count._all,
      },
      demoReviews: demoReviews.map((review) => ({ ...review, isDemo: true as const })),
    },
  });
});

function buildProviderConditions(q?: string, categoryId?: number): Prisma.ProviderProfileWhereInput[] {
  const conditions: Prisma.ProviderProfileWhereInput[] = [
    {
      services: {
        some: {
          isActive: true,
          ...(categoryId === undefined ? {} : { categoryId }),
        },
      },
    },
  ];

  if (q) {
    conditions.push({
      OR: [
        { user: { name: { contains: q } } },
        { bio: { contains: q } },
        { serviceArea: { contains: q } },
        {
          services: {
            some: {
              isActive: true,
              OR: [
                { title: { contains: q } },
                { description: { contains: q } },
                { category: { name: { contains: q } } },
              ],
            },
          },
        },
      ],
    });
  }

  return conditions;
}

async function getProviderPage(
  where: Prisma.ProviderProfileWhereInput,
  page: number,
  limit: number,
  serviceWhere: Prisma.ServiceWhereInput = { isActive: true },
) {
  const skip = (page - 1) * limit;
  const [profiles, total] = await prisma.$transaction([
    prisma.providerProfile.findMany({
      where,
      orderBy: { id: "asc" },
      skip,
      take: limit,
      include: {
        user: { select: { name: true, avatarUrl: true, isDemo: true } },
        referenceNeighborhood: { select: { id: true, slug: true, name: true } },
        serviceAreas: {
          orderBy: { neighborhood: { name: "asc" } },
          select: { neighborhood: { select: { id: true, slug: true, name: true } } },
        },
        services: {
          where: serviceWhere,
          orderBy: { title: "asc" },
          select: {
            id: true,
            title: true,
            description: true,
            referencePrice: true,
            category: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    }),
    prisma.providerProfile.count({ where }),
  ]);

  const profileIds = profiles.map((profile) => profile.id);
  const realReviews = profileIds.length
    ? await prisma.review.findMany({
        where: {
          isDemo: false,
          serviceOrder: {
            isDemo: false,
            status: "COMPLETED",
            acceptedQuoteVersion: {
              quote: { conversation: { providerProfileId: { in: profileIds } } },
            },
          },
        },
        select: {
          rating: true,
          serviceOrder: {
            select: {
              acceptedQuoteVersion: {
                select: {
                  quote: {
                    select: {
                      conversation: { select: { providerProfileId: true } },
                    },
                  },
                },
              },
            },
          },
        },
      })
    : [];

  const ratingsByProvider = new Map<number, number[]>();
  for (const review of realReviews) {
    const providerId = review.serviceOrder.acceptedQuoteVersion.quote.conversation.providerProfileId;
    const provider = profiles.find((item) => item.id === providerId);
    if (!provider || provider.user.isDemo) continue;
    const ratings = ratingsByProvider.get(providerId) ?? [];
    ratings.push(review.rating);
    ratingsByProvider.set(providerId, ratings);
  }

  return {
    data: profiles.map((profile) => {
      const prices = profile.services
        .map((service) => (service.referencePrice === null ? null : Number(service.referencePrice)))
        .filter((price): price is number => price !== null);
      const ratings = profile.user.isDemo ? [] : ratingsByProvider.get(profile.id) ?? [];

      return {
        id: profile.id,
        name: profile.user.name,
        avatarUrl: profile.user.avatarUrl,
        isDemo: profile.user.isDemo,
        bio: profile.bio,
        serviceArea: profile.serviceArea,
        yearsExperience: profile.yearsExperience,
        referenceNeighborhood: profile.referenceNeighborhood,
        serviceAreas: profile.serviceAreas.map((area) => area.neighborhood),
        services: profile.services.map((service) => ({
          ...service,
          referencePrice: service.referencePrice === null ? null : Number(service.referencePrice),
        })),
        minReferencePrice: prices.length ? Math.min(...prices) : null,
        reputation: {
          average: ratings.length
            ? Number((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length).toFixed(1))
            : null,
          count: ratings.length,
        },
      };
    }),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

function findCatalogMatch<T extends { name: string }>(items: T[], requestedName: string | null): T | null {
  if (!requestedName) return null;
  const normalized = normalizeCatalogName(requestedName);
  return items.find((item) => normalizeCatalogName(item.name) === normalized) ?? null;
}

function normalizeCatalogName(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase("pt-BR");
}

function enforceAiSearchLimit(ip: string): void {
  const now = Date.now();
  for (const [key, bucket] of aiSearchRequests) {
    if (bucket.resetsAt <= now) aiSearchRequests.delete(key);
  }

  const bucket = aiSearchRequests.get(ip);
  if (bucket && bucket.resetsAt > now && bucket.count >= 12) {
    throw new ApiError(429, "AI_SEARCH_RATE_LIMITED", "Você fez várias buscas em pouco tempo. Aguarde um minuto e tente novamente.");
  }
  if (!bucket || bucket.resetsAt <= now) {
    aiSearchRequests.set(ip, { count: 1, resetsAt: now + 60_000 });
  } else {
    bucket.count += 1;
  }
}

async function getRegionNeighborhoods(regionSlug: string) {
  const region = findCuritibaRegion(regionSlug);
  if (!region) {
    throw new ApiError(400, "INVALID_REGION", "A regional selecionada não pertence a Curitiba.");
  }

  const neighborhoods = region.neighborhoodSlugs.length
    ? await prisma.neighborhood.findMany({
        where: { city: "Curitiba", state: "PR", slug: { in: [...region.neighborhoodSlugs] } },
        select: { id: true, slug: true, name: true },
      })
    : [];

  return { region, neighborhoods };
}

function providerCoverageCondition(neighborhoodIds: number[]): Prisma.ProviderProfileWhereInput {
  return {
    OR: [
      { referenceNeighborhoodId: { in: neighborhoodIds } },
      { serviceAreas: { some: { neighborhoodId: { in: neighborhoodIds } } } },
    ],
  };
}

export default router;
