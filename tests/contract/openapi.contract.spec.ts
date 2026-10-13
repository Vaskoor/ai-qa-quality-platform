import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import Ajv from 'ajv';

const SPEC_PATH = path.resolve(process.cwd(), 'specs/petstore-openapi.json');
const ajv = new Ajv({ strict: false, allErrors: true });

test.describe('OpenAPI contract compliance', () => {
  test('served /openapi.json matches the repo spec', async ({ request }) => {
    const local = JSON.parse(await readFile(SPEC_PATH, 'utf8'));
    const res = await request.get('/openapi.json');
    expect(res.ok()).toBeTruthy();
    const remote = await res.json();
    expect(remote.info.title).toBe(local.info.title);
    expect(remote.info.version).toBe(local.info.version);
  });

  test('GET /pets response matches Pet[] schema', async ({ request }) => {
    const spec = JSON.parse(await readFile(SPEC_PATH, 'utf8'));
    const arraySchema = { type: 'array', items: spec.components.schemas.Pet };
    const validate = ajv.compile(arraySchema);

    const res = await request.get('/pets');
    const body = await res.json();
    const ok = validate(body);
    if (!ok) console.error(validate.errors);
    expect(ok).toBeTruthy();
  });

  test('POST /pets returns an object matching Pet schema', async ({ request }) => {
    const spec = JSON.parse(await readFile(SPEC_PATH, 'utf8'));
    const validate = ajv.compile(spec.components.schemas.Pet);

    const res = await request.post('/pets', { data: { name: 'ContractPet' } });
    const body = await res.json();
    const ok = validate(body);
    if (!ok) console.error(validate.errors);
    expect(ok).toBeTruthy();
  });

  test('GET /pets/{id} response matches Pet schema', async ({ request }) => {
    const spec = JSON.parse(await readFile(SPEC_PATH, 'utf8'));
    const validate = ajv.compile(spec.components.schemas.Pet);

    const created = await request.post('/pets', { data: { name: 'GetContractPet' } });
    const pet = await created.json();
    const res = await request.get(`/pets/${pet.id}`);
    const body = await res.json();
    expect(validate(body)).toBeTruthy();
  });

  test('documented 404 is honoured for /pets/{petId}', async ({ request }) => {
    const res = await request.get('/pets/424242');
    expect(res.status()).toBe(404);
  });
});