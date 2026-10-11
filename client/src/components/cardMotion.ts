import type { PointerEvent } from "react";

export function applyCardTilt(event: PointerEvent<HTMLElement>) {
  const card = event.currentTarget;
  const supportsHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (event.pointerType !== "mouse" || !supportsHover || prefersReducedMotion) {
    resetCardTilt(event);
    return;
  }

  const bounds = card.getBoundingClientRect();
  if (!bounds.width || !bounds.height) return;

  const horizontal = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
  const vertical = ((event.clientY - bounds.top) / bounds.height) * 2 - 1;
  const amplitude = 4;

  card.style.setProperty("--card-tilt-x", `${-vertical * amplitude}deg`);
  card.style.setProperty("--card-tilt-y", `${horizontal * amplitude}deg`);
  card.style.setProperty("--card-tilt-scale", "1.01");
  card.style.setProperty("--card-lift", "-1.5px");
}

export function resetCardTilt(event: PointerEvent<HTMLElement>) {
  const card = event.currentTarget;
  card.style.setProperty("--card-tilt-x", "0deg");
  card.style.setProperty("--card-tilt-y", "0deg");
  card.style.setProperty("--card-tilt-scale", "1");
  card.style.setProperty("--card-lift", "0px");
}
