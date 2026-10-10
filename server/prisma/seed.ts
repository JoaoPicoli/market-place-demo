import { buildDemoFixture, DEMO_REFERENCE_DATE, validateDemoFixture } from "./demo-data.js";
import type { Prisma, PrismaClient as PrismaClientType } from "@prisma/client";

const DEMO_SEED_KEY = "marketplace-demo-v1";
const OWNED_ENTITY_TYPES = ["User", "ProviderProfile", "ProviderServiceArea", "Service", "PortfolioItem", "PortfolioImage",
  "Availability", "ServiceRequest", "Conversation", "Message", "Quote", "QuoteVersion", "QuoteItem", "ServiceOrder", "Review"] as const;
type OwnedEntityType = typeof OWNED_ENTITY_TYPES[number];
type OwnedIds = Map<OwnedEntityType, Set<number>>;

const fixture = buildDemoFixture();
validateDemoFixture(fixture);

if (process.argv.includes("--check")) {
  console.log(`Seed demonstrativo válido (checagem local, sem banco): ${fixture.users.length} usuários, ${fixture.providers.length} prestadores, ${fixture.requests.length} solicitações, ${fixture.conversations.length} conversas, ${fixture.quotes.length} propostas independentes, ${fixture.quotes.reduce((sum, quote) => sum + quote.versions.length, 0)} versões e ${fixture.messages.length} mensagens.`);
} else {
  await runSeed();
}

async function runSeed(): Promise<void> {
  await import("dotenv/config");
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  try {
    await prisma.$transaction(async (tx) => {
      const categoryIds = await ensureCategories(tx);
      const neighborhoodIds = await ensureNeighborhoods(tx);
      const ownershipRows = await tx.demoSeedOwnership.findMany({ where: { seedKey: DEMO_SEED_KEY } });
      const ownedIds = groupOwnershipRows(ownershipRows);
      const userIdsBefore = await findAndValidateDemoAccounts(tx, ownedIds);
      await removeOwnedDemoGraph(tx, userIdsBefore, ownedIds, ownershipRows.map((row) => row.id));

      const userIds = new Map<string, number>();
      for (const user of fixture.users) {
        const existingId = userIdsBefore.get(user.email);
        const data = { name: user.name, avatarUrl: null, pronouns: user.pronouns, city: user.city, region: user.region,
          isDemo: true, updatedAt: user.updatedAt };
        const row = existingId
          ? await tx.user.update({ where: { id: existingId }, data })
          : await tx.user.create({ data: { ...data, email: user.email, createdAt: user.createdAt } });
        userIds.set(user.key, row.id);
      }

      const profileInputs = fixture.providers.map((provider) => ({
        userId: userIds.get(provider.userKey)!, referenceNeighborhoodId: neighborhoodIds.get(provider.referenceNeighborhoodSlug)!,
        bio: provider.bio, serviceArea: provider.serviceArea, yearsExperience: provider.yearsExperience,
        createdAt: DEMO_REFERENCE_DATE, updatedAt: DEMO_REFERENCE_DATE,
      }));
      await tx.providerProfile.createMany({ data: profileInputs });
      const profileRows = await tx.providerProfile.findMany({ where: { userId: { in: fixture.providers.map((row) => userIds.get(row.userKey)!) } }, select: { id: true, userId: true } });
      const profileIdByUserId = new Map(profileRows.map((row) => [row.userId, row.id]));
      const profileIdByKey = new Map(fixture.providers.map((provider) => [provider.userKey, profileIdByUserId.get(userIds.get(provider.userKey)!)!]));

      await tx.providerServiceArea.createMany({ data: fixture.providerServiceAreas.map((area) => ({
        providerProfileId: profileIdByKey.get(area.providerUserKey)!, neighborhoodId: neighborhoodIds.get(area.neighborhoodSlug)!,
      })) });
      await tx.service.createMany({ data: fixture.services.map((service) => ({
        providerProfileId: profileIdByKey.get(service.providerUserKey)!, categoryId: categoryIds.get(service.categorySlug)!,
        title: service.title, description: service.description, referencePrice: service.referencePrice,
        isActive: service.isActive, createdAt: service.createdAt, updatedAt: service.updatedAt,
      })) });
      const serviceRows = await tx.service.findMany({ where: { providerProfileId: { in: [...profileIdByKey.values()] } }, select: { id: true, providerProfileId: true, title: true } });
      const serviceIdByPair = new Map(serviceRows.map((row) => [`${row.providerProfileId}|${row.title}`, row.id]));
      const serviceIdByKey = new Map(fixture.services.map((service) => [service.key,
        serviceIdByPair.get(`${profileIdByKey.get(service.providerUserKey)}|${service.title}`)!]));
      if ([...serviceIdByKey.values()].some((id) => id === undefined)) throw new Error("Não foi possível resolver todos os serviços criados.");

      await tx.portfolioItem.createMany({ data: fixture.portfolio.map((item) => ({
        providerProfileId: profileIdByKey.get(item.providerUserKey)!, serviceId: serviceIdByKey.get(item.serviceKey)!,
        serviceOrderId: null, title: item.title, description: item.description, isDemo: true,
        createdAt: item.createdAt, updatedAt: item.updatedAt,
      })) });
      await tx.availability.createMany({ data: fixture.availability.map((row) => ({
        providerProfileId: profileIdByKey.get(row.providerUserKey)!, dayOfWeek: row.dayOfWeek,
        startMinute: row.startMinute, endMinute: row.endMinute, timeZone: row.timeZone, isActive: row.isActive,
        createdAt: DEMO_REFERENCE_DATE, updatedAt: DEMO_REFERENCE_DATE,
      })) });

      const requestIdByKey = new Map<string, number>();
      for (const request of fixture.requests) {
        const row = await tx.serviceRequest.create({ data: {
          clientUserId: userIds.get(request.clientUserKey)!, categoryId: request.categorySlug ? categoryIds.get(request.categorySlug)! : null,
          neighborhoodId: neighborhoodIds.get(request.neighborhoodSlug)!, title: request.title, description: request.description,
          city: "Curitiba", region: "PR", budgetMin: request.budgetMin, budgetMax: request.budgetMax,
          desiredDate: request.desiredDate, reopenedAt: request.reopenedAt, status: request.status, isDemo: true,
          createdAt: request.createdAt, updatedAt: DEMO_REFERENCE_DATE,
        } });
        requestIdByKey.set(request.key, row.id);
      }

      await tx.conversation.createMany({ data: fixture.conversations.map((conversation) => ({
        serviceRequestId: requestIdByKey.get(conversation.requestKey)!, providerProfileId: profileIdByKey.get(conversation.providerUserKey)!,
        status: conversation.status, createdAt: conversation.createdAt, updatedAt: DEMO_REFERENCE_DATE,
      })) });
      const conversationRows = await tx.conversation.findMany({
        where: { serviceRequestId: { in: [...requestIdByKey.values()] } }, select: { id: true, serviceRequestId: true, providerProfileId: true },
      });
      const conversationIdByPair = new Map(conversationRows.map((row) => [`${row.serviceRequestId}|${row.providerProfileId}`, row.id]));
      const conversationIdByKey = new Map(fixture.conversations.map((conversation) => [conversation.key,
        conversationIdByPair.get(`${requestIdByKey.get(conversation.requestKey)}|${profileIdByKey.get(conversation.providerUserKey)}`)!]));
      if ([...conversationIdByKey.values()].some((id) => id === undefined)) throw new Error("Não foi possível resolver todas as conversas criadas.");

      const quoteIdByKey = new Map<string, number>();
      for (const quote of fixture.quotes) {
        const row = await tx.quote.create({ data: { conversationId: conversationIdByKey.get(quote.conversationKey)!, serviceId: serviceIdByKey.get(quote.serviceKey)!,
          createdAt: quote.versions[0].createdAt, updatedAt: quote.versions[quote.versions.length - 1].sentAt } });
        quoteIdByKey.set(quote.key, row.id);
      }
      const versionIdByKey = new Map<string, number>();
      const quoteItemInputs: Prisma.QuoteItemCreateManyInput[] = [];
      for (const quote of fixture.quotes) {
        let previousVersionId: number | null = null;
        for (const version of quote.versions) {
          const row: { id: number } = await tx.quoteVersion.create({ data: {
            quoteId: quoteIdByKey.get(quote.key)!, version: version.version, previousVersionId,
            scopeDescription: version.scopeDescription, serviceTitleSnapshot: version.serviceTitleSnapshot,
            totalAmount: version.totalAmount, estimatedDurationDays: version.estimatedDurationDays,
            validUntil: version.validUntil, proposedStartAt: version.proposedStartAt, proposedEndAt: version.proposedEndAt,
            terms: version.terms, status: version.status, createdAt: version.createdAt, sentAt: version.sentAt, updatedAt: version.sentAt,
          } });
          versionIdByKey.set(`${quote.key}:${version.version}`, row.id);
          previousVersionId = row.id;
          for (const [position, item] of version.items.entries()) quoteItemInputs.push({ quoteVersionId: row.id, position,
            description: item.description, quantity: item.quantity, unitPrice: item.unitPrice, createdAt: version.createdAt });
        }
      }
      await tx.quoteItem.createMany({ data: quoteItemInputs });

      await tx.message.createMany({ data: fixture.messages.map((message) => ({
        conversationId: conversationIdByKey.get(message.conversationKey)!, senderUserId: userIds.get(message.senderUserKey)!,
        type: message.type, body: message.body, quoteVersionId: message.quoteKey && message.quoteVersion
          ? versionIdByKey.get(`${message.quoteKey}:${message.quoteVersion}`)! : null, createdAt: message.createdAt,
      })) });

      await tx.serviceOrder.createMany({ data: fixture.orders.map((order) => ({
        serviceRequestId: requestIdByKey.get(order.requestKey)!, acceptedQuoteVersionId: versionIdByKey.get(`${order.quoteKey}:${order.acceptedVersion}`)!,
        status: order.status, isDemo: true, acceptedAt: order.acceptedAt, startedAt: order.startedAt,
        completedAt: order.completedAt, cancelledAt: order.cancelledAt, createdAt: order.acceptedAt, updatedAt: DEMO_REFERENCE_DATE,
      })) });
      const acceptedVersionIds = fixture.orders.map((order) => versionIdByKey.get(`${order.quoteKey}:${order.acceptedVersion}`)!);
      const orderRows = await tx.serviceOrder.findMany({ where: { acceptedQuoteVersionId: { in: acceptedVersionIds } },
        select: { id: true, acceptedQuoteVersionId: true } });
      const orderIdByVersionId = new Map(orderRows.map((row) => [row.acceptedQuoteVersionId, row.id]));
      const orderIdByKey = new Map(fixture.orders.map((order) => [order.key,
        orderIdByVersionId.get(versionIdByKey.get(`${order.quoteKey}:${order.acceptedVersion}`)!)!]));
      await tx.review.createMany({ data: fixture.reviews.map((review) => ({
        serviceOrderId: orderIdByKey.get(review.orderKey)!, rating: review.rating, comment: review.comment,
        isDemo: true, createdAt: review.createdAt, updatedAt: DEMO_REFERENCE_DATE,
      })) });
      await recordCreatedGraph(tx, userIds);
    }, { maxWait: 15_000, timeout: 180_000, isolationLevel: "Serializable" });
    console.log(`Seed preparado no banco: ${fixture.users.length} usuários, ${fixture.providers.length} prestadores, ${fixture.services.length} serviços, ${fixture.requests.length} solicitações, ${fixture.conversations.length} conversas, ${fixture.quotes.length} propostas independentes, ${fixture.quotes.reduce((sum, quote) => sum + quote.versions.length, 0)} versões, ${fixture.messages.length} mensagens, ${fixture.orders.length} ordens e ${fixture.reviews.length} avaliações.`);
  } finally {
    await prisma.$disconnect();
  }
}

function groupOwnershipRows(rows: { entityType: string; entityId: number }[]): OwnedIds {
  const result: OwnedIds = new Map(OWNED_ENTITY_TYPES.map((type) => [type, new Set<number>()]));
  for (const row of rows) {
    if (!OWNED_ENTITY_TYPES.includes(row.entityType as OwnedEntityType)) {
      throw new Error(`Registro de propriedade com entidade desconhecida (${row.entityType}); seed interrompido.`);
    }
    result.get(row.entityType as OwnedEntityType)!.add(row.entityId);
  }
  return result;
}

function owned(ownedIds: OwnedIds, type: OwnedEntityType): number[] { return [...ownedIds.get(type)!]; }
function isOwned(ownedIds: OwnedIds, type: OwnedEntityType, id: number): boolean { return ownedIds.get(type)!.has(id); }
function assertRowsOwned<T extends { id: number }>(rows: T[], ownedIds: OwnedIds, type: OwnedEntityType): void {
  if (rows.length !== owned(ownedIds, type).length || rows.some((row) => !isOwned(ownedIds, type, row.id))) {
    throw new Error(`Os registros de ${type} relacionados ao conjunto demo não correspondem integralmente ao manifesto; nada foi removido.`);
  }
}

async function verifyManifestRows(tx: Prisma.TransactionClient, ownedIds: OwnedIds): Promise<void> {
  const [users, profiles, areas, services, portfolios, images, availability, requests, conversations, messages, quotes,
    versions, items, orders, reviews] = await Promise.all([
    tx.user.findMany({ where: { id: { in: owned(ownedIds, "User") } }, select: { id: true } }),
    tx.providerProfile.findMany({ where: { id: { in: owned(ownedIds, "ProviderProfile") } }, select: { id: true } }),
    tx.providerServiceArea.findMany({ where: { id: { in: owned(ownedIds, "ProviderServiceArea") } }, select: { id: true } }),
    tx.service.findMany({ where: { id: { in: owned(ownedIds, "Service") } }, select: { id: true } }),
    tx.portfolioItem.findMany({ where: { id: { in: owned(ownedIds, "PortfolioItem") } }, select: { id: true } }),
    tx.portfolioImage.findMany({ where: { id: { in: owned(ownedIds, "PortfolioImage") } }, select: { id: true } }),
    tx.availability.findMany({ where: { id: { in: owned(ownedIds, "Availability") } }, select: { id: true } }),
    tx.serviceRequest.findMany({ where: { id: { in: owned(ownedIds, "ServiceRequest") } }, select: { id: true } }),
    tx.conversation.findMany({ where: { id: { in: owned(ownedIds, "Conversation") } }, select: { id: true } }),
    tx.message.findMany({ where: { id: { in: owned(ownedIds, "Message") } }, select: { id: true } }),
    tx.quote.findMany({ where: { id: { in: owned(ownedIds, "Quote") } }, select: { id: true } }),
    tx.quoteVersion.findMany({ where: { id: { in: owned(ownedIds, "QuoteVersion") } }, select: { id: true } }),
    tx.quoteItem.findMany({ where: { id: { in: owned(ownedIds, "QuoteItem") } }, select: { id: true } }),
    tx.serviceOrder.findMany({ where: { id: { in: owned(ownedIds, "ServiceOrder") } }, select: { id: true } }),
    tx.review.findMany({ where: { id: { in: owned(ownedIds, "Review") } }, select: { id: true } }),
  ]);
  const actual = [users, profiles, areas, services, portfolios, images, availability, requests, conversations, messages, quotes, versions, items, orders, reviews];
  for (let index = 0; index < OWNED_ENTITY_TYPES.length; index += 1) {
    const type = OWNED_ENTITY_TYPES[index];
    if (actual[index].length !== owned(ownedIds, type).length) {
      throw new Error(`O registro de propriedade de ${type} contém IDs ausentes; seed interrompido sem reparo automático.`);
    }
  }
}

async function findAndValidateDemoAccounts(tx: Prisma.TransactionClient, ownedIds: OwnedIds): Promise<Map<string, number>> {
  await verifyManifestRows(tx, ownedIds);
  const rows = await tx.user.findMany({ where: { email: { in: fixture.users.map((user) => user.email) } }, select: { id: true, email: true, isDemo: true } });
  const nonDemo = rows.find((row) => !row.isDemo);
  if (nonDemo) throw new Error(`O email reservado ${nonDemo.email} pertence a uma conta não demonstrativa; seed interrompido.`);
  const userIds = owned(ownedIds, "User");
  if (userIds.length === 0 && rows.length > 0) {
    throw new Error("Há contas reservadas sem registro de propriedade do seed; a origem não pode ser comprovada e nada será alterado.");
  }
  if (userIds.length > 0 && (rows.length !== fixture.users.length || rows.some((row) => !userIds.includes(row.id)))) {
    throw new Error("As contas reservadas não correspondem ao manifesto do seed; execução interrompida sem atualização.");
  }
  return new Map(rows.map((row) => [row.email, row.id]));
}

async function removeOwnedDemoGraph(tx: Prisma.TransactionClient, existingUsers: Map<string, number>, ownedIds: OwnedIds,
  ownershipRowIds: number[]): Promise<void> {
  const userIds = owned(ownedIds, "User");
  if (userIds.length === 0) {
    if (ownershipRowIds.length > 0) throw new Error("Há propriedade registrada sem contas demo; seed interrompido.");
    return;
  }
  const userIdSet = new Set(userIds);
  if (userIds.some((id) => ![...existingUsers.values()].includes(id))) throw new Error("Conta de propriedade ausente; seed interrompido.");
  const [requests, profiles] = await Promise.all([
    tx.serviceRequest.findMany({ where: { clientUserId: { in: userIds } }, select: { id: true, clientUserId: true, isDemo: true } }),
    tx.providerProfile.findMany({ where: { userId: { in: userIds } }, select: { id: true, userId: true } }),
  ]);
  assertRowsOwned(requests, ownedIds, "ServiceRequest");
  assertRowsOwned(profiles, ownedIds, "ProviderProfile");
  if (requests.some((row) => !row.isDemo || !userIdSet.has(row.clientUserId)) || profiles.some((row) => !userIdSet.has(row.userId))) {
    throw new Error("Solicitação ou perfil de origem incompatível com as contas demo; remoção interrompida.");
  }
  const requestIds = requests.map((row) => row.id);
  const profileIds = profiles.map((row) => row.id);
  const [conversations, services, areas, availability] = await Promise.all([
    tx.conversation.findMany({ where: { OR: [{ serviceRequestId: { in: requestIds } }, { providerProfileId: { in: profileIds } }] }, include: {
      serviceRequest: { select: { id: true, clientUserId: true, isDemo: true } },
      providerProfile: { select: { userId: true, user: { select: { isDemo: true } } } },
    } }),
    tx.service.findMany({ where: { providerProfileId: { in: profileIds } }, select: { id: true, providerProfileId: true } }),
    tx.providerServiceArea.findMany({ where: { providerProfileId: { in: profileIds } }, select: { id: true, providerProfileId: true } }),
    tx.availability.findMany({ where: { providerProfileId: { in: profileIds } }, select: { id: true, providerProfileId: true } }),
  ]);
  assertRowsOwned(conversations, ownedIds, "Conversation");
  assertRowsOwned(services, ownedIds, "Service");
  assertRowsOwned(areas, ownedIds, "ProviderServiceArea");
  assertRowsOwned(availability, ownedIds, "Availability");
  if (conversations.some((row) => !row.serviceRequest.isDemo || !row.providerProfile.user.isDemo
    || !userIdSet.has(row.serviceRequest.clientUserId) || !userIdSet.has(row.providerProfile.userId))) {
    throw new Error("Conversa liga dados externos ao conjunto demo; remoção interrompida.");
  }
  if (services.some((row) => !profileIds.includes(row.providerProfileId))
    || areas.some((row) => !profileIds.includes(row.providerProfileId))
    || availability.some((row) => !profileIds.includes(row.providerProfileId))) {
    throw new Error("Registro geográfico, serviço ou disponibilidade aponta para perfil externo; remoção interrompida.");
  }
  const demoConversationIds = conversations.map((row) => row.id);
  const serviceIds = services.map((row) => row.id);
  const [quotes, orders] = await Promise.all([
    tx.quote.findMany({ where: { conversationId: { in: demoConversationIds } }, include: {
      service: { select: { id: true, providerProfileId: true } },
      conversation: { select: { id: true, providerProfileId: true } },
    } }),
    tx.serviceOrder.findMany({
      where: { serviceRequestId: { in: requestIds } },
      include: {
        acceptedQuoteVersion: {
          include: {
            quote: {
              include: {
                conversation: { select: { id: true, serviceRequestId: true, providerProfile: { select: { userId: true } } } },
              },
            },
          },
        },
      },
    }),
  ]);
  assertRowsOwned(quotes, ownedIds, "Quote");
  assertRowsOwned(orders, ownedIds, "ServiceOrder");
  if (quotes.some((row) => row.serviceId !== null && (!serviceIds.includes(row.serviceId)
    || row.service?.providerProfileId !== row.conversation.providerProfileId))) {
    throw new Error("Proposta demo referencia serviço externo ou de outro prestador; remoção interrompida.");
  }
  if (orders.some((row) => !row.isDemo || !demoConversationIds.includes(row.acceptedQuoteVersion.quote.conversation.id)
    || row.acceptedQuoteVersion.quote.conversation.serviceRequestId !== row.serviceRequestId
    || !userIdSet.has(row.acceptedQuoteVersion.quote.conversation.providerProfile.userId))) {
    throw new Error("Ordem liga solicitação, proposta ou prestador externos; remoção interrompida.");
  }
  const orderIds = orders.map((row) => row.id);
  const quoteIds = quotes.map((row) => row.id);
  if (serviceIds.length) {
    const externalServiceQuotes = await tx.quote.findMany({ where: { serviceId: { in: serviceIds }, id: { notIn: owned(ownedIds, "Quote") } }, select: { id: true } });
    if (externalServiceQuotes.length) throw new Error("Serviço demo está referenciado por proposta não pertencente ao seed; remoção interrompida.");
  }
  const [versions, portfolios, reviews] = await Promise.all([
    tx.quoteVersion.findMany({ where: { quoteId: { in: quoteIds } }, select: { id: true, quoteId: true, version: true, previousVersionId: true } }),
    tx.portfolioItem.findMany({ where: { OR: [{ providerProfileId: { in: profileIds } }, { serviceId: { in: serviceIds } }, { serviceOrderId: { in: orderIds } }] },
      select: { id: true, providerProfileId: true, serviceId: true, serviceOrderId: true, isDemo: true } }),
    tx.review.findMany({ where: { serviceOrderId: { in: orderIds } }, select: { id: true, serviceOrderId: true, isDemo: true } }),
  ]);
  assertRowsOwned(versions, ownedIds, "QuoteVersion");
  assertRowsOwned(portfolios, ownedIds, "PortfolioItem");
  assertRowsOwned(reviews, ownedIds, "Review");
  const versionIds = versions.map((row) => row.id);
  const portfolioIds = portfolios.map((row) => row.id);
  if (portfolios.some((row) => !row.isDemo || !profileIds.includes(row.providerProfileId)
    || (row.serviceId !== null && !serviceIds.includes(row.serviceId))
    || (row.serviceOrderId !== null && !orderIds.includes(row.serviceOrderId)))) {
    throw new Error("Portfólio demo tem proprietário, serviço ou ordem não pertencente ao manifesto; remoção interrompida.");
  }
  if (reviews.some((row) => !row.isDemo || !orderIds.includes(row.serviceOrderId))) {
    throw new Error("Avaliação ligada ao conjunto não é demonstrativa; remoção interrompida.");
  }
  const [items, messages, images, childVersions, externalOrders] = await Promise.all([
    tx.quoteItem.findMany({ where: { quoteVersionId: { in: versionIds } }, select: { id: true, quoteVersionId: true } }),
    tx.message.findMany({ where: { OR: [{ conversationId: { in: demoConversationIds } }, { senderUserId: { in: userIds } }, { quoteVersionId: { in: versionIds } }] }, include: {
      conversation: { select: { id: true, serviceRequest: { select: { clientUserId: true } }, providerProfile: { select: { userId: true } } } },
      quoteVersion: { select: { id: true, quote: { select: { conversationId: true } } } },
    } }),
    tx.portfolioImage.findMany({ where: { portfolioItemId: { in: portfolioIds } }, select: { id: true, portfolioItemId: true } }),
    tx.quoteVersion.findMany({ where: { previousVersionId: { in: versionIds } }, select: { id: true, quoteId: true, previousVersionId: true } }),
    tx.serviceOrder.findMany({ where: { acceptedQuoteVersionId: { in: versionIds }, id: { notIn: orderIds } }, select: { id: true } }),
  ]);
  assertRowsOwned(items, ownedIds, "QuoteItem");
  assertRowsOwned(messages, ownedIds, "Message");
  assertRowsOwned(images, ownedIds, "PortfolioImage");
  if (externalOrders.length) throw new Error("Versão demo está vinculada a uma ordem externa; remoção interrompida.");
  if (childVersions.some((row) => !isOwned(ownedIds, "QuoteVersion", row.id) || !quoteIds.includes(row.quoteId))) {
    throw new Error("Versão demo possui sucessor externo ou não registrado; remoção interrompida.");
  }
  if (versions.some((row) => row.previousVersionId !== null && !versionIds.includes(row.previousVersionId))) {
    throw new Error("Versão registrada depende de versão externa; remoção interrompida.");
  }
  const versionById = new Map(versions.map((row) => [row.id, row]));
  if (versions.some((row) => {
    if (row.previousVersionId === null) return row.version !== 1;
    const previous = versionById.get(row.previousVersionId);
    return !previous || previous.quoteId !== row.quoteId || previous.version + 1 !== row.version;
  })) {
    throw new Error("Cadeia de versões demo está inconsistente ou cruza propostas; remoção interrompida.");
  }
  if (messages.some((row) => !userIdSet.has(row.senderUserId)
    || (row.senderUserId !== row.conversation.serviceRequest.clientUserId && row.senderUserId !== row.conversation.providerProfile.userId)
    || (row.quoteVersionId !== null && row.quoteVersion?.quote.conversationId !== row.conversationId))) {
    throw new Error("Mensagem demo tem remetente ou card de orçamento externo à conversa; remoção interrompida.");
  }

  if (owned(ownedIds, "Message").length) await tx.message.deleteMany({ where: { id: { in: owned(ownedIds, "Message") } } });
  if (images.length) await tx.portfolioImage.deleteMany({ where: { id: { in: images.map((row) => row.id) } } });
  if (portfolioIds.length) await tx.portfolioItem.deleteMany({ where: { id: { in: portfolioIds } } });
  if (reviews.length) await tx.review.deleteMany({ where: { id: { in: reviews.map((row) => row.id) } } });
  if (orderIds.length) await tx.serviceOrder.deleteMany({ where: { id: { in: orderIds } } });
  if (items.length) await tx.quoteItem.deleteMany({ where: { id: { in: items.map((row) => row.id) } } });
  for (const version of [...versions].sort((a, b) => b.version - a.version)) await tx.quoteVersion.delete({ where: { id: version.id } });
  if (quoteIds.length) await tx.quote.deleteMany({ where: { id: { in: quoteIds } } });
  if (demoConversationIds.length) await tx.conversation.deleteMany({ where: { id: { in: demoConversationIds } } });
  if (requestIds.length) await tx.serviceRequest.deleteMany({ where: { id: { in: requestIds } } });
  if (serviceIds.length) await tx.service.deleteMany({ where: { id: { in: serviceIds } } });
  if (areas.length) await tx.providerServiceArea.deleteMany({ where: { id: { in: areas.map((row) => row.id) } } });
  if (availability.length) await tx.availability.deleteMany({ where: { id: { in: availability.map((row) => row.id) } } });
  if (profileIds.length) await tx.providerProfile.deleteMany({ where: { id: { in: profileIds } } });
  if (ownershipRowIds.length) await tx.demoSeedOwnership.deleteMany({ where: { seedKey: DEMO_SEED_KEY, id: { in: ownershipRowIds } } });
}

async function recordCreatedGraph(tx: Prisma.TransactionClient, userIds: Map<string, number>): Promise<void> {
  const allUserIds = [...userIds.values()];
  const profileRows = await tx.providerProfile.findMany({ where: { userId: { in: allUserIds } }, select: { id: true } });
  const profileIds = profileRows.map((row) => row.id);
  const requestRows = await tx.serviceRequest.findMany({ where: { clientUserId: { in: allUserIds } }, select: { id: true } });
  const requestIds = requestRows.map((row) => row.id);
  const conversationRows = await tx.conversation.findMany({ where: { serviceRequestId: { in: requestIds } }, select: { id: true } });
  const conversationIds = conversationRows.map((row) => row.id);
  const serviceRows = await tx.service.findMany({ where: { providerProfileId: { in: profileIds } }, select: { id: true } });
  const serviceIds = serviceRows.map((row) => row.id);
  const quoteRows = await tx.quote.findMany({ where: { conversationId: { in: conversationIds } }, select: { id: true } });
  const quoteIds = quoteRows.map((row) => row.id);
  const versionRows = await tx.quoteVersion.findMany({ where: { quoteId: { in: quoteIds } }, select: { id: true } });
  const versionIds = versionRows.map((row) => row.id);
  const orderRows = await tx.serviceOrder.findMany({ where: { serviceRequestId: { in: requestIds } }, select: { id: true } });
  const orderIds = orderRows.map((row) => row.id);
  const [areas, portfolios, availability, messages, items, reviews] = await Promise.all([
    tx.providerServiceArea.findMany({ where: { providerProfileId: { in: profileIds } }, select: { id: true } }),
    tx.portfolioItem.findMany({ where: { providerProfileId: { in: profileIds } }, select: { id: true } }),
    tx.availability.findMany({ where: { providerProfileId: { in: profileIds } }, select: { id: true } }),
    tx.message.findMany({ where: { conversationId: { in: conversationIds } }, select: { id: true } }),
    tx.quoteItem.findMany({ where: { quoteVersionId: { in: versionIds } }, select: { id: true } }),
    tx.review.findMany({ where: { serviceOrderId: { in: orderIds } }, select: { id: true } }),
  ]);
  const images = await tx.portfolioImage.findMany({ where: { portfolioItemId: { in: portfolios.map((row) => row.id) } }, select: { id: true } });
  const records: [OwnedEntityType, number[]][] = [
    ["User", allUserIds], ["ProviderProfile", profileIds], ["ProviderServiceArea", areas.map((row) => row.id)],
    ["Service", serviceIds], ["PortfolioItem", portfolios.map((row) => row.id)], ["PortfolioImage", images.map((row) => row.id)],
    ["Availability", availability.map((row) => row.id)], ["ServiceRequest", requestIds], ["Conversation", conversationIds],
    ["Message", messages.map((row) => row.id)], ["Quote", quoteIds], ["QuoteVersion", versionIds],
    ["QuoteItem", items.map((row) => row.id)], ["ServiceOrder", orderIds], ["Review", reviews.map((row) => row.id)],
  ];
  const expected: Record<OwnedEntityType, number> = {
    User: fixture.users.length, ProviderProfile: fixture.providers.length, ProviderServiceArea: fixture.providerServiceAreas.length,
    Service: fixture.services.length, PortfolioItem: fixture.portfolio.length, PortfolioImage: 0, Availability: fixture.availability.length,
    ServiceRequest: fixture.requests.length, Conversation: fixture.conversations.length, Message: fixture.messages.length,
    Quote: fixture.quotes.length, QuoteVersion: fixture.quotes.reduce((sum, quote) => sum + quote.versions.length, 0),
    QuoteItem: fixture.quotes.reduce((sum, quote) => sum + quote.versions.reduce((count, version) => count + version.items.length, 0), 0),
    ServiceOrder: fixture.orders.length, Review: fixture.reviews.length,
  };
  for (const [type, ids] of records) if (ids.length !== expected[type]) {
    throw new Error(`Quantidade de ${type} criada difere do fixture; transação cancelada.`);
  }
  await tx.demoSeedOwnership.createMany({ data: records.flatMap(([entityType, ids]) =>
    ids.map((entityId) => ({ seedKey: DEMO_SEED_KEY, entityType, entityId }))) });
}

async function ensureCategories(tx: Prisma.TransactionClient): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  for (const category of fixture.categories) {
    const bySlug = await tx.category.findUnique({ where: { slug: category.slug } });
    const byName = await tx.category.findUnique({ where: { name: category.name } });
    if (bySlug || byName) {
      if (!bySlug || !byName || bySlug.id !== byName.id || bySlug.name !== category.name || bySlug.description !== category.description) {
        throw new Error(`Categoria existente incompatível com o seed: ${category.slug}. Nenhum catálogo será sobrescrito.`);
      }
      result.set(category.slug, bySlug.id);
      continue;
    }
    const row = await tx.category.create({ data: { ...category, createdAt: DEMO_REFERENCE_DATE, updatedAt: DEMO_REFERENCE_DATE } });
    result.set(category.slug, row.id);
  }
  return result;
}

async function ensureNeighborhoods(tx: Prisma.TransactionClient): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  for (const neighborhood of fixture.neighborhoods) {
    const bySlug = await tx.neighborhood.findUnique({ where: { slug: neighborhood.slug } });
    const byCanonicalName = await tx.neighborhood.findFirst({ where: { city: neighborhood.city, state: neighborhood.state, name: neighborhood.name } });
    if (bySlug || byCanonicalName) {
      if (!bySlug || !byCanonicalName || bySlug.id !== byCanonicalName.id || bySlug.name !== neighborhood.name
        || bySlug.city !== neighborhood.city || bySlug.state !== neighborhood.state) {
        throw new Error(`Bairro existente incompatível com o catálogo Curitiba/PR: ${neighborhood.slug}. Nenhum catálogo será sobrescrito.`);
      }
      result.set(neighborhood.slug, bySlug.id);
      continue;
    }
    const row = await tx.neighborhood.create({ data: { ...neighborhood, createdAt: DEMO_REFERENCE_DATE, updatedAt: DEMO_REFERENCE_DATE } });
    result.set(neighborhood.slug, row.id);
  }
  return result;
}
