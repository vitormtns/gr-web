import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import {
  LucideBaby,
  LucideBeef,
  LucideCalendarDays,
  LucideClipboardCheck,
  LucideDynamicIcon,
  LucideHeartPulse,
  LucideLandPlot,
  LucideMapPin,
  LucideMapPinOff,
  LucideRoute,
  LucideScale,
  LucideTriangleAlert,
  LucideVenusAndMars,
  type LucideIconInput,
} from '@lucide/angular';

export type DomainIconName =
  | 'herd'
  | 'territory'
  | 'health'
  | 'weight'
  | 'reproduction'
  | 'calving'
  | 'movement'
  | 'agenda'
  | 'attention'
  | 'traceability'
  | 'location'
  | 'planner';

export type DomainIconSize = 'sm' | 'md' | 'lg';

const DOMAIN_ICONS: Record<DomainIconName, LucideIconInput> = {
  herd: LucideBeef,
  territory: LucideLandPlot,
  health: LucideHeartPulse,
  weight: LucideScale,
  reproduction: LucideVenusAndMars,
  calving: LucideBaby,
  movement: LucideRoute,
  agenda: LucideCalendarDays,
  attention: LucideTriangleAlert,
  traceability: LucideMapPin,
  location: LucideMapPinOff,
  planner: LucideClipboardCheck,
};

const DOMAIN_ICON_PIXELS: Record<DomainIconSize, number> = {
  sm: 17,
  md: 23,
  lg: 30,
};

/**
 * DomainIcon — iconografia de domínio eBov sobre @lucide/angular.
 *
 * O mapa usa os componentes de ícone importados diretamente, então não
 * depende do registro global de nomes (`provideLucideIcons`).
 * Decorativo por padrão (`aria-hidden`): o texto ao lado comunica o domínio.
 */
@Component({
  selector: 'gr-domain-icon',
  imports: [LucideDynamicIcon],
  template: `<svg [lucideIcon]="icon()" [attr.width]="pixels()" [attr.height]="pixels()" aria-hidden="true"></svg>`,
  styles: [`
    :host {
      display: inline-grid;
      place-items: center;
      flex: 0 0 auto;
    }
    svg {
      display: block;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DomainIconComponent {
  @Input({ required: true }) domain: DomainIconName = 'herd';
  @Input() size: DomainIconSize = 'md';

  icon(): LucideIconInput {
    return DOMAIN_ICONS[this.domain] ?? LucideMapPin;
  }

  pixels(): number {
    return DOMAIN_ICON_PIXELS[this.size] ?? DOMAIN_ICON_PIXELS.md;
  }
}
