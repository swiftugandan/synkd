import type { CSSProperties } from "react";

export function BrandMark(props: {
  size?: "sm" | "md" | "lg" | "hero";
  meta?: string;
  className?: string;
}) {
  const size = props.size ?? "md";
  const style: CSSProperties = {
    display: "flex",
    alignItems: "baseline",
    gap: size === "hero" ? "0.85rem" : "0.55rem",
    fontFamily: "var(--synkd-font-display)",
    fontWeight: 800,
    letterSpacing: "-0.04em",
    color: "var(--synkd-foam)",
    fontSize:
      size === "hero"
        ? "clamp(3.2rem, 8vw, 5.8rem)"
        : size === "lg"
          ? "1.75rem"
          : size === "sm"
            ? "1.1rem"
            : "1.35rem",
    lineHeight: size === "hero" ? 0.9 : 1.1,
    margin: 0,
  };

  return (
    <div className={props.className} style={style} aria-label="synkd">
      <span>
        synk<span style={{ color: "var(--synkd-signal)" }}>d</span>
      </span>
      {props.meta ? (
        <span
          style={{
            fontFamily: "var(--synkd-font-mono)",
            fontSize: size === "hero" ? "0.85rem" : "0.72rem",
            fontWeight: 500,
            letterSpacing: "0.02em",
            color: "var(--synkd-foam-dim)",
          }}
        >
          {props.meta}
        </span>
      ) : null}
    </div>
  );
}
