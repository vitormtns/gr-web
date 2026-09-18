import { describe, expect, it } from 'vitest';
import { routes } from './app.routes';

describe('rotas do Portal', () => {
  it('mantém as superfícies principais lazy-loaded', () => {
    const shell = routes.find((route) => route.path === '');
    const paths = shell?.children?.map((route) => route.path) ?? [];
    expect(paths).toEqual(expect.arrayContaining([
      'visao-geral',
      'rebanho/animais',
      'rebanho/animais/:animalId',
      'rebanho/saude',
      'rebanho/reproducao',
      'rebanho/agenda',
      'relatorios',
      'administracao',
      'administracao/fazendas',
      'administracao/pessoas',
    ]));
    expect(shell?.children?.every((route) => route.redirectTo || route.loadComponent)).toBe(true);
  });

  it('exibe uma página 404 em vez de ocultar URLs inválidas', () => {
    const wildcard = routes.find((route) => route.path === '**');
    expect(wildcard?.redirectTo).toBeUndefined();
    expect(wildcard?.loadComponent).toBeTypeOf('function');
  });
});
