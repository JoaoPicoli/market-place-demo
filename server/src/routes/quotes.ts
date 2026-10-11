import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { ApiError } from "../lib/api-error.js";
import { getDemoIdentity } from "../lib/demo-identity.js";
import { prisma } from "../lib/prisma.js";

const router = Router();
const idSchema = z.object({ id: z.coerce.number().int().positive().max(2_147_483_647) });
const keySchema = z.string().trim().min(16).max(64).regex(/^[A-Za-z0-9._:-]+$/);
const moneySchema = z.string().regex(/^\d{1,8}(?:\.\d{1,2})?$/, "Informe um valor com até duas casas decimais.");
const dateSchema = z.string().datetime();
const itemSchema = z.object({
  description: z.string().trim().min(2).max(255),
  quantity: z.string().regex(/^\d{1,8}(?:\.\d{1,2})?$/),
  unitPrice: moneySchema,
});
const quoteBodySchema = z.object({
  serviceId: z.number().int().positive().max(2_147_483_647).optional(),
  serviceTitleSnapshot: z.string().trim().min(2).max(180).optional(),
  scopeDescription: z.string().trim().min(10).max(8_000),
  totalAmount: moneySchema,
  items: z.array(itemSchema).min(1).max(30),
  estimatedDurationDays: z.number().int().positive().max(3_650).optional(),
  validUntil: dateSchema,
  proposedStartAt: dateSchema.optional(),
  proposedEndAt: dateSchema.optional(),
  terms: z.string().trim().max(8_000).optional(),
}).refine((value) => (value.proposedStartAt === undefined) === (value.proposedEndAt === undefined), {
  message: "Informe a janela de atendimento completa ou deixe os dois campos vazios.",
  path: ["proposedEndAt"],
}).refine((value) => value.proposedStartAt === undefined || new Date(value.proposedStartAt) < new Date(value.proposedEndAt!), {
  message: "O fim da janela deve ocorrer depois do início.",
  path: ["proposedEndAt"],
});

const quoteInclude = {
  service: { select: { id: true, title: true } },
  conversation: {
    select: {
      id: true,
      status: true,
      serviceRequest: {
        select: {
          id: true,
          clientUserId: true,
          title: true,
          status: true,
          reopenedAt: true,
          serviceOrders: { select: { id: true, status: true, cancelledAt: true, completedAt: true } },
        },
      },
      providerProfile: {
        select: { id: true, userId: true, user: { select: { name: true, avatarUrl: true, isDemo: true } } },
      },
    },
  },
  versions: {
    orderBy: { version: "asc" as const },
    include: {
      items: { orderBy: { position: "asc" as const } },
      previousVersion: { select: { id: true, version: true } },
      nextVersion: { select: { id: true, version: true } },
      message: { select: { id: true, createdAt: true } },
    },
  },
} satisfies Prisma.QuoteInclude;

function invalidId() {
  throw new ApiError(400, "INVALID_ID", "O identificador informado é inválido.");
}

function parseId(raw: unknown) {
  const parsed = idSchema.safeParse(raw);
  if (!parsed.success) invalidId();
  return parsed.data!.id;
}

function parseQuoteInput(raw: unknown) {
  const parsed = quoteBodySchema.safeParse(raw);
  if (!parsed.success) {
    throw new ApiError(400, "INVALID_QUOTE", "Confira os dados do orçamento. Itens, valores e datas precisam ser válidos.");
  }
  const input = parsed.data;
  const total = new Prisma.Decimal(input.totalAmount);
  const sum = input.items.reduce((acc, item) => {
    const quantity = new Prisma.Decimal(item.quantity);
    const unitPrice = new Prisma.Decimal(item.unitPrice);
    if (quantity.lte(0)) throw new ApiError(400, "INVALID_QUOTE_ITEM", "A quantidade de cada item deve ser maior que zero.");
    return acc.plus(quantity.mul(unitPrice).toDecimalPlaces(2, 4));
  }, new Prisma.Decimal(0));

  if (total.lte(0) || !sum.equals(total)) {
    throw new ApiError(400, "QUOTE_TOTAL_MISMATCH", "O valor total precisa corresponder à soma dos itens, arredondada para centavos.");
  }
  if (new Date(input.validUntil).getTime() <= Date.now()) {
    throw new ApiError(400, "QUOTE_ALREADY_EXPIRED", "A validade do orçamento precisa estar no futuro.");
  }

  return input;
}

function makePayloadHash(input: z.infer<typeof quoteBodySchema>, context: { serviceId: number | null; serviceTitle: string | null; quoteId?: number }) {
  const canonical = {
    ...context,
    scopeDescription: input.scopeDescription,
    totalAmount: new Prisma.Decimal(input.totalAmount).toFixed(2),
    items: input.items.map((item) => ({
      description: item.description,
      quantity: new Prisma.Decimal(item.quantity).toFixed(2),
      unitPrice: new Prisma.Decimal(item.unitPrice).toFixed(2),
    })),
    estimatedDurationDays: input.estimatedDurationDays ?? null,
    validUntil: new Date(input.validUntil).toISOString(),
    proposedStartAt: input.proposedStartAt ? new Date(input.proposedStartAt).toISOString() : null,
    proposedEndAt: input.proposedEndAt ? new Date(input.proposedEndAt).toISOString() : null,
    terms: input.terms || null,
  };
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}

function readIdempotencyKey(raw: string | undefined) {
  const parsed = keySchema.safeParse(raw);
  if (!parsed.success) throw new ApiError(400, "IDEMPOTENCY_KEY_REQUIRED", "Envie uma chave Idempotency-Key válida para esta operação.");
  return parsed.data;
}

function isPrismaCode(error: unknown, code: string) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;
}

function ensureQuoteAccess(quote: NonNullable<Awaited<ReturnType<typeof loadQuote>>>, identityId: number) {
  const isOwner = quote.conversation.serviceRequest.clientUserId === identityId;
  const isProvider = quote.conversation.providerProfile.userId === identityId;
  if (!isOwner && !isProvider) throw new ApiError(404, "QUOTE_NOT_FOUND", "Orçamento não encontrado.");
  return { isOwner, isProvider };
}

async function loadQuote(quoteId: number) {
  return prisma.quote.findUnique({ where: { id: quoteId }, include: quoteInclude });
}

async function getRealRatings(providerIds: number[]) {
  const ratings = new Map<number, number[]>();
  if (providerIds.length === 0) return ratings;
  const rows = await prisma.review.findMany({
    where: {
      isDemo: false,
      serviceOrder: {
        isDemo: false,
        status: "COMPLETED",
        acceptedQuoteVersion: {
          quote: { conversation: { providerProfileId: { in: providerIds } } },
        },
      },
    },
    select: {
      rating: true,
      serviceOrder: {
        select: { acceptedQuoteVersion: { select: { quote: { select: { conversation: { select: { providerProfileId: true } } } } } } },
      },
    },
  });
  for (const row of rows) {
    const providerId = row.serviceOrder.acceptedQuoteVersion.quote.conversation.providerProfileId;
    const values = ratings.get(providerId) ?? [];
    values.push(row.rating);
    ratings.set(providerId, values);
  }
  return ratings;
}

function isValidVersionChain(versions: Array<{ version: number; previousVersionId: number | null; id: number }>) {
  return versions.every((version, index) => version.version === index + 1 && version.previousVersionId === (index === 0 ? null : versions[index - 1].id));
}

function wasRequestReopenedAfterCancellations(
  orders: Array<{ status: string; cancelledAt: Date | null }>,
  reopenedAt: Date | null,
) {
  const cancelledOrders = orders.filter((order) => order.status === "CANCELLED");
  if (cancelledOrders.length === 0) return true;
  if (!reopenedAt || cancelledOrders.some((order) => order.cancelledAt === null)) return false;
  const latestCancellation = cancelledOrders.reduce<Date>((latest, order) => order.cancelledAt! > latest ? order.cancelledAt! : latest, cancelledOrders[0].cancelledAt!);
  return reopenedAt > latestCancellation;
}

function quoteResponse(quote: NonNullable<Awaited<ReturnType<typeof loadQuote>>>, ratings: Map<number, number[]>) {
  const { conversation } = quote;
  const request = conversation.serviceRequest;
  const provider = conversation.providerProfile;
  const providerRatings = provider.user.isDemo ? [] : ratings.get(provider.id) ?? [];
  const activeOrder = request.serviceOrders.some((order) => order.status === "ACCEPTED" || order.status === "IN_PROGRESS");
  const completedOrder = request.serviceOrders.some((order) => order.status === "COMPLETED");
  const reopenedAfterCancellation = wasRequestReopenedAfterCancellations(request.serviceOrders, request.reopenedAt);
  const chainValid = isValidVersionChain(quote.versions);
  const leafVersions = quote.versions.filter((version) => version.nextVersion === null);
  const currentVersionId = chainValid && leafVersions.length === 1 ? leafVersions[0].id : null;
  const now = Date.now();

  return {
    id: quote.id,
    conversationId: conversation.id,
    serviceRequestId: request.id,
    service: quote.service,
    provider: {
      id: provider.id,
      name: provider.user.name,
      avatarUrl: provider.user.avatarUrl,
      isDemo: provider.user.isDemo,
      reputation: {
        average: providerRatings.length ? Number((providerRatings.reduce((sum, value) => sum + value, 0) / providerRatings.length).toFixed(1)) : null,
        count: providerRatings.length,
      },
    },
    createdAt: quote.createdAt,
    currentVersionId,
    canRevise: request.status === "OPEN" && conversation.status === "OPEN"
      && currentVersionId !== null
      && quote.versions.some((version) => version.id === currentVersionId && version.status === "SENT" && version.validUntil.getTime() > now),
    versions: quote.versions.map((version) => {
      const isCurrent = version.id === currentVersionId;
      const isExpired = version.status === "SENT" && version.validUntil.getTime() <= now;
      const canAccept = isCurrent && version.status === "SENT" && !isExpired
        && request.status === "OPEN" && conversation.status === "OPEN"
        && !activeOrder && !completedOrder && reopenedAfterCancellation;
      const canRestore = isCurrent && version.status === "REJECTED" && version.validUntil.getTime() > now
        && request.status === "OPEN" && conversation.status === "OPEN"
        && !activeOrder && !completedOrder && reopenedAfterCancellation;
      let restoreUnavailableReason: string | null = null;
      if (isCurrent && version.status === "REJECTED" && !canRestore) {
        if (version.validUntil.getTime() <= now) restoreUnavailableReason = "A validade desta proposta terminou.";
        else if (completedOrder) restoreUnavailableReason = "Esta solicitação já foi concluída e não pode gerar outra contratação.";
        else if (activeOrder) restoreUnavailableReason = "Há um pedido ativo para esta solicitação.";
        else if (request.status !== "OPEN") restoreUnavailableReason = "Reabra a solicitação antes de restaurar uma proposta.";
        else if (conversation.status !== "OPEN") restoreUnavailableReason = "Esta conversa está encerrada.";
        else if (!reopenedAfterCancellation) restoreUnavailableReason = "Depois do cancelamento, reabra a solicitação para negociar novamente.";
        else restoreUnavailableReason = "Esta proposta não atende às condições para restauração.";
      }
      return {
        id: version.id,
        version: version.version,
        previousVersionId: version.previousVersionId,
        scopeDescription: version.scopeDescription,
        serviceTitleSnapshot: version.serviceTitleSnapshot,
        totalAmount: version.totalAmount.toFixed(2),
        estimatedDurationDays: version.estimatedDurationDays,
        validUntil: version.validUntil,
        proposedStartAt: version.proposedStartAt,
        proposedEndAt: version.proposedEndAt,
        terms: version.terms,
        status: isExpired ? "EXPIRED" : version.status,
        storedStatus: version.status,
        isCurrent,
        canAccept,
        canRestore,
        restoreUnavailableReason,
        message: version.message,
        items: version.items.map((item) => ({
          id: item.id,
          position: item.position,
          description: item.description,
          quantity: item.quantity.toFixed(2),
          unitPrice: item.unitPrice.toFixed(2),
        })),
      };
    }),
  };
}

async function publicQuote(quoteId: number) {
  const quote = await loadQuote(quoteId);
  if (!quote) throw new ApiError(404, "QUOTE_NOT_FOUND", "Orçamento não encontrado.");
  const ratings = await getRealRatings([quote.conversation.providerProfile.id]);
  return quoteResponse(quote, ratings);
}

async function lockConversation(tx: Prisma.TransactionClient, conversationId: number) {
  await tx.$queryRaw<Array<{ id: number }>>`SELECT id FROM Conversation WHERE id = ${conversationId} FOR UPDATE`;
}

async function lockQuote(tx: Prisma.TransactionClient, quoteId: number) {
  await tx.$queryRaw<Array<{ id: number }>>`SELECT id FROM Quote WHERE id = ${quoteId} FOR UPDATE`;
}

async function lockRequest(tx: Prisma.TransactionClient, requestId: number) {
  await tx.$queryRaw<Array<{ id: number }>>`SELECT id FROM ServiceRequest WHERE id = ${requestId} FOR UPDATE`;
}

function checkIdempotent(existing: { id: number; idempotencyHash: string | null; conversationId?: number; quoteId?: number }, hash: string, relationId: number, relationKey: "conversationId" | "quoteId") {
  const existingRelationId = existing[relationKey];
  if (existing.idempotencyHash !== hash || existingRelationId !== relationId) {
    throw new ApiError(409, "IDEMPOTENCY_KEY_REUSED", "Esta chave já foi usada com dados diferentes.");
  }
}

router.post("/conversations/:id/quotes", async (request, response) => {
  const identity = await getDemoIdentity(request.header("x-demo-user-id"));
  const conversationId = parseId(request.params);
  const key = readIdempotencyKey(request.header("idempotency-key"));
  const input = parseQuoteInput(request.body);

  if (!identity.providerProfile) throw new ApiError(404, "CONVERSATION_NOT_FOUND", "Conversa não encontrada.");
  const identityProviderProfileId = identity.providerProfile.id;

  let quoteId: number;
  let replayed = false;
  try {
    const result = await prisma.$transaction(async (tx) => {
      await lockConversation(tx, conversationId);
      const conversation = await tx.conversation.findUnique({
        where: { id: conversationId },
        select: {
          id: true,
          status: true,
          serviceRequest: { select: { id: true, status: true } },
          providerProfile: { select: { id: true, userId: true } },
        },
      });
      if (!conversation || conversation.providerProfile.userId !== identity.id || conversation.providerProfile.id !== identityProviderProfileId) {
        throw new ApiError(404, "CONVERSATION_NOT_FOUND", "Conversa não encontrada.");
      }

      const service = input.serviceId === undefined ? null : await tx.service.findUnique({
        where: { id: input.serviceId },
        select: { id: true, title: true, providerProfileId: true, isActive: true },
      });
      if (input.serviceId !== undefined && (!service || service.providerProfileId !== conversation.providerProfile.id || !service.isActive)) {
        throw new ApiError(400, "INVALID_PROVIDER_SERVICE", "Selecione um serviço ativo do seu próprio perfil.");
      }
      const serviceTitle = input.serviceTitleSnapshot ?? service?.title ?? null;
      const hash = makePayloadHash(input, { serviceId: service?.id ?? null, serviceTitle });
      const existing = await tx.quote.findUnique({ where: { idempotencyKey: key }, select: { id: true, idempotencyHash: true, conversationId: true } });
      if (existing) {
        checkIdempotent(existing, hash, conversation.id, "conversationId");
        return { id: existing.id, replayed: true };
      }

      if (conversation.status !== "OPEN" || conversation.serviceRequest.status !== "OPEN") {
        throw new ApiError(409, "QUOTE_NOT_ALLOWED", "Só é possível enviar uma proposta em uma conversa aberta de uma solicitação aberta.");
      }

      const quote = await tx.quote.create({
        data: { conversationId: conversation.id, serviceId: service?.id, idempotencyKey: key, idempotencyHash: hash },
        select: { id: true },
      });
      const version = await tx.quoteVersion.create({
        data: {
          quoteId: quote.id,
          version: 1,
          scopeDescription: input.scopeDescription,
          serviceTitleSnapshot: serviceTitle,
          totalAmount: new Prisma.Decimal(input.totalAmount),
          estimatedDurationDays: input.estimatedDurationDays,
          validUntil: new Date(input.validUntil),
          proposedStartAt: input.proposedStartAt ? new Date(input.proposedStartAt) : undefined,
          proposedEndAt: input.proposedEndAt ? new Date(input.proposedEndAt) : undefined,
          terms: input.terms || undefined,
          status: "SENT",
          sentAt: new Date(),
          items: {
            create: input.items.map((item, position) => ({
              position,
              description: item.description,
              quantity: new Prisma.Decimal(item.quantity),
              unitPrice: new Prisma.Decimal(item.unitPrice),
            })),
          },
        },
        select: { id: true },
      });
      await tx.message.create({
        data: { conversationId: conversation.id, senderUserId: identity.id, type: "QUOTE", quoteVersionId: version.id },
      });
      return { id: quote.id, replayed: false };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    quoteId = result.id;
    replayed = result.replayed;
  } catch (error) {
    if (!isPrismaCode(error, "P2002")) throw error;
    const existing = await prisma.quote.findUnique({ where: { idempotencyKey: key }, select: { id: true, idempotencyHash: true, conversationId: true } });
    if (!existing) throw error;
    const expectedHash = makePayloadHash(input, {
      serviceId: input.serviceId ?? null,
      serviceTitle: input.serviceTitleSnapshot ?? null,
    });
    checkIdempotent(existing, expectedHash, conversationId, "conversationId");
    quoteId = existing.id;
    replayed = true;
  }

  response.status(replayed ? 200 : 201).json({ data: await publicQuote(quoteId), replayed });
});

router.get("/service-requests/:id/quotes", async (request, response) => {
  const identity = await getDemoIdentity(request.header("x-demo-user-id"));
  const requestId = parseId(request.params);
  const serviceRequest = await prisma.serviceRequest.findUnique({
    where: { id: requestId },
    select: {
      id: true,
      clientUserId: true,
      status: true,
      conversations: { select: { providerProfile: { select: { userId: true } } } },
    },
  });
  if (!serviceRequest) throw new ApiError(404, "REQUEST_NOT_FOUND", "Solicitação não encontrada.");
  const isOwner = serviceRequest.clientUserId === identity.id;
  const isParticipant = serviceRequest.conversations.some((item) => item.providerProfile.userId === identity.id);
  if (!isOwner && !isParticipant) throw new ApiError(404, "REQUEST_NOT_FOUND", "Solicitação não encontrada.");

  const quotes = await prisma.quote.findMany({
    where: isOwner
      ? { conversation: { is: { serviceRequestId: requestId } } }
      : { conversation: { is: { serviceRequestId: requestId, providerProfile: { is: { userId: identity.id } } } } },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    include: quoteInclude,
  });
  const ratings = await getRealRatings([...new Set(quotes.map((quote) => quote.conversation.providerProfile.id))]);
  response.json({
    data: {
      serviceRequestId: requestId,
      canCompareAll: isOwner,
      quotes: quotes.map((quote) => quoteResponse(quote, ratings)),
    },
  });
});

router.get("/quotes/:id", async (request, response) => {
  const identity = await getDemoIdentity(request.header("x-demo-user-id"));
  const quoteId = parseId(request.params);
  const quote = await loadQuote(quoteId);
  if (!quote) throw new ApiError(404, "QUOTE_NOT_FOUND", "Orçamento não encontrado.");
  ensureQuoteAccess(quote, identity.id);
  const ratings = await getRealRatings([quote.conversation.providerProfile.id]);
  response.json({ data: quoteResponse(quote, ratings) });
});

router.post("/quotes/:id/versions", async (request, response) => {
  const identity = await getDemoIdentity(request.header("x-demo-user-id"));
  const quoteId = parseId(request.params);
  const key = readIdempotencyKey(request.header("idempotency-key"));
  const input = parseQuoteInput(request.body);
  let versionId: number;
  let replayed = false;

  try {
    const result = await prisma.$transaction(async (tx) => {
      await lockQuote(tx, quoteId);
      const quote = await tx.quote.findUnique({ where: { id: quoteId }, include: quoteInclude });
      if (!quote) throw new ApiError(404, "QUOTE_NOT_FOUND", "Orçamento não encontrado.");
      if (quote.conversation.providerProfile.userId !== identity.id) throw new ApiError(404, "QUOTE_NOT_FOUND", "Orçamento não encontrado.");

      const hash = makePayloadHash(input, {
        serviceId: quote.serviceId,
        serviceTitle: input.serviceTitleSnapshot ?? quote.service?.title ?? quote.versions.at(-1)?.serviceTitleSnapshot ?? null,
        quoteId,
      });
      const existing = await tx.quoteVersion.findUnique({ where: { idempotencyKey: key }, select: { id: true, quoteId: true, idempotencyHash: true } });
      if (existing) {
        checkIdempotent(existing, hash, quoteId, "quoteId");
        return { id: existing.id, replayed: true };
      }

      const last = quote.versions.at(-1);
      if (quote.conversation.status !== "OPEN" || quote.conversation.serviceRequest.status !== "OPEN"
        || !last || !isValidVersionChain(quote.versions) || last.nextVersion !== null
        || last.status !== "SENT" || last.validUntil.getTime() <= Date.now()) {
        throw new ApiError(409, "QUOTE_NOT_REVISIONABLE", "A versão vigente não está aberta e válida para revisão.");
      }
      const title = input.serviceTitleSnapshot ?? quote.service?.title ?? last.serviceTitleSnapshot;
      const canonicalHash = makePayloadHash(input, { serviceId: quote.serviceId, serviceTitle: title, quoteId });
      if (canonicalHash !== hash) throw new ApiError(409, "QUOTE_REVIEW_CONFLICT", "Os dados da revisão foram alterados durante o envio.");

      await tx.quoteVersion.update({ where: { id: last.id }, data: { status: "SUPERSEDED" } });
      const next = await tx.quoteVersion.create({
        data: {
          quoteId,
          version: last.version + 1,
          previousVersionId: last.id,
          scopeDescription: input.scopeDescription,
          serviceTitleSnapshot: title,
          totalAmount: new Prisma.Decimal(input.totalAmount),
          estimatedDurationDays: input.estimatedDurationDays,
          validUntil: new Date(input.validUntil),
          proposedStartAt: input.proposedStartAt ? new Date(input.proposedStartAt) : undefined,
          proposedEndAt: input.proposedEndAt ? new Date(input.proposedEndAt) : undefined,
          terms: input.terms || undefined,
          status: "SENT",
          sentAt: new Date(),
          idempotencyKey: key,
          idempotencyHash: hash,
          items: {
            create: input.items.map((item, position) => ({
              position,
              description: item.description,
              quantity: new Prisma.Decimal(item.quantity),
              unitPrice: new Prisma.Decimal(item.unitPrice),
            })),
          },
        },
        select: { id: true },
      });
      await tx.message.create({
        data: { conversationId: quote.conversation.id, senderUserId: identity.id, type: "QUOTE", quoteVersionId: next.id },
      });
      return { id: next.id, replayed: false };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    versionId = result.id;
    replayed = result.replayed;
  } catch (error) {
    if (!isPrismaCode(error, "P2002")) throw error;
    const existing = await prisma.quoteVersion.findUnique({ where: { idempotencyKey: key }, select: { id: true, quoteId: true, idempotencyHash: true } });
    if (!existing) throw error;
    const quote = await prisma.quote.findUnique({ where: { id: quoteId }, select: { serviceId: true, service: { select: { title: true } }, versions: { orderBy: { version: "desc" }, take: 1, select: { serviceTitleSnapshot: true } } } });
    const expectedHash = makePayloadHash(input, {
      serviceId: quote?.serviceId ?? null,
      serviceTitle: input.serviceTitleSnapshot ?? quote?.service?.title ?? quote?.versions[0]?.serviceTitleSnapshot ?? null,
      quoteId,
    });
    checkIdempotent(existing, expectedHash, quoteId, "quoteId");
    versionId = existing.id;
    replayed = true;
  }

  const version = await prisma.quoteVersion.findUnique({ where: { id: versionId }, select: { quoteId: true } });
  if (!version) throw new ApiError(404, "QUOTE_VERSION_NOT_FOUND", "Versão de orçamento não encontrada.");
  response.status(replayed ? 200 : 201).json({ data: await publicQuote(version.quoteId), replayed });
});

router.post("/quote-versions/:id/reject", async (request, response) => {
  const identity = await getDemoIdentity(request.header("x-demo-user-id"));
  const versionId = parseId(request.params);
  const relation = await prisma.quoteVersion.findUnique({
    where: { id: versionId },
    select: {
      quoteId: true,
      quote: { select: { conversation: { select: { serviceRequestId: true } } } },
    },
  });
  if (!relation) throw new ApiError(404, "QUOTE_VERSION_NOT_FOUND", "Versão de orçamento não encontrada.");

  try {
    const result = await prisma.$transaction(async (tx) => {
      await lockRequest(tx, relation.quote.conversation.serviceRequestId);
      await lockQuote(tx, relation.quoteId);
      const quote = await tx.quote.findUnique({ where: { id: relation.quoteId }, include: quoteInclude });
      if (!quote || quote.conversation.serviceRequest.id !== relation.quote.conversation.serviceRequestId) {
        throw new ApiError(404, "QUOTE_VERSION_NOT_FOUND", "Versão de orçamento não encontrada.");
      }
      if (quote.conversation.serviceRequest.clientUserId !== identity.id) {
        throw new ApiError(404, "QUOTE_VERSION_NOT_FOUND", "Versão de orçamento não encontrada.");
      }

      const selected = quote.versions.find((version) => version.id === versionId);
      const current = quote.versions.at(-1);
      if (!selected || !isValidVersionChain(quote.versions)) {
        throw new ApiError(409, "QUOTE_NOT_REJECTABLE", "Não foi possível confirmar a versão atual desta proposta.");
      }
      if (selected.status === "REJECTED" && selected.id === current?.id && selected.nextVersion === null) {
        return { quoteId: quote.id, replayed: true };
      }
      if (selected.id !== current?.id || selected.nextVersion !== null || selected.status !== "SENT") {
        throw new ApiError(409, "QUOTE_NOT_REJECTABLE", "Somente a versão enviada e vigente pode ser recusada.");
      }

      await tx.quoteVersion.update({ where: { id: selected.id }, data: { status: "REJECTED" } });
      await tx.message.create({
        data: {
          conversationId: quote.conversation.id,
          senderUserId: identity.id,
          type: "TEXT",
          body: "Recusei a proposta. O orçamento original continua salvo no histórico.",
        },
      });
      return { quoteId: quote.id, replayed: false };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    response.json({ data: await publicQuote(result.quoteId), replayed: result.replayed });
  } catch (error) {
    if (isPrismaCode(error, "P2034")) {
      throw new ApiError(409, "CONCURRENT_QUOTE_CHANGE", "A proposta foi alterada ao mesmo tempo. Atualize a página e tente novamente.");
    }
    throw error;
  }
});

router.post("/quote-versions/:id/restore", async (request, response) => {
  const identity = await getDemoIdentity(request.header("x-demo-user-id"));
  const versionId = parseId(request.params);
  const relation = await prisma.quoteVersion.findUnique({
    where: { id: versionId },
    select: { quoteId: true, quote: { select: { conversation: { select: { serviceRequestId: true } } } } },
  });
  if (!relation) throw new ApiError(404, "QUOTE_VERSION_NOT_FOUND", "Versão de orçamento não encontrada.");

  try {
    const result = await prisma.$transaction(async (tx) => {
      await lockRequest(tx, relation.quote.conversation.serviceRequestId);
      await lockQuote(tx, relation.quoteId);

      const quote = await tx.quote.findUnique({ where: { id: relation.quoteId }, include: quoteInclude });
      if (!quote || quote.conversation.serviceRequest.id !== relation.quote.conversation.serviceRequestId) {
        throw new ApiError(404, "QUOTE_VERSION_NOT_FOUND", "Versão de orçamento não encontrada.");
      }
      if (quote.conversation.serviceRequest.clientUserId !== identity.id) {
        throw new ApiError(404, "QUOTE_VERSION_NOT_FOUND", "Versão de orçamento não encontrada.");
      }

      const serviceRequest = quote.conversation.serviceRequest;

      const selected = quote.versions.find((version) => version.id === versionId);
      const latest = quote.versions.at(-1);
      const chainValid = isValidVersionChain(quote.versions);
      if (selected && chainValid && selected.id === latest?.id && selected.nextVersion === null && selected.status === "SENT") {
        return { quoteId: quote.id, replayed: true };
      }
      const activeOrder = serviceRequest.serviceOrders.some((order) => order.status === "ACCEPTED" || order.status === "IN_PROGRESS");
      const completedOrder = serviceRequest.serviceOrders.some((order) => order.status === "COMPLETED");
      const reopenedAfterCancellation = wasRequestReopenedAfterCancellations(serviceRequest.serviceOrders, serviceRequest.reopenedAt);

      if (!selected || !chainValid || selected.id !== latest?.id || selected.nextVersion !== null
        || selected.status !== "REJECTED" || selected.validUntil.getTime() <= Date.now()
        || quote.conversation.status !== "OPEN" || serviceRequest.status !== "OPEN"
        || activeOrder || completedOrder || !reopenedAfterCancellation) {
        throw new ApiError(409, "QUOTE_NOT_RESTORABLE", "Esta proposta não pode ser restaurada agora. Confira se ela ainda é a versão recusada mais recente e se a solicitação está aberta.");
      }

      await tx.quoteVersion.update({ where: { id: selected.id }, data: { status: "SENT" } });
      await tx.message.create({
        data: {
          conversationId: quote.conversation.id,
          senderUserId: identity.id,
          type: "TEXT",
          body: "Restaurei a proposta recusada. O orçamento original voltou a ficar disponível para comparação.",
        },
      });
      return { quoteId: quote.id, replayed: false };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    response.json({ data: await publicQuote(result.quoteId), replayed: result.replayed });
  } catch (error) {
    if (isPrismaCode(error, "P2034")) {
      throw new ApiError(409, "CONCURRENT_QUOTE_CHANGE", "A proposta foi alterada ao mesmo tempo. Atualize a página e tente novamente.");
    }
    throw error;
  }
});

router.post("/quote-versions/:id/accept", async (request, response) => {
  const identity = await getDemoIdentity(request.header("x-demo-user-id"));
  const versionId = parseId(request.params);
  const relation = await prisma.quoteVersion.findUnique({
    where: { id: versionId },
    select: { quote: { select: { conversation: { select: { serviceRequestId: true } } } } },
  });
  if (!relation) throw new ApiError(404, "QUOTE_VERSION_NOT_FOUND", "Versão de orçamento não encontrada.");
  const requestId = relation.quote.conversation.serviceRequestId;

  try {
    const result = await prisma.$transaction(async (tx) => {
      await lockRequest(tx, requestId);
      const selected = await tx.quoteVersion.findUnique({
        where: { id: versionId },
        include: {
          quote: {
            include: {
              conversation: {
                include: {
                  serviceRequest: { include: { serviceOrders: { orderBy: { acceptedAt: "asc" } } } },
                  providerProfile: { select: { userId: true } },
                },
              },
            },
          },
          nextVersion: { select: { id: true } },
        },
      });
      if (!selected || selected.quote.conversation.serviceRequestId !== requestId) throw new ApiError(404, "QUOTE_VERSION_NOT_FOUND", "Versão de orçamento não encontrada.");
      const serviceRequest = selected.quote.conversation.serviceRequest;
      if (serviceRequest.clientUserId !== identity.id) throw new ApiError(404, "QUOTE_VERSION_NOT_FOUND", "Versão de orçamento não encontrada.");

      const existingForVersion = await tx.serviceOrder.findUnique({ where: { acceptedQuoteVersionId: versionId } });
      if (existingForVersion) return { order: existingForVersion, replayed: true };

      const quote = await tx.quote.findUnique({ where: { id: selected.quoteId }, include: { versions: { orderBy: { version: "asc" }, select: { id: true, version: true, previousVersionId: true, nextVersion: { select: { id: true } } } }, conversation: { select: { status: true } } } });
      const versions = quote?.versions ?? [];
      const chainValid = versions.length > 0 && versions.every((item, index) => item.version === index + 1 && item.previousVersionId === (index === 0 ? null : versions[index - 1].id));
      const latest = versions.at(-1);
      const reopenedAfterCancellation = wasRequestReopenedAfterCancellations(serviceRequest.serviceOrders, serviceRequest.reopenedAt);
      const activeOrder = serviceRequest.serviceOrders.some((item) => item.status === "ACCEPTED" || item.status === "IN_PROGRESS");
      const completedOrder = serviceRequest.serviceOrders.some((item) => item.status === "COMPLETED");

      if (serviceRequest.status !== "OPEN" || selected.quote.conversation.status !== "OPEN"
        || !chainValid || latest?.id !== selected.id || selected.nextVersion !== null
        || selected.status !== "SENT" || selected.validUntil.getTime() <= Date.now()
        || activeOrder || completedOrder || !reopenedAfterCancellation) {
        throw new ApiError(409, "QUOTE_NOT_ELIGIBLE", "Esta versão não está elegível para contratação. Atualize a solicitação e confira o estado da proposta.");
      }

      await tx.quoteVersion.update({ where: { id: selected.id }, data: { status: "ACCEPTED" } });
      const created = await tx.serviceOrder.create({
        data: {
          serviceRequestId: serviceRequest.id,
          acceptedQuoteVersionId: selected.id,
          isDemo: serviceRequest.isDemo,
          status: "ACCEPTED",
          acceptedAt: new Date(),
        },
      });
      await tx.serviceRequest.update({ where: { id: serviceRequest.id }, data: { status: "IN_PROGRESS" } });
      return { order: created, replayed: false };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    response.json({ data: await publicOrder(result.order.id), replayed: result.replayed });
  } catch (error) {
    if (isPrismaCode(error, "P2034")) {
      throw new ApiError(409, "CONCURRENT_ACCEPTANCE", "Outra contratação foi processada ao mesmo tempo. Atualize a solicitação e tente novamente.");
    }
    if (isPrismaCode(error, "P2002")) {
      const existing = await prisma.serviceOrder.findUnique({ where: { acceptedQuoteVersionId: versionId }, select: { id: true } });
      if (existing) {
        response.json({ data: await publicOrder(existing.id), replayed: true });
        return;
      }
    }
    throw error;
  }
});

async function publicOrder(orderId: number) {
  const order = await prisma.serviceOrder.findUnique({
    where: { id: orderId },
    include: {
      serviceRequest: { select: { id: true, title: true, clientUserId: true } },
      acceptedQuoteVersion: {
        include: {
          items: { orderBy: { position: "asc" } },
          quote: {
            include: {
              service: { select: { id: true, title: true } },
              conversation: { include: { providerProfile: { select: { id: true, userId: true, user: { select: { name: true, avatarUrl: true } } } } } },
            },
          },
        },
      },
    },
  });
  if (!order) throw new ApiError(404, "ORDER_NOT_FOUND", "Pedido não encontrado.");
  return {
    id: order.id,
    status: order.status,
    acceptedAt: order.acceptedAt,
    startedAt: order.startedAt,
    completedAt: order.completedAt,
    cancelledAt: order.cancelledAt,
    serviceRequest: order.serviceRequest,
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
      validUntil: order.acceptedQuoteVersion.validUntil,
      proposedStartAt: order.acceptedQuoteVersion.proposedStartAt,
      proposedEndAt: order.acceptedQuoteVersion.proposedEndAt,
      terms: order.acceptedQuoteVersion.terms,
      items: order.acceptedQuoteVersion.items.map((item) => ({
        id: item.id,
        position: item.position,
        description: item.description,
        quantity: item.quantity.toFixed(2),
        unitPrice: item.unitPrice.toFixed(2),
      })),
    },
  };
}

router.get("/service-orders/:id", async (request, response) => {
  const identity = await getDemoIdentity(request.header("x-demo-user-id"));
  const orderId = parseId(request.params);
  const order = await prisma.serviceOrder.findUnique({
    where: { id: orderId },
    select: {
      serviceRequest: { select: { clientUserId: true } },
      acceptedQuoteVersion: {
        select: {
          quote: {
            select: {
              conversation: {
                select: { providerProfile: { select: { userId: true } } },
              },
            },
          },
        },
      },
    },
  });
  if (!order || (order.serviceRequest.clientUserId !== identity.id && order.acceptedQuoteVersion.quote.conversation.providerProfile.userId !== identity.id)) {
    throw new ApiError(404, "ORDER_NOT_FOUND", "Pedido não encontrado.");
  }
  response.json({ data: await publicOrder(orderId) });
});

export default router;
