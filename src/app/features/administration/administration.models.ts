import { MembershipRole } from '../../core/api/api.models';

export type FarmScopeMode = 'ALL_FARMS' | 'SELECTED_FARMS';
export type ResourceStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'ARCHIVED' | 'REVOKED';
export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED';

export interface OrganizationAdmin { id:string;name:string;status:ResourceStatus;version:number }
export interface AdminFarm { id:string;organizationId:string;name:string;status:ResourceStatus;version:number }
export interface AdminMember { membershipId:string;userId:string;displayName:string|null;email:string|null;role:MembershipRole;status:ResourceStatus;scopeMode:FarmScopeMode;farmIds:string[];version:number;createdAt:string }
export interface AdminInvitation { id:string;email:string;role:MembershipRole;scopeMode:FarmScopeMode;status:InvitationStatus;expiresAt:string;createdAt:string }
export interface InvitationCreated { invitation:AdminInvitation;token:string }
export interface AccessDraft { role:MembershipRole;scopeMode:FarmScopeMode;farmIds:string[] }

export const roleLabels:Record<MembershipRole,string>={OWNER:'Proprietário',ADMIN:'Administrador',MANAGER:'Gerente',OPERATOR:'Operador',VIEWER:'Visualizador'};
export const roleDescriptions:Record<MembershipRole,string>={
  OWNER:'Administra a organização, fazendas, pessoas e acessos.',
  ADMIN:'Administra fazendas e acessos, exceto proprietários e administradores.',
  MANAGER:'Conduz a operação e as rotinas de gestão das fazendas permitidas.',
  OPERATOR:'Registra e atualiza atividades operacionais nas fazendas permitidas.',
  VIEWER:'Consulta informações, sem realizar alterações operacionais.',
};
export const statusLabels:Record<string,string>={ACTIVE:'Ativa',INACTIVE:'Inativa',SUSPENDED:'Suspensa',ARCHIVED:'Arquivada',REVOKED:'Acesso revogado',PENDING:'Pendente',ACCEPTED:'Aceito',EXPIRED:'Expirado'};
export const roleOptions:MembershipRole[]=['OWNER','ADMIN','MANAGER','OPERATOR','VIEWER'];

export function accessSummary(scope:FarmScopeMode,farmIds:string[],farms:AdminFarm[]):string{
  if(scope==='ALL_FARMS')return'Todas as fazendas';
  const names=farmIds.map(id=>farms.find(farm=>farm.id===id)?.name).filter((name):name is string=>!!name);
  if(!names.length)return'Nenhuma fazenda disponível';
  if(names.length<=2)return names.join(', ');
  return`${names.length} fazendas · ${names.slice(0,2).join(', ')} e mais ${names.length-2}`;
}

export function canManageMember(actor:MembershipRole|null,target:MembershipRole):boolean{
  return actor==='OWNER'||(actor==='ADMIN'&&!['OWNER','ADMIN'].includes(target));
}
