import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, HostListener, Input, Output, signal, ViewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FarmOption, OrganizationOption } from '../../core/api/api.models';

export interface BreadcrumbItem { label: string; url?: string }

@Component({
  selector: 'gr-breadcrumb',
  imports: [RouterLink],
  template: `<nav aria-label="Navegação estrutural">
    <ol>
      @for(item of items; track item.label; let last = $last){
        <li>
          @if(item.url && !last){
            <a [routerLink]="item.url">{{item.label}}</a>
          } @else {
            <span [attr.aria-current]="last ? 'page' : null">{{item.label}}</span>
          }
        </li>
      }
    </ol>
  </nav>`,
  styles: [`
    ol {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      margin: 0;
      padding: 0;
      list-style: none;
      color: var(--color-text-muted);
      font-size: 0.8125rem;
      font-weight: 520;
    }
    li + li::before {
      content: '/';
      margin-right: var(--space-2);
      color: var(--color-border-strong);
      font-weight: 400;
    }
    a {
      text-decoration: none;
      color: var(--color-text-secondary);
      transition: color var(--duration-fast);
    }
    a:hover {
      color: var(--color-primary);
      text-decoration: underline;
    }
    span[aria-current="page"] {
      color: var(--color-text);
      font-weight: 680;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BreadcrumbComponent {
  @Input() items: BreadcrumbItem[] = [];
}

export interface TabItem { id: string; label: string }

@Component({
  selector: 'gr-tabs',
  template: `<div role="tablist" [attr.aria-label]="label">
    @for(tab of tabs; track tab.id; let index = $index){
      <button
        type="button"
        role="tab"
        [attr.aria-selected]="tab.id === active"
        [attr.tabindex]="tab.id === active ? 0 : -1"
        (click)="activeChange.emit(tab.id)"
        (keydown)="onKeydown($event, index)"
      >
        {{tab.label}}
      </button>
    }
  </div>`,
  styles: [`
    div {
      display: flex;
      gap: var(--space-2);
      border-bottom: 1px solid var(--color-border);
    }
    button {
      position: relative;
      min-height: 2.35rem;
      padding: var(--space-2) var(--space-4);
      border: 0;
      border-radius: var(--radius-sm) var(--radius-sm) 0 0;
      color: var(--color-text-secondary);
      background: transparent;
      font-size: 0.875rem;
      font-weight: 550;
      cursor: pointer;
      transition: color var(--duration-fast), background var(--duration-fast);
    }
    button:hover {
      color: var(--color-text);
      background: var(--color-surface-soft);
    }
    button[aria-selected="true"] {
      color: var(--color-primary);
      font-weight: 700;
    }
    button[aria-selected="true"]::after {
      content: '';
      position: absolute;
      right: 0;
      bottom: -1px;
      left: 0;
      height: 2.5px;
      border-radius: 2px 2px 0 0;
      background: var(--color-primary);
      box-shadow: 0 -1px 6px rgba(18, 84, 52, 0.35);
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TabsComponent {
  @Input() tabs: TabItem[] = [];
  @Input() active = '';
  @Input() label = 'Seções';
  @Output() activeChange = new EventEmitter<string>();

  onKeydown(event: KeyboardEvent, index: number): void {
    if (!this.tabs.length) return;
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % this.tabs.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + this.tabs.length) % this.tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = this.tabs.length - 1;
    else return;
    event.preventDefault();
    const buttons = (event.currentTarget as HTMLElement).parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    buttons?.[next]?.focus();
    this.activeChange.emit(this.tabs[next].id);
  }
}

@Component({
  selector: 'gr-context-selector',
  template: `<div class="selector">
    <span>{{kind === 'organization' ? 'Organização' : 'Fazenda'}}</span>
    <select
      [attr.aria-label]="kind === 'organization' ? 'Organização atual' : 'Fazenda atual'"
      [value]="value"
      [disabled]="disabled || !options.length"
      (change)="changed.emit($any($event.target).value)"
    >
      @if(!options.length){<option value="">Nenhuma disponível</option>}
      @for(option of options; track idOf(option)){
        <option [value]="idOf(option)">{{labelOf(option)}}</option>
      }
    </select>
  </div>`,
  styles: [`
    .selector {
      min-width: 9.5rem;
      display: grid;
      gap: 1px;
      padding: var(--space-1) var(--space-3);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      background: var(--color-surface);
      box-shadow: var(--shadow-xs);
      transition: background var(--duration-fast), border-color var(--duration-fast);
    }
    .selector:hover {
      border-color: var(--color-border-strong);
      background: var(--color-surface-soft);
    }
    .selector:focus-within {
      border-color: var(--color-focus);
      box-shadow: 0 0 0 2px rgba(40, 122, 85, 0.18);
    }
    span {
      font-size: 0.625rem;
      font-weight: 750;
      line-height: 1.2;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--color-text-muted);
    }
    select {
      max-width: 13rem;
      padding: 0 1.25rem 0 0;
      border: 0;
      outline: 0;
      color: var(--color-text);
      background: transparent;
      font-size: 0.8125rem;
      font-weight: 650;
      text-overflow: ellipsis;
      cursor: pointer;
    }
    select:disabled {
      cursor: not-allowed;
      color: var(--color-text-muted);
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContextSelectorComponent {
  @Input() kind: 'organization' | 'farm' = 'farm';
  @Input() options: (OrganizationOption | FarmOption)[] = [];
  @Input() value = '';
  @Input() disabled = false;
  @Output() changed = new EventEmitter<string>();
  idOf(option: OrganizationOption | FarmOption): string { return 'organizationId' in option ? option.organizationId : option.farmId; }
  labelOf(option: OrganizationOption | FarmOption): string { return 'organizationName' in option ? option.organizationName : option.farmName; }
}

@Component({
  selector: 'gr-context-navigator',
  template: `<div class="navigator">
    <button
      #trigger
      class="trigger"
      type="button"
      aria-haspopup="dialog"
      [attr.aria-controls]="id"
      [attr.aria-expanded]="open()"
      [disabled]="disabled"
      (click)="toggle()"
    >
      <span class="territory-indicator" aria-hidden="true"><i></i></span>
      <span class="path">
        <strong>{{organization?.organizationName || 'Selecione uma organização'}}</strong>
        <span aria-hidden="true">›</span>
        <em>{{farm?.farmName || 'Selecione uma fazenda'}}</em>
      </span>
      <span class="caret" aria-hidden="true"></span>
    </button>
    @if(open()){
      <div class="popover" [id]="id" role="dialog" aria-label="Selecionar contexto">
        <div class="popover-heading">
          <span>Organização atual</span>
          <strong>{{organization?.organizationName || 'Nenhuma organização'}}</strong>
        </div>
        <div class="section-heading">Fazendas disponíveis</div>
        <div class="options">
          @for(option of farms; track option.farmId){
            <button
              type="button"
              [class.selected]="option.farmId === farm?.farmId"
              [attr.aria-current]="option.farmId === farm?.farmId ? 'true' : null"
              (click)="chooseFarm(option.farmId)"
            >
              <span class="option-point" aria-hidden="true"></span>
              {{option.farmName}}
              @if(option.farmId === farm?.farmId){
                <span class="check" aria-hidden="true">✓</span>
              }
            </button>
          } @empty {
            <p>Nenhuma fazenda disponível.</p>
          }
        </div>
        <button
          class="change-organization"
          type="button"
          [attr.aria-expanded]="organizationsOpen()"
          (click)="organizationsOpen.set(!organizationsOpen())"
        >
          Trocar organização <span aria-hidden="true">›</span>
        </button>
        @if(organizationsOpen()){
          <div class="options organization-options">
            @for(option of organizations; track option.organizationId){
              <button
                type="button"
                [class.selected]="option.organizationId === organization?.organizationId"
                [attr.aria-current]="option.organizationId === organization?.organizationId ? 'true' : null"
                (click)="chooseOrganization(option.organizationId)"
              >
                {{option.organizationName}}
                @if(option.organizationId === organization?.organizationId){
                  <span class="check" aria-hidden="true">✓</span>
                }
              </button>
            }
          </div>
        }
      </div>
    }
  </div>`,
  styles: [`
    :host {
      position: relative;
      display: block;
      min-width: 0;
    }
    .navigator {
      position: relative;
      min-width: 0;
    }
    .trigger {
      width: 100%;
      max-width: 29rem;
      min-height: 2.65rem;
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: 0 var(--space-3);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      color: var(--color-text);
      background: rgba(255, 255, 255, 0.85);
      box-shadow: var(--shadow-xs);
      text-align: left;
      cursor: pointer;
      transition: background var(--duration-fast), border-color var(--duration-fast), box-shadow var(--duration-fast);
    }
    .trigger:hover, .trigger[aria-expanded="true"] {
      border-color: var(--color-border-strong);
      background: var(--color-surface);
      box-shadow: var(--shadow-sm);
    }
    .trigger:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }
    .path {
      min-width: 0;
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font-size: 0.835rem;
      white-space: nowrap;
    }
    .path strong, .path em {
      overflow: hidden;
      text-overflow: ellipsis;
      font-style: normal;
    }
    .path strong {
      max-width: 11rem;
      font-weight: 700;
      color: var(--color-text);
    }
    .path em {
      max-width: 10rem;
      color: var(--color-primary);
      font-weight: 600;
    }
    .path > span {
      color: var(--color-accent);
      font-size: 1.15rem;
      line-height: 1;
    }
    .territory-indicator {
      position: relative;
      width: 1.65rem;
      height: 1.65rem;
      display: grid;
      place-items: center;
      flex: 0 0 auto;
      border: 1px solid var(--color-border-strong);
      border-radius: 50%;
      background: var(--color-primary-subtle);
      box-shadow: 0 0 8px rgba(18, 84, 52, 0.12);
    }
    .territory-indicator::before {
      content: '';
      position: absolute;
      inset: 0.25rem;
      border: 1.2px solid var(--color-accent);
      border-radius: 55% 45% 60% 40%;
      transform: rotate(-25deg);
    }
    .territory-indicator i {
      position: relative;
      width: 0.35rem;
      height: 0.35rem;
      border-radius: 50%;
      background: var(--color-primary);
    }
    .caret {
      width: 0.45rem;
      height: 0.45rem;
      flex: 0 0 auto;
      margin-left: auto;
      border-right: 1.5px solid var(--color-text-secondary);
      border-bottom: 1.5px solid var(--color-text-secondary);
      transform: translateY(-2px) rotate(45deg);
      transition: transform var(--duration-fast);
    }
    .trigger[aria-expanded="true"] .caret {
      transform: translateY(2px) rotate(-135deg);
    }
    .popover {
      position: absolute;
      z-index: 35;
      top: calc(100% + var(--space-2));
      left: 0;
      width: min(22rem, calc(100vw - 2rem));
      max-height: min(30rem, calc(100dvh - 6rem));
      overflow-y: auto;
      padding: var(--space-3);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      background: rgba(255, 255, 255, 0.96);
      backdrop-filter: blur(16px);
      box-shadow: var(--shadow-floating);
      animation: context-open var(--duration-fast) var(--ease-standard);
    }
    .popover-heading {
      display: grid;
      gap: 2px;
      padding: var(--space-2) var(--space-3) var(--space-3);
    }
    .popover-heading span, .section-heading {
      font-size: 0.6875rem;
      font-weight: 750;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: var(--color-text-muted);
    }
    .popover-heading strong {
      font-size: 0.9375rem;
      font-weight: 750;
      color: var(--color-text);
    }
    .section-heading {
      padding: var(--space-2) var(--space-3);
      border-top: 1px solid var(--color-border);
    }
    .options {
      display: grid;
      gap: 3px;
    }
    .options button, .change-organization {
      width: 100%;
      min-height: var(--control-height-small);
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-2) var(--space-3);
      border: 0;
      border-radius: var(--radius-sm);
      color: var(--color-text-secondary);
      background: transparent;
      text-align: left;
      font-size: 0.835rem;
      font-weight: 550;
      cursor: pointer;
      transition: color var(--duration-fast), background var(--duration-fast);
    }
    .options button:hover, .change-organization:hover {
      color: var(--color-text);
      background: var(--color-surface-soft);
    }
    .options button.selected {
      color: var(--color-primary);
      background: var(--color-primary-subtle);
      font-weight: 700;
    }
    .option-point {
      width: 0.5rem;
      height: 0.5rem;
      flex: 0 0 auto;
      border: 1px solid var(--color-accent);
      border-radius: 50%;
    }
    .selected .option-point {
      border-color: var(--color-primary);
      background: var(--color-primary);
      box-shadow: 0 0 0 2px rgba(18, 84, 52, 0.2);
    }
    .check, .change-organization span {
      margin-left: auto;
      font-weight: 750;
    }
    .options p {
      margin: var(--space-2) var(--space-3);
      font-size: 0.8125rem;
      color: var(--color-text-muted);
    }
    .change-organization {
      margin-top: var(--space-2);
      border-top: 1px solid var(--color-border);
      border-radius: 0;
      color: var(--color-primary);
      font-weight: 680;
    }
    .organization-options {
      padding-top: var(--space-1);
    }
    @keyframes context-open {
      from { opacity: 0; transform: translateY(-4px) scale(0.98); }
    }
    @media(max-width: 35rem) {
      .path strong { max-width: 7rem; }
      .path em { max-width: 8rem; }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContextNavigatorComponent {
  readonly id = `gr-context-popover-${nextContextNavigatorId++}`;
  @Input() organizations: OrganizationOption[] = [];
  @Input() farms: FarmOption[] = [];
  @Input() organization: OrganizationOption | null = null;
  @Input() farm: FarmOption | null = null;
  @Input() disabled = false;
  @Output() organizationChanged = new EventEmitter<string>();
  @Output() farmChanged = new EventEmitter<string>();
  @ViewChild('trigger') trigger?: ElementRef<HTMLButtonElement>;
  readonly open = signal(false);
  readonly organizationsOpen = signal(false);

  constructor(private readonly host: ElementRef<HTMLElement>) {}

  toggle(): void {
    this.open.update(value => !value);
    if (!this.open()) this.organizationsOpen.set(false);
  }
  chooseFarm(id: string): void {
    if (id !== this.farm?.farmId) this.farmChanged.emit(id);
    this.close(true);
  }
  chooseOrganization(id: string): void {
    if (id !== this.organization?.organizationId) this.organizationChanged.emit(id);
    this.close(true);
  }
  close(returnFocus = false): void {
    if (!this.open()) return;
    this.open.set(false);
    this.organizationsOpen.set(false);
    if (returnFocus) this.trigger?.nativeElement.focus();
  }
  @HostListener('document:keydown.escape') onEscape(): void { this.close(true); }
  @HostListener('document:click', ['$event']) onOutsideClick(event: MouseEvent): void {
    if (!this.host.nativeElement.contains(event.target as Node)) this.close();
  }
}

let nextContextNavigatorId = 1;
