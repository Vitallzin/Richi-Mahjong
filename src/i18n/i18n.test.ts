import { t } from './index';

describe('i18n', () => {
  it('traduz chaves conhecidas', () => {
    expect(t('menu.play')).toBe('Jogar');
  });

  it('interpola parâmetros e mantém os ausentes literais', () => {
    expect(t('notFound.body', { path: '/xyz' })).toBe('O endereço "/xyz" não existe.');
    expect(t('notFound.body', {})).toBe('O endereço "{path}" não existe.');
  });
});
