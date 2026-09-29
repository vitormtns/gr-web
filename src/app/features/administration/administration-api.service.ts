import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../core/api/api-client.service';
import { AdministrativeOrganization, AdminAuditEvent, AdminFarm, AdminInvitation, AdminMember, AccessDraft, InvitationCreated, OrganizationAdmin } from './administration.models';
import { queryString } from '../management/management.shared';

@Injectable({providedIn:'root'})
export class AdministrationApi {
  constructor(private readonly api:ApiClient){}
  administrativeOrganizations():Observable<AdministrativeOrganization[]>{return this.api.get('/api/v1/me/administrative-organizations')}
  createOrganization(body:{id:string;name:string}):Observable<OrganizationAdmin>{return this.api.post('/api/v1/organizations',body)}
  currentFarm():Observable<AdminFarm>{return this.api.get('/api/v1/farms/current',true)}
  updateCurrentFarm(body:{name:string;expectedVersion:number}):Observable<AdminFarm>{return this.api.patch('/api/v1/farms/current',body,true)}
  farm(organizationId:string,farmId:string):Observable<AdminFarm>{return this.api.get(`/api/v1/organizations/${encodeURIComponent(organizationId)}/farms/${encodeURIComponent(farmId)}`)}
  addMember(organizationId:string,userId:string,draft:AccessDraft):Observable<AdminMember>{return this.api.post(`/api/v1/organizations/${encodeURIComponent(organizationId)}/members`,{userId,role:draft.role,farmScopeMode:draft.scopeMode,farmIds:draft.scopeMode==='ALL_FARMS'?[]:draft.farmIds})}
  audit(id:string,eventType='',farmId='',page=0,size=25):Observable<AdminAuditEvent[]>{return this.api.get(`/api/v1/organizations/${encodeURIComponent(id)}/audit?${queryString({eventType,farmId,page,size})}`)}
  organization(id:string):Observable<OrganizationAdmin>{return this.api.get(`/api/v1/organizations/${encodeURIComponent(id)}`)}
  updateOrganization(id:string,body:{name?:string;status?:string;expectedVersion:number}):Observable<OrganizationAdmin>{return this.api.patch(`/api/v1/organizations/${encodeURIComponent(id)}`,body)}
  farms(id:string):Observable<AdminFarm[]>{return this.api.get(`/api/v1/organizations/${encodeURIComponent(id)}/farms`)}
  createFarm(id:string,body:{id:string;name:string}):Observable<AdminFarm>{return this.api.post(`/api/v1/organizations/${encodeURIComponent(id)}/farms`,body)}
  updateFarm(organizationId:string,farmId:string,body:{name?:string;status?:string;expectedVersion:number}):Observable<AdminFarm>{return this.api.patch(`/api/v1/organizations/${encodeURIComponent(organizationId)}/farms/${encodeURIComponent(farmId)}`,body)}
  members(id:string,page=0,size=50):Observable<AdminMember[]>{return this.api.get(`/api/v1/organizations/${encodeURIComponent(id)}/members?page=${page}&size=${size}`)}
  updateMember(organizationId:string,membershipId:string,draft:AccessDraft,expectedVersion:number):Observable<AdminMember>{return this.api.patch(`/api/v1/organizations/${encodeURIComponent(organizationId)}/members/${encodeURIComponent(membershipId)}`,{role:draft.role,farmScopeMode:draft.scopeMode,farmIds:draft.scopeMode==='ALL_FARMS'?[]:draft.farmIds,expectedVersion})}
  revokeMember(organizationId:string,membershipId:string,expectedVersion:number):Observable<void>{return this.api.delete(`/api/v1/organizations/${encodeURIComponent(organizationId)}/members/${encodeURIComponent(membershipId)}?expectedVersion=${expectedVersion}`)}
  invitations(id:string,status='PENDING',page=0,size=50):Observable<AdminInvitation[]>{return this.api.get(`/api/v1/organizations/${encodeURIComponent(id)}/invitations?${queryString({status,page,size})}`)}
  invite(id:string,email:string,draft:AccessDraft):Observable<InvitationCreated>{return this.api.post(`/api/v1/organizations/${encodeURIComponent(id)}/invitations`,{email,role:draft.role,farmScopeMode:draft.scopeMode,farmIds:draft.scopeMode==='ALL_FARMS'?[]:draft.farmIds})}
  revokeInvitation(organizationId:string,invitationId:string):Observable<void>{return this.api.post(`/api/v1/organizations/${encodeURIComponent(organizationId)}/invitations/${encodeURIComponent(invitationId)}/revocation`,{})}
  acceptInvitation(token:string):Observable<void>{return this.api.post(`/api/v1/invitations/${encodeURIComponent(token)}/accept`,{})}
}
