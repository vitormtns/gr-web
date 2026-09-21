import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, EventEmitter, HostListener, Input, OnChanges, Output, SimpleChanges, ViewChild } from '@angular/core';

@Component({
  selector: 'gr-card',
  template: '<ng-content />',
  styles: [`
    :host {
      display: block;
      position: relative;
      padding: var(--space-5);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-xl);
      background: var(--color-surface);
      box-shadow: var(--shadow-raised);
      transition: box-shadow var(--duration-standard) var(--ease-standard),
                  border-color var(--duration-standard) var(--ease-standard),
                  transform var(--duration-standard) var(--ease-standard);
    }
    :host:hover {
      box-shadow: var(--shadow-card-hover);
      border-color: var(--color-border-strong);
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardComponent {}

@Component({
  selector: 'gr-panel',
  template: '<header><div><ng-content select="[panel-title]" /></div><ng-content select="[panel-actions]" /></header><div class="content"><ng-content /></div>',
  styles: [`
    :host {
      display: block;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-xl);
      background: var(--color-surface);
      box-shadow: var(--shadow-raised);
      overflow: hidden;
      transition: box-shadow var(--duration-standard) var(--ease-standard);
    }
    header {
      min-height: 3.65rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-4);
      padding: 0 var(--space-6);
      border-bottom: 1px solid var(--color-border);
      background: linear-gradient(180deg, #ffffff 0%, var(--color-surface-soft) 100%);
      font-weight: 700;
      letter-spacing: -0.015em;
    }
    .content {
      padding: var(--space-6);
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelComponent {}

@Component({
  selector: 'gr-popover',
  template: `<details #details><summary #summary [attr.aria-label]="label"><ng-content select="[popover-trigger]" /></summary><div class="popover" (click)="close()"><ng-content /></div></details>`,
  styles: [`
    :host {
      position: relative;
      display: inline-flex;
    }
    details {
      position: relative;
    }
    summary {
      list-style: none;
      cursor: pointer;
    }
    summary::-webkit-details-marker {
      display: none;
    }
    .popover {
      position: absolute;
      z-index: 30;
      top: calc(100% + var(--space-2));
      right: 0;
      min-width: 14.5rem;
      padding: var(--space-3);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      background: rgba(255, 255, 255, 0.96);
      backdrop-filter: blur(16px);
      box-shadow: var(--shadow-floating);
      animation: surface-in var(--duration-fast) var(--ease-standard);
    }
    @keyframes surface-in {
      from {
        opacity: 0;
        transform: translateY(-4px) scale(0.98);
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PopoverComponent {
  @Input() label = 'Mais ações';
  @ViewChild('details') details?: ElementRef<HTMLDetailsElement>;
  @ViewChild('summary') summary?: ElementRef<HTMLElement>;
  constructor(private readonly host: ElementRef<HTMLElement>) {}
  close(): void {
    if (this.details?.nativeElement.open) this.details.nativeElement.open = false;
  }
  @HostListener('document:keydown.escape') onEscape(): void {
    if (this.details?.nativeElement.open) {
      this.close();
      this.summary?.nativeElement.focus();
    }
  }
  @HostListener('document:click', ['$event']) onOutsideClick(event: MouseEvent): void {
    if (!this.host.nativeElement.contains(event.target as Node)) this.close();
  }
}

@Component({
  selector: 'gr-menu',
  template: `<div><ng-content /></div>`,
  styles: [`
    :host {
      display: block;
      min-width: 12.5rem;
    }
    div {
      display: grid;
      gap: 3px;
    }
    :host ::ng-deep button {
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
      font-size: 0.875rem;
      font-weight: 520;
      cursor: pointer;
      transition: color var(--duration-fast), background var(--duration-fast);
    }
    :host ::ng-deep button:hover:not(:disabled) {
      color: var(--color-text);
      background: var(--color-surface-soft);
    }
    :host ::ng-deep button:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuComponent {}

@Component({
  selector: 'gr-dialog',
  template: `<dialog #dialog (cancel)="requestClose($event)"><header><div><ng-content select="[dialog-title]" /></div><button type="button" aria-label="Fechar janela" (click)="closed.emit()">×</button></header><div class="body"><ng-content /></div><footer><ng-content select="[dialog-actions]" /></footer></dialog>`,
  styles: [`
    dialog {
      width: min(34rem, calc(100vw - 2rem));
      padding: 0;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-xl);
      color: var(--color-text);
      background: var(--color-surface);
      box-shadow: var(--shadow-floating);
      animation: dialog-in var(--duration-standard) var(--ease-emphasized);
    }
    dialog::backdrop {
      background: rgba(11, 25, 16, 0.48);
      backdrop-filter: blur(8px);
      animation: fade-in var(--duration-standard);
    }
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-4);
      padding: var(--space-5) var(--space-6);
      border-bottom: 1px solid var(--color-border);
      background: linear-gradient(180deg, #ffffff 0%, var(--color-surface-soft) 100%);
      font-weight: 750;
      letter-spacing: -0.015em;
    }
    header button {
      width: 2rem;
      height: 2rem;
      display: grid;
      place-items: center;
      border: 0;
      border-radius: var(--radius-sm);
      background: transparent;
      color: var(--color-text-muted);
      font-size: 1.35rem;
      line-height: 1;
      cursor: pointer;
      transition: background var(--duration-fast), color var(--duration-fast);
    }
    header button:hover {
      color: var(--color-text);
      background: rgba(0, 0, 0, 0.05);
    }
    .body {
      padding: var(--space-6);
    }
    footer {
      display: flex;
      justify-content: flex-end;
      gap: var(--space-2);
      padding: 0 var(--space-6) var(--space-6);
    }
    @keyframes fade-in { from { opacity: 0; } }
    @keyframes dialog-in { from { opacity: 0; transform: scale(0.96) translateY(8px); } }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogComponent implements AfterViewInit, OnChanges {
  @Input() open = false;
  @Output() closed = new EventEmitter<void>();
  @ViewChild('dialog') dialog?: ElementRef<HTMLDialogElement>;
  ngAfterViewInit(): void { this.sync(); }
  ngOnChanges(_: SimpleChanges): void { this.sync(); }
  requestClose(event: Event): void {
    event.preventDefault();
    this.closed.emit();
  }
  private sync(): void {
    const node = this.dialog?.nativeElement;
    if (!node) return;
    if (this.open && !node.open) node.showModal();
    if (!this.open && node.open) node.close();
  }
}

@Component({
  selector: 'gr-drawer',
  template: `<dialog #drawer [attr.aria-label]="label" (cancel)="requestClose($event)" (click)="backdropClick($event)"><header><strong>{{label}}</strong><button type="button" aria-label="Fechar painel" (click)="closed.emit()">×</button></header><div class="body"><ng-content /></div></dialog>`,
  styles: [`
    dialog {
      position: fixed;
      inset: 0 0 0 auto;
      width: min(26rem, 92vw);
      height: 100dvh;
      max-height: none;
      margin: 0;
      padding: 0;
      border: 0;
      border-left: 1px solid var(--color-border);
      color: var(--color-text);
      background: var(--color-surface);
      box-shadow: var(--shadow-floating);
      animation: drawer-in var(--duration-context) var(--ease-emphasized);
    }
    dialog::backdrop {
      background: rgba(11, 25, 16, 0.4);
      backdrop-filter: blur(6px);
    }
    header {
      height: 4.25rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 var(--space-6);
      border-bottom: 1px solid var(--color-border);
      background: linear-gradient(180deg, #ffffff 0%, var(--color-surface-soft) 100%);
      font-weight: 750;
    }
    button {
      width: 2rem;
      height: 2rem;
      display: grid;
      place-items: center;
      border: 0;
      border-radius: var(--radius-sm);
      background: transparent;
      color: var(--color-text-muted);
      font-size: 1.35rem;
      line-height: 1;
      cursor: pointer;
      transition: background var(--duration-fast), color var(--duration-fast);
    }
    button:hover {
      color: var(--color-text);
      background: rgba(0, 0, 0, 0.05);
    }
    .body {
      padding: var(--space-6);
      overflow-y: auto;
      height: calc(100dvh - 4.25rem);
    }
    @keyframes drawer-in { from { transform: translateX(100%); } }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DrawerComponent implements AfterViewInit, OnChanges {
  @Input() open = false;
  @Input() label = 'Painel';
  @Output() closed = new EventEmitter<void>();
  @ViewChild('drawer') drawer?: ElementRef<HTMLDialogElement>;
  ngAfterViewInit(): void { this.sync(); }
  ngOnChanges(_: SimpleChanges): void { this.sync(); }
  requestClose(event: Event): void { event.preventDefault(); this.closed.emit(); }
  backdropClick(event: MouseEvent): void { if (event.target === this.drawer?.nativeElement) this.closed.emit(); }
  private sync(): void {
    const node = this.drawer?.nativeElement;
    if (!node) return;
    if (this.open && !node.open) node.showModal();
    if (!this.open && node.open) node.close();
  }
}
