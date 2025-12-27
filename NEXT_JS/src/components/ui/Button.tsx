import type { ButtonHTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'link' | 'danger';
  size?: 'sm' | 'lg';
};

export function Button({ children, className, variant = 'primary', size, ...rest }: Props) {
  const variantClass =
    variant === 'outline'
      ? 'btn btn-outline-primary'
      : variant === 'link'
      ? 'btn btn-link'
      : variant === 'danger'
      ? 'btn btn-danger'
      : variant === 'secondary'
      ? 'btn btn-secondary'
      : 'btn btn-primary';
  const sizeClass = size ? `btn-${size}` : '';

  return (
    <button className={clsx(variantClass, sizeClass, className)} {...rest}>
      {children}
    </button>
  );
}
