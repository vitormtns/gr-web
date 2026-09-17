import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { BehaviorSubject, Subject } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { ContextStore } from '../../core/context/context.store';
import { ReportsApi } from './reports-api.service';
import { AnyReportPage, HealthPage, WeightPage } from './reports.models';
import { ReportsPageComponent, defaultFilters } from './reports-page.component';

describe('ReportsPageComponent',()=>{
  it('mantém a intenção mais recente quando respostas chegam fora de ordem',async()=>{
    const params=new BehaviorSubject(convertToParamMap({report:'herd-position'}));
    const requests:Subject<AnyReportPage>[]=[];
    const api={load:vi.fn(()=>{const request=new Subject<AnyReportPage>();requests.push(request);return request.asObservable();})};
    const context={selectedFarm:signal({farmId:'farm-1',farmName:'Fazenda Norte'}),transitionPending:signal(false),contextVersion:signal(0)};
    await TestBed.configureTestingModule({imports:[ReportsPageComponent],providers:[{provide:ActivatedRoute,useValue:{snapshot:{queryParamMap:params.value},queryParamMap:params.asObservable()}},{provide:Router,useValue:{navigate:vi.fn()}},{provide:ContextStore,useValue:context}]}).overrideComponent(ReportsPageComponent,{set:{providers:[{provide:ReportsApi,useValue:api}]}}).compileComponents();
    const fixture:ComponentFixture<ReportsPageComponent>=TestBed.createComponent(ReportsPageComponent);
    const component=fixture.componentInstance;
    component.filters.set(defaultFilters('weights'));component.load();const weightRequest=requests.at(-1)!;
    component.filters.set(defaultFilters('health'));component.load();const healthRequest=requests.at(-1)!;
    const health:HealthPage={summary:{treatmentsCount:1,animalsTreated:1,countsByTreatmentType:{VACCINATION:1}},items:[],page:0,size:20,totalElements:1,totalPages:1};
    const weights:WeightPage={summary:{measurementCount:1,animalsMeasured:1,averageWeight:'300.125',minimumWeight:'300.125',maximumWeight:'300.125'},items:[],page:0,size:20,totalElements:1,totalPages:1};
    healthRequest.next(health);weightRequest.next(weights);
    expect(component.result()).toBe(health);
    expect(component.state()).toBe('ready');
  });
});
