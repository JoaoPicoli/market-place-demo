import { Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { ApiError } from "../lib/api-error.js";
import { prisma } from "../lib/prisma.js";

const router = Router();

const listQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  categoryId: z.coerce.number().int().positive().max(2_147_483_647).optional(),
  neighborhoodId: z.coerce.number().int().positive().max(2_147_483_647).optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(12),
});

const idParamSchema = z.object({ id: z.coerce.number().int().positive().max(2_147_483_647) });

router.get("/", async (request, response) => {
  const parsed = listQuerySchema.safeParse(request.query);
  if (!parsed.success) {
    throw new ApiError(400, "INVALID_QUERY", "Os filtros informados são inválidos.");
  }

  const { q, categoryId, neighborhoodId, page, limit } = parsed.data;
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

  if (neighborhoodId !== undefined) {
    conditions.push({
      OR: [
        { referenceNeighborhoodId: neighborhoodId },
        { serviceAreas: { some: { neighborhoodId } } },
      ],
    });
  }

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

  const where: Prisma.ProviderProfileWhereInput = { AND: conditions };
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

  response.json({
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
  });
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

export default router;
