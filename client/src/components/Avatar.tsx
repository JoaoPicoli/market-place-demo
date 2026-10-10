import { useState } from "react";

interface AvatarProps {
  name: string;
  imageUrl: string | null;
  className?: string;
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase("pt-BR") ?? "")
    .join("");
}

export function Avatar({ name, imageUrl, className = "" }: AvatarProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  if (imageUrl && failedUrl !== imageUrl) {
    return (
      <img
        className={`avatar ${className}`}
        src={imageUrl}
        alt={`Foto de ${name}`}
        onError={() => setFailedUrl(imageUrl)}
      />
    );
  }

  return (
    <span className={`avatar avatar-fallback ${className}`} aria-label={`Iniciais de ${name}`}>
      {initials(name)}
    </span>
  );
}
