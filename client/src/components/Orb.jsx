// The twin's face: a glossy gradient ball. state = "idle" | "thinking" | "speaking"
export default function Orb({ size = 40, state = "idle", className = "" }) {
  return (
    <span aria-hidden="true" className={`orb ${state !== "idle" ? `orb-${state}` : ""} ${className}`} style={{ width: size, height: size }}>
      {size >= 48 && <span className="orb-halo" />}
      <span className="orb-ring" />
      <span className="orb-glow" style={{ filter: `blur(${Math.max(1, size / 24)}px)` }} />
      <span className="orb-shine" style={{ filter: `blur(${Math.max(1, size / 36)}px)` }} />
      <span className="orb-edge" />
    </span>
  );
}
