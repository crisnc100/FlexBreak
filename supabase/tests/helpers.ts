import type {
  Database,
  Row,
  Transaction,
} from "../functions/_shared/database.ts";
import { HttpError } from "../functions/_shared/http.ts";
export function equal(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
    );
  }
}
export function ok(value: unknown) {
  if (!value) throw new Error("Expected truthy value");
}
export async function rejects(
  work: () => unknown | Promise<unknown>,
  code?: string,
) {
  try {
    await work();
  } catch (error) {
    if (code && (!(error instanceof HttpError) || error.code !== code)) {
      throw error;
    }
    return;
  }
  throw new Error(`Expected rejection ${code || ""}`);
}
// A serialized transactional adapter with copy-on-commit. Production uses the
// Firestore SDK transaction retry/commit protocol, never this in-memory map.
export class MemoryDatabase implements Database {
  rows = new Map<string, Row>();
  private tail: Promise<unknown> = Promise.resolve();
  get(path: string): Promise<Row | undefined> {
    return Promise.resolve(structuredClone(this.rows.get(path)));
  }
  transaction<T>(work: (tx: Transaction) => Promise<T>): Promise<T> {
    const promise = this.tail.then(async () => {
      const pending = new Map<string, Row>();
      const value = await work({
        get: (path) => this.get(path),
        set: (path, data) => {
          pending.set(path, structuredClone(data));
        },
      });
      for (const [path, data] of pending) this.rows.set(path, data);
      return value;
    });
    this.tail = promise.catch(() => {});
    return promise;
  }
}
