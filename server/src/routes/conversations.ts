import { Router } from "express";
import { z } from "zod";
import { ApiError } from "../lib/api-error.js";
import { getDemoIdentity } from "../lib/demo-identity.js";
import { prisma } from "../lib/prisma.js";

const router = Router();
const paramsSchema = z.object({ id: z.coerce.number().int().positive().max(2_147_483_647) });
const messageSchema = z.object({ body: z.string().trim().min(1).max(4_000) });

router.get("/", async (request, response) => {
  const identity = await getDemoIdentity(request.header("x-demo-user-id"));
  const conversations = await prisma.conversation.findMany({
    where: {
      OR: [
        { serviceRequest: { clientUserId: identity.id } },
        { providerProfile: { userId: identity.id } },
      ],
    },
    include: {
      serviceRequest: {
        select: {
          id: true,
          clientUserId: true,
          title: true,
          status: true,
          neighborhood: { select: { name: true } },
          client: { select: { name: true, avatarUrl: true } },
        },
      },
      providerProfile: {
        select: {
          userId: true,
          user: { select: { name: true, avatarUrl: true } },
        },
      },
      messages: {
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 1,
        select: {
          id: true,
          type: true,
          body: true,
          createdAt: true,
          sender: { select: { id: true, name: true } },
          quoteVersion: { select: { version: true, totalAmount: true, status: true } },
        },
      },
      _count: { select: { quotes: true } },
    },
  });

  const conversationIds = conversations.map((conversation) => conversation.id);
  const orders = conversationIds.length === 0 ? [] : await prisma.serviceOrder.findMany({
    where: { acceptedQuoteVersion: { quote: { conversationId: { in: conversationIds } } } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { status: true, acceptedQuoteVersion: { select: { quote: { select: { conversationId: true } } } } },
  });
  const orderStatusByConversation = new Map<number, string>();
  for (const order of orders) {
    const conversationId = order.acceptedQuoteVersion.quote.conversationId;
    if (!orderStatusByConversation.has(conversationId)) orderStatusByConversation.set(conversationId, order.status);
  }

  const data = conversations.map((conversation) => {
    const isCustomer = conversation.serviceRequest.clientUserId === identity.id;
    const latestMessage = conversation.messages[0] ?? null;
    return {
      id: conversation.id,
      status: conversation.status,
      role: isCustomer ? "CUSTOMER" as const : "PROVIDER" as const,
      serviceRequest: {
        id: conversation.serviceRequest.id,
        title: conversation.serviceRequest.title,
        status: conversation.serviceRequest.status,
        neighborhood: conversation.serviceRequest.neighborhood,
      },
      otherParticipant: isCustomer ? conversation.providerProfile.user : conversation.serviceRequest.client,
      quoteCount: conversation._count.quotes,
      orderStatus: orderStatusByConversation.get(conversation.id) ?? null,
      lastActivityAt: latestMessage?.createdAt ?? conversation.createdAt,
      lastMessage: latestMessage === null ? null : {
        id: latestMessage.id,
        type: latestMessage.type,
        body: latestMessage.body,
        createdAt: latestMessage.createdAt,
        senderId: latestMessage.sender.id,
        senderName: latestMessage.sender.name,
        quoteVersion: latestMessage.quoteVersion === null ? null : {
          version: latestMessage.quoteVersion.version,
          totalAmount: latestMessage.quoteVersion.totalAmount.toString(),
          status: latestMessage.quoteVersion.status,
        },
      },
    };
  }).sort((a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime() || b.id - a.id);

  response.json({ data });
});

async function getParticipantConversation(conversationId: number, identityId: number) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      serviceRequest: {
        include: {
          category: { select: { id: true, name: true } },
          neighborhood: { select: { id: true, name: true, slug: true } },
          client: { select: { name: true, avatarUrl: true } },
        },
      },
      providerProfile: {
        select: {
          id: true,
          userId: true,
          user: { select: { name: true, avatarUrl: true } },
          services: { where: { isActive: true }, orderBy: { title: "asc" }, select: { id: true, title: true } },
        },
      },
    },
  });

  if (!conversation) throw new ApiError(404, "CONVERSATION_NOT_FOUND", "Conversa não encontrada.");
  const isCustomer = conversation.serviceRequest.clientUserId === identityId;
  const isProvider = conversation.providerProfile.userId === identityId;
  if (!isCustomer && !isProvider) throw new ApiError(404, "CONVERSATION_NOT_FOUND", "Conversa não encontrada.");

  return { conversation, isCustomer, isProvider };
}

router.get("/:id", async (request, response) => {
  const identity = await getDemoIdentity(request.header("x-demo-user-id"));
  const parsed = paramsSchema.safeParse(request.params);
  if (!parsed.success) throw new ApiError(400, "INVALID_CONVERSATION_ID", "O identificador da conversa é inválido.");

  const { conversation, isCustomer, isProvider } = await getParticipantConversation(parsed.data.id, identity.id);
  response.json({
    data: {
      id: conversation.id,
      status: conversation.status,
      createdAt: conversation.createdAt,
      role: isCustomer ? "CUSTOMER" : "PROVIDER",
      canSend: conversation.status === "OPEN" && !["COMPLETED", "CANCELLED"].includes(conversation.serviceRequest.status),
      canCreateQuote: isProvider && conversation.status === "OPEN" && conversation.serviceRequest.status === "OPEN",
      serviceRequest: {
        id: conversation.serviceRequest.id,
        title: conversation.serviceRequest.title,
        description: conversation.serviceRequest.description,
        status: conversation.serviceRequest.status,
        category: conversation.serviceRequest.category,
        neighborhood: conversation.serviceRequest.neighborhood,
        city: conversation.serviceRequest.city,
        region: conversation.serviceRequest.region,
      },
      otherParticipant: isCustomer ? conversation.providerProfile.user : conversation.serviceRequest.client,
      providerProfile: {
        id: conversation.providerProfile.id,
        name: conversation.providerProfile.user.name,
        avatarUrl: conversation.providerProfile.user.avatarUrl,
        services: conversation.providerProfile.services,
      },
    },
  });
});

router.get("/:id/messages", async (request, response) => {
  const identity = await getDemoIdentity(request.header("x-demo-user-id"));
  const parsed = paramsSchema.safeParse(request.params);
  if (!parsed.success) throw new ApiError(400, "INVALID_CONVERSATION_ID", "O identificador da conversa é inválido.");
  await getParticipantConversation(parsed.data.id, identity.id);

  const messages = await prisma.message.findMany({
    where: { conversationId: parsed.data.id },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: 500,
    select: {
      id: true,
      type: true,
      body: true,
      createdAt: true,
      sender: { select: { id: true, name: true, avatarUrl: true } },
      quoteVersion: {
        select: {
          id: true,
          quoteId: true,
          version: true,
          status: true,
          totalAmount: true,
          validUntil: true,
          scopeDescription: true,
          nextVersion: { select: { id: true } },
          quote: { select: { conversationId: true } },
        },
      },
    },
  });
  if (messages.some((message) => message.type === "TEXT"
      ? message.body === null || message.quoteVersion !== null
      : message.body !== null || message.quoteVersion === null || message.quoteVersion.quote.conversationId !== parsed.data.id)) {
    throw new ApiError(500, "MESSAGE_INTEGRITY_ERROR", "O histórico contém uma mensagem estruturada inconsistente.");
  }
  response.json({ data: messages.map(({ quoteVersion, ...message }) => ({
    ...message,
    quoteVersion: quoteVersion === null ? null : {
      id: quoteVersion.id,
      quoteId: quoteVersion.quoteId,
      version: quoteVersion.version,
      status: quoteVersion.status,
      totalAmount: quoteVersion.totalAmount,
      validUntil: quoteVersion.validUntil,
      scopeDescription: quoteVersion.scopeDescription,
      nextVersion: quoteVersion.nextVersion,
    },
  })) });
});

router.post("/:id/messages", async (request, response) => {
  const identity = await getDemoIdentity(request.header("x-demo-user-id"));
  const parsed = paramsSchema.safeParse(request.params);
  if (!parsed.success) throw new ApiError(400, "INVALID_CONVERSATION_ID", "O identificador da conversa é inválido.");
  const body = messageSchema.safeParse(request.body);
  if (!body.success) throw new ApiError(400, "INVALID_MESSAGE", "A mensagem precisa conter texto e ter até 4.000 caracteres.");

  const message = await prisma.$transaction(async (tx) => {
    const conversation = await tx.conversation.findUnique({
      where: { id: parsed.data.id },
      select: {
        id: true,
        status: true,
        serviceRequest: { select: { clientUserId: true, status: true } },
        providerProfile: { select: { userId: true } },
      },
    });
    if (!conversation) throw new ApiError(404, "CONVERSATION_NOT_FOUND", "Conversa não encontrada.");
    if (conversation.serviceRequest.clientUserId !== identity.id && conversation.providerProfile.userId !== identity.id) {
      throw new ApiError(404, "CONVERSATION_NOT_FOUND", "Conversa não encontrada.");
    }
    if (conversation.status !== "OPEN" || ["COMPLETED", "CANCELLED"].includes(conversation.serviceRequest.status)) {
      throw new ApiError(409, "CONVERSATION_CLOSED", "Esta conversa está encerrada e não aceita novas mensagens.");
    }

    return tx.message.create({
      data: {
        conversationId: conversation.id,
        senderUserId: identity.id,
        type: "TEXT",
        body: body.data.body,
      },
      select: {
        id: true,
        type: true,
        body: true,
        createdAt: true,
        sender: { select: { id: true, name: true, avatarUrl: true } },
        quoteVersion: {
          select: {
            id: true,
            quoteId: true,
            version: true,
            status: true,
            totalAmount: true,
            validUntil: true,
            scopeDescription: true,
            nextVersion: { select: { id: true } },
            quote: { select: { conversationId: true } },
          },
        },
      },
    });
  });

  response.status(201).json({ data: message });
});

export default router;
