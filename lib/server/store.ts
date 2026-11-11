// Tiny document store with optimistic concurrency.
// Production: private Vercel Blob (needs BLOB_READ_WRITE_TOKEN or a connected Blob store).
// Local dev / tests: in-memory map, so `npm run dev` works without any credentials.
import { BlobError, BlobPreconditionFailedError, del, get, list, put } from '@vercel/blob';

export class ConflictError extends Error {}

type Entry = { pathname: string; uploadedAt: number };
type Store = {
  read<T>(path: string): Promise<{ data: T; etag: string } | null>;
  write(path: string, data: unknown, opts?: { etag?: string; create?: boolean; overwrite?: boolean }): Promise<void>;
  list(prefix: string): Promise<Entry[]>;
  remove(paths: string[]): Promise<void>;
};

const useBlob = Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID || process.env.VERCEL);

function blobStore(): Store {
  const isConflict = (e: unknown) => e instanceof BlobPreconditionFailedError ||
    (e instanceof BlobError && /already exists|precondition/i.test(e.message));
  return {
    async read<T>(path: string) {
      const result = await get(path, { access: 'private', useCache: false, headers: { 'Accept-Encoding': 'identity' } });
      if (!result || result.statusCode !== 200) return null;
      return { data: await new Response(result.stream).json() as T, etag: result.blob.etag };
    },
    async write(path, data, opts = {}) {
      try {
        await put(path, JSON.stringify(data), {
          access: 'private', addRandomSuffix: false, contentType: 'application/json',
          allowOverwrite: opts.create ? false : Boolean(opts.etag) || Boolean(opts.overwrite),
          ...(opts.etag ? { ifMatch: opts.etag } : {}),
        });
      } catch (e) {
        if (isConflict(e)) throw new ConflictError('conflict');
        throw e;
      }
    },
    async list(prefix) {
      const out: Entry[] = [];
      let cursor: string | undefined;
      do {
        const page = await list({ prefix, limit: 1000, cursor });
        for (const b of page.blobs) out.push({ pathname: b.pathname, uploadedAt: new Date(b.uploadedAt).getTime() });
        cursor = page.hasMore ? page.cursor : undefined;
      } while (cursor);
      return out;
    },
    async remove(paths) {
      if (!paths.length) return;
      for (let i = 0; i < paths.length; i += 500) await del(paths.slice(i, i + 500));
    },
  };
}

function memoryStore(): Store {
  const g = globalThis as unknown as { __spinStore?: Map<string, { body: string; etag: string; at: number }> };
  const map = g.__spinStore ??= new Map();
  let n = 0;
  return {
    async read<T>(path: string) {
      const v = map.get(path);
      return v ? { data: JSON.parse(v.body) as T, etag: v.etag } : null;
    },
    async write(path, data, opts = {}) {
      const current = map.get(path);
      if (opts.create && current) throw new ConflictError('exists');
      if (opts.etag && current?.etag !== opts.etag) throw new ConflictError('etag');
      if (!opts.etag && !opts.create && !opts.overwrite && current) throw new ConflictError('exists');
      map.set(path, { body: JSON.stringify(data), etag: `"${Date.now()}-${++n}"`, at: Date.now() });
    },
    async list(prefix) {
      return [...map.entries()].filter(([k]) => k.startsWith(prefix)).map(([pathname, v]) => ({ pathname, uploadedAt: v.at }));
    },
    async remove(paths) { for (const p of paths) map.delete(p); },
  };
}

export const store: Store = useBlob ? blobStore() : memoryStore();
export const storeKind = useBlob ? 'blob' : 'memory';
// Keep preview deployments' data apart from production.
export const root = process.env.VERCEL_ENV === 'preview' ? 'preview/' : '';
