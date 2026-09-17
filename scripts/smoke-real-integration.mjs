import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const required = (name) => {
  const value = process.env[name];
  assert.ok(value, `Defina ${name} antes do smoke local.`);
  return value;
};

const supabaseUrl = required('GR_SMOKE_SUPABASE_URL');
const publicKey = required('GR_SMOKE_SUPABASE_PUBLIC_KEY');
const apiBaseUrl = required('GR_SMOKE_API_URL').replace(/\/$/, '');
const email = required('GR_SMOKE_EMAIL');
const password = required('GR_SMOKE_PASSWORD');
assert.equal(new URL(supabaseUrl).hostname, '127.0.0.1', 'O smoke administrativo aceita somente o Supabase local.');
assert.equal(new URL(apiBaseUrl).hostname, '127.0.0.1', 'O smoke administrativo aceita somente a API local.');

const values = new Map();
const storage = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => { values.set(key, value); },
  removeItem: (key) => { values.delete(key); },
};

function authClient(sharedStorage = storage) {
  return createClient(supabaseUrl, publicKey, {
    auth: {
      storage: sharedStorage,
      storageKey: 'gr.auth.session.smoke',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
}

async function api(path, { token, organizationId, farmId, method = 'GET', body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (organizationId) headers['X-Organization-Id'] = organizationId;
  if (farmId) headers['X-Farm-Id'] = farmId;
  if (body) headers['Content-Type'] = 'application/json';
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = response.status === 204 ? null : await response.json();
  return { status: response.status, data, headers: response.headers };
}

function expectStatus(result, status, label) {
  assert.equal(result.status, status, `${label}: esperado HTTP ${status}, recebido ${result.status}`);
}

function isoDate(offsetDays = 0) {
  const value = new Date();
  value.setUTCDate(value.getUTCDate() + offsetDays);
  return value.toISOString().slice(0, 10);
}

async function main() {
  const firstClient = authClient();
  const signedIn = await firstClient.auth.signInWithPassword({ email, password });
  assert.ifError(signedIn.error);
  assert.ok(signedIn.data.session?.access_token, 'Login não criou uma sessão com JWT.');

  const restoredClient = authClient();
  const restored = await restoredClient.auth.getSession();
  assert.ifError(restored.error);
  assert.ok(restored.data.session?.access_token, 'A sessão não foi restaurada após recriar o cliente.');

  let refreshedEvent = false;
  restoredClient.auth.onAuthStateChange((event) => {
    if (event === 'TOKEN_REFRESHED') refreshedEvent = true;
  });
  const refreshed = await restoredClient.auth.refreshSession();
  assert.ifError(refreshed.error);
  assert.ok(refreshed.data.session?.access_token, 'O refresh não disponibilizou um JWT.');
  assert.ok(refreshedEvent, 'O evento TOKEN_REFRESHED não foi emitido.');
  const token = refreshed.data.session.access_token;

  const me = await api('/api/v1/me', { token });
  expectStatus(me, 200, 'Identidade');
  assert.equal(me.data.email, email);

  // Phase 06: organização descartável e segundo usuário existem somente no ambiente local.
  const adminOrganizationId = randomUUID();
  const adminFarmAId = randomUUID();
  const adminFarmBId = randomUUID();
  const adminOrganization = await api('/api/v1/organizations', { token, method: 'POST', body: { id: adminOrganizationId, name: 'Organização Smoke Administração' } });
  expectStatus(adminOrganization, 201, 'Criação da organização administrativa');
  assert.equal(adminOrganization.data.version, 0);
  const correctedOrganization = await api(`/api/v1/organizations/${adminOrganizationId}`, { token, method: 'PATCH', body: { name: 'Organização Smoke Revisada', expectedVersion: adminOrganization.data.version } });
  expectStatus(correctedOrganization, 200, 'Correção da organização');
  expectStatus(await api(`/api/v1/organizations/${adminOrganizationId}`, { token, method: 'PATCH', body: { name: 'Conflito obsoleto', expectedVersion: adminOrganization.data.version } }), 409, 'Conflito otimista da organização');

  const adminFarmA = await api(`/api/v1/organizations/${adminOrganizationId}/farms`, { token, method: 'POST', body: { id: adminFarmAId, name: 'Fazenda Administração A' } });
  const adminFarmB = await api(`/api/v1/organizations/${adminOrganizationId}/farms`, { token, method: 'POST', body: { id: adminFarmBId, name: 'Fazenda Administração B' } });
  expectStatus(adminFarmA, 201, 'Criação da primeira fazenda administrativa');
  expectStatus(adminFarmB, 201, 'Criação da segunda fazenda administrativa');
  const correctedFarm = await api(`/api/v1/organizations/${adminOrganizationId}/farms/${adminFarmAId}`, { token, method: 'PATCH', body: { name: 'Fazenda Administração Norte', expectedVersion: adminFarmA.data.version } });
  expectStatus(correctedFarm, 200, 'Correção da fazenda administrativa');
  expectStatus(await api(`/api/v1/organizations/${adminOrganizationId}/farms/${adminFarmAId}`, { token, method: 'PATCH', body: { name: 'Conflito obsoleto', expectedVersion: adminFarmA.data.version } }), 409, 'Conflito otimista da fazenda');

  const inviteeEmail = `phase06-${randomUUID()}@example.test`;
  const inviteePassword = `${randomBytes(20).toString('base64url')}Aa1#`;
  const inviteeClient = authClient({ getItem: () => null, setItem: () => {}, removeItem: () => {} });
  const inviteeSignup = await inviteeClient.auth.signUp({ email: inviteeEmail, password: inviteePassword });
  assert.ifError(inviteeSignup.error);
  assert.ok(inviteeSignup.data.user?.id, 'A conta convidada local não foi criada.');
  const allFarmsInvitation = await api(`/api/v1/organizations/${adminOrganizationId}/invitations`, { token, method: 'POST', body: { email: inviteeEmail, role: 'VIEWER', farmScopeMode: 'ALL_FARMS', farmIds: [] } });
  expectStatus(allFarmsInvitation, 201, 'Convite ALL_FARMS');
  assert.ok(allFarmsInvitation.data.token, 'O token de uso único não foi retornado.');
  const pendingInvitations = await api(`/api/v1/organizations/${adminOrganizationId}/invitations?status=PENDING&page=0&size=50`, { token });
  expectStatus(pendingInvitations, 200, 'Listagem de convites pendentes');
  assert.ok(pendingInvitations.data.some((item) => item.id === allFarmsInvitation.data.invitation.id));

  const inviteeLogin = await inviteeClient.auth.signInWithPassword({ email: inviteeEmail, password: inviteePassword });
  assert.ifError(inviteeLogin.error);
  const inviteeToken = inviteeLogin.data.session.access_token;
  expectStatus(await api(`/api/v1/invitations/${encodeURIComponent(allFarmsInvitation.data.token)}/accept`, { token: inviteeToken, method: 'POST' }), 204, 'Aceite do convite');
  const inviteeOrganizations = await api('/api/v1/me/organizations', { token: inviteeToken });
  expectStatus(inviteeOrganizations, 200, 'Bootstrap da pessoa convidada');
  assert.ok(inviteeOrganizations.data.items.some((item) => item.organizationId === adminOrganizationId && item.farmScopeMode === 'ALL_FARMS'));
  let inviteeFarms = await api(`/api/v1/me/organizations/${adminOrganizationId}/farms`, { token: inviteeToken });
  expectStatus(inviteeFarms, 200, 'Escopo ALL_FARMS real');
  assert.deepEqual(new Set(inviteeFarms.data.items.map((item) => item.farmId)), new Set([adminFarmAId, adminFarmBId]));
  expectStatus(await api(`/api/v1/organizations/${adminOrganizationId}/invitations`, { token: inviteeToken }), 403, 'VIEWER sem administração de convites');

  const adminMembers = await api(`/api/v1/organizations/${adminOrganizationId}/members?page=0&size=50`, { token });
  expectStatus(adminMembers, 200, 'Listagem real de memberships');
  const inviteeMember = adminMembers.data.find((item) => item.userId === inviteeSignup.data.user.id);
  const ownerMember = adminMembers.data.find((item) => item.userId === me.data.userId);
  assert.ok(inviteeMember && ownerMember, 'As duas memberships administrativas devem existir.');
  const selectedScope = await api(`/api/v1/organizations/${adminOrganizationId}/members/${inviteeMember.membershipId}`, { token, method: 'PATCH', body: { role: 'OPERATOR', farmScopeMode: 'SELECTED_FARMS', farmIds: [adminFarmAId], expectedVersion: inviteeMember.version } });
  expectStatus(selectedScope, 200, 'Alteração para SELECTED_FARMS');
  assert.equal(selectedScope.data.role, 'OPERATOR');
  assert.deepEqual(selectedScope.data.farmIds, [adminFarmAId]);
  inviteeFarms = await api(`/api/v1/me/organizations/${adminOrganizationId}/farms`, { token: inviteeToken });
  assert.deepEqual(inviteeFarms.data.items.map((item) => item.farmId), [adminFarmAId]);
  expectStatus(await api('/api/v1/context', { token: inviteeToken, organizationId: adminOrganizationId, farmId: adminFarmBId }), 404, 'Fazenda fora do escopo selecionado');
  expectStatus(await api(`/api/v1/organizations/${adminOrganizationId}/members/${inviteeMember.membershipId}`, { token, method: 'PATCH', body: { role: 'VIEWER', farmScopeMode: 'ALL_FARMS', farmIds: [], expectedVersion: inviteeMember.version } }), 409, 'Conflito otimista da membership');
  expectStatus(await api(`/api/v1/organizations/${adminOrganizationId}/members/${ownerMember.membershipId}?expectedVersion=${ownerMember.version}`, { token, method: 'DELETE' }), 409, 'Proteção do último proprietário');

  const cancellableInvitation = await api(`/api/v1/organizations/${adminOrganizationId}/invitations`, { token, method: 'POST', body: { email: `cancel-${randomUUID()}@example.test`, role: 'VIEWER', farmScopeMode: 'SELECTED_FARMS', farmIds: [adminFarmAId] } });
  expectStatus(cancellableInvitation, 201, 'Convite SELECTED_FARMS');
  expectStatus(await api(`/api/v1/organizations/${adminOrganizationId}/invitations/${cancellableInvitation.data.invitation.id}/revocation`, { token, method: 'POST' }), 204, 'Cancelamento de convite');
  expectStatus(await api(`/api/v1/organizations/${adminOrganizationId}/members/${inviteeMember.membershipId}?expectedVersion=${selectedScope.data.version}`, { token, method: 'DELETE' }), 204, 'Revogação da membership');
  const afterRevocation = await api('/api/v1/me/organizations', { token: inviteeToken });
  assert.ok(!afterRevocation.data.items.some((item) => item.organizationId === adminOrganizationId), 'A organização revogada não pode permanecer no bootstrap.');
  expectStatus(await api(`/api/v1/organizations/${adminOrganizationId}`, { token: inviteeToken }), 404, 'Não enumeração após revogação');
  await inviteeClient.auth.signOut({ scope: 'local' });

  const organizations = await api('/api/v1/me/organizations', { token });
  expectStatus(organizations, 200, 'Organizações');
  assert.ok(Array.isArray(organizations.data.items) && organizations.data.items.length >= 2,
    'O smoke de troca exige duas organizações locais acessíveis.');

  const organizationFarms = await Promise.all(organizations.data.items.map(async (organization) => {
    const farms = await api(`/api/v1/me/organizations/${organization.organizationId}/farms`, { token });
    expectStatus(farms, 200, 'Fazendas acessíveis');
    return { organization, farms: farms.data.items };
  }));
  const first = organizationFarms.find((item) => !item.organization.organizationName.startsWith('Organização Smoke') && item.farms.length >= 2);
  assert.ok(first, 'O smoke de troca exige duas fazendas em uma organização local.');
  const second = organizationFarms.find((item) =>
    !item.organization.organizationName.startsWith('Organização Smoke') && item.organization.organizationId !== first.organization.organizationId && item.farms.length >= 1);
  assert.ok(second, 'O smoke de troca exige outra organização com fazenda acessível.');
  const firstOrganization = first.organization;
  const secondOrganization = second.organization;
  const firstFarms = { data: { items: first.farms } };
  const secondFarms = { data: { items: second.farms } };

  const firstFarm = firstFarms.data.items[0];
  const switchedFarm = firstFarms.data.items.find((item) => item.farmId !== firstFarm.farmId);
  const secondFarm = secondFarms.data.items[0];
  for (const [organization, farm] of [
    [firstOrganization, firstFarm],
    [firstOrganization, switchedFarm],
    [secondOrganization, secondFarm],
  ]) {
    const context = await api('/api/v1/context', {
      token, organizationId: organization.organizationId, farmId: farm.farmId,
    });
    expectStatus(context, 200, 'Contexto autorizado');
    assert.equal(context.data.organization.id, organization.organizationId);
    assert.equal(context.data.farm.id, farm.farmId);
    const farmRead = await api('/api/v1/farms/current', {
      token, organizationId: organization.organizationId, farmId: farm.farmId,
    });
    expectStatus(farmRead, 200, 'Leitura real da fazenda');
    assert.equal(farmRead.data.id, farm.farmId);
  }

  const dashboardContext = { token, organizationId: firstOrganization.organizationId, farmId: firstFarm.farmId };
  const today = new Date().toISOString().slice(0, 10);
  for (const period of ['TODAY', 'LAST_7_DAYS', 'LAST_30_DAYS']) {
    const [overview, activity] = await Promise.all([
      api(`/api/v1/herd/dashboard/overview?period=${period}`, dashboardContext),
      api(`/api/v1/herd/dashboard/activity?period=${period}`, dashboardContext),
    ]);
    expectStatus(overview, 200, `Visão geral ${period}`);
    expectStatus(activity, 200, `Atividade ${period}`);
    assert.equal(overview.data.period.period, period);
    assert.equal(activity.data.period.period, period);
    assert.ok(Array.isArray(overview.data.herdSnapshot.byPaddock));
    assert.ok(Array.isArray(activity.data.series));
  }
  const custom = await api(`/api/v1/herd/dashboard/overview?period=CUSTOM&from=${today}&to=${today}`, dashboardContext);
  expectStatus(custom, 200, 'Período personalizado');
  assert.equal(custom.data.period.period, 'CUSTOM');
  const [attention, agenda, paddocks] = await Promise.all([
    api('/api/v1/herd/dashboard/attention?previewSize=5', dashboardContext),
    api(`/api/v1/herd/agenda?from=${today}&page=0&size=5`, dashboardContext),
    api('/api/v1/herd/paddocks?page=0&size=100', dashboardContext),
  ]);
  expectStatus(attention, 200, 'Fila de atenção');
  expectStatus(agenda, 200, 'Agenda');
  expectStatus(paddocks, 200, 'Piquetes');
  assert.ok(Array.isArray(attention.data.preview));
  assert.ok(Array.isArray(agenda.data.items));
  assert.ok(Array.isArray(paddocks.data.items));

  const farmCandidates = first.farms;
  let herdSource;
  for (const farm of farmCandidates) {
    const candidateContext = { token, organizationId: firstOrganization.organizationId, farmId: farm.farmId };
    const candidatePaddocks = await api('/api/v1/herd/paddocks?status=ACTIVE&page=0&size=100', candidateContext);
    expectStatus(candidatePaddocks, 200, 'Piquetes candidatos ao smoke de rebanho');
    if (candidatePaddocks.data.items.length >= 2) {
      herdSource = { farm, context: candidateContext, paddocks: candidatePaddocks.data.items };
      break;
    }
  }
  assert.ok(herdSource, 'O smoke de rebanho exige uma fazenda local com dois piquetes ativos.');
  const transferFarm = farmCandidates.find((farm) => farm.farmId !== herdSource.farm.farmId);
  assert.ok(transferFarm, 'O smoke de transferência exige outra fazenda acessível na mesma organização.');
  const destinationContext = { token, organizationId: firstOrganization.organizationId, farmId: transferFarm.farmId };

  const initialHerd = await api('/api/v1/herd/animals?page=0&size=20', herdSource.context);
  expectStatus(initialHerd, 200, 'Lista real de animais');
  assert.ok(Array.isArray(initialHerd.data.items));
  const animalId = randomUUID();
  const secondAnimalId = randomUUID();
  const createCommand = { id: animalId, identification: `SMOKE-${animalId.slice(0, 8)}`, name: 'Aurora Smoke', sex: 'FEMALE', birthDate: '2024-03-15' };
  const created = await api('/api/v1/herd/animals', { ...herdSource.context, method: 'POST', body: createCommand });
  expectStatus(created, 201, 'Criação real de animal');
  assert.equal(created.data.version, 0);
  const createReplay = await api('/api/v1/herd/animals', { ...herdSource.context, method: 'POST', body: createCommand });
  expectStatus(createReplay, 200, 'Replay idempotente da criação');
  assert.equal(createReplay.data.id, created.data.id);
  const secondCreated = await api('/api/v1/herd/animals', { ...herdSource.context, method: 'POST', body: { id: secondAnimalId, identification: `SMOKE-${secondAnimalId.slice(0, 8)}`, name: 'Brisa Smoke', sex: 'FEMALE', birthDate: null } });
  expectStatus(secondCreated, 201, 'Criação do segundo animal do lote');

  const profile = await api(`/api/v1/herd/animals/${animalId}`, herdSource.context);
  expectStatus(profile, 200, 'Perfil real do animal');
  assert.equal(profile.data.identification, createCommand.identification);
  assert.equal(profile.data.paddock, null);
  const corrected = await api(`/api/v1/herd/animals/${animalId}`, { ...herdSource.context, method: 'PATCH', body: { expectedVersion: profile.data.version, name: 'Aurora do Smoke' } });
  expectStatus(corrected, 200, 'Correção real do animal');
  assert.equal(corrected.data.version, 1);
  const staleCorrection = await api(`/api/v1/herd/animals/${animalId}`, { ...herdSource.context, method: 'PATCH', body: { expectedVersion: profile.data.version, name: 'Correção obsoleta' } });
  expectStatus(staleCorrection, 409, 'Conflito real de versão do animal');
  assert.equal(staleCorrection.data.code, 'HERD_VERSION_CONFLICT');

  const movementOperationId = randomUUID();
  const movementCommand = { operationId: movementOperationId, expectedVersion: corrected.data.version, destinationPaddockId: herdSource.paddocks[0].id, occurredOn: today, notes: 'Movimento seguro do smoke local' };
  const moved = await api(`/api/v1/herd/animals/${animalId}/movements`, { ...herdSource.context, method: 'POST', body: movementCommand });
  expectStatus(moved, 200, 'Movimentação individual real');
  assert.equal(moved.data.paddock.id, herdSource.paddocks[0].id);
  const movementReplay = await api(`/api/v1/herd/animals/${animalId}/movements`, { ...herdSource.context, method: 'POST', body: movementCommand });
  expectStatus(movementReplay, 200, 'Replay idempotente da movimentação');
  assert.equal(movementReplay.data.version, moved.data.version);

  const batchOperationId = randomUUID();
  const batchCommand = { operationId: batchOperationId, destinationPaddockId: herdSource.paddocks[1].id, occurredOn: today, notes: 'Lote seguro do smoke local', animals: [{ animalId, expectedVersion: moved.data.version }, { animalId: secondAnimalId, expectedVersion: secondCreated.data.version }] };
  const batch = await api('/api/v1/herd/movements/batch', { ...herdSource.context, method: 'POST', body: batchCommand });
  expectStatus(batch, 200, 'Movimentação em lote real');
  assert.equal(batch.data.movedCount, 2);
  const batchReplay = await api('/api/v1/herd/movements/batch', { ...herdSource.context, method: 'POST', body: batchCommand });
  expectStatus(batchReplay, 200, 'Replay idempotente da movimentação em lote');
  assert.equal(batchReplay.data.movedCount, 2);
  const transferredAnimal = batch.data.animals.find((animal) => animal.id === animalId);
  assert.ok(transferredAnimal);

  let operationalAnimal = batch.data.animals.find((animal) => animal.id === secondAnimalId);
  assert.ok(operationalAnimal);
  const weightOperationId = randomUUID();
  const weightCommand = { operationId: weightOperationId, expectedVersion: operationalAnimal.version, weightKg: '318.750', measuredOn: today, notes: 'Pesagem do smoke da Phase 04' };
  const weight = await api(`/api/v1/herd/animals/${secondAnimalId}/weights`, { ...herdSource.context, method: 'POST', body: weightCommand });
  expectStatus(weight, 200, 'Registro real de pesagem');
  assert.equal(weight.data.replayed, false);
  const weightReplay = await api(`/api/v1/herd/animals/${secondAnimalId}/weights`, { ...herdSource.context, method: 'POST', body: weightCommand });
  expectStatus(weightReplay, 200, 'Replay idempotente da pesagem');
  assert.equal(weightReplay.data.replayed, true);
  operationalAnimal = weight.data.animals[0];
  const weights = await api(`/api/v1/herd/animals/${secondAnimalId}/weights?page=0&size=20`, herdSource.context);
  expectStatus(weights, 200, 'Histórico real de pesagens');
  assert.equal(weights.data.items[0].weightKg, 318.75);
  const weighingDue = await api(`/api/v1/herd/pending-work?type=WEIGHING_DUE&animalId=${secondAnimalId}&page=0&size=20`, herdSource.context);
  expectStatus(weighingDue, 200, 'Pendência de pesagem após fato');
  assert.equal(weighingDue.data.totalElements, 0, 'Pesagem atual deve remover a necessidade derivada correspondente.');

  for (const [treatmentType, dueOffset] of [['VACCINATION', 30], ['DEWORMING', 60]]) {
    const command = { operationId: randomUUID(), expectedVersion: operationalAnimal.resultingVersion, treatmentType, occurredOn: today, product: `Produto smoke ${treatmentType}`, protocol: null, nextDueOn: isoDate(dueOffset), notes: 'Tratamento seguro do smoke local' };
    const treatment = await api(`/api/v1/herd/animals/${secondAnimalId}/health-treatments`, { ...herdSource.context, method: 'POST', body: command });
    expectStatus(treatment, 200, `Registro real de ${treatmentType}`);
    operationalAnimal = treatment.data.animals[0];
  }
  const health = await api(`/api/v1/herd/animals/${secondAnimalId}/health-treatments?page=0&size=20`, herdSource.context);
  expectStatus(health, 200, 'Histórico real de saúde');
  assert.ok(health.data.items.some((item) => item.type === 'VACCINATION'));
  assert.ok(health.data.items.some((item) => item.type === 'DEWORMING'));

  const breeding = await api(`/api/v1/herd/animals/${secondAnimalId}/breedings`, { ...herdSource.context, method: 'POST', body: { operationId: randomUUID(), expectedVersion: operationalAnimal.resultingVersion, serviceType: 'INSEMINATION', serviceOn: today, sireReference: 'TOURO-SMOKE', expectedCalvingOn: isoDate(280), notes: 'Serviço reprodutivo do smoke' } });
  expectStatus(breeding, 201, 'Registro real de serviço reprodutivo');
  let motherProfile = await api(`/api/v1/herd/animals/${secondAnimalId}`, herdSource.context);
  expectStatus(motherProfile, 200, 'Versão da mãe após serviço');
  const confirmationCommand = { operationId: randomUUID(), expectedVersion: breeding.data.version, occurredOn: today };
  const confirmed = await api(`/api/v1/herd/pregnancies/${breeding.data.id}/confirmation`, { ...herdSource.context, method: 'POST', body: confirmationCommand });
  expectStatus(confirmed, 200, 'Confirmação real de gestação');
  const confirmationReplay = await api(`/api/v1/herd/pregnancies/${breeding.data.id}/confirmation`, { ...herdSource.context, method: 'POST', body: confirmationCommand });
  expectStatus(confirmationReplay, 200, 'Replay da confirmação de gestação');
  motherProfile = await api(`/api/v1/herd/animals/${secondAnimalId}`, herdSource.context);
  const calfId = randomUUID();
  const calvingCommand = { operationId: randomUUID(), expectedVersion: motherProfile.data.version, pregnancyId: breeding.data.id, expectedPregnancyVersion: confirmed.data.version, calvedOn: today, calfId, identification: `SMOKE-CALF-${calfId.slice(0, 6)}`, name: 'Cria Smoke', sex: 'FEMALE', birthDate: today };
  const calving = await api(`/api/v1/herd/animals/${secondAnimalId}/calvings`, { ...herdSource.context, method: 'POST', body: calvingCommand });
  expectStatus(calving, 201, 'Parto real com criação inline da cria');
  const calvingReplay = await api(`/api/v1/herd/animals/${secondAnimalId}/calvings`, { ...herdSource.context, method: 'POST', body: calvingCommand });
  expectStatus(calvingReplay, 201, 'Replay idempotente do parto');
  const mother = await api(`/api/v1/herd/animals/${calfId}/mother`, herdSource.context);
  expectStatus(mother, 200, 'Relação materna vista pela cria');
  assert.equal(mother.data.id, secondAnimalId);
  const calves = await api(`/api/v1/herd/animals/${secondAnimalId}/calves?page=0&size=20`, herdSource.context);
  expectStatus(calves, 200, 'Relação materna vista pela mãe');
  assert.ok(calves.data.some((item) => item.id === calfId));

  motherProfile = await api(`/api/v1/herd/animals/${secondAnimalId}`, herdSource.context);
  const calfProfile = await api(`/api/v1/herd/animals/${calfId}`, herdSource.context);
  const batchHealthCommand = { operationId: randomUUID(), treatmentType: 'VACCINATION', occurredOn: today, product: 'Vacina em lote smoke', protocol: null, nextDueOn: isoDate(90), notes: null, animals: [{ id: secondAnimalId, expectedVersion: motherProfile.data.version }, { id: calfId, expectedVersion: calfProfile.data.version }] };
  const batchHealth = await api('/api/v1/herd/health-treatments/batch', { ...herdSource.context, method: 'POST', body: batchHealthCommand });
  expectStatus(batchHealth, 200, 'Vacinação real em lote');
  const batchHealthReplay = await api('/api/v1/herd/health-treatments/batch', { ...herdSource.context, method: 'POST', body: batchHealthCommand });
  expectStatus(batchHealthReplay, 200, 'Replay idempotente da vacinação em lote');
  assert.equal(batchHealthReplay.data.replayed, true);

  motherProfile = await api(`/api/v1/herd/animals/${secondAnimalId}`, herdSource.context);
  const breedingToTerminate = await api(`/api/v1/herd/animals/${secondAnimalId}/breedings`, { ...herdSource.context, method: 'POST', body: { operationId: randomUUID(), expectedVersion: motherProfile.data.version, serviceType: 'NATURAL_SERVICE', serviceOn: today, sireReference: null, expectedCalvingOn: isoDate(280), notes: null } });
  expectStatus(breedingToTerminate, 201, 'Segundo serviço para encerramento seguro');
  const terminated = await api(`/api/v1/herd/pregnancies/${breedingToTerminate.data.id}/termination`, { ...herdSource.context, method: 'POST', body: { operationId: randomUUID(), expectedVersion: breedingToTerminate.data.version, endedOn: today, reason: 'NOT_PREGNANT' } });
  expectStatus(terminated, 200, 'Encerramento real de gestação');
  assert.equal(terminated.data.status, 'TERMINATED');

  const standaloneMotherId = randomUUID();
  const standaloneMother = await api('/api/v1/herd/animals', { ...herdSource.context, method: 'POST', body: { id: standaloneMotherId, identification: `SMOKE-MOTHER-${standaloneMotherId.slice(0, 6)}`, name: 'Mãe sem gestação Smoke', sex: 'FEMALE', birthDate: '2023-01-10' } });
  expectStatus(standaloneMother, 201, 'Mãe para parto sem gestação');
  const standaloneCalfId = randomUUID();
  const standaloneCalving = await api(`/api/v1/herd/animals/${standaloneMotherId}/calvings`, { ...herdSource.context, method: 'POST', body: { operationId: randomUUID(), expectedVersion: standaloneMother.data.version, pregnancyId: null, expectedPregnancyVersion: null, calvedOn: today, calfId: standaloneCalfId, identification: `SMOKE-STANDALONE-${standaloneCalfId.slice(0, 6)}`, name: null, sex: 'MALE', birthDate: today } });
  expectStatus(standaloneCalving, 201, 'Parto real sem gestação previamente cadastrada');

  const beforePlannerWeights = weights.data.totalElements;
  const plannerOperationId = randomUUID();
  const planner = await api('/api/v1/herd/planner-items', { ...herdSource.context, method: 'POST', body: { operationId: plannerOperationId, type: 'WEIGHING', title: 'Pesagem planejada pelo smoke', notes: null, scheduledFor: isoDate(2), animalId: secondAnimalId } });
  expectStatus(planner, 201, 'Criação real no planejador');
  const plannerReplay = await api('/api/v1/herd/planner-items', { ...herdSource.context, method: 'POST', body: { operationId: plannerOperationId, type: 'WEIGHING', title: 'Pesagem planejada pelo smoke', notes: null, scheduledFor: isoDate(2), animalId: secondAnimalId } });
  expectStatus(plannerReplay, 200, 'Replay da criação no planejador');
  assert.equal(plannerReplay.data.replay, true);
  const correctedPlanner = await api(`/api/v1/herd/planner-items/${planner.data.id}`, { ...herdSource.context, method: 'PATCH', body: { operationId: randomUUID(), expectedVersion: planner.data.version, type: planner.data.type, title: planner.data.title, notes: 'Reagendado no smoke', scheduledFor: isoDate(3), animalId: secondAnimalId } });
  expectStatus(correctedPlanner, 200, 'Correção real no planejador');
  const stalePlanner = await api(`/api/v1/herd/planner-items/${planner.data.id}`, { ...herdSource.context, method: 'PATCH', body: { operationId: randomUUID(), expectedVersion: planner.data.version, type: planner.data.type, title: planner.data.title, notes: null, scheduledFor: isoDate(4), animalId: secondAnimalId } });
  expectStatus(stalePlanner, 409, 'Conflito otimista real no planejador');
  const completedPlanner = await api(`/api/v1/herd/planner-items/${planner.data.id}/completion`, { ...herdSource.context, method: 'POST', body: { operationId: randomUUID(), expectedVersion: correctedPlanner.data.version } });
  expectStatus(completedPlanner, 200, 'Conclusão real de item planejado');
  const weightsAfterPlanner = await api(`/api/v1/herd/animals/${secondAnimalId}/weights?page=0&size=20`, herdSource.context);
  assert.equal(weightsAfterPlanner.data.totalElements, beforePlannerWeights, 'Concluir planner não pode criar uma pesagem.');
  const cancellable = await api('/api/v1/herd/planner-items', { ...herdSource.context, method: 'POST', body: { operationId: randomUUID(), type: 'GENERAL', title: 'Atividade cancelável do smoke', notes: null, scheduledFor: isoDate(5), animalId: null } });
  expectStatus(cancellable, 201, 'Segundo item real do planejador');
  const cancelled = await api(`/api/v1/herd/planner-items/${cancellable.data.id}/cancellation`, { ...herdSource.context, method: 'POST', body: { operationId: randomUUID(), expectedVersion: cancellable.data.version } });
  expectStatus(cancelled, 200, 'Cancelamento real no planejador');
  const pendingWork = await api('/api/v1/herd/pending-work?page=0&size=20', herdSource.context);
  expectStatus(pendingWork, 200, 'Pending Work real');
  const unifiedAgenda = await api(`/api/v1/herd/agenda?animalId=${secondAnimalId}&page=0&size=20`, herdSource.context);
  expectStatus(unifiedAgenda, 200, 'Agenda operacional unificada');
  assert.ok(Array.isArray(unifiedAgenda.data.items));
  const reproductionHistory = await api(`/api/v1/herd/animals/${secondAnimalId}/history?page=0&size=50`, herdSource.context);
  expectStatus(reproductionHistory, 200, 'Timeline real após parto');
  assert.ok(reproductionHistory.data.items.some((event) => event.type === 'CALVED'));

  const transfer = await api(`/api/v1/herd/animals/${animalId}/transfers`, { ...herdSource.context, method: 'POST', body: { operationId: randomUUID(), expectedVersion: transferredAnimal.version, destinationFarmId: transferFarm.farmId, destinationPaddockId: null, occurredOn: today, notes: 'Transferência segura do smoke local' } });
  expectStatus(transfer, 200, 'Transferência real entre fazendas');
  assert.equal(transfer.data.destinationFarm.id, transferFarm.farmId);
  assert.equal(transfer.data.transferredCount, 1);
  const sourceAfterTransfer = await api(`/api/v1/herd/animals/${animalId}`, herdSource.context);
  expectStatus(sourceAfterTransfer, 404, 'Perfil indisponível na origem após transferência');
  const destinationProfile = await api(`/api/v1/herd/animals/${animalId}`, destinationContext);
  expectStatus(destinationProfile, 200, 'Perfil disponível na nova custódia');
  assert.equal(destinationProfile.data.paddock, null);
  const destinationHistory = await api(`/api/v1/herd/animals/${animalId}/history?page=0&size=50`, destinationContext);
  expectStatus(destinationHistory, 200, 'Timeline sanitizada da nova custódia');
  assert.ok(destinationHistory.data.items.some((event) => event.type === 'TRANSFERRED_IN'));
  const movementReport = await api('/api/v1/herd/reports/movements?page=0&size=20', herdSource.context);
  expectStatus(movementReport, 200, 'Histórico real de movimentações');
  assert.ok(movementReport.data.summary.movementCount >= 2);
  const reportPaths = [
    ['herd-position', 'Posição do rebanho'],
    ['lifecycle', 'Ciclo do rebanho'],
    ['movements', 'Movimentações'],
    ['transfers', 'Transferências'],
    ['weights', 'Pesagens'],
    ['health', 'Saúde'],
    ['reproduction', 'Reprodução'],
    ['planner', 'Execução do planejamento'],
  ];
  for (const [path, label] of reportPaths) {
    const period = path === 'herd-position' ? '' : `&from=${today}&to=${today}`;
    const report = await api(`/api/v1/herd/reports/${path}?page=0&size=5${period}`, herdSource.context);
    expectStatus(report, 200, `Relatório real: ${label}`);
    assert.ok(report.data.summary && Array.isArray(report.data.items), `${label} deve retornar resumo e itens.`);
    assert.equal(report.data.page, 0);
    assert.equal(report.data.size, 5);
  }
  const filteredWeightReport = await api(`/api/v1/herd/reports/weights?from=${today}&to=${today}&animalId=${secondAnimalId}&page=0&size=1`, herdSource.context);
  expectStatus(filteredWeightReport, 200, 'Pesagens com período, animal e paginação');
  assert.ok(filteredWeightReport.data.summary.measurementCount >= 1, 'A pesagem registrada deve aparecer no relatório analítico.');
  assert.equal(filteredWeightReport.data.items[0].animal.id, secondAnimalId);
  const filteredHealthReport = await api(`/api/v1/herd/reports/health?from=${today}&to=${today}&animalId=${secondAnimalId}&treatmentType=VACCINATION&page=0&size=5`, herdSource.context);
  expectStatus(filteredHealthReport, 200, 'Saúde com filtros reais');
  assert.ok(filteredHealthReport.data.items.every((item) => item.treatmentType === 'VACCINATION'));
  const filteredReproductionReport = await api(`/api/v1/herd/reports/reproduction?from=${today}&to=${today}&motherId=${secondAnimalId}&page=0&size=5`, herdSource.context);
  expectStatus(filteredReproductionReport, 200, 'Reprodução com matriz e período');
  assert.ok(filteredReproductionReport.data.summary.servicesRecorded >= 1);
  const emptyReport = await api(`/api/v1/herd/reports/weights?animalId=${randomUUID()}&page=0&size=5`, herdSource.context);
  expectStatus(emptyReport, 200, 'Relatório vazio');
  assert.equal(emptyReport.data.totalElements, 0);

  const unauthorized = await api('/api/v1/me');
  expectStatus(unauthorized, 401, 'JWT ausente');
  assert.ok(unauthorized.data.requestId, 'Erro 401 não retornou referência de suporte.');
  assert.equal(unauthorized.headers.get('X-Request-ID'), unauthorized.data.requestId);
  assert.equal(unauthorized.headers.get('X-Correlation-ID'), unauthorized.data.requestId);
  expectStatus(await api('/api/v1/context', { token }), 400, 'Headers de contexto ausentes');
  expectStatus(await api('/api/v1/context', {
    token, organizationId: randomUUID(), farmId: firstFarm.farmId,
  }), 404, 'Organização inacessível');
  expectStatus(await api('/api/v1/context', {
    token, organizationId: firstOrganization.organizationId, farmId: randomUUID(),
  }), 404, 'Fazenda inacessível');
  const currentFarm = await api('/api/v1/farms/current', {
    token, organizationId: firstOrganization.organizationId, farmId: firstFarm.farmId,
  });
  expectStatus(currentFarm, 200, 'Perfil atual antes do conflito');
  expectStatus(await api('/api/v1/farms/current', {
    token, organizationId: firstOrganization.organizationId, farmId: firstFarm.farmId,
    method: 'PATCH', body: { name: currentFarm.data.name, expectedVersion: currentFarm.data.version + 1 },
  }), 409, 'Conflito de versão sem alteração');

  if (process.env.GR_SMOKE_VIEWER_EMAIL && process.env.GR_SMOKE_VIEWER_PASSWORD) {
    const viewer = authClient({
      getItem: () => null, setItem: () => {}, removeItem: () => {},
    });
    const viewerLogin = await viewer.auth.signInWithPassword({
      email: process.env.GR_SMOKE_VIEWER_EMAIL,
      password: process.env.GR_SMOKE_VIEWER_PASSWORD,
    });
    assert.ifError(viewerLogin.error);
    expectStatus(await api(`/api/v1/organizations/${secondOrganization.organizationId}/invitations`, {
      token: viewerLogin.data.session.access_token,
    }), 403, 'Papel VIEWER sem permissão administrativa');
    await viewer.auth.signOut({ scope: 'local' });
  }

  await assert.rejects(fetch('http://127.0.0.1:1/api/v1/me'),
    'Backend indisponível deveria falhar sem resposta HTTP.');

  const signedOut = await restoredClient.auth.signOut({ scope: 'local' });
  assert.ifError(signedOut.error);
  const afterLogout = await authClient().auth.getSession();
  assert.ifError(afterLogout.error);
  assert.equal(afterLogout.data.session, null, 'Logout não removeu a sessão persistida.');

  console.log('Smoke local concluído: login, sessão, contextos, dashboard, Herd Core e operações reais.');
  console.log('Herd Core concluído: lista, perfil, criação/replay, correção/409, movimento/replay, lote/replay, transferência e custódia.');
  console.log('Herd Intelligence concluído: peso/replay, saúde individual/lote, reprodução, encerramento, parto com/sem gestação, relação materna, pendências, planner/replay/409 e agenda.');
  console.log('Relatórios concluídos: posição, ciclo, movimentações, transferências, pesagens, saúde, reprodução e execução do planejamento.');
  console.log('Administração concluída: organização, fazendas, convites, ALL_FARMS, SELECTED_FARMS, papéis, locking, último proprietário, revogação e não enumeração.');
  console.log('Cenários negativos concluídos: 400, 401, 404, 409 e backend indisponível.');
  if (process.env.GR_SMOKE_VIEWER_EMAIL) console.log('Cenário 403 concluído com perfil de visualizador.');
}

await main();
