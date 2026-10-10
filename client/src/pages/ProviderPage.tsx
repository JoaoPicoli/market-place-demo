import { useQuery } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, BadgeCheck, BriefcaseBusiness, CalendarDays, Clock3, MapPin, MessageCircle, Star } from "lucide-react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ApiRequestError, getProvider, startConversation } from "../api";
import { Avatar } from "../components/Avatar";
import { useDemoIdentity } from "../components/useDemoIdentity";
import { SiteHeader } from "../components/SiteHeader";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });
const weekdays = ["", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado", "Domingo"];

function minuteTime(value: number): string {
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

export function ProviderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestParam = searchParams.get("requestId");
  const requestId = requestParam === null ? undefined : Number(requestParam);
  const requestIdValid = requestId === undefined || (Number.isSafeInteger(requestId) && requestId > 0);
  const { identityId } = useDemoIdentity();
  const providerId = Number(id);
  const validId = Number.isInteger(providerId) && providerId > 0;
  const providerQuery = useQuery({
    queryKey: ["provider", providerId],
    queryFn: () => getProvider(providerId),
    enabled: validId,
  });
  const conversationMutation = useMutation({
    mutationFn: () => startConversation(identityId!, requestId!, providerQuery.data!.data.id),
    onSuccess: (result) => navigate(`/conversas/${result.data.id}`),
  });
  const provider = providerQuery.data?.data;

  if (!validId) {
    return <ProfileState title="Perfil não encontrado" message="O endereço do perfil é inválido." />;
  }

  if (providerQuery.isPending) {
    return <ProfileState title="Carregando perfil" message="Buscando os serviços e as informações deste profissional." loading />;
  }

  if (providerQuery.isError) {
    const notFound = providerQuery.error instanceof ApiRequestError && providerQuery.error.status === 404;
    return <ProfileState
      title={notFound ? "Perfil não encontrado" : "Não foi possível carregar este perfil"}
      message={notFound ? "Este profissional não está disponível." : providerQuery.error.message}
      retry={notFound ? undefined : () => void providerQuery.refetch()}
    />;
  }

  if (!provider) return null;

  const locations = provider.serviceAreas.map((area) => area.name);
  const avgPrice = provider.services
    .map((service) => service.referencePrice)
    .filter((value): value is number => value !== null);

  return (
    <div className="app-shell">
      <SiteHeader />
      <main className="shell profile-main">
        <Link className="back-link" to="/"><ArrowLeft size={16} /> Voltar para a busca</Link>

        <section className="profile-hero-card">
          <div className="profile-intro">
            <Avatar name={provider.name} imageUrl={provider.avatarUrl} className="avatar-profile" />
            <div className="profile-title-group">
              <div className="profile-badges">
                {provider.isDemo && <span className="demo-pill">Perfil demonstrativo</span>}
                {provider.reputation.count > 0 && <span className="verified-rating"><BadgeCheck size={15} /> Avaliações verificadas</span>}
              </div>
              <h1>{provider.name}</h1>
              <p className="profile-location"><MapPin size={16} />
                {provider.referenceNeighborhood?.name ? `Referência: ${provider.referenceNeighborhood.name}, Curitiba` : "Curitiba, PR"}
              </p>
            </div>
          </div>
          <div className="profile-trust">
            <div className="trust-stat">
              <span className="trust-icon"><BriefcaseBusiness size={18} /></span>
              <div><strong>{provider.yearsExperience === null ? "—" : `${provider.yearsExperience} anos`}</strong><span>de experiência</span></div>
            </div>
            <div className="trust-stat">
              <span className="trust-icon"><Star size={18} /></span>
              <div><strong>{provider.reputation.average === null ? "Sem avaliações" : `${provider.reputation.average.toFixed(1)} / 5`}</strong><span>{provider.reputation.count ? `${provider.reputation.count} avaliações reais` : "reputação verificada"}</span></div>
            </div>
          </div>
        </section>

        {provider.isDemo && (
          <div className="demo-notice profile-demo-notice"><BadgeCheck size={17} />
            <span>Perfil, serviços e conteúdo de demonstração são fictícios. Avaliações demonstrativas não compõem a reputação real.</span>
          </div>
        )}

        <section className="contact-action-panel">
          <div><span className="eyebrow">Próximo passo</span><strong>{requestId === undefined ? "Converse sobre o serviço de que precisa" : "Continue sua solicitação com este profissional"}</strong><p>As mensagens ficam registradas em uma conversa vinculada à sua necessidade.</p></div>
          {requestId === undefined ? (
            <Link className="button-primary" to={`/solicitacoes/nova?providerId=${provider.id}`}><MessageCircle size={16} /> Solicitar serviço</Link>
          ) : (
            <div className="contact-action-buttons">
              {!requestIdValid && <span className="form-error">Solicitação inválida no endereço.</span>}
              {conversationMutation.isError && <span className="form-error" role="alert">{conversationMutation.error.message}</span>}
              <button className="button-primary" disabled={!requestIdValid || identityId === null || conversationMutation.isPending} onClick={() => conversationMutation.mutate()}>
                <MessageCircle size={16} />{conversationMutation.isPending ? "Abrindo conversa…" : "Conversar sobre esta solicitação"}
              </button>
            </div>
          )}
        </section>

        <div className="profile-columns">
          <div className="profile-primary-column">
            <section className="content-panel">
              <div className="section-heading"><span className="eyebrow">Sobre</span><h2>Conheça o profissional</h2></div>
              <p className="profile-bio">{provider.bio || "Este profissional ainda não adicionou uma descrição."}</p>
              {provider.serviceArea && <p className="coverage-note"><MapPin size={16} />{provider.serviceArea}</p>}
            </section>

            <section className="content-panel">
              <div className="section-heading service-heading"><div><span className="eyebrow">O que faz</span><h2>Serviços oferecidos</h2></div><span className="count-badge">{provider.services.length}</span></div>
              {provider.services.length ? (
                <div className="service-list">
                  {provider.services.map((service) => (
                    <article className="service-row" key={service.id}>
                      <div>
                        <span className="service-category">{service.category.name}</span>
                        <h3>{service.title}</h3>
                        <p>{service.description}</p>
                      </div>
                      <div className="service-price">
                        <span>Referência</span>
                        <strong>{service.referencePrice === null ? "Sob consulta" : currency.format(service.referencePrice)}</strong>
                      </div>
                    </article>
                  ))}
                </div>
              ) : <p className="muted-copy">Nenhum serviço ativo anunciado no momento.</p>}
            </section>

            <section className="content-panel">
              <div className="section-heading"><span className="eyebrow">Experiência</span><h2>Trabalhos apresentados</h2></div>
              {provider.portfolio.length ? (
                <div className="portfolio-grid">
                  {provider.portfolio.map((item) => (
                    <article className="portfolio-card" key={item.id}>
                      {item.images.length ? (
                        <div className="portfolio-image-grid">
                          {item.images.map((image) => <img key={image.id} src={image.imageUrl} alt={image.altText || item.title} loading="lazy" />)}
                        </div>
                      ) : <div className="portfolio-placeholder"><BriefcaseBusiness size={24} /><span>Imagem não disponível</span></div>}
                      <div className="portfolio-copy">
                        <div className="portfolio-labels">
                          {item.isDemo && <span className="demo-pill">Exemplo fictício</span>}
                          {item.isVerified && <span className="verified-rating"><BadgeCheck size={14} /> Trabalho verificado</span>}
                        </div>
                        <h3>{item.title}</h3>
                        {item.service && <span className="portfolio-service">{item.service.title}</span>}
                        {item.description && <p>{item.description}</p>}
                      </div>
                    </article>
                  ))}
                </div>
              ) : <p className="muted-copy">Este profissional ainda não adicionou trabalhos ao portfólio.</p>}
            </section>

            <section className="content-panel">
              <div className="section-heading"><span className="eyebrow">Opiniões</span><h2>Avaliações</h2></div>
              {provider.demoReviews.length ? (
                <>
                  <p className="review-disclaimer">Avaliações fictícias de demonstração — não entram na reputação real.</p>
                  <div className="review-list">
                    {provider.demoReviews.map((review) => (
                      <article className="review-card" key={review.id}>
                        <div className="review-topline"><span className="demo-pill">Demonstração</span><time dateTime={review.createdAt}>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(review.createdAt))}</time></div>
                        <div className="review-stars" aria-label={`${review.rating} de 5 estrelas`}>
                          {Array.from({ length: 5 }, (_, index) => <Star key={index} size={15} fill={index < review.rating ? "currentColor" : "none"} />)}
                        </div>
                        {review.comment && <p>{review.comment}</p>}
                      </article>
                    ))}
                  </div>
                </>
              ) : provider.reputation.count ? (
                <p className="muted-copy">Este perfil tem {provider.reputation.count} avaliações de atendimentos reais concluídos.</p>
              ) : <p className="muted-copy">Ainda não há avaliações reais verificadas para este perfil.</p>}
            </section>
          </div>

          <aside className="profile-sidebar">
            <section className="content-panel sidebar-panel">
              <div className="section-heading"><span className="eyebrow">Atendimento</span><h2>Onde atende</h2></div>
              <div className="sidebar-reference"><MapPin size={17} /><div><strong>{provider.referenceNeighborhood?.name ?? "Curitiba"}</strong><span>Bairro de referência</span></div></div>
              {locations.length ? (
                <div className="neighborhood-tags">{provider.serviceAreas.map((area) => <span key={area.id}>{area.name}</span>)}</div>
              ) : <p className="muted-copy">Áreas atendidas não informadas.</p>}
            </section>

            <section className="content-panel sidebar-panel">
              <div className="section-heading"><span className="eyebrow">Agenda</span><h2>Disponibilidade semanal</h2></div>
              {provider.availability.length ? (
                <ul className="availability-list">
                  {provider.availability.map((slot) => (
                    <li key={slot.id}><CalendarDays size={15} /><span>{weekdays[slot.dayOfWeek] ?? "Dia não informado"}</span><strong><Clock3 size={13} />{minuteTime(slot.startMinute)}–{minuteTime(slot.endMinute)}</strong></li>
                  ))}
                </ul>
              ) : <p className="muted-copy">Disponibilidade ainda não informada.</p>}
            </section>

            {avgPrice.length > 0 && (
              <section className="price-note"><span className="eyebrow">Valores de referência</span><strong>A partir de {currency.format(Math.min(...avgPrice))}</strong><p>O valor final depende do escopo combinado com o profissional.</p></section>
            )}
          </aside>
        </div>
      </main>
      <footer className="site-footer"><div className="shell">Fechou! · Serviços locais em Curitiba, PR</div></footer>
    </div>
  );
}

interface ProfileStateProps {
  title: string;
  message: string;
  loading?: boolean;
  retry?: () => void;
}

function ProfileState({ title, message, loading = false, retry }: ProfileStateProps) {
  return (
    <div className="app-shell">
      <SiteHeader />
      <main className="shell profile-state-wrap">
        <section className="state-card">
          {loading ? <div className="spinner" aria-hidden="true" /> : <div className="state-icon"><BriefcaseBusiness size={21} /></div>}
          <h1>{title}</h1>
          <p>{message}</p>
          {retry && <button className="button-secondary" onClick={retry}>Tentar novamente</button>}
          <Link className="button-link" to="/"><ArrowLeft size={16} /> Voltar para a busca</Link>
        </section>
      </main>
      <footer className="site-footer"><div className="shell">Fechou! · Serviços locais em Curitiba, PR</div></footer>
    </div>
  );
}
