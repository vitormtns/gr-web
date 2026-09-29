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
import { ContextRequestScope } from '../management/management.shared';
import { ContextStore } from '../../core/context/context.store';
import { ParityApi } from './parity-api.service';
import { CountedPage, HerdGroup } from './parity.models';
import { PaginationComponent } from '../../design-system/data-display/data-display';
import { SkeletonComponent } from '../../design-system/feedback/feedback';

@Component({
  selector: 'app-group-picker',
  imports: [PaginationComponent, SkeletonComponent],
  template: ` <div class="group-picker">
    <strong>{{ label() }}</strong>
    <p>{{ selectedName() }}</p>
    <button type="button" [disabled]="disabled()" (click)="chosen.emit('')">Sem grupo</button>
    @if (loading()) {
      <gr-skeleton />
    } @else if (error()) {
      <p role="alert">Não foi possível consultar os grupos ativos.</p>
      <button type="button" (click)="load(0)">Tentar novamente</button>
    } @else {
      <div class="choices">
        @for (group of page()?.items || []; track group.id) {
          <button
            type="button"
            [disabled]="disabled()"
            [attr.aria-pressed]="group.id === selected()"
            (click)="chosen.emit(group.id)"
          >
            {{ group.name }}
          </button>
        }
      </div>
      @if (!page()?.totalElements) {
        <p>Nenhum grupo ativo cadastrado.</p>
      }
      <gr-pagination
        [page]="page()?.page || 0"
        [totalPages]="pages()"
        (pageChange)="load($event)"
      />
    }
  </div>`,
  styles: [
    `
      :host {
        display: block;
      }
      .group-picker {
        display: grid;
        gap: 0.6rem;
        font-size: 0.8rem;
      }
      .group-picker p {
        margin: 0;
      }
      .choices {
        display: flex;
        flex-wrap: wrap;
        gap: 0.4rem;
        max-height: 10rem;
        overflow: auto;
      }
      .choices button {
        padding: 0.5rem;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        background: var(--color-surface);
        color: var(--color-text);
        cursor: pointer;
      }
      .choices button[aria-pressed='true'] {
        border-color: var(--color-primary);
        background: var(--color-surface-soft);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GroupPickerComponent {
  readonly selected = input('');
  readonly disabled = input(false);
  readonly label = input('Grupo de manejo');
  readonly chosen = output<string>();
  private readonly api = inject(ParityApi);
  private readonly context = inject(ContextStore);
  private readonly destroy = inject(DestroyRef);
  private readonly listScope = new ContextRequestScope(this.destroy);
  private readonly nameScope = new ContextRequestScope(this.destroy);
  readonly page = signal<CountedPage<HerdGroup> | null>(null);
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly name = signal('');
  constructor() {
    effect(() => {
      this.context.contextVersion();
      const pending = this.context.transitionPending();
      const farm = this.context.selectedFarm();
      untracked(() => {
        this.listScope.reset();
        this.page.set(null);
        this.loading.set(pending);
        this.error.set(false);
        if (!pending && farm) this.load(0);
      });
    });
    effect(() => {
      this.context.contextVersion();
      const selected = this.selected();
      const ready = !this.context.transitionPending() && !!this.context.selectedFarm();
      untracked(() => {
        this.nameScope.reset();
        this.name.set(ready && selected ? 'Consultando grupo vinculado…' : 'Atividade sem grupo');
        if (!ready || !selected) return;
        this.nameScope.run(
          this.api.group(selected),
          (group) => this.name.set(group.name),
          () => {
            this.name.set('Grupo vinculado indisponível. Selecione um grupo ativo para alterá-lo.');
          },
        );
      });
    });
  }
  selectedName() {
    return this.name();
  }
  pages() {
    return Math.ceil((this.page()?.totalElements || 0) / 20);
  }
  load(page: number) {
    if (this.context.transitionPending() || !this.context.selectedFarm()) return;
    this.listScope.reset();
    this.page.set(null);
    this.loading.set(true);
    this.error.set(false);
    this.listScope.run(
      this.api.groups(page),
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
