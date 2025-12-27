'use client';

import { useI18n } from '../../i18n/I18nContext';
import { locales, localeNames, currencies, currencyNames, currencySymbols, type Locale, type Currency } from '../../i18n/config';

interface LocaleSelectorProps {
  showCurrency?: boolean;
  compact?: boolean;
}

export default function LocaleSelector({ showCurrency = true, compact = false }: LocaleSelectorProps) {
  const { locale, currency, setLocale, setCurrency, t } = useI18n();
  
  if (compact) {
    return (
      <div className="d-flex gap-2">
        <select
          className="form-select form-select-sm"
          value={locale}
          onChange={(e) => setLocale(e.target.value as Locale)}
          style={{ width: 'auto' }}
          aria-label={t.account.language}
        >
          {locales.map((loc) => (
            <option key={loc} value={loc}>
              {loc === 'pt-BR' ? '🇧🇷' : '🇺🇸'}
            </option>
          ))}
        </select>
        
        {showCurrency && (
          <select
            className="form-select form-select-sm"
            value={currency}
            onChange={(e) => setCurrency(e.target.value as Currency)}
            style={{ width: 'auto' }}
            aria-label={t.account.currency}
          >
            {currencies.map((curr) => (
              <option key={curr} value={curr}>
                {currencySymbols[curr]}
              </option>
            ))}
          </select>
        )}
      </div>
    );
  }
  
  return (
    <div className="dropdown">
      <button
        className="btn btn-outline-secondary btn-sm dropdown-toggle"
        type="button"
        data-bs-toggle="dropdown"
        aria-expanded="false"
      >
        {locale === 'pt-BR' ? '🇧🇷' : '🇺🇸'} {currencySymbols[currency]}
      </button>
      <div className="dropdown-menu dropdown-menu-end p-3" style={{ minWidth: '200px' }}>
        <div className="mb-3">
          <label className="form-label small text-muted mb-1">{t.account.language}</label>
          <select
            className="form-select form-select-sm"
            value={locale}
            onChange={(e) => setLocale(e.target.value as Locale)}
          >
            {locales.map((loc) => (
              <option key={loc} value={loc}>
                {localeNames[loc]}
              </option>
            ))}
          </select>
        </div>
        
        {showCurrency && (
          <div>
            <label className="form-label small text-muted mb-1">{t.account.currency}</label>
            <select
              className="form-select form-select-sm"
              value={currency}
              onChange={(e) => setCurrency(e.target.value as Currency)}
            >
              {currencies.map((curr) => (
                <option key={curr} value={curr}>
                  {currencyNames[curr]}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}
