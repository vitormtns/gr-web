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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
    @if (animal().sex === 'FEMALE') {
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
              ><small>{{ summary()?.recordsLast7Days || 0 }} {{ summary()?.recordsLast7Days === 1 ? 'registro' : 'registros' }} em 7 dias</small>
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
      <fieldset class="form-grid compact" [disabled]="saving()">
        @if (action() === 'mother') {
          <p class="wide">
            Vínculo atual: {{ mother()?.identification || 'Nenhuma mãe acessível neste contexto' }}
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
            >Motivo da morte<input [(ngModel)]="deathReason" maxlength="240" placeholder="Opcional"
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
        @if (actionError()) {
          <p class="form-error wide" role="alert">{{ actionError() }}</p>
        }
      </fieldset>
      <div dialog-actions>
        <button class="quiet-button" type="button" [disabled]="saving()" (click)="close()">
          Voltar</button
        ><button
          class="primary-action"
          type="button"
          [disabled]="saving() || !valid()"
          (click)="submit()"
        >
          {{ saving() ? 'Registrando…' : 'Confirmar registro' }}
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
  readonly changed = output<void>();
  readonly permissions = inject(PermissionService);
  private readonly context = inject(ContextStore);
  private readonly api = inject(ParityApi);
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
  private generation = 0;
  private operationId = '';
  private previousPayload = '';
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
      this.generation++;
      this.action.set(null);
      this.saving.set(false);
      this.summary.set(null);
      this.milk.set(null);
      if (!pending && a.sex === 'FEMALE') untracked(() => this.loadMilk());
    });
  }
  loadMilk(page = 0) {
    const g = ++this.generation;
    this.loading.set(true);
    this.readError.set(null);
    forkJoin({
      history: this.api.milkHistory(this.animal().id, page),
      summary: this.api.milkSummary(this.animal().id),
    })
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (value) => {
          if (g !== this.generation) return;
          this.milk.set(value.history);
          this.summary.set(value.summary);
          this.loading.set(false);
        },
        error: (e) => {
          if (g !== this.generation) return;
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
      });
  }
  open(action: Exclude<Action, null>) {
    if (!this.allowed(action)) return;
    this.operationId = newUuid();
    this.previousPayload = '';
    this.actionError.set('');
    this.selectedMother.set(null);
    this.removeMother = false;
    this.occurredOn = this.today;
    this.notes = '';
    this.milkLiters = '';
    this.saleAmount = '';
    this.saleBuyer = '';
    this.saleChannel = null;
    this.deathReason = '';
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
    if (action === 'mother') return this.removeMother || !!this.selectedMother();
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
    if (action === 'sale' && this.saleAmount)
      return (
        /^\d{1,12}([.,]\d{1,2})?$/.test(this.saleAmount) &&
        Number(this.saleAmount.replace(',', '.')) > 0
      );
    return true;
  }
  submit() {
    const action = this.action();
    if (
      !action ||
      !this.allowed(action) ||
      !this.valid() ||
      this.saving() ||
      this.context.transitionPending()
    )
      return;
    const a = this.animal();
    const payload = JSON.stringify({
      action,
      version: a.version,
      mother: this.selectedMother()?.id || null,
      removeMother: this.removeMother,
      occurredOn: this.occurredOn,
      notes: this.notes,
      milkLiters: this.milkLiters,
      session: this.session,
      saleChannel: this.saleChannel,
      saleBuyer: this.saleBuyer,
      saleAmount: this.saleAmount,
      deathReason: this.deathReason,
    });
    if (this.previousPayload && this.previousPayload !== payload) this.operationId = newUuid();
    this.previousPayload = payload;
    const base = { operationId: this.operationId, expectedVersion: a.version };
    let request: Observable<unknown>;
    if (action === 'mother')
      request = this.api.correctMother(a.id, {
        ...base,
        motherId: this.removeMother ? null : this.selectedMother()!.id,
      });
    else if (action === 'note')
      request = this.api.note(a.id, {
        ...base,
        occurredOn: this.occurredOn,
        notes: this.notes.trim(),
      });
    else if (action === 'milk')
      request = this.api.recordMilk(a.id, {
        ...base,
        recordedOn: this.occurredOn,
        liters: Number(this.milkLiters.replace(',', '.')),
        session: this.session,
        notes: this.notes.trim() || null,
      });
    else {
      const body: LifecycleCommand = {
        ...base,
        occurredOn: this.occurredOn,
        notes: this.notes.trim() || null,
      };
      if (action === 'sale') {
        body.saleChannel = this.saleChannel;
        body.saleBuyer = this.saleBuyer.trim() || null;
        body.saleAmount = this.saleAmount ? Number(this.saleAmount.replace(',', '.')) : null;
      } else body.deathReason = this.deathReason.trim() || null;
      request = this.api.lifecycle(a.id, action, body);
    }
    const g = this.generation;
    this.saving.set(true);
    this.actionError.set('');
    request.pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: () => {
        if (g !== this.generation) return;
        this.saving.set(false);
        this.action.set(null);
        this.toast.show('success', 'Registro concluído');
        this.changed.emit();
      },
      error: (e) => {
        if (g !== this.generation) return;
        this.saving.set(false);
        this.actionError.set(
          e instanceof AppError
            ? `${e.status === 409 ? 'O estado ou a versão do animal impede esta alteração. Recarregue o perfil antes de uma nova tentativa.' : e.message} ${errorReference(e.requestId)}`
            : 'Não foi possível concluir o registro.',
        );
      },
    });
  }
  close() {
    if (!this.saving()) this.action.set(null);
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
