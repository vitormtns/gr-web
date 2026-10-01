import { ChangeDetectionStrategy, Component, computed, inject, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ErrorStateComponent, SkeletonComponent } from '../../design-system/feedback/feedback';
import { DialogComponent } from '../../design-system/surfaces/surfaces';
import { DomainIconComponent } from '../../design-system/primitives/domain-icon';
import { ReproductionOperationalStore, addDays } from './reproduction-operational.store';
import { formatDate } from './herd.shared';
import { serviceLabels } from './herd-operations.models';

@Component({
  selector: 'app-reproduction-overview',
  imports: [RouterLink, ErrorStateComponent, SkeletonComponent, DialogComponent, DomainIconComponent],
  templateUrl: './reproduction-overview.component.html',
  styleUrl: './reproduction-overview.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReproductionOverviewComponent {
  readonly store = inject(ReproductionOperationalStore);
  readonly openPregnancy = output<string>();
  readonly openHistory = output<void>();
  readonly date = formatDate;
  readonly days = Array.from({ length: 7 }, (_, index) => addDays(this.store.today, index));
  readonly journey = computed(() => {
    const s = this.store.overview().value?.summary;
    return s ? [
      { label: 'Serviços realizados', count: s.servicesRecorded, note: 'na consulta', tone: 'service' },
      { label: 'Possíveis gestações', count: s.openPossiblePregnancies, note: 'em acompanhamento no período', tone: 'possible' },
      { label: 'Gestações confirmadas', count: s.openConfirmedPregnancies, note: 'em acompanhamento no período', tone: 'confirmed' },
      { label: 'Partos', count: s.calvings, note: 'registrados na consulta', tone: 'calving' },
    ] : [];
  });
  maxCount() { return Math.max(0, ...this.journey().map((stage) => stage.count)); }
  width(count: number) { return this.maxCount() ? `${100 * count / this.maxCount()}%` : '0%'; }
  dayItems(day: string) { return this.store.milestones().value?.filter((item) => item.operationalDate === day) || []; }
  dayLabel(day: string) { return day === this.store.today ? 'Hoje' : day === addDays(this.store.today, 1) ? 'Amanhã' : this.date(day); }
  eventLabel(action: string) {
    return ({ BREEDING_RECORDED: 'Serviço registrado', PREGNANCY_CONFIRMED: 'Gestação confirmada', PREGNANCY_TERMINATED: 'Acompanhamento encerrado', CALVED: 'Parto realizado', BORN: 'Cria nascida' } as Record<string, string>)[action] || 'Evento reprodutivo';
  }
  serviceLabel(value: keyof typeof serviceLabels | null) { return value ? serviceLabels[value] : '—'; }
}
