export function StatusDot(props: {
  state: "up" | "down" | "checking";
  label: string;
}) {
  const color =
    props.state === "up"
      ? "var(--synkd-signal)"
      : props.state === "down"
        ? "var(--synkd-danger)"
        : "var(--synkd-warn)";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.45rem",
        fontFamily: "var(--synkd-font-mono)",
        fontSize: "0.78rem",
        color: "var(--synkd-foam-dim)",
      }}
      role="status"
      aria-label={props.label}
    >
      <span
        aria-hidden
        style={{
          width: "0.55rem",
          height: "0.55rem",
          borderRadius: "50%",
          background: color,
          boxShadow:
            props.state === "up" ? "0 0 0 4px var(--synkd-glow)" : undefined,
        }}
      />
      {props.label}
    </span>
  );
}
