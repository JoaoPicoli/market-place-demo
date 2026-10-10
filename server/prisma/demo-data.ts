/** Deterministic, database-free fixtures for the marketplace demonstration. */

export const DEMO_REFERENCE_DATE = new Date("2026-10-10T15:00:00.000Z");
export const DEMO_EMAIL_DOMAIN = "marketplace-demo.invalid";

export const categories = [
  { slug: "eletricidade", name: "Eletricidade residencial", description: "Instalação, diagnóstico e reparos elétricos em residências." },
  { slug: "hidraulica", name: "Hidráulica", description: "Reparos e instalações de água, torneiras, sifões e tubulações." },
  { slug: "pintura", name: "Pintura", description: "Pintura de ambientes, preparação e acabamento de superfícies." },
  { slug: "marcenaria", name: "Marcenaria", description: "Reparos e projetos sob medida em madeira." },
  { slug: "montagem-moveis", name: "Montagem de móveis", description: "Montagem, desmontagem e ajustes de móveis residenciais." },
  { slug: "limpeza", name: "Limpeza residencial", description: "Limpeza periódica e detalhada de casas e apartamentos." },
  { slug: "jardinagem", name: "Jardinagem", description: "Manutenção de jardins, canteiros, vasos e áreas externas." },
  { slug: "climatizacao", name: "Climatização", description: "Instalação, limpeza e diagnóstico de ar-condicionado." },
  { slug: "telhados-calhas", name: "Telhados e calhas", description: "Inspeção e reparo de telhados, rufos e calhas." },
  { slug: "pequenos-reparos", name: "Pequenos reparos", description: "Ajustes domésticos, fixações e manutenção geral." },
  { slug: "vidracaria", name: "Vidraçaria", description: "Instalação e reparo de vidros, espelhos e box." },
  { slug: "mudancas-fretes", name: "Mudanças e fretes", description: "Pequenas mudanças, transporte e organização de móveis." },
  { slug: "eletrodomesticos", name: "Instalação de eletrodomésticos", description: "Instalação residencial de eletrodomésticos e acessórios." },
] as const;

export const neighborhoodGroups = [
  ["centro", "Centro"], ["batel", "Batel"], ["reboucas", "Rebouças"], ["cabral", "Cabral"], ["juveve", "Juvevê"],
  ["agua-verde", "Água Verde"], ["portao", "Portão"], ["vila-izabel", "Vila Izabel"],
  ["bacacheri", "Bacacheri"], ["boa-vista", "Boa Vista"], ["santa-candida", "Santa Cândida"], ["tingui", "Tingui"],
  ["hauer", "Hauer"], ["boqueirao", "Boqueirão"], ["xaxim", "Xaxim"],
  ["cajuru", "Cajuru"], ["uberaba", "Uberaba"], ["jardim-das-americas", "Jardim das Américas"], ["guabirotuba", "Guabirotuba"],
  ["santa-felicidade", "Santa Felicidade"], ["sao-braz", "São Braz"], ["campo-comprido", "Campo Comprido"], ["mossungue", "Mossunguê"],
] as const;

const neighborhoodRegions: readonly (readonly number[])[] = [[0, 1, 2, 3, 4], [5, 6, 7], [8, 9, 10, 11], [12, 13, 14], [15, 16, 17, 18], [19, 20, 21, 22]];

const serviceCatalog: Record<string, readonly { title: string; detail: string }[]> = {
  eletricidade: [
    { title: "Diagnóstico e reparo de tomadas", detail: "investiga aquecimento, mau contato e disjuntores que desarmam" },
    { title: "Instalação de luminárias", detail: "inclui fixação e ligação de plafons, pendentes e trilhos" },
    { title: "Troca de interruptores", detail: "corrige interruptores frouxos, antigos ou com funcionamento irregular" },
    { title: "Revisão de circuito residencial", detail: "avalia carga, conexões e segurança do circuito informado" },
    { title: "Instalação de ventilador de teto", detail: "monta e testa ventilador com ponto elétrico existente" },
  ],
  hidraulica: [
    { title: "Reparo de torneira e registro", detail: "resolve gotejamento, baixa pressão e dificuldade para fechar" },
    { title: "Troca de sifão e vedação", detail: "corrige vazamento sob pia e substitui conexões desgastadas" },
    { title: "Desobstrução de pia", detail: "avalia escoamento lento e remove obstrução acessível" },
    { title: "Instalação de chuveiro", detail: "instala ducha e verifica conexões hidráulicas existentes" },
    { title: "Reparo de descarga", detail: "ajusta caixa acoplada ou mecanismo de descarga com vazamento" },
  ],
  pintura: [
    { title: "Pintura de quarto", detail: "prepara paredes e aplica acabamento conforme a cor escolhida" },
    { title: "Correção de parede descascando", detail: "identifica áreas soltas, prepara a superfície e retoca a pintura" },
    { title: "Pintura de portas e rodapés", detail: "renova esmalte e acabamento de madeira ou metal" },
    { title: "Pintura de apartamento vazio", detail: "planeja cobertura de paredes internas antes da mudança" },
    { title: "Reparo de trincas e pintura", detail: "prepara fissuras superficiais antes de repintar o ambiente" },
  ],
  marcenaria: [
    { title: "Prateleiras sob medida", detail: "mede, fabrica e instala prateleiras para o espaço disponível" },
    { title: "Ajuste de portas de armário", detail: "regula dobradiças e corrige portas desalinhadas" },
    { title: "Reparo de gavetas", detail: "ajusta corrediças, frentes e encaixes que travam" },
    { title: "Bancada e nicho em madeira", detail: "executa peça funcional com medidas combinadas" },
    { title: "Restauração de móvel", detail: "avalia estrutura e acabamento de peça de madeira" },
  ],
  "montagem-moveis": [
    { title: "Montagem de guarda-roupa", detail: "monta peças planas e confere nivelamento e portas" },
    { title: "Montagem de cama e cômoda", detail: "organiza ferragens e monta móveis de dormitório" },
    { title: "Montagem de mesa e cadeiras", detail: "monta conjunto de jantar e verifica estabilidade" },
    { title: "Desmontagem para mudança", detail: "desmonta móveis identificando peças para facilitar remontagem" },
    { title: "Fixação de painel de TV", detail: "instala suporte ou painel após conferir parede e pontos disponíveis" },
  ],
  limpeza: [
    { title: "Limpeza detalhada de apartamento", detail: "cuida de cozinha, banheiro, pisos e superfícies de uso diário" },
    { title: "Limpeza antes da mudança", detail: "prepara o imóvel vazio para entrada dos moradores" },
    { title: "Limpeza de vidros acessíveis", detail: "limpa janelas e portas de vidro em altura segura" },
    { title: "Organização e limpeza de cozinha", detail: "combina limpeza de superfícies e organização básica" },
    { title: "Limpeza periódica residencial", detail: "atende uma rotina combinada para manter os ambientes" },
  ],
  jardinagem: [
    { title: "Poda e cuidado de jardim", detail: "faz poda leve, retirada de folhas e manutenção de canteiros" },
    { title: "Revitalização de vasos", detail: "troca substrato e reorganiza plantas em vasos" },
    { title: "Manutenção de gramado", detail: "corta, limpa e orienta cuidados básicos do gramado" },
    { title: "Plantio em canteiro", detail: "prepara o local e instala espécies escolhidas pelo cliente" },
    { title: "Limpeza de quintal", detail: "remove folhas e organiza a área externa residencial" },
  ],
  climatizacao: [
    { title: "Limpeza de ar-condicionado", detail: "higieniza filtros e componentes acessíveis do aparelho" },
    { title: "Instalação de ar-condicionado split", detail: "avalia pontos e instala equipamento conforme condições do local" },
    { title: "Diagnóstico de ar que não gela", detail: "verifica funcionamento e indica a causa provável do baixo rendimento" },
    { title: "Manutenção preventiva de split", detail: "confere drenagem, filtros e funcionamento do sistema" },
    { title: "Ajuste de dreno de climatização", detail: "investiga gotejamento e corrige o caminho de drenagem acessível" },
  ],
  "telhados-calhas": [
    { title: "Inspeção de telhado após chuva", detail: "localiza pontos de entrada de água e orienta o reparo necessário" },
    { title: "Limpeza de calhas", detail: "remove folhas e resíduos para restabelecer o escoamento" },
    { title: "Reparo de telhas deslocadas", detail: "reposiciona ou substitui telhas acessíveis com segurança" },
    { title: "Vedação de rufo", detail: "avalia infiltração junto a encontros de parede e cobertura" },
    { title: "Reparo de goteira", detail: "investiga a origem do vazamento antes de indicar o material" },
  ],
  "pequenos-reparos": [
    { title: "Fixação de prateleira", detail: "mede e instala prateleira com fixadores adequados à parede" },
    { title: "Instalação de varão e cortina", detail: "faz marcação, fixação e alinhamento no cômodo" },
    { title: "Ajuste de portas", detail: "corrige atrito, fechadura frouxa ou porta que não encaixa" },
    { title: "Montagem de suporte e acessórios", detail: "instala acessórios domésticos em pontos combinados" },
    { title: "Reparos domésticos variados", detail: "resolve pequenos ajustes descritos antes da visita" },
  ],
  vidracaria: [
    { title: "Instalação de espelho", detail: "mede e instala espelho conforme parede e dimensões combinadas" },
    { title: "Ajuste de box de banheiro", detail: "regula roldanas, trilhos e vedação de box existente" },
    { title: "Troca de vidro de janela", detail: "confere medidas e substitui vidro em esquadria residencial" },
    { title: "Instalação de prateleira de vidro", detail: "instala peça com suportes adequados ao ambiente" },
    { title: "Reparo de porta de vidro", detail: "avalia ferragens e alinhamento de porta existente" },
  ],
  "mudancas-fretes": [
    { title: "Frete de móveis na cidade", detail: "combina coleta, transporte e entrega de itens residenciais" },
    { title: "Pequena mudança de apartamento", detail: "planeja transporte de caixas e móveis de pequeno porte" },
    { title: "Retirada de móvel usado", detail: "organiza retirada e transporte de uma peça em Curitiba" },
    { title: "Transporte de eletrodoméstico", detail: "protege e transporta equipamento entre endereços" },
    { title: "Ajuda para carregar caixas", detail: "apoia organização e movimentação de volumes da mudança" },
  ],
  eletrodomesticos: [
    { title: "Instalação de máquina de lavar", detail: "conecta mangueiras e verifica nivelamento e drenagem" },
    { title: "Instalação de coifa", detail: "confere medidas e instala equipamento nos pontos disponíveis" },
    { title: "Instalação de forno elétrico", detail: "avalia nicho e conexão elétrica antes da instalação" },
    { title: "Instalação de filtro de água", detail: "monta filtro e confere vedação e fluxo de água" },
    { title: "Instalação de lava-louças", detail: "confere espaço, entrada de água e saída de drenagem" },
  ],
};

const providerFirstNames = [
  "Marina", "Caio", "Bianca", "Rafael", "Joana", "André", "Lívia", "Mateus", "Renata", "Davi", "Camila", "Bruno",
  "Isabela", "Felipe", "Nádia", "Lucas", "Talita", "Eduardo", "Mirela", "Samuel", "Aline", "Otávio", "Priscila", "Heitor",
  "Cecília", "Murilo", "Denise", "Ícaro", "Vitória", "Gustavo", "Elisa", "Leandro", "Sabrina", "Pedro", "Mônica", "Vítor",
  "Tainá", "Roberto", "Yasmin", "Daniel", "Sueli", "Enzo", "Larissa", "Fábio", "Noemi", "Thiago", "Bárbara", "Renan",
  "Clarice", "Artur", "Maitê", "Wesley", "Débora", "Cauã", "Sílvia", "Diego", "Iara", "Márcio", "Júlia", "Alexandre",
  "Ester", "Ruan", "Elaine", "Vinícius", "Raquel", "César", "Luana", "Igor", "Neide", "Breno", "Cíntia", "Paulo",
  "Catarina", "Jorge", "Marlene", "Nicolas", "Miriam", "Alan", "Flávia", "Sérgio", "Malu", "Douglas", "Ana Clara", "Luan",
];
const surnames = ["Alves", "Mendes", "Farias", "Nogueira", "Ribeiro", "Lima", "Azevedo", "Cardoso", "Barbosa", "Teixeira", "Moreira", "Pereira", "Freitas", "Campos", "Gomes", "Pinto", "Moraes", "Fernandes"];
const clientNames = ["Beatriz Sampaio", "Hugo Martins", "Carolina Prado", "João Vilela", "Débora Leal", "Pedro Nascimento", "Lara Monteiro", "Marcelo Pires", "Ana Luiza Costa", "Rogério Tavares", "Isis Machado", "Gabriel Furtado", "Eliane Souza", "Samuel Paiva", "Natália Lopes", "Victor Hugo Reis"];

export interface DemoUser { key: string; name: string; email: string; pronouns: string | null; city: string; region: string; isDemo: true; createdAt: Date; updatedAt: Date }
export interface DemoProvider { userKey: string; bio: string; serviceArea: string; yearsExperience: number; referenceNeighborhoodSlug: string; neighborhoodSlugs: string[]; categorySlugs: string[] }
export interface DemoService { key: string; providerUserKey: string; categorySlug: string; title: string; description: string; referencePrice: string; isActive: true; createdAt: Date; updatedAt: Date }
export interface DemoPortfolio { key: string; providerUserKey: string; serviceKey: string; title: string; description: string; isDemo: true; createdAt: Date; updatedAt: Date }
export interface DemoRequest { key: string; clientUserKey: string; categorySlug: string | null; neighborhoodSlug: string; title: string; description: string; status: "OPEN" | "PAUSED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"; budgetMin: string | null; budgetMax: string | null; createdAt: Date; desiredDate: Date | null; reopenedAt: Date | null; isDemo: true }
export interface DemoConversation { key: string; requestKey: string; providerUserKey: string; status: "OPEN" | "CLOSED" | "ARCHIVED"; createdAt: Date }
export interface DemoQuoteItem { description: string; quantity: string; unitPrice: string }
export interface DemoQuoteVersion { version: number; scopeDescription: string; serviceTitleSnapshot: string; totalAmount: string; estimatedDurationDays: number; validUntil: Date; proposedStartAt: Date; proposedEndAt: Date; terms: string; status: "SENT" | "ACCEPTED" | "REJECTED" | "WITHDRAWN" | "EXPIRED" | "SUPERSEDED"; createdAt: Date; sentAt: Date; items: DemoQuoteItem[] }
export interface DemoQuote { key: string; conversationKey: string; serviceKey: string; versions: DemoQuoteVersion[] }
export interface DemoMessage { conversationKey: string; senderUserKey: string; type: "TEXT" | "QUOTE"; body: string | null; quoteKey: string | null; quoteVersion: number | null; createdAt: Date }
export interface DemoOrder { key: string; requestKey: string; quoteKey: string; acceptedVersion: number; status: "ACCEPTED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"; acceptedAt: Date; startedAt: Date | null; completedAt: Date | null; cancelledAt: Date | null; isDemo: true }
export interface DemoReview { orderKey: string; rating: number; comment: string; isDemo: true; createdAt: Date }
export interface DemoAvailability { providerUserKey: string; dayOfWeek: number; startMinute: number; endMinute: number; timeZone: "America/Sao_Paulo"; isActive: true }

export interface DemoFixture {
  users: DemoUser[]; providers: DemoProvider[]; categories: typeof categories[number][];
  neighborhoods: { slug: string; name: string; city: "Curitiba"; state: "PR" }[];
  services: DemoService[]; portfolio: DemoPortfolio[]; requests: DemoRequest[]; conversations: DemoConversation[];
  quotes: DemoQuote[]; messages: DemoMessage[]; orders: DemoOrder[]; reviews: DemoReview[]; availability: DemoAvailability[];
  providerServiceAreas: { providerUserKey: string; neighborhoodSlug: string }[];
}

function atOffset(base: Date, milliseconds: number): Date { return new Date(base.getTime() + milliseconds); }
function days(base: Date, amount: number): Date { return atOffset(base, amount * 86_400_000); }
function money(cents: number): string { return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`; }
function cents(value: string): number {
  const [whole, fraction = ""] = value.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0").slice(0, 2));
}

export function buildDemoFixture(): DemoFixture {
  const allNeighborhoods = neighborhoodGroups.map(([slug, name]) => ({ slug, name, city: "Curitiba" as const, state: "PR" as const }));
  const users: DemoUser[] = [];
  for (let i = 0; i < 84; i += 1) {
    const key = `provider-${String(i + 1).padStart(3, "0")}`;
    const sampleName = ["Marina Alves", "Caio Mendes", "Bianca Farias"][i];
    users.push({ key, name: sampleName ?? `${providerFirstNames[i]} ${surnames[(i * 7) % surnames.length]}`,
      email: `${key}@${DEMO_EMAIL_DOMAIN}`, pronouns: i % 5 === 0 ? "ela/dela" : i % 5 === 1 ? "ele/dele" : null,
      city: "Curitiba", region: "PR", isDemo: true, createdAt: days(DEMO_REFERENCE_DATE, -420 - i), updatedAt: DEMO_REFERENCE_DATE });
  }
  for (let i = 0; i < 16; i += 1) {
    const key = `client-${String(i + 1).padStart(3, "0")}`;
    users.push({ key, name: clientNames[i], email: `${key}@${DEMO_EMAIL_DOMAIN}`, pronouns: null,
      city: "Curitiba", region: "PR", isDemo: true, createdAt: days(DEMO_REFERENCE_DATE, -250 - i), updatedAt: DEMO_REFERENCE_DATE });
  }

  // Easter egg explicitamente fictício, reservado ao ambiente demonstrativo.
  const mariaKey = "provider-easter-egg-maria-luiza-rosner";
  users.push({ key: mariaKey, name: "Maria Luiza Rosner", email: `${mariaKey}@${DEMO_EMAIL_DOMAIN}`, pronouns: "ela/dela",
    city: "Curitiba", region: "PR", isDemo: true, createdAt: days(DEMO_REFERENCE_DATE, -90), updatedAt: DEMO_REFERENCE_DATE });

  const providers: DemoProvider[] = [];
  const services: DemoService[] = [];
  const categoriesBySlug = new Map(categories.map((category) => [category.slug, category]));
  const userNames = new Map(users.map((user) => [user.key, user.name]));
  const groupForNeighborhood = new Map<string, number>();
  neighborhoodRegions.forEach((indices, regionIndex) => indices.forEach((index) => groupForNeighborhood.set(allNeighborhoods[index].slug, regionIndex)));

  for (let i = 0; i < 84; i += 1) {
    const userKey = `provider-${String(i + 1).padStart(3, "0")}`;
    const forcedPrimary: Record<number, number> = { 0: 1, 3: 1, 6: 1, 1: 8, 2: 4 };
    const primary = forcedPrimary[i] ?? (i * 5 + 2) % categories.length;
    const categoryIndexes = [primary, (primary + 4) % categories.length];
    if (i < 42) categoryIndexes.push((primary + 8) % categories.length);
    const referenceSlug = i === 0 ? "uberaba" : i === 1 ? "hauer" : i === 2 ? "bacacheri" : allNeighborhoods[(i * 11 + 3) % allNeighborhoods.length].slug;
    const homeRegion = groupForNeighborhood.get(referenceSlug)!;
    const home = neighborhoodRegions[homeRegion];
    const adjacent = neighborhoodRegions[(homeRegion + (i % 2 === 0 ? 1 : 5)) % neighborhoodRegions.length];
    const areaIndices = [...new Set([...home, ...adjacent])];
    const neighborhoodSlugs: string[] = areaIndices.map((index) => allNeighborhoods[index].slug);
    if (i === 0 || i === 3 || i === 6) {
      for (const slug of ["agua-verde", "uberaba"]) if (!neighborhoodSlugs.includes(slug)) neighborhoodSlugs.push(slug);
    }
    const referenceNeighborhoodSlug = referenceSlug;
    const focus = categories[primary].name.toLowerCase();
    const firstName = userNames.get(userKey)!.split(" ")[0];
    const yearsExperience = 2 + ((i * 7) % 19);
    const bioPatterns = [
      `${firstName} trabalha com ${focus} em Curitiba há ${yearsExperience} anos. Explica o que precisa ser feito antes de começar e combina materiais e horários com antecedência.`,
      `Com ${yearsExperience} anos de experiência em ${focus}, ${firstName} atende imóveis residenciais e costuma apresentar opções de reparo conforme o estado encontrado no local.`,
      `${firstName} atua há ${yearsExperience} anos com ${focus}, priorizando organização do ambiente, comunicação direta e acabamento compatível com o uso da casa.`,
      `Profissional de ${focus} há ${yearsExperience} anos, ${firstName} atende Curitiba e adapta o escopo ao tamanho do serviço e às condições do imóvel.`,
    ];
    providers.push({ userKey, bio: bioPatterns[i % bioPatterns.length], yearsExperience, referenceNeighborhoodSlug, neighborhoodSlugs,
      serviceArea: `Atende ${neighborhoodSlugs.map((slug) => allNeighborhoods.find((item) => item.slug === slug)!.name).join(", ")}.`,
      categorySlugs: categoryIndexes.map((index) => categories[index].slug) });

    const slots = i < 42 ? 3 : 2;
    for (let slot = 0; slot < slots; slot += 1) {
      const categorySlug = categories[categoryIndexes[slot]].slug;
      const offerings = serviceCatalog[categorySlug];
      const offering = offerings[(i + slot * 2) % offerings.length];
      const neighborhoodName = allNeighborhoods.find((item) => item.slug === referenceSlug)!.name;
      const key = `service-${String(i + 1).padStart(3, "0")}-${slot + 1}`;
      const extra = ["com visita combinada", "com explicação das etapas", "com atenção à proteção do ambiente", "com orçamento detalhado"][((i * 3) + slot) % 4];
      services.push({ key, providerUserKey: userKey, categorySlug, title: `${offering.title} · ${userNames.get(userKey)!.split(" ")[0]}`,
        description: `${offering.detail}. ${extra}; atendimento de referência no ${neighborhoodName} e demais bairros informados no perfil.`,
        referencePrice: money(9500 + ((i * 733 + slot * 1481) % 41000)), isActive: true,
        createdAt: days(DEMO_REFERENCE_DATE, -180 - i), updatedAt: DEMO_REFERENCE_DATE });
    }
  }

  providers.push({ userKey: mariaKey,
    bio: "Perfil fictício criado como homenagem e easter egg desta versão de teste. Sua especialidade de brincadeira é farmar aura; não representa uma oferta profissional real.",
    serviceArea: "Perfil demonstrativo em Curitiba.", yearsExperience: 0, referenceNeighborhoodSlug: "centro",
    neighborhoodSlugs: ["centro"], categorySlugs: ["pequenos-reparos"] });
  services.push({ key: "service-easter-egg-farmar-aura", providerUserKey: mariaKey, categorySlug: "pequenos-reparos",
    title: "Farmar aura", description: "Easter egg fictício desta demonstração; não é um serviço real nem uma oferta profissional.",
    referencePrice: "42.00", isActive: true, createdAt: days(DEMO_REFERENCE_DATE, -30), updatedAt: DEMO_REFERENCE_DATE });

  const providerServiceAreas = providers.flatMap((provider) => provider.neighborhoodSlugs.map((neighborhoodSlug) => ({ providerUserKey: provider.userKey, neighborhoodSlug })));
  const portfolio: DemoPortfolio[] = Array.from({ length: 200 }, (_, index) => {
    const providerIndex = index % providers.length;
    const provider = providers[providerIndex];
    const service = services.find((item) => item.providerUserKey === provider.userKey)!;
    const variations = ["ambiente compacto", "acabamento em tom claro", "peça reaproveitada", "instalação em imóvel ocupado", "reparo localizado", "parede de alvenaria", "móvel de uso diário", "espaço com pouco acesso"];
    const exampleTypes = ["preparação", "ajuste", "organização", "fixação", "acabamento", "planejamento", "reparo", "montagem", "medição", "proteção do ambiente"];
    return { key: `portfolio-${String(index + 1).padStart(3, "0")}`, providerUserKey: provider.userKey, serviceKey: service.key,
      title: `Exemplo demonstrativo de ${exampleTypes[index % exampleTypes.length]}: ${service.title}`,
      description: `Registro fictício de ${variations[index % variations.length]}, com foco em ${exampleTypes[index % exampleTypes.length]} e adaptação ao espaço descrito. Não representa trabalho real e não foi verificado pela plataforma.`,
      isDemo: true, createdAt: days(DEMO_REFERENCE_DATE, -120 - index), updatedAt: DEMO_REFERENCE_DATE };
  });

  return buildRemainingFixture({ users, providers, services, portfolio, neighborhoods: allNeighborhoods, providerServiceAreas, userNames, categoriesBySlug });
}

function buildRemainingFixture(base: Pick<DemoFixture, "users" | "providers" | "services" | "portfolio" | "neighborhoods" | "providerServiceAreas"> & {
  userNames: Map<string, string>; categoriesBySlug: Map<string, typeof categories[number]>;
}): DemoFixture {
  const { users, providers, services, portfolio, neighborhoods, providerServiceAreas, userNames, categoriesBySlug } = base;
  const requests: DemoRequest[] = [];
  const conversations: DemoConversation[] = [];
  const requestByKey = new Map<string, DemoRequest>();
  const providerByKey = new Map(providers.map((provider) => [provider.userKey, provider]));
  const dualRoleIndices = new Set([5, 17, 29, 41, 53]);
  const requestCountForIndex = (index: number): number => index < 42 ? 3 : 2;

  const statusForRequest = (index: number): DemoRequest["status"] =>
    index < 20 ? "OPEN" : index < 24 ? "PAUSED" : index < 34 || index === 60 ? "IN_PROGRESS" : index < 60 ? "COMPLETED" : "CANCELLED";
  const topics = [
    { title: "A pia da cozinha está vazando", description: "A água aparece no armário quando lavo a louça; queria entender se é o sifão ou a torneira e quanto custa resolver." },
    { title: "A tomada esquenta quando uso o secador", description: "Percebi cheiro de quente e a placa fica morna depois de alguns minutos. Preciso de um diagnóstico antes de continuar usando." },
    { title: "Quero instalar prateleiras na sala", description: "São três prateleiras e a parede parece ser de alvenaria. Tenho as peças, mas não sei quais buchas usar." },
    { title: "A parede perto da janela fica úmida", description: "Depois da chuva aparece uma mancha no canto do quarto. Gostaria de localizar a entrada de água antes de pintar." },
    { title: "A porta do quarto raspa no piso", description: "Começou a prender quando abro e fecha com dificuldade. Queria ajustar sem trocar a porta inteira." },
    { title: "O ar-condicionado está pingando", description: "A água escorre pela parede quando o aparelho fica ligado por um tempo. O filtro foi limpo recentemente." },
    { title: "Preciso montar um guarda-roupa", description: "As caixas chegaram e o quarto é pequeno; gostaria de combinar a montagem e a retirada das embalagens." },
    { title: "As calhas transbordam na chuva", description: "Folhas acumulam perto da descida e a água volta para a varanda. Preciso verificar a calha e o rufo." },
    { title: "Quero pintar o apartamento antes da mudança", description: "São dois quartos e a sala, com algumas marcas de móveis nas paredes. O imóvel estará vazio na semana que vem." },
    { title: "A máquina de lavar não escoa", description: "Depois do ciclo fica água no tambor e a mangueira parece dobrada atrás do armário. Pode avaliar a instalação?" },
    { title: "A descarga continua enchendo", description: "O barulho não para e às vezes a água escorre dentro do vaso. É uma caixa acoplada comum." },
    { title: "Quero trocar o espelho do banheiro", description: "O espelho atual está manchado nas bordas. Tenho as medidas aproximadas e gostaria de confirmar a fixação." },
    { title: "Preciso de ajuda para uma pequena mudança", description: "São caixas, uma cama e uma mesa, saindo de um apartamento com elevador para uma casa próxima." },
    { title: "O jardim ficou tomado por folhas", description: "Queria podar algumas plantas, limpar o canteiro e receber uma orientação simples sobre rega." },
    { title: "A gaveta da cozinha saiu do trilho", description: "Ela fica torta e prende quando puxo. O móvel ainda está em bom estado e gostaria de tentar um reparo." },
    { title: "Preciso instalar uma luminária", description: "Já comprei o pendente, mas o teto tem um ponto antigo e prefiro que alguém confira a ligação." },
    { title: "O box está fazendo barulho", description: "As roldanas raspam e uma das folhas não encosta direito. Queria saber se dá para ajustar as peças." },
    { title: "A torneira do tanque está pingando", description: "Mesmo fechada continua caindo uma gota a cada poucos segundos. O registro geral está funcionando." },
    { title: "Quero limpar o apartamento depois da obra", description: "Ficou pó fino nos armários, no piso e nas janelas. O serviço é para um apartamento de dois quartos." },
    { title: "A porta do armário não alinha", description: "Uma folha ficou mais baixa e encosta na outra. Talvez precise regular as dobradiças." },
    { title: "O ventilador de teto parou de girar", description: "A luz ainda acende, mas o motor não responde ao controle. Gostaria de verificar a ligação e o aparelho." },
    { title: "Quero instalar um filtro na cozinha", description: "Comprei um filtro de parede e preciso conferir se há espaço e conexão perto da pia." },
    { title: "Tem uma goteira perto da chaminé", description: "A mancha aparece só quando chove forte. Gostaria de uma avaliação do telhado e do rufo." },
    { title: "Preciso organizar um quintal pequeno", description: "Quero tirar folhas, aparar duas plantas e deixar o espaço pronto para receber visitas." },
    { title: "A parede está descascando perto do banheiro", description: "A tinta soltou em uma área pequena e não sei se é umidade ou só falta de preparação da superfície." },
    { title: "Quero instalar um forno elétrico", description: "O forno novo chegou e preciso confirmar se o nicho e a tomada são adequados antes de ligar." },
    { title: "Uma janela está difícil de abrir", description: "A folha de vidro prende no trilho e faz um estalo. Queria avaliar o ajuste e a segurança." },
    { title: "Preciso desmontar uma mesa para mudança", description: "A mesa não passa pela porta montada. Gostaria de desmontar, proteger as peças e remontar no destino." },
    { title: "A luz da cozinha pisca às vezes", description: "A lâmpada é nova, mas pisca quando ligo o micro-ondas. Preciso verificar o ponto e o circuito." },
    { title: "Quero instalar uma prateleira no banheiro", description: "A parede tem revestimento e não quero trincar o azulejo. A peça já está comprada." },
    { title: "A porta de vidro do box está desalinhada", description: "Ela corre com dificuldade e deixa passar água na lateral. Gostaria de ajustar trilho e vedação." },
    { title: "Preciso limpar janelas de correr", description: "As janelas da sala estão com marcas de chuva e poeira acumulada nos trilhos." },
  ];
  const topicCategories = [
    "hidraulica", "eletricidade", "pequenos-reparos", "telhados-calhas", "pequenos-reparos", "climatizacao", "montagem-moveis", "telhados-calhas",
    "pintura", "eletrodomesticos", "hidraulica", "vidracaria", "mudancas-fretes", "jardinagem", "marcenaria", "eletricidade",
    "vidracaria", "hidraulica", "limpeza", "marcenaria", "eletricidade", "eletrodomesticos", "telhados-calhas", "jardinagem",
    "pintura", "eletrodomesticos", "vidracaria", "mudancas-fretes", "eletricidade", "pequenos-reparos", "vidracaria", "limpeza",
  ];
  const requestFollowUps = [
    "Consigo enviar fotos do local antes de combinar a visita.",
    "O prédio tem elevador e posso receber alguém durante a tarde.",
    "Prefiro saber o que está incluído no valor antes de agendar.",
    "O acesso é simples e posso liberar o espaço para o serviço.",
    "Ainda não comprei materiais porque quero confirmar as medidas.",
    "Se possível, gostaria de receber uma previsão de duração.",
    "Posso explicar melhor por mensagem e combinar um horário no fim de semana.",
    "O problema começou há pouco e quero evitar que aumente.",
  ];

  for (let i = 0; i < 64; i += 1) {
    const key = `request-${String(i + 1).padStart(3, "0")}`;
    const topic = topics[i % topics.length];
    const description = i < topics.length ? topic.description : `${topic.description} ${requestFollowUps[(i - topics.length) % requestFollowUps.length]}`;
    const neighborhoodSlug = i === 0 ? "agua-verde" : i === 1 ? "uberaba" : i === 2 || i === 33 ? "bacacheri" : neighborhoods[(i * 7 + 5) % neighborhoods.length].slug;
    const needed = requestCountForIndex(i);
    const areaProviders = providers.filter((provider) => provider.neighborhoodSlugs.includes(neighborhoodSlug));
    let chosenCategorySlug: string | null = null;
    if (i === 0 || i === 1) chosenCategorySlug = "hidraulica";
    else {
      const expectedCategory = topicCategories[i % topicCategories.length];
      if (areaProviders.filter((provider) => provider.categorySlugs.includes(expectedCategory)).length >= needed) chosenCategorySlug = expectedCategory;
    }
    let candidates = chosenCategorySlug
      ? areaProviders.filter((provider) => provider.categorySlugs.includes(chosenCategorySlug!))
      : areaProviders;
    if (i === 0 || i === 1) candidates = [0, 3, 6].map((providerIndex) => providers[providerIndex]);
    if (candidates.length < needed) throw new Error(`Não há ${needed} prestadores compatíveis com ${neighborhoodSlug} para ${key}.`);
    const start = (i * 5) % candidates.length;
    const selected = i === 0 || i === 1 ? candidates : Array.from({ length: needed }, (_, offset) => candidates[(start + offset) % candidates.length]);

    const status = statusForRequest(i);
    const ageDays = status === "OPEN" ? 2 + (i % 4) * 0.2
      : status === "PAUSED" ? 5 + (i % 4)
        : status === "IN_PROGRESS" ? 8 + (i % 4)
          : status === "COMPLETED" ? 15 + (i % 19) : 6 + (i % 5);
    const createdAt = atOffset(DEMO_REFERENCE_DATE, -ageDays * 86_400_000);
    const availableDualRoleProviders = providers.filter((provider) => !selected.some((conversationProvider) => conversationProvider.userKey === provider.userKey));
    const clientUserKey = dualRoleIndices.has(i)
      ? availableDualRoleProviders[(i * 7) % availableDualRoleProviders.length].userKey
      : `client-${String((i % 16) + 1).padStart(3, "0")}`;
    const request: DemoRequest = { key, clientUserKey,
      categorySlug: chosenCategorySlug, neighborhoodSlug, title: topic.title, description, status,
      budgetMin: i % 4 === 0 ? null : money(12000 + ((i * 811) % 18000)),
      budgetMax: i % 4 === 0 ? null : money(38000 + ((i * 1297) % 42000)), createdAt,
      desiredDate: status === "OPEN" || status === "PAUSED" ? days(DEMO_REFERENCE_DATE, 7 + (i % 24)) : null,
      reopenedAt: null, isDemo: true };
    requests.push(request);
    requestByKey.set(key, request);
    for (let position = 0; position < needed; position += 1) {
      const provider = selected[position];
      const conversationKey = `conversation-${key}-${provider.userKey}`;
      conversations.push({ key: conversationKey, requestKey: key, providerUserKey: provider.userKey,
        status: status === "COMPLETED" || status === "CANCELLED" ? "CLOSED" : "OPEN", createdAt: atOffset(createdAt, position * 60_000) });
    }
  }

  const ordersRequested = new Set(requests.filter((request) => request.status === "IN_PROGRESS" || request.status === "COMPLETED" || request.key === "request-061" || request.key === "request-062").map((request) => request.key));
  const conversationGroups = new Map<string, DemoConversation[]>();
  for (const conversation of conversations) {
    const group = conversationGroups.get(conversation.requestKey) ?? [];
    group.push(conversation); conversationGroups.set(conversation.requestKey, group);
  }
  const conversationsWithQuotes = new Set<string>();
  for (const conversation of conversations) if (ordersRequested.has(conversation.requestKey)) conversationsWithQuotes.add(conversation.key);
  for (const requestKey of ["request-001", "request-002", "request-003"]) for (const conversation of conversationGroups.get(requestKey) ?? []) conversationsWithQuotes.add(conversation.key);
  for (const conversation of conversations) {
    if (conversationsWithQuotes.size >= 140) break;
    conversationsWithQuotes.add(conversation.key);
  }
  if (conversationsWithQuotes.size !== 140) throw new Error(`Esperadas 140 conversas com propostas; encontradas ${conversationsWithQuotes.size}.`);

  const quoteRows: DemoQuote[] = [];
  let quoteSequence = 0;
  const multiOfferConversationKeys = new Set([...conversationsWithQuotes].slice(0, 60));
  for (const conversation of conversations) {
    if (!conversationsWithQuotes.has(conversation.key)) continue;
    const request = requestByKey.get(conversation.requestKey)!;
    const provider = providerByKey.get(conversation.providerUserKey)!;
    const offeredServices = services.filter((service) => service.providerUserKey === provider.userKey && (!request.categorySlug || service.categorySlug === request.categorySlug));
    if (offeredServices.length === 0) throw new Error(`O prestador ${provider.userKey} não anuncia serviço compatível com ${request.key}.`);
    const numberOfOffers = multiOfferConversationKeys.has(conversation.key) ? 2 : 1;
    for (let offer = 0; offer < numberOfOffers; offer += 1) {
      quoteSequence += 1;
      const service = offeredServices[offer % offeredServices.length];
      quoteRows.push({ key: `quote-${String(quoteSequence).padStart(3, "0")}`, conversationKey: conversation.key,
        serviceKey: service.key, versions: [] });
    }
  }
  const recontractRequest = requestByKey.get("request-061")!;
  const recontractConversation = conversationGroups.get(recontractRequest.key)![1];
  const recontractProvider = providerByKey.get(recontractConversation.providerUserKey)!;
  const recontractService = services.find((service) => service.providerUserKey === recontractProvider.userKey
    && (!recontractRequest.categorySlug || service.categorySlug === recontractRequest.categorySlug));
  if (!recontractService) throw new Error("Não há serviço anunciado compatível para a recontratação demonstrativa.");
  quoteRows.push({ key: "quote-recontract-request-061", conversationKey: recontractConversation.key,
    serviceKey: recontractService.key, versions: [] });
  if (quoteRows.length !== 201) throw new Error(`Esperadas 201 propostas independentes; encontradas ${quoteRows.length}.`);

  const quoteByKey = new Map(quoteRows.map((quote) => [quote.key, quote]));
  const recontractQuoteKey = "quote-recontract-request-061";
  const quoteByConversation = new Map<string, DemoQuote[]>();
  for (const quote of quoteRows) {
    const group = quoteByConversation.get(quote.conversationKey) ?? [];
    group.push(quote); quoteByConversation.set(quote.conversationKey, group);
  }
  const acceptedQuoteForRequest = new Map<string, string>();
  for (const request of requests.filter((row) => ordersRequested.has(row.key))) {
    const firstConversation = conversationGroups.get(request.key)![0];
    const firstQuote = quoteByConversation.get(firstConversation.key)?.[0];
    if (!firstQuote) throw new Error(`A solicitação ${request.key} precisa de uma proposta formal para sua ordem.`);
    acceptedQuoteForRequest.set(request.key, firstQuote.key);
  }

  const quoteIndex = new Map(quoteRows.map((quote, index) => [quote.key, index]));
  const revisionQuoteKeys = new Set(quoteRows.slice(0, 30).map((quote) => quote.key));
  for (const quote of quoteRows) {
    const index = quoteIndex.get(quote.key)!;
    const requestKey = conversations.find((conversation) => conversation.key === quote.conversationKey)!.requestKey;
    let status: DemoQuoteVersion["status"];
    if (acceptedQuoteForRequest.get(requestKey) === quote.key || quote.key === recontractQuoteKey) status = "ACCEPTED";
    else if (ordersRequested.has(requestKey)) status = index % 3 === 0 ? "WITHDRAWN" : "REJECTED";
    else if (requestByKey.get(requestKey)!.status === "OPEN") status = index % 7 === 3 ? "WITHDRAWN" : index % 7 === 4 ? "REJECTED" : "SENT";
    else if (index % 9 === 3) status = "EXPIRED";
    else if (index % 9 === 4) status = "WITHDRAWN";
    else if (index % 9 === 5) status = "REJECTED";
    else status = "SENT";
    const service = services.find((item) => item.key === quote.serviceKey)!;
    const request = requestByKey.get(requestKey)!;
    let sentAt = atOffset(request.createdAt, (3 + (index % 4) * 3) * 60 * 60 * 1000);
    if (quote.key === recontractQuoteKey) {
      const historicalAcceptedQuote = quoteByKey.get(acceptedQuoteForRequest.get(requestKey)!)!;
      const historicalAcceptedVersion = historicalAcceptedQuote.versions[historicalAcceptedQuote.versions.length - 1];
      const historicalCancelledAt = atOffset(historicalAcceptedVersion.sentAt, 6 * 60 * 60 * 1000 + 2 * 86_400_000);
      request.reopenedAt = atOffset(historicalCancelledAt, 60 * 60 * 1000);
      sentAt = atOffset(request.reopenedAt, 2 * 60 * 60 * 1000);
    }
    const referenceCents = cents(service.referencePrice);
    const initialCents = referenceCents + 3500 + ((index * 439) % 16500);
    const offerTerms = [
      "Materiais previstos nos itens; qualquer substituição será confirmada antes da compra.",
      "Valor considera acesso desimpedido ao local e descarte comum da embalagem.",
      "A execução começa após a conferência das medidas e proteção da área de trabalho.",
      "Peças especiais não listadas serão orçadas separadamente com autorização do cliente.",
      "O prazo considera uma visita em horário comercial e o espaço disponível para execução.",
      "A proposta inclui teste final e orientação de uso após a conclusão do serviço.",
    ];
    const versions: DemoQuoteVersion[] = [];
    const totalVersions = revisionQuoteKeys.has(quote.key) ? 2 : 1;
    for (let version = 1; version <= totalVersions; version += 1) {
      const isRevision = version === 2;
      const versionSentAt = isRevision ? atOffset(sentAt, 12 * 60 * 60 * 1000) : sentAt;
      const totalCents = isRevision ? Math.max(7000, initialCents - 2500 - ((index * 71) % 3200)) : initialCents;
      const latestStatus = status;
      const versionStatus = isRevision ? latestStatus : totalVersions > 1 ? "SUPERSEDED" : latestStatus;
      const expiredDate = versionStatus === "EXPIRED" ? atOffset(DEMO_REFERENCE_DATE, -86_400_000) : atOffset(DEMO_REFERENCE_DATE, 30 * 86_400_000);
      const firstLineCents = Math.floor((totalCents * (version % 2 === 0 ? 58 : 64)) / 100);
      const itemCategory = categoriesBySlug.get(service.categorySlug)!.name;
      const scopeDescription = `${request.title}. ${service.description}${isRevision ? " Revisão: escopo e condições ajustados após conversa com o cliente." : ""}`;
      versions.push({ version, scopeDescription, serviceTitleSnapshot: service.title, totalAmount: money(totalCents),
        estimatedDurationDays: 1 + ((index + version) % 8), validUntil: expiredDate,
        proposedStartAt: atOffset(versionSentAt, 3 * 86_400_000), proposedEndAt: atOffset(versionSentAt, 4 * 86_400_000),
        terms: isRevision ? `Esta versão substitui a anterior nesta mesma oferta. ${offerTerms[(index + version) % offerTerms.length]}` : offerTerms[(index + version) % offerTerms.length],
        status: versionStatus, createdAt: atOffset(versionSentAt, -60_000), sentAt: versionSentAt,
        items: [{ description: `${service.title} — mão de obra e execução`, quantity: "1.00", unitPrice: money(firstLineCents) },
          { description: `${itemCategory} — materiais e insumos previstos`, quantity: "1.00", unitPrice: money(totalCents - firstLineCents) }] });
    }
    quote.versions = versions;
  }

  const orders: DemoOrder[] = [];
  const orderByRequest = new Map<string, DemoOrder>();
  for (const request of requests.filter((row) => ordersRequested.has(row.key))) {
    const quoteKey = acceptedQuoteForRequest.get(request.key)!;
    const quote = quoteByKey.get(quoteKey)!;
    const acceptedVersion = quote.versions[quote.versions.length - 1];
    const acceptedAt = atOffset(acceptedVersion.sentAt, 6 * 60 * 60 * 1000);
    if (request.key === "request-061") {
      const cancelledAt = atOffset(acceptedAt, 2 * 86_400_000);
      const cancelledOrder: DemoOrder = { key: "order-request-061-cancelled", requestKey: request.key,
        quoteKey, acceptedVersion: acceptedVersion.version, status: "CANCELLED", acceptedAt,
        startedAt: null, completedAt: null, cancelledAt, isDemo: true };
      const recontractQuote = quoteByKey.get(recontractQuoteKey)!;
      const recontractVersion = recontractQuote.versions[recontractQuote.versions.length - 1];
      const recontractAcceptedAt = atOffset(recontractVersion.sentAt, 6 * 60 * 60 * 1000);
      const activeOrder: DemoOrder = { key: "order-request-061-recontracted", requestKey: request.key,
        quoteKey: recontractQuoteKey, acceptedVersion: recontractVersion.version, status: "IN_PROGRESS",
        acceptedAt: recontractAcceptedAt, startedAt: atOffset(recontractAcceptedAt, 4 * 86_400_000),
        completedAt: null, cancelledAt: null, isDemo: true };
      if (!request.reopenedAt || !(cancelledAt < request.reopenedAt && request.reopenedAt < recontractVersion.sentAt)) {
        throw new Error("A cronologia de cancelamento, reabertura e nova proposta está inconsistente.");
      }
      orders.push(cancelledOrder, activeOrder);
      orderByRequest.set(request.key, activeOrder);
      continue;
    }
    const status: DemoOrder["status"] = request.status === "IN_PROGRESS" ? "IN_PROGRESS" : request.status === "COMPLETED" ? "COMPLETED" : "CANCELLED";
    const order: DemoOrder = { key: `order-${request.key}`, requestKey: request.key, quoteKey, acceptedVersion: acceptedVersion.version,
      status, acceptedAt, startedAt: status === "CANCELLED" ? null : atOffset(acceptedAt, 4 * 86_400_000),
      completedAt: status === "COMPLETED" ? atOffset(acceptedAt, 5 * 86_400_000) : null,
      cancelledAt: status === "CANCELLED" ? atOffset(acceptedAt, 2 * 86_400_000) : null, isDemo: true };
    orders.push(order); orderByRequest.set(request.key, order);
  }

  const reviewComments = [
      "O profissional explicou o que encontrou e cumpriu o combinado.",
      "Atendimento cuidadoso; o resultado ficou bom e a casa foi protegida durante o serviço.",
      "Resolveu o problema e deixou orientações simples para manutenção.",
      "A comunicação foi clara e o escopo ficou alinhado antes de começar.",
      "Chegou no horário combinado e terminou dentro do prazo informado.",
      "O serviço ficou bem feito; combinamos um pequeno ajuste no acabamento.",
  ];
  const reviewDetails = ["A visita ocorreu no período combinado.", "O orçamento descreveu os materiais usados.", "Este relato fictício integra a demonstração do marketplace."];
  const reviews: DemoReview[] = orders.filter((order) => order.status === "COMPLETED").slice(0, 24).map((order, index) => ({
    orderKey: order.key, rating: [5, 4, 5, 3, 5, 4, 4, 5][index % 8],
    comment: `${reviewComments[index % reviewComments.length]} ${reviewDetails[Math.floor(index / 8)]}`,
    isDemo: true, createdAt: order.completedAt! }));

  const messages: DemoMessage[] = [];
  for (const conversation of conversations) {
    const request = requestByKey.get(conversation.requestKey)!;
    const clientName = userNames.get(request.clientUserKey)!;
    const providerName = userNames.get(conversation.providerUserKey)!;
    messages.push({ conversationKey: conversation.key, senderUserKey: request.clientUserKey, type: "TEXT",
      body: `Olá, ${providerName.split(" ")[0]}. ${request.description}`, quoteKey: null, quoteVersion: null,
      createdAt: atOffset(conversation.createdAt, 15 * 60_000) });
    messages.push({ conversationKey: conversation.key, senderUserKey: conversation.providerUserKey, type: "TEXT",
      body: `Oi, ${clientName.split(" ")[0]}! Posso entender melhor o local e os materiais antes de confirmar o escopo.`, quoteKey: null, quoteVersion: null,
      createdAt: atOffset(conversation.createdAt, 45 * 60_000) });
    for (const quote of quoteByConversation.get(conversation.key) ?? []) {
      for (const version of quote.versions) messages.push({ conversationKey: conversation.key, senderUserKey: conversation.providerUserKey,
        type: "QUOTE", body: null, quoteKey: quote.key, quoteVersion: version.version, createdAt: version.sentAt });
    }
  }

  const availability: DemoAvailability[] = [];
  for (let i = 0; i < 55; i += 1) {
    const providerUserKey = providers[i].userKey;
    const weekdayA = 1 + (i % 5);
    const weekdayB = 1 + ((i + 2) % 5);
    availability.push({ providerUserKey, dayOfWeek: weekdayA, startMinute: 480 + (i % 3) * 30, endMinute: 960 + (i % 3) * 30, timeZone: "America/Sao_Paulo", isActive: true });
    availability.push({ providerUserKey, dayOfWeek: weekdayB, startMinute: 540 + (i % 2) * 30, endMinute: 1020 + (i % 2) * 30, timeZone: "America/Sao_Paulo", isActive: true });
    if (i % 2 === 0) availability.push({ providerUserKey, dayOfWeek: 6, startMinute: 480, endMinute: 780, timeZone: "America/Sao_Paulo", isActive: true });
  }

  return { users, providers, categories: [...categories], neighborhoods, services, portfolio, requests, conversations,
    quotes: quoteRows, messages, orders, reviews, availability, providerServiceAreas };
}

export function validateDemoFixture(fixture: DemoFixture): void {
  const assert: (condition: unknown, message: string) => asserts condition = (condition, message) => { if (!condition) throw new Error(message); };
  const expectedCounts: [string, number, number][] = [
    ["usuários", fixture.users.length, 101], ["prestadores", fixture.providers.length, 85], ["categorias", fixture.categories.length, 13],
    ["bairros", fixture.neighborhoods.length, 23],
    ["serviços", fixture.services.length, 211], ["portfólio", fixture.portfolio.length, 200], ["solicitações", fixture.requests.length, 64],
    ["conversas", fixture.conversations.length, 170], ["propostas independentes", fixture.quotes.length, 201],
    ["versões de orçamento", fixture.quotes.reduce((sum, quote) => sum + quote.versions.length, 0), 231],
    ["mensagens", fixture.messages.length, 571], ["ordens", fixture.orders.length, 39], ["avaliações", fixture.reviews.length, 24],
  ];
  for (const [label, actual, expected] of expectedCounts) assert(actual === expected, `Quantidade de ${label}: esperado ${expected}; recebido ${actual}.`);
  assert(new Set(fixture.users.map((user) => user.email)).size === fixture.users.length, "Os emails do seed precisam ser únicos.");
  const providerKeys = new Set(fixture.providers.map((provider) => provider.userKey));
  assert(fixture.requests.some((request) => providerKeys.has(request.clientUserKey)), "O fixture deve demonstrar uma conta atuando como cliente e prestador.");
  assert(fixture.users.every((user) => user.isDemo && user.email.endsWith(`@${DEMO_EMAIL_DOMAIN}`)), "Todas as contas devem ser demonstrativas e usar o domínio reservado.");
  assert(fixture.users.every((user) => user.name.trim().length > 3 && !user.name.includes("undefined")), "Há nome de demonstração ausente ou inválido.");
  assert(fixture.providers.some((provider) => provider.userKey === "provider-easter-egg-maria-luiza-rosner")
    && fixture.services.some((service) => service.providerUserKey === "provider-easter-egg-maria-luiza-rosner" && service.title === "Farmar aura"),
  "O easter egg fictício de Maria Luiza Rosner deve permanecer no fixture.");
  assert(fixture.requests.every((request) => request.isDemo && fixture.neighborhoods.some((item) => item.slug === request.neighborhoodSlug)), "Toda solicitação deve ser demo e apontar para um bairro do catálogo.");
  assert(fixture.requests.every((request) => request.createdAt <= DEMO_REFERENCE_DATE
    && (request.reopenedAt === null || request.reopenedAt <= DEMO_REFERENCE_DATE)), "Solicitação ou reabertura com evento futuro em relação à referência.");
  assert(fixture.portfolio.every((item) => item.isDemo && item.description.includes("Não representa trabalho real e não foi verificado pela plataforma.")), "Portfólio demo não pode ser apresentado como verificado.");
  assert(fixture.reviews.every((review) => review.isDemo), "Todas as avaliações preparadas precisam ser explicitamente demonstrativas.");
  assert(fixture.orders.every((order) => order.isDemo), "Todas as ordens preparadas precisam ser explicitamente demonstrativas.");
  assert(fixture.availability.map((row) => row.providerUserKey).filter((key, index, all) => all.indexOf(key) === index).length === 55, "A disponibilidade deve cobrir exatamente 55 prestadores.");
  assert(fixture.availability.every((row) => row.dayOfWeek >= 1 && row.dayOfWeek <= 7 && row.startMinute >= 0 && row.startMinute < row.endMinute && row.endMinute <= 1440), "Disponibilidade fora do intervalo ISO semanal/minutos do dia.");
  assert(fixture.conversations.filter((row) => row.requestKey === "request-001").length === 3, "A solicitação aberta de exemplo precisa comparar três prestadores.");
  assert(fixture.requests.find((row) => row.key === "request-061")?.status === "IN_PROGRESS"
    && fixture.requests.find((row) => row.key === "request-061")?.reopenedAt !== null, "A solicitação 061 precisa estar reaberta e em andamento após nova contratação.");
  assert((fixture.quotes.find((quote) => quote.conversationKey.startsWith("conversation-request-001-"))?.versions.length ?? 0) === 2, "Deve existir uma revisão demonstrativa na primeira solicitação.");
  assert(fixture.quotes.filter((quote) => quote.versions.length === 2).length === 30, "Devem existir exatamente 30 propostas revisadas.");
  assert(fixture.neighborhoods.every((item) => item.city === "Curitiba" && item.state === "PR"), "O catálogo demonstrativo deve estar restrito a Curitiba/PR.");
  assert(new Set(fixture.requests.map((request) => request.neighborhoodSlug)).size === 23, "As solicitações devem cobrir os 23 bairros do catálogo.");
  assert(new Set(fixture.providers.map((provider) => provider.referenceNeighborhoodSlug)).size === 23, "Os bairros de referência devem cobrir o catálogo de Curitiba.");
  assert(new Set(fixture.services.map((service) => service.categorySlug)).size === 13, "Todas as categorias precisam ter serviços anunciados.");
  assert(new Set(fixture.providerServiceAreas.map((area) => `${area.providerUserKey}|${area.neighborhoodSlug}`)).size === fixture.providerServiceAreas.length, "Há associações repetidas de bairro atendido.");
  assert(new Set(fixture.availability.filter((row) => row.dayOfWeek === 6).map((row) => row.providerUserKey)).size === 28, "O fixture deve oferecer filtro de sábado para parte dos prestadores.");
  assert(new Set(fixture.reviews.map((review) => review.rating)).size >= 3, "As avaliações demonstrativas precisam variar as notas.");
  const offersPerConversation = new Map<string, number>();
  for (const quote of fixture.quotes) offersPerConversation.set(quote.conversationKey, (offersPerConversation.get(quote.conversationKey) ?? 0) + 1);
  assert([...offersPerConversation.values()].filter((count) => count > 1).length >= 60, "É necessário demonstrar propostas independentes no mesmo chat.");
  assert(fixture.conversations.filter((row) => !offersPerConversation.has(row.key)).length >= 30, "É necessário demonstrar conversas sem proposta formal.");

  const providerMap = new Map(fixture.providers.map((provider) => [provider.userKey, provider]));
  const requestMap = new Map(fixture.requests.map((request) => [request.key, request]));
  const conversationMap = new Map(fixture.conversations.map((conversation) => [conversation.key, conversation]));
  const serviceMap = new Map(fixture.services.map((service) => [service.key, service]));
  const quoteMap = new Map(fixture.quotes.map((quote) => [quote.key, quote]));
  const versions = new Map<string, DemoQuoteVersion>();
  for (const provider of fixture.providers) {
    assert(provider.neighborhoodSlugs.includes(provider.referenceNeighborhoodSlug), `O bairro de referência de ${provider.userKey} precisa estar na área atendida.`);
    assert(provider.neighborhoodSlugs.every((slug) => fixture.neighborhoods.some((item) => item.slug === slug)), `Bairro de atendimento desconhecido em ${provider.userKey}.`);
  }
  for (const provider of fixture.providers) {
    const providerServices = fixture.services.filter((service) => service.providerUserKey === provider.userKey);
    const isEasterEgg = provider.userKey === "provider-easter-egg-maria-luiza-rosner";
    assert(isEasterEgg ? providerServices.length === 1 : providerServices.length === 2 || providerServices.length === 3,
      `Quantidade de serviços inesperada para ${provider.userKey}.`);
    assert(providerServices.every((service) => provider.categorySlugs.includes(service.categorySlug)), `Categoria de serviço não está declarada no perfil ${provider.userKey}.`);
  }
  for (const conversation of fixture.conversations) {
    const request = requestMap.get(conversation.requestKey)!;
    const provider = providerMap.get(conversation.providerUserKey)!;
    assert(request.createdAt <= conversation.createdAt && conversation.createdAt <= DEMO_REFERENCE_DATE,
      `Conversa ${conversation.key} está fora da cronologia da solicitação ou da referência.`);
    assert(provider.neighborhoodSlugs.includes(request.neighborhoodSlug), `A conversa ${conversation.key} não atende o bairro da solicitação.`);
    if (request.categorySlug) assert(provider.categorySlugs.includes(request.categorySlug), `A conversa ${conversation.key} não oferece a categoria solicitada.`);
  }
  for (const quote of fixture.quotes) {
    const conversation = conversationMap.get(quote.conversationKey)!;
    const provider = providerMap.get(conversation.providerUserKey)!;
    const service = serviceMap.get(quote.serviceKey)!;
    const request = requestMap.get(conversation.requestKey)!;
    assert(service.providerUserKey === provider.userKey, `Serviço da proposta ${quote.key} pertence a outro prestador.`);
    if (request.categorySlug) assert(service.categorySlug === request.categorySlug, `Serviço da proposta ${quote.key} não corresponde à categoria da solicitação.`);
    assert(quote.versions.length === 1 || quote.versions.length === 2, `Cadeia de versões inválida para ${quote.key}.`);
    for (let index = 0; index < quote.versions.length; index += 1) {
      const version = quote.versions[index];
      assert(version.version === index + 1, `Numeração de versões inválida em ${quote.key}.`);
      if (index === 0 && quote.versions.length > 1) assert(version.status === "SUPERSEDED", `Versão anterior de ${quote.key} precisa estar supersedida.`);
      assert(version.createdAt <= version.sentAt && version.createdAt <= DEMO_REFERENCE_DATE && version.sentAt <= DEMO_REFERENCE_DATE
        && version.sentAt < version.validUntil, `Cronologia inválida ou futura na versão ${quote.key} v${version.version}.`);
      if (index > 0) assert(version.createdAt > quote.versions[index - 1].sentAt, `A revisão ${quote.key} v${version.version} precisa ser criada após o envio da versão anterior.`);
      assert(version.proposedStartAt < version.proposedEndAt, `Janela proposta inválida em ${quote.key} v${version.version}.`);
      if (version.status === "SENT" && request.status === "OPEN") assert(version.validUntil > DEMO_REFERENCE_DATE && version.proposedStartAt > DEMO_REFERENCE_DATE, `Proposta atual da solicitação aberta ${request.key} precisa estar válida e ter janela futura.`);
      if (version.status === "EXPIRED") assert(version.validUntil < DEMO_REFERENCE_DATE, `Proposta expirada ${quote.key} não tem validade vencida.`);
      assert(version.items.every((item) => item.quantity === "1.00"), `Quantidade de item inesperada em ${quote.key} v${version.version}.`);
      const itemCents = version.items.reduce((sum, item) => sum + cents(item.unitPrice), 0);
      assert(itemCents === cents(version.totalAmount), `A soma dos itens de ${quote.key} v${version.version} não fecha com o total.`);
      versions.set(`${quote.key}:${version.version}`, version);
    }
  }
  const quoteCardKeys = new Set<string>();
  for (const message of fixture.messages) {
    const conversation = conversationMap.get(message.conversationKey);
    assert(conversation, "Mensagem sem conversa existente.");
    assert(conversation.createdAt <= message.createdAt && message.createdAt <= DEMO_REFERENCE_DATE,
      "Mensagem fora da cronologia da conversa ou posterior à referência do seed.");
    if (message.type === "TEXT") assert(message.body !== null && message.quoteKey === null && message.quoteVersion === null, "Mensagem de texto com referência de orçamento inconsistente.");
    else {
      assert(message.body === null && message.quoteKey !== null && message.quoteVersion !== null, "Card de orçamento deve referenciar somente uma versão estruturada.");
      const quote = quoteMap.get(message.quoteKey!)!;
      assert(quote.conversationKey === message.conversationKey && versions.has(`${message.quoteKey}:${message.quoteVersion}`), "Card aponta para versão de outra conversa ou inexistente.");
      const representedVersion = versions.get(`${message.quoteKey}:${message.quoteVersion}`)!;
      assert(message.createdAt >= representedVersion.createdAt && message.createdAt === representedVersion.sentAt,
        "Card de orçamento antecede a versão ou diverge do timestamp de envio.");
      const cardKey = `${message.quoteKey}:${message.quoteVersion}`;
      assert(!quoteCardKeys.has(cardKey), `Versão ${cardKey} tem mais de um card no chat.`);
      quoteCardKeys.add(cardKey);
    }
  }
  assert(quoteCardKeys.size === versions.size, "Toda versão enviada precisa de exatamente um card relacionado no chat.");
  for (const order of fixture.orders) {
    const request = requestMap.get(order.requestKey)!;
    const quote = quoteMap.get(order.quoteKey)!;
    const conversation = conversationMap.get(quote.conversationKey)!;
    const version = versions.get(`${order.quoteKey}:${order.acceptedVersion}`)!;
    if (request.key !== "request-061") {
      const expectedRequestStatus = order.status === "ACCEPTED" || order.status === "IN_PROGRESS" ? "IN_PROGRESS"
        : order.status === "COMPLETED" ? "COMPLETED" : "CANCELLED";
      assert(request.status === expectedRequestStatus, `Estado incoerente na ordem ${order.key}.`);
    }
    assert(conversation.requestKey === order.requestKey && version.status === "ACCEPTED" && version.validUntil > order.acceptedAt, `Ordem ${order.key} não referencia versão aceita e válida da mesma solicitação.`);
    assert(version.sentAt < order.acceptedAt && order.acceptedAt <= DEMO_REFERENCE_DATE
      && (order.startedAt === null || order.startedAt <= DEMO_REFERENCE_DATE)
      && (order.completedAt === null || order.completedAt <= DEMO_REFERENCE_DATE)
      && (order.cancelledAt === null || order.cancelledAt <= DEMO_REFERENCE_DATE), `Ordem ${order.key} tem cronologia futura ou precede o envio.`);
    assert(order.acceptedVersion === quote.versions[quote.versions.length - 1].version, `Ordem ${order.key} não referencia a versão vigente da oferta no momento do seed.`);
  }
  const ordersByRequest = new Map<string, DemoOrder[]>();
  for (const order of fixture.orders) ordersByRequest.set(order.requestKey, [...(ordersByRequest.get(order.requestKey) ?? []), order]);
  assert(new Set(fixture.orders.map((order) => `${order.quoteKey}:${order.acceptedVersion}`)).size === fixture.orders.length,
    "Uma versão de proposta foi aceita por mais de uma ordem.");
  assert([...ordersByRequest.values()].every((rows) => rows.filter((row) => row.status === "ACCEPTED" || row.status === "IN_PROGRESS").length <= 1),
    "Há mais de uma ordem ativa para a mesma solicitação.");
  assert([...ordersByRequest.values()].every((rows) => !rows.some((row) => row.status === "COMPLETED") || rows.length === 1),
    "Solicitação concluída não pode ter contratação posterior.");
  const cancelledHistorical = ordersByRequest.get("request-061") ?? [];
  assert(cancelledHistorical.length === 2 && cancelledHistorical.some((row) => row.status === "CANCELLED")
    && cancelledHistorical.some((row) => row.status === "IN_PROGRESS"), "A solicitação 061 precisa preservar a ordem cancelada e a nova ordem ativa.");
  const firstCancelled = cancelledHistorical.find((row) => row.status === "CANCELLED")!;
  const currentRecontracted = cancelledHistorical.find((row) => row.status === "IN_PROGRESS")!;
  assert(firstCancelled.cancelledAt !== null && fixture.requests.find((row) => row.key === "request-061")!.reopenedAt! > firstCancelled.cancelledAt
    && currentRecontracted.acceptedAt > fixture.requests.find((row) => row.key === "request-061")!.reopenedAt!, "Reabertura e recontratação precisam ocorrer após o cancelamento anterior.");
  assert(fixture.requests.filter((request) => request.status === "PAUSED").every((request) => !(ordersByRequest.get(request.key)?.length)), "Solicitação pausada não pode possuir contratação aceita.");
  assert(fixture.reviews.every((review) => fixture.orders.some((order) => order.key === review.orderKey && order.status === "COMPLETED"
    && order.completedAt !== null && order.completedAt <= review.createdAt && review.createdAt <= DEMO_REFERENCE_DATE)),
  "Avaliação precisa ocorrer após a conclusão e antes da referência temporal.");
  const textByConversation = new Map<string, number>();
  for (const message of fixture.messages) if (message.type === "TEXT") textByConversation.set(message.conversationKey, (textByConversation.get(message.conversationKey) ?? 0) + 1);
  assert(fixture.conversations.every((conversation) => textByConversation.get(conversation.key) === 2), "Cada conversa precisa conter as duas mensagens comuns de demonstração.");
}
