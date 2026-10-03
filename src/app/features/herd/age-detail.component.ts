import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { AnimalAge, ageLabel } from './age-intelligence.models';
import { ageBandLabels } from './parity.models';
import { formatDate } from './herd.shared';

@Component({
  selector: 'app-age-detail',
  template: `@if (age(); as value) {
      <details>
        <summary>Idade e próxima faixa · {{ labels[value.currentBand] }}</summary>
        <dl>
          <div>
            <dt>Idade na referência</dt>
            <dd>{{ label(value) }} · {{ date(value.referenceDate) }}</dd>
          </div>
          @if (value.nextBand && value.transitionOn) {
            <div>
              <dt>Próxima faixa</dt>
              <dd>{{ labels[value.nextBand] }}</dd>
            </div>
            <div>
              <dt>Transição</dt>
              <dd>
                {{ date(value.transitionOn) }} · em {{ value.daysUntilTransition }}
                {{ value.daysUntilTransition === 1 ? 'dia' : 'dias' }}
              </dd>
            </div>
          } @else {
            <div>
              <dt>Próxima transição</dt>
              <dd>Última faixa da política atual.</dd>
            </div>
          }
        </dl>
        <p>
          Nascimento em {{ date(value.birthDate) }}. Meses completos pelo calendário, na referência
          informada pelo serviço.
          @if (value.boundaryMonths !== null) {
            A próxima fronteira ocorre aos {{ value.boundaryMonths }} meses.
          }
        </p>
      </details>
    } @else {
      <p>Idade não informada.</p>
    }`,
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
      dl {
        display: grid;
        gap: 0.75rem;
      }
      dt,
      p {
        color: var(--color-text-muted);
        font-size: 0.85rem;
      }
      dd {
        margin: 0;
      }
      p {
        line-height: 1.6;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgeDetailComponent {
  readonly age = input<AnimalAge | null | undefined>();
  readonly labels = ageBandLabels;
  readonly label = ageLabel;
  readonly date = formatDate;
}
