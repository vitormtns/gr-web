import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
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
  const organizations = await api('/api/v1/me/organizations', { token });
  expectStatus(organizations, 200, 'Organizações');
  assert.ok(Array.isArray(organizations.data.items) && organizations.data.items.length >= 2,
    'O smoke de troca exige duas organizações locais acessíveis.');

  const organizationFarms = await Promise.all(organizations.data.items.map(async (organization) => {
    const farms = await api(`/api/v1/me/organizations/${organization.organizationId}/farms`, { token });
    expectStatus(farms, 200, 'Fazendas acessíveis');
    return { organization, farms: farms.data.items };
  }));
  const first = organizationFarms.find((item) => item.farms.length >= 2);
  assert.ok(first, 'O smoke de troca exige duas fazendas em uma organização local.');
  const second = organizationFarms.find((item) =>
    item.organization.organizationId !== first.organization.organizationId && item.farms.length >= 1);
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

  console.log('Smoke local concluído: login, sessão, contextos, dashboard e Herd Core real.');
  console.log('Herd Core concluído: lista, perfil, criação/replay, correção/409, movimento/replay, lote/replay, transferência e custódia.');
  console.log('Cenários negativos concluídos: 400, 401, 404, 409 e backend indisponível.');
  if (process.env.GR_SMOKE_VIEWER_EMAIL) console.log('Cenário 403 concluído com perfil de visualizador.');
}

await main();
