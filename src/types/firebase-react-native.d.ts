import type { Persistence } from 'firebase/auth';

// Firebase 12 exports this on its React Native runtime entry, but its generic
// package "types" entry omits the platform export. Match the installed RN API.
declare module 'firebase/auth' {
  export function getReactNativePersistence(storage: {
    setItem(key: string, value: string): Promise<void>;
    getItem(key: string): Promise<string | null>;
    removeItem(key: string): Promise<void>;
  }): Persistence;
}
