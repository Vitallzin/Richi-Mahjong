/**
 * Motor de regras: TypeScript puro, determinístico e sem dependências externas (spec 5.1).
 * Esta é a única entrada pública consumida por help/ e bots/ (que só podem usar PlayerView).
 */
export const ENGINE_SCHEMA_VERSION = 1;

export * from './types';
export * from './tiles';
export * from './rng';
export * from './rules';
export * from './hand';
export * from './yaku';
export * from './scoring';
export * from './game';
export * from './view';
