import { useEffect, useRef, type CSSProperties } from "react";
import { Mesh, Program, Renderer, Texture, Triangle, type OGLRenderingContext } from "ogl";

interface WarpTextProps {
  text: string;
  className?: string;
  color?: string;
  warpStrength?: number;
  warpScale?: number;
  speed?: number;
  pointerInfluence?: number;
  pointerStrength?: number;
  refraction?: number;
  ripple?: boolean;
  fontSize?: string | number;
  fontWeight?: string | number;
  fontFamily?: string;
  letterSpacing?: string | number;
  lineHeight?: string | number;
  style?: CSSProperties;
}

interface WarpSettings {
  text: string;
  color: string;
  warpStrength: number;
  warpScale: number;
  speed: number;
  pointerInfluence: number;
  pointerStrength: number;
  refraction: number;
  ripple: boolean;
  fontSize: string | number;
  fontWeight: string | number;
  fontFamily: string;
  letterSpacing: string | number;
  lineHeight: string | number;
}

const vertexShader = `#version 300 es
in vec2 position;
in vec2 uv;
out vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}`;

const fragmentShader = `#version 300 es
precision highp float;
uniform sampler2D uTextTexture;
uniform vec2 uResolution;
uniform vec2 uPointer;
uniform float uPointerActive;
uniform float uTime;
uniform float uWarpStrength;
uniform float uWarpScale;
uniform float uSpeed;
uniform float uPointerInfluence;
uniform float uPointerStrength;
uniform float uRefraction;
uniform float uRipple;
uniform float uMotion;
in vec2 vUv;
out vec4 fragColor;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 4; i++) {
    value += amplitude * noise(p);
    p *= 2.02;
    amplitude *= 0.5;
  }
  return value;
}
vec4 sampleText(vec2 uv) {
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return vec4(0.0);
  return texture(uTextTexture, uv);
}
void main() {
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  float time = uTime * uSpeed;
  vec2 drift = vec2(time * 0.055, -time * 0.045);
  float n1 = fbm(vUv * uWarpScale * 3.1 + drift);
  float n2 = fbm((vUv + 19.17) * uWarpScale * 3.4 - drift.yx);
  vec2 ambient = (vec2(n1, n2) - 0.5) * uWarpStrength * 0.045 * uMotion;
  vec2 delta = vUv - uPointer;
  vec2 aspectDelta = vec2(delta.x * aspect, delta.y);
  float dist = length(aspectDelta);
  float radius = max(uPointerInfluence, 0.001);
  float lens = smoothstep(radius, 0.0, dist) * uPointerActive;
  float t = clamp(dist / radius, 0.0, 1.0);
  float bulge = t * (1.0 - t) * (1.0 - t) * 6.75 * uPointerActive;
  vec2 dir = dist > 0.0001 ? vec2(aspectDelta.x / aspect, aspectDelta.y) / dist : vec2(0.0);
  float rippleWave = sin(dist * 28.0 - time * 4.2) * 0.5 + 0.5;
  float rippleRing = (rippleWave - 0.5) * uRipple;
  vec2 pointerWarp = -dir * bulge * uPointerStrength * 0.045;
  pointerWarp += dir * rippleRing * bulge * uPointerStrength * 0.016;
  vec2 displaced = vUv + ambient + pointerWarp;
  vec2 splitDir = ambient + pointerWarp;
  float splitLength = length(splitDir);
  splitDir = splitLength > 0.00001 ? splitDir / splitLength : vec2(0.7071, 0.7071);
  vec2 split = splitDir * uRefraction * 0.16 * (0.35 + lens * 1.65);
  vec4 base = sampleText(displaced);
  float red = sampleText(displaced + split).r;
  float blue = sampleText(displaced - split).b;
  float alpha = max(max(sampleText(displaced + split).a, base.a), sampleText(displaced - split).a);
  fragColor = vec4(vec3(red, base.g, blue) + lens * base.a * 0.055, alpha);
}`;

function cssFontValue(value: string | number) {
  return typeof value === "number" ? `${value}px` : value;
}

function measureLine(context: CanvasRenderingContext2D, text: string, letterSpacing: number) {
  const characters = Array.from(text);
  return characters.reduce((width, character) => width + context.measureText(character).width, 0)
    + Math.max(0, characters.length - 1) * letterSpacing;
}

function drawCenteredLine(context: CanvasRenderingContext2D, text: string, x: number, y: number, letterSpacing: number) {
  const characters = Array.from(text);
  let cursor = x - measureLine(context, text, letterSpacing) / 2;
  characters.forEach((character, index) => {
    context.fillText(character, cursor, y);
    cursor += context.measureText(character).width + (index === characters.length - 1 ? 0 : letterSpacing);
  });
}

function createTextTextureSource(container: HTMLElement, width: number, height: number, dpr: number, settings: WarpSettings) {
  const textCanvas = document.createElement("canvas");
  textCanvas.width = Math.max(1, Math.floor(width * dpr));
  textCanvas.height = Math.max(1, Math.floor(height * dpr));
  const context = textCanvas.getContext("2d");
  if (!context) return textCanvas;

  const fontProbe = document.createElement("span");
  Object.assign(fontProbe.style, {
    position: "absolute",
    visibility: "hidden",
    pointerEvents: "none",
    whiteSpace: "pre",
    fontFamily: settings.fontFamily,
    fontSize: cssFontValue(settings.fontSize),
    fontWeight: String(settings.fontWeight),
    letterSpacing: cssFontValue(settings.letterSpacing),
    lineHeight: typeof settings.lineHeight === "number" ? String(settings.lineHeight) : settings.lineHeight,
  });
  container.appendChild(fontProbe);
  const computed = window.getComputedStyle(fontProbe);
  let fontSize = Number.parseFloat(computed.fontSize) || 48;
  const fontFamily = computed.fontFamily || "sans-serif";
  const fontWeight = computed.fontWeight || String(settings.fontWeight);
  let letterSpacing = computed.letterSpacing === "normal" ? 0 : Number.parseFloat(computed.letterSpacing) || 0;
  let lineHeight = Number.parseFloat(computed.lineHeight);
  if (!Number.isFinite(lineHeight)) lineHeight = fontSize * 1.03;
  fontProbe.remove();

  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, width, height);
  context.textAlign = "left";
  context.textBaseline = "middle";
  context.fillStyle = settings.color;
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  const lines = settings.text.split("\n");
  const applyFont = () => { context.font = `${fontWeight} ${fontSize}px ${fontFamily}`; };
  applyFont();
  const widestLine = Math.max(...lines.map((line) => measureLine(context, line, letterSpacing)), 1);
  const textBlockHeight = Math.max(lineHeight * lines.length, 1);
  const fit = Math.min(1, (width * 0.98) / widestLine, (height * 0.96) / textBlockHeight);
  if (fit < 1) {
    fontSize *= fit;
    letterSpacing *= fit;
    lineHeight *= fit;
    applyFont();
  }
  const firstLineY = height / 2 - (lineHeight * (lines.length - 1)) / 2;
  lines.forEach((line, index) => drawCenteredLine(context, line, width / 2, firstLineY + index * lineHeight, letterSpacing));
  return textCanvas;
}

export function WarpText({
  text,
  className = "",
  color = "#176b56",
  warpStrength = 0.08,
  warpScale = 1.7,
  speed = 0.55,
  pointerInfluence = 0.42,
  pointerStrength = 0.38,
  refraction = 0.018,
  ripple = true,
  fontSize = "inherit",
  fontWeight = "inherit",
  fontFamily = "inherit",
  letterSpacing = "inherit",
  lineHeight = "inherit",
  style,
}: WarpTextProps) {
  const containerRef = useRef<HTMLSpanElement | null>(null);
  const settingsRef = useRef<WarpSettings>({
    text, color, warpStrength, warpScale, speed, pointerInfluence,
    pointerStrength, refraction, ripple, fontSize, fontWeight,
    fontFamily, letterSpacing, lineHeight,
  });
  const runtimeRef = useRef<{ program: Program; rasterize: () => void } | null>(null);

  useEffect(() => {
    settingsRef.current = {
      text, color, warpStrength, warpScale, speed, pointerInfluence,
      pointerStrength, refraction, ripple, fontSize, fontWeight,
      fontFamily, letterSpacing, lineHeight,
    };
    if (!runtimeRef.current) return;
    const uniforms = runtimeRef.current.program.uniforms;
    uniforms.uWarpStrength.value = warpStrength;
    uniforms.uWarpScale.value = warpScale;
    uniforms.uSpeed.value = speed;
    uniforms.uPointerInfluence.value = pointerInfluence;
    uniforms.uPointerStrength.value = pointerStrength;
    uniforms.uRefraction.value = refraction;
    uniforms.uRipple.value = ripple ? 1 : 0;
    runtimeRef.current.rasterize();
  }, [text, color, warpStrength, warpScale, speed, pointerInfluence, pointerStrength, refraction, ripple, fontSize, fontWeight, fontFamily, letterSpacing, lineHeight]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let renderer: Renderer;
    let gl: OGLRenderingContext;
    try {
      renderer = new Renderer({ webgl: 2, alpha: true, premultipliedAlpha: false, antialias: true, dpr: Math.min(window.devicePixelRatio || 1, 2) });
      gl = renderer.gl;
    } catch (error) {
      console.warn("WarpText: WebGL could not be initialized.", error);
      return;
    }

    gl.clearColor(0, 0, 0, 0);
    const canvas = gl.canvas;
    canvas.style.position = "absolute";
    canvas.style.inset = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    canvas.setAttribute("aria-hidden", "true");
    container.appendChild(canvas);

    const texture = new Texture(gl, { generateMipmaps: false, minFilter: gl.LINEAR, magFilter: gl.LINEAR, wrapS: gl.CLAMP_TO_EDGE, wrapT: gl.CLAMP_TO_EDGE });
    const geometry = new Triangle(gl);
    const program = new Program(gl, {
      vertex: vertexShader,
      fragment: fragmentShader,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uTextTexture: { value: texture },
        uResolution: { value: new Float32Array([1, 1]) },
        uPointer: { value: new Float32Array([0.5, 0.5]) },
        uPointerActive: { value: 0 },
        uTime: { value: 0 },
        uWarpStrength: { value: settingsRef.current.warpStrength },
        uWarpScale: { value: settingsRef.current.warpScale },
        uSpeed: { value: settingsRef.current.speed },
        uPointerInfluence: { value: settingsRef.current.pointerInfluence },
        uPointerStrength: { value: settingsRef.current.pointerStrength },
        uRefraction: { value: settingsRef.current.refraction },
        uRipple: { value: settingsRef.current.ripple ? 1 : 0 },
        uMotion: { value: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? 0 : 1 },
      },
    });
    const mesh = new Mesh(gl, { geometry, program });

    let disposed = false;
    let contextLost = false;
    let visible = true;
    let pageVisible = !document.hidden;
    let raf = 0;
    let rasterVersion = 0;
    const reducedMotionQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    let reduceMotion = reducedMotionQuery?.matches ?? false;
    const startTime = performance.now();
    const pointer = { x: 0.5, y: 0.5, targetX: 0.5, targetY: 0.5, active: 0, activeTarget: 0 };
    const renderOnce = () => {
      if (!disposed && !contextLost) renderer.render({ scene: mesh });
    };

    const rasterize = async () => {
      const version = ++rasterVersion;
      try { await document.fonts?.ready; } catch { /* Use the available fallback font. */ }
      if (disposed || contextLost || version !== rasterVersion) return;
      const rect = container.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      texture.image = createTextTextureSource(container, rect.width, rect.height, dpr, settingsRef.current);
      texture.needsUpdate = true;
      renderOnce();
      container.classList.add("warp-text--ready");
    };
    const resize = () => {
      if (disposed || contextLost) return;
      const rect = container.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      renderer.dpr = Math.min(window.devicePixelRatio || 1, 2);
      renderer.setSize(rect.width, rect.height);
      program.uniforms.uResolution.value[0] = gl.drawingBufferWidth;
      program.uniforms.uResolution.value[1] = gl.drawingBufferHeight;
      void rasterize();
    };
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      pointer.targetX = (event.clientX - rect.left) / rect.width;
      pointer.targetY = 1 - (event.clientY - rect.top) / rect.height;
      pointer.activeTarget = 1;
    };
    const onPointerLeave = () => { pointer.activeTarget = 0; };
    const onContextLost = (event: Event) => {
      event.preventDefault();
      contextLost = true;
      container.classList.remove("warp-text--ready");
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };
    const onReducedMotion = (event: MediaQueryListEvent) => {
      reduceMotion = event.matches;
      program.uniforms.uMotion.value = reduceMotion ? 0 : 1;
      renderOnce();
    };
    const onVisibility = () => {
      pageVisible = !document.hidden;
      if (pageVisible && visible && !raf) raf = requestAnimationFrame(loop);
      if (!pageVisible && raf) { cancelAnimationFrame(raf); raf = 0; }
    };
    const loop = (now: number) => {
      if (disposed || contextLost) return;
      const elapsed = (now - startTime) * 0.001;
      const idleX = 0.5 + Math.sin(elapsed * 0.33) * 0.12;
      const idleY = 0.5 + Math.cos(elapsed * 0.27) * 0.1;
      const targetX = pointer.activeTarget ? pointer.targetX : idleX;
      const targetY = pointer.activeTarget ? pointer.targetY : idleY;
      const damping = pointer.activeTarget ? 0.12 : 0.035;
      pointer.x += (targetX - pointer.x) * damping;
      pointer.y += (targetY - pointer.y) * damping;
      pointer.active += ((pointer.activeTarget ? 1 : 0.18) - pointer.active) * 0.06;
      program.uniforms.uPointer.value[0] = pointer.x;
      program.uniforms.uPointer.value[1] = pointer.y;
      program.uniforms.uPointerActive.value = reduceMotion ? pointer.active * 0.35 : pointer.active;
      program.uniforms.uTime.value = reduceMotion ? 0 : elapsed;
      renderOnce();
      raf = requestAnimationFrame(loop);
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && pageVisible && !raf) raf = requestAnimationFrame(loop);
      if (!visible && raf) { cancelAnimationFrame(raf); raf = 0; }
    });
    intersectionObserver.observe(container);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerleave", onPointerLeave);
    canvas.addEventListener("webglcontextlost", onContextLost, false);
    document.addEventListener("visibilitychange", onVisibility);
    reducedMotionQuery?.addEventListener("change", onReducedMotion);
    runtimeRef.current = { program, rasterize: () => void rasterize() };
    resize();
    raf = requestAnimationFrame(loop);

    return () => {
      disposed = true;
      runtimeRef.current = null;
      if (raf) cancelAnimationFrame(raf);
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      document.removeEventListener("visibilitychange", onVisibility);
      reducedMotionQuery?.removeEventListener("change", onReducedMotion);
      if (!contextLost) {
        if (texture.texture) gl.deleteTexture(texture.texture);
        geometry.remove();
        program.remove();
        gl.getExtension("WEBGL_lose_context")?.loseContext();
      }
      if (canvas.parentNode === container) container.removeChild(canvas);
      container.classList.remove("warp-text--ready");
    };
  }, []);

  return (
    <span ref={containerRef} className={`warp-text ${className}`.trim()} style={style} role="img" aria-label={text}>
      <span className="warp-text-fallback" aria-hidden="true">{text}</span>
    </span>
  );
}
