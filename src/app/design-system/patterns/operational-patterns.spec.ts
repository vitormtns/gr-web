import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { ProcessRailComponent, TerritoryFieldComponent } from './operational-patterns';

describe('padrões operacionais do Territory UI', () => {
  it('emite a região escolhida por teclado', () => {
    const fixture = TestBed.createComponent(TerritoryFieldComponent);
    fixture.componentRef.setInput('regions', [
      {
        id: 'norte',
        name: 'Pasto Norte 1',
        count: 245,
        status: 'normal',
        path: 'M0 0L10 0L10 10Z',
      },
    ]);
    const selected: string[] = [];
    fixture.componentInstance.selectedChange.subscribe((id) => selected.push(id));
    fixture.detectChanges();
    fixture.nativeElement
      .querySelector('[role="button"]')
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(selected).toEqual(['norte']);
  });

  it('distingue etapas concluída, atual e futura', () => {
    const fixture = TestBed.createComponent(ProcessRailComponent);
    fixture.componentRef.setInput('active', 1);
    fixture.componentRef.setInput('steps', [
      { label: 'Identificação', detail: 'Concluída' },
      { label: 'Movimentação', detail: 'Em execução' },
      { label: 'Confirmação', detail: 'Pendente' },
    ]);
    fixture.detectChanges();
    const steps = fixture.nativeElement.querySelectorAll('li');
    expect(steps[0].classList.contains('complete')).toBe(true);
    expect(steps[1].classList.contains('active')).toBe(true);
    expect(steps[2].className).toBe('');
  });
});
