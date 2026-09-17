import { Injectable, computed, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiClient } from '../api/api-client.service';
import { AppError, CurrentUser, FarmOption, ItemsResponse, OrganizationOption, TenantContextResponse } from '../api/api.models';

export type ContextStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'error';

@Injectable({ providedIn: 'root' })
export class ContextStore {
  private readonly organizationKey = 'gr.context.organization';
  private readonly farmKey = 'gr.context.farm';
  private initialization?: Promise<void>;

  readonly status = signal<ContextStatus>('idle');
  readonly error = signal<AppError | null>(null);
  readonly user = signal<CurrentUser | null>(null);
  readonly organizations = signal<OrganizationOption[]>([]);
  readonly farms = signal<FarmOption[]>([]);
  readonly selectedOrganization = signal<OrganizationOption | null>(null);
  readonly selectedFarm = signal<FarmOption | null>(null);
  readonly transitionPending = signal(false);
  readonly contextVersion = signal(0);
  readonly role = computed(() => this.selectedOrganization()?.role ?? null);
  readonly isReady = computed(() => this.status() === 'ready');

  constructor(private readonly api: ApiClient) {}

  initialize(): Promise<void> {
    if (this.initialization) return this.initialization;
    this.initialization = this.loadInitialContext().catch((error) => {
      this.error.set(error instanceof AppError ? error : null);
      this.status.set('error');
      this.initialization = undefined;
      throw error;
    });
    return this.initialization;
  }

  retry(): Promise<void> {
    return this.initialize();
  }

  async revalidateAccess(): Promise<void> {
    if (this.transitionPending()) return;
    this.transitionPending.set(true);
    this.initialization = undefined;
    this.contextVersion.update((version) => version + 1);
    try {
      await this.initialize();
    } finally {
      this.transitionPending.set(false);
    }
  }

  async selectOrganization(organizationId: string): Promise<void> {
    if (this.transitionPending()) return;
    const selected = this.organizations().find((item) => item.organizationId === organizationId);
    if (!selected || selected.organizationId === this.selectedOrganization()?.organizationId) return;
    const previousOrganization = this.selectedOrganization();
    const previousFarm = this.selectedFarm();
    const previousFarms = this.farms();
    this.transitionPending.set(true);
    this.selectedOrganization.set(selected);
    this.selectedFarm.set(null);
    this.farms.set([]);
    this.clearFarmPersistence();
    this.contextVersion.update((version) => version + 1);
    try {
      await this.loadFarms(selected, null);
    } catch (error) {
      this.selectedOrganization.set(previousOrganization);
      this.selectedFarm.set(previousFarm);
      this.farms.set(previousFarms);
      if (previousOrganization) this.persist(this.organizationKey, previousOrganization.organizationId);
      if (previousFarm) this.persist(this.farmKey, previousFarm.farmId);
      this.contextVersion.update((version) => version + 1);
      throw error;
    } finally {
      this.transitionPending.set(false);
    }
  }

  async selectFarm(farmId: string): Promise<void> {
    if (this.transitionPending()) return;
    const selected = this.farms().find((item) => item.farmId === farmId);
    if (!selected || selected.farmId === this.selectedFarm()?.farmId) return;
    const previousFarm = this.selectedFarm();
    this.transitionPending.set(true);
    this.selectedFarm.set(selected);
    this.contextVersion.update((version) => version + 1);
    try {
      await this.confirmAndPersist();
    } catch (error) {
      this.selectedFarm.set(previousFarm);
      if (previousFarm) this.persist(this.farmKey, previousFarm.farmId);
      else this.clearFarmPersistence();
      this.contextVersion.update((version) => version + 1);
      throw error;
    } finally {
      this.transitionPending.set(false);
    }
  }

  clear(): void {
    this.initialization = undefined;
    this.status.set('idle');
    this.error.set(null);
    this.user.set(null);
    this.organizations.set([]);
    this.farms.set([]);
    this.selectedOrganization.set(null);
    this.selectedFarm.set(null);
    this.transitionPending.set(false);
    this.contextVersion.update((version) => version + 1);
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.organizationKey);
      localStorage.removeItem(this.farmKey);
    }
  }

  private async loadInitialContext(): Promise<void> {
    this.status.set('loading');
    this.error.set(null);
    const [user, response] = await Promise.all([
      firstValueFrom(this.api.get<CurrentUser>('/api/v1/me')),
      firstValueFrom(this.api.get<ItemsResponse<OrganizationOption>>('/api/v1/me/organizations')),
    ]);
    this.user.set(user);
    this.organizations.set(response.items);
    if (!response.items.length) {
      this.selectedOrganization.set(null);
      this.selectedFarm.set(null);
      this.farms.set([]);
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(this.organizationKey);
        localStorage.removeItem(this.farmKey);
      }
      this.status.set('empty');
      return;
    }
    const savedId = this.readStorage(this.organizationKey);
    const selected = response.items.find((item) => item.organizationId === savedId) ?? response.items[0];
    this.selectedOrganization.set(selected);
    await this.loadFarms(selected, this.readStorage(this.farmKey));
  }

  private async loadFarms(organization: OrganizationOption, savedFarmId: string | null): Promise<void> {
    const response = await firstValueFrom(this.api.get<ItemsResponse<FarmOption>>(
      `/api/v1/me/organizations/${encodeURIComponent(organization.organizationId)}/farms`,
    ));
    this.farms.set(response.items);
    if (!response.items.length) {
      this.status.set('empty');
      this.persist(this.organizationKey, organization.organizationId);
      return;
    }
    this.selectedFarm.set(response.items.find((item) => item.farmId === savedFarmId) ?? response.items[0]);
    await this.confirmAndPersist();
    this.status.set('ready');
  }

  private async confirmAndPersist(): Promise<void> {
    const organization = this.selectedOrganization();
    const farm = this.selectedFarm();
    if (!organization || !farm) return;
    const confirmed = await firstValueFrom(this.api.get<TenantContextResponse>('/api/v1/context', true));
    if (confirmed.organization?.id !== organization.organizationId || confirmed.farm?.id !== farm.farmId) {
      throw new Error('Não foi possível confirmar o contexto selecionado.');
    }
    this.persist(this.organizationKey, organization.organizationId);
    this.persist(this.farmKey, farm.farmId);
  }

  private readStorage(key: string): string | null {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem(key);
  }

  private persist(key: string, value: string): void {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
  }

  private clearFarmPersistence(): void {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(this.farmKey);
  }
}
