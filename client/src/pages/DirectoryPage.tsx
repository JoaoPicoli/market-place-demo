import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, MapPin, Search, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { getCategories, getNeighborhoods, getProviderCoverage, getProviders } from "../api";
import { AIServiceSearch } from "../components/AIServiceSearch";
import { CuritibaRegionMap } from "../components/CuritibaRegionMap";
import { ProviderCard } from "../components/ProviderCard";
import { SiteHeader } from "../components/SiteHeader";
import { WarpText } from "../components/WarpText";
import { useSearchParams } from "react-router-dom";

const PAGE_SIZE = 12;

export function DirectoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryText = searchParams.get("q") ?? "";
  const categoryId = searchParams.get("categoryId") ?? "";
  const neighborhoodId = searchParams.get("neighborhoodId") ?? "";
  const regionSlug = searchParams.get("regionSlug") ?? "";
  const requestId = searchParams.get("requestId") ?? undefined;
  const currentPage = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);
  const [searchState, setSearchState] = useState({ query: queryText, value: queryText });
  const searchInput = searchState.query === queryText ? searchState.value : queryText;

  function updateSearchInput(value: string) {
    setSearchState({ query: queryText, value });
  }

  useEffect(() => {
    const trimmed = searchInput.trim();
    if (trimmed === queryText) return;
    const timer = window.setTimeout(() => {
      const next = new URLSearchParams(searchParams);
      if (trimmed) next.set("q", trimmed);
      else next.delete("q");
      next.delete("page");
      setSearchParams(next, { replace: true });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput, queryText, searchParams, setSearchParams]);

  const categoriesQuery = useQuery({ queryKey: ["categories"], queryFn: getCategories, staleTime: 5 * 60_000 });
  const neighborhoodsQuery = useQuery({ queryKey: ["neighborhoods"], queryFn: getNeighborhoods, staleTime: 5 * 60_000 });
  const coverageQuery = useQuery({
    queryKey: ["provider-coverage", queryText, categoryId],
    queryFn: () => getProviderCoverage({ q: queryText || undefined, categoryId: categoryId || undefined }),
    staleTime: 60_000,
  });
  const providersQuery = useQuery({
    queryKey: ["providers", queryText, categoryId, neighborhoodId, regionSlug, currentPage],
    queryFn: () => getProviders({
      q: queryText || undefined,
      categoryId: categoryId || undefined,
      neighborhoodId: neighborhoodId || undefined,
      regionSlug: regionSlug || undefined,
      page: currentPage,
      limit: PAGE_SIZE,
    }),
  });

  const hasFilters = Boolean(queryText || categoryId || neighborhoodId || regionSlug);
  const results = providersQuery.data;
  const resultLabel = useMemo(() => {
    if (!results) return "";
    return results.pagination.total === 1 ? "1 profissional encontrado" : `${results.pagination.total} profissionais encontrados`;
  }, [results]);

  function setFilter(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key === "regionSlug") next.delete("neighborhoodId");
    if (key === "neighborhoodId") next.delete("regionSlug");
    next.delete("page");
    setSearchParams(next);
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = new URLSearchParams(searchParams);
    const value = searchInput.trim();
    if (value) next.set("q", value);
    else next.delete("q");
    next.delete("page");
    setSearchParams(next);
  }

  function clearFilters() {
    updateSearchInput("");
    setSearchParams(requestId ? { requestId } : {});
  }

  function changePage(page: number) {
    const next = new URLSearchParams(searchParams);
    if (page > 1) next.set("page", String(page));
    else next.delete("page");
    setSearchParams(next);
    window.scrollTo({ top: 420, behavior: "smooth" });
  }

  return (
    <div className="app-shell">
      <SiteHeader />
      <main>
        <section className="discovery-hero">
          <div className="shell hero-inner">
            <div className="hero-copy">
              <div className="eyebrow hero-kicker"><MapPin size={14} /> Curitiba e região</div>
              <h1>Encontre quem<br />resolve.<br /><WarpText className="hero-warp" text="Do seu jeito." /></h1>
              <p>Profissionais locais para os cuidados da sua casa, com serviços e áreas de atendimento em um só lugar.</p>
            </div>
            <div className="hero-tools">
            <div className="search-panel">
              <form className="search-form" onSubmit={submitSearch}>
                <Search size={20} aria-hidden="true" />
                <label className="sr-only" htmlFor="service-search">O que você precisa resolver?</label>
                <input
                  id="service-search"
                  value={searchInput}
                  onChange={(event) => updateSearchInput(event.target.value)}
                  placeholder="Ex.: instalar uma luminária, limpar sofá..."
                />
                <button type="submit">Buscar</button>
              </form>
              <div className="filter-row">
                <label className="filter-control">
                  <SlidersHorizontal size={16} />
                  <span className="sr-only">Categoria</span>
                  <select value={categoryId} onChange={(event) => setFilter("categoryId", event.target.value)}>
                    <option value="">Todas as categorias</option>
                    {(categoriesQuery.data?.data ?? []).map((category) => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                </label>
                <label className="filter-control">
                  <MapPin size={16} />
                  <span className="sr-only">Bairro</span>
                  <select value={neighborhoodId} onChange={(event) => setFilter("neighborhoodId", event.target.value)}>
                    <option value="">Todos os bairros</option>
                    {(neighborhoodsQuery.data?.data ?? []).map((neighborhood) => (
                      <option key={neighborhood.id} value={neighborhood.id}>{neighborhood.name}</option>
                    ))}
                  </select>
                </label>
              </div>
              {(categoriesQuery.isError || neighborhoodsQuery.isError) && (
                <p className="filter-error">Não foi possível carregar todos os filtros. Tente novamente em instantes.</p>
              )}
            </div>
            <CuritibaRegionMap
              regions={coverageQuery.data?.data}
              totalProviderCount={coverageQuery.data?.totalProviderCount ?? 0}
              selectedRegion={regionSlug}
              isLoading={coverageQuery.isPending}
              error={coverageQuery.isError ? coverageQuery.error.message : null}
              onSelect={(slug) => setFilter("regionSlug", slug)}
              onRetry={() => void coverageQuery.refetch()}
            />
            </div>
          </div>
        </section>

        <div className="shell ai-search-placement">
          <AIServiceSearch requestId={requestId} />
        </div>

        <section className="shell results-section" id="profissionais">
          <div className="demo-notice"><ShieldCheck size={17} />
            <span><strong>Ambiente demonstrativo.</strong> Perfis, serviços e avaliações fictícios para apresentar a plataforma.</span>
          </div>

          <div className="results-heading">
            <div>
              <span className="eyebrow">Profissionais da região</span>
              <h2>{resultLabel || "Busque um serviço"}</h2>
            </div>
            {hasFilters && <button className="clear-filters" onClick={clearFilters}>Limpar filtros</button>}
          </div>

          {providersQuery.isPending ? (
            <div className="provider-grid" aria-label="Carregando profissionais">
              {Array.from({ length: 6 }, (_, index) => <div className="provider-skeleton" key={index} />)}
            </div>
          ) : providersQuery.isError ? (
            <div className="state-card error-state" role="alert">
              <div className="state-icon">!</div>
              <h3>Não foi possível carregar os profissionais</h3>
              <p>{providersQuery.error.message}</p>
              <button className="button-secondary" onClick={() => void providersQuery.refetch()}>Tentar novamente</button>
            </div>
          ) : results?.data.length ? (
            <>
              <div className="provider-grid">
                {results.data.map((provider) => <ProviderCard key={provider.id} provider={provider} requestId={requestId} />)}
              </div>
              {results.pagination.totalPages > 1 && (
                <nav className="pagination" aria-label="Paginação dos profissionais">
                  <button disabled={currentPage <= 1} onClick={() => changePage(currentPage - 1)} aria-label="Página anterior"><ChevronLeft size={18} /></button>
                  <span>Página <strong>{results.pagination.page}</strong> de {results.pagination.totalPages}</span>
                  <button disabled={currentPage >= results.pagination.totalPages} onClick={() => changePage(currentPage + 1)} aria-label="Próxima página"><ChevronRight size={18} /></button>
                </nav>
              )}
            </>
          ) : (
            <div className="state-card empty-state">
              <div className="state-icon"><Search size={22} /></div>
              <h3>{hasFilters ? "Nenhum profissional encontrado com esses filtros" : "Ainda não há profissionais disponíveis"}</h3>
              <p>{hasFilters ? "Experimente outra palavra, categoria ou bairro para ampliar a busca." : "Volte em breve para encontrar serviços na sua região."}</p>
              {hasFilters && <button className="button-secondary" onClick={clearFilters}>Ver todos os profissionais</button>}
            </div>
          )}
        </section>
      </main>
      <footer className="site-footer"><div className="shell">Fechou! · Serviços locais em Curitiba, PR</div></footer>
    </div>
  );
}
