import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import {
  LucideDynamicIcon,
  LucideInfo,
  LucideRefreshCw,
  provideLucideIcons,
} from '@lucide/angular';
import {
  AttentionItemComponent,
  FilterBarComponent,
  PaginationComponent,
  StatusIndicatorComponent,
  TableComponent,
} from '../../design-system/data-display/data-display';
import {
  AlertComponent,
  EmptyStateComponent,
  ErrorStateComponent,
  ProgressComponent,
  SkeletonComponent,
  ToastRegionComponent,
  ToastService,
} from '../../design-system/feedback/feedback';
import {
  TerritoryFieldComponent,
  TerritoryRegion,
  ProcessRailComponent,
  TimelineComponent,
} from '../../design-system/patterns/operational-patterns';
import {
  BadgeComponent,
  ButtonComponent,
  CheckboxComponent,
  ChipComponent,
  DividerComponent,
  IconButtonComponent,
  InputComponent,
  SelectComponent,
  SwitchComponent,
  TextareaComponent,
  TooltipDirective,
} from '../../design-system/primitives/primitives';
import {
  CardComponent,
  DialogComponent,
  DrawerComponent,
  MenuComponent,
  PopoverComponent,
} from '../../design-system/surfaces/surfaces';
import {
  DesignSystemLabBaseThemeComponent,
  DesignSystemLabBaseExtraThemeComponent,
  DesignSystemLabCardsThemeComponent,
  DesignSystemLabPatternsThemeComponent,
  DesignSystemLabPatternsExtraThemeComponent,
  DesignSystemLabResponsiveThemeComponent,
} from './design-system-lab-themes';
import { LiveFarmStageComponent } from './live-farm-stage.component';

@Component({
  selector: 'app-design-system-page',
  imports: [
    ReactiveFormsModule,
    LucideDynamicIcon,
    AttentionItemComponent,
    FilterBarComponent,
    PaginationComponent,
    StatusIndicatorComponent,
    TableComponent,
    AlertComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    ProgressComponent,
    SkeletonComponent,
    ToastRegionComponent,
    TerritoryFieldComponent,
    ProcessRailComponent,
    TimelineComponent,
    BadgeComponent,
    ButtonComponent,
    CheckboxComponent,
    ChipComponent,
    DividerComponent,
    IconButtonComponent,
    InputComponent,
    SelectComponent,
    SwitchComponent,
    TextareaComponent,
    TooltipDirective,
    CardComponent,
    DialogComponent,
    DrawerComponent,
    MenuComponent,
    PopoverComponent,
    DesignSystemLabBaseThemeComponent,
    DesignSystemLabBaseExtraThemeComponent,
    DesignSystemLabCardsThemeComponent,
    DesignSystemLabPatternsThemeComponent,
    DesignSystemLabPatternsExtraThemeComponent,
    DesignSystemLabResponsiveThemeComponent,
    LiveFarmStageComponent,
  ],
  templateUrl: './design-system-page.component.html',
  providers: [provideLucideIcons(LucideInfo, LucideRefreshCw)],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DesignSystemPageComponent {
  readonly nav = [
    ['experience', 'Experience'],
    ['foundations', 'Foundations'],
    ['objects', 'Objects'],
    ['tables', 'Data'],
    ['motion', 'Motion'],
    ['archetypes', 'Archetypes'],
  ];
  readonly colors = [
    { name: 'Canvas mineral', token: '--color-bg', value: '#F4F7F4' },
    { name: 'Superfície', token: '--color-surface', value: '#FFFFFF' },
    { name: 'Tinta', token: '--color-text', value: '#0D1B12' },
    { name: 'Verde território', token: '--color-primary', value: '#155B3B' },
    { name: 'Atenção', token: '--color-warning', value: '#B66A08' },
    { name: 'Perigo', token: '--color-danger', value: '#C44136' },
    { name: 'Informação', token: '--color-info', value: '#356A8A' },
    { name: 'Reprodução', token: '--data-violet', value: '#7057A8' },
  ];
  readonly regions: TerritoryRegion[] = [
    {
      id: 'norte',
      name: 'Pasto Norte 1',
      count: 245,
      status: 'normal',
      path: 'M74 55 C123 25 235 30 298 67 L279 179 C206 193 127 180 67 140 Z',
    },
    {
      id: 'leste',
      name: 'Pasto Leste',
      count: 198,
      status: 'attention',
      path: 'M322 57 C414 29 571 45 641 91 L616 186 C519 198 412 184 316 166 Z',
    },
    {
      id: 'sul',
      name: 'Pasto Sul',
      count: 312,
      status: 'normal',
      path: 'M79 197 C143 177 233 193 324 213 L315 337 C220 353 116 329 65 287 Z',
    },
    {
      id: 'retiro',
      name: 'Pasto Retiro',
      count: 0,
      status: 'empty',
      path: 'M350 207 C441 183 553 203 641 228 L619 326 C526 346 421 334 348 302 Z',
    },
  ];
  readonly steps = [
    { label: 'Identificação', detail: 'BR-0421' },
    { label: 'Preparação', detail: 'Concluída' },
    { label: 'Movimentação', detail: 'Em execução' },
    { label: 'Confirmação', detail: 'Pendente' },
  ];
  readonly events = [
    {
      time: 'Hoje, 08:40',
      title: 'Pesagem registrada',
      description: 'Peso atualizado para 482 kg.',
      meta: 'Marina Oliveira',
    },
    {
      time: '17 set., 16:12',
      title: 'Movimentação realizada',
      description: 'Do Pasto Sul para o Pasto Norte 1.',
      meta: 'Operação de campo',
    },
    {
      time: '02 set., 09:05',
      title: 'Tratamento concluído',
      description: 'Protocolo sanitário finalizado.',
      meta: 'Dr. Paulo Mendes',
    },
  ];
  readonly name = new FormControl('Fazenda Norte');
  readonly category = new FormControl('corte');
  readonly notes = new FormControl('Lote acompanhado pela equipe de campo.');
  readonly invalid = new FormControl('');
  readonly disabled = new FormControl({ value: 'Gerado automaticamente', disabled: true });
  readonly alerts = new FormControl(true);
  readonly active = new FormControl(true);
  readonly activeTab = signal('geral');
  readonly selectedRegion = signal('norte');
  readonly density = signal<'comfortable' | 'compact'>('comfortable');
  readonly dialogOpen = signal(false);
  readonly drawerOpen = signal(false);
  readonly refreshed = signal(true);
  readonly selectedAnimal = signal('BR-0421');
  constructor(readonly toast: ToastService) {}
  refresh(): void {
    this.refreshed.set(false);
    window.setTimeout(() => this.refreshed.set(true), 420);
  }
  showToast(): void {
    this.toast.show('success', 'Movimentação registrada', 'O histórico do animal foi atualizado.');
  }
}
