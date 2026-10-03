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
import { AnimalAge, ageLabel } from './age-intelligence.models';
import { formatDate } from './herd.shared';
interface Lineage {
  animalId: string;
  depth: number;
  limit: number;
  truncated: boolean;
  depthLimitReached?: boolean;
  referenceDate?: string;
  items: {
    animalId: string;
    identification: string;
    name: string | null;
    sex: string;
    direction: 'ANCESTOR' | 'DESCENDANT';
    generation: number;
    relatedToAnimalId: string;
    age?: AnimalAge | null;
  }[];
}
@Component({
  selector: 'app-animal-lineage',
  imports: [RouterLink, ErrorStateComponent, SkeletonComponent],
  template: `<details (toggle)="toggle($event)">
    <summary>Linhagem · ascendentes e descendentes</summary>
    <p>
      Vínculos maternos registrados. A consulta mostra apenas animais no escopo atual da fazenda e
      interrompe vínculos fora desse escopo.
    </p>
    @if (loading()) {
      <div aria-busy="true" aria-label="Carregando linhagem"><gr-skeleton /></div>
    } @else if (failed()) {
      <gr-error-state title="Não foi possível carregar a linhagem" (retry)="load()" />
    } @else if (result(); as data) {
      <p>Até {{ data.depth }} gerações · limite de {{ data.limit }} animais.</p>
      @if (data.referenceDate) { <p>Idades na referência {{ date(data.referenceDate) }}.</p> }
      @if (!data.items.length) {
        <p>Nenhum ascendente ou descendente disponível neste escopo.</p>
      }
      @for (direction of directions; track direction.code) {
        <h3>{{ direction.label }}</h3>
        <ul>
          @for (item of data.items; track item.animalId + item.direction) {
            @if (item.direction === direction.code) {
              <li>
                <a [routerLink]="['/rebanho/animais', item.animalId]"
                  >{{ item.identification }}{{ item.name ? ' · ' + item.name : '' }}</a
                >
                · geração {{ item.generation }} · {{ item.sex === 'FEMALE' ? 'Fêmea' : 'Macho' }} · {{ ageText(item.age) }}
              </li>
            }
          }
        </ul>
      }
      @if (data.truncated || data.depthLimitReached) {
        @if (data.truncated) {
          <p role="status">
            A linhagem atingiu o limite de animais. Podem existir outros vínculos neste escopo.
          </p>
        }
        @if (data.depthLimitReached) {
          <p role="status">
            A linhagem atingiu o limite de gerações. Existem vínculos além da profundidade
            consultada.
          </p>
        }
        @if (depth < 20 || limit < 500) {
          <button type="button" (click)="expand()">Ampliar consulta</button>
        }
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
      h3 {
        font-size: 1rem;
      }
      p,
      li {
        font-size: 0.85rem;
        line-height: 1.6;
        color: var(--color-text-muted);
      }
      a {
        color: var(--color-text);
      }
      ul {
        padding-left: 1.25rem;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnimalLineageComponent {
  readonly ageText = ageLabel;
  readonly date = formatDate;
  readonly animalId = input.required<string>();
  readonly result = signal<Lineage | null>(null);
  readonly loading = signal(false);
  readonly failed = signal(false);
  readonly directions = [
    { code: 'ANCESTOR', label: 'Ascendentes' },
    { code: 'DESCENDANT', label: 'Descendentes' },
  ];
  depth = 5;
  limit = 100;
  private opened = false;
  private readonly api = inject(ApiClient);
  private readonly context = inject(ContextStore);
  private readonly scope = new ContextRequestScope(inject(DestroyRef));
  constructor() {
    effect(() => {
      this.animalId();
      this.context.contextVersion();
      const farm = this.context.selectedFarm();
      const pending = this.context.transitionPending();
      untracked(() => {
        this.scope.reset();
        this.result.set(null);
        this.failed.set(false);
        this.loading.set(false);
        this.depth = 5;
        this.limit = 100;
        if (this.opened && farm && !pending) this.load();
      });
    });
  }
  toggle(event: Event) {
    this.opened = (event.target as HTMLDetailsElement).open;
    if (this.opened && !this.result() && !this.loading()) this.load();
  }
  expand() {
    this.depth = Math.min(20, this.depth * 2);
    this.limit = Math.min(500, this.limit * 2);
    this.load();
  }
  load() {
    if (!this.context.selectedFarm() || this.context.transitionPending()) return;
    this.scope.reset();
    this.result.set(null);
    this.failed.set(false);
    this.loading.set(true);
    this.scope.run(
      this.api.get<Lineage>(
        `/api/v1/herd/animals/${encodeURIComponent(this.animalId())}/lineage?depth=${this.depth}&limit=${this.limit}`,
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
