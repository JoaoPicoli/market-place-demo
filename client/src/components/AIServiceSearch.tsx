import { useRef, useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { ArrowRight, Bot, MapPin, Search, Sparkles } from "lucide-react";
import { searchProvidersWithAI, type AiProviderPage } from "../api";
import { ProviderCard } from "./ProviderCard";
import { ThoughtLine } from "./ThoughtLine";

const PAGE_SIZE = 6;
const currencyFormat = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const EXAMPLES = [
  "A tomada esquenta quando uso o secador",
  "Quero instalar prateleiras no Água Verde até R$ 250",
  "Preciso de alguém para limpar meu sofá no sábado",
];

interface AIServiceSearchProps {
  requestId?: string;
}

export function AIServiceSearch({ requestId }: AIServiceSearchProps) {
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [result, setResult] = useState<AiProviderPage | null>(null);
  const [providers, setProviders] = useState<AiProviderPage["data"]>([]);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const startedAtRef = useRef<number | null>(null);

  const searchMutation = useMutation({
    mutationFn: searchProvidersWithAI,
    onSuccess: (page, variables) => {
      setResult(page);
      setProviders((current) => variables.page === 1 ? page.data : [...current, ...page.data]);
      setDurationMs(startedAtRef.current === null ? null : Date.now() - startedAtRef.current);
    },
    onError: () => {
      setDurationMs(startedAtRef.current === null ? null : Date.now() - startedAtRef.current);
    },
  });

  function runSearch(searchText: string, page: number) {
    const now = Date.now();
    startedAtRef.current = now;
    setStartedAt(now);
    setDurationMs(null);
    searchMutation.mutate({ query: searchText, page, limit: PAGE_SIZE });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = query.trim();
    if (normalized.length < 3 || searchMutation.isPending) return;
    setActiveQuery(normalized);
    setResult(null);
    setProviders([]);
    runSearch(normalized, 1);
  }

  function loadMore() {
    if (!result || searchMutation.isPending || result.pagination.page >= result.pagination.totalPages) return;
    runSearch(activeQuery, result.pagination.page + 1);
  }

  const status = searchMutation.isPending
    ? "working"
    : searchMutation.isError
      ? "error"
      : result
        ? "done"
        : "idle";
  const interpretation = result?.interpretation;
  const priceLabel = interpretation?.minPrice !== null && interpretation?.minPrice !== undefined
    ? interpretation.maxPrice !== null
      ? `${currencyFormat.format(interpretation.minPrice)} a ${currencyFormat.format(interpretation.maxPrice)}`
      : `A partir de ${currencyFormat.format(interpretation.minPrice)}`
    : interpretation?.maxPrice !== null && interpretation?.maxPrice !== undefined
      ? `Até ${currencyFormat.format(interpretation.maxPrice)}`
      : null;

  return (
    <section className="ai-search-section" aria-labelledby="ai-search-title">
      <div className="ai-search-panel">
        <div className="ai-search-heading">
          <span className="ai-search-icon" aria-hidden="true"><Sparkles size={19} /></span>
          <div>
            <div className="ai-search-eyebrow"><Bot size={14} /> Busca inteligente</div>
            <h2 id="ai-search-title">Explique o que você precisa</h2>
            <p>Descreva o problema com suas palavras. A IA transforma sua frase em filtros e busca entre os profissionais cadastrados.</p>
          </div>
        </div>

        <form className="ai-search-form" onSubmit={submit}>
          <label htmlFor="ai-service-search">Qual serviço você procura?</label>
          <textarea
            id="ai-service-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            maxLength={500}
            minLength={3}
            required
            rows={2}
            placeholder="Ex.: a tomada da cozinha esquenta quando ligo o micro-ondas; preciso de alguém no Água Verde que possa vir no sábado."
            aria-describedby="ai-search-help ai-search-count"
          />
          <div className="ai-search-form-footer">
            <span id="ai-search-help">Sua descrição é enviada ao serviço de IA configurado no servidor para identificar os filtros.</span>
            <span id="ai-search-count">{query.length}/500</span>
          </div>
          <div className="ai-search-submit-row">
            <span className="ai-search-examples-label">Experimente:</span>
            <div className="ai-search-examples">
              {EXAMPLES.map((example) => (
                <button type="button" key={example} onClick={() => setQuery(example)} disabled={searchMutation.isPending}>
                  {example}
                </button>
              ))}
            </div>
            <button className="button-primary ai-search-submit" type="submit" disabled={query.trim().length < 3 || searchMutation.isPending}>
              <Search size={17} />
              {searchMutation.isPending ? "Interpretando..." : "Buscar com IA"}
            </button>
          </div>
        </form>

        {(startedAt !== null || searchMutation.isPending) && (
          <div className="ai-search-progress">
            <ThoughtLine status={status} startedAt={startedAt} durationMs={durationMs} />
          </div>
        )}

        {searchMutation.isError && (
          <div className="ai-search-error" role="alert">
            <strong>A busca inteligente não foi concluída.</strong>
            <span>{searchMutation.error.message}</span>
            <button type="button" onClick={() => runSearch(activeQuery, 1)} disabled={!activeQuery || searchMutation.isPending}>Tentar novamente</button>
          </div>
        )}
      </div>

      {result && (
        <div className="ai-search-results" aria-live="polite">
          <div className="ai-search-result-heading">
            <div>
              <span className="eyebrow">Busca interpretada</span>
              <h3>{result.pagination.total === 1 ? "1 profissional encontrado" : `${result.pagination.total} profissionais encontrados`}</h3>
              <p>{interpretation?.summary}</p>
            </div>
            <span className="ai-search-result-query">“{activeQuery}”</span>
          </div>

          <div className="ai-search-filter-chips" aria-label="Filtros identificados">
            {interpretation?.category && <span>{interpretation.category.name}</span>}
            {interpretation?.neighborhood && <span><MapPin size={13} />{interpretation.neighborhood.name}</span>}
            {priceLabel && <span>{priceLabel}</span>}
            {interpretation?.minExperienceYears !== null && interpretation?.minExperienceYears !== undefined && (
              <span>{interpretation.minExperienceYears} anos de experiência ou mais</span>
            )}
            {interpretation?.availableSaturday === true && <span>Atende aos sábados</span>}
          </div>

          {searchMutation.isPending && providers.length === 0 ? (
            <div className="provider-grid ai-provider-grid" aria-label="Buscando profissionais">
              {Array.from({ length: 3 }, (_, index) => <div className="provider-skeleton" key={index} />)}
            </div>
          ) : providers.length ? (
            <>
              <div className="provider-grid ai-provider-grid">
                {providers.map((provider) => <ProviderCard key={provider.id} provider={provider} requestId={requestId} />)}
              </div>
              {result.pagination.page < result.pagination.totalPages && (
                <button className="ai-search-more" type="button" onClick={loadMore} disabled={searchMutation.isPending}>
                  {searchMutation.isPending ? "Carregando..." : "Ver mais profissionais"}
                  <ArrowRight size={16} />
                </button>
              )}
            </>
          ) : (
            <div className="ai-search-empty">
              <Search size={20} />
              <strong>Nenhum profissional encontrado com essa descrição</strong>
              <span>Tente explicar o problema de outro jeito ou use a busca comum e os filtros acima.</span>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
