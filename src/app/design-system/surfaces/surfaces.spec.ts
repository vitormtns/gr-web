import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { MenuComponent, PopoverComponent } from './surfaces';

@Component({
  imports: [PopoverComponent, MenuComponent],
  template: `<gr-popover label="Abrir ações"><span popover-trigger>Mais ações</span><gr-menu><button type="button">Duplicar</button></gr-menu></gr-popover>`,
})
class PopoverHost {}

describe('PopoverComponent', () => {
  it('usa summary sem botão aninhado e fecha ao pressionar Escape', () => {
    const fixture = TestBed.createComponent(PopoverHost);
    fixture.detectChanges();
    const summary = fixture.nativeElement.querySelector('summary') as HTMLElement;
    const details = fixture.nativeElement.querySelector('details') as HTMLDetailsElement;
    expect(summary.querySelector('button')).toBeNull();
    expect(summary.getAttribute('aria-label')).toBe('Abrir ações');
    details.open = true;
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(details.open).toBe(false);
  });
});
