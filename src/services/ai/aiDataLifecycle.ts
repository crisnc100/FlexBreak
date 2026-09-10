export class AIDataDeletionError extends Error {}

/** UI boundaries may ignore cancellation, but real storage/network errors still propagate. */
export async function runAIUIWork(work: (generation: number) => Promise<void>): Promise<void> {
  const generation = getAIDataGeneration();
  try { await trackAIWork(() => work(generation)); }
  catch (error) { if (!(error instanceof AIDataDeletionError)) throw error; }
}

let generation = 0;
let deleting = false;
const active = new Set<Promise<unknown>>();
const listeners = new Set<() => void>();

export const getAIDataGeneration = () => generation;
export const isAIDataCurrent = (value: number) => !deleting && value === generation;

/** Called at invalidation time, before draining/removal, so visible old replies close immediately. */
export function onAIDataDeleted(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export async function trackAIWork<T>(work: () => Promise<T>): Promise<T> {
  if (deleting) throw new AIDataDeletionError('AI data deletion is in progress.');
  // Register before calling work: synchronous callbacks must not escape the drain.
  const pending = Promise.resolve().then(work);
  active.add(pending);
  try { return await pending; } finally { active.delete(pending); }
}

/** Drain existing writes and reject new work so old replies cannot restore data. */
export async function deleteAIDataExclusively(removeData: () => Promise<void>, beforeDrain?: () => Promise<void>): Promise<void> {
  if (deleting) throw new AIDataDeletionError('AI data deletion is already in progress.');
  deleting = true;
  generation++;
  try {
    for (const listener of listeners) {
      try { listener(); } catch (error) { console.warn('Could not clear an AI view:', error); }
    }
    if (beforeDrain) await beforeDrain();
    await Promise.allSettled([...active]);
    await removeData();
  } finally { deleting = false; }
}
