import { Stretch, TransitionPeriod } from '../../types';

/** Fisher-Yates shuffle */
export function shuffleArray<T>(array: T[]): T[] {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Remove consecutive duplicates, ensure minimum variety.
 */
export function ensureVariety(
  routine: (Stretch | TransitionPeriod)[],
  pool: Stretch[],
  minStretchCount: number = 3,
  transitionDuration = 0
): (Stretch | TransitionPeriod)[] {
  const result: (Stretch | TransitionPeriod)[] = [...routine];

  // De-duplicate consecutive IDs
  for (let i = 0; i < result.length - 1; i++) {
    const cur = result[i];
    const nxt = result[i + 1];
    if (
      !('isTransition' in cur) &&
      !('isTransition' in nxt) &&
      (cur as Stretch).id === (nxt as Stretch).id
    ) {
      const replacement = pool.find(
        s => s.id !== (cur as Stretch).id &&
             (i === 0 || ('isTransition' in result[i - 1]) || ((result[i - 1] as Stretch).id !== s.id))
      );
      if (replacement) result[i + 1] = replacement;
    }
  }

  // Guarantee minimum stretch count
  const stretches = result.filter(i => !('isTransition' in i)) as Stretch[];
  if (stretches.length < minStretchCount) {
    const needed = minStretchCount - stretches.length;
    const candidates = shuffleArray(pool.filter(s => !stretches.some(st => st.id === s.id)));
    for (let idx = 0; idx < needed && idx < candidates.length; idx++) {
      if (transitionDuration > 0 && result.length > 0) {
        result.push({
          id: `transition-extra-${result.length}`,
          name: 'Transition',
          description: 'Get ready for the next stretch',
          duration: transitionDuration,
          isTransition: true,
        } as TransitionPeriod);
      }
      result.push(candidates[idx]);
    }
  }

  return result;
}

/**
 * Pad routine to at least `targetSeconds` total duration.
 */
export function fillToTargetTime(
  routine: (Stretch | TransitionPeriod)[],
  pool: Stretch[],
  targetSeconds: number,
  transitionDuration = 0
): (Stretch | TransitionPeriod)[] {
  const result: (Stretch | TransitionPeriod)[] = [...routine];

  const durationOf = (items: (Stretch | TransitionPeriod)[]) =>
    items.reduce((sum, item) => {
      if ('isTransition' in item) return sum + item.duration;
      const s = item as Stretch;
      return sum + (s.bilateral ? s.duration * 2 : s.duration);
    }, 0);

  let current = durationOf(result);
  const shuffled = shuffleArray(pool);
  let idx = 0;

  while (current < targetSeconds && idx < shuffled.length) {
    const stretch = shuffled[idx++];
    const last = result[result.length - 1];
    if (last && !('isTransition' in last) && (last as Stretch).id === stretch.id) continue; // avoid immediate dup

    if (transitionDuration > 0 && result.length > 0) {
      result.push({
        id: `transition-pad-${result.length}`,
        name: 'Transition',
        description: 'Get ready for the next stretch',
        duration: transitionDuration,
        isTransition: true,
      } as TransitionPeriod);
      current += transitionDuration;
    }

    result.push(stretch);
    current += stretch.bilateral ? stretch.duration * 2 : stretch.duration;
  }

  // Remove trailing transition
  if (result.length && 'isTransition' in result[result.length - 1]) {
    current -= (result.pop() as TransitionPeriod).duration;
  }

  return result;
} 