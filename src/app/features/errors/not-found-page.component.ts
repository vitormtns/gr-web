import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found-page',
  imports: [RouterLink],
  template: `<main class="not-found">
    <section aria-labelledby="not-found-title">
      <span>ERRO 404</span>
      <h1 id="not-found-title">Página não encontrada</h1>
      <p>O endereço informado não existe ou não está mais disponível.</p>
      <a routerLink="/visao-geral">Voltar à visão geral</a>
    </section>
  </main>`,
  styles: [`
    .not-found{min-height:100dvh;display:grid;place-items:center;padding:var(--space-5);background:var(--color-bg)}
    section{width:min(34rem,100%);padding:var(--space-8);border:1px solid var(--color-border);border-radius:var(--radius-lg);background:var(--color-surface);box-shadow:var(--shadow-floating)}
    span{font-size:.6875rem;font-weight:740;letter-spacing:.1em;color:var(--color-primary)}
    h1{margin:var(--space-3) 0 var(--space-2);font-size:clamp(2rem,6vw,3.5rem);letter-spacing:-.045em}
    p{margin:0 0 var(--space-6);color:var(--color-text-secondary)}
    a{display:inline-flex;min-height:2.75rem;align-items:center;padding:0 var(--space-4);border-radius:var(--radius-sm);color:#fff;background:var(--color-primary);font-weight:700;text-decoration:none}
    a:focus-visible{outline:3px solid var(--color-focus);outline-offset:3px}
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFoundPageComponent {}
