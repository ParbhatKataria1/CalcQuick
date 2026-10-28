import { upload, uploadPresigned } from '@vercel/blob/client';
import type { AttemptSummary, MockAttempt, MockSource, MockTest, Section, SourceSummary, TestSummary } from '@/types/mock-test';

/** Calls the app's own API, which stores mock tests in the signed-in account. */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, init);
  } catch {
    throw new Error('Could not reach the server. Check your connection and try again.');
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? `Request failed (${response.status}).`);
  return body as T;
}

const json = (method: string, body: unknown): RequestInit => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const id = encodeURIComponent;

type UploadConfig = { blob: boolean; mode: 'token' | 'presigned' | null; access: 'public' | 'private'; maxBytes: number; directMaxBytes: number };

export type StorageUsage = {
  practice: { bytes: number; sessions: number; answers: number };
  sources: SourceSummary[];
  attempts: AttemptSummary[];
  unstartedTests: TestSummary[];
};

export const mockApi = {
  listSources: async () => (await request<{ sources: SourceSummary[] }>('/api/mock/sources')).sources,
  getSource: async (sourceId: string) => (await request<{ source: MockSource }>(`/api/mock/sources/${id(sourceId)}`)).source,
  renameSource: (sourceId: string, name: string) => request(`/api/mock/sources/${id(sourceId)}`, json('PATCH', { name })),
  deleteSource: (sourceId: string) => request(`/api/mock/sources/${id(sourceId)}`, { method: 'DELETE' }),

  /**
   * Sends a PDF to be read by Gemini; the paper is saved to the account. With Vercel Blob connected the
   * file goes straight to Blob storage (Vercel functions only accept 4.5 MB); otherwise it is posted directly.
   */
  uploadPdf: async (file: File, userId: string, onUploadProgress?: (percentage: number) => void) => {
    const config = await request<UploadConfig>('/api/mock/uploads');
    if (file.size > config.maxBytes) throw new Error(`The PDF is larger than ${config.maxBytes / 1024 / 1024} MB. Compress it or split it into parts.`);
    if (config.blob) {
      // A timestamp keeps names unique; presigned uploads can't add a random suffix.
      const pathname = `mock-pdfs/${userId}/${Date.now()}-${file.name.replace(/[^\w.-]+/g, '-')}`;
      const options = {
        access: config.access,
        handleUploadUrl: '/api/mock/uploads',
        contentType: 'application/pdf',
        onUploadProgress: ({ percentage }: { percentage: number }) => onUploadProgress?.(percentage),
      };
      const blob = config.mode === 'presigned' ? await uploadPresigned(pathname, file, options) : await upload(pathname, file, options);
      onUploadProgress?.(100);
      return request<{ id: string }>('/api/mock/sources', json('POST', { blobUrl: blob.url, fileName: file.name }));
    }
    if (file.size > config.directMaxBytes) {
      throw new Error(`PDFs over ${config.directMaxBytes / 1024 / 1024} MB need Vercel Blob. In Vercel, open Storage, connect a Blob store to this project and redeploy.`);
    }
    const form = new FormData();
    form.append('file', file);
    onUploadProgress?.(100);
    return request<{ id: string }>('/api/mock/sources', { method: 'POST', body: form });
  },
  /** Reads the next part of a paper; call until the status is "ready". */
  importStep: (sourceId: string) =>
    request<{ status: 'reading' | 'ready'; done: number; total: number; skipped: string[] }>(`/api/mock/sources/${id(sourceId)}/import`, { method: 'POST' }),
  /** Writes and reviews versions for a few sets: those without an unseen version, or more for one section. */
  generateVariants: (sourceId: string, options: { section?: Section; skip?: string[] } = {}) =>
    request<{ added: number; rejected: string[]; remaining: number; failedSetIds: string[] }>(`/api/mock/sources/${id(sourceId)}/variants`, json('POST', options)),
  createTest: (sourceId: string, timing: MockTest['timing'], minutes: Partial<Record<Section, number>>) =>
    request<{ id: string; repeated: number }>(`/api/mock/sources/${id(sourceId)}/tests`, json('POST', { timing, minutes })),
  getTest: async (testId: string) => (await request<{ test: MockTest }>(`/api/mock/tests/${id(testId)}`)).test,

  listAttempts: async (filter: { sourceId?: string; testId?: string } = {}) =>
    (await request<{ attempts: AttemptSummary[] }>(`/api/mock/attempts?${new URLSearchParams(filter as Record<string, string>)}`)).attempts,
  findAttemptForTest: async (testId: string) => {
    const [summary] = await mockApi.listAttempts({ testId });
    return summary ? mockApi.getAttempt(summary.id) : null;
  },
  startAttempt: async (testId: string) => (await request<{ attempt: MockAttempt }>('/api/mock/attempts', json('POST', { testId }))).attempt,
  getAttempt: async (attemptId: string) => (await request<{ attempt: MockAttempt }>(`/api/mock/attempts/${id(attemptId)}`)).attempt,
  saveAttempt: (attemptId: string, patch: Partial<Pick<MockAttempt, 'responses' | 'remainingSeconds' | 'currentSection'>> & { submit?: boolean }) =>
    request<{ attempt: MockAttempt }>(`/api/mock/attempts/${id(attemptId)}`, json('PATCH', patch)),
  deleteAttempt: (attemptId: string) => request(`/api/mock/attempts/${id(attemptId)}`, { method: 'DELETE' }),

  storageUsage: () => request<StorageUsage>('/api/storage'),
  clearStorage: (what: 'attempts' | 'unstartedTests') => request<{ deleted: number }>(`/api/storage?what=${what}`, { method: 'DELETE' }),
};

export const formatBytes = (bytes: number) =>
  bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(2)} MB`;
