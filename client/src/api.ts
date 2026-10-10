export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
}

export interface Neighborhood {
  id: number;
  slug: string;
  name: string;
  city?: string;
  state?: string;
}

export interface ProviderService {
  id: number;
  title: string;
  description: string;
  referencePrice: number | null;
  category: Pick<Category, "id" | "name" | "slug">;
}

export interface Reputation {
  average: number | null;
  count: number;
}

export interface ProviderSummary {
  id: number;
  name: string;
  avatarUrl: string | null;
  isDemo: boolean;
  bio: string | null;
  serviceArea: string | null;
  yearsExperience: number | null;
  referenceNeighborhood: Neighborhood | null;
  serviceAreas: Neighborhood[];
  services: ProviderService[];
  minReferencePrice: number | null;
  reputation: Reputation;
}

export interface ProviderPage {
  data: ProviderSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PortfolioImage {
  id: number;
  imageUrl: string;
  altText: string | null;
}

export interface PortfolioItem {
  id: number;
  title: string;
  description: string | null;
  isDemo: boolean;
  isVerified: boolean;
  service: { id: number; title: string } | null;
  images: PortfolioImage[];
}

export interface Availability {
  id: number;
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
  timeZone: string | null;
}

export interface DemoReview {
  id: number;
  rating: number;
  comment: string | null;
  createdAt: string;
  isDemo: true;
}

export interface ProviderProfile extends ProviderSummary {
  availability: Availability[];
  portfolio: PortfolioItem[];
  demoReviews: DemoReview[];
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:3000").replace(/\/+$/, "");

export class ApiRequestError extends Error {
  public readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "ApiRequestError";
  }
}

interface RequestOptions {
  identityId?: number;
  method?: "GET" | "POST";
  body?: unknown;
}

async function requestJson<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let response: Response;
  try {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (options.identityId !== undefined) headers["X-Demo-User-Id"] = String(options.identityId);
    if (options.body !== undefined) headers["Content-Type"] = "application/json";
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new ApiRequestError("Não foi possível conectar à API. Confira se o servidor está iniciado.", 0);
  }

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      typeof payload === "object" && payload !== null && "error" in payload
        && typeof payload.error === "object" && payload.error !== null && "message" in payload.error
        && typeof payload.error.message === "string"
        ? payload.error.message
        : "Não foi possível carregar os dados.";
    throw new ApiRequestError(message, response.status);
  }

  return payload as T;
}

function getJson<T>(path: string, identityId?: number): Promise<T> {
  return requestJson(path, { identityId });
}

function postJson<T>(path: string, identityId: number, body: unknown): Promise<T> {
  return requestJson(path, { identityId, method: "POST", body });
}

export function getCategories(): Promise<{ data: Category[] }> {
  return getJson("/api/categories");
}

export function getNeighborhoods(): Promise<{ data: Neighborhood[] }> {
  return getJson("/api/neighborhoods");
}

export interface ProviderFilters {
  q?: string;
  categoryId?: string;
  neighborhoodId?: string;
  page: number;
  limit: number;
}

export function getProviders(filters: ProviderFilters): Promise<ProviderPage> {
  const query = new URLSearchParams({
    page: String(filters.page),
    limit: String(filters.limit),
  });
  if (filters.q) query.set("q", filters.q);
  if (filters.categoryId) query.set("categoryId", filters.categoryId);
  if (filters.neighborhoodId) query.set("neighborhoodId", filters.neighborhoodId);
  return getJson(`/api/providers?${query.toString()}`);
}

export function getProvider(id: number): Promise<{ data: ProviderProfile }> {
  return getJson(`/api/providers/${id}`);
}

export interface DemoIdentity {
  id: number;
  name: string;
  avatarUrl: string | null;
  providerProfileId: number | null;
}

export function getDemoIdentities(): Promise<{ data: DemoIdentity[] }> {
  return getJson("/api/demo-identities");
}

export type ServiceRequestStatus = "OPEN" | "PAUSED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type ConversationStatus = "OPEN" | "CLOSED" | "ARCHIVED";

export interface ServiceRequestSummary {
  id: number;
  title: string;
  description: string;
  status: ServiceRequestStatus;
  createdAt: string;
  desiredDate: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  city: string | null;
  region: string | null;
  category: Pick<Category, "id" | "name"> | null;
  neighborhood: Pick<Neighborhood, "id" | "name" | "slug"> | null;
  conversationCount?: number;
}

export interface RequestConversation {
  id: number;
  status: ConversationStatus;
  createdAt: string;
  providerProfile: { id: number; name: string; avatarUrl: string | null };
  messageCount: number;
  latestMessage: { body: string | null; type: "TEXT" | "QUOTE"; createdAt: string } | null;
}

export interface ServiceRequestDetail extends ServiceRequestSummary {
  viewerRole: "CUSTOMER" | "PROVIDER";
  conversations: RequestConversation[];
  serviceOrders: ServiceOrderSummary[];
}

export interface QuoteItem {
  id: number;
  position: number;
  description: string;
  quantity: string;
  unitPrice: string;
}

export type QuoteStatus = "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "WITHDRAWN" | "EXPIRED" | "SUPERSEDED";
export type ServiceOrderStatus = "ACCEPTED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export interface QuoteVersionSummary {
  id: number;
  version: number;
  previousVersionId: number | null;
  scopeDescription: string;
  serviceTitleSnapshot: string | null;
  totalAmount: string;
  estimatedDurationDays: number | null;
  validUntil: string;
  proposedStartAt: string | null;
  proposedEndAt: string | null;
  terms: string | null;
  status: QuoteStatus;
  storedStatus: QuoteStatus;
  isCurrent: boolean;
  canAccept: boolean;
  message: { id: number; createdAt: string } | null;
  items: QuoteItem[];
}

export interface QuoteSummary {
  id: number;
  conversationId: number;
  serviceRequestId: number;
  service: { id: number; title: string } | null;
  provider: {
    id: number;
    name: string;
    avatarUrl: string | null;
    isDemo: boolean;
    reputation: Reputation;
  };
  createdAt: string;
  currentVersionId: number | null;
  canRevise: boolean;
  versions: QuoteVersionSummary[];
}

export interface ServiceOrderSummary {
  id: number;
  status: ServiceOrderStatus;
  acceptedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  provider: { id: number; name: string; avatarUrl: string | null };
  acceptedVersion: Pick<QuoteVersionSummary,
    "id" | "version" | "status" | "serviceTitleSnapshot" | "scopeDescription" | "totalAmount" | "estimatedDurationDays" | "items"> & { quoteId: number };
}

export interface ServiceRequestInput {
  title: string;
  description: string;
  categoryId?: number;
  neighborhoodId?: number;
  budgetMin?: number;
  budgetMax?: number;
  desiredDate?: string;
  providerProfileId?: number;
}

export interface DemoMessage {
  id: number;
  type: "TEXT" | "QUOTE";
  body: string | null;
  createdAt: string;
  sender: { id: number; name: string; avatarUrl: string | null };
  quoteVersion: {
    id: number;
    quoteId: number;
    version: number;
    status: QuoteStatus;
    totalAmount: string;
    validUntil: string;
    scopeDescription: string;
    nextVersion: { id: number } | null;
  } | null;
}

export interface ConversationDetail {
  id: number;
  status: ConversationStatus;
  createdAt: string;
  role: "CUSTOMER" | "PROVIDER";
  canSend: boolean;
  canCreateQuote: boolean;
  otherParticipant: { name: string; avatarUrl: string | null };
  serviceRequest: Pick<ServiceRequestSummary, "id" | "title" | "description" | "status" | "category" | "neighborhood" | "city" | "region">;
  providerProfile: { id: number; name: string; avatarUrl: string | null; services: Array<{ id: number; title: string }> };
}

export interface ConversationInboxItem {
  id: number;
  status: ConversationStatus;
  role: "CUSTOMER" | "PROVIDER";
  serviceRequest: {
    id: number;
    title: string;
    status: ServiceRequestStatus;
    neighborhood: { name: string } | null;
  };
  otherParticipant: { name: string; avatarUrl: string | null };
  quoteCount: number;
  orderStatus: ServiceOrderStatus | null;
  lastActivityAt: string;
  lastMessage: {
    id: number;
    type: "TEXT" | "QUOTE";
    body: string | null;
    createdAt: string;
    senderId: number;
    senderName: string;
    quoteVersion: { version: number; totalAmount: string; status: QuoteStatus } | null;
  } | null;
}

export function getMyConversations(identityId: number): Promise<{ data: ConversationInboxItem[] }> {
  return getJson("/api/conversations", identityId);
}

export function getMyServiceRequests(identityId: number): Promise<{ data: ServiceRequestSummary[] }> {
  return getJson("/api/service-requests", identityId);
}

export function createServiceRequest(identityId: number, input: ServiceRequestInput): Promise<{ data: ServiceRequestSummary & { conversation: { id: number } | null } }> {
  return postJson("/api/service-requests", identityId, input);
}

export function getServiceRequest(identityId: number, id: number): Promise<{ data: ServiceRequestDetail }> {
  return getJson(`/api/service-requests/${id}`, identityId);
}

export function startConversation(identityId: number, requestId: number, providerProfileId: number): Promise<{ data: { id: number; status: ConversationStatus; serviceRequestId: number; providerProfileId: number }; reused: boolean }> {
  return postJson(`/api/service-requests/${requestId}/conversations`, identityId, { providerProfileId });
}

export function getConversation(identityId: number, id: number): Promise<{ data: ConversationDetail }> {
  return getJson(`/api/conversations/${id}`, identityId);
}

export function getConversationMessages(identityId: number, id: number): Promise<{ data: DemoMessage[] }> {
  return getJson(`/api/conversations/${id}/messages`, identityId);
}

export function sendConversationMessage(identityId: number, id: number, body: string): Promise<{ data: DemoMessage }> {
  return postJson(`/api/conversations/${id}/messages`, identityId, { body });
}

export interface QuoteInput {
  serviceId?: number;
  serviceTitleSnapshot?: string;
  scopeDescription: string;
  totalAmount: string;
  items: Array<{ description: string; quantity: string; unitPrice: string }>;
  estimatedDurationDays?: number;
  validUntil: string;
  proposedStartAt?: string;
  proposedEndAt?: string;
  terms?: string;
}

async function postIdempotent<T>(path: string, identityId: number, body: unknown, key: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Demo-User-Id": String(identityId),
        "Idempotency-Key": key,
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiRequestError("Não foi possível conectar à API. Confira se o servidor está iniciado.", 0);
  }
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = typeof payload === "object" && payload !== null && "error" in payload
      && typeof payload.error === "object" && payload.error !== null && "message" in payload.error
      && typeof payload.error.message === "string" ? payload.error.message : "Não foi possível concluir a operação.";
    throw new ApiRequestError(message, response.status);
  }
  return payload as T;
}

export function createQuote(identityId: number, conversationId: number, input: QuoteInput, key: string): Promise<{ data: QuoteSummary; replayed: boolean }> {
  return postIdempotent(`/api/conversations/${conversationId}/quotes`, identityId, input, key);
}

export function getRequestQuotes(identityId: number, requestId: number): Promise<{ data: { serviceRequestId: number; canCompareAll: boolean; quotes: QuoteSummary[] } }> {
  return getJson(`/api/service-requests/${requestId}/quotes`, identityId);
}

export function getQuote(identityId: number, quoteId: number): Promise<{ data: QuoteSummary }> {
  return getJson(`/api/quotes/${quoteId}`, identityId);
}

export function createQuoteVersion(identityId: number, quoteId: number, input: QuoteInput, key: string): Promise<{ data: QuoteSummary; replayed: boolean }> {
  return postIdempotent(`/api/quotes/${quoteId}/versions`, identityId, input, key);
}

export function acceptQuoteVersion(identityId: number, versionId: number): Promise<{ data: ServiceOrderSummary; replayed: boolean }> {
  return postJson(`/api/quote-versions/${versionId}/accept`, identityId, {});
}

export function getServiceOrder(identityId: number, orderId: number): Promise<{ data: ServiceOrderSummary }> {
  return getJson(`/api/service-orders/${orderId}`, identityId);
}
