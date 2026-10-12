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

/** A chave existe no catálogo? (para chaves montadas dinamicamente, ex.: `rules.<id>.label`). */
export function isMessageKey(key: string): key is MessageKey {
  return key in catalogs[currentLocale];
}

/** Traduz uma chave dinâmica; se não existir, devolve a própria chave (visível em desenvolvimento). */
export function tKey(key: string, params?: MessageParams): string {
  return isMessageKey(key) ? t(key, params) : key;
}
