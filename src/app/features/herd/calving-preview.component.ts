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
import { ApiClient } from '../../core/api/api-client.service';
import { ContextStore } from '../../core/context/context.store';
import { ContextRequestScope } from '../management/management.shared';
import { validImportDate } from './herd-import';
import { formatDate } from './herd.shared';

@Component({
  selector: 'app-calving-preview',
  template: `<div aria-live="polite">
    <strong>Previsão de parto</strong>
    @if (loading()) {
      <p>Calculando a previsão pelo serviço…</p>
    } @else if (failed()) {
      <p>Não foi possível consultar a previsão.</p>
      <button type="button" (click)="load()">Tentar novamente</button>
    } @else if (expectedOn()) {
      <p>
        {{ date(expectedOn()) }} · estimativa calculada pelo serviço, sujeita ao acompanhamento da
        matriz.
      </p>
    } @else {
      <p>Informe uma data válida para consultar a previsão.</p>
    }
  </div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalvingPreviewComponent {
  readonly serviceOn = input.required<string>();
  readonly expectedOn = signal<string | null>(null);
  readonly loading = signal(false);
  readonly failed = signal(false);
  readonly date = formatDate;
  private readonly api = inject(ApiClient);
  private readonly context = inject(ContextStore);
  private readonly scope = new ContextRequestScope(inject(DestroyRef));
  constructor() {
    effect(() => {
      this.serviceOn();
      this.context.contextVersion();
      const pending = this.context.transitionPending();
      untracked(() => {
        this.scope.reset();
        this.expectedOn.set(null);
        this.failed.set(false);
        this.loading.set(false);
        if (!pending) this.load();
      });
    });
  }
  load() {
    if (
      !validImportDate(this.serviceOn()) ||
      !this.context.selectedFarm() ||
      this.context.transitionPending()
    )
      return;
    this.scope.reset();
    this.expectedOn.set(null);
    this.loading.set(true);
    this.failed.set(false);
    this.scope.run(
      this.api.get<{ expectedCalvingOn: string }>(
        `/api/v1/herd/reproduction/calving-preview?serviceOn=${encodeURIComponent(this.serviceOn())}`,
        true,
      ),
      (value) => {
        this.expectedOn.set(value.expectedCalvingOn);
        this.loading.set(false);
      },
      () => {
        this.failed.set(true);
        this.loading.set(false);
      },
    );
  }
}
