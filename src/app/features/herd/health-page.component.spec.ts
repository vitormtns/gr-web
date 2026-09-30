import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Observable, Subject, of, throwError } from 'rxjs';
import { MembershipRole } from '../../core/api/api.models';
import { describe, expect, it, vi } from 'vitest';
import { ContextStore } from '../../core/context/context.store';
import { ToastService } from '../../design-system/feedback/feedback';
import { HerdApi } from './herd-api.service';
import { HealthPageComponent } from './health-page.component';
import { Animal } from './herd.models';
import { HealthReport, HealthTreatment, OperationResult } from './herd-operations.models';

// jsdom não implementa <dialog>.showModal/close usados pelo design-system.
for (const method of ['showModal', 'close'] as const) {
  const proto = HTMLDialogElement.prototype as unknown as Record<string, unknown>;
  if (typeof proto[method] !== 'function') proto[method] = () => {};
}

describe('HealthPageComponent procedureCode', () => {
  const animal: Animal = {
    id: 'a1',
    identification: 'A1',
    name: null,
    sex: 'FEMALE',
    birthDate: null,
    status: 'ACTIVE',
    version: 0,
    paddock: null,
  };
  const report: HealthReport = {
    items: [],
    page: 0,
    size: 20,
    totalElements: 0,
    totalPages: 0,
    summary: { treatmentsCount: 0, animalsTreated: 0, countsByTreatmentType: {} },
  };
  const treatment: HealthTreatment = {
    id: 't1',
    animal: { id: animal.id, identification: animal.identification, name: animal.name },
    treatmentType: 'VACCINATION',
    procedureCode: 'BRUCELLOSIS',
    occurredOn: '2026-09-15',
    product: 'Vacina A',
    protocol: 'Protocolo B',
    nextDueOn: '2027-09-15',
    notes: 'Registrado pelo veterinário.',
    recordedAt: '2026-09-16T12:00:00Z',
  };
  const populatedReport: HealthReport = {
    ...report,
    items: [treatment],
    totalElements: 25,
    totalPages: 2,
    summary: {
      treatmentsCount: 25,
      animalsTreated: 13,
      countsByTreatmentType: { VACCINATION: 18, DEWORMING: 7 },
    },
  };
  const ok = { operationId: 'op', animals: [], replayed: false };
  const setup = async (role: MembershipRole = 'OWNER') => {
    const api = {
      animal: vi.fn((_id: string): Observable<Animal> => of(animal)),
      healthReport: vi.fn((): Observable<HealthReport> => of(report)),
      animals: vi.fn(() =>
        of({ items: [animal], page: 0, size: 20, totalElements: 1, totalPages: 1 }),
      ),
      recordHealth: vi.fn((_animalId: string, _body: object): Observable<OperationResult> =>
        of(ok),
      ),
      recordHealthBatch: vi.fn((_body: object): Observable<OperationResult> => of(ok)),
    };
    const context = {
      selectedFarm: signal({ farmId: 'farm-1', farmName: 'F1' }),
      transitionPending: signal(false),
      contextVersion: signal(0),
      role: signal<MembershipRole | null>(role),
    };
    await TestBed.configureTestingModule({
      imports: [HealthPageComponent],
      providers: [
        { provide: HerdApi, useValue: api },
        { provide: ContextStore, useValue: context },
        { provide: ToastService, useValue: { show: vi.fn() } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(HealthPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    return { fixture, component: fixture.componentInstance, api, context };
  };

  it.each(['OWNER', 'ADMIN', 'MANAGER', 'OPERATOR'] as MembershipRole[])(
    '%s registra apenas após a revisão com a versão atual',
    async (role) => {
      const { component, api } = await setup(role);
      api.animal.mockReturnValue(of({ ...animal, version: 8 }));
      component.openCreate();
      component.chooseAnimal(animal);
      component.prepare();
      expect(api.recordHealth).not.toHaveBeenCalled();
      expect(component.reviewing()).toBe(true);
      component.save();
      expect(api.recordHealth).toHaveBeenCalledWith(
        'a1',
        expect.objectContaining({ expectedVersion: 8, operationId: expect.any(String) }),
      );
    },
  );
  it('visualizador consulta sem abrir ou confirmar tratamento', async () => {
    const { component, api, fixture } = await setup('VIEWER');
    component.openCreate();
    component.chooseAnimal(animal);
    component.prepare();
    component.save();
    fixture.detectChanges();
    expect(component.creating()).toBe(false);
    expect(api.recordHealth).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('.page-header button')).toBeNull();
  });
  it('preserva todo o comando e impede envio duplicado durante a nova tentativa', async () => {
    const { component, api } = await setup();
    component.openCreate();
    component.chooseAnimal(animal);
    component.product = 'Produto de teste';
    component.prepare();
    api.recordHealth.mockReturnValueOnce(throwError(() => Error('Falha temporária')));
    component.save();
    const first = api.recordHealth.mock.calls[0][1];
    const pending = new Subject<OperationResult>();
    api.recordHealth.mockReturnValue(pending);
    component.product = 'Outro produto';
    component.save();
    component.save();
    component.closeCreate();
    expect(component.creating()).toBe(true);
    expect(api.recordHealth).toHaveBeenCalledTimes(2);
    expect(api.recordHealth.mock.calls[1][1]).toBe(first);
    expect(first).toMatchObject({ product: 'Produto de teste' });
    pending.next(ok);
    expect(component.creating()).toBe(false);
  });
  it('cancela a escrita e limpa seleção, filtros e formulário na troca de contexto', async () => {
    const { component, api, context, fixture } = await setup();
    const pending = new Subject<OperationResult>();
    api.recordHealth.mockReturnValue(pending);
    component.openCreate();
    component.chooseAnimal(animal);
    component.product = 'Produto de teste';
    component.prepare();
    component.save();
    expect(pending.observed).toBe(true);
    context.transitionPending.set(true);
    context.contextVersion.update((v) => v + 1);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(pending.observed).toBe(false);
    expect(component.creating()).toBe(false);
    expect(component.animals()).toEqual([]);
    expect(component.product).toBe('');
    expect(component.report()).toBe(null);
  });
  it('seleciona animais por páginas de 20 e limita cada lote a 100', async () => {
    const { component, api, fixture } = await setup();
    component.openCreate();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(api.animals).toHaveBeenCalledWith(expect.objectContaining({ page: 0, size: 20 }));
    component.batch = true;
    for (let i = 0; i < 101; i++) component.chooseAnimal({ ...animal, id: 'animal-' + i });
    expect(component.animals()).toHaveLength(100);
    expect(component.formError()).toContain('100');
    component.removeAnimal('animal-0');
    expect(component.animals()).toHaveLength(99);
  });
  it('não revisa datas inexistentes, anteriores ao nascimento ou próximas aplicações invertidas', async () => {
    const { component, api } = await setup();
    component.openCreate();
    component.chooseAnimal({ ...animal, birthDate: '2025-01-01' });
    component.occurredOn = '2025-02-30';
    component.prepare();
    component.occurredOn = '2024-01-01';
    component.prepare();
    component.occurredOn = component.today;
    component.nextDueOn = '2024-01-01';
    component.prepare();
    expect(api.animal).not.toHaveBeenCalled();
    expect(component.reviewing()).toBe(false);
  });
  it('permite refazer a consulta de versões e não confirma dados indisponíveis', async () => {
    const { component, api } = await setup();
    component.openCreate();
    component.chooseAnimal(animal);
    api.animal.mockReturnValueOnce(throwError(() => Error('Indisponível')));
    component.prepare();
    component.save();
    expect(api.recordHealth).not.toHaveBeenCalled();
    expect(component.reviewing()).toBe(false);
    component.prepare();
    expect(component.reviewing()).toBe(true);
  });
  it('cancela a consulta anterior, filtra animal e período e não mostra zeros após falha', async () => {
    const { component, api, fixture } = await setup();
    const pending = new Subject<HealthReport>();
    api.healthReport.mockReturnValueOnce(pending);
    component.reload();
    expect(pending.observed).toBe(true);
    component.animalFilter = '11111111-1111-4111-8111-111111111111';
    component.from = '2026-01-01';
    component.to = component.today;
    component.changePage(2);
    expect(pending.observed).toBe(false);
    expect(api.healthReport).toHaveBeenLastCalledWith(
      expect.objectContaining({
        animalId: component.animalFilter,
        from: '2026-01-01',
        to: component.today,
        page: 2,
      }),
    );
    api.healthReport.mockReturnValue(throwError(() => Error('Indisponível')));
    component.reload();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.metric-strip')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Não foi possível carregar');
  });
  it('inicia com procedureCode nulo sem pré-seleção', async () => {
    const { component } = await setup();
    expect(component.procedureCode).toBeNull();
  });

  it('mostra o campo Procedimento somente para vacinação', async () => {
    const { fixture, component } = await setup();
    component.creating.set(true);
    fixture.detectChanges();
    const dialog = () =>
      fixture.nativeElement.querySelector('gr-dialog:last-of-type dialog') as HTMLElement;
    const tipoSelect = () =>
      Array.from(dialog().querySelectorAll('select')).find((s) =>
        (s as HTMLSelectElement).querySelector('option[value="VACCINATION"]'),
      ) as HTMLSelectElement;
    expect(dialog().textContent).toContain('Procedimento');
    expect(dialog().textContent).toContain('Brucelose');
    const sel = tipoSelect();
    sel.value = 'DEWORMING';
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.treatmentType).toBe('DEWORMING');
    expect(component.procedureCode).toBeNull();
    expect(dialog().textContent ?? '').not.toContain('Procedimento');
  });

  it('envia procedureCode no payload individual', async () => {
    const { component, api } = await setup();
    component.openCreate();
    component.chooseAnimal(animal);
    component.treatmentType = 'VACCINATION';
    component.procedureCode = 'BRUCELLOSIS';
    component.prepare();
    component.save();
    expect(api.recordHealth).toHaveBeenCalledOnce();
    expect(api.recordHealth.mock.calls[0][1]).toMatchObject({
      treatmentType: 'VACCINATION',
      procedureCode: 'BRUCELLOSIS',
    });
  });

  it('propaga procedureCode no payload batch em chamada única', async () => {
    const { component, api } = await setup();
    component.openCreate();
    component.batch = true;
    component.chooseAnimal(animal);
    component.treatmentType = 'VACCINATION';
    component.procedureCode = 'BRUCELLOSIS';
    component.prepare();
    component.save();
    expect(api.recordHealthBatch).toHaveBeenCalledOnce();
    expect(api.recordHealthBatch.mock.calls[0][0]).toMatchObject({
      treatmentType: 'VACCINATION',
      procedureCode: 'BRUCELLOSIS',
      animals: [{ id: 'a1', expectedVersion: 0 }],
    });
    expect(api.recordHealth).not.toHaveBeenCalled();
  });

  it('limpa procedureCode ao trocar para vermifugação sem restaurar ao voltar', async () => {
    const { component } = await setup();
    component.treatmentType = 'VACCINATION';
    component.procedureCode = 'BRUCELLOSIS';
    component.treatmentType = 'DEWORMING';
    component.onTreatmentTypeChange();
    expect(component.procedureCode).toBeNull();
    component.treatmentType = 'VACCINATION';
    component.onTreatmentTypeChange();
    expect(component.procedureCode).toBeNull();
  });

  it('salva vacinação sem procedimento com null e reseta ao reabrir', async () => {
    const { component, api } = await setup();
    component.openCreate();
    component.chooseAnimal(animal);
    component.treatmentType = 'VACCINATION';
    component.prepare();
    component.save();
    expect(api.recordHealth.mock.calls[0][1]).toMatchObject({
      treatmentType: 'VACCINATION',
      procedureCode: null,
    });
    component.procedureCode = 'BRUCELLOSIS';
    component.openCreate();
    expect(component.procedureCode).toBeNull();
  });

  it('mantém product independente de procedureCode', async () => {
    const { component, api } = await setup();
    component.openCreate();
    component.chooseAnimal(animal);
    component.treatmentType = 'VACCINATION';
    component.product = 'Brucelose X';
    component.prepare();
    component.save();
    expect(api.recordHealth.mock.calls[0][1]).toMatchObject({
      procedureCode: null,
      product: 'Brucelose X',
    });
    component.openCreate();
    component.chooseAnimal(animal);
    component.treatmentType = 'VACCINATION';
    component.procedureCode = 'BRUCELLOSIS';
    component.product = '';
    component.prepare();
    component.save();
    expect(api.recordHealth.mock.calls[1][1]).toMatchObject({
      procedureCode: 'BRUCELLOSIS',
      product: null,
    });
  });

  it('nunca envia BRUCELLOSIS com vermifugação mesmo com estado dessincronizado', async () => {
    const { component, api } = await setup();
    component.openCreate();
    component.chooseAnimal(animal);
    component.treatmentType = 'DEWORMING';
    component.procedureCode = 'BRUCELLOSIS';
    component.prepare();
    component.save();
    expect(api.recordHealth.mock.calls[0][1]).toMatchObject({
      treatmentType: 'DEWORMING',
      procedureCode: null,
    });
    component.openCreate();
    component.chooseAnimal(animal);
    component.treatmentType = 'DEWORMING';
    component.prepare();
    component.save();
    expect(api.recordHealth.mock.calls[1][1]).toMatchObject({
      treatmentType: 'DEWORMING',
      procedureCode: null,
    });
  });

  it('mostra os quatro totais do servidor e pagina sem limitar o resumo à página visível', async () => {
    const { component, api, fixture } = await setup();
    api.healthReport.mockReturnValue(of(populatedReport));
    component.reload();
    fixture.detectChanges();
    const metrics = Array.from(
      fixture.nativeElement.querySelectorAll('.health-metric'),
    ) as HTMLElement[];
    expect(metrics.map((metric) => metric.querySelector('strong')?.textContent?.trim())).toEqual([
      '25',
      '13',
      '18',
      '7',
    ]);
    expect(metrics[2].querySelector('.metric-track i')?.getAttribute('style')).toContain('72%');
    expect(fixture.nativeElement.textContent).toContain('Página 1 de 2');
    component.changePage(1);
    expect(api.healthReport).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1 }));
  });

  it('aplica os filtros no relatório do servidor e permite removê-los individualmente', async () => {
    const { component, api, fixture } = await setup();
    api.healthReport.mockReturnValue(of(populatedReport));
    component.reload();
    component.type = 'VACCINATION';
    component.filterProcedure = 'BRUCELLOSIS';
    component.from = '2026-09-01';
    component.applyFilters();
    fixture.detectChanges();
    expect(api.healthReport).toHaveBeenLastCalledWith(
      expect.objectContaining({
        treatmentType: 'VACCINATION',
        procedureCode: 'BRUCELLOSIS',
        from: '2026-09-01',
        page: 0,
      }),
    );
    expect(fixture.nativeElement.querySelectorAll('.active-filters button')).toHaveLength(3);
    component.removeFilter('procedure');
    expect(api.healthReport).toHaveBeenLastCalledWith(
      expect.objectContaining({ treatmentType: 'VACCINATION', procedureCode: undefined }),
    );
    component.filterByType('DEWORMING');
    expect(api.healthReport).toHaveBeenLastCalledWith(
      expect.objectContaining({ treatmentType: 'DEWORMING', procedureCode: undefined }),
    );
  });

  it('distingue histórico vazio de consulta sem resultados', async () => {
    const { component, api, fixture } = await setup();
    expect(fixture.nativeElement.textContent).toContain('Nenhum tratamento registrado');
    component.type = 'VACCINATION';
    component.applyFilters();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(
      'Nenhum tratamento corresponde aos filtros',
    );
    expect(api.healthReport).toHaveBeenLastCalledWith(
      expect.objectContaining({ treatmentType: 'VACCINATION' }),
    );
  });

  it('abre detalhe com os campos do registro e limpa o contexto ao trocar de fazenda', async () => {
    const { component, api, context, fixture } = await setup();
    api.healthReport.mockReturnValue(of(populatedReport));
    component.reload();
    component.selectedTreatment.set(treatment);
    component.filterPickerOpen.set(true);
    fixture.detectChanges();
    const detail = fixture.nativeElement.querySelectorAll('gr-dialog')[1] as HTMLElement;
    expect(detail.textContent).toContain('Vacina A');
    expect(detail.textContent).toContain('Protocolo B');
    expect(detail.textContent).toContain('Registrado pelo veterinário.');
    context.transitionPending.set(true);
    context.contextVersion.update((v) => v + 1);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.selectedTreatment()).toBeNull();
    expect(component.filterPickerOpen()).toBe(false);
    expect(component.report()).toBeNull();
  });
});
