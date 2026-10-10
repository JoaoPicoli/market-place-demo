import { Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { ApiError } from "../lib/api-error.js";
import { getDemoIdentity } from "../lib/demo-identity.js";
import { prisma } from "../lib/prisma.js";

const router = Router();
const idSchema = z.object({ id: z.coerce.number().int().positive().max(2_147_483_647) });
const bodySchema = z.object({
  title: z.string().trim().min(5).max(180),
  description: z.string().trim().min(10).max(8_000),
  categoryId: z.number().int().positive().max(2_147_483_647).optional(),
  neighborhoodId: z.number().int().positive().max(2_147_483_647).optional(),
  budgetMin: z.number().finite().nonnegative().max(99_999_999.99).optional(),
  budgetMax: z.number().finite().positive().max(99_999_999.99).optional(),
  desiredDate: z.string().datetime().optional(),
  providerProfileId: z.number().int().positive().max(2_147_483_647).optional(),
}).refine((value) => value.budgetMin === undefined || value.budgetMax === undefined || value.budgetMin <= value.budgetMax, {
  message: "O orçamento mínimo não pode ser maior que o máximo.",
  path: ["budgetMax"],
});

function invalidId() {
  throw new ApiError(400, "INVALID_ID", "O identificador informado é inválido.");
}

function invalidBody() {
  throw new ApiError(400, "INVALID_REQUEST", "Confira os campos e tente novamente.");
}

function publicRequest(request: {
  id: number;
  title: string;
  description: string;
  status: string;
  createdAt: Date;
  desiredDate: Date | null;
  budgetMin: Prisma.Decimal | null;
  budgetMax: Prisma.Decimal | null;
  city: string | null;
  region: string | null;
  category: { id: number; name: string } | null;
  neighborhood: { id: number; name: string; slug: string } | null;
}) {
  return {
    id: request.id,
    title: request.title,
    description: request.description,
    status: request.status,
    createdAt: request.createdAt,
    desiredDate: request.desiredDate,
    budgetMin: request.budgetMin === null ? null : Number(request.budgetMin),
    budgetMax: request.budgetMax === null ? null : Number(request.budgetMax),
    city: request.city,
    region: request.region,
    category: request.category,
    neighborhood: request.neighborhood,
  };
}

router.get("/", async (request, response) => {
  const identity = await getDemoIdentity(request.header("x-demo-user-id"));
  const requests = await prisma.serviceRequest.findMany({
    where: { clientUserId: identity.id },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    include: {
      category: { select: { id: true, name: true } },
      neighborhood: { select: { id: true, name: true, slug: true } },
      _count: { select: { conversations: true } },
    },
  });

  response.json({
    data: requests.map((item) => ({
      ...publicRequest(item),
      conversationCount: item._count.conversations,
    })),
  });
});

router.post("/", async (request, response) => {
  const identity = await getDemoIdentity(request.header("x-demo-user-id"));
  const parsed = bodySchema.safeParse(request.body);
  if (!parsed.success) invalidBody();
  const input = parsed.data!;

  const created = await prisma.$transaction(async (tx) => {
    if (input.categoryId !== undefined && !(await tx.category.findUnique({ where: { id: input.categoryId }, select: { id: true } }))) {
      throw new ApiError(400, "CATEGORY_NOT_FOUND", "A categoria selecionada não existe.");
    }

    if (input.neighborhoodId !== undefined) {
      const neighborhood = await tx.neighborhood.findUnique({ where: { id: input.neighborhoodId }, select: { id: true, city: true, state: true } });
      if (!neighborhood || neighborhood.city !== "Curitiba" || neighborhood.state !== "PR") {
        throw new ApiError(400, "NEIGHBORHOOD_NOT_FOUND", "Selecione um bairro válido de Curitiba.");
      }
    }

    if (input.providerProfileId !== undefined) {
      const provider = await tx.providerProfile.findUnique({
        where: { id: input.providerProfileId },
        select: { userId: true, user: { select: { isDemo: true, email: true } } },
      });
      if (!provider || !provider.user.isDemo || !provider.user.email.endsWith("@marketplace-demo.invalid")) {
        throw new ApiError(404, "PROVIDER_NOT_FOUND", "O prestador demonstrativo não está disponível.");
      }
      if (provider.userId === identity.id) {
        throw new ApiError(400, "SELF_CONVERSATION", "Não é possível iniciar uma conversa com o próprio perfil.");
      }
    }

    const serviceRequest = await tx.serviceRequest.create({
      data: {
        clientUserId: identity.id,
        categoryId: input.categoryId,
        neighborhoodId: input.neighborhoodId,
        title: input.title,
        description: input.description,
        city: "Curitiba",
        region: "PR",
        budgetMin: input.budgetMin === undefined ? undefined : new Prisma.Decimal(input.budgetMin),
        budgetMax: input.budgetMax === undefined ? undefined : new Prisma.Decimal(input.budgetMax),
        desiredDate: input.desiredDate === undefined ? undefined : new Date(input.desiredDate),
        status: "OPEN",
        isDemo: true,
      },
      include: {
        category: { select: { id: true, name: true } },
        neighborhood: { select: { id: true, name: true, slug: true } },
      },
    });

    const conversation = input.providerProfileId === undefined
      ? null
      : await tx.conversation.create({
          data: { serviceRequestId: serviceRequest.id, providerProfileId: input.providerProfileId },
          select: { id: true },
        });

    return { serviceRequest, conversation };
  });

  response.status(201).json({
    data: { ...publicRequest(created.serviceRequest), conversation: created.conversation },
  });
});

router.get("/:id", async (request, response) => {
  const identity = await getDemoIdentity(request.header("x-demo-user-id"));
  const parsed = idSchema.safeParse(request.params);
  if (!parsed.success) invalidId();

  const serviceRequest = await prisma.serviceRequest.findUnique({
    where: { id: parsed.data!.id },
    include: {
      category: { select: { id: true, name: true } },
      neighborhood: { select: { id: true, name: true, slug: true } },
      conversations: {
        orderBy: { createdAt: "asc" },
        include: {
          providerProfile: { select: { id: true, userId: true, user: { select: { name: true, avatarUrl: true } } } },
          _count: { select: { messages: true } },
          messages: { orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 1, select: { body: true, type: true, createdAt: true } },
        },
      },
      serviceOrders: {
        orderBy: [{ acceptedAt: "desc" }, { id: "desc" }],
        include: {
          acceptedQuoteVersion: {
            include: {
              items: { orderBy: { position: "asc" } },
              quote: {
                include: {
                  service: { select: { id: true, title: true } },
                  conversation: {
                    include: {
                      providerProfile: { select: { id: true, userId: true, user: { select: { name: true, avatarUrl: true } } } },
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

  if (!serviceRequest) throw new ApiError(404, "REQUEST_NOT_FOUND", "Solicitação não encontrada.");
  const isOwner = serviceRequest.clientUserId === identity.id;
  const participantConversations = serviceRequest.conversations.filter((item) => item.providerProfile.userId === identity.id);
  if (!isOwner && participantConversations.length === 0) {
    throw new ApiError(404, "REQUEST_NOT_FOUND", "Solicitação não encontrada.");
  }

  const visibleConversations = isOwner ? serviceRequest.conversations : participantConversations;
  const visibleProviderUserIds = new Set(visibleConversations.map((item) => item.providerProfile.userId));
  const visibleOrders = serviceRequest.serviceOrders.filter((order) =>
    isOwner || visibleProviderUserIds.has(order.acceptedQuoteVersion.quote.conversation.providerProfile.userId),
  );
  response.json({
    data: {
      ...publicRequest(serviceRequest),
      viewerRole: isOwner ? "CUSTOMER" : "PROVIDER",
      conversationCount: visibleConversations.length,
      conversations: visibleConversations.map((item) => ({
        id: item.id,
        status: item.status,
        createdAt: item.createdAt,
        providerProfile: {
          id: item.providerProfile.id,
          name: item.providerProfile.user.name,
          avatarUrl: item.providerProfile.user.avatarUrl,
        },
        messageCount: item._count.messages,
        latestMessage: item.messages[0] ?? null,
      })),
      serviceOrders: visibleOrders.map((order) => ({
        id: order.id,
        status: order.status,
        acceptedAt: order.acceptedAt,
        startedAt: order.startedAt,
        completedAt: order.completedAt,
        cancelledAt: order.cancelledAt,
        provider: {
          id: order.acceptedQuoteVersion.quote.conversation.providerProfile.id,
          name: order.acceptedQuoteVersion.quote.conversation.providerProfile.user.name,
          avatarUrl: order.acceptedQuoteVersion.quote.conversation.providerProfile.user.avatarUrl,
        },
        acceptedVersion: {
          id: order.acceptedQuoteVersion.id,
          quoteId: order.acceptedQuoteVersion.quoteId,
          version: order.acceptedQuoteVersion.version,
          status: order.acceptedQuoteVersion.status,
          serviceTitleSnapshot: order.acceptedQuoteVersion.serviceTitleSnapshot,
          scopeDescription: order.acceptedQuoteVersion.scopeDescription,
          totalAmount: order.acceptedQuoteVersion.totalAmount.toFixed(2),
          estimatedDurationDays: order.acceptedQuoteVersion.estimatedDurationDays,
          items: order.acceptedQuoteVersion.items.map((item) => ({
            id: item.id,
            position: item.position,
            description: item.description,
            quantity: item.quantity.toFixed(2),
            unitPrice: item.unitPrice.toFixed(2),
          })),
        },
      })),
    },
  });
});

router.post("/:id/conversations", async (request, response) => {
  const identity = await getDemoIdentity(request.header("x-demo-user-id"));
  const parsedId = idSchema.safeParse(request.params);
  if (!parsedId.success) invalidId();
  const body = z.object({ providerProfileId: z.number().int().positive().max(2_147_483_647) }).safeParse(request.body);
  if (!body.success) invalidBody();

  const result = await prisma.$transaction(async (tx) => {
    const serviceRequest = await tx.serviceRequest.findUnique({ where: { id: parsedId.data!.id }, select: { id: true, clientUserId: true, status: true } });
    if (!serviceRequest || serviceRequest.clientUserId !== identity.id) {
      throw new ApiError(404, "REQUEST_NOT_FOUND", "Solicitação não encontrada.");
    }
    if (serviceRequest.status !== "OPEN") {
      throw new ApiError(409, "REQUEST_NOT_OPEN", "Só é possível iniciar novas conversas com uma solicitação aberta.");
    }

    const provider = await tx.providerProfile.findUnique({
      where: { id: body.data!.providerProfileId },
      select: { userId: true, user: { select: { isDemo: true, email: true } } },
    });
    if (!provider || !provider.user.isDemo || !provider.user.email.endsWith("@marketplace-demo.invalid")) {
      throw new ApiError(404, "PROVIDER_NOT_FOUND", "O prestador demonstrativo não está disponível.");
    }
    if (provider.userId === identity.id) {
      throw new ApiError(400, "SELF_CONVERSATION", "Não é possível iniciar uma conversa com o próprio perfil.");
    }

    const where = { serviceRequestId_providerProfileId: { serviceRequestId: serviceRequest.id, providerProfileId: body.data!.providerProfileId } };
    const existing = await tx.conversation.findUnique({ where, select: { id: true } });
    const conversation = await tx.conversation.upsert({
      where,
      create: { serviceRequestId: serviceRequest.id, providerProfileId: body.data!.providerProfileId },
      update: {},
      select: { id: true, status: true, serviceRequestId: true, providerProfileId: true },
    });
    return { conversation, reused: existing !== null };
  });

  response.status(200).json({ data: result.conversation, reused: result.reused });
});

export default router;
