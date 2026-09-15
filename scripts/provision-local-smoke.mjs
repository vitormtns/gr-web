import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { writeFileSync, existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const backend = resolve(repository, '..', 'gr-service');
const smokeFile = join(repository, '.env.smoke.local');
assert.ok(!existsSync(smokeFile), 'O arquivo de smoke local já existe; preserve a configuração atual.');
assert.ok(existsSync(join(backend, 'supabase', 'config.toml')), 'O projeto Supabase local não foi encontrado.');

function command(executable, args, options = {}) {
  const result = spawnSync(executable, args, {
    cwd: backend, encoding: 'utf8', timeout: 30000, ...options,
  });
  assert.equal(result.status, 0, `Comando local falhou: ${args[0]}.`);
  return result.stdout;
}

command('git', ['check-ignore', '-q', '.env.smoke.local'], { cwd: repository });

const statusOutput = command(process.execPath, [
  join(backend, 'node_modules', 'supabase', 'dist', 'supabase.js'), 'status', '-o', 'json',
]);
const start = statusOutput.indexOf('{');
const end = statusOutput.lastIndexOf('}');
assert.ok(start >= 0 && end > start, 'O status estruturado do Supabase está indisponível.');
const status = JSON.parse(statusOutput.slice(start, end + 1));
assert.equal(status.API_URL, 'http://127.0.0.1:54321', 'Somente o Supabase local é permitido.');
assert.ok(status.PUBLISHABLE_KEY, 'A chave publicável local não foi encontrada.');
const frontendLocal = readFileSync(join(repository, 'src', 'environments', 'environment.local.ts'), 'utf8');
assert.ok(frontendLocal.includes(status.PUBLISHABLE_KEY), 'A chave pública do frontend local não coincide com a stack ativa.');

const containers = command('docker', ['ps', '--filter', 'name=supabase_db_gr-service', '--format', '{{.Names}}'])
  .trim().split(/\r?\n/);
assert.deepEqual(containers, ['supabase_db_gr-service'], 'O container PostgreSQL local não é único.');

for (const uri of ['http://127.0.0.1:54321/auth/v1/health', 'http://127.0.0.1:8080/actuator/health/readiness']) {
  const response = await fetch(uri);
  assert.equal(response.status, 200, 'O ambiente local não está pronto para provisionamento.');
}

const email = `phase02-${randomUUID()}@example.test`;
const password = `${randomBytes(24).toString('base64url')}Aa1#`;
const signedUp = await fetch(`${status.API_URL}/auth/v1/signup`, {
  method: 'POST',
  headers: { apikey: status.PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
});
assert.equal(signedUp.status, 200, 'O Auth local não criou a conta de desenvolvimento.');
const signup = await signedUp.json();
assert.match(signup.user?.id ?? '', /^[0-9a-f-]{36}$/i, 'O Auth local não retornou uma identidade.');

const organizationA = randomUUID();
const organizationB = randomUUID();
const farmA = randomUUID();
const farmB = randomUUID();
const farmC = randomUUID();
const paddockNorth = randomUUID();
const paddockSouth = randomUUID();
const paddockReserve = randomUUID();
const paddockOther = randomUUID();
const animals = Array.from({ length: 6 }, () => randomUUID());
const sql = `begin;
insert into app.users (id, email, display_name, status)
values ('${signup.user.id}'::uuid, '${email}', 'Operador de teste', 'ACTIVE');
insert into app.organizations (id, name, status) values
  ('${organizationA}'::uuid, 'Grupo de teste da Phase 02', 'ACTIVE'),
  ('${organizationB}'::uuid, 'Grupo secundário de teste', 'ACTIVE');
insert into app.organization_memberships (id, tenant_id, user_id, role_key, status, farm_scope_mode) values
  ('${randomUUID()}'::uuid, '${organizationA}'::uuid, '${signup.user.id}'::uuid, 'OWNER', 'ACTIVE', 'ALL_FARMS'),
  ('${randomUUID()}'::uuid, '${organizationB}'::uuid, '${signup.user.id}'::uuid, 'OWNER', 'ACTIVE', 'ALL_FARMS');
insert into app.farms (id, tenant_id, name, status) values
  ('${farmA}'::uuid, '${organizationA}'::uuid, 'Fazenda Norte', 'ACTIVE'),
  ('${farmB}'::uuid, '${organizationA}'::uuid, 'Fazenda Sul', 'ACTIVE'),
  ('${farmC}'::uuid, '${organizationB}'::uuid, 'Fazenda Secundária', 'ACTIVE');
insert into app.paddocks (id, tenant_id, farm_id, name, code, status) values
  ('${paddockNorth}'::uuid, '${organizationA}'::uuid, '${farmA}'::uuid, 'Piquete Norte', 'N-01', 'ACTIVE'),
  ('${paddockSouth}'::uuid, '${organizationA}'::uuid, '${farmA}'::uuid, 'Piquete Sul', 'S-02', 'ACTIVE'),
  ('${paddockReserve}'::uuid, '${organizationA}'::uuid, '${farmA}'::uuid, 'Reserva', 'R-03', 'ACTIVE'),
  ('${paddockOther}'::uuid, '${organizationA}'::uuid, '${farmB}'::uuid, 'Maternidade', 'M-01', 'ACTIVE');
insert into app.animals (id, tenant_id, farm_id, paddock_id, identification, sex, status) values
  ('${animals[0]}'::uuid, '${organizationA}'::uuid, '${farmA}'::uuid, '${paddockNorth}'::uuid, 'P02-001', 'FEMALE', 'ACTIVE'),
  ('${animals[1]}'::uuid, '${organizationA}'::uuid, '${farmA}'::uuid, '${paddockNorth}'::uuid, 'P02-002', 'FEMALE', 'ACTIVE'),
  ('${animals[2]}'::uuid, '${organizationA}'::uuid, '${farmA}'::uuid, '${paddockNorth}'::uuid, 'P02-003', 'MALE', 'ACTIVE'),
  ('${animals[3]}'::uuid, '${organizationA}'::uuid, '${farmA}'::uuid, '${paddockSouth}'::uuid, 'P02-004', 'FEMALE', 'ACTIVE'),
  ('${animals[4]}'::uuid, '${organizationA}'::uuid, '${farmA}'::uuid, null, 'P02-005', 'MALE', 'ACTIVE'),
  ('${animals[5]}'::uuid, '${organizationA}'::uuid, '${farmB}'::uuid, '${paddockOther}'::uuid, 'P02-006', 'FEMALE', 'ACTIVE');
commit;`;
command('docker', ['exec', '-i', containers[0], 'psql', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'postgres'], { input: sql });

const configuration = [
  `GR_SMOKE_SUPABASE_URL=${status.API_URL}`,
  `GR_SMOKE_SUPABASE_PUBLIC_KEY=${status.PUBLISHABLE_KEY}`,
  'GR_SMOKE_API_URL=http://127.0.0.1:8080',
  `GR_SMOKE_EMAIL=${email}`,
  `GR_SMOKE_PASSWORD="${password}"`,
  '',
].join('\n');
writeFileSync(smokeFile, configuration, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
console.log('Conta e contextos descartáveis criados somente no Supabase local; configuração de smoke ignorada pelo Git.');
