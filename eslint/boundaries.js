// Regras de fronteira entre camadas (spec, seções 0.3, 5.1 e 5.3).
// Implementadas como plugin local para não depender de resolvedores de import externos:
// os caminhos relativos são resolvidos a partir do próprio arquivo.
import path from 'node:path';

const SRC = path.resolve(import.meta.dirname, '..', 'src');
const ENGINE = path.join(SRC, 'engine');
const ENGINE_ENTRY = new Set([ENGINE, path.join(ENGINE, 'index'), path.join(ENGINE, 'index.ts')]);

const isInside = (dir, target) => {
  const rel = path.relative(dir, target);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
};

const resolveSpecifier = (filename, specifier) =>
  specifier.startsWith('.') ? path.resolve(path.dirname(filename), specifier) : null;

/** Visita toda origem de import/export/import() estático do arquivo. */
const forEachSource = (onSource) => ({
  ImportDeclaration: (node) => onSource(node.source, node),
  ExportNamedDeclaration: (node) => node.source && onSource(node.source, node),
  ExportAllDeclaration: (node) => onSource(node.source, node),
  ImportExpression: (node) =>
    node.source.type === 'Literal' && typeof node.source.value === 'string'
      ? onSource(node.source, node)
      : undefined,
});

const engineIsolation = {
  meta: {
    type: 'problem',
    docs: { description: 'src/engine/ não importa nada de fora de src/engine/ (nem pacotes).' },
    messages: {
      external: 'O motor (src/engine) é TypeScript puro: não pode importar o pacote "{{spec}}".',
      escape: 'O motor (src/engine) não pode importar "{{spec}}", que fica fora de src/engine/.',
    },
    schema: [],
  },
  create(context) {
    const filename = path.resolve(context.filename);
    if (!isInside(ENGINE, filename)) return {};
    return forEachSource((source) => {
      const spec = String(source.value);
      const resolved = resolveSpecifier(filename, spec);
      if (resolved === null) {
        context.report({ node: source, messageId: 'external', data: { spec } });
      } else if (!isInside(ENGINE, resolved)) {
        context.report({ node: source, messageId: 'escape', data: { spec } });
      }
    });
  },
};

const FORBIDDEN_FOR_VIEW_CONSUMERS = new Set(['MatchState', 'getTrainingView', 'applyAction']);

const playerViewOnly = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'src/help/ e src/bots/ só usam a entrada pública do motor e nunca MatchState/getTrainingView.',
    },
    messages: {
      deep: 'Importe o motor apenas por "src/engine" (entrada pública), não por "{{spec}}".',
      forbidden:
        '"{{name}}" dá acesso ao estado completo da partida; ajudas e bots só podem usar PlayerView.',
      layer: 'Ajudas e bots não podem importar "{{spec}}" (camada {{layer}}).',
    },
    schema: [],
  },
  create(context) {
    const filename = path.resolve(context.filename);
    const inHelp = isInside(path.join(SRC, 'help'), filename);
    const inBots = isInside(path.join(SRC, 'bots'), filename);
    if (!inHelp && !inBots) return {};
    return forEachSource((source, node) => {
      const spec = String(source.value);
      const resolved = resolveSpecifier(filename, spec);
      if (resolved === null) return;
      for (const layer of ['session', 'net', 'state', 'ui']) {
        if (isInside(path.join(SRC, layer), resolved)) {
          context.report({ node: source, messageId: 'layer', data: { spec, layer } });
          return;
        }
      }
      if (!isInside(ENGINE, resolved)) return;
      if (!ENGINE_ENTRY.has(resolved)) {
        context.report({ node: source, messageId: 'deep', data: { spec } });
      }
      const specifiers = node.specifiers ?? [];
      for (const s of specifiers) {
        const name =
          s.type === 'ImportSpecifier' || s.type === 'ExportSpecifier'
            ? ((s.imported ?? s.local).name ?? (s.imported ?? s.local).value)
            : null;
        if (name && FORBIDDEN_FOR_VIEW_CONSUMERS.has(name)) {
          context.report({ node: s, messageId: 'forbidden', data: { name } });
        }
      }
    });
  },
};

export default {
  meta: { name: 'local-boundaries' },
  rules: {
    'engine-isolation': engineIsolation,
    'player-view-only': playerViewOnly,
  },
};
