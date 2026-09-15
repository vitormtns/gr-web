import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { LucideDynamicIcon } from '@lucide/angular';
import { AuthStore } from '../core/auth/auth.store';
import { ContextStore } from '../core/context/context.store';
import { PermissionService } from '../core/permissions/permission.service';
import { ToastRegionComponent, ToastService } from '../design-system/feedback/feedback';
import { AvatarComponent } from '../design-system/data-display/data-display';
import { ContextSelectorComponent } from '../design-system/navigation/navigation';
import { IconButtonComponent, TooltipDirective } from '../design-system/primitives/primitives';
import { MenuComponent, PopoverComponent } from '../design-system/surfaces/surfaces';

interface NavItem { label:string; icon:string; route:string; permission?:'manageUsers' }
interface NavSection { label?:string; items:NavItem[] }

@Component({
  selector:'app-shell',
  imports:[RouterOutlet,RouterLink,RouterLinkActive,LucideDynamicIcon,ToastRegionComponent,AvatarComponent,ContextSelectorComponent,IconButtonComponent,TooltipDirective,MenuComponent,PopoverComponent],
  template:`<div class="shell" [class.collapsed]="collapsed()">
    @if(mobileOpen()){<button class="mobile-backdrop" type="button" aria-label="Fechar menu" (click)="mobileOpen.set(false)"></button>}
    <aside class="sidebar" [class.mobile-open]="mobileOpen()" aria-label="Navegação principal">
      <div class="brand"><span class="brand-mark"><i></i></span><strong>Gerenciador<br/>Rural</strong><button type="button" class="close-mobile" aria-label="Fechar menu" (click)="mobileOpen.set(false)"><svg lucideIcon="x"></svg></button></div>
      <nav>
        @for(section of navigation;track section.label){<section>@if(section.label){<h2>{{section.label}}</h2>}<ul>@for(item of section.items;track item.route){@if(!item.permission||permissions.can(item.permission)){<li><a [routerLink]="item.route" routerLinkActive="active" (click)="mobileOpen.set(false)" [grTooltip]="collapsed()?item.label:''"><svg [lucideIcon]="item.icon"></svg><span>{{item.label}}</span></a></li>}}</ul></section>}
      </nav>
      <div class="sidebar-footer"><button type="button" (click)="collapsed.set(!collapsed())" [attr.aria-label]="collapsed()?'Expandir menu':'Recolher menu'"><svg lucideIcon="command"></svg><span>Recolher menu</span><kbd>⌘ B</kbd></button></div>
    </aside>
    <div class="workspace">
      <header class="topbar">
        <div class="topbar-start"><gr-icon-button class="menu-button" label="Abrir menu" (pressed)="mobileOpen.set(true)"><svg lucideIcon="menu"></svg></gr-icon-button><div class="contexts" [class.pending]="context.transitionPending()"><gr-context-selector kind="organization" [options]="context.organizations()" [value]="context.selectedOrganization()?.organizationId||''" [disabled]="context.transitionPending()" (changed)="changeOrganization($event)"/><span class="context-divider"></span><gr-context-selector kind="farm" [options]="context.farms()" [value]="context.selectedFarm()?.farmId||''" [disabled]="context.transitionPending()" (changed)="changeFarm($event)"/></div></div>
        <div class="topbar-actions"><button class="search" type="button" aria-label="Busca global, disponível em breve" disabled><svg lucideIcon="search"></svg><span>Buscar no portal</span><kbd>⌘ K</kbd></button><gr-icon-button label="Notificações, disponível em breve" [disabled]="true"><svg lucideIcon="bell"></svg></gr-icon-button><gr-popover><button popover-trigger class="account-trigger" type="button" aria-label="Abrir menu da conta"><gr-avatar [name]="displayName"/><span><strong>{{displayName}}</strong><small>{{roleLabel}}</small></span><svg lucideIcon="chevron-down"></svg></button><gr-menu><button role="menuitem" type="button" disabled><svg lucideIcon="circle-user-round"></svg>Minha conta</button><button role="menuitem" type="button" (click)="logout()"><svg lucideIcon="log-out"></svg>Sair</button></gr-menu></gr-popover></div>
      </header>
      <main class="content" [class.context-pending]="context.transitionPending()"><router-outlet /></main>
    </div>
    <gr-toast-region />
  </div>`,
  styles:[`
    .shell{min-height:100dvh}.sidebar{position:fixed;z-index:40;inset:0 auto 0 0;width:var(--sidebar-width);display:grid;grid-template-rows:auto 1fr auto;border-right:1px solid var(--color-border);background:#f9faf9;transition:width var(--duration-context) var(--ease-standard),transform var(--duration-context) var(--ease-standard)}
    .brand{height:var(--topbar-height);display:flex;align-items:center;gap:var(--space-3);padding:0 var(--space-4);border-bottom:1px solid var(--color-border)}.brand strong{font-size:.8125rem;line-height:1.05;letter-spacing:-.02em}.brand-mark{width:2rem;height:2rem;display:grid;place-items:center;flex:0 0 auto;border-radius:var(--radius-sm);color:#fff;background:var(--color-primary)}.brand-mark i{width:1rem;height:.7rem;border:1.5px solid currentColor;border-radius:60% 40% 55% 45%;transform:rotate(-12deg)}.close-mobile{display:none;margin-left:auto;border:0;background:transparent;color:var(--color-text-secondary)}
    nav{overflow-y:auto;padding:var(--space-4) var(--space-3)}nav section+section{margin-top:var(--space-5)}nav h2{height:1.25rem;margin:0 var(--space-3) var(--space-1);font-size:.625rem;line-height:1.25rem;letter-spacing:.095em;color:var(--color-text-muted)}ul{display:grid;gap:2px;margin:0;padding:0;list-style:none}a{position:relative;height:2.25rem;display:flex;align-items:center;gap:var(--space-3);padding:0 var(--space-3);border-radius:var(--radius-sm);color:var(--color-text-secondary);text-decoration:none;transition:color var(--duration-fast),background var(--duration-fast)}a:hover{color:var(--color-text);background:var(--color-surface-soft)}a.active{color:var(--color-text);background:#e9edea;font-weight:610}a.active:before{content:'';position:absolute;left:-.75rem;width:2px;height:1.125rem;border-radius:0 2px 2px 0;background:var(--color-primary)}a svg,.sidebar-footer svg{width:1rem;height:1rem;flex:0 0 auto;stroke-width:1.8}
    .sidebar-footer{padding:var(--space-3);border-top:1px solid var(--color-border)}.sidebar-footer button{width:100%;height:2.25rem;display:flex;align-items:center;gap:var(--space-3);padding:0 var(--space-3);border:0;border-radius:var(--radius-sm);color:var(--color-text-muted);background:transparent;cursor:pointer}.sidebar-footer button:hover{background:var(--color-surface-soft)}kbd{margin-left:auto;padding:1px 5px;border:1px solid var(--color-border);border-radius:4px;color:var(--color-text-muted);background:var(--color-surface);font:inherit;font-size:.625rem}
    .workspace{min-height:100dvh;margin-left:var(--sidebar-width);transition:margin-left var(--duration-context) var(--ease-standard)}.topbar{position:sticky;z-index:20;top:0;height:var(--topbar-height);display:flex;align-items:center;justify-content:space-between;gap:var(--space-4);padding:0 var(--space-5);border-bottom:1px solid var(--color-border);background:rgb(255 255 255 / 92%);backdrop-filter:blur(12px)}.topbar-start,.topbar-actions,.contexts,.account-trigger{display:flex;align-items:center}.menu-button{display:none}.contexts{gap:var(--space-2);transition:opacity var(--duration-standard)}.contexts.pending{opacity:.55;pointer-events:none}.context-divider{width:1px;height:1.75rem;background:var(--color-border)}.topbar-actions{gap:var(--space-1)}.search{height:2.25rem;display:flex;align-items:center;gap:var(--space-2);padding:0 var(--space-2) 0 var(--space-3);border:1px solid var(--color-border);border-radius:var(--radius-md);color:var(--color-text-muted);background:var(--color-surface);font-size:.75rem}.search svg{width:.875rem}.search kbd{margin-left:var(--space-3)}.account-trigger{gap:var(--space-2);margin-left:var(--space-2);padding:2px var(--space-2) 2px 2px;border:1px solid transparent;border-radius:var(--radius-md);background:transparent;cursor:pointer}.account-trigger:hover{border-color:var(--color-border);background:var(--color-surface-soft)}.account-trigger>span{display:grid;text-align:left}.account-trigger strong{max-width:8rem;overflow:hidden;font-size:.75rem;text-overflow:ellipsis;white-space:nowrap}.account-trigger small{font-size:.625rem;color:var(--color-text-muted)}.account-trigger>svg{width:.75rem}
    gr-menu svg{width:1rem;height:1rem}.content{max-width:var(--content-max);min-height:calc(100dvh - var(--topbar-height));margin:0 auto;padding:var(--space-8);transition:opacity var(--duration-context)}.content.context-pending{opacity:.45;pointer-events:none}
    .collapsed .sidebar{width:4.25rem}.collapsed .workspace{margin-left:4.25rem}.collapsed .brand{justify-content:center}.collapsed .brand strong,.collapsed nav h2,.collapsed nav a span,.collapsed .sidebar-footer span,.collapsed .sidebar-footer kbd{display:none}.collapsed nav{padding-inline:var(--space-2)}.collapsed nav section+section{margin-top:var(--space-3)}.collapsed nav a,.collapsed .sidebar-footer button{justify-content:center;padding:0}.collapsed nav a.active:before{left:-.5rem}
    .mobile-backdrop{position:fixed;z-index:35;inset:0;border:0;background:rgb(18 27 22 / 35%)}
    @media(max-width:64rem){.sidebar{transform:translateX(-100%);width:min(var(--sidebar-width),88vw)}.sidebar.mobile-open{transform:translateX(0)}.workspace,.collapsed .workspace{margin-left:0}.menu-button{display:inline-flex}.close-mobile{display:grid}.collapsed .sidebar{width:min(var(--sidebar-width),88vw)}.collapsed .brand{justify-content:flex-start}.collapsed .brand strong,.collapsed nav h2,.collapsed nav a span,.collapsed .sidebar-footer span,.collapsed .sidebar-footer kbd{display:initial}.collapsed nav{padding:var(--space-4) var(--space-3)}.collapsed nav a,.collapsed .sidebar-footer button{justify-content:flex-start;padding:0 var(--space-3)}}
    @media(max-width:46rem){.topbar{padding:0 var(--space-3)}.context-divider,.contexts gr-context-selector:first-child,.search,.account-trigger>span,.account-trigger>svg{display:none}.account-trigger{margin-left:0}.content{padding:var(--space-5) var(--space-4)}}
  `],
  changeDetection:ChangeDetectionStrategy.OnPush,
})
export class AppShellComponent {
  readonly collapsed=signal(false);readonly mobileOpen=signal(false);
  readonly navigation:NavSection[]=[
    {items:[{label:'Visão geral',icon:'house',route:'/visao-geral'}]},
    {label:'REBANHO',items:[{label:'Animais',icon:'beef',route:'/rebanho/animais'},{label:'Movimentações',icon:'land-plot',route:'/rebanho/movimentacoes'},{label:'Saúde',icon:'heart-pulse',route:'/rebanho/saude'},{label:'Reprodução',icon:'sprout',route:'/rebanho/reproducao'},{label:'Agenda',icon:'calendar-days',route:'/rebanho/agenda'}]},
    {label:'OPERAÇÃO',items:[{label:'Estoque',icon:'boxes',route:'/operacao/estoque'},{label:'Financeiro',icon:'credit-card',route:'/operacao/financeiro'}]},
    {label:'GESTÃO',items:[{label:'Fazendas',icon:'building-2',route:'/gestao/fazendas'},{label:'Usuários',icon:'users',route:'/gestao/usuarios',permission:'manageUsers'},{label:'Configurações',icon:'settings',route:'/gestao/configuracoes'}]},
  ];
  constructor(readonly context:ContextStore,readonly permissions:PermissionService,private readonly auth:AuthStore,private readonly router:Router,private readonly toast:ToastService){}
  get displayName():string{return this.context.user()?.displayName||this.context.user()?.email||this.auth.userEmail()||'Usuário';}
  get roleLabel():string{return {OWNER:'Proprietário',ADMIN:'Administrador',MANAGER:'Gerente',OPERATOR:'Operador',VIEWER:'Visualizador'}[this.context.role()||'VIEWER'];}
  async changeOrganization(id:string):Promise<void>{try{await this.context.selectOrganization(id);}catch{this.toast.show('error','Não foi possível trocar a organização','O contexto anterior foi preservado quando possível.');}}
  async changeFarm(id:string):Promise<void>{try{await this.context.selectFarm(id);}catch{this.toast.show('error','Não foi possível trocar a fazenda','Atualize a página e tente novamente.');}}
  async logout():Promise<void>{await this.auth.signOut();this.context.clear();await this.router.navigate(['/entrar']);}
}
