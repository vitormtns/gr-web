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

  console.log('Smoke local concluído: login, restauração, refresh, logout, contextos e API real.');
  console.log('Cenários negativos concluídos: 400, 401, 404, 409 e backend indisponível.');
  if (process.env.GR_SMOKE_VIEWER_EMAIL) console.log('Cenário 403 concluído com perfil de visualizador.');
}

await main();
