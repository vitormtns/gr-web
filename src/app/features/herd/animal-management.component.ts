import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, Observable } from 'rxjs';
import { AppError } from '../../core/api/api.models';
import { ContextStore } from '../../core/context/context.store';
import { PermissionService } from '../../core/permissions/permission.service';
import { localDateOnly } from '../../core/date/date-only';
import { PaginationComponent } from '../../design-system/data-display/data-display';
import {
  ErrorStateComponent,
  SkeletonComponent,
  ToastService,
} from '../../design-system/feedback/feedback';
import { DialogComponent } from '../../design-system/surfaces/surfaces';
import { AnimalPickerComponent } from './animal-picker.component';
import { Animal, newUuid } from './herd.models';
import { ParityApi } from './parity-api.service';
import {
  CountedPage,
  LifecycleCommand,
  MilkRecord,
  MilkSession,
  MilkSummary,
  SaleChannel,
  milkSessionLabels,
  milkTrendLabels,
  saleChannelLabels,
} from './parity.models';
import { ContextRequestScope } from '../management/management.shared';
import { HerdApi } from './herd-api.service';
import { errorReference, formatDate } from './herd.shared';
import { validImportDate } from './herd-import';

type Action = 'mother' | 'note' | 'milk' | 'sale' | 'death' | null;
@Component({
  selector: 'app-animal-management',
  imports: [
    FormsModule,
    AnimalPickerComponent,
    PaginationComponent,
    ErrorStateComponent,
    SkeletonComponent,
    DialogComponent,
  ],
  template: `
    @if (showActions()) {
      <section class="section-frame parity-section">
        <h2>Registro e gestão</h2>
        <div class="parity-actions">
          @if (permissions.canMutateHerd()) {
            <button class="secondary-action" type="button" (click)="open('note')">
              Adicionar observação</button
            ><button class="secondary-action" type="button" (click)="open('mother')">
              Corrigir vínculo materno
            </button>
            @if (animal().status === 'ACTIVE') {
              <button class="secondary-action" type="button" (click)="open('death')">
                Registrar morte
              </button>
              @if (animal().sex === 'FEMALE') {
                <button class="primary-action" type="button" (click)="open('milk')">
                  Registrar leite
                </button>
              }
            }
          }
          @if (permissions.canSellHerd() && animal().status === 'ACTIVE') {
            <button class="secondary-action" type="button" (click)="open('sale')">
              Registrar venda
            </button>
          }
        </div>
        <p>
          Observações e correções entram no histórico auditado do animal. Os fatos de venda e morte
          preservam seus detalhes.
        </p>
      </section>
    }
    @if (showProduction() && animal().sex === 'FEMALE') {
      <section class="section-frame parity-section">
        <h2>Produção de leite</h2>
        @if (loading()) {
          <gr-skeleton /><gr-skeleton />
        } @else if (readError()) {
          <gr-error-state
            title="Não foi possível carregar a produção"
            [reference]="readReference()"
            (retry)="loadMilk()"
          />
        } @else {
          <div class="metric-strip">
            <div>
              <span>Último registro</span
              ><strong>{{
                summary()?.lastRecord ? liters(summary()!.lastRecord!.liters) : 'Sem registro'
              }}</strong
              ><small>{{ date(summary()?.lastRecord?.recordedOn || null) }}</small>
            </div>
            <div>
              <span>Média por registro · últimos 7 dias</span
              ><strong>{{ liters(summary()?.averageLitersLast7Days ?? null) }}</strong>
            </div>
            <div>
              <span>Leitura da produção</span
              ><strong>{{ trendLabels[summary()?.trend || 'INSUFFICIENT_DATA'] }}</strong
              ><small
                >{{ summary()?.recordsLast7Days || 0 }}
                {{ summary()?.recordsLast7Days === 1 ? 'registro' : 'registros' }} em 7 dias</small
              >
            </div>
          </div>
          <p>A tendência é calculada pelo serviço; não representa diagnóstico veterinário.</p>
          @if (!milk()?.totalElements) {
            <p>Nenhum registro de leite para este animal.</p>
          } @else {
            <div class="responsive-table">
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Turno</th>
                    <th>Produção</th>
                    <th>Observações</th>
                  </tr>
                </thead>
                <tbody>
                  @for (record of milk()?.items || []; track record.id) {
                    <tr>
                      <td>{{ date(record.recordedOn) }}</td>
                      <td>
                        {{ record.session ? sessionLabels[record.session] : 'Não informado' }}
                      </td>
                      <td>{{ liters(record.liters) }}</td>
                      <td>{{ record.notes || 'Sem observações' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <gr-pagination
              [page]="milk()?.page || 0"
              [totalPages]="milkPages()"
              (pageChange)="loadMilk($event)"
            />
          }
        }
      </section>
    }
    <gr-dialog [open]="action() !== null" (closed)="close()"
      ><span dialog-title>{{ actionTitle() }}</span>
      @if (confirming()) {
        <section class="semantic-note">
          <h3>Revise o registro</h3>
          <p>{{ animal().identification }} · Versão consultada: {{ reviewedVersion() }}</p>
          @if (action() !== 'mother') {
            <p>Data: {{ date(occurredOn) }}</p>
          }
          @if (action() === 'milk') {
            <p>
              Produção: {{ milkLiters }} L ·
              {{ session ? sessionLabels[session] : 'Turno não informado' }}
            </p>
          }
          @if (action() === 'sale') {
            <p>
              Comprador: {{ saleBuyer || 'Não informado' }} · Valor:
              {{ saleAmount || 'Não informado' }}
            </p>
          }
          @if (action() === 'death') {
            <p>Motivo: {{ deathReason || 'Não informado' }}</p>
          }
          @if (action() === 'mother') {
            <p>
              Vínculo:
              {{ removeMother ? 'Remover vínculo manual' : selectedMother()?.identification }}
            </p>
          }
          @if (notes) {
            <p>{{ notes }}</p>
          }
          <p>Confirme para registrar este fato no histórico do animal.</p>
        </section>
      }
      @if (!confirming()) {
        <fieldset class="form-grid compact" [disabled]="saving() || preparing() || confirming()">
          @if (action() === 'mother') {
            <p class="wide">
              Vínculo atual:
              {{ mother()?.identification || 'Nenhuma mãe acessível neste contexto' }}
            </p>
            <p class="semantic-note wide">
              A alteração será registrada com o vínculo anterior e o novo. Vínculos originados de
              parto registrado são protegidos pelo serviço.
            </p>
            <p class="wide">
              {{
                selectedMother()
                  ? 'Nova mãe: ' + selectedMother()!.identification
                  : 'Selecione a nova mãe ou confirme a remoção do vínculo manual.'
              }}
            </p>
            <app-animal-picker
              class="wide"
              label="Buscar mãe na fazenda"
              sex="FEMALE"
              status=""
              [excluded]="[animal().id]"
              [disabled]="saving()"
              (chosen)="selectedMother.set($event); removeMother = false"
            /><label class="wide"
              ><span
                ><input
                  type="checkbox"
                  [(ngModel)]="removeMother"
                  (ngModelChange)="selectedMother.set(null)"
                />
                Remover vínculo materno manual</span
              ></label
            >
          }
          @if (action() !== 'mother') {
            <label
              >Data<input
                type="date"
                [(ngModel)]="occurredOn"
                [max]="today"
                [min]="animal().birthDate || ''"
            /></label>
          }
          @if (action() === 'milk') {
            <label
              >Litros<input
                type="text"
                inputmode="decimal"
                [(ngModel)]="milkLiters"
                placeholder="Ex.: 12,500" /></label
            ><label
              >Turno<select [(ngModel)]="session">
                <option [ngValue]="null">Não informado</option>
                <option value="MORNING">Manhã</option>
                <option value="AFTERNOON">Tarde</option>
                <option value="EVENING">Noite</option>
              </select></label
            >
          }
          @if (action() === 'sale') {
            <label
              >Canal<select [(ngModel)]="saleChannel">
                <option [ngValue]="null">Não informado</option>
                <option value="DIRECT">Venda direta</option>
                <option value="AUCTION">Leilão</option>
                <option value="SLAUGHTERHOUSE">Frigorífico</option>
              </select></label
            ><label
              >Comprador<input
                [(ngModel)]="saleBuyer"
                maxlength="240"
                placeholder="Opcional" /></label
            ><label
              >Valor da venda (R$)<input
                type="text"
                inputmode="decimal"
                [(ngModel)]="saleAmount"
                placeholder="Opcional"
            /></label>
            <p class="semantic-note wide">
              A venda retira o animal do rebanho ativo. Este registro não cria receita ou liquidação
              financeira automaticamente.
            </p>
          }
          @if (action() === 'death') {
            <label class="wide"
              >Motivo da morte<input
                [(ngModel)]="deathReason"
                maxlength="240"
                placeholder="Opcional"
            /></label>
            <p class="semantic-note wide">
              A baixa retira o animal do rebanho ativo e preserva o motivo informado.
            </p>
          }
          @if (action() !== 'mother') {
            <label class="wide"
              >Observações<textarea
                [(ngModel)]="notes"
                [maxlength]="action() === 'note' ? 2000 : 1000"
                [placeholder]="action() === 'note' ? 'Descreva a observação' : 'Opcional'"
              ></textarea>
            </label>
          }
        </fieldset>
      }
      @if (actionError()) {
        <p class="form-error" role="alert">{{ actionError() }}</p>
      }
      <div dialog-actions>
        <button
          class="quiet-button"
          type="button"
          [disabled]="saving() || preparing()"
          (click)="close()"
        >
          Voltar
        </button>
        @if (confirming()) {
          <button class="secondary-action" type="button" [disabled]="saving()" (click)="edit()">
            Alterar dados
          </button>
        }
        <button
          class="primary-action"
          type="button"
          [disabled]="saving() || preparing() || (!confirming() && !valid())"
          (click)="confirming() ? submit() : prepare()"
        >
          {{
            saving()
              ? 'Registrando…'
              : preparing()
                ? 'Consultando versão…'
                : confirming()
                  ? 'Confirmar registro'
                  : 'Revisar registro'
          }}
        </button>
      </div></gr-dialog
    >
  `,
  styleUrls: ['./herd-page.scss', './operations-page.component.scss', './parity.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnimalManagementComponent {
  readonly animal = input.required<Animal>();
  readonly mother = input<Animal | null>(null);
  readonly showActions = input(true);
  readonly showProduction = input(true);
  readonly changed = output<void>();
  readonly permissions = inject(PermissionService);
  private readonly context = inject(ContextStore);
  private readonly api = inject(ParityApi);
  private readonly herd = inject(HerdApi);
  private readonly destroy = inject(DestroyRef);
  private readonly toast = inject(ToastService);
  readonly action = signal<Action>(null);
  readonly saving = signal(false);
  readonly actionError = signal('');
  readonly selectedMother = signal<Animal | null>(null);
  readonly summary = signal<MilkSummary | null>(null);
  readonly milk = signal<CountedPage<MilkRecord> | null>(null);
  readonly loading = signal(true);
  readonly readError = signal<AppError | null>(null);
  readonly sessionLabels = milkSessionLabels;
  readonly trendLabels = milkTrendLabels;
  private readonly readScope = new ContextRequestScope(this.destroy);
  private readonly writeScope = new ContextRequestScope(this.destroy);
  readonly confirming = signal(false);
  readonly preparing = signal(false);
  readonly reviewedVersion = signal<number | null>(null);
  private reviewedRequest: (() => Observable<unknown>) | null = null;
  private operationId = '';
  today = localDateOnly();
  occurredOn = this.today;
  notes = '';
  removeMother = false;
  milkLiters = '';
  session: MilkSession | null = null;
  saleChannel: SaleChannel | null = null;
  saleBuyer = '';
  saleAmount = '';
  deathReason = '';
  constructor() {
    effect(() => {
      this.context.contextVersion();
      const pending = this.context.transitionPending();
      const a = this.animal();
      untracked(() => {
        this.readScope.reset();
        this.writeScope.reset();
        this.resetDraft();
        this.action.set(null);
        this.saving.set(false);
        this.readError.set(null);
        this.loading.set(false);
        this.summary.set(null);
        this.milk.set(null);
        if (!pending && a.sex === 'FEMALE' && this.showProduction()) this.loadMilk();
      });
    });
    effect(() => {
      if (
        this.showProduction() &&
        this.animal().sex === 'FEMALE' &&
        !this.summary() &&
        !this.loading() &&
        !this.readError()
      ) {
        untracked(() => this.loadMilk());
      }
    });
  }
  loadMilk(page = 0) {
    this.readScope.reset();
    if (this.context.transitionPending() || this.animal().sex !== 'FEMALE') return;
    this.loading.set(true);
    this.readError.set(null);
    this.readScope.run(
      forkJoin({
        history: this.api.milkHistory(this.animal().id, page),
        summary: this.api.milkSummary(this.animal().id),
      }),
      (value) => {
        this.milk.set(value.history);
        this.summary.set(value.summary);
        this.loading.set(false);
      },
      (e) => {
        this.readError.set(
          e instanceof AppError
            ? e
            : new AppError(
                'unavailable',
                'Não foi possível carregar a produção.',
                503,
                'READ_FAILED',
              ),
        );
        this.loading.set(false);
      },
    );
  }
  resetDraft() {
    this.confirming.set(false);
    this.preparing.set(false);
    this.reviewedVersion.set(null);
    this.reviewedRequest = null;
    this.operationId = '';
    this.actionError.set('');
    this.selectedMother.set(null);
    this.removeMother = false;
    this.today = localDateOnly();
    this.occurredOn = this.today;
    this.notes = '';
    this.milkLiters = '';
    this.session = null;
    this.saleAmount = '';
    this.saleBuyer = '';
    this.saleChannel = null;
    this.deathReason = '';
  }
  open(action: Exclude<Action, null>) {
    if (
      !this.allowed(action) ||
      this.context.transitionPending() ||
      this.saving() ||
      this.preparing()
    )
      return;
    this.writeScope.reset();
    this.resetDraft();
    this.action.set(action);
  }
  allowed(action: Action) {
    const a = this.animal();
    return action === 'sale'
      ? this.permissions.canSellHerd() && a.status === 'ACTIVE'
      : this.permissions.canMutateHerd() &&
          (action === 'note' ||
            action === 'mother' ||
            (a.status === 'ACTIVE' && (action !== 'milk' || a.sex === 'FEMALE')));
  }
  valid() {
    const action = this.action();
    if (!action) return false;
    if (!this.allowed(action)) return false;
    if (action === 'mother') return this.removeMother || !!this.selectedMother();
    if (
      [...this.notes.trim()].length > (action === 'note' ? 2000 : 1000) ||
      [...this.saleBuyer.trim()].length > 240 ||
      [...this.deathReason.trim()].length > 240
    )
      return false;
    if (
      !validImportDate(this.occurredOn) ||
      this.occurredOn > this.today ||
      (this.animal().birthDate && this.occurredOn < this.animal().birthDate!)
    )
      return false;
    if (action === 'note') return !!this.notes.trim() && [...this.notes.trim()].length <= 2000;
    if (action === 'milk')
      return (
        /^\d{1,6}([.,]\d{1,3})?$/.test(this.milkLiters) &&
        Number(this.milkLiters.replace(',', '.')) > 0
      );
    if (action === 'sale' && this.saleAmount) return this.saleDecimal() !== null;
    return true;
  }
  saleDecimal(): string | null {
    const value = this.saleAmount.trim().replace(',', '.');
    if (!/^\d+(\.\d{1,2})?$/.test(value)) return null;
    const [whole, fraction = ''] = value.split('.');
    const normalizedWhole = whole.replace(/^0+(?=\d)/, '');
    if (
      (normalizedWhole.replace(/^0+/, '') + fraction).length > 19 ||
      !/[1-9]/.test(normalizedWhole + fraction)
    )
      return null;
    return normalizedWhole + (fraction ? '.' + fraction : '');
  }
  prepare() {
    const action = this.action();
    if (
      !action ||
      !this.valid() ||
      this.saving() ||
      this.preparing() ||
      this.context.transitionPending()
    )
      return;
    this.writeScope.reset();
    this.preparing.set(true);
    this.actionError.set('');
    this.writeScope.run(
      this.herd.animal(this.animal().id),
      (a) => {
        this.preparing.set(false);
        if (
          !this.allowed(action) ||
          !this.valid() ||
          ((action === 'sale' || action === 'death' || action === 'milk') &&
            a.status !== 'ACTIVE') ||
          (action === 'milk' && a.sex !== 'FEMALE') ||
          (a.birthDate && this.occurredOn < a.birthDate && action !== 'mother')
        ) {
          this.actionError.set(
            'O estado atual do animal impede este registro. Recarregue o perfil e revise os dados.',
          );
          return;
        }
        this.operationId = newUuid();
        this.reviewedVersion.set(a.version);
        this.reviewedRequest = this.buildRequest(action, a);
        this.confirming.set(true);
      },
      (e) => {
        this.preparing.set(false);
        this.actionError.set(
          e instanceof AppError
            ? e.message + ' ' + errorReference(e.requestId)
            : 'Não foi possível consultar a versão atual do animal. Tente novamente.',
        );
      },
    );
  }
  private buildRequest(action: Exclude<Action, null>, a: Animal): () => Observable<unknown> {
    const base = { operationId: this.operationId, expectedVersion: a.version };
    let request: () => Observable<unknown>;
    if (action === 'mother') {
      const body = {
        ...base,
        motherId: this.removeMother ? null : this.selectedMother()!.id,
      };
      request = () => this.api.correctMother(a.id, body);
    } else if (action === 'note') {
      const body = {
        ...base,
        occurredOn: this.occurredOn,
        notes: this.notes.trim(),
      };
      request = () => this.api.note(a.id, body);
    } else if (action === 'milk') {
      const body = {
        ...base,
        recordedOn: this.occurredOn,
        liters: Number(this.milkLiters.replace(',', '.')),
        session: this.session,
        notes: this.notes.trim() || null,
      };
      request = () => this.api.recordMilk(a.id, body);
    } else {
      const body: LifecycleCommand = {
        ...base,
        occurredOn: this.occurredOn,
        notes: this.notes.trim() || null,
      };
      if (action === 'sale') {
        body.saleChannel = this.saleChannel;
        body.saleBuyer = this.saleBuyer.trim() || null;
        body.saleAmount = null;
      } else body.deathReason = this.deathReason.trim() || null;
      const decimal = action === 'sale' && this.saleAmount ? this.saleDecimal() : null;
      const json = JSON.stringify(body).replace(
        /"saleAmount":null/,
        '"saleAmount":' + (decimal || 'null'),
      );
      request = decimal
        ? () => this.api.lifecycleExact(a.id, json)
        : () => this.api.lifecycle(a.id, action, body);
    }
    return request;
  }
  submit() {
    const action = this.action();
    if (
      !action ||
      !this.confirming() ||
      !this.reviewedRequest ||
      !this.allowed(action) ||
      this.saving() ||
      this.context.transitionPending()
    )
      return;
    this.saving.set(true);
    this.actionError.set('');
    this.writeScope.run(
      this.reviewedRequest(),
      () => {
        this.saving.set(false);
        this.resetDraft();
        this.action.set(null);
        this.toast.show('success', 'Registro concluído');
        this.changed.emit();
      },
      (e) => {
        this.saving.set(false);
        this.actionError.set(
          e instanceof AppError
            ? `${e.status === 409 ? 'O estado ou a versão do animal impede esta alteração. Recarregue o perfil antes de uma nova tentativa.' : e.message} ${errorReference(e.requestId)}`
            : 'Não foi possível concluir o registro.',
        );
      },
    );
  }
  edit() {
    if (this.saving()) return;
    this.writeScope.reset();
    this.confirming.set(false);
    this.reviewedRequest = null;
    this.reviewedVersion.set(null);
    this.actionError.set('');
  }
  close() {
    if (!this.saving() && !this.preparing()) {
      this.writeScope.reset();
      this.resetDraft();
      this.action.set(null);
    }
  }
  actionTitle() {
    return {
      mother: 'Corrigir vínculo materno',
      note: 'Adicionar observação',
      milk: 'Registrar produção de leite',
      sale: 'Registrar venda',
      death: 'Registrar morte',
    }[this.action() || 'note'];
  }
  readReference() {
    return errorReference(this.readError()?.requestId);
  }
  milkPages() {
    return Math.ceil((this.milk()?.totalElements || 0) / 20);
  }
  liters(value: number | null) {
    return value === null
      ? 'Sem registros'
      : `${Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 3 })} L`;
  }
  date = formatDate;
}
