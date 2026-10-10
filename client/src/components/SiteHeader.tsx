import { BriefcaseBusiness, ClipboardList, Compass, MapPin, MessageCircle } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useDemoIdentity } from "./useDemoIdentity";

export function SiteHeader() {
  const { identities, identity, identityId, isLoading, error, selectIdentity } = useDemoIdentity();
  const { pathname } = useLocation();
  const exploring = pathname === "/" || pathname.startsWith("/prestadores/");

  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Link className="site-identity" to="/" aria-label="Fechou! — explorar serviços">
          <span className="identity-mark"><BriefcaseBusiness size={19} strokeWidth={2.2} /></span>
          <span>Fechou!</span>
        </Link>
        <div className="header-location"><MapPin size={16} /> Curitiba, PR</div>
        <nav className="header-nav" aria-label="Navegação principal">
          <Link to="/" aria-current={exploring ? "page" : undefined} className={`header-nav-link${exploring ? " is-active" : ""}`}><Compass size={17} /><span>Explorar serviços</span></Link>
          <Link to="/solicitacoes" aria-current={pathname.startsWith("/solicitacoes") ? "page" : undefined} className={`header-nav-link${pathname.startsWith("/solicitacoes") ? " is-active" : ""}`}><ClipboardList size={17} /><span>Minhas solicitações</span></Link>
          <Link to="/conversas" aria-current={pathname.startsWith("/conversas") ? "page" : undefined} className={`header-nav-link${pathname.startsWith("/conversas") ? " is-active" : ""}`}><MessageCircle size={17} /><span>Conversas</span></Link>
        </nav>
        <div className="demo-identity-control">
          <label htmlFor="demo-identity-select">Você está usando</label>
          {error ? <span className="identity-error">Indisponível</span> : (
            <select
              id="demo-identity-select"
              value={identityId ?? ""}
              disabled={isLoading || identities.length === 0}
              onChange={(event) => selectIdentity(Number(event.target.value))}
            >
              {isLoading && <option value="">Carregando identidades…</option>}
              {identities.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {item.providerProfileId === null ? "consumidor" : "prestador e consumidor"}
                </option>
              ))}
            </select>
          )}
          {identity && <span className="identity-mode-note">Modo de demonstração, sem autenticação.</span>}
        </div>
      </div>
    </header>
  );
}
