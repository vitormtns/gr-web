import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, EventEmitter, HostListener, Input, OnChanges, Output, SimpleChanges, ViewChild } from '@angular/core';

@Component({ selector:'gr-card', template:'<ng-content />', styles:[`:host{display:block;padding:var(--space-5);border:1px solid var(--color-border);border-radius:var(--radius-lg);background:var(--color-surface)}`], changeDetection:ChangeDetectionStrategy.OnPush })
export class CardComponent {}

@Component({ selector:'gr-panel', template:'<header><div><ng-content select="[panel-title]" /></div><ng-content select="[panel-actions]" /></header><div class="content"><ng-content /></div>', styles:[`:host{display:block;border:1px solid var(--color-border);border-radius:var(--radius-lg);background:var(--color-surface)}header{min-height:3.5rem;display:flex;align-items:center;justify-content:space-between;gap:var(--space-4);padding:0 var(--space-5);border-bottom:1px solid var(--color-border);font-weight:650}.content{padding:var(--space-5)}`], changeDetection:ChangeDetectionStrategy.OnPush })
export class PanelComponent {}

@Component({ selector:'gr-popover', template:`<details #details><summary #summary [attr.aria-label]="label"><ng-content select="[popover-trigger]" /></summary><div class="popover" (click)="close()"><ng-content /></div></details>`, styles:[`:host{position:relative;display:inline-flex}details{position:relative}summary{list-style:none;cursor:pointer}summary::-webkit-details-marker{display:none}.popover{position:absolute;z-index:30;top:calc(100% + var(--space-2));right:0;min-width:14rem;padding:var(--space-3);border:1px solid var(--color-border);border-radius:var(--radius-md);background:var(--color-surface-elevated);box-shadow:var(--shadow-floating);animation:surface-in var(--duration-fast) var(--ease-standard)}@keyframes surface-in{from{opacity:0;transform:translateY(-3px)}}`], changeDetection:ChangeDetectionStrategy.OnPush })
export class PopoverComponent {
  @Input() label='Mais ações';@ViewChild('details') details?:ElementRef<HTMLDetailsElement>;@ViewChild('summary') summary?:ElementRef<HTMLElement>;
  constructor(private readonly host:ElementRef<HTMLElement>){}
  close():void{if(this.details?.nativeElement.open)this.details.nativeElement.open=false;}
  @HostListener('document:keydown.escape') onEscape():void{if(this.details?.nativeElement.open){this.close();this.summary?.nativeElement.focus();}}
  @HostListener('document:click',['$event']) onOutsideClick(event:MouseEvent):void{
    if(!this.host.nativeElement.contains(event.target as Node))this.close();
  }
}

@Component({ selector:'gr-menu', template:`<div><ng-content /></div>`, styles:[`:host{display:block;min-width:12rem}div{display:grid;gap:2px}:host ::ng-deep button{width:100%;min-height:var(--control-height-small);display:flex;align-items:center;gap:var(--space-2);padding:var(--space-2) var(--space-3);border:0;border-radius:var(--radius-sm);color:var(--color-text-secondary);background:transparent;text-align:left;font-size:.875rem;cursor:pointer}:host ::ng-deep button:hover:not(:disabled){color:var(--color-text);background:var(--color-surface-soft)}:host ::ng-deep button:disabled{opacity:.55;cursor:not-allowed}`], changeDetection:ChangeDetectionStrategy.OnPush })
export class MenuComponent {}

@Component({
  selector:'gr-dialog',
  template:`<dialog #dialog (cancel)="requestClose($event)"><header><div><ng-content select="[dialog-title]" /></div><button type="button" aria-label="Fechar janela" (click)="closed.emit()">×</button></header><div class="body"><ng-content /></div><footer><ng-content select="[dialog-actions]" /></footer></dialog>`,
  styles:[`dialog{width:min(32rem,calc(100vw - 2rem));padding:0;border:1px solid var(--color-border);border-radius:var(--radius-lg);color:var(--color-text);background:var(--color-surface);box-shadow:var(--shadow-floating)}dialog::backdrop{background:rgb(18 27 22 / 45%);animation:fade-in var(--duration-standard)}header{display:flex;align-items:center;justify-content:space-between;gap:var(--space-4);padding:var(--space-4) var(--space-5);border-bottom:1px solid var(--color-border);font-weight:700}header button{border:0;background:transparent;font-size:1.25rem;cursor:pointer}.body{padding:var(--space-5)}footer{display:flex;justify-content:flex-end;gap:var(--space-2);padding:0 var(--space-5) var(--space-5)}@keyframes fade-in{from{opacity:0}}`],
  changeDetection:ChangeDetectionStrategy.OnPush,
})
export class DialogComponent implements AfterViewInit, OnChanges {
  @Input() open=false; @Output() closed=new EventEmitter<void>(); @ViewChild('dialog') dialog?:ElementRef<HTMLDialogElement>;
  ngAfterViewInit():void{this.sync();} ngOnChanges(_:SimpleChanges):void{this.sync();}
  requestClose(event:Event):void{event.preventDefault();this.closed.emit();}
  private sync():void{const node=this.dialog?.nativeElement;if(!node)return;if(this.open&&!node.open)node.showModal();if(!this.open&&node.open)node.close();}
}

@Component({ selector:'gr-drawer', template:`<dialog #drawer [attr.aria-label]="label" (cancel)="requestClose($event)" (click)="backdropClick($event)"><header><strong>{{label}}</strong><button type="button" aria-label="Fechar painel" (click)="closed.emit()">×</button></header><div class="body"><ng-content /></div></dialog>`, styles:[`dialog{position:fixed;inset:0 0 0 auto;width:min(24rem,90vw);height:100dvh;max-height:none;margin:0;padding:0;border:0;color:var(--color-text);background:var(--color-surface);box-shadow:var(--shadow-floating);animation:drawer-in var(--duration-context) var(--ease-emphasized)}dialog::backdrop{background:rgb(18 27 22 / 35%)}header{height:4rem;display:flex;align-items:center;justify-content:space-between;padding:0 var(--space-5);border-bottom:1px solid var(--color-border)}button{border:0;background:transparent;font-size:1.25rem;cursor:pointer}.body{padding:var(--space-5)}@keyframes drawer-in{from{transform:translateX(100%)}}`], changeDetection:ChangeDetectionStrategy.OnPush })
export class DrawerComponent implements AfterViewInit,OnChanges { @Input() open=false;@Input() label='Painel';@Output() closed=new EventEmitter<void>();@ViewChild('drawer')drawer?:ElementRef<HTMLDialogElement>;ngAfterViewInit():void{this.sync();}ngOnChanges(_:SimpleChanges):void{this.sync();}requestClose(event:Event):void{event.preventDefault();this.closed.emit();}backdropClick(event:MouseEvent):void{if(event.target===this.drawer?.nativeElement)this.closed.emit();}private sync():void{const node=this.drawer?.nativeElement;if(!node)return;if(this.open&&!node.open)node.showModal();if(!this.open&&node.open)node.close();} }
