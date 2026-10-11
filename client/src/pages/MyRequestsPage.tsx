import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ClipboardList, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { getMyServiceRequests } from "../api";
import { applyCardTilt, resetCardTilt } from "../components/cardMotion";
import { SiteHeader } from "../components/SiteHeader";
import { useDemoIdentity } from "../components/useDemoIdentity";

const statusLabels: Record<string, string> = {
  OPEN: "Aberta",
  PAUSED: "Pausada",
  IN_PROGRESS: "Em andamento",
  COMPLETED: "Concluída",
  CANCELLED: "Cancelada",
};

export function MyRequestsPage() {
  const { identityId, isLoading: identityLoading, error: identityError } = useDemoIdentity();
  const requestsQuery = useQuery({
    queryKey: ["service-requests", identityId],
    queryFn: () => getMyServiceRequests(identityId!),
    enabled: identityId !== null,
  });

  return (
    <div className="app-shell">
      <SiteHeader />
      <main className="shell workflow-main">
        <div className="workflow-heading">
          <div><span className="eyebrow">Área do consumidor</span><h1>Minhas solicitações</h1><p>Acompanhe suas necessidades e as conversas iniciadas com profissionais.</p></div>
          <Link className="button-primary" to="/solicitacoes/nova"><Plus size={17} /> Nova solicitação</Link>
        </div>

        {identityLoading ? <WorkflowState title="Carregando identidade" message="Preparando o modo de demonstração." loading /> : identityError ? (
          <WorkflowState title="Identidades indisponíveis" message={identityError} />
        ) : requestsQuery.isPending ? <WorkflowState title="Carregando solicitações" message="Buscando os dados da sua conta." loading /> : requestsQuery.isError ? (
          <WorkflowState title="Não foi possível carregar as solicitações" message={requestsQuery.error.message} retry={() => void requestsQuery.refetch()} />
        ) : requestsQuery.data.data.length === 0 ? (
          <section className="state-card empty-state"><div className="state-icon"><ClipboardList size={22} /></div><h2>Nenhuma solicitação por aqui</h2><p>Quando você descrever um serviço de que precisa, poderá acompanhar as conversas nesta área.</p><Link className="button-primary" to="/solicitacoes/nova"><Plus size={17} /> Criar solicitação</Link></section>
        ) : (
          <div className="request-list">
            {requestsQuery.data.data.map((item) => (
              <Link className="request-list-card interactive-card" key={item.id} to={`/solicitacoes/${item.id}`} onPointerMove={applyCardTilt} onPointerLeave={resetCardTilt}>
                <div className="request-card-heading"><span className={`status-pill status-${item.status.toLowerCase()}`}>{statusLabels[item.status] ?? item.status}</span><span className="request-date">{new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(item.createdAt))}</span></div>
                <h2>{item.title}</h2>
                <p>{item.description}</p>
                <div className="request-card-meta">
                  {item.category && <span>{item.category.name}</span>}
                  {item.neighborhood && <span>{item.neighborhood.name}</span>}
                  <span>{item.conversationCount ?? 0} {(item.conversationCount ?? 0) === 1 ? "conversa" : "conversas"}</span>
                </div>
                <span className="request-card-next-step">{item.status === "OPEN" && (item.conversationCount ?? 0) === 0 ? "Próximo passo: escolher profissionais" : "Acompanhe conversas e propostas"}</span>
                <span className="request-card-link">Abrir propostas e conversas <ArrowRight size={18} /></span>
              </Link>
            ))}
          </div>
        )}
      </main>
      <footer className="site-footer"><div className="shell">Fechou! · Ambiente demonstrativo</div></footer>
    </div>
  );
}

export function WorkflowState({ title, message, loading = false, retry }: { title: string; message: string; loading?: boolean; retry?: () => void }) {
  return <section className="state-card workflow-state" role={loading ? undefined : "status"}>{loading && <div className="spinner" aria-hidden="true" />}<h2>{title}</h2><p>{message}</p>{retry && <button className="button-secondary" onClick={retry}>Tentar novamente</button>}</section>;
}
