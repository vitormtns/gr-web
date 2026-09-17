import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AppError } from '../../core/api/api.models';
import { ContextStore } from '../../core/context/context.store';
import { PermissionService } from '../../core/permissions/permission.service';
import { EmptyStateComponent, ErrorStateComponent, SkeletonComponent, ToastService } from '../../design-system/feedback/feedback';
import { DialogComponent } from '../../design-system/surfaces/surfaces';
import { AdministrationApi } from './administration-api.service';
import { AdminFarm, AdminMember, OrganizationAdmin, roleLabels, statusLabels } from './administration.models';
import { AdministrationHeaderComponent } from './administration-header.component';

@Component({selector:'app-administration-page',imports:[FormsModule,RouterLink,AdministrationHeaderComponent,DialogComponent,SkeletonComponent,ErrorStateComponent,EmptyStateComponent],template:`
<div class="admin-page page-enter"><app-administration-header/>
@if(state()==='loading'){<section class="admin-skeleton" aria-label="Carregando administração"><gr-skeleton/><div><gr-skeleton/><gr-skeleton/><gr-skeleton/></div></section>}
@else if(state()==='error'){<gr-error-state level="page" title="Não foi possível carregar a administração" description="Seu acesso pode ter mudado. Recarregue os dados para continuar." [reference]="reference" (retry)="load()"/>}
@else if(!organization()){<gr-empty-state title="Nenhuma organização disponível" description="Sua conta ainda não possui acesso a uma organização."/>}
@else{
  <section class="admin-intro"><div><span>VISÃO GERAL</span><h2>{{organization()!.name}}</h2><p>Estrutura administrativa e alcance do seu acesso no BovNex.</p></div><span class="status" [class.muted]="organization()!.status!=='ACTIVE'">{{statusLabels[organization()!.status]||organization()!.status}}</span></section>
  <section class="overview-grid" aria-label="Resumo da organização">
    <article><span>Fazendas</span><strong>{{farms().length}}</strong><p>{{activeFarms}} ativas nesta organização</p><a routerLink="/administracao/fazendas">Ver fazendas</a></article>
    <article><span>Pessoas</span><strong>{{permissions.canManageUsers()?(members().length===100?'100+':members().length):'—'}}</strong><p>{{permissions.canManageUsers()?'participantes visíveis':'Informação restrita a administradores'}}</p>@if(permissions.canManageUsers()){<a routerLink="/administracao/pessoas">Ver pessoas e acessos</a>}</article>
    <article class="access-card"><span>Seu acesso</span><strong>{{roleLabel}}</strong><p>{{scopeLabel}}</p><small>As permissões são sempre confirmadas pelo servidor.</small></article>
  </section>
  <section class="organization-panel"><div><span>ORGANIZAÇÃO</span><h2>Identidade administrativa</h2><p>O nome identifica este ambiente para todas as pessoas com acesso.</p></div><dl><div><dt>Nome</dt><dd>{{organization()!.name}}</dd></div><div><dt>Situação</dt><dd>{{statusLabels[organization()!.status]||organization()!.status}}</dd></div></dl>@if(permissions.canManageOrganization()){<button class="secondary" type="button" (click)="openEdit()">Editar nome</button>}@else{<small>Somente um proprietário pode alterar a organização.</small>}</section>
}
</div>
<gr-dialog [open]="editOpen()" (closed)="closeEdit()"><strong dialog-title>Editar organização</strong><form id="organization-form" (ngSubmit)="saveOrganization()"><label><span>Nome da organização</span><input name="organizationName" [(ngModel)]="organizationName" maxlength="160" required autofocus/></label>@if(formError()){<p class="form-error" role="alert">{{formError()}}</p>}</form><div dialog-actions><button class="secondary" type="button" (click)="closeEdit()">Cancelar</button><button class="primary" type="submit" form="organization-form" [disabled]="saving()">{{saving()?'Salvando…':'Salvar alterações'}}</button></div></gr-dialog>
`,styleUrl:'./administration.scss',changeDetection:ChangeDetectionStrategy.OnPush})
export class AdministrationPageComponent{
  private readonly api=inject(AdministrationApi);private readonly destroyRef=inject(DestroyRef);private readonly toast=inject(ToastService);readonly context=inject(ContextStore);readonly permissions=inject(PermissionService);
  readonly state=signal<'loading'|'ready'|'error'>('loading');readonly error=signal<AppError|null>(null);readonly organization=signal<OrganizationAdmin|null>(null);readonly farms=signal<AdminFarm[]>([]);readonly members=signal<AdminMember[]>([]);readonly editOpen=signal(false);readonly saving=signal(false);readonly formError=signal('');readonly statusLabels=statusLabels;organizationName='';private generation=0;
  constructor(){effect(()=>{this.context.contextVersion();this.context.selectedOrganization();if(!this.context.transitionPending())this.load();});}
  get reference(){return this.error()?.requestId||''}get activeFarms(){return this.farms().filter(f=>f.status==='ACTIVE').length}get roleLabel(){const role=this.context.role();return role?roleLabels[role]:'Não disponível'}get scopeLabel(){return this.context.selectedOrganization()?.farmScopeMode==='ALL_FARMS'?'Todas as fazendas':'Somente fazendas selecionadas'}
  load(){const selected=this.context.selectedOrganization();if(!selected){this.organization.set(null);this.state.set('ready');return;}const current=++this.generation;this.state.set('loading');this.error.set(null);const requests:{organization:ReturnType<AdministrationApi['organization']>;farms:ReturnType<AdministrationApi['farms']>;members?:ReturnType<AdministrationApi['members']>}={organization:this.api.organization(selected.organizationId),farms:this.api.farms(selected.organizationId)};if(this.permissions.canManageUsers())requests.members=this.api.members(selected.organizationId,0,100);forkJoin(requests).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({next:data=>{if(current!==this.generation)return;this.organization.set(data.organization);this.farms.set(data.farms);this.members.set(data.members||[]);this.state.set('ready');},error:error=>{if(current!==this.generation)return;this.error.set(error instanceof AppError?error:null);this.state.set('error');}})}
  openEdit(){this.organizationName=this.organization()?.name||'';this.formError.set('');this.editOpen.set(true)}closeEdit(){if(!this.saving())this.editOpen.set(false)}
  saveOrganization(){const organization=this.organization();const name=this.organizationName.trim();if(!organization||!name){this.formError.set('Nome da organização é obrigatório.');return;}this.saving.set(true);this.formError.set('');this.api.updateOrganization(organization.id,{name,expectedVersion:organization.version}).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({next:value=>{this.organization.set(value);this.editOpen.set(false);this.saving.set(false);this.toast.show('success','Organização atualizada','O novo nome já está em uso.');void this.context.revalidateAccess();},error:error=>{this.saving.set(false);this.formError.set(error instanceof AppError&&error.kind==='conflict'?'A organização foi atualizada em outra sessão. Recarregue os dados.':'Não foi possível salvar a organização.');}})}
}
