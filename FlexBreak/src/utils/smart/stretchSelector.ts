import { Stretch, TransitionPeriod, SmartRoutineConfig } from '../../types';
import { ensureVariety, fillToTargetTime, shuffleArray } from './postProcessor';

/**
 * Select stretches based on config and available pool.
 */
export const selectStretches = (
  config: SmartRoutineConfig,
  availableStretches: Stretch[],
): (Stretch | TransitionPeriod)[] => {
  // Treat "Full Body" as wildcard
  const isFullBodyRequest = config.areas.includes('Full Body');

  let filtered = availableStretches.filter(stretch => {
    const areaMatch = isFullBodyRequest ? true : config.areas.some(a => stretch.tags.includes(a));
    return areaMatch && stretch.hasDemo === true;
  });

  if (filtered.length < 3) {
    filtered = availableStretches.filter(s => s.hasDemo === true);
  }

  // Position filter (unless "All")
  if (config.position !== 'All') {
    const positionFiltered = filtered.filter(s => s.position === config.position);
    if (positionFiltered.length) {
      filtered = positionFiltered;
    }
  }

  // Desk-friendly prioritisation
  if (config.isDeskFriendly) {
    const desk = filtered.filter(s => !s.bilateral);
    if (desk.length) filtered = desk;
  }

  // Prioritise stretches of requested position (stable sort)
  if (config.position !== 'All') {
    filtered.sort((a, b) => {
      if (a.position === config.position && b.position !== config.position) return -1;
      if (a.position !== config.position && b.position === config.position) return 1;
      return 0;
    });
  }

  // Shuffle to introduce randomness
  filtered = shuffleArray(filtered);

  // Build initial routine respecting min/max durations
  const selDuration = parseInt(config.duration);
  const range = selDuration === 5 ? [180, 300] : selDuration === 10 ? [360, 600] : selDuration === 15 ? [660, 900] : [selDuration*60*0.8, selDuration*60];
  const [minDuration, maxDuration] = range;

  const routine: (Stretch | TransitionPeriod)[] = [];
  let current = 0;

  for (const stretch of filtered) {
    if (current >= minDuration) break;

    if (config.transitionDuration && config.transitionDuration > 0 && routine.length) {
      routine.push({
        id: `transition-${routine.length}`,
        name: 'Transition',
        description: 'Get ready for the next stretch',
        duration: config.transitionDuration,
        isTransition: true,
      } as TransitionPeriod);
      current += config.transitionDuration;
    }

    routine.push(stretch);
    current += stretch.bilateral ? stretch.duration * 2 : stretch.duration;
  }

  // Post-processing
  const deDuped = ensureVariety(routine, filtered, 3, config.transitionDuration || 0);
  const targetSec = selDuration * 60 * 0.9; // 90%
  return fillToTargetTime(deDuped, filtered, targetSec, config.transitionDuration || 0);
}; 