import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'gr-metric',
  template: `<div class="label">{{label}}</div><strong>{{value}}</strong>@if(detail){<small>{{detail}}</small>}`,
  styles: [`
    :host { display: grid; gap: var(--space-1); }
    .label {
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--color-text-muted);
    }
    strong {
      font-size: 1.65rem;
      line-height: 1.1;
      letter-spacing: -0.04em;
      font-weight: 780;
      color: var(--color-text);
      font-variant-numeric: tabular-nums;
    }
    small {
      font-size: 0.75rem;
      color: var(--color-text-secondary);
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MetricComponent {
  @Input({ required: true }) label = '';
  @Input({ required: true }) value = '';
  @Input() detail = '';
}

@Component({
  selector: 'gr-status-indicator',
  template: `<span [class]="tone"><i aria-hidden="true"></i><ng-content /></span>`,
  styles: [`
    span {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      color: var(--color-text-secondary);
      font-size: 0.8125rem;
      font-weight: 600;
    }
    i {
      width: 0.5rem;
      height: 0.5rem;
      border-radius: 50%;
      background: var(--color-text-muted);
    }
    .success {
      color: var(--color-success);
    }
    .success i {
      background: var(--color-success);
      box-shadow: 0 0 0 3px rgba(21, 121, 69, 0.2);
    }
    .warning {
      color: #925304;
    }
    .warning i {
      background: var(--color-warning);
      box-shadow: 0 0 0 3px rgba(179, 102, 5, 0.2);
    }
    .danger {
      color: var(--color-danger);
    }
    .danger i {
      background: var(--color-danger);
      box-shadow: 0 0 0 3px rgba(193, 60, 49, 0.2);
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusIndicatorComponent {
  @Input() tone: 'neutral' | 'success' | 'warning' | 'danger' = 'neutral';
}

@Component({
  selector: 'gr-attention-item',
  template: `<div class="point" aria-hidden="true"></div><div class="copy"><strong>{{title}}</strong><p>{{description}}</p></div><span class="meta">{{meta}}</span>`,
  styles: [`
    :host {
      display: flex;
      align-items: flex-start;
      gap: var(--space-3);
      padding: var(--space-3) 0;
      border-bottom: 1px solid var(--color-border);
    }
    .point {
      width: 0.5rem;
      height: 0.5rem;
      flex: 0 0 auto;
      margin-top: 0.45rem;
      border-radius: 50%;
      background: var(--color-warning);
      box-shadow: 0 0 0 3px rgba(179, 102, 5, 0.2);
    }
    .copy {
      min-width: 0;
      flex: 1;
    }
    .copy strong {
      font-size: 0.835rem;
      font-weight: 680;
      color: var(--color-text);
    }
    .copy p {
      margin: 2px 0 0;
      font-size: 0.75rem;
      color: var(--color-text-secondary);
    }
    .meta {
      color: var(--color-text-muted);
      font-size: 0.75rem;
      font-weight: 550;
      font-variant-numeric: tabular-nums;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttentionItemComponent {
  @Input({ required: true }) title = '';
  @Input() description = '';
  @Input() meta = '';
}

@Component({
  selector: 'gr-avatar',
  template: `<span [attr.aria-label]="name">{{initials}}</span>`,
  styles: [`
    span {
      width: 2.15rem;
      height: 2.15rem;
      display: grid;
      place-items: center;
      border: 1px solid var(--color-border-strong);
      border-radius: 50%;
      color: var(--color-primary);
      background: linear-gradient(135deg, var(--color-primary-subtle) 0%, #d8ebd9 100%);
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.04em;
      box-shadow: 0 1px 3px rgba(18, 84, 52, 0.12);
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AvatarComponent {
  @Input() name = 'Usuário';
  get initials(): string {
    return this.name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'US';
  }
}

@Component({
  selector: 'gr-table',
  template: `@if(loading){
    <div class="table-state" role="status">
      Carregando informações da tabela
      <span class="state-lines" aria-hidden="true"><i></i><i></i><i></i></span>
    </div>
  } @else if(empty){
    <div class="table-state" role="status">{{emptyMessage}}</div>
  } @else {
    <div class="scroll" tabindex="0" aria-label="Tabela com rolagem horizontal">
      <table><ng-content /></table>
    </div>
  }`,
  styles: [`
    .scroll {
      max-width: 100%;
      overflow-x: auto;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      background: var(--color-surface);
      box-shadow: var(--shadow-raised);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }
    :host ::ng-deep th, :host ::ng-deep td {
      min-height: 3.25rem;
      padding: var(--space-3) var(--space-4);
      border-bottom: 1px solid var(--color-border);
      text-align: left;
      white-space: nowrap;
    }
    :host ::ng-deep th {
      color: var(--color-text-secondary);
      background: linear-gradient(180deg, #ffffff 0%, var(--color-surface-soft) 100%);
      font-size: 0.75rem;
      font-weight: 750;
      letter-spacing: 0.03em;
      text-transform: uppercase;
      border-bottom: 1px solid var(--color-border-strong);
    }
    :host ::ng-deep tbody tr:last-child td {
      border-bottom: 0;
    }
    :host ::ng-deep tbody tr {
      transition: background var(--duration-fast);
    }
    :host ::ng-deep tbody tr:hover {
      background: rgba(220, 238, 226, 0.35);
    }
    :host ::ng-deep tbody tr[aria-selected="true"] {
      background: var(--color-primary-subtle);
    }
    :host ::ng-deep tbody tr:focus-within {
      outline: 2px solid var(--color-focus);
      outline-offset: -2px;
    }
    :host ::ng-deep td button {
      min-height: var(--control-height-small);
    }
    .table-state {
      min-height: 11rem;
      display: grid;
      align-content: center;
      justify-items: center;
      gap: var(--space-4);
      padding: var(--space-6);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      color: var(--color-text-secondary);
      background: var(--color-surface);
      font-size: 0.875rem;
      box-shadow: var(--shadow-raised);
    }
    .state-lines {
      width: min(18rem, 100%);
      display: grid;
      gap: var(--space-2);
    }
    .state-lines i {
      height: 0.75rem;
      border-radius: var(--radius-sm);
      background: var(--color-surface-soft);
      animation: loading-pulse var(--duration-context) var(--ease-standard) infinite alternate;
    }
    .state-lines i:nth-child(2) { width: 80%; }
    .state-lines i:nth-child(3) { width: 58%; }
    @keyframes loading-pulse {
      to { background: var(--color-primary-subtle); }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableComponent {
  @Input() loading = false;
  @Input() empty = false;
  @Input() emptyMessage = 'Nenhuma informação encontrada.';
}

@Component({
  selector: 'gr-pagination',
  template: `<nav aria-label="Paginação">
    <span>Página {{page + 1}} de {{totalPages || 1}}</span>
    <div>
      <button type="button" [disabled]="page <= 0" (click)="pageChange.emit(page - 1)">Anterior</button>
      <button type="button" [disabled]="page >= totalPages - 1" (click)="pageChange.emit(page + 1)">Próxima</button>
    </div>
  </nav>`,
  styles: [`
    nav {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-4);
      color: var(--color-text-muted);
      font-size: 0.75rem;
      font-weight: 600;
    }
    div {
      display: flex;
      gap: var(--space-2);
    }
    button {
      min-height: 2.15rem;
      padding: 0 var(--space-4);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      color: var(--color-text);
      background: var(--color-surface);
      box-shadow: var(--shadow-xs);
      font-size: 0.8125rem;
      font-weight: 600;
      cursor: pointer;
      transition: background var(--duration-fast), border-color var(--duration-fast);
    }
    button:hover:not(:disabled) {
      border-color: var(--color-border-strong);
      background: var(--color-surface-soft);
    }
    button:disabled {
      opacity: 0.45;
      cursor: not-allowed;
      box-shadow: none;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaginationComponent {
  @Input() page = 0;
  @Input() totalPages = 0;
  @Output() pageChange = new EventEmitter<number>();
}

@Component({
  selector: 'gr-filter-bar',
  template: `<section aria-label="Filtros"><ng-content /></section>`,
  styles: [`
    section {
      display: flex;
      align-items: flex-end;
      flex-wrap: wrap;
      gap: var(--space-3);
      padding: var(--space-4);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      background: var(--color-surface);
      box-shadow: var(--shadow-sm);
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilterBarComponent {}
