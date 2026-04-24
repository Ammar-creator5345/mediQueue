import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { clsx } from "clsx";

interface FieldProps {
  label?: string;
  error?: string;
  hint?: string;
}

const inputClass =
  "w-full h-10 rounded-md border border-input bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring disabled:opacity-50";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & FieldProps>(
  function Input({ label, error, hint, className, id, ...rest }, ref) {
    const inputId = id ?? rest.name;
    return (
      <div className="space-y-1">
        {label ? (
          <label htmlFor={inputId} className="text-sm font-medium text-foreground">
            {label}
          </label>
        ) : null}
        <input ref={ref} id={inputId} className={clsx(inputClass, className)} {...rest} />
        {error ? (
          <p className="text-xs text-destructive">{error}</p>
        ) : hint ? (
          <p className="text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </div>
    );
  }
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & FieldProps
>(function Textarea({ label, error, hint, className, id, ...rest }, ref) {
  const inputId = id ?? rest.name;
  return (
    <div className="space-y-1">
      {label ? (
        <label htmlFor={inputId} className="text-sm font-medium text-foreground">
          {label}
        </label>
      ) : null}
      <textarea
        ref={ref}
        id={inputId}
        className={clsx(inputClass, "h-auto min-h-[90px] py-2", className)}
        {...rest}
      />
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
});

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement> & FieldProps
>(function Select({ label, error, hint, className, id, children, ...rest }, ref) {
  const inputId = id ?? rest.name;
  return (
    <div className="space-y-1">
      {label ? (
        <label htmlFor={inputId} className="text-sm font-medium text-foreground">
          {label}
        </label>
      ) : null}
      <select ref={ref} id={inputId} className={clsx(inputClass, "appearance-none pr-8", className)} {...rest}>
        {children}
      </select>
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
});
