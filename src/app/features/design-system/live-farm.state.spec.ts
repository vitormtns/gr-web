import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { LiveFarmState } from './live-farm.state';

describe('LiveFarmState', () => {
  it('conecta a seleção do animal ao território', () => {
    const state = TestBed.runInInjectionContext(() => new LiveFarmState());
    state.selectAnimal('BR-0312');
    expect(state.selectedAnimal().name).toBe('Aurora');
    expect(state.selectedPaddockId()).toBe('maternidade');
    expect(state.focusedDomain()).toBe('animal');
  });

  it('conclui a movimentação e registra o evento no fluxo', () => {
    vi.useFakeTimers();
    const state = TestBed.runInInjectionContext(() => new LiveFarmState());
    state.simulateMovement();
    expect(state.movementState()).toBe('moving');
    vi.advanceTimersByTime(620);
    expect(state.selectedAnimal().paddockId).toBe('sul');
    expect(state.events()[0].title).toBe('Movimentação simulada');
    vi.useRealTimers();
  });
});
