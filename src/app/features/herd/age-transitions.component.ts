import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiClient } from '../../core/api/api-client.service';
import { ContextStore } from '../../core/context/context.store';
import { ErrorStateComponent, SkeletonComponent } from '../../design-system/feedback/feedback';
import { PaginationComponent } from '../../design-system/data-display/data-display';
import { ContextRequestScope } from '../management/management.shared';
import { AgeTransitions } from './age-intelligence.models';
import { ageBandLabels } from './parity.models';
import { formatDate } from './herd.shared';

@Component({
  selector: 'app-age-transitions',
  imports: [RouterLink, ErrorStateComponent, SkeletonComponent, PaginationComponent],
  template: `<section class="age-section" aria-label="Próximas mudanças de faixa etária">
    <header>
      <div>
        <h2>Próximas mudanças de faixa</h2>
        <p>Preparação do manejo · informação de acompanhamento</p>
      </div>
      @if (preview()) {
        <a routerLink="/rebanho/animais" [queryParams]="{ ageTransitions: true }"
          >Explorar animais →</a
        >
      }
    </header>
    @if (loading()) {
      <div aria-busy="true" aria-label="Carregando mudanças de faixa"><gr-skeleton /></div>
    } @else if (failed()) {
      <gr-error-state title="Não foi possível carregar as mudanças de faixa" (retry)="load()" />
    } @else if (result(); as data) {
      <p>
        {{ data.totalElements }}
        {{
          data.totalElements === 1
            ? 'animal com transição prevista'
            : 'animais com transição prevista'
        }}
        nos próximos {{ data.horizonDays }} dias · referência {{ date(data.referenceDate) }}.
      </p>
      @if (!data.totalElements) {
        <p>Nenhum animal vai mudar de faixa neste horizonte.</p>
      }
      <ul>
        @for (item of data.items; track item.animalId) {
          <li>
            <a [routerLink]="['/rebanho/animais', item.animalId]"
              >{{ item.identification }}{{ item.name ? ' · ' + item.name : '' }}</a
            >
            <span
              >{{ labels[item.age.currentBand] }} →
              {{ item.age.nextBand ? labels[item.age.nextBand] : 'Última faixa' }}</span
            >
            <span
              >{{ date(item.age.transitionOn) }} · em {{ item.age.daysUntilTransition }}
              {{ item.age.daysUntilTransition === 1 ? 'dia' : 'dias' }}</span
            >
          </li>
        }
      </ul>
      @if (!preview() && data.totalPages > 1) {
        <gr-pagination
          [page]="data.page"
          [totalPages]="data.totalPages"
          (pageChange)="load($event)"
        />
      }
    }
  </section>`,
  styles: [
    `
      :host {
        display: block;
      }
      .age-section {
        padding: 1.25rem;
        margin-block: 1rem;
        border-block: 1px solid var(--color-border);
      }
      header {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        align-items: start;
      }
      h2 {
        font-size: 1.1rem;
        margin: 0;
      }
      p {
        font-size: 0.85rem;
        color: var(--color-text-muted);
      }
      ul {
        list-style: none;
        padding: 0;
        margin: 0;
      }
      li {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 0.75rem;
        padding: 0.75rem 0;
        border-top: 1px solid var(--color-border);
        font-size: 0.875rem;
      }
      a {
        color: var(--color-text);
        font-weight: 600;
      }
      @media (max-width: 768px) {
        header {
          display: block;
        }
        li {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgeTransitionsComponent {
  readonly preview = input(false);
  readonly result = signal<AgeTransitions | null>(null);
  readonly loading = signal(true);
  readonly failed = signal(false);
  readonly labels = ageBandLabels;
  readonly date = formatDate;
  private readonly api = inject(ApiClient);
  private readonly context = inject(ContextStore);
  private readonly scope = new ContextRequestScope(inject(DestroyRef));
  private requestedPage = 0;
  constructor() {
    effect(() => {
      this.context.contextVersion();
      const farm = this.context.selectedFarm();
      const pending = this.context.transitionPending();
      this.preview();
      untracked(() => {
        this.scope.reset();
        this.result.set(null);
        this.failed.set(false);
        this.loading.set(true);
        this.requestedPage = 0;
        if (farm && !pending) this.load(0);
      });
    });
  }
  load(page = this.requestedPage) {
    if (!this.context.selectedFarm() || this.context.transitionPending()) return;
    this.requestedPage = page;
    this.scope.reset();
    this.result.set(null);
    this.failed.set(false);
    this.loading.set(true);
    this.scope.run(
      this.api.get<AgeTransitions>(
        `/api/v1/herd/age-intelligence/transitions?horizonDays=15&page=${page}&size=${this.preview() ? 3 : 20}`,
        true,
      ),
      (value) => {
        this.result.set(value);
        this.loading.set(false);
      },
      () => {
        this.failed.set(true);
        this.loading.set(false);
      },
    );
  }
}
