import type { InputHTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
};

export function Input({ label, hint, error, className, id, ...rest }: Props) {
  const inputId = id || rest.name;
  return (
    <div className="mb-3">
      {label && (
        <label htmlFor={inputId} className="form-label fw-semibold">
          {label}
        </label>
      )}
      <input id={inputId} className={clsx('form-control', error && 'is-invalid', className)} {...rest} />
      {hint && !error && <div className="form-text">{hint}</div>}
      {error && <div className="invalid-feedback d-block">{error}</div>}
    </div>
  );
}
