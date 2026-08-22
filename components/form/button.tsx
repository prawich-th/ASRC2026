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
      className={`${styles.button} ${className ? styles[className] : ""}`}
      {...options}
    >
      {children}
    </button>
  );
}
