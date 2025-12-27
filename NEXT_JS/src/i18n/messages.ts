export const messages = {
  'pt-BR': {
    hello: 'Olá',
  },
  'en-US': {
    hello: 'Hello',
  },
};

type Locale = keyof typeof messages;

export function t(locale: Locale, key: keyof (typeof messages)['pt-BR']) {
  return messages[locale]?.[key] ?? messages['pt-BR'][key] ?? key;
}
