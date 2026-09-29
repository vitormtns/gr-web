import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ContextRequestScope } from '../management/management.shared';
import { ContextStore } from '../../core/context/context.store';
import { PermissionService } from '../../core/permissions/permission.service';
import { AppError } from '../../core/api/api.models';
import { DialogComponent } from '../../design-system/surfaces/surfaces';
import { newUuid, sexLabels } from './herd.models';
import { parseHerdCsv, ImportPreview } from './herd-import';
import { ParityApi } from './parity-api.service';
import { ImportCommand, ImportResult } from './parity.models';
import { errorReference } from './herd.shared';

@Component({
  selector: 'app-animal-import-page',
  imports: [FormsModule, RouterLink, DialogComponent],
  template: ` <div class="herd-page operations-page page-enter">
    <a class="back-link" routerLink="/rebanho/animais">← Voltar ao rebanho</a>
    <header class="page-header">
      <div>
        <span class="eyebrow">ENTRADA DO REBANHO</span>
        <h1>Importar animais</h1>
        <p>Revise até 100 animais antes de cadastrar o lote completo.</p>
      </div>
    </header>
    @if (!permissions.canMutateHerd()) {
      <p class="semantic-note">
        Seu acesso permite consultar o rebanho. A importação exige permissão de operação.
      </p>
    } @else {
      <section class="section-frame parity-section">
        <h2>Preparar o lote</h2>
        <p>
          CSV em UTF-8, separado por ponto e vírgula ou vírgula. Nascimento usa AAAA-MM-DD. Informe
          Fêmea ou Macho; nome, nascimento e mãe são opcionais.
        </p>
        <code>identificação;nome;sexo;nascimento;mãe</code>
        <p>
          A mãe pode estar na fazenda ou no mesmo lote. Os animais serão cadastrados como ativos.
        </p>
        @if (canRestart()) {
          <button class="secondary-action" type="button" (click)="restart()">
            {{ result() ? 'Preparar novo lote' : 'Corrigir lote' }}
          </button>
        }
        <label
          >Arquivo CSV<input
            type="file"
            accept=".csv,text/csv"
            [disabled]="saving() || confirming() || attemptedImport()"
            (change)="readFile($event)"
        /></label>
        <label
          >Ou cole o CSV<textarea
            rows="7"
            [(ngModel)]="csv"
            [disabled]="saving() || confirming() || attemptedImport()"
            placeholder="identificação;nome;sexo;nascimento;mãe"
          ></textarea>
        </label>
        <button
          class="secondary-action"
          type="button"
          [disabled]="saving() || !csv.trim()"
          (click)="preview()"
        >
          Revisar lote
        </button>
      </section>
      @if (error()) {
        <p class="form-error" role="alert">{{ error() }}</p>
      }
      @if (result(); as receipt) {
        <section class="section-frame parity-section" role="status">
          <h2>{{ receipt.replayed ? 'Lote já importado' : 'Importação concluída' }}</h2>
          <p>
            {{ receipt.animalIds.length }}
            {{ receipt.animalIds.length === 1 ? 'animal cadastrado' : 'animais cadastrados' }}.
            Nenhum cadastro parcial foi realizado.
          </p>
          <a class="primary-action" routerLink="/rebanho/animais">Ver rebanho</a>
        </section>
      }
      @if (review(); as data) {
        <section class="section-frame parity-section">
          <h2>
            Prévia · {{ data.rows.length }} {{ data.rows.length === 1 ? 'animal' : 'animais' }}
          </h2>
          @if (data.errors.length) {
            <ul class="form-error" role="alert">
              @for (issue of data.errors; track $index) {
                <li>{{ issue }}</li>
              }
            </ul>
          }
          <div class="responsive-table">
            <table>
              <thead>
                <tr>
                  <th>Identificação</th>
                  <th>Nome</th>
                  <th>Sexo</th>
                  <th>Nascimento</th>
                  <th>Mãe</th>
                </tr>
              </thead>
              <tbody>
                @for (row of data.rows; track row.id) {
                  <tr>
                    <td>{{ row.identification }}</td>
                    <td>{{ row.name || 'Não informado' }}</td>
                    <td>{{ sexLabels[row.sex] }}</td>
                    <td>{{ row.birthDate || 'Não informado' }}</td>
                    <td>{{ row.motherIdentification || 'Não informada' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <p class="semantic-note">
            O lote é atômico: se um animal ou vínculo for inválido, nenhum animal será cadastrado. A
            validação final pertence à fazenda selecionada.
          </p>
          <button
            class="primary-action"
            type="button"
            [disabled]="
              saving() || data.errors.length > 0 || !data.rows.length || result() !== null
            "
            (click)="confirming.set(true)"
          >
            Importar {{ data.rows.length }} {{ data.rows.length === 1 ? 'animal' : 'animais' }}
          </button>
        </section>
      }
    }
    <gr-dialog [open]="confirming()" (closed)="close()"
      ><span dialog-title>Confirmar importação</span>
      <p>
        {{ review()?.rows?.length }}
        {{ review()?.rows?.length === 1 ? 'animal será cadastrado' : 'animais serão cadastrados' }}
        em {{ context.selectedFarm()?.farmName }}. O lote inteiro será validado e registrado em uma
        única operação.
      </p>
      <div dialog-actions>
        <button class="quiet-button" type="button" [disabled]="saving()" (click)="close()">
          Voltar</button
        ><button class="primary-action" type="button" [disabled]="saving()" (click)="submit()">
          {{ saving() ? 'Importando…' : 'Confirmar importação' }}
        </button>
      </div></gr-dialog
    >
  </div>`,
  styleUrls: ['./herd-page.scss', './operations-page.component.scss', './parity.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnimalImportPageComponent {
  readonly context = inject(ContextStore);
  readonly permissions = inject(PermissionService);
  private readonly api = inject(ParityApi);
  private readonly destroy = inject(DestroyRef);
  readonly canRestart = signal(false);
  readonly review = signal<ImportPreview | null>(null);
  readonly result = signal<ImportResult | null>(null);
  readonly confirming = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly sexLabels = sexLabels;
  csv = '';
  private command: ImportCommand | null = null;
  private generation = 0;
  private readonly requests = new ContextRequestScope(this.destroy);
  private attempted = false;
  constructor() {
    effect(() => {
      this.context.contextVersion();
      this.context.transitionPending();
      this.generation++;
      this.requests.reset();
      this.review.set(null);
      this.result.set(null);
      this.confirming.set(false);
      this.saving.set(false);
      this.error.set('');
      this.command = null;
      this.attempted = false;
      this.canRestart.set(false);
      this.csv = '';
    });
  }
  async readFile(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (
      !file ||
      this.saving() ||
      this.confirming() ||
      this.attempted ||
      this.context.transitionPending() ||
      !this.permissions.canMutateHerd()
    )
      return;
    const g = this.generation;
    if (file.size > 1024 * 1024) {
      this.error.set('Use um CSV de até 1 MB.');
      return;
    }
    try {
      const text = await file.text();
      if (g !== this.generation) return;
      this.csv = text;
      this.preview();
    } catch {
      if (g !== this.generation) return;
      this.error.set('Não foi possível ler o arquivo.');
    }
  }
  preview() {
    if (
      !this.permissions.canMutateHerd() ||
      this.context.transitionPending() ||
      this.saving() ||
      this.confirming()
    )
      return;
    if (
      this.command &&
      this.review() &&
      !this.review()!.errors.length &&
      this.command.animals.length &&
      this.attempted
    ) {
      this.error.set(
        'Mantenha a prévia desta tentativa e envie novamente para recuperar o recibo.',
      );
      return;
    }
    const data = parseHerdCsv(this.csv);
    this.review.set(data);
    this.command = { operationId: newUuid(), animals: data.rows };
    this.result.set(null);
    this.error.set('');
  }
  restart() {
    if (!this.canRestart() || this.saving()) return;
    const completed = this.result() !== null;
    this.command = null;
    this.attempted = false;
    this.canRestart.set(false);
    this.review.set(null);
    this.result.set(null);
    this.error.set('');
    if (completed) this.csv = '';
  }
  attemptedImport() {
    return this.attempted;
  }
  close() {
    if (!this.saving()) this.confirming.set(false);
  }
  submit() {
    if (
      !this.permissions.canMutateHerd() ||
      this.saving() ||
      !this.command ||
      this.review()?.errors.length ||
      this.context.transitionPending()
    )
      return;
    this.attempted = true;
    this.saving.set(true);
    this.error.set('');
    this.requests.run(
      this.api.importAnimals(this.command),
      (value) => {
        this.result.set(value);
        this.canRestart.set(true);
        this.saving.set(false);
        this.confirming.set(false);
      },
      (value) => {
        this.saving.set(false);
        this.confirming.set(false);
        this.canRestart.set(value instanceof AppError && value.status >= 400 && value.status < 500);
        this.error.set(
          value instanceof AppError
            ? `${value.message} ${errorReference(value.requestId)}`
            : 'Não foi possível importar o lote. Tente novamente mantendo a mesma prévia.',
        );
      },
    );
  }
}
