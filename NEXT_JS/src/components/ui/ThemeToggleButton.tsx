'use client';

import { useTheme } from './ThemeProvider';

interface ThemeToggleButtonProps {
  size?: 'sm' | 'md';
  variant?: 'light' | 'dark' | 'outline';
}

export default function ThemeToggleButton({ size = 'sm', variant = 'outline' }: ThemeToggleButtonProps) {
  const { theme, toggleTheme } = useTheme();

  const sizeClass = size === 'md' ? 'btn' : 'btn btn-sm';
  const variantClass = variant === 'dark'
    ? 'btn-dark'
    : variant === 'light'
      ? 'btn-light'
      : 'btn-outline-secondary';

  return (
    <button
      type="button"
      className={`${sizeClass} ${variantClass}`}
      onClick={toggleTheme}
      title={theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
      aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
    >
      <i className={`bi ${theme === 'dark' ? 'bi-sun' : 'bi-moon'}`}></i>
    </button>
  );
}
