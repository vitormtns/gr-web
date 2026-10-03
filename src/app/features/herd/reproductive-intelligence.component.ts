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
import { ContextRequestScope } from '../management/management.shared';
import { formatDate } from './herd.shared';

export interface CalvingAttention {
  level: 'UPCOMING' | 'DUE_TODAY' | 'OVERDUE' | 'OVERDUE_ATTENTION' | 'OVERDUE_EXTENDED';
  expectedOn: string;
  daysUntil: number;
  daysOverdue: number;
  guidance: string;
}
export const calvingLevelLabels: Record<CalvingAttention['level'], string> = {
  UPCOMING: 'Parto próximo',
  DUE_TODAY: 'Previsão para hoje',
  OVERDUE: 'Após a data esperada',
  OVERDUE_ATTENTION: 'Atraso prolongado',
  OVERDUE_EXTENDED: 'Revisão prioritária',
};
interface ReproductiveIntelligence {
  referenceDate: string;
  openPregnancyId: string | null;
  calving: CalvingAttention | null;
  postpartum: {
    calvedOn: string;
    daysSinceCalving: number;
    reviewOn: string;
    daysUntilReview: number;
    reviewDue: boolean;
    reviewAfterDays: number;
    guidance: string;
  } | null;
}
@Component({
  selector: 'app-reproductive-intelligence',
  imports: [RouterLink, ErrorStateComponent, SkeletonComponent],
  template: `<details>
    <summary>Acompanhamento reprodutivo e pós-parto</summary>
    @if (loading()) {
      <div aria-busy="true" aria-label="Carregando acompanhamento reprodutivo"><gr-skeleton /></div>
    } @else if (failed()) {
      <gr-error-state title="Não foi possível carregar o acompanhamento" (retry)="load()" />
    } @else if (result(); as data) {
      <p>Referência: {{ date(data.referenceDate) }}.</p>
      @if (data.calving; as calving) {
        <h3>{{ labels[calving.level] }}</h3>
        <p>Data esperada: {{ date(calving.expectedOn) }}.</p>
        <p>
          {{
            calving.daysOverdue > 0
              ? calving.daysOverdue + ' dias após a previsão'
              : calving.daysUntil === 0
                ? 'Previsão para hoje'
                : 'Em ' + calving.daysUntil + ' dias'
          }}.
        </p>
        <p>{{ calving.guidance }}</p>
        @if (data.openPregnancyId) {
          <a
            routerLink="/rebanho/reproducao"
            [queryParams]="{
              tab: 'pregnancies',
              pregnancyId: data.openPregnancyId,
              action: 'view',
            }"
            >Abrir gestação</a
          >
        }
      }
      @if (data.postpartum; as postpartum) {
        <h3>
          Pós-parto ·
          {{ postpartum.reviewDue ? 'Revisão de manejo disponível' : 'Em acompanhamento' }}
        </h3>
        <p>
          Parto registrado em {{ date(postpartum.calvedOn) }} ·
          {{ postpartum.daysSinceCalving }} dias desde o parto.
        </p>
        <p>
          Referência para revisão: {{ date(postpartum.reviewOn) }} ({{
            postpartum.reviewAfterDays
          }}
          dias após o parto).
        </p>
        @if (postpartum.daysUntilReview > 0) {
          <p>Faltam {{ postpartum.daysUntilReview }} {{ postpartum.daysUntilReview === 1 ? 'dia' : 'dias' }} para a revisão.</p>
        } @else {
          <p>{{ postpartum.reviewOn === data.referenceDate ? 'Revisão prevista para hoje.' : 'O prazo de referência para revisão já foi alcançado.' }}</p>
        }
        <p>{{ postpartum.guidance }}</p>
      }
      @if (!data.calving && !data.postpartum) {
        <p>
          Nenhuma previsão de parto ou acompanhamento pós-parto disponível nos fatos registrados.
        </p>
      }
    }
  </details>`,
  styles: [
    `
      :host {
        display: block;
        margin-block: 1rem;
      }
      summary {
        cursor: pointer;
        font-weight: 600;
      }
      p {
        font-size: 0.85rem;
        color: var(--color-text-muted);
        line-height: 1.6;
      }
      h3 {
        font-size: 1rem;
      }
      a {
        color: var(--color-text);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReproductiveIntelligenceComponent {
  readonly animalId = input.required<string>();
  readonly result = signal<ReproductiveIntelligence | null>(null);
  readonly loading = signal(true);
  readonly failed = signal(false);
  readonly labels = calvingLevelLabels;
  readonly date = formatDate;
  private readonly api = inject(ApiClient);
  private readonly context = inject(ContextStore);
  private readonly scope = new ContextRequestScope(inject(DestroyRef));
  constructor() {
    effect(() => {
      this.context.contextVersion();
      const farm = this.context.selectedFarm();
      const pending = this.context.transitionPending();
      this.animalId();
      untracked(() => {
        this.scope.reset();
        this.result.set(null);
        this.failed.set(false);
        this.loading.set(true);
        if (farm && !pending) this.load();
      });
    });
  }
  load() {
    if (!this.context.selectedFarm() || this.context.transitionPending()) return;
    this.scope.reset();
    this.result.set(null);
    this.loading.set(true);
    this.failed.set(false);
    this.scope.run(
      this.api.get<ReproductiveIntelligence>(
        `/api/v1/herd/animals/${encodeURIComponent(this.animalId())}/reproductive-intelligence`,
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
