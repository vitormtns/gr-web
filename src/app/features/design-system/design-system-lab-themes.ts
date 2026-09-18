import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'gr-lab-theme-base',
  template: '',
  styleUrl: './design-system-lab-base-a.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DesignSystemLabBaseThemeComponent {}

@Component({
  selector: 'gr-lab-theme-base-extra',
  template: '',
  styleUrl: './design-system-lab-base-b.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DesignSystemLabBaseExtraThemeComponent {}

@Component({
  selector: 'gr-lab-theme-patterns',
  template: '',
  styleUrl: './design-system-lab-patterns-a.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DesignSystemLabPatternsThemeComponent {}

@Component({
  selector: 'gr-lab-theme-patterns-extra',
  template: '',
  styleUrl: './design-system-lab-patterns-b.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DesignSystemLabPatternsExtraThemeComponent {}

@Component({
  selector: 'gr-lab-theme-cards',
  template: '',
  styleUrl: './design-system-lab-cards.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DesignSystemLabCardsThemeComponent {}

@Component({
  selector: 'gr-lab-theme-responsive',
  template: '',
  styleUrl: './design-system-lab-responsive.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DesignSystemLabResponsiveThemeComponent {}
