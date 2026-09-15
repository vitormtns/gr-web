import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ContextStore } from '../../core/context/context.store';
import { EmptyStateComponent, ErrorStateComponent, SkeletonComponent } from '../../design-system/feedback/feedback';
import { StatusIndicatorComponent } from '../../design-system/data-display/data-display';

@Component({
  selector: 'app-home-page',
  imports: [EmptyStateComponent, ErrorStateComponent, SkeletonComponent, StatusIndicatorComponent],
  template: `<div class="page-enter">
    <header class="page-header"><div><span class="eyebrow">Operação atual</span><h1>Visão geral</h1><p>Acompanhe o que importa em {{context.selectedFarm()?.farmName || 'sua fazenda'}}.</p></div></header>
    @if(context.status()==='loading'){<section class="loading" aria-label="Carregando contexto"><gr-skeleton /><gr-skeleton /><gr-skeleton /></section>}
    @else if(context.status()==='error'){<gr-error-state level="page" title="Não foi possível carregar o contexto" [description]="context.error()?.message||'Verifique sua conexão e tente novamente.'" [reference]="context.error()?.requestId?.slice(0,12)||''" (retry)="retry()" />}
    @else if(context.status()==='empty'){<section class="surface"><gr-empty-state title="Seu território começa aqui" description="Nenhuma fazenda acessível foi encontrada. Peça ao administrador para revisar seu acesso." /></section>}
    @else {<section class="territory-stage"><div class="stage-point" aria-hidden="true"><i></i></div><div class="stage-copy"><span>Contexto ativo</span><h2>{{context.selectedFarm()?.farmName}}</h2><p>{{context.selectedOrganization()?.organizationName}}</p></div><gr-status-indicator tone="success">Pronto para operar</gr-status-indicator><div class="stage-line" aria-hidden="true"></div></section>}
  </div>`,
  styles: [`:host{display:block}.page-header{margin-bottom:var(--space-6)}.eyebrow,.stage-copy>span{font-size:.8125rem;font-weight:650;color:var(--color-text-muted)}h1{margin:.25rem 0}.page-header p{margin:0}.territory-stage{position:relative;min-height:19rem;display:grid;align-content:center;justify-items:start;overflow:hidden;padding:var(--space-8);border:1px solid var(--color-border);border-radius:var(--radius-lg);background:var(--color-surface)}.stage-point{position:relative;z-index:1;width:2rem;height:2rem;display:grid;place-items:center;margin-bottom:var(--space-6);border:1px solid var(--color-border-strong);border-radius:50%;background:var(--color-primary-subtle)}.stage-point:before{content:'';position:absolute;inset:.375rem;border:1px solid var(--color-accent);border-radius:55% 45% 60% 40%;transform:rotate(-25deg)}.stage-point i{position:relative;width:.375rem;height:.375rem;border-radius:50%;background:var(--color-primary)}.stage-copy{position:relative;z-index:1}.stage-copy>span{color:var(--color-primary)}.stage-copy h2{margin:var(--space-2) 0 0;font-size:1.75rem}.stage-copy p{margin:0}.territory-stage gr-status-indicator{position:relative;z-index:1;margin-top:var(--space-6)}.stage-line{position:absolute;right:-8rem;bottom:-7rem;width:40rem;height:20rem;border:1px solid var(--color-border);border-radius:48% 52% 40% 60%;transform:rotate(-12deg)}.stage-line:before{content:'';position:absolute;inset:2rem;border:1px solid var(--color-border);border-radius:52% 48% 60% 40%}.surface{border:1px solid var(--color-border);border-radius:var(--radius-lg);background:var(--color-surface)}.loading{display:grid;gap:var(--space-4)}.loading gr-skeleton:nth-child(1){height:4rem}.loading gr-skeleton:nth-child(2){height:16rem}.loading gr-skeleton:nth-child(3){width:55%}@media(max-width:44rem){.territory-stage{padding:var(--space-5)}.stage-line{right:-22rem}}`],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePageComponent {
  constructor(readonly context: ContextStore) {}
  retry(): void { void this.context.retry().catch(() => {}); }
}
