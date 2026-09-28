import { Injectable } from '@angular/core';
import { ApiClient } from '../../core/api/api-client.service';
import { Animal } from './herd.models';
import { HealthProcedureCode } from './herd-operations.models';
import {
  AgeSexBalance,
  BreedingBatchCommand,
  BreedingBatchResult,
  CountedPage,
  CreateGroup,
  GroupAnimals,
  HerdGroup,
  ImportCommand,
  ImportResult,
  LifecycleCommand,
  MilkCommand,
  MilkOverview,
  MilkRecord,
  MilkSummary,
  MotherCommand,
  MotherResult,
  NoteCommand,
  NoteResult,
  PeriodReconciliation,
  ProcedureCoverage,
  UpdateGroup,
} from './parity.models';

const root = '/api/v1/herd';
const id = encodeURIComponent;
@Injectable({ providedIn: 'root' })
export class ParityApi {
  constructor(private readonly api: ApiClient) {}
  importAnimals(body: ImportCommand) {
    return this.api.post<ImportResult>(`${root}/animals/imports`, body, true);
  }
  breedBatch(body: BreedingBatchCommand) {
    return this.api.post<BreedingBatchResult>(`${root}/breedings/batch`, body, true);
  }
  correctMother(animalId: string, body: MotherCommand) {
    return this.api.put<MotherResult>(`${root}/animals/${id(animalId)}/mother`, body, true);
  }
  note(animalId: string, body: NoteCommand) {
    return this.api.post<NoteResult>(`${root}/animals/${id(animalId)}/notes`, body, true);
  }
  lifecycle(animalId: string, kind: 'sale' | 'death', body: LifecycleCommand) {
    return this.api.post<Animal>(`${root}/animals/${id(animalId)}/${kind}`, body, true);
  }
  groups(page = 0, size = 20) {
    return this.api.get<CountedPage<HerdGroup>>(`${root}/groups?page=${page}&size=${size}`, true);
  }
  group(groupId: string) {
    return this.api.get<HerdGroup>(`${root}/groups/${id(groupId)}`, true);
  }
  createGroup(body: CreateGroup) {
    return this.api.post<HerdGroup>(`${root}/groups`, body, true);
  }
  updateGroup(groupId: string, body: UpdateGroup) {
    return this.api.put<HerdGroup>(`${root}/groups/${id(groupId)}`, body, true);
  }
  archiveGroup(groupId: string, expectedVersion: number) {
    return this.api.post<HerdGroup>(
      `${root}/groups/${id(groupId)}/archive`,
      { expectedVersion },
      true,
    );
  }
  membership(groupId: string, animalId: string, expectedVersion: number, add: boolean) {
    const path = `${root}/groups/${id(groupId)}/animals/${id(animalId)}`;
    return add
      ? this.api.put<HerdGroup>(path, { expectedVersion }, true)
      : this.api.delete<HerdGroup>(path, true, { expectedVersion });
  }
  groupAnimals(groupId: string, page = 0, referenceDate = '') {
    return this.api.get<GroupAnimals>(
      `${root}/groups/${id(groupId)}/animals?page=${page}&size=20${referenceDate ? `&referenceDate=${id(referenceDate)}` : ''}`,
      true,
    );
  }
  milkHistory(animalId: string, page = 0) {
    return this.api.get<CountedPage<MilkRecord>>(
      `${root}/animals/${id(animalId)}/milk-records?page=${page}&size=20`,
      true,
    );
  }
  milkSummary(animalId: string, referenceDate = '') {
    return this.api.get<MilkSummary>(
      `${root}/animals/${id(animalId)}/milk-summary${dateQuery(referenceDate)}`,
      true,
    );
  }
  recordMilk(animalId: string, body: MilkCommand) {
    return this.api.post<MilkRecord>(`${root}/animals/${id(animalId)}/milk-records`, body, true);
  }
  milkOverview(referenceDate: string) {
    return this.api.get<MilkOverview>(`${root}/milk/overview${dateQuery(referenceDate)}`, true);
  }
  ageSexBalance(referenceDate: string, historical: boolean) {
    return this.api.get<AgeSexBalance>(
      `${root}/reports/${historical ? 'historical-age-sex-balance' : 'current-age-sex-balance'}?${historical ? 'asOf' : 'referenceDate'}=${id(referenceDate)}`,
      true,
    );
  }
  reconciliation(from: string, to: string) {
    return this.api.get<PeriodReconciliation>(
      `${root}/reports/period-reconciliation?from=${id(from)}&to=${id(to)}`,
      true,
    );
  }
  coverage(procedureCode: HealthProcedureCode, referenceDate: string) {
    return this.api.get<ProcedureCoverage>(
      `${root}/reports/current-procedure-coverage?procedureCode=${id(procedureCode)}&referenceDate=${id(referenceDate)}`,
      true,
    );
  }
}
function dateQuery(referenceDate: string) {
  return referenceDate ? `?referenceDate=${id(referenceDate)}` : '';
}
