import { ChangeDetectionStrategy, Component, effect, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { LucideDynamicIcon } from '@lucide/angular';
import { AuthStore } from '../core/auth/auth.store';
import { ContextStore } from '../core/context/context.store';
import { PermissionService } from '../core/permissions/permission.service';
import { EmptyStateComponent, ErrorStateComponent, ToastRegionComponent, ToastService } from '../design-system/feedback/feedback';
import { AvatarComponent } from '../design-system/data-display/data-display';
import { ContextNavigatorComponent } from '../design-system/navigation/navigation';
import { IconButtonComponent, TooltipDirective } from '../design-system/primitives/primitives';
import { MenuComponent, PopoverComponent } from '../design-system/surfaces/surfaces';

interface NavItem { label: string; icon: string; route: string; permission?: 'viewAdministration' }
interface NavSection { label?: string; items: NavItem[] }

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LucideDynamicIcon, ToastRegionComponent, ErrorStateComponent, EmptyStateComponent, AvatarComponent, ContextNavigatorComponent, IconButtonComponent, TooltipDirective, MenuComponent, PopoverComponent],
  template: `<div class="shell" [class.collapsed]="collapsed()">
    @if(mobileOpen()){<button class="mobile-backdrop" type="button" aria-label="Fechar menu" (click)="mobileOpen.set(false)"></button>}
    <aside class="sidebar" [class.mobile-open]="mobileOpen()" aria-label="Navegação principal">
      <div class="brand">
        @if (!collapsed()) {
          @if (!brandLogoMissing()) {
            <img class="brand-logo-full" src="/images/brand/ebov/sidebar-logo.png" alt="eBov" (error)="brandLogoMissing.set(true)" />
          } @else {
            <span class="brand-mark" aria-hidden="true"><i></i></span>
            <strong class="brand-fallback-name">eBov</strong>
          }
          <span class="brand-badge">PRO</span>
        } @else if (!brandLogoMissing()) {
          <img class="brand-logo-symbol" src="/images/brand/ebov/symbol.svg" alt="eBov" (error)="brandLogoMissing.set(true)" />
        } @else {
          <span class="brand-mark" aria-hidden="true"><i></i></span>
        }
        <button type="button" class="close-mobile" aria-label="Fechar menu" (click)="mobileOpen.set(false)"><svg lucideIcon="x"></svg></button>
      </div>
      <div class="mobile-contexts">
        <gr-context-navigator [organizations]="context.organizations()" [farms]="context.farms()" [organization]="context.selectedOrganization()" [farm]="context.selectedFarm()" [disabled]="context.transitionPending()" (organizationChanged)="changeOrganization($event)" (farmChanged)="changeFarm($event)" />
      </div>
      <nav>
        @for(section of navigation; track section.label){
          <section>
            @if(section.label){<h2>{{section.label}}</h2>}
            <ul>
              @for(item of section.items; track item.route){
                @if(!item.permission || permissions.can(item.permission)){
                  <li>
                    <a [routerLink]="item.route" routerLinkActive="active" ariaCurrentWhenActive="page" (click)="mobileOpen.set(false)" [grTooltip]="collapsed()?item.label:''">
                      <svg [lucideIcon]="item.icon"></svg><span>{{item.label}}</span>
                    </a>
                  </li>
                }
              }
            </ul>
          </section>
        }
      </nav>
      <div class="sidebar-footer">
        <button type="button" (click)="collapsed.set(!collapsed())" [attr.aria-label]="collapsed()?'Expandir menu':'Recolher menu'">
          <svg lucideIcon="command"></svg><span>{{collapsed()?'Expandir menu':'Recolher menu'}}</span>
        </button>
      </div>
    </aside>
    <div class="workspace">
      <header class="topbar">
        <div class="topbar-start">
          <gr-icon-button class="menu-button" label="Abrir menu" (pressed)="mobileOpen.set(true)"><svg lucideIcon="menu"></svg></gr-icon-button>
          <div class="contexts" [class.pending]="context.transitionPending()">
            <gr-context-navigator [organizations]="context.organizations()" [farms]="context.farms()" [organization]="context.selectedOrganization()" [farm]="context.selectedFarm()" [disabled]="context.transitionPending()" (organizationChanged)="changeOrganization($event)" (farmChanged)="changeFarm($event)" />
          </div>
        </div>
        <div class="topbar-actions">
          <gr-popover label="Abrir menu da conta">
            <span popover-trigger class="account-trigger">
              <gr-avatar [name]="displayName"/>
              <span class="account-info"><strong>{{displayName}}</strong><small>{{roleLabel}}</small></span>
              <svg lucideIcon="chevron-down" class="account-chevron"></svg>
            </span>
            <gr-menu>
              <div class="account-identity"><strong>{{displayName}}</strong><span>{{accountEmail}}</span></div>
              <button type="button" (click)="logout()"><svg lucideIcon="log-out"></svg>Sair</button>
            </gr-menu>
          </gr-popover>
        </div>
      </header>
      <main class="content" [attr.aria-busy]="context.transitionPending()">
        @if(context.status()==='error'&&!context.transitionPending()){
          <gr-error-state level="page" title="Não foi possível carregar seu contexto de acesso" description="O serviço pode estar temporariamente indisponível. Tente novamente sem recarregar a página." (retry)="retryContext()" />
        } @else if(context.status()==='empty'&&!context.transitionPending()){
          <gr-empty-state [title]="context.selectedOrganization()?'Nenhuma fazenda disponível':'Nenhuma organização disponível'" [description]="context.selectedOrganization()?'Seu acesso não inclui uma fazenda ativa nesta organização.':'Peça a um administrador para vincular sua conta a uma organização.'" />
        } @else {
          <div class="route-content" [class.context-hidden]="context.transitionPending()"><router-outlet /></div>
        }
        @if(context.transitionPending()){
          <div class="context-transition" role="status">
            <span class="transition-indicator" aria-hidden="true"><i></i></span>
            <span>Atualizando contexto</span>
            <p>Validando seu acesso à nova fazenda ou organização...</p>
            <div class="transition-lines" aria-hidden="true"><span></span><span></span></div>
          </div>
        }
      </main>
    </div>
    <gr-toast-region />
  </div>`,
  styles: [`
    .shell { --app-sidebar-width: var(--sidebar-width); min-height: 100dvh; }
    .sidebar {
      --sidebar-bg: var(--brand-primary);
      --sidebar-bg-deep: color-mix(in srgb, var(--brand-primary) 72%, var(--brand-ink));
      --sidebar-border: rgba(255, 255, 255, 0.12);
      --sidebar-text: #dce8de;
      --sidebar-text-muted: rgba(250, 250, 248, 0.72);
      --sidebar-active-bg: rgba(255, 255, 255, 0.12);
      --sidebar-active-border: rgba(255, 255, 255, 0.14);
      --sidebar-hover-bg: rgba(255, 255, 255, 0.07);
      --sidebar-live-accent: var(--brand-live);
      position: fixed;
      z-index: 40;
      inset: 0 auto 0 0;
      width: var(--sidebar-width);
      display: grid;
      grid-template-rows: auto 1fr auto;
      border-right: 1px solid #082419;
      color: var(--sidebar-text);
      background: var(--sidebar-bg);
      box-shadow: 2px 0 16px rgba(6, 26, 17, 0.22);
      transition: width var(--duration-context) var(--ease-standard), transform var(--duration-context) var(--ease-standard);
    }
    .brand {
      height: var(--topbar-height);
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: 0 var(--space-5);
      border-bottom: 1px solid var(--sidebar-border);
      background: var(--sidebar-bg-deep);
    }
    .brand-fallback-name { font-family: var(--font-display); font-size: 1.0625rem; font-weight: 700; line-height: 1; letter-spacing: -0.02em; color: #fafaf8; }
    .brand-badge { padding: 1px 5px; border-radius: 4px; font-size: 0.575rem; font-weight: 800; letter-spacing: 0.06em; color: #d9ebde; background: rgba(255, 255, 255, 0.14); }
    .brand-logo-full {
      max-height: 2rem;
      max-width: 11rem;
      width: auto;
      flex: 0 1 auto;
      object-fit: contain;
    }
    .brand-logo-symbol {
      width: 2rem;
      height: 2rem;
      flex: 0 0 auto;
      object-fit: contain;
    }
    .brand-mark {
      width: 2.15rem;
      height: 2.15rem;
      display: grid;
      place-items: center;
      flex: 0 0 auto;
      border-radius: 0.65rem;
      border: 1px solid rgba(255, 255, 255, 0.35);
      color: #fff;
      background: rgba(255, 255, 255, 0.14);
      box-shadow: 0 4px 12px rgba(6, 26, 17, 0.25);
    }
    .brand-mark i { width: 1.05rem; height: 0.75rem; border: 1.6px solid currentColor; border-radius: 60% 40% 55% 45%; transform: rotate(-12deg); }
    .close-mobile, .mobile-contexts { display: none; }
    .close-mobile { margin-left: auto; border: 0; background: transparent; color: var(--sidebar-text-muted); cursor: pointer; }
    nav { overflow-y: auto; padding: var(--space-5) var(--space-3); }
    nav section + section { margin-top: var(--space-6); }
    nav h2 { height: 1.25rem; margin: 0 var(--space-3) var(--space-2); font-size: 0.625rem; font-weight: 750; line-height: 1.25rem; letter-spacing: 0.11em; color: var(--sidebar-text-muted); text-transform: uppercase; }
    ul { display: grid; gap: 3px; margin: 0; padding: 0; list-style: none; }
    a {
      position: relative;
      min-height: 2.45rem;
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: 0 var(--space-3);
      border-radius: var(--radius-md);
      color: var(--sidebar-text);
      font-size: 0.835rem;
      font-weight: 520;
      text-decoration: none;
      transition: color var(--duration-fast), background var(--duration-fast);
    }
    a:hover { color: #fff; background: var(--sidebar-hover-bg); }
    a.active { color: #fff; background: var(--sidebar-active-bg); font-weight: 700; box-shadow: inset 0 0 0 1px var(--sidebar-active-border); }
    a.active::before { content: ''; position: absolute; left: -0.75rem; width: 3px; height: 1.5rem; border-radius: 0 3px 3px 0; background: var(--sidebar-live-accent); }
    a.active svg { stroke-width: 2.2; color: #fff; }
    a svg, .sidebar-footer svg { width: 1.05rem; height: 1.05rem; flex: 0 0 auto; stroke-width: 1.8; }
    a svg { color: var(--sidebar-text-muted); }
    a:hover svg { color: #fff; }
    .sidebar a:focus-visible, .sidebar-footer button:focus-visible, .brand .close-mobile:focus-visible { outline: 2px solid #eaf4ed; outline-offset: 2px; }
    .sidebar-footer { position: relative; padding: var(--space-3); border-top: 1px solid var(--sidebar-border); background: var(--sidebar-bg-deep); }
    .sidebar-footer::before { content: ''; position: absolute; top: -1px; left: var(--space-6); width: 2rem; height: 2px; background: var(--sidebar-live-accent); }
    .sidebar-footer button {
      width: 100%;
      min-height: var(--control-height-small);
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: 0 var(--space-3);
      border: 0;
      border-radius: var(--radius-sm);
      color: var(--sidebar-text-muted);
      background: transparent;
      font-size: 0.8125rem;
      cursor: pointer;
    }
    .sidebar-footer button:hover { color: #fff; background: var(--sidebar-hover-bg); }
    .workspace { min-height: 100dvh; margin-left: var(--sidebar-width); overflow-x: clip; transition: margin-left var(--duration-context) var(--ease-standard); }
    .topbar {
      position: sticky;
      z-index: 20;
      top: 0;
      height: var(--topbar-height);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-4);
      padding: 0 var(--space-6);
      border-bottom: 1px solid rgba(210, 225, 215, 0.85);
      background: rgba(255, 255, 255, 0.85);
      box-shadow: 0 1px 4px rgba(11, 25, 16, 0.02);
      backdrop-filter: blur(16px) saturate(160%);
    }
    .topbar-start, .topbar-actions, .contexts, .account-trigger { display: flex; align-items: center; min-width: 0; }
    .menu-button { display: none; }
    .contexts { min-width: 0; transition: opacity var(--duration-standard); }
    .contexts.pending { opacity: 0.55; pointer-events: none; }
    .topbar-actions { flex: 0 0 auto; }
    .account-trigger {
      gap: var(--space-3);
      padding: 4px var(--space-3) 4px 4px;
      border: 1px solid var(--color-border);
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.9);
      box-shadow: var(--shadow-xs);
      cursor: pointer;
      transition: border-color var(--duration-fast), background var(--duration-fast);
    }
    .account-trigger:hover { border-color: var(--color-border-strong); background: var(--color-surface); }
    .account-info { display: grid; text-align: left; line-height: 1.2; }
    .account-trigger strong { max-width: 8.5rem; overflow: hidden; font-size: 0.8125rem; font-weight: 680; text-overflow: ellipsis; white-space: nowrap; color: var(--color-text); }
    .account-trigger small { font-size: 0.6875rem; color: var(--color-text-muted); }
    .account-chevron { width: 0.85rem; height: 0.85rem; color: var(--color-text-muted); }
    gr-menu svg { width: 1rem; height: 1rem; }
    .account-identity { display: grid; gap: 2px; min-width: 13.5rem; padding: var(--space-2) var(--space-3) var(--space-3); border-bottom: 1px solid var(--color-border); }
    .account-identity strong { font-size: 0.875rem; color: var(--color-text); }
    .account-identity span { overflow: hidden; color: var(--color-text-secondary); font-size: 0.8125rem; text-overflow: ellipsis; }
    .content { max-width: var(--content-max); min-height: calc(100dvh - var(--topbar-height)); margin: 0 auto; padding: var(--space-8); }
    .route-content { animation: context-content-in var(--duration-context) var(--ease-emphasized); }
    .route-content.context-hidden { display: none; }
    .context-transition { min-height: 18rem; display: grid; align-content: center; justify-items: center; border-top: 1px solid var(--color-border); text-align: center; animation: context-content-in var(--duration-context) var(--ease-standard); }
    .context-transition > span:not(.transition-indicator) { font-size: 0.875rem; font-weight: 700; color: var(--color-primary); }
    .context-transition p { margin: var(--space-2) 0 0; }
    .transition-indicator { position: relative; width: 2.75rem; height: 2.75rem; display: grid; place-items: center; margin-bottom: var(--space-4); border: 1px solid var(--color-border-strong); border-radius: 50%; background: var(--color-primary-subtle); }
    .transition-indicator::before { content: ''; position: absolute; inset: 0.5rem; border: 1.5px solid var(--color-accent); border-radius: 55% 45% 60% 40%; transform: rotate(-25deg); animation: spin 3s linear infinite; }
    .transition-indicator i { position: relative; width: 0.45rem; height: 0.45rem; border-radius: 50%; background: var(--color-primary); }
    .transition-lines { width: min(16rem, 100%); display: grid; gap: var(--space-2); margin-top: var(--space-6); }
    .transition-lines span { height: 0.5rem; border-radius: var(--radius-sm); background: var(--color-surface-soft); animation: loading-pulse var(--duration-context) var(--ease-standard) infinite alternate; }
    .transition-lines span + span { width: 68%; justify-self: center; animation-delay: var(--duration-fast); }
    .collapsed { --app-sidebar-width: 4.5rem; }
    .collapsed .sidebar { width: 4.5rem; }
    .collapsed .workspace { margin-left: 4.5rem; }
    .collapsed .brand { justify-content: center; padding: 0; }
    .collapsed nav h2, .collapsed nav a span, .collapsed .sidebar-footer span { display: none; }
    .collapsed nav { padding-inline: var(--space-2); }
    .collapsed nav section + section { margin-top: var(--space-3); }
    .collapsed nav a, .collapsed .sidebar-footer button { justify-content: center; padding: 0; }
    .collapsed nav a.active::before { left: -0.5rem; }
    .mobile-backdrop { position: fixed; z-index: 35; inset: 0; border: 0; background: rgba(11, 25, 16, 0.42); backdrop-filter: blur(4px); }
    @media (max-width: 64rem) {
      .shell, .collapsed { --app-sidebar-width: 0rem; }
      .sidebar { transform: translateX(-100%); width: min(var(--sidebar-width), 88vw); }
      .sidebar.mobile-open { transform: translateX(0); }
      .workspace, .collapsed .workspace { margin-left: 0; }
      .menu-button, .close-mobile { display: inline-flex; }
      .collapsed .sidebar { width: min(var(--sidebar-width), 88vw); }
      .collapsed .brand { justify-content: flex-start; padding: 0 var(--space-5); }
      .collapsed nav h2, .collapsed nav a span, .collapsed .sidebar-footer span { display: initial; }
      .collapsed nav { padding: var(--space-4) var(--space-3); }
      .collapsed nav a, .collapsed .sidebar-footer button { justify-content: flex-start; padding: 0 var(--space-3); }
    }
    @media (max-width: 46rem) {
      .sidebar { grid-template-rows: auto auto 1fr auto; }
      .mobile-contexts { display: block; padding: var(--space-3); border-bottom: 1px solid var(--sidebar-border); }
      .topbar { padding: 0 var(--space-4); }
      .account-info, .account-chevron { display: none; }
      .account-trigger { padding: 2px; }
      .content { padding: var(--space-5) var(--space-4); }
    }
    @media (max-width: 64rem) {
      .topbar-start, .contexts { flex: 1; min-width: 0; }
      .contexts gr-context-navigator { width: 100%; }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppShellComponent {
  readonly collapsed = signal(false);
  readonly mobileOpen = signal(false);
  readonly brandLogoMissing = signal(false);
  private readonly manualLogout = signal(false);
  readonly navigation: NavSection[] = [
    { items: [{ label: 'Visão geral', icon: 'house', route: '/visao-geral' }] },
    { label: 'REBANHO', items: [
      { label: 'Animais', icon: 'beef', route: '/rebanho/animais' },
      { label: 'Movimentações', icon: 'land-plot', route: '/rebanho/movimentacoes' },
      { label: 'Saúde', icon: 'heart-pulse', route: '/rebanho/saude' },
      { label: 'Reprodução', icon: 'sprout', route: '/rebanho/reproducao' },
      { label: 'Agenda', icon: 'calendar-days', route: '/rebanho/agenda' },
    ] },
    { label: 'ANÁLISES', items: [{ label: 'Relatórios', icon: 'chart-no-axes-combined', route: '/relatorios' }] },
    { label: 'GESTÃO', items: [{ label: 'Administração', icon: 'building-2', route: '/administracao', permission: 'viewAdministration' }] },
  ];
  constructor(
    readonly context: ContextStore,
    readonly permissions: PermissionService,
    private readonly auth: AuthStore,
    private readonly router: Router,
    private readonly toast: ToastService,
  ) {
    effect(() => {
      if (this.auth.status() === 'anonymous' && !this.manualLogout()) {
        this.context.clear();
        void this.router.navigate(['/entrar'], { queryParams: { motivo: 'sessao-expirada' } });
      }
    });
  }
  get displayName(): string { return this.context.user()?.displayName?.trim() || this.accountEmail || 'Usuário'; }
  get accountEmail(): string { return this.context.user()?.email || this.auth.userEmail() || ''; }
  get roleLabel(): string {
    return ({ OWNER: 'Proprietário', ADMIN: 'Administrador', MANAGER: 'Gerente', OPERATOR: 'Operador', VIEWER: 'Visualizador' } as Record<string, string>)[this.context.role() || 'VIEWER'] || 'Visualizador';
  }
  async changeOrganization(id: string): Promise<void> {
    try { await this.context.selectOrganization(id); }
    catch { this.toast.show('error', 'Não foi possível trocar a organização', 'O contexto anterior foi preservado quando possível.'); }
  }
  async changeFarm(id: string): Promise<void> {
    try { await this.context.selectFarm(id); }
    catch { this.toast.show('error', 'Não foi possível trocar a fazenda', 'Atualize a página e tente novamente.'); }
  }
  async retryContext(): Promise<void> {
    try { await this.context.retry(); }
    catch { this.toast.show('error', 'Contexto ainda indisponível', 'A conexão com o serviço não foi restabelecida.'); }
  }
  async logout(): Promise<void> {
    this.manualLogout.set(true);
    try {
      await this.auth.signOut();
      this.context.clear();
      await this.router.navigate(['/entrar']);
    } catch {
      this.manualLogout.set(false);
      this.toast.show('error', 'Não foi possível sair', 'Tente novamente.');
    }
  }
}
