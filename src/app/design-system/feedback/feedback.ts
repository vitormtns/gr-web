import { ChangeDetectionStrategy, Component, EventEmitter, Injectable, Input, Output, signal } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';

export type FeedbackTone = 'success'|'info'|'warning'|'error';
export interface Toast { id:number; tone:FeedbackTone; title:string; message?:string }

@Injectable({providedIn:'root'})
export class ToastService {
  private sequence=0;
  readonly toasts=signal<Toast[]>([]);
  show(tone:FeedbackTone,title:string,message?:string,duration=4500):void{
    const toast={id:++this.sequence,tone,title,message};
    this.toasts.update(items=>[...items,toast]);
    if(duration>0)setTimeout(()=>this.dismiss(toast.id),duration);
  }
  dismiss(id:number):void{this.toasts.update(items=>items.filter(item=>item.id!==id));}
}

@Component({ selector:'gr-toast-region', imports:[LucideDynamicIcon], template:`<section class="region" aria-label="Notificações" aria-live="polite">@for(toast of service.toasts();track toast.id){<article [class]="toast.tone"><span class="marker"></span><div><strong>{{toast.title}}</strong>@if(toast.message){<p>{{toast.message}}</p>}</div><button type="button" aria-label="Fechar notificação" (click)="service.dismiss(toast.id)"><svg lucideIcon="x" [attr.width]="16" [attr.height]="16"></svg></button></article>}</section>`, styles:[`.region{position:fixed;z-index:80;right:var(--space-5);bottom:var(--space-5);display:grid;gap:var(--space-2);width:min(23rem,calc(100vw - 2rem))}article{display:grid;grid-template-columns:4px 1fr auto;gap:var(--space-3);padding:var(--space-3);border:1px solid var(--color-border);border-radius:var(--radius-md);background:var(--color-surface-elevated);box-shadow:var(--shadow-floating);animation:toast-in var(--duration-standard) var(--ease-emphasized)}.marker{border-radius:4px;background:var(--color-info)}.success .marker{background:var(--color-success)}.warning .marker{background:var(--color-warning)}.error .marker{background:var(--color-danger)}strong{display:block;font-size:.8125rem}p{margin:2px 0 0;font-size:.75rem}button{align-self:start;display:grid;place-items:center;padding:4px;border:0;background:transparent;color:var(--color-text-muted);cursor:pointer}@keyframes toast-in{from{opacity:0;transform:translateY(8px)}}`], changeDetection:ChangeDetectionStrategy.OnPush })
export class ToastRegionComponent { constructor(readonly service:ToastService){} }

@Component({ selector:'gr-alert', template:`<div [class]="tone" role="status"><strong>{{title}}</strong><div><ng-content /></div></div>`, styles:[`:host{display:block}div{padding:var(--space-3) var(--space-4);border:1px solid color-mix(in srgb,var(--color-info) 22%,var(--color-border));border-radius:var(--radius-md);background:var(--color-info-subtle);color:var(--color-info)}strong{display:block;margin-bottom:2px}.success{color:var(--color-success);background:var(--color-success-subtle)}.warning{color:var(--color-warning);background:var(--color-warning-subtle)}.error{color:var(--color-danger);background:var(--color-danger-subtle)}:host ::ng-deep p{margin:0;color:inherit;font-size:.8125rem}`], changeDetection:ChangeDetectionStrategy.OnPush })
export class AlertComponent { @Input() tone:FeedbackTone='info';@Input({required:true}) title=''; }

@Component({ selector:'gr-skeleton', template:'', styles:[`:host{position:relative;display:block;width:100%;height:1rem;overflow:hidden;border-radius:var(--radius-sm);background:var(--color-surface-soft)}:host:after{content:'';position:absolute;inset:0;transform:translateX(-100%);background:linear-gradient(90deg,transparent,rgb(255 255 255 / 70%),transparent);animation:shimmer 1.4s infinite}`], changeDetection:ChangeDetectionStrategy.OnPush })
export class SkeletonComponent {}

@Component({ selector:'gr-progress', template:`<div class="track" role="progressbar" [attr.aria-label]="label" [attr.aria-valuenow]="value" aria-valuemin="0" aria-valuemax="100"><span [style.width.%]="value"></span></div>`, styles:[`.track{height:.375rem;overflow:hidden;border-radius:999px;background:var(--color-surface-soft)}span{display:block;height:100%;border-radius:inherit;background:var(--color-primary);transition:width var(--duration-standard)}`], changeDetection:ChangeDetectionStrategy.OnPush })
export class ProgressComponent { @Input() value=0;@Input() label='Progresso'; }

@Component({ selector:'gr-empty-state', template:`<section><span class="territory" aria-hidden="true"></span><h2>{{title}}</h2><p>{{description}}</p><div><ng-content /></div></section>`, styles:[`section{min-height:14rem;display:grid;place-items:center;align-content:center;padding:var(--space-8);text-align:center}.territory{width:3.5rem;height:2.25rem;margin-bottom:var(--space-4);border:1px solid var(--color-border-strong);border-radius:54% 46% 62% 38% / 42% 58% 42% 58%;transform:rotate(-8deg);background:radial-gradient(circle at 58% 42%,var(--color-primary) 0 2px,transparent 3px),repeating-radial-gradient(ellipse at 60% 40%,transparent 0 6px,var(--color-border) 7px 8px)}h2{margin:0 0 var(--space-2)}p{max-width:28rem;margin:0 0 var(--space-5)}`], changeDetection:ChangeDetectionStrategy.OnPush })
export class EmptyStateComponent { @Input() title='Nada por aqui';@Input() description='Não há informações disponíveis neste momento.'; }

@Component({ selector:'gr-error-state', template:`<section [class.page]="level==='page'" role="alert"><span aria-hidden="true">!</span><div><h2>{{title}}</h2><p>{{description}}</p>@if(reference){<small>Referência: {{reference}}</small>}</div>@if(retryable){<button type="button" (click)="retry.emit()">Tentar novamente</button>}</section>`, styles:[`section{display:flex;align-items:flex-start;gap:var(--space-3);padding:var(--space-4);border:1px solid color-mix(in srgb,var(--color-danger) 20%,var(--color-border));border-radius:var(--radius-md);background:var(--color-danger-subtle)}section.page{min-height:18rem;align-items:center;justify-content:center;background:transparent;border-style:dashed}section>span{width:1.5rem;height:1.5rem;display:grid;place-items:center;flex:0 0 auto;border-radius:50%;color:#fff;background:var(--color-danger);font-weight:700}h2{margin:0;font-size:.875rem}p{margin:2px 0;color:var(--color-text-secondary)}small{color:var(--color-text-muted)}button{margin-left:auto;padding:var(--space-2) var(--space-3);border:1px solid var(--color-border-strong);border-radius:var(--radius-sm);background:var(--color-surface);cursor:pointer}`], changeDetection:ChangeDetectionStrategy.OnPush })
export class ErrorStateComponent { @Input() level:'inline'|'section'|'page'='section';@Input() title='Não foi possível carregar';@Input() description='Tente novamente em instantes.';@Input() reference='';@Input() retryable=true;@Output() retry=new EventEmitter<void>(); }
