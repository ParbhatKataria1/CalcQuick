import type { MockAttempt, MockSource, MockTest, QuestionSet, SetContent } from '@/types/mock-test';

/** Mock tests are stored by json-server (`npm run db`), so they aren't limited by browser storage. */
const BASE_URL = process.env.NEXT_PUBLIC_MOCK_API_URL || 'http://localhost:4100';

export class MockServerError extends Error {}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } });
  } catch {
    throw new MockServerError('The mock test server is not running. Start it with `npm run db` (or `npm run dev:all`).');
  }
  if (response.status === 404) throw new MockServerError('Not found.');
  if (!response.ok) throw new MockServerError(`The mock test server answered ${response.status}.`);
  return response.json() as Promise<T>;
}

const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) });

export const mockApi = {
  listSources: () => request<MockSource[]>('/sources?_sort=createdAt&_order=desc'),
  getSource: (id: string) => request<MockSource>(`/sources/${encodeURIComponent(id)}`),
  createSource: (source: MockSource) => request<MockSource>('/sources', json('POST', source)),
  updateSource: (id: string, patch: Partial<MockSource>) => request<MockSource>(`/sources/${encodeURIComponent(id)}`, json('PATCH', patch)),
  deleteSource: (id: string) => request<unknown>(`/sources/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  getTest: (id: string) => request<MockTest>(`/tests/${encodeURIComponent(id)}`),
  createTest: (test: MockTest) => request<MockTest>('/tests', json('POST', test)),

  listAttempts: (sourceId?: string) => request<MockAttempt[]>(`/attempts?${sourceId ? `sourceId=${encodeURIComponent(sourceId)}&` : ''}_sort=startedAt&_order=desc`),
  getAttempt: (id: string) => request<MockAttempt>(`/attempts/${encodeURIComponent(id)}`),
  findAttemptForTest: async (testId: string) => (await request<MockAttempt[]>(`/attempts?testId=${encodeURIComponent(testId)}`))[0] ?? null,
  createAttempt: (attempt: MockAttempt) => request<MockAttempt>('/attempts', json('POST', attempt)),
  updateAttempt: (id: string, patch: Partial<MockAttempt>) => request<MockAttempt>(`/attempts/${encodeURIComponent(id)}`, json('PATCH', patch)),
};

/** Sends a PDF to the server route, which reads it with Gemini. */
export async function parsePdf(file: File): Promise<{ title: string; sets: QuestionSet[]; warning?: string }> {
  const form = new FormData();
  form.append('file', file);
  const response = await fetch('/api/mock-tests/parse', { method: 'POST', body: form });
  const body = await response.json().catch(() => ({ error: `Upload failed (${response.status}).` }));
  if (!response.ok) throw new Error(body.error ?? `Upload failed (${response.status}).`);
  return body;
}

/** Asks Gemini for more versions of the given sets. */
export async function requestVariants(sets: QuestionSet[], count = 2): Promise<Record<string, SetContent[]>> {
  const response = await fetch('/api/mock-tests/variants', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sets, count }) });
  const body = await response.json().catch(() => ({ error: `Request failed (${response.status}).` }));
  if (!response.ok) throw new Error(body.error ?? `Request failed (${response.status}).`);
  return body.variants;
}
