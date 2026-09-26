import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Directive, ElementRef, EventEmitter, forwardRef, HostBinding, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

const fieldStyles = `
  :host { display: grid; gap: var(--space-2); }
  label { font-size: 0.8125rem; font-weight: 680; color: var(--color-text); }
  label span { color: var(--color-danger); }
  .field { position: relative; }
  input, textarea, select {
    width: 100%;
    min-height: var(--control-height);
    padding: 0 var(--space-3);
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-md);
    color: var(--color-text);
    background: var(--color-surface);
    box-shadow: var(--shadow-xs);
    font-size: 0.875rem;
    transition:
      border-color var(--duration-fast) var(--ease-standard),
      box-shadow var(--duration-fast) var(--ease-standard),
      background var(--duration-fast) var(--ease-standard);
  }
  input::placeholder, textarea::placeholder { color: var(--color-text-muted); }
  textarea { min-height: 6rem; padding-top: var(--space-3); resize: vertical; }
  input:hover:not(:disabled), textarea:hover:not(:disabled), select:hover:not(:disabled) {
    border-color: var(--color-focus);
  }
  input:focus, textarea:focus, select:focus {
    outline: 0;
    border-color: var(--color-focus);
    box-shadow: 0 0 0 3px rgba(40, 122, 85, 0.18), var(--shadow-xs);
  }
  input[aria-invalid="true"], textarea[aria-invalid="true"], select[aria-invalid="true"] {
    border-color: var(--color-danger);
  }
  input[aria-invalid="true"]:focus, textarea[aria-invalid="true"]:focus, select[aria-invalid="true"]:focus {
    box-shadow: 0 0 0 3px rgba(193, 60, 49, 0.18);
  }
  input:disabled, textarea:disabled, select:disabled {
    color: var(--color-text-muted);
    background: var(--color-surface-soft);
    cursor: not-allowed;
    box-shadow: none;
  }
  input:read-only, textarea:read-only { background: var(--color-surface-soft); }
  .helper, .error { margin: calc(var(--space-1) * -1) 0 0; font-size: 0.75rem; }
  .helper { color: var(--color-text-muted); }
  .error { color: var(--color-danger); font-weight: 600; }
  .field input { display: block; }
  .field input.has-reveal { padding-right: 3.5rem; }
  .reveal {
    position: absolute;
    right: var(--space-2);
    top: 50%;
    transform: translateY(-50%);
    min-width: var(--control-height-small);
    height: var(--control-height-small);
    padding: 0 var(--space-2);
    border: 0;
    border-radius: var(--radius-sm);
    color: var(--color-text-secondary);
    background: transparent;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
  }
  .reveal:hover { color: var(--color-text); background: var(--color-surface-soft); }
  select {
    appearance: none;
    padding-right: 2.5rem;
    background-image:
      linear-gradient(45deg, transparent 50%, var(--color-text-secondary) 50%),
      linear-gradient(135deg, var(--color-text-secondary) 50%, transparent 50%);
    background-position: calc(100% - 1.125rem) 51%, calc(100% - 0.8125rem) 51%;
    background-size: 5px 5px;
    background-repeat: no-repeat;
    cursor: pointer;
  }
  select:disabled { background-image: none; }
`;

const checkStyles = `
  label { position: relative; display: inline-flex; align-items: center; gap: var(--space-2); cursor: pointer; font-size: 0.875rem; }
  input { position: absolute; opacity: 0; width: 1px; height: 1px; }
  .box, .radio {
    width: 1.15rem;
    height: 1.15rem;
    display: grid;
    place-items: center;
    border: 1.5px solid var(--color-border-strong);
    background: var(--color-surface);
    box-shadow: var(--shadow-xs);
    transition: background var(--duration-fast), border-color var(--duration-fast), box-shadow var(--duration-fast);
  }
  .box { border-radius: 4px; }
  .radio { border-radius: 50%; }
  input:checked + .box, input:checked + .radio {
    border-color: var(--color-primary);
    background: var(--color-primary);
    box-shadow: 0 1px 3px rgba(18, 84, 52, 0.25);
  }
  input:checked + .box::after { content: '✓'; font-size: 0.75rem; font-weight: 800; color: #fff; }
  input:checked + .radio::after { content: ''; width: 0.375rem; height: 0.375rem; border-radius: 50%; background: #fff; }
  input:focus-visible + .box, input:focus-visible + .radio { outline: 2px solid var(--color-focus); outline-offset: 2px; }
  input:disabled ~ * { opacity: 0.55; cursor: not-allowed; }
`;

@Component({
  selector: 'gr-button',
  imports: [CommonModule],
  template: `<button class="gr-button" [class]="'gr-button ' + variant" [attr.type]="type" [disabled]="disabled || loading" (click)="pressed.emit()">
    @if (loading) { <span class="spinner" aria-hidden="true"></span> }
    <span class="label" [class.loading-label]="loading"><ng-content /></span>
    @if (loading) { <span class="sr-only">Carregando</span> }
  </button>`,
  styles: [`
    :host { display: inline-flex; }
    .gr-button {
      position: relative;
      min-height: var(--control-height);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-2);
      padding: 0 var(--space-4);
      border: 1px solid transparent;
      border-radius: var(--radius-md);
      font-size: 0.875rem;
      font-weight: 680;
      color: var(--color-text);
      background: transparent;
      cursor: pointer;
      box-shadow: var(--shadow-xs);
      transition:
        background var(--duration-fast) var(--ease-standard),
        border-color var(--duration-fast) var(--ease-standard),
        box-shadow var(--duration-fast) var(--ease-standard),
        transform var(--duration-fast) var(--ease-standard);
    }
    .gr-button:active:not(:disabled) { transform: translateY(1px); }
    .gr-button:disabled { opacity: 0.55; cursor: not-allowed; box-shadow: none; }
    .primary {
      color: #fff;
      background: var(--brand-primary);
      border-color: rgba(11, 25, 16, 0.2);
      box-shadow: 0 1px 3px rgba(11, 25, 16, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.2);
    }
    .primary:hover:not(:disabled) {
      background: var(--color-primary-hover);
      box-shadow: 0 2px 6px rgba(11, 25, 16, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.25);
    }
    .secondary {
      background: var(--color-surface);
      border-color: var(--color-border-strong);
      color: var(--color-text);
    }
    .secondary:hover:not(:disabled) {
      border-color: var(--color-focus);
      background: var(--color-surface-soft);
      box-shadow: var(--shadow-sm);
    }
    .ghost {
      color: var(--color-text-secondary);
      background: transparent;
      box-shadow: none;
    }
    .ghost:hover:not(:disabled) {
      color: var(--color-primary);
      background: var(--color-primary-subtle);
    }
    .danger {
      color: #fff;
      background: linear-gradient(180deg, #d3453a 0%, #ba3429 100%);
      border-color: rgba(193, 60, 49, 0.3);
      box-shadow: 0 1px 3px rgba(193, 60, 49, 0.25);
    }
    .danger:hover:not(:disabled) {
      background: linear-gradient(180deg, #dc4e43 0%, #c4392e 100%);
    }
    .gr-button:focus-visible { outline: 2px solid var(--color-focus); outline-offset: 2px; }
    .loading-label { visibility: hidden; }
    .spinner {
      position: absolute;
      width: 1.1rem;
      height: 1.1rem;
      border: 2px solid currentColor;
      border-right-color: transparent;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ButtonComponent {
  @Input() variant: ButtonVariant = 'primary';
  @Input() type: 'button' | 'submit' = 'button';
  @Input() disabled = false;
  @Input() loading = false;
  @Output() pressed = new EventEmitter<void>();
}

@Component({
  selector: 'gr-icon-button',
  template: `<button type="button" [attr.aria-label]="label" [disabled]="disabled" (click)="pressed.emit()"><ng-content /></button>`,
  styles: [`
    :host { display: inline-flex; }
    button {
      width: var(--control-height);
      height: var(--control-height);
      display: grid;
      place-items: center;
      padding: 0;
      border: 1px solid transparent;
      border-radius: var(--radius-md);
      color: var(--color-text-secondary);
      background: transparent;
      cursor: pointer;
      transition: background var(--duration-fast), color var(--duration-fast), border-color var(--duration-fast);
    }
    button:hover:not(:disabled) {
      color: var(--color-text);
      background: var(--color-surface-soft);
      border-color: var(--color-border);
    }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconButtonComponent {
  @Input({ required: true }) label = '';
  @Input() disabled = false;
  @Output() pressed = new EventEmitter<void>();
}

@Directive()
abstract class ValueAccessor<T> implements ControlValueAccessor {
  value!: T;
  disabled = false;
  protected onChange: (value: T) => void = () => undefined;
  protected onTouched: () => void = () => undefined;
  constructor(protected readonly cdr: ChangeDetectorRef) {}
  writeValue(value: T): void { this.value = value; this.cdr.markForCheck(); }
  registerOnChange(fn: (value: T) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(disabled: boolean): void { this.disabled = disabled; this.cdr.markForCheck(); }
}

@Component({
  selector: 'gr-input',
  template: `<label [attr.for]="id">{{ label }} @if(required){<span aria-hidden="true">*</span>}</label>
    @if (description) { <p class="helper" [id]="id + '-help'">{{ description }}</p> }
    <div class="field">
      <input
        [id]="id"
        [type]="type==='password'&&passwordVisible()?'text':type"
        [class.has-reveal]="type==='password'&&revealable"
        [value]="value"
        [placeholder]="placeholder"
        [required]="required"
        [disabled]="disabled"
        [readOnly]="readonly"
        [attr.aria-invalid]="!!error"
        [attr.aria-describedby]="describedBy"
        (input)="update($event)"
        (blur)="onTouched()"
      />
      @if(type==='password'&&revealable){
        <button class="reveal" type="button" [disabled]="disabled" [attr.aria-label]="passwordVisible()?'Ocultar senha':'Mostrar senha'" [attr.aria-pressed]="passwordVisible()" (click)="passwordVisible.set(!passwordVisible())">
          {{passwordVisible()?'Ocultar':'Mostrar'}}
        </button>
      }
    </div>
    @if (error) { <p class="error" [id]="id + '-error'" role="alert">{{ error }}</p> }`,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => InputComponent), multi: true }],
  styles: [fieldStyles],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InputComponent extends ValueAccessor<string> {
  @Input({ required: true }) label = '';
  @Input() id = `gr-input-${nextId++}`;
  @Input() description = '';
  @Input() error = '';
  @Input() placeholder = '';
  @Input() type: 'text' | 'email' | 'password' | 'search' = 'text';
  @Input() revealable = false;
  @Input() readonly = false;
  readonly passwordVisible = signal(false);
  @Input() required = false;
  get describedBy(): string | null {
    return [this.description && `${this.id}-help`, this.error && `${this.id}-error`].filter(Boolean).join(' ') || null;
  }
  update(event: Event): void {
    this.value = (event.target as HTMLInputElement).value;
    this.onChange(this.value);
  }
}

@Component({
  selector: 'gr-textarea',
  template: `<label [attr.for]="id">{{label}} @if(required){<span aria-hidden="true">*</span>}</label>
    <textarea [id]="id" [value]="value" [placeholder]="placeholder" [required]="required" [disabled]="disabled" [attr.aria-invalid]="!!error" [attr.aria-describedby]="error?id+'-error':null" (input)="update($event)" (blur)="onTouched()"></textarea>
    @if(error){<p class="error" [id]="id+'-error'" role="alert">{{error}}</p>}`,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => TextareaComponent), multi: true }],
  styles: [fieldStyles],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TextareaComponent extends ValueAccessor<string> {
  @Input({ required: true }) label = '';
  @Input() id = `gr-textarea-${nextId++}`;
  @Input() placeholder = '';
  @Input() error = '';
  @Input() required = false;
  update(event: Event): void {
    this.value = (event.target as HTMLTextAreaElement).value;
    this.onChange(this.value);
  }
}

export interface SelectOption { value: string; label: string }

@Component({
  selector: 'gr-select',
  imports: [CommonModule],
  template: `<label [attr.for]="id">{{label}}</label>
    <select [id]="id" [value]="value" [disabled]="disabled" [attr.aria-invalid]="!!error" [attr.aria-describedby]="error?id+'-error':null" (change)="update($event)" (blur)="onTouched()">
      <option value="" disabled>{{placeholder}}</option>
      @for(option of options; track option.value){
        <option [value]="option.value">{{option.label}}</option>
      }
    </select>
    @if(error){<p class="error" [id]="id+'-error'" role="alert">{{error}}</p>}`,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => SelectComponent), multi: true }],
  styles: [fieldStyles],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectComponent extends ValueAccessor<string> {
  @Input({ required: true }) label = '';
  @Input() id = `gr-select-${nextId++}`;
  @Input() options: SelectOption[] = [];
  @Input() placeholder = 'Selecione';
  @Input() error = '';
  update(event: Event): void {
    this.value = (event.target as HTMLSelectElement).value;
    this.onChange(this.value);
  }
}

@Component({
  selector: 'gr-checkbox',
  template: `<label>
    <input type="checkbox" [checked]="value" [disabled]="disabled" (change)="update($event)" (blur)="onTouched()"/>
    <span class="box" aria-hidden="true"></span>
    <span><ng-content /></span>
  </label>`,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => CheckboxComponent), multi: true }],
  styles: [checkStyles],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckboxComponent extends ValueAccessor<boolean> {
  update(event: Event): void {
    this.value = (event.target as HTMLInputElement).checked;
    this.onChange(this.value);
  }
}

@Component({
  selector: 'gr-radio',
  template: `<label>
    <input type="radio" [name]="name" [value]="optionValue" [checked]="value===optionValue" [disabled]="disabled" (change)="choose()" (blur)="onTouched()"/>
    <span class="radio" aria-hidden="true"></span>
    <span><ng-content /></span>
  </label>`,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => RadioComponent), multi: true }],
  styles: [checkStyles],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RadioComponent extends ValueAccessor<string> {
  @Input() name = 'choice';
  @Input({ required: true }) optionValue = '';
  choose(): void {
    this.value = this.optionValue;
    this.onChange(this.value);
  }
}

@Component({
  selector: 'gr-switch',
  template: `<label>
    <button type="button" role="switch" [attr.aria-checked]="value" [disabled]="disabled" (click)="toggle()">
      <span></span>
    </button>
    <ng-content />
  </label>`,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => SwitchComponent), multi: true }],
  styles: [`
    label { display: inline-flex; align-items: center; gap: var(--space-3); cursor: pointer; font-size: 0.875rem; font-weight: 550; }
    button {
      width: 2.35rem;
      height: 1.35rem;
      padding: 2px;
      border: 0;
      border-radius: 999px;
      background: var(--color-border-strong);
      cursor: pointer;
      box-shadow: inset 0 1px 2px rgba(11, 25, 16, 0.1);
      transition: background var(--duration-fast);
    }
    button span {
      display: block;
      width: 1.1rem;
      height: 1.1rem;
      border-radius: 50%;
      background: #fff;
      box-shadow: 0 1px 3px rgba(11, 25, 16, 0.2);
      transition: transform var(--duration-fast);
    }
    button[aria-checked="true"] { background: var(--color-primary); }
    button[aria-checked="true"] span { transform: translateX(1rem); }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SwitchComponent extends ValueAccessor<boolean> {
  toggle(): void {
    if (this.disabled) return;
    this.value = !this.value;
    this.onChange(this.value);
    this.onTouched();
  }
}

@Component({
  selector: 'gr-badge',
  template: '<span [class]="tone"><ng-content /></span>',
  styles: [`
    span {
      display: inline-flex;
      align-items: center;
      min-height: 1.5rem;
      padding: 0 var(--space-2);
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 680;
      letter-spacing: 0.02em;
      background: var(--color-surface-soft);
      color: var(--color-text-secondary);
      border: 1px solid var(--color-border);
    }
    .success, .active {
      background: var(--color-success-subtle);
      color: var(--color-success);
      border-color: rgba(21, 121, 69, 0.2);
    }
    .health {
      background: rgba(34, 197, 94, 0.12);
      color: #0d6b3f;
      border-color: rgba(34, 197, 94, 0.35);
    }
    .reproduction {
      background: #f1eaf7;
      color: #6d3f92;
      border-color: rgba(138, 88, 166, 0.3);
    }
    .warning, .attention {
      background: var(--color-warning-subtle);
      color: #925304;
      border-color: rgba(179, 102, 5, 0.2);
    }
    .danger {
      background: var(--color-danger-subtle);
      color: var(--color-danger);
      border-color: rgba(193, 60, 49, 0.2);
    }
    .info {
      background: var(--color-info-subtle);
      color: var(--color-info);
      border-color: rgba(42, 105, 136, 0.2);
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BadgeComponent {
  @Input() tone: 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'active' | 'attention' | 'health' | 'reproduction' = 'neutral';
}

@Component({
  selector: 'gr-chip',
  template: '<span><ng-content />@if(removable){<button type="button" aria-label="Remover filtro" (click)="removed.emit()">×</button>}</span>',
  styles: [`
    span {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1);
      min-height: var(--control-height-small);
      padding: 0 var(--space-3);
      border: 1px solid var(--color-border);
      border-radius: 999px;
      background: var(--color-surface);
      color: var(--color-text-secondary);
      font-size: 0.78rem;
      font-weight: 550;
      box-shadow: var(--shadow-xs);
    }
    button {
      min-width: 1.25rem;
      min-height: 1.25rem;
      display: grid;
      place-items: center;
      padding: 0;
      border: 0;
      border-radius: 50%;
      background: transparent;
      color: inherit;
      cursor: pointer;
      font-size: 1rem;
      line-height: 1;
      transition: background var(--duration-fast);
    }
    button:hover { background: var(--color-surface-soft); color: var(--color-text); }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChipComponent {
  @Input() removable = false;
  @Output() removed = new EventEmitter<void>();
}

@Component({
  selector: 'gr-divider',
  template: '',
  styles: [`:host { display: block; height: 1px; background: var(--color-border); }`],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DividerComponent {}

@Directive({ selector: '[grTooltip]' })
export class TooltipDirective {
  @Input({ required: true }) grTooltip = '';
  @HostBinding('attr.title') get title(): string { return this.grTooltip; }
  @HostBinding('attr.aria-label') get ariaLabel(): string | null {
    return this.element.nativeElement.getAttribute('aria-label') ?? this.grTooltip;
  }
  constructor(private readonly element: ElementRef<HTMLElement>) {}
}

let nextId = 1;
