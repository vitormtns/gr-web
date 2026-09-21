import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideLucideIcons, LucideBeef, LucideCalendarDays, LucideLandPlot, LucideMapPinOff, LucideTriangleAlert } from '@lucide/angular';
import { beforeEach, describe, expect, it } from 'vitest';
import { dashboardShowcaseProviders } from './dashboard-showcase';
import { HomePageComponent } from './home-page.component';

describe('Home operacional acessível', () => {
  let element: HTMLElement;
  let fixture: ReturnType<typeof TestBed.createComponent<HomePageComponent>>;
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HomePageComponent], providers: [provideRouter([]), provideLucideIcons(LucideBeef, LucideCalendarDays, LucideLandPlot, LucideMapPinOff, LucideTriangleAlert), ...dashboardShowcaseProviders] });
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
  it('mapeia métricas reais sem o campo territorial na Home', () => {
    expect(element.querySelector('app-territory-overview')).toBeNull();
    expect(element.querySelector('gr-metric-deck')?.textContent).toContain('428');
    expect(element.querySelector('app-home-actions')).not.toBeNull();
    expect(element.querySelector('.attention-section')?.textContent).toContain('Planejado');
  });
  it('renderiza a Home sem background fotográfico, com conteúdo em fundo mineral limpo', () => {
    expect(element.querySelector('.home-page__background')).toBeNull();
    expect(element.querySelector('.home-page__background-overlay')).toBeNull();
    expect(element.querySelector('.home-page__content')).not.toBeNull();
  });
  it('apresenta deck operacional com quatro objetos e dados reais do território', () => {
    const deck = element.querySelector('gr-metric-deck');
    expect(deck?.querySelectorAll('.object').length).toBe(4);
    expect(deck?.textContent).toContain('428');
    const territory = deck?.querySelector('.obj-territory')?.textContent ?? '';
    expect(territory).toContain('6');
    expect(territory).toContain('4');
    const progress = deck?.querySelector('[role="progressbar"]');
    expect(Number(progress?.getAttribute('aria-valuenow'))).toBeCloseTo(66.67, 1);
    expect(progress?.getAttribute('aria-valuemin')).toBe('0');
    expect(progress?.getAttribute('aria-valuemax')).toBe('100');
  });
  it('não finge interatividade nos objetos estáticos de métrica', () => {
    const articles = Array.from(element.querySelectorAll('gr-metric-deck article'));
    expect(articles.length).toBe(4);
    for (const article of articles) {
      expect(article.hasAttribute('tabindex')).toBe(false);
    }
  });
  it('apresenta strip de 7 dias com contagens reais da agenda', () => {
    const tabs = Array.from(element.querySelectorAll<HTMLButtonElement>('.agenda-day[role="tab"]'));
    expect(tabs.length).toBe(7);
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    expect(tabs.filter(tab => tab.classList.contains('has-events')).length).toBe(4);
    const panel = element.querySelector('.agenda-schedule');
    expect(panel?.getAttribute('role')).toBe('tabpanel');
    expect(panel?.textContent).toContain('Vacinação do lote Norte');
  });
  it('troca o cronograma ao selecionar outro dia e mostra vazio sem atividades', () => {
    const tabs = Array.from(element.querySelectorAll<HTMLButtonElement>('.agenda-day[role="tab"]'));
    tabs[3].click(); fixture.detectChanges();
    expect(tabs[3].getAttribute('aria-selected')).toBe('true');
    expect(element.querySelector('.agenda-schedule')?.textContent).toContain('Nenhuma atividade neste dia');
    tabs[1].click(); fixture.detectChanges();
    expect(element.querySelector('.agenda-schedule')?.textContent).toContain('Pesagem pendente');
  });
  it('expõe cronograma sem horários inventados e com datetime ISO real', () => {
    const times = Array.from(element.querySelectorAll('.schedule-copy time'));
    expect(times.length).toBeGreaterThan(0);
    for (const time of times) {
      expect(time.getAttribute('datetime')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(time.textContent).not.toMatch(/\d{2}:\d{2}/);
    }
    const links = Array.from(element.querySelectorAll('.agenda-section a[href="/rebanho/agenda"]'));
    expect(links.length).toBeGreaterThan(0);
  });
  it('compõe o cabeçalho editorial com standfirst e marca', () => {
    expect(element.querySelector('.operation-standfirst')?.textContent).toContain('Panorama atual');
    expect(element.querySelector('.header-brand-mark')).not.toBeNull();
    expect(element.querySelector('.summary-line')?.textContent).toContain('428');
  });
  it('apresenta leitura operacional em superfície de marca com insight real', () => {
    const surface = element.querySelector('gr-branded-insight-surface');
    expect(surface?.textContent).toContain('Localização pendente no rebanho');
  });
  it('identifica domínio e urgência por item da atenção', () => {
    expect(element.querySelectorAll('.queue-button gr-domain-icon').length).toBe(4);
    expect(element.querySelector('.queue-entry.due-today')).not.toBeNull();
    const button = element.querySelector<HTMLButtonElement>('.queue-entry.due-today .queue-button');
    button?.click(); fixture.detectChanges();
    const badge = element.querySelector('.queue-entry.due-today gr-badge span');
    expect(badge?.className).toContain('attention');
    expect(badge?.textContent).toContain('Aberta');
  });
  it('expõe ícones de domínio nos sinais sem desfazer o painel', () => {
    expect(element.querySelectorAll('.context-rail .signal').length).toBe(6);
    expect(element.querySelectorAll('.context-rail gr-domain-icon').length).toBe(6);
  });
  it('mostra ícone de domínio por objeto do deck e por item do cronograma', () => {
    expect(element.querySelectorAll('gr-metric-deck gr-domain-icon').length).toBe(4);
    expect(element.querySelectorAll('.schedule-item gr-domain-icon').length).toBe(1);
  });
  it('apresenta hierarquia de urgência com o item mais urgente primeiro', () => {
    const board = element.querySelector('app-urgency-board');
    expect(board).not.toBeNull();
    const hero = board?.querySelector('.urgency-object--hero');
    expect(hero?.getAttribute('data-level')).toBe('today');
    expect(hero?.querySelector('.urgency-object__headline')?.textContent).toContain('hoje');
    expect(hero?.textContent).toContain('Vacinação do lote Norte');
    expect(hero?.querySelector('time')?.getAttribute('datetime')).toBe('2026-09-15');
    expect(board?.querySelector('.urgency-calm')).toBeNull();
  });
  it('agrupa urgências por domínio sem inventar métricas', () => {
    const board = element.querySelector('app-urgency-board');
    expect(board?.querySelector('.urgency-object--hero')).not.toBeNull();
    expect(board?.querySelectorAll('.urgency-object--group').length).toBe(2);
    expect(board?.textContent).toContain('2 pendências');
    expect(board?.textContent).not.toContain('D+');
    expect(board?.textContent).not.toContain('T-');
  });
  it('expande o objeto de urgência sem navegar e expõe CTA real', () => {
    const button = element.querySelector<HTMLButtonElement>('app-urgency-board .urgency-object__summary');
    expect(button?.getAttribute('aria-expanded')).toBe('false');
    button?.click();
    fixture.detectChanges();
    expect(button?.getAttribute('aria-expanded')).toBe('true');
    const panelId = button?.getAttribute('aria-controls');
    const panel = panelId ? element.querySelector(`#${panelId}`) : null;
    expect(panel?.getAttribute('role')).toBe('region');
    expect(element.querySelector('app-urgency-board .urgency-object__cta')?.getAttribute('href')).toBe('/rebanho/saude');
  });
});
