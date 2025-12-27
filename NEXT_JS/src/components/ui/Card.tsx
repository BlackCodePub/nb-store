import type { ReactNode } from 'react';
import clsx from 'clsx';

type Props = {
  children: ReactNode;
  className?: string;
  title?: ReactNode;
  subtitle?: ReactNode;
};

export function Card({ children, className, title, subtitle }: Props) {
  return (
    <div className={clsx('card shadow-sm', className)}>
      {(title || subtitle) && (
        <div className="card-body border-bottom">
          {title && <h5 className="card-title mb-0">{title}</h5>}
          {subtitle && <div className="text-muted small mt-1">{subtitle}</div>}
        </div>
      )}
      <div className="card-body">{children}</div>
    </div>
  );
}
