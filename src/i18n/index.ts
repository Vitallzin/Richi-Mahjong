import { ptBR, type MessageKey } from './pt-BR';

export type { MessageKey };
export type Locale = 'pt-BR';
export type MessageParams = Readonly<Record<string, string | number>>;

const catalogs: Record<Locale, Record<MessageKey, string>> = { 'pt-BR': ptBR };

let currentLocale: Locale = 'pt-BR';

export function setLocale(locale: Locale): void {
  currentLocale = locale;
}

export function getLocale(): Locale {
  return currentLocale;
}

/** Traduz uma chave, substituindo `{nome}` pelos parâmetros. Parâmetro ausente fica literal. */
export function t(key: MessageKey, params?: MessageParams): string {
  const template = catalogs[currentLocale][key];
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}
