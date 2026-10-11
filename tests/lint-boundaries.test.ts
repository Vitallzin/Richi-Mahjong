// Garante as fronteiras de camada impostas pelo lint (spec 0.3, 5.1, 5.3 e aceite da Fase 0).
import { ESLint } from 'eslint';
import path from 'node:path';

// A primeira execução do ESLint carrega plugins e pode passar do timeout padrão de 5 s.
vi.setConfig({ testTimeout: 30_000 });

const root = path.resolve(import.meta.dirname, '..');
const eslint = new ESLint({ cwd: root });

async function ruleIds(relativeFile: string, code: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath: path.join(root, relativeFile) });
  return (result?.messages ?? []).map((m) => m.ruleId ?? m.message);
}

describe('fronteira do motor (src/engine)', () => {
  it('proíbe importar React', async () => {
    const ids = await ruleIds(
      'src/engine/tiles/sample.ts',
      "import { useState } from 'react';\nexport const x = useState;\n",
    );
    expect(ids).toContain('local/engine-isolation');
  });

  it('proíbe importar Firebase e Zustand', async () => {
    const ids = await ruleIds(
      'src/engine/sample.ts',
      "import { create } from 'zustand';\nimport { getApp } from 'firebase/app';\nexport const x = [create, getApp];\n",
    );
    expect(ids.filter((id) => id === 'local/engine-isolation')).toHaveLength(2);
  });

  it('proíbe importar código de fora de src/engine por caminho relativo', async () => {
    const ids = await ruleIds(
      'src/engine/game/sample.ts',
      "import { t } from '../../i18n';\nexport const x = t;\n",
    );
    expect(ids).toContain('local/engine-isolation');
  });

  it('permite imports internos ao motor', async () => {
    const ids = await ruleIds(
      'src/engine/game/sample.ts',
      "import { ENGINE_SCHEMA_VERSION } from '../index';\nexport const x = ENGINE_SCHEMA_VERSION;\n",
    );
    expect(ids).toEqual([]);
  });

  it('proíbe Math.random, relógio e DOM', async () => {
    const ids = await ruleIds(
      'src/engine/sample.ts',
      'export const a = Math.random();\nexport const b = Date.now();\nexport const c = new Date();\nexport const d = window;\n',
    );
    expect(ids).toEqual(
      expect.arrayContaining([
        'no-restricted-properties',
        'no-restricted-syntax',
        'no-restricted-globals',
      ]),
    );
  });
});

describe('ajudas e bots só enxergam PlayerView', () => {
  it('proíbe MatchState e getTrainingView em src/help', async () => {
    const ids = await ruleIds(
      'src/help/sample.ts',
      "import type { MatchState } from '../engine';\nimport { getTrainingView } from '../engine';\nexport type X = MatchState;\nexport const y = getTrainingView;\n",
    );
    expect(ids.filter((id) => id === 'local/player-view-only')).toHaveLength(2);
  });

  it('proíbe importar módulos internos do motor em src/bots', async () => {
    const ids = await ruleIds(
      'src/bots/sample.ts',
      "import { x } from '../engine/game/state';\nexport const y = x;\n",
    );
    expect(ids).toContain('local/player-view-only');
  });

  it('permite a entrada pública do motor', async () => {
    const ids = await ruleIds(
      'src/bots/sample.ts',
      "import { ENGINE_SCHEMA_VERSION } from '../engine';\nexport const y = ENGINE_SCHEMA_VERSION;\n",
    );
    expect(ids).toEqual([]);
  });
});
