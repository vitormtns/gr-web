import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StatusIndicatorComponent } from '../../design-system/data-display/data-display';
import { Animal, animalTone, sexLabels, statusLabels } from './herd.models';
import { DomainIconComponent } from '../../design-system/primitives/domain-icon';

@Component({
  selector: 'app-animal-identity',
  imports: [RouterLink, DomainIconComponent],
  template: `<div class="identity">
    <span class="marker" aria-hidden="true"><gr-domain-icon domain="herd" size="sm" /></span>
    <div>
      <a [routerLink]="['/rebanho/animais', animal.id]" [queryParams]="queryParams">{{
        animal.identification
      }}</a>
      @if (animal.name) {
        <small>{{ animal.name }}</small>
      }
    </div>
  </div>`,
  styles: [
    `
      .identity {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        min-width: 12rem;
      }
      .marker {
        width: 2.15rem;
        height: 2.15rem;
        flex: 0 0 auto;
        display: grid;
        place-items: center;
        border-radius: 0.58rem;
        background: #e4f3e9;
        color: #087249;
      }
      a {
        font-weight: 730;
        text-decoration: none;
        letter-spacing: -0.01em;
      }
      a:hover {
        text-decoration: underline;
      }
      small {
        display: block;
        color: var(--color-text-muted);
        font-size: 0.75rem;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnimalIdentityComponent {
  @Input({ required: true }) animal!: Pick<Animal, 'id' | 'identification' | 'name'>;
  @Input() queryParams?: Record<string, string | number | null>;
}

@Component({
  selector: 'app-animal-state',
  imports: [StatusIndicatorComponent],
  template: `<gr-status-indicator [tone]="tone">{{ label }}</gr-status-indicator>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnimalStateComponent {
  @Input({ required: true }) status!: Animal['status'];
  get tone() {
    return animalTone(this.status);
  }
  get label() {
    return statusLabels[this.status];
  }
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return 'Não informada';
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(
    new Date(`${value}T12:00:00Z`),
  );
}
export function sexLabel(value: Animal['sex']): string {
  return sexLabels[value];
}
export function errorReference(id?: string): string {
  return id ? id.slice(0, 8).toUpperCase() : '';
}
