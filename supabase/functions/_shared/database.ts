import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, initializeFirestore } from "firebase-admin/firestore";
import { PROJECT } from "./auth.ts";
import { env, HttpError } from "./http.ts";
export type Row = Record<string, unknown>;
export interface Transaction {
  get(path: string): Promise<Row | undefined>;
  set(path: string, data: Row): void;
}
export interface Database {
  transaction<T>(work: (tx: Transaction) => Promise<T>): Promise<T>;
  get(path: string): Promise<Row | undefined>;
}
export function database(): Database {
  let app = getApps().find((item) => item.name === "flexbreak-backend");
  if (!app) {
    const raw = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON") ||
      atob(env("FIREBASE_SERVICE_ACCOUNT_BASE64"));
    let service;
    try {
      service = JSON.parse(raw);
    } catch {
      throw new HttpError(503, "INVALID_FIREBASE_CREDENTIAL");
    }
    if (
      service.project_id !== PROJECT || !service.private_key ||
      !service.client_email
    ) throw new HttpError(503, "INVALID_FIREBASE_CREDENTIAL");
    app = initializeApp(
      { credential: cert(service), projectId: PROJECT },
      "flexbreak-backend",
    );
    initializeFirestore(app, { preferRest: true });
  }
  const db = getFirestore(app);
  return {
    get: async (path) => (await db.doc(path).get()).data(),
    transaction: (work) =>
      db.runTransaction((tx) =>
        work({
          get: async (path) => (await tx.get(db.doc(path))).data(),
          set: (path, data) => {
            tx.set(db.doc(path), data);
          },
        })
      ),
  };
}
export async function hash(value: string): Promise<string> {
  return [
    ...new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
    ),
  ].map((n) => n.toString(16).padStart(2, "0")).join("");
}
