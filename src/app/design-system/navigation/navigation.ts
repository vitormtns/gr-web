import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FarmOption, OrganizationOption } from '../../core/api/api.models';

export interface BreadcrumbItem { label:string; url?:string }
@Component({ selector:'gr-breadcrumb', imports:[RouterLink], template:`<nav aria-label="Navegação estrutural"><ol>@for(item of items;track item.label;let last=$last){<li>@if(item.url&&!last){<a [routerLink]="item.url">{{item.label}}</a>}@else{<span [attr.aria-current]="last?'page':null">{{item.label}}</span>}</li>}</ol></nav>`, styles:[`ol{display:flex;align-items:center;gap:var(--space-2);margin:0;padding:0;list-style:none;color:var(--color-text-muted);font-size:.8125rem}li+li:before{content:'/';margin-right:var(--space-2);color:var(--color-border-strong)}a{text-decoration:none}a:hover{color:var(--color-text)}`], changeDetection:ChangeDetectionStrategy.OnPush })
export class BreadcrumbComponent { @Input() items:BreadcrumbItem[]=[]; }

export interface TabItem { id:string; label:string }
@Component({ selector:'gr-tabs', template:`<div role="tablist" [attr.aria-label]="label">@for(tab of tabs;track tab.id;let index=$index){<button type="button" role="tab" [attr.aria-selected]="tab.id===active" [attr.tabindex]="tab.id===active?0:-1" (click)="activeChange.emit(tab.id)" (keydown)="onKeydown($event,index)">{{tab.label}}</button>}</div>`, styles:[`div{display:flex;gap:var(--space-1);border-bottom:1px solid var(--color-border)}button{position:relative;padding:var(--space-3) var(--space-2);border:0;color:var(--color-text-muted);background:transparent;cursor:pointer}button[aria-selected="true"]{color:var(--color-text);font-weight:650}button[aria-selected="true"]:after{content:'';position:absolute;right:var(--space-2);bottom:-1px;left:var(--space-2);height:2px;background:var(--color-primary)}`], changeDetection:ChangeDetectionStrategy.OnPush })
export class TabsComponent {
  @Input() tabs:TabItem[]=[];@Input() active='';@Input() label='Seções';@Output() activeChange=new EventEmitter<string>();
  onKeydown(event:KeyboardEvent,index:number):void{
    if(!this.tabs.length)return;
    let next=index;
    if(event.key==='ArrowRight')next=(index+1)%this.tabs.length;
    else if(event.key==='ArrowLeft')next=(index-1+this.tabs.length)%this.tabs.length;
    else if(event.key==='Home')next=0;
    else if(event.key==='End')next=this.tabs.length-1;
    else return;
    event.preventDefault();
    const buttons=(event.currentTarget as HTMLElement).parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    buttons?.[next]?.focus();
    this.activeChange.emit(this.tabs[next].id);
  }
}

@Component({ selector:'gr-context-selector', template:`<div class="selector"><span>{{kind==='organization'?'Organização':'Fazenda'}}</span><select [attr.aria-label]="kind==='organization'?'Organização atual':'Fazenda atual'" [value]="value" [disabled]="disabled||!options.length" (change)="changed.emit($any($event.target).value)">@if(!options.length){<option value="">Nenhuma disponível</option>}@for(option of options;track idOf(option)){<option [value]="idOf(option)">{{labelOf(option)}}</option>}</select></div>`, styles:[`.selector{min-width:9rem;display:grid;gap:1px;padding:var(--space-1) var(--space-2);border:1px solid transparent;border-radius:var(--radius-sm);transition:background var(--duration-fast),border-color var(--duration-fast)}.selector:hover{border-color:var(--color-border);background:var(--color-surface-soft)}.selector:focus-within{border-color:var(--color-focus);box-shadow:0 0 0 2px color-mix(in srgb,var(--color-focus) 20%,transparent)}span{font-size:.625rem;font-weight:680;line-height:1.2;letter-spacing:.055em;text-transform:uppercase;color:var(--color-text-muted)}select{max-width:12rem;padding:0 1.25rem 0 0;border:0;outline:0;color:var(--color-text);background:transparent;font-size:.8125rem;font-weight:620;text-overflow:ellipsis;cursor:pointer}select:disabled{cursor:not-allowed;color:var(--color-text-muted)}`], changeDetection:ChangeDetectionStrategy.OnPush })
export class ContextSelectorComponent {
  @Input() kind:'organization'|'farm'='farm';@Input() options:(OrganizationOption|FarmOption)[]=[];@Input() value='';@Input() disabled=false;@Output() changed=new EventEmitter<string>();
  idOf(option:OrganizationOption|FarmOption):string{return 'organizationId' in option?option.organizationId:option.farmId;}
  labelOf(option:OrganizationOption|FarmOption):string{return 'organizationName' in option?option.organizationName:option.farmName;}
}
