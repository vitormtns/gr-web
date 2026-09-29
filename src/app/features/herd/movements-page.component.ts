import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ContextStore } from '../../core/context/context.store';
import { PaginationComponent, TableComponent } from '../../design-system/data-display/data-display';
import { EmptyStateComponent, ErrorStateComponent } from '../../design-system/feedback/feedback';
import { ContextRequestScope, managementError } from '../management/management.shared';
import { HerdApi } from './herd-api.service';
import { MovementPage, PaddockRef } from './herd.models';
import { formatDate } from './herd.shared';

@Component({
  selector: 'app-movements-page',
  providers: [HerdApi],
  imports: [
    FormsModule,
    RouterLink,
    PaginationComponent,
    TableComponent,
    EmptyStateComponent,
    ErrorStateComponent,
  ],
  template: `<div class="herd-page page-enter">
    <header class="page-header">
      <div>
        <span class="eyebrow">TERRITÓRIO · {{ context.selectedFarm()?.farmName }}</span>
        <h1>Movimentações</h1>
        <p>Histórico de deslocamentos internos do rebanho entre piquetes.</p>
      </div>
      <a class="secondary-action" routerLink="/rebanho/animais">Selecionar animais</a>
    </header>
    <nav class="movement-filters" aria-label="Históricos de movimentação">
      <span class="primary-action" aria-current="page">Entre piquetes</span
      ><a class="secondary-action" routerLink="/rebanho/transferencias">Entre fazendas</a>
    </nav>
    <form class="movement-filters" (ngSubmit)="applyFilters()">
      <label>De<input type="date" name="from" [(ngModel)]="from" /></label
      ><label>Até<input type="date" name="to" [(ngModel)]="to" /></label
      ><label
        >Identificador do animal<input
          name="animal"
          [(ngModel)]="animalId"
          placeholder="UUID do animal (opcional)" /></label
      ><label
        >Piquete de origem<select name="source" [(ngModel)]="sourcePaddockId">
          <option value="">Todos</option>
          @for (paddock of paddocks(); track paddock.id) {
            <option [value]="paddock.id">
              {{ paddock.name }}{{ paddock.status === 'INACTIVE' ? ' (inativo)' : '' }}
            </option>
          }
        </select></label
      ><label
        >Piquete de destino<select name="destination" [(ngModel)]="destinationPaddockId">
          <option value="">Todos</option>
          @for (paddock of paddocks(); track paddock.id) {
            <option [value]="paddock.id">
              {{ paddock.name }}{{ paddock.status === 'INACTIVE' ? ' (inativo)' : '' }}
            </option>
          }
        </select></label
      ><button class="secondary-action" type="submit">Aplicar filtros</button>
      @if (filtered()) {
        <button class="quiet-button" type="button" (click)="clearFilters()">Limpar filtros</button>
      }
    </form>
    @if (state() === 'error') {
      <gr-error-state
        level="page"
        title="Não foi possível carregar as movimentações"
        [description]="error()"
        (retry)="load()"
      />
    } @else if (state() === 'ready' && !data()?.items?.length) {
      <div class="empty-frame">
        <gr-empty-state
          [title]="
            filtered()
              ? 'Nenhuma movimentação corresponde aos filtros'
              : 'Nenhuma movimentação registrada'
          "
          description="As mudanças de piquete aparecerão aqui quando forem realizadas pelo perfil ou pela seleção em lote."
        />
      </div>
    } @else {
      <section class="herd-surface">
        @if (data(); as result) {
          <div class="movement-summary">
            <div>
              <span>MOVIMENTOS NO FILTRO</span><strong>{{ result.summary.movementCount }}</strong>
            </div>
            <div>
              <span>ANIMAIS MOVIMENTADOS</span
              ><strong>{{ result.summary.distinctAnimalsMoved }}</strong>
            </div>
          </div>
        }
        <gr-table [loading]="state() === 'loading'"
          ><thead>
            <tr>
              <th>Data</th>
              <th>Animal</th>
              <th>Trajeto</th>
              <th>Observações</th>
            </tr>
          </thead>
          <tbody>
            @for (item of data()?.items || []; track item.id) {
              <tr>
                <td>{{ date(item.occurredOn) }}</td>
                <td>
                  <a [routerLink]="['/rebanho/animais', item.animal.id]"
                    ><strong>{{ item.animal.identification }}</strong>
                    @if (item.animal.name) {
                      <small>{{ item.animal.name }}</small>
                    }
                  </a>
                </td>
                <td>
                  <span class="route"
                    ><span>{{ item.sourcePaddock?.name || 'Sem piquete' }}</span
                    ><i>→</i><strong>{{ item.destinationPaddock.name }}</strong></span
                  >
                </td>
                <td>{{ item.notes || '—' }}</td>
              </tr>
            }
          </tbody></gr-table
        >
        @if (data(); as result) {
          <gr-pagination
            [page]="result.page"
            [totalPages]="result.totalPages"
            (pageChange)="changePage($event)"
          />
        }
      </section>
    }
  </div>`,
  styleUrl: './movements-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MovementsPageComponent {
  private readonly api = inject(HerdApi);
  private readonly scope = new ContextRequestScope(inject(DestroyRef));
  readonly context = inject(ContextStore);
  readonly state = signal<'loading' | 'ready' | 'error'>('loading');
  readonly data = signal<MovementPage | null>(null);
  readonly error = signal('');
  readonly page = signal(0);
  readonly paddocks = signal<PaddockRef[]>([]);
  date = formatDate;
  from = '';
  to = '';
  animalId = '';
  sourcePaddockId = '';
  destinationPaddockId = '';
  private filters: Parameters<HerdApi['movements']>[1] = {};
  constructor() {
    effect(() => {
      this.context.contextVersion();
      const pending = this.context.transitionPending();
      const farm = this.context.selectedFarm();
      untracked(() => {
        this.scope.reset();
        this.page.set(0);
        this.filters = {};
        this.from = '';
        this.to = '';
        this.animalId = '';
        this.sourcePaddockId = '';
        this.destinationPaddockId = '';
        this.paddocks.set([]);
        this.data.set(null);
        this.error.set('');
        this.state.set('loading');
        if (!pending && farm) this.load();
      });
    });
  }
  filtered() {
    return Object.values(this.filters || {}).some(Boolean);
  }
  applyFilters() {
    if (
      (this.from && this.to && this.from > this.to) ||
      (this.animalId.trim() &&
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          this.animalId.trim(),
        ))
    ) {
      this.state.set('error');
      this.error.set('Revise o período e o identificador do animal.');
      return;
    }
    this.filters = {
      from: this.from || undefined,
      to: this.to || undefined,
      animalId: this.animalId.trim() || undefined,
      sourcePaddockId: this.sourcePaddockId || undefined,
      destinationPaddockId: this.destinationPaddockId || undefined,
    };
    this.page.set(0);
    this.load();
  }
  clearFilters() {
    this.from = '';
    this.to = '';
    this.animalId = '';
    this.sourcePaddockId = '';
    this.destinationPaddockId = '';
    this.applyFilters();
  }
  changePage(page: number) {
    this.page.set(page);
    this.load();
  }
  load() {
    if (this.context.transitionPending() || !this.context.selectedFarm()) return;
    this.scope.reset();
    this.data.set(null);
    this.error.set('');
    this.state.set('loading');
    this.scope.run(
      forkJoin({
        movements: this.api.movements(this.page(), this.filters),
        paddocks: this.api.allPaddocks(undefined, true),
      }),
      (value) => {
        this.data.set(value.movements);
        this.paddocks.set(value.paddocks);
        this.state.set('ready');
      },
      (failure) => {
        this.error.set(
          managementError(
            failure,
            'Não foi possível carregar o histórico e os filtros. Tente novamente.',
          ),
        );
        this.state.set('error');
      },
    );
  }
}
