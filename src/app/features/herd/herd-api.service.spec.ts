import { describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { ApiClient } from '../../core/api/api-client.service';
import { HerdApi } from './herd-api.service';

describe('HerdApi', () => {
  it('serializa presença de localização sem descartar false', () => {
    const { api, client } = setup();
    api
      .animals({ search: '', sex: '', status: 'ACTIVE', page: 0, size: 20, unlocated: true })
      .subscribe();
    expect(client.get).toHaveBeenCalledWith(
      '/api/v1/herd/animals?page=0&size=20&status=ACTIVE&unlocated=true',
      true,
    );
    api
      .animals({ search: '', sex: '', status: '', page: 2, size: 20, unlocated: false })
      .subscribe();
    expect(client.get).toHaveBeenLastCalledWith(
      '/api/v1/herd/animals?page=2&size=20&unlocated=false',
      true,
    );
  });
  it('consulta todas as páginas do catálogo e mantém o contexto explícito do destino', () => {
    const paddock = { id: 'p' };
    const client = {
      getInFarm: vi.fn((_path: string, _org: string, _farm: string) =>
        of({ items: [paddock], page: 0, totalPages: 2 }),
      ),
    } as unknown as ApiClient;
    (client.getInFarm as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(of({ items: [paddock], page: 0, totalPages: 2 }))
      .mockReturnValueOnce(of({ items: [{ id: 'p2' }], page: 1, totalPages: 2 }));
    let result: unknown;
    new HerdApi(client)
      .allPaddocks({ organizationId: 'o', farmId: 'd' })
      .subscribe((value) => (result = value));
    expect(result).toEqual([paddock, { id: 'p2' }]);
    expect(client.getInFarm).toHaveBeenNthCalledWith(
      2,
      '/api/v1/herd/paddocks?status=ACTIVE&page=1&size=100',
      'o',
      'd',
    );
  });
  it('preserva filtros e versão nos contratos de custódia e pesagem em lote', () => {
    const { client, api } = setup();
    const weights = {
      operationId: 'op',
      animals: [{ id: 'a', expectedVersion: 9, weightKg: '418.750', measuredOn: '2026-09-29' }],
    };
    api.recordWeightBatch(weights).subscribe();
    expect(client.post).toHaveBeenCalledWith('/api/v1/herd/weights/batch', weights, true);
    const transfer = {
      operationId: 't',
      destinationFarmId: 'dest',
      animals: [{ animalId: 'a', expectedVersion: 9 }],
    };
    api.transferBatch(transfer).subscribe();
    expect(client.post).toHaveBeenCalledWith('/api/v1/herd/transfers/batch', transfer, true);
    api.transfers({ direction: 'OUT', animalId: 'a', page: 2 }).subscribe();
    expect(client.get).toHaveBeenCalledWith(
      '/api/v1/herd/transfers?page=2&size=20&direction=OUT&animalId=a',
      true,
    );
    api.transferDetail('t/1').subscribe();
    expect(client.get).toHaveBeenCalledWith('/api/v1/herd/transfers/t%2F1', true);
  });
  const setup = () => {
    const client = {
      get: vi.fn(() => of({})),
      post: vi.fn(() => of({})),
      patch: vi.fn(() => of({})),
    } as unknown as ApiClient;
    return { client, api: new HerdApi(client) };
  };
  it('usa contexto de tenant em todas as leituras operacionais', () => {
    const { client, api } = setup();
    api.animal('a').subscribe();
    expect(client.get).toHaveBeenCalledWith('/api/v1/herd/animals/a', true);
    api.paddocks().subscribe();
    expect(client.get).toHaveBeenLastCalledWith(
      '/api/v1/herd/paddocks?status=ACTIVE&page=0&size=100',
      true,
    );
  });
  it('preserva o comando de criação fornecido pelo chamador', () => {
    const { client, api } = setup();
    const body = {
      id: 'fixed-id',
      identification: 'BR-01',
      name: null,
      sex: 'FEMALE',
      birthDate: null,
    };
    api.create(body).subscribe();
    expect(client.post).toHaveBeenCalledWith('/api/v1/herd/animals', body, true);
  });
  it('envia expectedVersion e operationId sem substituí-los no movimento', () => {
    const { client, api } = setup();
    const body = {
      operationId: 'stable',
      expectedVersion: 7,
      destinationPaddockId: 'p',
      occurredOn: '2026-09-17',
    };
    api.move('animal', body).subscribe();
    expect(client.post).toHaveBeenCalledWith('/api/v1/herd/animals/animal/movements', body, true);
  });
  it('usa o endpoint atômico real e o campo animalId para lote', () => {
    const { client, api } = setup();
    const body = { operationId: 'stable', animals: [{ animalId: 'a', expectedVersion: 1 }] };
    api.moveBatch(body).subscribe();
    expect(client.post).toHaveBeenCalledWith('/api/v1/herd/movements/batch', body, true);
  });
  it('não envia contexto atual ao consultar fazendas acessíveis', () => {
    const { client, api } = setup();
    api.accessibleFarms('org').subscribe();
    expect(client.get).toHaveBeenCalledWith('/api/v1/me/organizations/org/farms');
  });
  it('mapeia pesagem e tratamento para os endpoints de domínio', () => {
    const { client, api } = setup();
    const weight = {
      operationId: 'op',
      expectedVersion: 2,
      weightKg: '412.750',
      measuredOn: '2026-09-17',
    };
    api.recordWeight('animal/1', weight).subscribe();
    expect(client.post).toHaveBeenCalledWith(
      '/api/v1/herd/animals/animal%2F1/weights',
      weight,
      true,
    );
    const health = {
      operationId: 'op-2',
      expectedVersion: 3,
      treatmentType: 'VACCINATION',
      procedureCode: 'BRUCELLOSIS',
      occurredOn: '2026-09-17',
    };
    api.recordHealth('animal', health).subscribe();
    expect(client.post).toHaveBeenCalledWith(
      '/api/v1/herd/animals/animal/health-treatments',
      health,
      true,
    );
  });
  it('preserva filtros server-side de pendências e agenda', () => {
    const { client, api } = setup();
    api.pendingWork({ type: 'WEIGHING_DUE', animalId: 'a', page: 2 }).subscribe();
    expect(client.get).toHaveBeenCalledWith(
      '/api/v1/herd/pending-work?page=2&size=20&type=WEIGHING_DUE&animalId=a',
      true,
    );
    api
      .agenda({ source: 'DERIVED', type: 'CALVING', from: '2026-09-01', to: '2026-09-30' })
      .subscribe();
    expect(client.get).toHaveBeenCalledWith(
      '/api/v1/herd/agenda?page=0&size=20&source=DERIVED&type=CALVING&from=2026-09-01&to=2026-09-30',
      true,
    );
  });
  it('consulta gestações de toda a fazenda com filtros e paginação no servidor', () => {
    const { client, api } = setup();
    api.allPregnancies({ status: 'CONFIRMED', motherId: 'mother', serviceType: 'INSEMINATION', page: 2 }).subscribe();
    expect(client.get).toHaveBeenCalledWith(
      '/api/v1/herd/pregnancies?page=2&size=20&status=CONFIRMED&motherId=mother&serviceType=INSEMINATION',
      true,
    );
  });
  it('envia versionamento otimista nas transições de gestação e planner', () => {
    const { client, api } = setup();
    const transition = { operationId: 'stable', expectedVersion: 4, occurredOn: '2026-09-17' };
    api.confirmPregnancy('pregnancy', transition).subscribe();
    expect(client.post).toHaveBeenCalledWith(
      '/api/v1/herd/pregnancies/pregnancy/confirmation',
      transition,
      true,
    );
    const planner = { operationId: 'planner-op', expectedVersion: 7 };
    api.completePlanner('item', planner).subscribe();
    expect(client.post).toHaveBeenCalledWith(
      '/api/v1/herd/planner-items/item/completion',
      planner,
      true,
    );
  });
  it('mantém planner separado dos registros de manejo', () => {
    const { client, api } = setup();
    const body = {
      operationId: 'x',
      type: 'VACCINATION',
      title: 'Vacinar lote',
      scheduledFor: '2026-09-20',
      animalId: null,
    };
    api.createPlanner(body).subscribe();
    expect(client.post).toHaveBeenCalledWith('/api/v1/herd/planner-items', body, true);
    expect(client.post).not.toHaveBeenCalledWith(
      '/api/v1/herd/health-treatments/batch',
      expect.anything(),
      true,
    );
  });
  it('lê o item exato do planejador antes de uma transição', () => {
    const { client, api } = setup();
    api.plannerItem('item/1').subscribe();
    expect(client.get).toHaveBeenCalledWith('/api/v1/herd/planner-items/item%2F1', true);
  });
});
