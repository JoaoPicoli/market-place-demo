import type { ProviderCoverageRegion } from "../api";
import mapGeometry from "../assets/curitiba-neighborhoods.json";

interface CuritibaRegionMapProps {
  regions: ProviderCoverageRegion[] | undefined;
  totalProviderCount: number;
  selectedRegion: string;
  isLoading: boolean;
  error: string | null;
  onSelect: (regionSlug: string) => void;
  onRetry: () => void;
}

function providerLabel(count: number | null) {
  if (count === null) return "sem bairros mapeados";
  return count === 1 ? "1 prestador" : `${count} prestadores`;
}

export function CuritibaRegionMap({ regions, totalProviderCount, selectedRegion, isLoading, error, onSelect, onRetry }: CuritibaRegionMapProps) {
  const selected = regions?.find((region) => region.slug === selectedRegion);
  const regionsBySlug = new Map(regions?.map((region) => [region.slug, region]) ?? []);
  const [, , viewBoxWidth, viewBoxHeight] = mapGeometry.viewBox.split(" ").map(Number);

  return (
    <section className="regional-coverage-panel" aria-labelledby="regional-coverage-title">
      <header className="regional-coverage-heading">
        <div>
          <span className="eyebrow">Curitiba · Paraná</span>
          <h2 id="regional-coverage-title">Prestadores por região</h2>
          <p>Escolha uma regional para filtrar os profissionais da busca.</p>
        </div>
        {selectedRegion && <button className="regional-map-clear" type="button" onClick={() => onSelect("")}>Ver todas</button>}
      </header>

      {isLoading ? <p className="regional-map-state" role="status">Carregando disponibilidade por região…</p>
        : error ? <div className="regional-map-state regional-map-error" role="alert"><span>{error}</span><button className="button-secondary" type="button" onClick={onRetry}>Tentar novamente</button></div>
          : regions?.length ? <div className="regional-map-layout">
            <div className="regional-map-stage" role="group" aria-label="Mapa interativo dos bairros e regionais de Curitiba">
              <svg className="regional-map-art" viewBox={mapGeometry.viewBox} role="group" aria-label="Mapa interativo das regionais e divisas oficiais dos bairros de Curitiba">
                <defs>
                  <linearGradient id="shared-neighborhood-fill" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="50%" stopColor="#e5eee7" />
                    <stop offset="50%" stopColor="#f0e9e1" />
                  </linearGradient>
                </defs>
                <g className="regional-map-neighborhoods">
                  {mapGeometry.features.map((feature) => {
                    const selectableRegion = feature.regionSlugs.find((slug) => {
                      const count = regionsBySlug.get(slug)?.providerCount;
                      return count !== undefined && count !== null;
                    });
                    const belongsToSelection = feature.regionSlugs.includes(selectedRegion);
                    const selectedClass = selectedRegion ? belongsToSelection ? " is-highlighted" : " is-muted" : "";
                    const regionClass = feature.regionSlugs.length > 1 ? " regional-map-shared" : ` regional-map-${feature.regionSlugs[0]}`;
                    const regionNames = feature.regionSlugs.map((slug) => regionsBySlug.get(slug)?.name ?? slug).join(" / ");
                    return <path
                      key={feature.name}
                      className={`regional-map-neighborhood${regionClass}${selectedClass}${selectableRegion ? "" : " is-unavailable"}`}
                      d={feature.path}
                      fillRule="evenodd"
                      aria-label={`${feature.name}, ${regionNames}`}
                      onClick={() => selectableRegion && onSelect(selectedRegion && feature.regionSlugs.includes(selectedRegion) ? "" : selectableRegion)}
                    ><title>{feature.name} · {regionNames} · {providerLabel(regionsBySlug.get(selectableRegion ?? "")?.providerCount ?? null)}</title></path>;
                  })}
                </g>
              </svg>
              <div className="regional-map-marker-layer" role="group" aria-label="Contagem e filtros por regional">
                {regions?.map((region) => {
                  const position = mapGeometry.regionLabels.find((label) => label.slug === region.slug);
                  if (!position) return null;
                  const isSelected = selectedRegion === region.slug;
                  return <button
                    className={`regional-map-count-marker${isSelected ? " is-selected" : ""}`}
                    key={region.slug}
                    type="button"
                    disabled={region.providerCount === null}
                    style={{ left: `${(position.x / viewBoxWidth) * 100}%`, top: `${(position.y / viewBoxHeight) * 100}%` }}
                    aria-label={`${region.name}: ${providerLabel(region.providerCount)}`}
                    aria-pressed={isSelected}
                    title={`${region.name}: ${providerLabel(region.providerCount)}`}
                    onClick={() => onSelect(isSelected ? "" : region.slug)}
                  >{region.providerCount ?? "—"}</button>;
                })}
              </div>
              <span className="regional-map-caption">Bairros e limites regionais · <a href="https://geocuritiba.ippuc.org.br/server/rest/services/GeoCuritiba/Publico_GeoCuritiba_MapaCadastral/MapServer/2" target="_blank" rel="noreferrer">GeoCuritiba/IPPUC</a></span>
            </div>

            <div className="regional-map-list" role="group" aria-label="Selecionar regional">
              <button className={`regional-map-row regional-map-all${selectedRegion ? "" : " is-selected"}`} type="button" aria-pressed={!selectedRegion} onClick={() => onSelect("")}>
                <span>Todos os prestadores</span><strong>{totalProviderCount}</strong>
              </button>
              {regions.map((region) => {
                const isSelected = selectedRegion === region.slug;
                return <button className={`regional-map-row${isSelected ? " is-selected" : ""}${region.providerCount === null ? " is-unavailable" : ""}`} key={region.slug} type="button" disabled={region.providerCount === null} aria-pressed={isSelected} onClick={() => onSelect(isSelected ? "" : region.slug)}>
                  <span>{region.name}</span><strong>{region.providerCount ?? "—"}</strong>
                </button>;
              })}
              <small className="regional-map-count-note">— indica regionais sem bairros no catálogo atual. As contagens por regional se sobrepõem quando um prestador atende mais de uma área.</small>
            </div>
          </div> : <p className="regional-map-state">Não há regiões disponíveis para exibir.</p>}

      {selected && <p className="regional-map-selection" aria-live="polite"><strong>{selected.name}:</strong> {providerLabel(selected.providerCount)}{selected.neighborhoods.length > 0 ? ` · bairros no catálogo: ${selected.neighborhoods.map((neighborhood) => neighborhood.name).join(", ")}` : " · sem bairros mapeados neste catálogo"}.</p>}
    </section>
  );
}
