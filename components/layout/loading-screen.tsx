import styles from "./loading-screen.module.scss";

export type LoadingScreenProps = {
  /** Subject currently loading — a single label or several concurrent items. */
  what?: string | readonly string[];
  /** Full-viewport branded screen, or a compact in-place indicator. */
  variant?: "page" | "inline";
  className?: string;
};

function itemsFrom(what?: string | readonly string[]) {
  if (what === undefined) {
    return [];
  }
  return typeof what === "string" ? [what] : [...what];
}

function statusLabel(items: string[]) {
  if (items.length === 0) {
    return "Loading";
  }
  if (items.length === 1) {
    return `Loading ${items[0]}`;
  }
  return `Loading ${items.join(", ")}`;
}

export default function LoadingScreen({
  what,
  variant = "page",
  className,
}: LoadingScreenProps) {
  const items = itemsFrom(what);
  const classes = [styles.screen, styles[variant], className]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={classes}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={statusLabel(items)}
    >
      {variant === "page" ? (
        <div className={styles.arcs} aria-hidden="true">
          <div className={styles.gray} />
          <div className={styles.orange} />
          <div className={styles.green} />
          <div className={styles.red} />
        </div>
      ) : null}

      <div className={styles.content}>
        <img className={styles.logo} src="/asrc.png" alt="" />
        <div className={styles.mark} aria-hidden="true">
          <span className={styles.ring} />
          <span className={styles.ring} />
          <span className={styles.ring} />
        </div>
        <h1 className={styles.title}>Loading.</h1>
        {items.length === 1 ? (
          <p className={styles.what}>{items[0]}</p>
        ) : items.length > 1 ? (
          <ul className={styles.list}>
            {items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
