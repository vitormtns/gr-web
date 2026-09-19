import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

const required = (name) => {
  const value = process.env[name];
  assert.ok(value, `Defina ${name} antes do smoke local da Home.`);
  return value;
};

const supabaseUrl = required('GR_SMOKE_SUPABASE_URL');
const publicKey = required('GR_SMOKE_SUPABASE_PUBLIC_KEY');
const apiBaseUrl = required('GR_SMOKE_API_URL').replace(/\/$/, '');
const email = required('GR_SMOKE_EMAIL');
const password = required('GR_SMOKE_PASSWORD');
assert.equal(new URL(supabaseUrl).hostname, '127.0.0.1', 'O smoke aceita somente o Supabase local.');
assert.equal(new URL(apiBaseUrl).hostname, '127.0.0.1', 'O smoke aceita somente a API local.');

const storageValues = new Map();
const storage = {
  getItem: (key) => storageValues.get(key) ?? null,
  setItem: (key, value) => storageValues.set(key, value),
  removeItem: (key) => storageValues.delete(key),
};
const auth = createClient(supabaseUrl, publicKey, { auth: { storage, storageKey: 'gr.auth.session.home-smoke', persistSession: true, autoRefreshToken: false, detectSessionInUrl: false } });

async function api(path, context = {}) {
  const headers = { Authorization: `Bearer ${context.token}` };
  if (context.organizationId) headers['X-Organization-Id'] = context.organizationId;
  if (context.farmId) headers['X-Farm-Id'] = context.farmId;
  const response = await fetch(`${apiBaseUrl}${path}`, { headers });
  const data = await response.json();
  assert.equal(response.status, 200, `${path}: esperado HTTP 200, recebido ${response.status}`);
  return data;
}

const signedIn = await auth.auth.signInWithPassword({ email, password });
assert.ifError(signedIn.error);
const token = signedIn.data.session?.access_token;
assert.ok(token, 'Login local não disponibilizou JWT.');
await api('/api/v1/me', { token });

const organizations = (await api('/api/v1/me/organizations', { token })).items;
assert.ok(organizations.length >= 2, 'O smoke de contexto exige duas organizações locais.');
const contexts = [];
for (const organization of organizations) {
  const farms = (await api(`/api/v1/me/organizations/${organization.organizationId}/farms`, { token })).items;
  if (farms.length) contexts.push({ organization, farms });
}
const first = contexts.find((item) => item.farms.length >= 2);
const second = contexts.find((item) => item.organization.organizationId !== first?.organization.organizationId);
assert.ok(first && second, 'O smoke exige duas fazendas em uma organização e outra organização acessível.');

for (const [organization, farm] of [[first.organization, first.farms[0]], [first.organization, first.farms[1]], [second.organization, second.farms[0]]]) {
  const context = await api('/api/v1/context', { token, organizationId: organization.organizationId, farmId: farm.farmId });
  assert.equal(context.organization.id, organization.organizationId);
  assert.equal(context.farm.id, farm.farmId);
}

const dashboardContext = { token, organizationId: first.organization.organizationId, farmId: first.farms[0].farmId };
const today = new Date().toISOString().slice(0, 10);
for (const period of ['TODAY', 'LAST_7_DAYS', 'LAST_30_DAYS']) {
  const [overview, activity] = await Promise.all([
    api(`/api/v1/herd/dashboard/overview?period=${period}`, dashboardContext),
    api(`/api/v1/herd/dashboard/activity?period=${period}`, dashboardContext),
  ]);
  assert.equal(overview.period.period, period);
  assert.equal(activity.period.period, period);
  assert.ok(Array.isArray(overview.herdSnapshot.byPaddock));
  assert.ok(Array.isArray(activity.series));
}
const custom = await api(`/api/v1/herd/dashboard/overview?period=CUSTOM&from=${today}&to=${today}`, dashboardContext);
assert.equal(custom.period.period, 'CUSTOM');
const [attention, agenda, paddocks] = await Promise.all([
  api('/api/v1/herd/dashboard/attention?previewSize=5', dashboardContext),
  api(`/api/v1/herd/agenda?from=${today}&page=0&size=5`, dashboardContext),
  api('/api/v1/herd/paddocks?page=0&size=100', dashboardContext),
]);
assert.ok(Array.isArray(attention.preview));
assert.ok(Array.isArray(agenda.items));
assert.ok(Array.isArray(paddocks.items));

await assert.rejects(fetch('http://127.0.0.1:1/api/v1/herd/dashboard/overview'), 'A indisponibilidade local deve ser detectável.');
const signedOut = await auth.auth.signOut({ scope: 'local' });
assert.ifError(signedOut.error);
const session = await auth.auth.getSession();
assert.ifError(session.error);
assert.equal(session.data.session, null, 'Logout local deve remover a sessão persistida.');

console.log('Smoke read-only da Home concluído: login, contexto, troca, períodos, dados operacionais, indisponibilidade e logout.');
