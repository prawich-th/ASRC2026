import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import styles from "./Form.module.scss";

export type SelectOption = {
  label: string;
  value: string;
};

type BaseFieldProps = {
  label?: ReactNode;
  errorMessage?: string;
  hint?: string;
  compact?: boolean;
  className?: string;
  id?: string;
};

type FormFieldProps = BaseFieldProps &
  InputHTMLAttributes<HTMLInputElement> & {
    prefix?: string;
  };

type SelectFieldProps = BaseFieldProps &
  SelectHTMLAttributes<HTMLSelectElement> & {
    options: ReadonlyArray<SelectOption>;
    placeholder?: string;
  };

type TextAreaFieldProps = BaseFieldProps &
  TextareaHTMLAttributes<HTMLTextAreaElement>;

type CheckboxFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "children"
> &
  BaseFieldProps & {
    label: ReactNode;
  };

type FileUploadFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "value"
> &
  BaseFieldProps & {
    selectedFiles?: ReadonlyArray<File>;
    contextText?: string;
  };

function FieldShell({
  label,
  errorMessage,
  hint,
  compact = false,
  className,
  children,
}: BaseFieldProps & { children: ReactNode }) {
  return (
    <div
      className={[
        styles.defaultField,
        compact ? styles.compact : "",
        errorMessage ? styles.error : "",
        className ?? "",
      ].join(" ")}
    >
      {label ? <label>{label}</label> : null}
      {children}
      {hint ? <p className={styles.hint}>{hint}</p> : null}
      {errorMessage ? <p className={styles.errorMessage}>{errorMessage}</p> : null}
    </div>
  );
}

export function FormField({
  label,
  errorMessage,
  hint,
  compact,
  className,
  prefix,
  type = "text",
  id,
  ...rest
}: FormFieldProps) {
  const inputId = id ?? (typeof label === "string" ? label : undefined);
  return (
    <FieldShell
      label={label}
      errorMessage={errorMessage}
      hint={hint}
      compact={compact}
      className={className}
    >
      <div className={styles.inputRow}>
        {prefix ? <span className={styles.prefix}>{prefix}</span> : null}
        <input id={inputId} type={type} {...rest} />
      </div>
    </FieldShell>
  );
}

export function SelectField({
  label,
  options,
  placeholder,
  errorMessage,
  hint,
  compact,
  className,
  id,
  ...rest
}: SelectFieldProps) {
  const inputId = id ?? (typeof label === "string" ? label : undefined);
  return (
    <FieldShell
      label={label}
      errorMessage={errorMessage}
      hint={hint}
      compact={compact}
      className={className}
    >
      <select id={inputId} {...rest}>
        {placeholder ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

export function TextAreaField({
  label,
  errorMessage,
  hint,
  compact,
  className,
  id,
  ...rest
}: TextAreaFieldProps) {
  const inputId = id ?? (typeof label === "string" ? label : undefined);
  return (
    <FieldShell
      label={label}
      errorMessage={errorMessage}
      hint={hint}
      compact={compact}
      className={className}
    >
      <textarea id={inputId} {...rest} />
    </FieldShell>
  );
}

export function CheckboxField({
  label,
  errorMessage,
  hint,
  compact,
  className,
  id,
  ...rest
}: CheckboxFieldProps) {
  const inputId = id ?? (typeof label === "string" ? label : undefined);
  return (
    <div
      className={[
        styles.checkboxField,
        compact ? styles.compact : "",
        errorMessage ? styles.error : "",
        className ?? "",
      ].join(" ")}
    >
      <label htmlFor={inputId}>
        <input id={inputId} type="checkbox" {...rest} />
        <span>{label}</span>
      </label>
      {hint ? <p className={styles.hint}>{hint}</p> : null}
      {errorMessage ? <p className={styles.errorMessage}>{errorMessage}</p> : null}
    </div>
  );
}

export function FileUploadField({
  label,
  errorMessage,
  hint,
  compact,
  className,
  selectedFiles = [],
  contextText,
  id,
  ...rest
}: FileUploadFieldProps) {
  const inputId = id ?? (typeof label === "string" ? label : undefined);
  const formatFileSize = (bytes: number) => {
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    return `${Math.max(1, Math.ceil(bytes / 1024))} KB`;
  };
  return (
    <div
      className={[
        styles.fileUploadField,
        compact ? styles.compact : "",
        errorMessage ? styles.error : "",
        className ?? "",
      ].join(" ")}
    >
      {label ? <label htmlFor={inputId}>{label}</label> : null}
      <label
        className={`${styles.dropFileField} ${
          selectedFiles.length > 0 ? styles.hasSelectedFiles : ""
        }`}
        htmlFor={inputId}
      >
        <input id={inputId} type="file" {...rest} />
        <div className={styles.uploadPrompt}>
          <span className={styles.uploadIcon}>
            <i className="bx bx-upload" aria-hidden="true" />
          </span>
          <div>
            <strong>
              {selectedFiles.length > 0
                ? rest.multiple
                  ? "Add more files"
                  : "Choose a different file"
                : "Choose file"}
            </strong>
            <p className={styles.dropFileFieldContext}>
              {contextText ?? "Click to select files or drag and drop"}
            </p>
          </div>
        </div>
        {selectedFiles.length > 0 ? (
          <ul className={styles.fileList}>
            {selectedFiles.map((file) => (
              <li key={`${file.name}-${file.lastModified}`}>
                <span className={styles.selectedFileIcon}>
                  <i className="bx bx-file-blank" aria-hidden="true" />
                </span>
                <span className={styles.selectedFileDetails}>
                  <strong title={file.name}>{file.name}</strong>
                  <small>{formatFileSize(file.size)}</small>
                </span>
                <i
                  className={`bx bx-check-circle ${styles.selectedFileCheck}`}
                  aria-label="Selected"
                />
              </li>
            ))}
          </ul>
        ) : null}
      </label>
      {hint ? <p className={styles.hint}>{hint}</p> : null}
      {errorMessage ? <p className={styles.errorMessage}>{errorMessage}</p> : null}
    </div>
  );
}

export function FieldGroup({
  label,
  children,
  borderBottom = false,
  borderTop = false,
}: {
  label?: string;
  children: ReactNode;
  borderBottom?: boolean;
  borderTop?: boolean;
}) {
  return (
    <div
      className={[
        styles.fieldGroup,
        borderBottom ? styles.borderBottom : "",
        borderTop ? styles.borderTop : "",
      ].join(" ")}
    >
      {label ? <h2 className={styles.fieldGroupLabel}>{label}</h2> : null}
      {children}
    </div>
  );
}
