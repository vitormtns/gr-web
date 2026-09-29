import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideLucideIcons, LucidePlus, LucideLandPlot } from '@lucide/angular';
import { Observable, Subject, of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { AppError, MembershipRole } from '../../core/api/api.models';
import { ContextStore } from '../../core/context/context.store';
import { ToastService } from '../../design-system/feedback/feedback';
import { AdministrationApi } from './administration-api.service';
import { AdminFarm } from './administration.models';
import { FarmsPageComponent } from './farms-page.component';

HTMLDialogElement.prototype.showModal ??= function () { this.open = true; };
HTMLDialogElement.prototype.close ??= function () { this.open = false; };
const farm:AdminFarm={id:'f',organizationId:'o',name:'Fazenda Norte',status:'ACTIVE',version:7};
function mocks(){return{farms:vi.fn(():Observable<AdminFarm[]>=>of([farm])),farm:vi.fn(():Observable<AdminFarm>=>of(farm)),createFarm:vi.fn(():Observable<AdminFarm>=>of(farm)),updateFarm:vi.fn(():Observable<AdminFarm>=>of(farm))};}
async function setup(role:MembershipRole='OWNER',initialize?:(api:ReturnType<typeof mocks>)=>void){
 const api=mocks();initialize?.(api);const context={contextVersion:signal(0),transitionPending:signal(false),selectedOrganization:signal({organizationId:'o',organizationName:'Grupo',farmScopeMode:'ALL_FARMS'}),selectedFarm:signal({farmId:'f',farmName:'Fazenda Norte'}),role:signal<MembershipRole|null>(role),revalidateAccess:vi.fn(()=>Promise.resolve())};const toast={show:vi.fn()};
 await TestBed.configureTestingModule({imports:[FarmsPageComponent],providers:[provideRouter([]),provideLucideIcons(LucidePlus,LucideLandPlot),{provide:AdministrationApi,useValue:api},{provide:ContextStore,useValue:context},{provide:ToastService,useValue:toast}]}).compileComponents();const fixture=TestBed.createComponent(FarmsPageComponent);fixture.detectChanges();await fixture.whenStable();return{fixture,component:fixture.componentInstance,api,context,toast};
}
describe('Administração de fazendas',()=>{
 it.each(['MANAGER','OPERATOR','VIEWER'] as MembershipRole[])('%s consulta detalhes sem escrita',async role=>{const{component,api}=await setup(role);component.openCreate();expect(component.dialogOpen()).toBe(false);component.openEdit(farm);expect(api.farm).toHaveBeenCalledWith('o','f');component.farmName='Alteração';component.prepare();component.save();expect(api.updateFarm).not.toHaveBeenCalled();});
 it.each(['OWNER','ADMIN'] as MembershipRole[])('%s confirma arquivamento usando a versão atual',async role=>{const{component,api}=await setup(role);component.openEdit(farm);component.farmStatus='ARCHIVED';component.save();expect(api.updateFarm).not.toHaveBeenCalled();component.prepare();component.save();expect(api.updateFarm).toHaveBeenCalledWith('o','f',{name:farm.name,status:'ARCHIVED',expectedVersion:7});});
 it('erro na consulta individual bloqueia correção e criação',async()=>{const{component,api}=await setup('OWNER',a=>a.farm.mockReturnValue(throwError(()=>new AppError('not-found','',404,'PLATFORM_FARM_NOT_FOUND'))));component.openEdit(farm);component.prepare();component.save();expect(component.editorFailed()).toBe(true);expect(api.createFarm).not.toHaveBeenCalled();expect(api.updateFarm).not.toHaveBeenCalled();});
 it('fecha editor, cancela escrita antiga e impede feedback após troca',async()=>{const pending=new Subject<AdminFarm>();const{fixture,component,context,api,toast}=await setup('OWNER',a=>a.createFarm.mockReturnValue(pending));component.openCreate();component.farmName='Fazenda temporária';component.prepare();component.save();component.save();expect(api.createFarm).toHaveBeenCalledTimes(1);context.transitionPending.set(true);fixture.detectChanges();expect(pending.observed).toBe(false);expect(component.dialogOpen()).toBe(false);expect(component.farms()).toEqual([]);expect(component.saving()).toBe(false);pending.next(farm);expect(toast.show).not.toHaveBeenCalled();});
 it('retry conserva o UUID e respostas tardias não reabrem o editor',async()=>{const pending=new Subject<AdminFarm>();const{component,api}=await setup('OWNER',a=>a.createFarm.mockReturnValue(pending));component.openCreate();component.farmName='Nova fazenda';component.prepare();component.save();pending.error(new AppError('unavailable','',503,'UNAVAILABLE'));api.createFarm.mockReturnValue(of(farm));component.save();expect(api.createFarm.mock.calls[0]).toEqual(api.createFarm.mock.calls[1]);const read=new Subject<AdminFarm>();api.farm.mockReturnValue(read);component.openEdit(farm);component.closeDialog();read.next({...farm,name:'Resposta antiga'});expect(component.dialogOpen()).toBe(false);expect(component.farmName).not.toBe('Resposta antiga');});
 it('filtra e pagina a lista completa sem esconder fazendas arquivadas',async()=>{const{component}=await setup('OWNER',a=>a.farms.mockReturnValue(of(Array.from({length:25},(_,i)=>({...farm,id:String(i),name:`Fazenda ${i}`,status:'ARCHIVED' as const})))));expect(component.visible()).toHaveLength(20);component.page.set(1);expect(component.visible()).toHaveLength(5);component.page.set(0);component.filterStatus.set('ACTIVE');expect(component.filtered()).toEqual([]);component.filterStatus.set('ARCHIVED');component.search.set('Fazenda 24');expect(component.visible().map(f=>f.id)).toEqual(['24']);});
});
