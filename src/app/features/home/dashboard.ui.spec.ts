import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { dashboardShowcaseProviders } from './dashboard-showcase';
import { HomePageComponent } from './home-page.component';

describe('Home operacional acessível', () => {
  let element: HTMLElement;
  let fixture: ReturnType<typeof TestBed.createComponent<HomePageComponent>>;
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HomePageComponent], providers: [provideRouter([]), ...dashboardShowcaseProviders] });
    fixture = TestBed.createComponent(HomePageComponent); TestBed.tick(); fixture.detectChanges();
    element = fixture.nativeElement as HTMLElement;
  });
  it('seleciona TODAY, 7 dias e 30 dias com estado aria-pressed', () => {
    const buttons = Array.from(element.querySelectorAll<HTMLButtonElement>('.period-pills button'));
    expect(buttons[2].getAttribute('aria-pressed')).toBe('true');
    for (const index of [0, 1, 2]) {
      buttons[index].click(); fixture.detectChanges();
      expect(buttons[index].getAttribute('aria-pressed')).toBe('true');
    }
  });
  it('abre datas rotuladas e rejeita intervalo inválido', () => {
    const custom = Array.from(element.querySelectorAll<HTMLButtonElement>('.period-pills button'))[3];
    custom.click(); fixture.detectChanges();
    const inputs = element.querySelectorAll<HTMLInputElement>('input[type=date]');
    expect(inputs.length).toBe(2);
    expect(inputs[0].closest('label')?.textContent).toContain('De');
    expect(inputs[1].closest('label')?.textContent).toContain('Até');
    inputs[0].value = '2026-09-16'; inputs[0].dispatchEvent(new Event('input'));
    inputs[1].value = '2026-09-15'; inputs[1].dispatchEvent(new Event('input'));
    element.querySelector<HTMLFormElement>('form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
    expect(element.querySelector('[role=alert]')?.textContent).toContain('datas válidas');
  });
  it('expande item de atenção por botão e oferece tabela do gráfico', () => {
    const button = element.querySelector<HTMLButtonElement>('.queue-button');
    expect(button?.getAttribute('aria-expanded')).toBe('false');
    button?.click(); fixture.detectChanges();
    expect(button?.getAttribute('aria-expanded')).toBe('true');
    expect(element.querySelector('.queue-detail')?.textContent).toContain('Data operacional');
    expect(element.querySelector('app-activity-chart svg')?.getAttribute('aria-label')).toContain('Use as setas');
    expect(element.querySelector('app-activity-chart table caption')?.textContent).toContain('Atividade diária');
  });
  it('retry de seção mantém botão focável e não recarrega a página', () => {
    expect(element.querySelector('.territory-section')?.textContent).toContain('428');
    expect(element.querySelector('.attention-section')?.textContent).toContain('Planejado');
  });
});
