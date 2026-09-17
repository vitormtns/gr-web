import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { ApiClient } from '../../core/api/api-client.service';
import { AdministrationApi } from './administration-api.service';

describe('AdministrationApi',()=>{
  it('mantém o tenant somente no caminho validado pelo backend',()=>{const get=vi.fn(()=>of([]));const api=new AdministrationApi({get} as unknown as ApiClient);api.members('org segura',2,25).subscribe();expect(get).toHaveBeenCalledWith('/api/v1/organizations/org%20segura/members?page=2&size=25');});
  it('remove membership com expectedVersion e sem confundir com conta global',()=>{const remove=vi.fn(()=>of(undefined));const api=new AdministrationApi({delete:remove} as unknown as ApiClient);api.revokeMember('org-a','member-a',7).subscribe();expect(remove).toHaveBeenCalledWith('/api/v1/organizations/org-a/members/member-a?expectedVersion=7');});
  it('normaliza ALL_FARMS para uma seleção vazia',()=>{const patch=vi.fn(()=>of({}));const api=new AdministrationApi({patch} as unknown as ApiClient);api.updateMember('org-a','member-a',{role:'MANAGER',scopeMode:'ALL_FARMS',farmIds:['farm-indevida']},3).subscribe();expect(patch).toHaveBeenCalledWith('/api/v1/organizations/org-a/members/member-a',{role:'MANAGER',farmScopeMode:'ALL_FARMS',farmIds:[],expectedVersion:3});});
  it('usa o fluxo oficial de convite por e-mail',()=>{const post=vi.fn(()=>of({}));const api=new AdministrationApi({post} as unknown as ApiClient);api.invite('org-a','pessoa@example.test',{role:'VIEWER',scopeMode:'SELECTED_FARMS',farmIds:['farm-a']}).subscribe();expect(post).toHaveBeenCalledWith('/api/v1/organizations/org-a/invitations',{email:'pessoa@example.test',role:'VIEWER',farmScopeMode:'SELECTED_FARMS',farmIds:['farm-a']});});
});
