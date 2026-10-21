import styles from "./button.module.scss";

export default function Button({
  children,
  className,
  ...options
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: React.ReactNode;
}) {
  return (
    <button
      className={[
        styles.button,
        ...(className?.split(" ") ?? []).map((name) => styles[name]),
      ]
        .filter(Boolean)
        .join(" ")}
      {...options}
    >
      {children}
    </button>
  );
}
