import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Directive, ElementRef, EventEmitter, forwardRef, HostBinding, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

const fieldStyles = `:host{display:grid;gap:var(--space-2)}label{font-size:.8125rem;font-weight:620;color:var(--color-text)}label span{color:var(--color-danger)}input,textarea,select{width:100%;min-height:2.625rem;padding:0 var(--space-3);border:1px solid var(--color-border-strong);border-radius:var(--radius-md);color:var(--color-text);background:var(--color-surface);transition:border-color var(--duration-fast),box-shadow var(--duration-fast)}textarea{min-height:6rem;padding-top:var(--space-3);resize:vertical}input:hover,textarea:hover,select:hover{border-color:color-mix(in srgb,var(--color-border-strong) 55%,var(--color-text))}input:focus,textarea:focus,select:focus{outline:0;border-color:var(--color-focus);box-shadow:0 0 0 3px color-mix(in srgb,var(--color-focus) 14%,transparent)}input[aria-invalid="true"],textarea[aria-invalid="true"],select[aria-invalid="true"]{border-color:var(--color-danger)}input:disabled,textarea:disabled,select:disabled{color:var(--color-text-muted);background:var(--color-surface-soft);cursor:not-allowed}.helper,.error{margin:calc(var(--space-1) * -1) 0 0;font-size:.75rem}.helper{color:var(--color-text-muted)}.error{color:var(--color-danger)}`;
const checkStyles = `label{position:relative;display:inline-flex;align-items:center;gap:var(--space-2);cursor:pointer}input{position:absolute;opacity:0;width:1px;height:1px}.box,.radio{width:1.125rem;height:1.125rem;display:grid;place-items:center;border:1px solid var(--color-border-strong);background:var(--color-surface);transition:background var(--duration-fast),border-color var(--duration-fast)}.box{border-radius:4px}.radio{border-radius:50%}input:checked+.box,input:checked+.radio{border-color:var(--color-primary);background:var(--color-primary)}input:checked+.box:after{content:'✓';font-size:.75rem;font-weight:700;color:#fff}input:checked+.radio:after{content:'';width:.375rem;height:.375rem;border-radius:50%;background:#fff}input:focus-visible+.box,input:focus-visible+.radio{outline:2px solid var(--color-focus);outline-offset:2px}input:disabled~*{opacity:.55;cursor:not-allowed}`;

@Component({
  selector: 'gr-button',
  imports: [CommonModule],
  template: `<button class="gr-button" [class]="'gr-button ' + variant" [attr.type]="type" [disabled]="disabled || loading" (click)="pressed.emit()">
    @if (loading) { <span class="spinner" aria-hidden="true"></span> }
    <span [class.sr-only]="loading"><ng-content /></span>
    @if (loading) { <span class="sr-only">Carregando</span> }
  </button>`,
  styles: [`
    :host { display: inline-flex; }
    .gr-button { min-height: 2.5rem; display:inline-flex; align-items:center; justify-content:center; gap:var(--space-2); padding:0 var(--space-4); border:1px solid transparent; border-radius:var(--radius-md); font-weight:620; color:var(--color-text); background:transparent; cursor:pointer; transition:background var(--duration-fast), border-color var(--duration-fast), transform var(--duration-fast); }
    .gr-button:active:not(:disabled) { transform:translateY(1px); }
    .gr-button:disabled { opacity:.55; cursor:not-allowed; }
    .primary { color:#fff; background:var(--color-primary); } .primary:hover:not(:disabled) { background:var(--color-primary-hover); }
    .secondary { background:var(--color-surface); border-color:var(--color-border-strong); } .secondary:hover:not(:disabled), .ghost:hover:not(:disabled) { background:var(--color-surface-soft); }
    .ghost { color:var(--color-text-secondary); }
    .danger { color:var(--color-danger); background:var(--color-danger-subtle); } .danger:hover:not(:disabled) { border-color:color-mix(in srgb, var(--color-danger) 35%, transparent); }
    .spinner { width:1rem; height:1rem; border:2px solid currentColor; border-right-color:transparent; border-radius:50%; animation:spin .7s linear infinite; }
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
  styles: [`:host{display:inline-flex}button{width:2.5rem;height:2.5rem;display:grid;place-items:center;padding:0;border:1px solid transparent;border-radius:var(--radius-md);color:var(--color-text-secondary);background:transparent;cursor:pointer;transition:background var(--duration-fast),color var(--duration-fast)}button:hover:not(:disabled){color:var(--color-text);background:var(--color-surface-soft)}button:disabled{opacity:.5;cursor:not-allowed}`],
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
    <input [id]="id" [type]="type" [value]="value" [placeholder]="placeholder" [required]="required" [disabled]="disabled" [attr.aria-invalid]="!!error" [attr.aria-describedby]="describedBy" (input)="update($event)" (blur)="onTouched()" />
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
  @Input() required = false;
  get describedBy(): string | null { return [this.description && `${this.id}-help`, this.error && `${this.id}-error`].filter(Boolean).join(' ') || null; }
  update(event: Event): void { this.value = (event.target as HTMLInputElement).value; this.onChange(this.value); }
}

@Component({
  selector: 'gr-textarea',
  template: `<label [attr.for]="id">{{label}} @if(required){<span aria-hidden="true">*</span>}</label><textarea [id]="id" [value]="value" [placeholder]="placeholder" [required]="required" [disabled]="disabled" [attr.aria-invalid]="!!error" [attr.aria-describedby]="error?id+'-error':null" (input)="update($event)" (blur)="onTouched()"></textarea>@if(error){<p class="error" [id]="id+'-error'" role="alert">{{error}}</p>}`,
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
  update(event: Event): void { this.value = (event.target as HTMLTextAreaElement).value; this.onChange(this.value); }
}

export interface SelectOption { value: string; label: string }
@Component({
  selector: 'gr-select',
  imports: [CommonModule],
  template: `<label [attr.for]="id">{{label}}</label><select [id]="id" [value]="value" [disabled]="disabled" [attr.aria-invalid]="!!error" [attr.aria-describedby]="error?id+'-error':null" (change)="update($event)" (blur)="onTouched()"><option value="" disabled>{{placeholder}}</option>@for(option of options;track option.value){<option [value]="option.value">{{option.label}}</option>}</select>@if(error){<p class="error" [id]="id+'-error'" role="alert">{{error}}</p>}`,
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
  update(event: Event): void { this.value = (event.target as HTMLSelectElement).value; this.onChange(this.value); }
}

@Component({
  selector: 'gr-checkbox',
  template: `<label><input type="checkbox" [checked]="value" [disabled]="disabled" (change)="update($event)" (blur)="onTouched()"/><span class="box" aria-hidden="true"></span><span><ng-content /></span></label>`,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => CheckboxComponent), multi: true }],
  styles: [checkStyles],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckboxComponent extends ValueAccessor<boolean> { update(event: Event): void { this.value = (event.target as HTMLInputElement).checked; this.onChange(this.value); } }

@Component({
  selector: 'gr-radio',
  template: `<label><input type="radio" [name]="name" [value]="optionValue" [checked]="value===optionValue" [disabled]="disabled" (change)="choose()" (blur)="onTouched()"/><span class="radio" aria-hidden="true"></span><span><ng-content /></span></label>`,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => RadioComponent), multi: true }],
  styles: [checkStyles],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RadioComponent extends ValueAccessor<string> { @Input() name = 'choice'; @Input({required:true}) optionValue=''; choose():void{this.value=this.optionValue;this.onChange(this.value);} }

@Component({
  selector: 'gr-switch',
  template: `<label><button type="button" role="switch" [attr.aria-checked]="value" [disabled]="disabled" (click)="toggle()"><span></span></button><ng-content /></label>`,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => SwitchComponent), multi: true }],
  styles: [`label{display:inline-flex;align-items:center;gap:var(--space-3);cursor:pointer}button{width:2.25rem;height:1.25rem;padding:2px;border:0;border-radius:999px;background:var(--color-border-strong);cursor:pointer;transition:background var(--duration-fast)}button span{display:block;width:1rem;height:1rem;border-radius:50%;background:#fff;transition:transform var(--duration-fast)}button[aria-checked="true"]{background:var(--color-primary)}button[aria-checked="true"] span{transform:translateX(1rem)}button:disabled{opacity:.5}`],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SwitchComponent extends ValueAccessor<boolean> { toggle():void{if(this.disabled)return;this.value=!this.value;this.onChange(this.value);this.onTouched();} }

@Component({ selector:'gr-badge', template:'<span [class]="tone"><ng-content /></span>', styles:[`span{display:inline-flex;align-items:center;min-height:1.5rem;padding:0 var(--space-2);border-radius:999px;font-size:.75rem;font-weight:650;background:var(--color-surface-soft);color:var(--color-text-secondary)}.success{background:var(--color-success-subtle);color:var(--color-success)}.warning{background:var(--color-warning-subtle);color:var(--color-warning)}.danger{background:var(--color-danger-subtle);color:var(--color-danger)}.info{background:var(--color-info-subtle);color:var(--color-info)}`], changeDetection:ChangeDetectionStrategy.OnPush })
export class BadgeComponent { @Input() tone:'neutral'|'success'|'warning'|'danger'|'info'='neutral'; }

@Component({ selector:'gr-chip', template:'<span><ng-content />@if(removable){<button type="button" aria-label="Remover" (click)="removed.emit()">×</button>}</span>', styles:[`span{display:inline-flex;align-items:center;gap:var(--space-1);min-height:1.75rem;padding:0 var(--space-2);border:1px solid var(--color-border);border-radius:999px;background:var(--color-surface);color:var(--color-text-secondary)}button{border:0;background:transparent;color:inherit;cursor:pointer}`], changeDetection:ChangeDetectionStrategy.OnPush })
export class ChipComponent { @Input() removable=false; @Output() removed=new EventEmitter<void>(); }

@Component({ selector:'gr-divider', template:'', styles:[`:host{display:block;height:1px;background:var(--color-border)}`], changeDetection:ChangeDetectionStrategy.OnPush })
export class DividerComponent {}

@Directive({ selector:'[grTooltip]' })
export class TooltipDirective {
  @Input({required:true}) grTooltip='';
  @HostBinding('attr.title') get title():string{return this.grTooltip;}
  @HostBinding('attr.aria-label') get ariaLabel():string|null{return this.element.nativeElement.getAttribute('aria-label')??this.grTooltip;}
  constructor(private readonly element:ElementRef<HTMLElement>){}
}

let nextId = 1;
