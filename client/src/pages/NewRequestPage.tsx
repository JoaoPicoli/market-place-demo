import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, ClipboardList } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ApiRequestError, createServiceRequest, getCategories, getNeighborhoods, getProvider } from "../api";
import { SiteHeader } from "../components/SiteHeader";
import { useDemoIdentity } from "../components/useDemoIdentity";
import { WorkflowState } from "./MyRequestsPage";

export function NewRequestPage() {
  const [searchParams] = useSearchParams();
  const providerParam = searchParams.get("providerId");
  const providerId = providerParam === null ? undefined : Number(providerParam);
  const providerIdValid = providerId === undefined || (Number.isSafeInteger(providerId) && providerId > 0);
  const navigate = useNavigate();
  const { identityId, isLoading: identityLoading, error: identityError } = useDemoIdentity();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [neighborhoodId, setNeighborhoodId] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [desiredDate, setDesiredDate] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ title?: string; description?: string; budget?: string }>({});

  const providerQuery = useQuery({ queryKey: ["provider", providerId], queryFn: () => getProvider(providerId!), enabled: providerIdValid && providerId !== undefined });
  const categoriesQuery = useQuery({ queryKey: ["categories"], queryFn: getCategories, staleTime: 5 * 60_000 });
  const neighborhoodsQuery = useQuery({ queryKey: ["neighborhoods"], queryFn: getNeighborhoods, staleTime: 5 * 60_000 });
  const createMutation = useMutation({
    mutationFn: () => createServiceRequest(identityId!, {
      title: title.trim(),
      description: description.trim(),
      ...(categoryId ? { categoryId: Number(categoryId) } : {}),
      ...(neighborhoodId ? { neighborhoodId: Number(neighborhoodId) } : {}),
      ...(budgetMin ? { budgetMin: Number(budgetMin) } : {}),
      ...(budgetMax ? { budgetMax: Number(budgetMax) } : {}),
      ...(desiredDate ? { desiredDate: new Date(`${desiredDate}T12:00:00`).toISOString() } : {}),
      ...(providerId === undefined ? {} : { providerProfileId: providerId }),
    }),
    onSuccess: (result) => {
      if (result.data.conversation) navigate(`/conversas/${result.data.conversation.id}`);
      else navigate(`/solicitacoes/${result.data.id}`);
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const nextErrors: typeof fieldErrors = {};
    if (title.trim().length < 5) nextErrors.title = "Resuma a necessidade em pelo menos 5 caracteres.";
    if (description.trim().length < 10) nextErrors.description = "Conte um pouco mais, com pelo menos 10 caracteres.";
    if (budgetMin && budgetMax && Number(budgetMin) > Number(budgetMax)) nextErrors.budget = "O valor mínimo não pode ser maior que o máximo.";
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    if (!identityId) return setFormError("Selecione uma identidade de consumidor no cabeçalho.");
    createMutation.mutate();
  }

  const error = formError ?? (createMutation.error instanceof ApiRequestError ? createMutation.error.message : createMutation.error?.message);

  return (
    <div className="app-shell">
      <SiteHeader />
      <main className="shell workflow-main narrow-main">
        <Link className="back-link" to={providerId ? `/prestadores/${providerId}` : "/solicitacoes"}><ArrowLeft size={16} /> Voltar</Link>
        <div className="workflow-heading compact-heading"><div><span className="eyebrow">Vamos começar pelo que aconteceu</span><h1>O que você precisa resolver?</h1><p>Conte com suas palavras. Você não precisa saber o nome técnico do serviço.</p></div></div>

        {identityLoading ? <WorkflowState title="Carregando identidade" message="Preparando o modo de demonstração." loading /> : identityError ? <WorkflowState title="Identidades indisponíveis" message={identityError} /> : null}
        {!providerIdValid ? <WorkflowState title="Perfil inválido" message="O prestador selecionado não tem um identificador válido." /> : providerId !== undefined && providerQuery.isPending ? <WorkflowState title="Carregando prestador" message="Conferindo o perfil escolhido." loading /> : providerId !== undefined && providerQuery.isError ? <WorkflowState title="Prestador indisponível" message={providerQuery.error.message} retry={() => void providerQuery.refetch()} /> : null}

        {providerId !== undefined && providerQuery.data && <div className="selected-provider-note"><ClipboardList size={18} /><span>A solicitação será criada junto com uma conversa para <strong>{providerQuery.data.data.name}</strong>.</span></div>}
        <form className="workflow-form request-composer" onSubmit={submit} noValidate>
          <section className="form-section" aria-labelledby="request-basics-title">
            <div className="form-section-heading"><h2 id="request-basics-title">Conte o básico</h2><p>Os campos com * são necessários para criar sua solicitação.</p></div>
            <label htmlFor="request-title"><span>Qual é o problema ou serviço? <span className="required-mark">*</span></span>
              <input id="request-title" required minLength={5} maxLength={180} value={title} aria-invalid={Boolean(fieldErrors.title)} aria-describedby={fieldErrors.title ? "request-title-error" : undefined}
                onChange={(event) => { setTitle(event.target.value); setFieldErrors((current) => ({ ...current, title: undefined })); }} onBlur={() => setFieldErrors((current) => ({ ...current, ...(title.trim().length < 5 ? { title: "Resuma a necessidade em pelo menos 5 caracteres." } : { title: undefined }) }))}
                placeholder="Ex.: A tomada esquenta quando uso o secador" />
              {fieldErrors.title && <span className="field-error" id="request-title-error">{fieldErrors.title}</span>}
            </label>
            <label htmlFor="request-description"><span>Explique o que está acontecendo <span className="required-mark">*</span></span>
              <textarea id="request-description" required minLength={10} maxLength={8_000} rows={5} value={description} aria-invalid={Boolean(fieldErrors.description)} aria-describedby={fieldErrors.description ? "request-description-error request-description-help" : "request-description-help"}
                onChange={(event) => { setDescription(event.target.value); setFieldErrors((current) => ({ ...current, description: undefined })); }} onBlur={() => setFieldErrors((current) => ({ ...current, ...(description.trim().length < 10 ? { description: "Conte um pouco mais, com pelo menos 10 caracteres." } : { description: undefined }) }))}
                placeholder="Quando começou? Em qual cômodo? Há algum detalhe que o profissional deveria saber?" />
              <span className="field-help" id="request-description-help">Exemplo: “A pia da cozinha está vazando por baixo. Já apertei a conexão, mas continua pingando.”</span>
              {fieldErrors.description && <span className="field-error" id="request-description-error">{fieldErrors.description}</span>}
            </label>
          </section>

          <details className="optional-fields">
            <summary>Adicionar detalhes opcionais</summary>
            <p>Se souber essas informações, elas podem ajudar os profissionais a responder melhor.</p>
            <div className="form-grid-two">
              <label htmlFor="request-category">Categoria
                <select id="request-category" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}><option value="">Deixar em aberto</option>{(categoriesQuery.data?.data ?? []).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
              </label>
              <label htmlFor="request-neighborhood">Bairro onde o serviço será feito
                <select id="request-neighborhood" value={neighborhoodId} onChange={(event) => setNeighborhoodId(event.target.value)}><option value="">Ainda não informado</option>{(neighborhoodsQuery.data?.data ?? []).map((neighborhood) => <option key={neighborhood.id} value={neighborhood.id}>{neighborhood.name}</option>)}</select>
              </label>
            </div>
            {(categoriesQuery.isError || neighborhoodsQuery.isError) && <p className="form-error">Não foi possível carregar categorias ou bairros. Você ainda pode enviar a descrição sem esses detalhes.</p>}
            <div className="form-grid-two">
              <label htmlFor="request-budget-min">Orçamento mínimo (opcional)
                <div className="input-with-prefix"><span aria-hidden="true">R$</span><input id="request-budget-min" type="number" min="0" step="0.01" value={budgetMin} onChange={(event) => { setBudgetMin(event.target.value); setFieldErrors((current) => ({ ...current, budget: undefined })); }} placeholder="0,00" /></div>
              </label>
              <label htmlFor="request-budget-max">Orçamento máximo (opcional)
                <div className="input-with-prefix"><span aria-hidden="true">R$</span><input id="request-budget-max" type="number" min="0.01" step="0.01" value={budgetMax} onChange={(event) => { setBudgetMax(event.target.value); setFieldErrors((current) => ({ ...current, budget: undefined })); }} placeholder="0,00" /></div>
              </label>
            </div>
            {fieldErrors.budget && <span className="field-error">{fieldErrors.budget}</span>}
            <label htmlFor="request-date">Quando gostaria de fazer o serviço? (opcional)
              <input id="request-date" type="date" value={desiredDate} onChange={(event) => setDesiredDate(event.target.value)} />
            </label>
          </details>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="form-actions"><Link className="button-link" to={providerId ? `/prestadores/${providerId}` : "/solicitacoes"}>Cancelar</Link><button className="button-primary" disabled={createMutation.isPending || identityId === null || !providerIdValid || (providerId !== undefined && !providerQuery.data)} type="submit">{createMutation.isPending ? "Criando solicitação…" : providerId === undefined ? "Criar solicitação" : "Criar e conversar"}</button></div>
        </form>
        <p className="demo-form-note">Este formulário salva dados demonstrativos no banco local e não é um sistema de autenticação.</p>
      </main>
      <footer className="site-footer"><div className="shell">Fechou! · Ambiente demonstrativo</div></footer>
    </div>
  );
}
