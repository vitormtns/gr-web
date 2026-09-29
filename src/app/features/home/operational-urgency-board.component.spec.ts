import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideLucideIcons, LucideBeef, LucideCalendarDays, LucideLandPlot, LucideMapPinOff, LucideTriangleAlert } from '@lucide/angular';
import { describe, expect, it, vi } from 'vitest';
import { DashboardStore } from './dashboard.store';
import { OperationalUrgencyBoardComponent, selectFocusCategories } from './operational-urgency-board.component';

const ready=<T>(value:T)=>({status:'ready',value,error:null});
const failed={status:'error',value:null,error:null};
const loading={status:'loading',value:null,error:null};
const item=(id:string,date='2026-09-15')=>({source:'DERIVED',kind:'WEIGHING',operationalDate:date,stableId:id,summary:'Pesagem pendente',animalId:null,identification:null,name:null,plannerItemId:null,pendingWorkType:'WEIGHING_DUE',pregnancyId:null,status:null});
function createBoard(attention:unknown,agenda:unknown){const store={attention:signal(attention),agenda:signal(agenda),retry:vi.fn()} as unknown as DashboardStore;TestBed.configureTestingModule({imports:[OperationalUrgencyBoardComponent],providers:[{provide:DashboardStore,useValue:store},provideLucideIcons(LucideBeef,LucideCalendarDays,LucideLandPlot,LucideMapPinOff,LucideTriangleAlert)]});const fixture=TestBed.createComponent(OperationalUrgencyBoardComponent);fixture.detectChanges();return {fixture,element:fixture.nativeElement as HTMLElement,store};}
const attention=(preview:unknown[]=[],summary:Record<string,number>={})=>ready({referenceDate:'2026-09-15',preview,summary});
const agenda=(items:unknown[]=[])=>ready({items,page:0,size:100,totalElements:items.length,totalPages:1});
describe('Foco da operação',()=>{
  it('mostra evento principal real',()=>{const {element}=createBoard(attention([item('a')]),agenda());expect(element.querySelector('.hero')?.textContent).toContain('Pesagem pendente');});
  it('emite pedido de detalhe sem navegar',()=>{const {fixture,element}=createBoard(attention([item('a')]),agenda());const spy=vi.fn();fixture.componentInstance.inspect.subscribe(spy);element.querySelector<HTMLButtonElement>('.hero')?.click();expect(spy).toHaveBeenCalledWith(expect.objectContaining({kind:'urgency'}));});
  it('não duplica o evento principal',()=>{const {element}=createBoard(attention([item('a')]),agenda([item('a')]));expect(element.querySelectorAll('.hero').length).toBe(1);});
  it('prioriza criticidade antes de volume',()=>{const categories=selectFocusCategories({brucellosisWindowMissed:1,calvingOverdue:2,plannerOverdue:3,brucellosisDue:4,vaccinationDue:50,weighingDue:70,dewormingDue:80,calvingUpcoming:90});expect(categories.map(c=>c.key)).toEqual(['brucellosisWindowMissed','calvingOverdue','plannerOverdue','brucellosisDue']);});
  it('omite categorias zeradas',()=>{expect(selectFocusCategories({brucellosisWindowMissed:0,calvingOverdue:0,plannerOverdue:0,brucellosisDue:0,vaccinationDue:2,weighingDue:0,dewormingDue:0,calvingUpcoming:0}).map(c=>c.key)).toEqual(['vaccinationDue']);});
  it('emite filtro correto de categoria',()=>{const {fixture,element}=createBoard(attention([],{vaccinationDue:4}),agenda());const spy=vi.fn();fixture.componentInstance.inspect.subscribe(spy);element.querySelector<HTMLButtonElement>('.category')?.click();expect(spy).toHaveBeenCalledWith({kind:'pending',pendingType:'VACCINATION_DUE',title:'Vacinação pendente'});});
  it('mostra calmaria apenas com as duas fontes íntegras',()=>{const {element}=createBoard(attention(),agenda());expect(element.querySelector('.calm')?.textContent).toContain('Operação em dia');});
  it('indica leitura parcial quando atenção falha',()=>{const {element}=createBoard(failed,agenda([item('a')]));expect(element.querySelector('.partial')).not.toBeNull();expect(element.querySelector('.calm')).toBeNull();});
  it('oferece retry se ambas as fontes falham',()=>{const {element}=createBoard(failed,failed);expect(element.textContent).toContain('Não foi possível carregar as prioridades');});
  it('mostra skeleton durante carregamento',()=>{const {element}=createBoard(loading,loading);expect(element.querySelector('.loading')).not.toBeNull();expect(element.querySelector('.calm')).toBeNull();});
});
