import { describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { ApiClient } from '../../core/api/api-client.service';
import { HerdApi } from './herd-api.service';

describe('HerdApi', () => {
  const setup=()=>{const client={get:vi.fn(()=>of({})),post:vi.fn(()=>of({})),patch:vi.fn(()=>of({}))} as unknown as ApiClient;return{client,api:new HerdApi(client)}};
  it('usa contexto de tenant em todas as leituras operacionais',()=>{const {client,api}=setup();api.animal('a').subscribe();expect(client.get).toHaveBeenCalledWith('/api/v1/herd/animals/a',true);api.paddocks().subscribe();expect(client.get).toHaveBeenLastCalledWith('/api/v1/herd/paddocks?status=ACTIVE&page=0&size=100',true);});
  it('preserva o comando de criação fornecido pelo chamador',()=>{const {client,api}=setup();const body={id:'fixed-id',identification:'BR-01',name:null,sex:'FEMALE',birthDate:null};api.create(body).subscribe();expect(client.post).toHaveBeenCalledWith('/api/v1/herd/animals',body,true);});
  it('envia expectedVersion e operationId sem substituí-los no movimento',()=>{const {client,api}=setup();const body={operationId:'stable',expectedVersion:7,destinationPaddockId:'p',occurredOn:'2026-09-17'};api.move('animal',body).subscribe();expect(client.post).toHaveBeenCalledWith('/api/v1/herd/animals/animal/movements',body,true);});
  it('usa o endpoint atômico real e o campo animalId para lote',()=>{const {client,api}=setup();const body={operationId:'stable',animals:[{animalId:'a',expectedVersion:1}]};api.moveBatch(body).subscribe();expect(client.post).toHaveBeenCalledWith('/api/v1/herd/movements/batch',body,true);});
  it('não envia contexto atual ao consultar fazendas acessíveis',()=>{const {client,api}=setup();api.accessibleFarms('org').subscribe();expect(client.get).toHaveBeenCalledWith('/api/v1/me/organizations/org/farms');});
});
