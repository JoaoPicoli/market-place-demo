import { useEffect, useState } from "react";
import { Check, Sparkles } from "lucide-react";

interface ThoughtLineProps {
  status: "idle" | "working" | "done" | "error";
  startedAt: number | null;
  durationMs: number | null;
}

function formatDuration(milliseconds: number): string {
  return `${(milliseconds / 1000).toFixed(1).replace(".", ",")} s`;
}

export function ThoughtLine({ status, startedAt, durationMs }: ThoughtLineProps) {
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (status !== "working") return;
    const timer = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(timer);
  }, [status]);

  const elapsed = status === "working" && startedAt !== null
    ? Math.max(0, now - startedAt)
    : durationMs;

  return (
    <div className={`thought-line thought-line--${status}`}>
      <div className="thought-line__trace" aria-hidden="true">
        <span><i />Entendendo sua necessidade</span>
        <span><i />Identificando serviços e filtros</span>
        <span><i />Consultando profissionais</span>
      </div>
      <div className="thought-line__summary">
        <span className="thought-line__mark" aria-hidden="true">
          {status === "done" ? <Check size={15} /> : <Sparkles size={15} />}
        </span>
        <p aria-live="polite" aria-atomic="true">
          {status === "working" && "Interpretando sua busca"}
          {status === "done" && "Busca inteligente concluída"}
          {status === "error" && "Não foi possível concluir a busca"}
          {status === "idle" && "A busca será interpretada por IA"}
        </p>
        {elapsed !== null && <time>{formatDuration(elapsed)}</time>}
      </div>
    </div>
  );
}
