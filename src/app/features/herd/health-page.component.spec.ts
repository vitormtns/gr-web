import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Observable, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { ContextStore } from '../../core/context/context.store';
import { PermissionService } from '../../core/permissions/permission.service';
import { ToastService } from '../../design-system/feedback/feedback';
import { HerdApi } from './herd-api.service';
import { HealthPageComponent } from './health-page.component';
import { Animal } from './herd.models';
import { HealthReport } from './herd-operations.models';

// jsdom não implementa <dialog>.showModal/close usados pelo design-system.
for (const method of ['showModal', 'close'] as const) {
  const proto = HTMLDialogElement.prototype as unknown as Record<string, unknown>;
  if (typeof proto[method] !== 'function') proto[method] = () => {};
}

describe('HealthPageComponent procedureCode',()=>{
  const animal:Animal={id:'a1',identification:'A1',name:null,sex:'FEMALE',birthDate:null,status:'ACTIVE',version:0,paddock:null};
  const report:HealthReport={items:[],page:0,size:20,totalElements:0,totalPages:0,summary:{treatmentsCount:0,animalsTreated:0,countsByTreatmentType:{}}};
  const ok={operationId:'op',animals:[],replayed:false};
  const setup=async()=>{
    const api={healthReport:vi.fn(():Observable<HealthReport>=>of(report)),animals:vi.fn(()=>of({items:[animal],page:0,size:20,totalElements:1,totalPages:1})),recordHealth:vi.fn((_animalId:string,_body:object)=>of(ok)),recordHealthBatch:vi.fn((_body:object)=>of(ok))};
    const context={selectedFarm:signal({farmId:'farm-1',farmName:'F1'}),transitionPending:signal(false),contextVersion:signal(0)};
    await TestBed.configureTestingModule({imports:[HealthPageComponent],providers:[{provide:HerdApi,useValue:api},{provide:ContextStore,useValue:context},{provide:PermissionService,useValue:{canMutateHerd:signal(true)}},{provide:ToastService,useValue:{show:vi.fn()}}]}).compileComponents();
    const fixture=TestBed.createComponent(HealthPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    return{fixture,component:fixture.componentInstance,api};
  };

  it('inicia com procedureCode nulo sem pré-seleção',async()=>{
    const{component}=await setup();
    expect(component.procedureCode).toBeNull();
  });

  it('mostra o campo Procedimento somente para vacinação',async()=>{
    const{fixture,component}=await setup();
    component.creating.set(true);
    fixture.detectChanges();
    const dialog=()=>fixture.nativeElement.querySelector('dialog') as HTMLElement;
    const tipoSelect=()=>Array.from(dialog().querySelectorAll('select')).find((s)=>(s as HTMLSelectElement).querySelector('option[value="VACCINATION"]')) as HTMLSelectElement;
    expect(dialog().textContent).toContain('Procedimento');
    expect(dialog().textContent).toContain('Brucelose');
    const sel=tipoSelect();
    sel.value='DEWORMING';
    sel.dispatchEvent(new Event('change',{bubbles:true}));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.treatmentType).toBe('DEWORMING');
    expect(component.procedureCode).toBeNull();
    expect(dialog().textContent ?? '').not.toContain('Procedimento');
  });

  it('envia procedureCode no payload individual',async()=>{
    const{component,api}=await setup();
    component.openCreate();
    component.animalId='a1';
    component.treatmentType='VACCINATION';
    component.procedureCode='BRUCELLOSIS';
    component.save();
    expect(api.recordHealth).toHaveBeenCalledOnce();
    expect(api.recordHealth.mock.calls[0][1]).toMatchObject({treatmentType:'VACCINATION',procedureCode:'BRUCELLOSIS'});
  });

  it('propaga procedureCode no payload batch em chamada única',async()=>{
    const{component,api}=await setup();
    component.openCreate();
    component.batch=true;
    component.animalIds=['a1'];
    component.treatmentType='VACCINATION';
    component.procedureCode='BRUCELLOSIS';
    component.save();
    expect(api.recordHealthBatch).toHaveBeenCalledOnce();
    expect(api.recordHealthBatch.mock.calls[0][0]).toMatchObject({treatmentType:'VACCINATION',procedureCode:'BRUCELLOSIS',animals:[{id:'a1',expectedVersion:0}]});
    expect(api.recordHealth).not.toHaveBeenCalled();
  });

  it('limpa procedureCode ao trocar para vermifugação sem restaurar ao voltar',async()=>{
    const{component}=await setup();
    component.treatmentType='VACCINATION';
    component.procedureCode='BRUCELLOSIS';
    component.treatmentType='DEWORMING';
    component.onTreatmentTypeChange();
    expect(component.procedureCode).toBeNull();
    component.treatmentType='VACCINATION';
    component.onTreatmentTypeChange();
    expect(component.procedureCode).toBeNull();
  });

  it('salva vacinação sem procedimento com null e reseta ao reabrir',async()=>{
    const{component,api}=await setup();
    component.openCreate();
    component.animalId='a1';
    component.treatmentType='VACCINATION';
    component.save();
    expect(api.recordHealth.mock.calls[0][1]).toMatchObject({treatmentType:'VACCINATION',procedureCode:null});
    component.procedureCode='BRUCELLOSIS';
    component.openCreate();
    expect(component.procedureCode).toBeNull();
  });

  it('mantém product independente de procedureCode',async()=>{
    const{component,api}=await setup();
    component.openCreate();
    component.animalId='a1';
    component.treatmentType='VACCINATION';
    component.product='Brucelose X';
    component.save();
    expect(api.recordHealth.mock.calls[0][1]).toMatchObject({procedureCode:null,product:'Brucelose X'});
    component.openCreate();
    component.animalId='a1';
    component.treatmentType='VACCINATION';
    component.procedureCode='BRUCELLOSIS';
    component.product='';
    component.save();
    expect(api.recordHealth.mock.calls[1][1]).toMatchObject({procedureCode:'BRUCELLOSIS',product:null});
  });

  it('nunca envia BRUCELLOSIS com vermifugação mesmo com estado dessincronizado',async()=>{
    const{component,api}=await setup();
    component.openCreate();
    component.animalId='a1';
    component.treatmentType='DEWORMING';
    component.procedureCode='BRUCELLOSIS';
    component.save();
    expect(api.recordHealth.mock.calls[0][1]).toMatchObject({treatmentType:'DEWORMING',procedureCode:null});
    component.openCreate();
    component.animalId='a1';
    component.treatmentType='DEWORMING';
    component.save();
    expect(api.recordHealth.mock.calls[1][1]).toMatchObject({treatmentType:'DEWORMING',procedureCode:null});
  });
});
