import { describe, expect, it } from 'vitest';
import { healthLabels, pendingLabels, plannerTypeLabels, pregnancyLabels, serviceLabels } from './herd-operations.models';

describe('modelos de operações do rebanho',()=>{
  it('traduz todos os enums contratuais sem depender somente de cor',()=>{
    expect(healthLabels).toEqual({VACCINATION:'Vacinação',DEWORMING:'Vermifugação'});
    expect(serviceLabels.NATURAL_SERVICE).toBe('Monta natural');
    expect(pregnancyLabels).toEqual({POSSIBLE:'Em acompanhamento',CONFIRMED:'Confirmada',CALVED:'Parto realizado',TERMINATED:'Encerrada'});
    expect(Object.keys(pendingLabels)).toHaveLength(5);
    expect(Object.keys(plannerTypeLabels)).toHaveLength(8);
  });
});
