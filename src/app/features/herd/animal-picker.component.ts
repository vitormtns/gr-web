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
import { ContextRequestScope } from '../management/management.shared';
import { ContextStore } from '../../core/context/context.store';
import { HerdApi } from './herd-api.service';
import { Animal, AnimalSex, AnimalStatus, Page } from './herd.models';
import { PaginationComponent } from '../../design-system/data-display/data-display';
import { SkeletonComponent } from '../../design-system/feedback/feedback';

@Component({
  selector: 'app-animal-picker',
  imports: [FormsModule, PaginationComponent, SkeletonComponent],
  template: ` <div class="picker">
    <label
      >{{ label()
      }}<input
        type="search"
        [(ngModel)]="search"
        placeholder="Identificação ou nome"
        [disabled]="disabled()"
        (keydown.enter)="load(0); $event.preventDefault()" /></label
    ><button type="button" [disabled]="disabled()" (click)="load(0)">Buscar</button>
    @if (loading()) {
      <gr-skeleton />
    } @else if (error()) {
      <p role="alert">Não foi possível consultar os animais.</p>
      <button type="button" (click)="load(0)">Tentar novamente</button>
    } @else if (!page()?.items?.length) {
      <p>Nenhum animal {{ search ? 'corresponde à busca' : 'disponível neste contexto' }}.</p>
    } @else {
      <ul>
        @for (a of page()!.items; track a.id) {
          <li>
            <button
              type="button"
              [disabled]="disabled() || excluded().includes(a.id)"
              (click)="chosen.emit(a)"
            >
              {{ a.identification }}{{ a.name ? ' · ' + a.name : '' }}
              <span>{{ excluded().includes(a.id) ? 'Selecionado' : 'Selecionar' }}</span>
            </button>
          </li>
        }
      </ul>
      <gr-pagination
        [page]="page()!.page"
        [totalPages]="page()!.totalPages"
        (pageChange)="load($event)"
      />
    }
  </div>`,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }
      .picker {
        display: grid;
        gap: 0.6rem;
      }
      .picker label {
        display: grid;
        gap: 0.4rem;
        font-size: 0.8rem;
      }
      .picker input {
        width: 100%;
        box-sizing: border-box;
      }
      .picker ul {
        list-style: none;
        padding: 0;
        margin: 0;
        max-height: 15rem;
        overflow: auto;
      }
      .picker li button {
        width: 100%;
        display: flex;
        justify-content: space-between;
        text-align: left;
        padding: 0.7rem;
        border: 0;
        border-bottom: 1px solid var(--color-border);
        background: var(--color-surface);
        color: var(--color-text);
        cursor: pointer;
      }
      .picker li button:hover {
        background: var(--color-surface-soft);
      }
      .picker li button:disabled {
        opacity: 0.5;
      }
      .picker button:focus-visible {
        outline: 2px solid var(--color-primary);
        outline-offset: 2px;
      }
      .picker p {
        font-size: 0.8rem;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnimalPickerComponent {
  readonly label = input('Buscar animal');
  readonly sex = input<AnimalSex | ''>('');
  readonly status = input<AnimalStatus | ''>('ACTIVE');
  readonly excluded = input<readonly string[]>([]);
  readonly disabled = input(false);
  readonly chosen = output<Animal>();
  private readonly api = inject(HerdApi);
  private readonly context = inject(ContextStore);
  private readonly scope = new ContextRequestScope(inject(DestroyRef));
  readonly page = signal<Page<Animal> | null>(null);
  readonly loading = signal(false);
  readonly error = signal(false);
  search = '';
  constructor() {
    effect(() => {
      this.context.contextVersion();
      const pending = this.context.transitionPending();
      const farm = this.context.selectedFarm();
      this.sex();
      this.status();
      untracked(() => {
        this.scope.reset();
        this.page.set(null);
        this.search = '';
        this.loading.set(pending);
        this.error.set(false);
        if (!pending && farm) this.load(0);
      });
    });
  }
  load(page: number) {
    if (this.context.transitionPending() || !this.context.selectedFarm()) return;
    this.scope.reset();
    this.page.set(null);
    this.loading.set(true);
    this.error.set(false);
    this.scope.run(
      this.api.animals({
        search: this.search.trim(),
        sex: this.sex(),
        status: this.status(),
        page,
        size: 20,
      }),
      (result) => {
        this.page.set(result);
        this.loading.set(false);
      },
      () => {
        this.loading.set(false);
        this.error.set(true);
      },
    );
  }
}
