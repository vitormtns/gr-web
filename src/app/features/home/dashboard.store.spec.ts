import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '../../core/api/api.models';
import { ContextStore } from '../../core/context/context.store';
import { DashboardApiClient } from './dashboard-api.service';
import { DashboardOverview, DashboardActivity } from './dashboard.models';
import { DashboardStore } from './dashboard.store';

const overview = (name: string) => ({ herdSnapshot: { activeAnimals: name === 'B' ? 20 : 10 } }) as DashboardOverview;
const activity = (name: string) => ({ series: [{ date: name }] }) as DashboardActivity;
const delayed = <T>() => { let emit!: (value: T) => void; const stream = new Observable<T>(subscriber => { emit = value => subscriber.next(value); /* simula transporte que entrega após cancelamento */ }); return { stream, deliver: (value: T) => emit(value) }; };

describe('DashboardStore', () => {
  const status = signal<'ready' | 'loading'>('ready');
  const transitionPending = signal(false);
  const contextVersion = signal(1);
  const selectedOrganization = signal({ organizationId: 'org', role: 'VIEWER' });
  const selectedFarm = signal({ farmId: 'A' });
  let api: { overview: ReturnType<typeof vi.fn>; activity: ReturnType<typeof vi.fn>; attention: ReturnType<typeof vi.fn>; agendaPage: ReturnType<typeof vi.fn>; paddocks: ReturnType<typeof vi.fn> };
  let store: DashboardStore;
  beforeEach(() => {
    status.set('ready'); transitionPending.set(false); contextVersion.set(1); selectedFarm.set({ farmId: 'A' });
    api = { overview: vi.fn(() => of(overview('A'))), activity: vi.fn(() => of(activity('A'))), attention: vi.fn(() => of({ referenceDate: '', summary: {}, preview: [] })), agendaPage: vi.fn(() => of({ items: [], page: 0, size: 100, totalElements: 0, totalPages: 1 })), paddocks: vi.fn(() => of({ items: [], totalPages: 0 })) };
    TestBed.configureTestingModule({ providers: [DashboardStore, { provide: DashboardApiClient, useValue: api }, { provide: ContextStore, useValue: { status, transitionPending, contextVersion, selectedOrganization, selectedFarm } }] });
    store = TestBed.inject(DashboardStore); TestBed.tick();
  });
  it('permite leitura ao VIEWER e carrega seções independentes', () => {
    expect(store.overview().status).toBe('ready'); expect(store.attention().status).toBe('ready'); expect(api.overview).toHaveBeenCalledTimes(1);
  });
  it('ignora resposta atrasada da fazenda A depois da B', () => {
    const a = delayed<DashboardOverview>(); const b = delayed<DashboardOverview>();
    api.overview.mockReturnValueOnce(a.stream).mockReturnValueOnce(b.stream);
    store.retry('overview');
    transitionPending.set(true); selectedFarm.set({ farmId: 'B' }); contextVersion.set(2); TestBed.tick();
    expect(store.overview().value).toBeNull();
    transitionPending.set(false); TestBed.tick();
    b.deliver(overview('B')); a.deliver(overview('A'));
    expect(store.overview().value?.herdSnapshot.activeAnimals).toBe(20);
  });
  it('ignora LAST_30_DAYS tardio depois de TODAY', () => {
    const old = delayed<DashboardActivity>(); const today = delayed<DashboardActivity>();
    api.activity.mockReturnValueOnce(old.stream).mockReturnValueOnce(today.stream);
    store.retry('activity'); store.selectPeriod({ period: 'TODAY' });
    today.deliver(activity('hoje')); old.deliver(activity('antigo'));
    expect(store.activity().value?.series[0].date).toBe('hoje');
    expect(api.activity).toHaveBeenLastCalledWith({ period: 'TODAY' });
  });
  it('mantém overview após falha de activity e retry somente de activity', () => {
    api.activity.mockReturnValueOnce(throwError(() => new AppError('unavailable', 'Falha', 503, 'unavailable'))).mockReturnValueOnce(of(activity('recuperada')));
    store.retry('activity'); expect(store.activity().status).toBe('error'); expect(store.overview().status).toBe('ready');
    const previous = api.overview.mock.calls.length; store.retry('activity');
    expect(store.activity().value?.series[0].date).toBe('recuperada'); expect(api.overview).toHaveBeenCalledTimes(previous);
  });
  it('mantém overview após falha de attention', () => {
    api.attention.mockReturnValueOnce(throwError(() => new AppError('unavailable', 'Falha', 503, 'unavailable')));
    store.retry('attention'); expect(store.attention().status).toBe('error'); expect(store.overview().status).toBe('ready');
  });
  it('busca a agenda em uma única janela de sete dias', () => {
    const [from,to,page,size]=api.agendaPage.mock.calls[0];
    expect(page).toBe(0);expect(size).toBe(100);
    const start=new Date(`${from}T12:00:00`);const end=new Date(`${to}T12:00:00`);
    expect(Math.round((end.getTime()-start.getTime())/86400000)).toBe(6);
  });
  it('concatena todas as páginas da janela preservando a ordem', () => {
    api.agendaPage.mockImplementation((_from:string,_to:string,page:number)=>of(page===0?{items:[{stableId:'a'}],page:0,size:100,totalElements:2,totalPages:2}:{items:[{stableId:'b'}],page:1,size:100,totalElements:2,totalPages:2}));
    store.retry('agenda');
    expect(store.agenda().value?.items.map(item=>item.stableId)).toEqual(['a','b']);
    expect(api.agendaPage).toHaveBeenCalledTimes(3);
  });
});
