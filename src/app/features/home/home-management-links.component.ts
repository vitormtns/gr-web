import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home-management-links',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<nav class="management-shortcuts" aria-label="Gestão da fazenda">
    <a routerLink="/gestao/insumos"
      >Consultar insumos e estoque <span aria-hidden="true">→</span></a
    >
    <a routerLink="/gestao/financeiro">Revisar financeiro <span aria-hidden="true">→</span></a>
    <a routerLink="/administracao">Fazenda e acessos <span aria-hidden="true">→</span></a>
  </nav>`,
  styles: `
    .management-shortcuts {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-3);
      margin-block: var(--space-4);
    }
    a {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-4);
      padding: var(--space-3) var(--space-4);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-surface);
      color: var(--color-primary);
      font-size: 0.875rem;
      font-weight: 600;
      text-decoration: none;
      flex: 1;
      min-width: 15rem;
    }
    a:hover {
      border-color: var(--color-primary);
    }
    a:focus-visible {
      outline: 2px solid var(--color-primary);
      outline-offset: 3px;
    }
  `,
})
export class HomeManagementLinksComponent {}
