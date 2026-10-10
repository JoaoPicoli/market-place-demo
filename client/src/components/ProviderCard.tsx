import { ArrowUpRight, BriefcaseBusiness, MapPin, Star } from "lucide-react";
import { Link } from "react-router-dom";
import type { ProviderSummary } from "../api";
import { Avatar } from "./Avatar";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

interface ProviderCardProps {
  provider: ProviderSummary;
  requestId?: string;
}

export function ProviderCard({ provider, requestId }: ProviderCardProps) {
  const categories = [...new Map(provider.services.map((service) => [service.category.id, service.category])).values()];
  const serviceNames = provider.services.slice(0, 2).map((service) => service.title);
  const location = provider.serviceAreas.length
    ? provider.serviceAreas.slice(0, 2).map((area) => area.name).join(", ")
    : provider.referenceNeighborhood?.name ?? "Curitiba";

  return (
    <article className="provider-card">
      <div className="provider-card-top">
        <Avatar name={provider.name} imageUrl={provider.avatarUrl} className="avatar-card" />
        <div className="provider-card-identity">
          <h3>{provider.name}</h3>
          {provider.isDemo && <span className="demo-pill">Perfil demonstrativo</span>}
        </div>
        <Link className="card-arrow" to={`/prestadores/${provider.id}${requestId ? `?requestId=${encodeURIComponent(requestId)}` : ""}`} aria-label={`Ver perfil de ${provider.name}`}>
          <ArrowUpRight size={18} />
        </Link>
      </div>

      <p className="provider-bio">{provider.bio || "Profissional disponível para novos serviços em Curitiba."}</p>

      <div className="category-tags">
        {categories.slice(0, 3).map((category) => <span key={category.id}>{category.name}</span>)}
      </div>

      <div className="provider-meta-list">
        <div><MapPin size={15} /><span>{location}{provider.serviceAreas.length > 2 ? ` +${provider.serviceAreas.length - 2}` : ""}</span></div>
        {provider.yearsExperience !== null && (
          <div><BriefcaseBusiness size={15} /><span>{provider.yearsExperience} {provider.yearsExperience === 1 ? "ano de experiência" : "anos de experiência"}</span></div>
        )}
        {provider.reputation.count > 0 ? (
          <div className="rating-line"><Star size={15} fill="currentColor" /><span>{provider.reputation.average?.toFixed(1)} · {provider.reputation.count} avaliações verificadas</span></div>
        ) : (
          <div className="rating-muted"><Star size={15} /><span>Sem avaliações verificadas</span></div>
        )}
      </div>

      <div className="provider-card-footer">
        <div className="service-preview">
          <span className="eyebrow">Serviços</span>
          <span>{serviceNames.join(" · ")}{provider.services.length > 2 ? ` · +${provider.services.length - 2}` : ""}</span>
        </div>
        <div className="price-preview">
          <span className="eyebrow">Referência</span>
          <strong>{provider.minReferencePrice === null ? "Sob consulta" : `A partir de ${currency.format(provider.minReferencePrice)}`}</strong>
        </div>
      </div>
    </article>
  );
}
