import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { describe, expect, it } from 'vitest';
import { normalizeApiError } from './error-normalizer';

describe('normalizeApiError', () => {
  it.each([
    [400,'validation'],[401,'unauthorized'],[403,'forbidden'],[404,'not-found'],
    [409,'conflict'],[500,'unexpected'],[503,'unavailable'],
  ] as const)('mapeia HTTP %i para %s', (status, kind) => {
    expect(normalizeApiError(new HttpErrorResponse({ status, error: {} })).kind).toBe(kind);
  });

  it('preserva código, campos inválidos e request ID do backend', () => {
    const error = normalizeApiError(new HttpErrorResponse({ status:400,error:{code:'validation_error',message:'Campos inválidos',status:400,requestId:'req-42',validationErrors:[{field:'name',message:'é obrigatório'}]} }));
    expect(error.code).toBe('validation_error');
    expect(error.requestId).toBe('req-42');
    expect(error.validationErrors).toEqual([{field:'name',message:'é obrigatório'}]);
  });

  it('captura correlação do header quando o envelope não a informa', () => {
    const error = normalizeApiError(new HttpErrorResponse({status:500,headers:new HttpHeaders({'X-Correlation-ID':'corr-9'}),error:{}}));
    expect(error.requestId).toBe('corr-9');
  });
});
