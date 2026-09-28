import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { AgendaPageComponent } from './agenda-page.component';
import { ParityShowcaseComponent } from './parity-showcase.component';

HTMLDialogElement.prototype.showModal ??= function () {
  this.open = true;
};
HTMLDialogElement.prototype.close ??= function () {
  this.open = false;
};

describe('Cenário local de paridade', () => {
  it('usa a permissão de proprietário do cenário para disponibilizar as ações', async () => {
    await TestBed.configureTestingModule({
      imports: [ParityShowcaseComponent],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(ParityShowcaseComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Criar grupo');
    expect(fixture.nativeElement.textContent).toContain('Arquivar');
  });

  it('reagenda e conclui a tarefa fictícia preservando o grupo sem chamar a API real', async () => {
    await TestBed.configureTestingModule({
      imports: [ParityShowcaseComponent],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(ParityShowcaseComponent);
    fixture.componentInstance.view.set('agenda');
    fixture.detectChanges();
    await fixture.whenStable();
    const element = fixture.debugElement.query(
      (e) => e.componentInstance instanceof AgendaPageComponent,
    );
    const agenda: AgendaPageComponent = element.componentInstance;
    const task = agenda.planner()!.items[0];
    agenda.openEdit(task);
    agenda.scheduledFor = '2026-10-03';
    agenda.savePlanner();
    expect(agenda.planner()!.items[0].scheduledFor).toBe('2026-10-03');
    expect(agenda.planner()!.items[0].groupId).toBe(task.groupId);
    expect(agenda.editorOpen()).toBe(false);
    agenda.transition(task.id, 'complete');
    agenda.confirmTransition();
    expect(agenda.planner()!.items[0].status).toBe('COMPLETED');
  });
});
