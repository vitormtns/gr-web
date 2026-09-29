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
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, Subject, takeUntil } from 'rxjs';
import { AnimalOperationalHistoryComponent } from './animal-operational-history.component';
import { ExactDecimalPipe } from '../management/exact-decimal';
import { ContextRequestScope } from '../management/management.shared';
import { validImportDate } from './herd-import';
import { AppError } from '../../core/api/api.models';
import { ContextStore } from '../../core/context/context.store';
import { localDateOnly } from '../../core/date/date-only';
import { PermissionService } from '../../core/permissions/permission.service';
import {
  PaginationComponent,
  StatusIndicatorComponent,
} from '../../design-system/data-display/data-display';
import {
  AlertComponent,
  ErrorStateComponent,
  SkeletonComponent,
  ToastService,
} from '../../design-system/feedback/feedback';
import { DialogComponent } from '../../design-system/surfaces/surfaces';
import { HerdApi } from './herd-api.service';
import {
  Animal,
  AnimalEvent,
  AnimalHistory,
  PaddockRef,
  animalTone,
  newUuid,
  sexLabels,
  statusLabels,
  terminalStatuses,
} from './herd.models';
import { errorReference, formatDate } from './herd.shared';
import {
  PendingWorkPage,
  PregnancyPage,
  WeightPage,
  pendingLabels,
  pregnancyLabels,
} from './herd-operations.models';

import { AnimalManagementComponent } from './animal-management.component';

type Action = 'correct' | 'move' | 'transfer' | 'weight' | null;
@Component({
  selector: 'app-animal-profile-page',
  providers: [HerdApi],
  imports: [
    ExactDecimalPipe,
    AnimalOperationalHistoryComponent,
    PaginationComponent,
    AnimalManagementComponent,
    FormsModule,
    RouterLink,
    StatusIndicatorComponent,
    AlertComponent,
    ErrorStateComponent,
    SkeletonComponent,
    DialogComponent,
  ],
  template: `<div class="herd-page profile page-enter">
    <a class="back-link" routerLink="/rebanho/animais">← Voltar ao rebanho</a>
    @if (state() === 'loading') {
      <div class="profile-skeleton" aria-label="Carregando perfil do animal">
        <gr-skeleton /><gr-skeleton /><gr-skeleton /><gr-skeleton />
      </div>
    } @else if (state() === 'error') {
      <gr-error-state
        level="page"
        title="Animal não encontrado ou indisponível neste contexto"
        [description]="profileErrorText()"
        [reference]="reference"
        (retry)="load()"
      />
    } @else if (animal(); as item) {
      <header class="profile-header">
        <div class="identity-block">
          <span class="identity-orbit" aria-hidden="true"><i></i></span>
          <div>
            <span class="eyebrow">IDENTIDADE ANIMAL</span>
            <h1>{{ item.identification }}</h1>
            @if (item.name) {
              <p>{{ item.name }}</p>
            }
          </div>
        </div>
        <div class="profile-actions">
          @if (permissions.canMutateHerd()) {
            <button class="secondary-action" type="button" (click)="openCorrection(item)">
              Corrigir dados
            </button>
          }
          @if (canOperate(item)) {
            <button class="secondary-action" type="button" (click)="openMovement()">
              Movimentar
            </button>
          }
          @if (canTransfer(item)) {
            <button class="primary-action" type="button" (click)="openTransfer()">
              Transferir
            </button>
          }
        </div>
      </header>
      @if (created()) {
        <gr-alert tone="success" title="Animal cadastrado"
          ><p>A identidade foi criada e o histórico já está disponível.</p></gr-alert
        >
      }
      @if (conflict()) {
        <gr-alert tone="warning" title="Os dados deste animal foram atualizados em outra sessão"
          ><p>Recarregue os dados antes de fazer uma nova alteração.</p>
          <button class="alert-action" type="button" (click)="load()">
            Recarregar dados
          </button></gr-alert
        >
      }
      <section class="state-strip" aria-label="Estado e território atuais">
        <div>
          <span>Estado atual</span
          ><gr-status-indicator [tone]="tone(item.status)">{{
            status(item.status)
          }}</gr-status-indicator>
        </div>
        <div>
          <span>Sexo</span><strong>{{ sex(item.sex) }}</strong>
        </div>
        <div>
          <span>Nascimento</span><strong>{{ date(item.birthDate) }}</strong>
        </div>
        <div class="territory-current">
          <span>Território atual</span><strong>{{ context.selectedFarm()?.farmName }}</strong
          ><small>› {{ item.paddock?.name || 'Sem piquete definido' }}</small>
        </div>
      </section>
      <section class="intelligence section-frame" aria-labelledby="intelligence-title">
        <header>
          <div>
            <span class="section-kicker">LEITURA DO ANIMAL</span>
            <h2 id="intelligence-title">Situação operacional</h2>
          </div>
          @if (canOperate(item)) {
            <button class="secondary-action" type="button" (click)="openWeight()">
              Registrar pesagem
            </button>
          }
        </header>
        @if (intelligenceError()) {
          <gr-error-state
            title="Parte da leitura operacional não pôde ser carregada"
            (retry)="loadIntelligence()"
          />
        } @else if (!weights() || !pendingWork() || (item.sex === 'FEMALE' && !pregnancies())) {
          <div class="timeline-loading"><gr-skeleton /><gr-skeleton /></div>
        } @else {
          <div class="intelligence-grid">
            <div>
              <span>Última pesagem</span>
              @if (latestWeight(); as weight) {
                <strong>{{ weight.weightKg | grDecimal }} kg</strong
                ><small>{{ date(weight.measuredOn) }}</small>
              } @else {
                <strong>Sem pesagens</strong><small>Nenhum peso registrado</small>
              }
            </div>
            <div>
              <span>Necessidades atuais</span><strong>{{ pendingWork()!.totalElements }}</strong
              ><small>{{ pendingSummary() }}</small>
            </div>
            @if (activePregnancy(); as pregnancy) {
              <div>
                <span>Gestação</span><strong>{{ pregnancyLabel(pregnancy.status) }}</strong
                ><small>{{
                  pregnancy.expectedCalvingOn
                    ? 'Parto esperado em ' + date(pregnancy.expectedCalvingOn)
                    : 'Sem data esperada'
                }}</small>
              </div>
            }
            @if (mother(); as relatedMother) {
              <div>
                <span>Mãe</span
                ><strong
                  ><a [routerLink]="['/rebanho/animais', relatedMother.id]">{{
                    relatedMother.identification
                  }}</a></strong
                ><small>{{ relatedMother.name || 'Sem nome informado' }}</small>
              </div>
            }
            @if (calves().length) {
              <div>
                <span>Crias consultadas</span><strong>{{ calves().length }}</strong
                ><small
                  >{{ calves()[0].identification
                  }}{{ calves().length > 1 ? ' e outras' : '' }}</small
                >
              </div>
            }
          </div>
          @if ((weights()?.items?.length || 0) > 1) {
            <div class="weight-evolution">
              <div>
                <strong>Evolução nas últimas pesagens</strong><span>{{ weightSummary() }}</span>
              </div>
              <svg viewBox="0 0 360 90" role="img" [attr.aria-label]="weightSummary()">
                <polyline
                  [attr.points]="weightPoints()"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="3"
                  vector-effect="non-scaling-stroke"
                />
              </svg>
            </div>
          }
        }
      </section>
      <app-animal-operational-history [animal]="item" /><app-animal-management
        [animal]="item"
        [mother]="mother()"
        (changed)="load()"
      />
      <div class="detail-grid">
        <section class="timeline section-frame" aria-labelledby="timeline-title">
          <header>
            <div>
              <span class="section-kicker">TRAJETÓRIA</span>
              <h2 id="timeline-title">Histórico do animal</h2>
            </div>
            @if (history(); as result) {
              <span>{{ result.totalElements }} {{ result.totalElements === 1 ? 'evento' : 'eventos' }}</span>
            }
          </header>
          <label class="history-type"
            >Tipo de evento<select [(ngModel)]="historyType" (ngModelChange)="loadHistory(0)">
              <option value="">Todos</option>
              @for (type of historyTypes; track type) {
                <option [value]="type">{{ historyTypeLabel(type) }}</option>
              }
            </select></label
          >
          @if (historyError()) {
            <gr-error-state
              title="Não foi possível carregar o histórico"
              [reference]="historyReference"
              (retry)="load()"
            />
          } @else if (!history()) {
            <div class="timeline-loading"><gr-skeleton /><gr-skeleton /><gr-skeleton /></div>
          } @else if (!visibleEvents().length) {
            <div class="timeline-empty">
              <strong>Nenhum evento disponível neste contexto.</strong>
              <p>Novos acontecimentos do ciclo de vida aparecerão aqui.</p>
            </div>
          } @else {
            <ol>
              @for (event of visibleEvents(); track event.id) {
                <li>
                  <span class="timeline-marker" aria-hidden="true"></span>
                  <div class="event">
                    <div>
                      <strong>{{ eventTitle(event) }}</strong
                      ><time [attr.datetime]="event.occurredOn || event.recordedAt">{{
                        eventDate(event)
                      }}</time>
                    </div>
                    <p>{{ eventSummary(event) }}</p>
                    <small
                      >Versão {{ event.resultingVersion }} ·
                      {{ event.actorUserId ? 'Autor registrado' : 'Autor não informado' }}</small
                    >
                    @if (event.type === 'MOTHER_CORRECTED') {
                      <div class="parity-actions">
                        @if (eventRelation(event, 'beforeMotherId'); as before) {
                          <a [routerLink]="['/rebanho/animais', before]">Ver mãe anterior</a>
                        }
                        @if (eventRelation(event, 'afterMotherId'); as after) {
                          <a [routerLink]="['/rebanho/animais', after]">Ver mãe vinculada</a>
                        }
                      </div>
                    }
                  </div>
                </li>
              }
            </ol>
            <gr-pagination
              [page]="history()!.page"
              [totalPages]="history()!.totalPages"
              (pageChange)="loadHistory($event)"
            />
          }
        </section>
        <aside class="facts section-frame">
          <span class="section-kicker">LEITURA ATUAL</span>
          <h2>Dados de identidade</h2>
          <dl>
            <div>
              <dt>Identificação</dt>
              <dd>{{ item.identification }}</dd>
            </div>
            <div>
              <dt>Nome</dt>
              <dd>{{ item.name || 'Não informado' }}</dd>
            </div>
            <div>
              <dt>Sexo</dt>
              <dd>{{ sex(item.sex) }}</dd>
            </div>
            <div>
              <dt>Nascimento</dt>
              <dd>{{ date(item.birthDate) }}</dd>
            </div>
          </dl>
        </aside>
      </div>
    }
    <gr-dialog [open]="action() === 'correct'" (closed)="closeAction()"
      ><span dialog-title>Corrigir dados do animal</span>
      <fieldset
        class="form-grid compact correction-fields"
        [disabled]="pending() || correctionReview()"
      >
        <label class="wide"
          ><span>Identificação</span
          ><input [(ngModel)]="editIdentification" maxlength="100" /></label
        ><label><span>Nome</span><input [(ngModel)]="editName" maxlength="255" /></label
        ><label
          ><span>Sexo</span
          ><select [(ngModel)]="editSex">
            <option value="FEMALE">Fêmea</option>
            <option value="MALE">Macho</option>
          </select></label
        ><label
          ><span>Nascimento</span><input type="date" [(ngModel)]="editBirthDate" [max]="today"
        /></label>
        @if (actionError()) {
          <p class="form-error wide" role="alert">{{ actionError() }}</p>
        }
      </fieldset>
      @if (correctionReview()) {
        <p class="custody-note">
          Confira a identificação, o sexo e o nascimento. A correção será registrada no histórico do
          animal.
        </p>
      }
      <div dialog-actions>
        <button class="quiet-button" type="button" (click)="closeAction()">Cancelar</button
        ><button
          class="primary-action"
          type="button"
          [disabled]="pending() || !editIdentification.trim()"
          (click)="correctionReview() ? saveCorrection() : prepareCorrection()"
        >
          {{ correctionReview() ? 'Confirmar correção' : 'Revisar correção' }}
        </button>
      </div></gr-dialog
    >
    <gr-dialog [open]="action() === 'move'" (closed)="closeAction()"
      ><span dialog-title>Movimentar animal</span>
      <div class="movement-review">
        <span>{{ animal()?.identification }}</span
        ><strong>{{ animal()?.paddock?.name || 'Sem piquete definido' }}</strong
        ><i aria-hidden="true">↓</i
        ><label
          >Destino<select
            [(ngModel)]="destinationPaddock"
            [disabled]="catalogLoading() || !!catalogError()"
          >
            <option value="">Selecione um piquete</option>
            @for (p of availablePaddocks(); track p.id) {
              <option [value]="p.id">{{ p.name }}</option>
            }
          </select></label
        >
        @if (catalogLoading()) {
          <p role="status">Carregando piquetes…</p>
        }
        @if (catalogError()) {
          <p role="alert" class="form-error">{{ catalogError() }}</p>
          <button class="quiet-button" type="button" (click)="loadMovementPaddocks()">
            Tentar novamente
          </button>
        }
        <label>Data do movimento<input type="date" [(ngModel)]="occurredOn" /></label
        ><label
          >Observações<textarea
            [(ngModel)]="notes"
            maxlength="1000"
            placeholder="Opcional"
          ></textarea>
        </label>
        @if (actionError()) {
          <p class="form-error" role="alert">{{ actionError() }}</p>
        }
      </div>
      <div dialog-actions>
        <button class="quiet-button" type="button" (click)="closeAction()">Cancelar</button
        ><button
          class="primary-action"
          type="button"
          [disabled]="pending() || !destinationPaddock || catalogLoading() || !!catalogError()"
          (click)="move()"
        >
          Confirmar movimentação
        </button>
      </div></gr-dialog
    >
    <gr-dialog [open]="action() === 'transfer'" (closed)="closeAction()"
      ><span dialog-title>Transferir custódia</span>
      <div class="movement-review">
        <span>{{ animal()?.identification }}</span
        ><strong>{{ context.selectedFarm()?.farmName }}</strong
        ><i aria-hidden="true">↓</i
        ><label
          >Fazenda de destino<select
            [(ngModel)]="destinationFarm"
            (ngModelChange)="loadDestinationPaddocks()"
          >
            <option value="">Selecione uma fazenda</option>
            @for (f of destinationFarms(); track f.farmId) {
              <option [value]="f.farmId">{{ f.farmName }}</option>
            }
          </select></label
        ><label
          >Piquete na fazenda de destino<select
            [(ngModel)]="transferPaddock"
            [disabled]="catalogLoading() || !!catalogError() || !destinationFarm"
          >
            <option value="">Sem piquete definido</option>
            @for (p of transferPaddocks(); track p.id) {
              <option [value]="p.id">{{ p.name }}</option>
            }
          </select></label
        >
        @if (catalogLoading()) {
          <p role="status">Carregando piquetes…</p>
        }
        @if (catalogError()) {
          <p role="alert" class="form-error">{{ catalogError() }}</p>
          <button type="button" class="quiet-button" (click)="loadDestinationPaddocks()">
            Tentar novamente
          </button>
        }
        <label>Data da transferência<input type="date" [(ngModel)]="occurredOn" /></label
        ><label
          >Observações<textarea
            [(ngModel)]="notes"
            maxlength="1000"
            placeholder="Opcional"
          ></textarea>
        </label>
        <p class="custody-note">
          A fazenda de destino assumirá a custódia operacional. Este perfil pode deixar de estar
          disponível no contexto atual.
        </p>
        @if (actionError()) {
          <p class="form-error" role="alert">{{ actionError() }}</p>
        }
      </div>
      <div dialog-actions>
        <button class="quiet-button" type="button" (click)="closeAction()">Cancelar</button
        ><button
          class="primary-action"
          type="button"
          [disabled]="pending() || !destinationFarm || catalogLoading() || !!catalogError()"
          (click)="transfer()"
        >
          Confirmar transferência
        </button>
      </div></gr-dialog
    >
    <gr-dialog [open]="action() === 'weight'" (closed)="closeAction()"
      ><span dialog-title>Registrar pesagem</span>
      <div class="form-grid compact">
        <label
          ><span>Peso (kg)</span
          ><input
            type="text"
            inputmode="decimal"
            [(ngModel)]="weightKg"
            placeholder="Ex.: 418,750" /></label
        ><label
          ><span>Data da pesagem</span
          ><input type="date" [(ngModel)]="occurredOn" [max]="today" /></label
        ><label class="wide"
          ><span>Observações</span
          ><textarea [(ngModel)]="notes" maxlength="1000" placeholder="Opcional"></textarea>
        </label>
        @if (actionError()) {
          <p class="form-error wide" role="alert">{{ actionError() }}</p>
        }
      </div>
      <div dialog-actions>
        <button class="quiet-button" type="button" (click)="closeAction()">Cancelar</button
        ><button
          class="primary-action"
          type="button"
          [disabled]="pending() || !validWeight()"
          (click)="recordWeight()"
        >
          Registrar pesagem
        </button>
      </div></gr-dialog
    >
  </div>`,
  styleUrls: [
    './animal-profile-page.component.scss',
    './operations-page.component.scss',
    './profile-intelligence.scss',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnimalProfilePageComponent {
  private readonly api = inject(HerdApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toast = inject(ToastService);
  readonly context = inject(ContextStore);
  readonly permissions = inject(PermissionService);
  readonly state = signal<'loading' | 'ready' | 'error'>('loading');
  readonly animal = signal<Animal | null>(null);
  readonly history = signal<AnimalHistory | null>(null);
  readonly weights = signal<WeightPage | null>(null);
  readonly pendingWork = signal<PendingWorkPage | null>(null);
  readonly pregnancies = signal<PregnancyPage | null>(null);
  readonly mother = signal<Animal | null>(null);
  readonly calves = signal<Animal[]>([]);
  readonly intelligenceError = signal(false);
  readonly error = signal<AppError | null>(null);
  readonly historyError = signal<AppError | null>(null);
  readonly action = signal<Action>(null);
  readonly correctionReview = signal(false);
  readonly actionError = signal('');
  readonly pending = signal(false);
  readonly paddocks = signal<PaddockRef[]>([]);
  readonly destinationFarms = signal<{ farmId: string; farmName: string }[]>([]);
  readonly conflict = signal(false);
  readonly created = signal(!!history.state?.['created']);
  readonly today = localDateOnly();
  private readonly cancel = new Subject<void>();
  private readonly intelligenceCancel = new Subject<void>();
  private readonly catalogScope = new ContextRequestScope(this.destroyRef);
  private readonly historyScope = new ContextRequestScope(this.destroyRef);
  readonly transferPaddocks = signal<PaddockRef[]>([]);
  readonly catalogLoading = signal(false);
  readonly catalogError = signal('');
  transferPaddock = '';
  historyType = '';
  readonly historyTypes = [
    'CREATED',
    'CORRECTED',
    'SOLD',
    'DECEASED',
    'MOVED',
    'TRANSFERRED_IN',
    'TRANSFERRED_OUT',
    'WEIGHED',
    'HEALTH_TREATMENT',
    'BREEDING_RECORDED',
    'PREGNANCY_CONFIRMED',
    'PREGNANCY_ENDED',
    'CALVED',
    'BORN',
    'MILK_RECORDED',
    'MOTHER_CORRECTED',
    'NOTE_RECORDED',
    'HEALTH_TREATMENT_RETRACTED',
  ];
  private generation = 0;
  private operationId = '';
  editIdentification = '';
  editName = '';
  editSex = 'FEMALE';
  editBirthDate = '';
  destinationPaddock = '';
  destinationFarm = '';
  occurredOn = this.today;
  notes = '';
  weightKg = '';
  constructor() {
    let initialRoute = true;
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (initialRoute) {
        initialRoute = false;
        return;
      }
      if (!this.context.transitionPending() && this.context.selectedFarm()) this.load();
    });
    effect(() => {
      this.context.contextVersion();
      const pending = this.context.transitionPending();
      const farm = this.context.selectedFarm();
      untracked(() => {
        this.clearEditorState();
        this.cancel.next();
        this.catalogScope.reset();
        this.historyScope.reset();
        this.transferPaddocks.set([]);
        this.catalogLoading.set(false);
        this.catalogError.set('');
        this.historyType = '';
        this.paddocks.set([]);
        this.destinationFarms.set([]);
        this.action.set(null);
        this.pending.set(false);
        if (pending || !farm) {
          this.generation++;
          this.animal.set(null);
          this.history.set(null);
          this.weights.set(null);
          this.pendingWork.set(null);
          this.pregnancies.set(null);
          this.mother.set(null);
          this.calves.set([]);
          this.state.set('loading');
          return;
        }
        this.load();
      });
    });
  }
  get id() {
    return this.route.snapshot.paramMap.get('animalId') || '';
  }
  get reference() {
    return errorReference(this.error()?.requestId);
  }
  get historyReference() {
    return errorReference(this.historyError()?.requestId);
  }
  tone = animalTone;
  status = (s: Animal['status']) => statusLabels[s];
  sex = (s: Animal['sex']) => sexLabels[s];
  date = formatDate;
  canOperate(a: Animal) {
    return this.permissions.canMutateHerd() && a.status === 'ACTIVE';
  }
  canTransfer(a: Animal) {
    return this.permissions.canTransferHerd() && a.status === 'ACTIVE';
  }
  load() {
    if (this.context.transitionPending() || !this.context.selectedFarm()) return;
    this.clearEditorState();
    this.cancel.next();
    this.catalogScope.reset();
    this.historyScope.reset();
    this.action.set(null);
    this.pending.set(false);
    this.animal.set(null);
    this.historyType = '';
    const id = this.id;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      this.state.set('error');
      this.error.set(
        new AppError(
          'not-found',
          'Animal não encontrado ou indisponível neste contexto.',
          404,
          'invalid_id',
        ),
      );
      return;
    }
    const generation = ++this.generation;
    this.state.set('loading');
    this.conflict.set(false);
    this.error.set(null);
    this.history.set(null);
    this.historyError.set(null);
    this.weights.set(null);
    this.pendingWork.set(null);
    this.pregnancies.set(null);
    this.api
      .animal(id)
      .pipe(takeUntilDestroyed(this.destroyRef), takeUntil(this.cancel))
      .subscribe({
        next: (a) => {
          if (generation !== this.generation) return;
          this.animal.set(a);
          this.state.set('ready');
          this.loadHistory(0);
          this.loadIntelligence(generation);
        },
        error: (e) => {
          if (generation !== this.generation) return;
          this.error.set(e instanceof AppError ? e : null);
          this.state.set('error');
        },
      });
  }
  loadIntelligence(generation = this.generation) {
    if (this.context.transitionPending() || !this.animal()) return;
    this.intelligenceCancel.next();
    this.weights.set(null);
    this.pendingWork.set(null);
    this.pregnancies.set(null);
    this.intelligenceError.set(false);
    this.mother.set(null);
    this.calves.set([]);
    const reads: {
      weights: ReturnType<HerdApi['weights']>;
      pending: ReturnType<HerdApi['pendingWork']>;
      pregnancies?: ReturnType<HerdApi['pregnancies']>;
    } = {
      weights: this.api.weights(this.id),
      pending: this.api.pendingWork({ animalId: this.id }),
    };
    if (this.animal()?.sex === 'FEMALE') reads.pregnancies = this.api.pregnancies(this.id);
    forkJoin(reads)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        takeUntil(this.cancel),
        takeUntil(this.intelligenceCancel),
      )
      .subscribe({
        next: (r) => {
          if (generation !== this.generation) return;
          this.weights.set(r.weights);
          this.pendingWork.set(r.pending);
          this.pregnancies.set(
            r.pregnancies || { items: [], page: 0, size: 20, totalElements: 0, totalPages: 0 },
          );
        },
        error: () => {
          if (generation === this.generation) this.intelligenceError.set(true);
        },
      });
    this.api
      .mother(this.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        takeUntil(this.cancel),
        takeUntil(this.intelligenceCancel),
      )
      .subscribe({
        next: (value) => {
          if (generation === this.generation) this.mother.set(value);
        },
        error: (error) => {
          if (
            generation === this.generation &&
            (!(error instanceof AppError) || error.kind !== 'not-found')
          )
            this.intelligenceError.set(true);
        },
      });
    if (this.animal()?.sex === 'FEMALE')
      this.api
        .calves(this.id)
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          takeUntil(this.cancel),
          takeUntil(this.intelligenceCancel),
        )
        .subscribe({
          next: (value) => {
            if (generation === this.generation) this.calves.set(value);
          },
          error: () => {
            if (generation === this.generation) this.intelligenceError.set(true);
          },
        });
  }
  loadHistory(page: number) {
    if (this.context.transitionPending() || !this.animal()) return;
    this.historyScope.reset();
    this.history.set(null);
    this.historyError.set(null);
    this.historyScope.run(
      this.api.history(this.id, page, this.historyType),
      (value) => this.history.set(value),
      (error) =>
        this.historyError.set(
          error instanceof AppError
            ? error
            : new AppError(
                'unavailable',
                'Não foi possível carregar o histórico.',
                503,
                'UNAVAILABLE',
              ),
        ),
    );
  }
  historyTypeLabel(type: string) {
    return this.eventTitle({ type } as AnimalEvent);
  }
  eventRelation(event: AnimalEvent, key: 'beforeMotherId' | 'afterMotherId') {
    const value = event.details[key];
    return typeof value === 'string' ? value : null;
  }
  visibleEvents() {
    return (this.history()?.items || []).filter((e) =>
      [
        'CREATED',
        'CORRECTED',
        'SOLD',
        'DECEASED',
        'MOVED',
        'TRANSFERRED_IN',
        'TRANSFERRED_OUT',
        'WEIGHED',
        'HEALTH_TREATMENT',
        'BREEDING_RECORDED',
        'PREGNANCY_CONFIRMED',
        'PREGNANCY_ENDED',
        'CALVED',
        'BORN',
        'MILK_RECORDED',
        'MOTHER_CORRECTED',
        'NOTE_RECORDED',
        'HEALTH_TREATMENT_RETRACTED',
      ].includes(e.type),
    );
  }
  eventTitle(e: AnimalEvent) {
    return (
      {
        CREATED: 'Identidade criada',
        CORRECTED: 'Dados corrigidos',
        SOLD: 'Venda registrada',
        DECEASED: 'Baixa registrada',
        MOVED: 'Mudança de território',
        TRANSFERRED_IN: 'Custódia recebida',
        TRANSFERRED_OUT: 'Custódia transferida',
        WEIGHED: 'Pesagem registrada',
        HEALTH_TREATMENT: 'Tratamento realizado',
        BREEDING_RECORDED: 'Serviço reprodutivo registrado',
        PREGNANCY_CONFIRMED: 'Gestação confirmada',
        PREGNANCY_ENDED: 'Acompanhamento reprodutivo encerrado',
        CALVED: 'Parto registrado',
        BORN: 'Nascimento registrado',
        MILK_RECORDED: 'Produção de leite registrada',
        MOTHER_CORRECTED: 'Vínculo materno corrigido',
        NOTE_RECORDED: 'Observação registrada',
        HEALTH_TREATMENT_RETRACTED: 'Tratamento retraído',
      }[e.type] || 'Evento do animal'
    );
  }
  eventDate(e: AnimalEvent) {
    return e.occurredOn
      ? this.date(e.occurredOn)
      : new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(
          new Date(e.recordedAt),
        );
  }
  eventSummary(e: AnimalEvent) {
    const d = e.details || {};
    if (e.type === 'MILK_RECORDED')
      return `Produção registrada: ${typeof d['liters'] === 'number' ? Number(d['liters']).toLocaleString('pt-BR') : 'valor disponível no histórico de leite'} L. ${typeof d['notes'] === 'string' ? d['notes'] : ''}`;
    if (e.type === 'MOTHER_CORRECTED')
      return d['afterMotherId']
        ? 'Vínculo materno definido ou corrigido. O vínculo anterior permanece no fato auditado.'
        : 'Vínculo materno manual removido.';
    if (e.type === 'HEALTH_TREATMENT_RETRACTED')
      return typeof d['reason'] === 'string'
        ? d['reason']
        : 'Tratamento retirado dos fatos efetivos, com auditoria preservada.';
    if (e.type === 'MOVED')
      return `${d['sourcePaddockName'] || 'Sem piquete'} → ${d['destinationPaddockName'] || 'Destino registrado'}`;
    if (e.type === 'TRANSFERRED_IN' || e.type === 'TRANSFERRED_OUT')
      return `${d['sourceFarmName'] || 'Origem protegida'} → ${d['destinationFarmName'] || 'Destino protegido'}`;
    if (e.type === 'CORRECTED') {
      const changes = d['changes'] as Record<string, unknown> | undefined;
      return changes
        ? `${Object.keys(changes).length} ${Object.keys(changes).length === 1 ? 'campo corrigido' : 'campos corrigidos'}.`
        : 'Dados cadastrais atualizados.';
    }
    if (e.type === 'CREATED') return 'Início do histórico nesta fazenda.';
    return typeof d['notes'] === 'string' && d['notes']
      ? String(d['notes'])
      : 'Evento registrado no ciclo de vida.';
  }
  profileErrorText() {
    const e = this.error();
    return e?.kind === 'unavailable'
      ? 'O serviço está temporariamente indisponível. Tente novamente em instantes.'
      : 'O identificador não existe ou não está acessível nesta fazenda.';
  }
  openCorrection(a: Animal) {
    if (this.pending() || this.context.transitionPending() || !this.permissions.canMutateHerd())
      return;
    this.actionError.set('');
    this.correctionReview.set(false);
    this.editIdentification = a.identification;
    this.editName = a.name || '';
    this.editSex = a.sex;
    this.editBirthDate = a.birthDate || '';
    this.action.set('correct');
  }
  openMovement() {
    if (
      this.pending() ||
      this.context.transitionPending() ||
      !this.animal() ||
      !this.canOperate(this.animal()!)
    )
      return;
    this.resetOperation();
    this.action.set('move');
    this.loadMovementPaddocks();
  }
  openTransfer() {
    if (
      this.pending() ||
      this.context.transitionPending() ||
      !this.animal() ||
      !this.canTransfer(this.animal()!)
    )
      return;
    this.resetOperation();
    this.action.set('transfer');
    this.destinationFarms.set(
      this.context.farms().filter((f) => f.farmId !== this.context.selectedFarm()?.farmId),
    );
  }
  openWeight() {
    if (
      this.pending() ||
      this.context.transitionPending() ||
      !this.animal() ||
      !this.canOperate(this.animal()!)
    )
      return;
    this.resetOperation();
    this.weightKg = '';
    this.action.set('weight');
  }
  closeAction() {
    if (!this.pending()) {
      this.clearEditorState();
    }
  }
  private clearEditorState() {
    this.action.set(null);
    this.pending.set(false);
    this.correctionReview.set(false);
    this.actionError.set('');
    this.catalogScope.reset();
    this.transferPaddocks.set([]);
    this.paddocks.set([]);
    this.catalogLoading.set(false);
    this.catalogError.set('');
    this.destinationFarms.set([]);
    this.editIdentification = '';
    this.editName = '';
    this.editSex = 'FEMALE';
    this.editBirthDate = '';
    this.destinationPaddock = '';
    this.destinationFarm = '';
    this.transferPaddock = '';
    this.notes = '';
    this.weightKg = '';
    this.operationId = '';
  }
  saveCorrection() {
    const a = this.animal();
    if (
      !a ||
      !this.correctionReview() ||
      this.pending() ||
      this.context.transitionPending() ||
      !this.permissions.canMutateHerd() ||
      !this.editIdentification.trim()
    )
      return;
    this.mutate(
      this.api.correct(a.id, {
        expectedVersion: a.version,
        identification: this.editIdentification.trim(),
        name: this.editName.trim() || null,
        sex: this.editSex,
        birthDate: this.editBirthDate || null,
      }),
      'Dados do animal corrigidos',
    );
  }
  prepareCorrection() {
    if (
      this.pending() ||
      this.context.transitionPending() ||
      !this.permissions.canMutateHerd() ||
      this.action() !== 'correct'
    )
      return;
    if (
      !this.editIdentification.trim() ||
      this.editIdentification.trim().length > 100 ||
      this.editName.trim().length > 255 ||
      !['FEMALE', 'MALE'].includes(this.editSex) ||
      (this.editBirthDate &&
        (!validImportDate(this.editBirthDate) || this.editBirthDate > this.today))
    ) {
      this.actionError.set('Revise a identificação, o sexo e a data de nascimento.');
      return;
    }
    this.actionError.set('');
    this.correctionReview.set(true);
  }
  move() {
    if (!this.validOperationDate()) return;
    const a = this.animal();
    if (
      !a ||
      this.pending() ||
      this.context.transitionPending() ||
      !this.canOperate(a) ||
      this.catalogLoading() ||
      this.catalogError() ||
      !this.destinationPaddock ||
      !this.paddocks().some((p) => p.id === this.destinationPaddock)
    )
      return;
    this.mutate(
      this.api.move(a.id, {
        operationId: this.operationId,
        expectedVersion: a.version,
        destinationPaddockId: this.destinationPaddock,
        occurredOn: this.occurredOn,
        notes: this.notes.trim() || null,
      }),
      'Localização atualizada',
    );
  }
  transfer() {
    if (!this.validOperationDate()) return;
    const a = this.animal();
    if (
      !a ||
      this.pending() ||
      this.context.transitionPending() ||
      !this.canTransfer(a) ||
      this.catalogLoading() ||
      this.catalogError() ||
      !this.destinationFarms().some((f) => f.farmId === this.destinationFarm) ||
      (this.transferPaddock && !this.transferPaddocks().some((p) => p.id === this.transferPaddock))
    )
      return;
    const g = this.generation;
    this.pending.set(true);
    this.actionError.set('');
    this.api
      .transfer(a.id, {
        operationId: this.operationId,
        expectedVersion: a.version,
        destinationFarmId: this.destinationFarm,
        destinationPaddockId: this.transferPaddock || null,
        occurredOn: this.occurredOn,
        notes: this.notes.trim() || null,
      })
      .pipe(takeUntilDestroyed(this.destroyRef), takeUntil(this.cancel))
      .subscribe({
        next: (r) => {
          if (g !== this.generation) return;
          this.pending.set(false);
          this.action.set(null);
          this.toast.show(
            'success',
            'Custódia transferida',
            `${a.identification} agora está sob custódia de ${r.destinationFarm.name}.`,
          );
          void this.router.navigate(['/rebanho/animais']);
        },
        error: (e) => {
          if (g === this.generation) this.handleMutationError(e);
        },
      });
  }
  validWeight() {
    return (
      /^\d{1,5}([.,]\d{1,3})?$/.test(this.weightKg.trim()) &&
      Number(this.weightKg.replace(',', '.')) > 0
    );
  }
  recordWeight() {
    if (!this.validOperationDate()) return;
    const g = this.generation;
    const a = this.animal();
    if (
      !a ||
      this.pending() ||
      this.context.transitionPending() ||
      !this.canOperate(a) ||
      !this.validWeight()
    )
      return;
    this.pending.set(true);
    this.actionError.set('');
    this.api
      .recordWeight(a.id, {
        operationId: this.operationId,
        expectedVersion: a.version,
        weightKg: this.weightKg.replace(',', '.'),
        measuredOn: this.occurredOn,
        notes: this.notes.trim() || null,
      })
      .pipe(takeUntilDestroyed(this.destroyRef), takeUntil(this.cancel))
      .subscribe({
        next: (r) => {
          if (g !== this.generation) return;
          this.pending.set(false);
          this.action.set(null);
          this.toast.show('success', r.replayed ? 'Pesagem já registrada' : 'Pesagem registrada');
          this.load();
        },
        error: (e) => {
          if (g === this.generation) this.handleMutationError(e);
        },
      });
  }
  latestWeight() {
    return this.weights()?.items?.[0] || null;
  }
  activePregnancy() {
    return (
      this.pregnancies()?.items.find((p) => p.status === 'CONFIRMED' || p.status === 'POSSIBLE') ||
      null
    );
  }
  pregnancyLabel = (v: keyof typeof pregnancyLabels) => pregnancyLabels[v];
  pendingSummary() {
    const items = this.pendingWork()?.items || [];
    return items.length
      ? items
          .slice(0, 2)
          .map((i) => pendingLabels[i.type])
          .join(' · ')
      : 'Nenhuma pendência';
  }
  weightSummary() {
    const xs = [...(this.weights()?.items || [])].reverse();
    if (xs.length < 2) return 'Dados insuficientes para calcular evolução.';
    const first = Number(xs[0].weightKg),
      last = Number(xs[xs.length - 1].weightKg),
      delta = last - first;
    return `${xs.length} pesagens: de ${first.toLocaleString('pt-BR')} kg para ${last.toLocaleString('pt-BR')} kg (${delta >= 0 ? '+' : ''}${delta.toLocaleString('pt-BR')} kg).`;
  }
  weightPoints() {
    const xs = [...(this.weights()?.items || [])].reverse().map((x) => Number(x.weightKg));
    if (xs.length < 2) return '';
    const min = Math.min(...xs),
      max = Math.max(...xs),
      span = max - min || 1;
    return xs
      .map((v, i) => `${(i / (xs.length - 1)) * 350 + 5},${82 - ((v - min) / span) * 74}`)
      .join(' ');
  }
  private mutate(request: ReturnType<HerdApi['correct']>, message: string) {
    const g = this.generation;
    this.pending.set(true);
    this.actionError.set('');
    request.pipe(takeUntilDestroyed(this.destroyRef), takeUntil(this.cancel)).subscribe({
      next: (a) => {
        if (g !== this.generation) return;
        this.pending.set(false);
        this.action.set(null);
        this.animal.set(a);
        this.toast.show('success', message);
        this.load();
      },
      error: (e) => {
        if (g === this.generation) this.handleMutationError(e);
      },
    });
  }
  private handleMutationError(error: unknown) {
    this.pending.set(false);
    const e = error instanceof AppError ? error : null;
    if (e?.code === 'HERD_VERSION_CONFLICT') {
      this.action.set(null);
      this.conflict.set(true);
      return;
    }
    this.actionError.set(
      e?.code === 'HERD_OPERATION_IDEMPOTENCY_CONFLICT'
        ? 'Esta tentativa usa uma operação já registrada com dados diferentes.'
        : e?.message || 'Não foi possível concluir a ação.',
    );
  }
  validOperationDate() {
    const animal = this.animal();
    if (
      !validImportDate(this.occurredOn) ||
      this.occurredOn > this.today ||
      (animal?.birthDate && this.occurredOn < animal.birthDate)
    ) {
      this.actionError.set('Informe uma data válida entre o nascimento e o dia atual.');
      return false;
    }
    return true;
  }
  private resetOperation() {
    this.catalogScope.reset();
    this.paddocks.set([]);
    this.transferPaddock = '';
    this.transferPaddocks.set([]);
    this.catalogLoading.set(false);
    this.catalogError.set('');
    this.operationId = newUuid();
    this.destinationPaddock = '';
    this.destinationFarm = '';
    this.occurredOn = this.today;
    this.notes = '';
    this.actionError.set('');
  }
  loadMovementPaddocks() {
    if (this.pending() || this.context.transitionPending() || this.action() !== 'move') return;
    this.catalogScope.reset();
    this.paddocks.set([]);
    this.catalogLoading.set(true);
    this.catalogError.set('');
    this.catalogScope.run(
      this.api.allPaddocks(),
      (items) => {
        this.paddocks.set(items);
        this.catalogLoading.set(false);
      },
      () => {
        this.catalogLoading.set(false);
        this.catalogError.set('Não foi possível carregar os piquetes disponíveis.');
      },
    );
  }
  loadDestinationPaddocks() {
    if (this.pending() || this.context.transitionPending() || this.action() !== 'transfer') return;
    this.catalogScope.reset();
    this.transferPaddock = '';
    this.transferPaddocks.set([]);
    this.catalogError.set('');
    this.catalogLoading.set(false);
    const org = this.context.selectedOrganization();
    if (!org || !this.destinationFarms().some((f) => f.farmId === this.destinationFarm)) return;
    this.catalogLoading.set(true);
    this.catalogScope.run(
      this.api.allPaddocks({ organizationId: org.organizationId, farmId: this.destinationFarm }),
      (items) => {
        this.transferPaddocks.set(items);
        this.catalogLoading.set(false);
      },
      () => {
        this.catalogLoading.set(false);
        this.catalogError.set('Não foi possível carregar os piquetes de destino. Tente novamente.');
      },
    );
  }
  availablePaddocks() {
    return this.paddocks().filter((p) => p.id !== this.animal()?.paddock?.id);
  }
}
