import { test, expect } from '@playwright/test';

test.describe('Pets API — core behaviour', () => {
  test('GET /health returns ok', async ({ request }) => {
    const res = await request.get('/health');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
  });

  test('GET /pets returns a list', async ({ request }) => {
    const res = await request.get('/pets');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body)).toBeTruthy();
    expect(body.length).toBeGreaterThan(0);
  });

  test('POST /pets creates a pet and returns 201', async ({ request }) => {
    const res = await request.post('/pets', {
      data: { name: 'TestPet', tag: 'qa', status: 'available' },
    });
    expect(res.status()).toBe(201);
    const pet = await res.json();
    expect(pet.id).toBeDefined();
    expect(pet.name).toBe('TestPet');
  });

  test('POST /pets without name returns 422', async ({ request }) => {
    const res = await request.post('/pets', { data: { tag: 'no-name' } });
    expect(res.status()).toBe(422);
  });

  test('GET /pets/{id} returns 404 for unknown id', async ({ request }) => {
    const res = await request.get('/pets/999999');
    expect(res.status()).toBe(404);
  });

  test('DELETE /pets/{id} removes a pet', async ({ request }) => {
    const created = await request.post('/pets', { data: { name: 'ToDelete' } });
    const pet = await created.json();
    const del = await request.delete(`/pets/${pet.id}`);
    expect(del.status()).toBe(204);
    const after = await request.get(`/pets/${pet.id}`);
    expect(after.status()).toBe(404);
  });

  test('GET /store/inventory returns status counts', async ({ request }) => {
    const res = await request.get('/store/inventory');
    expect(res.ok()).toBeTruthy();
    const inv = await res.json();
    expect(typeof inv).toBe('object');
  });
});