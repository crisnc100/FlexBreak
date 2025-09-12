export type RoutineDomain = 'stretch' | 'workout' | 'ambiguous';
export type OutputMode = 'cta' | 'text' | 'clarify';

// English
const STRETCH_KEYWORDS_EN = [
  'stretch', 'stretches', 'stretching', 'mobility', 'loosen', 'loose', 'tight', 'tightness', 'release', 'relief', 'decompress'
];

const WORKOUT_KEYWORDS_EN = [
  'workout', 'strength', 'hiit', 'cardio', 'program', 'exercise plan', 'training', 'abs', 'core', 'glutes', 'quads', 'hamstrings',
  'pushup', 'push-ups', 'situp', 'sit-ups', 'pullup', 'pull-ups', 'bench', 'press', 'deadlift', 'squat', 'sets', 'reps'
];

const BODY_AREAS_EN = [
  'neck', 'lower back', 'upper back', 'back', 'chest', 'shoulders', 'arms', 'shoulders & arms', 'hips', 'legs', 'hips & legs', 'full body'
];

// Spanish
const STRETCH_KEYWORDS_ES = ['estirar', 'estiramiento', 'estiramientos', 'movilidad', 'soltar', 'tenso', 'tensión', 'alivio'];
const WORKOUT_KEYWORDS_ES = ['entrenamiento', 'fuerza', 'hiit', 'cardio', 'programa', 'plan', 'ejercicio', 'abs', 'core', 'glúteos', 'cuádriceps', 'isquiotibiales', 'flexiones', 'sentadillas', 'series', 'repeticiones'];
const BODY_AREAS_ES = ['cuello', 'espalda baja', 'espalda alta', 'espalda', 'pecho', 'hombros', 'brazos', 'caderas', 'piernas', 'cuerpo completo'];

// Chinese (Simplified)
const STRETCH_KEYWORDS_ZH = ['拉伸', '伸展', '放松', '松解', '舒缓', '灵活性'];
const WORKOUT_KEYWORDS_ZH = ['锻炼', '训练', '力量', '有氧', '计划', '动作', '核心', '腹肌', '胸', '肩', '臀', '深蹲', '俯卧撑', '组', '次数'];
const BODY_AREAS_ZH = ['颈', '颈部', '下背', '腰', '上背', '背', '胸', '肩', '手臂', '髋', '髋部', '腿', '全身'];

const STRETCH_KEYWORDS = [...STRETCH_KEYWORDS_EN, ...STRETCH_KEYWORDS_ES, ...STRETCH_KEYWORDS_ZH];
const WORKOUT_KEYWORDS = [...WORKOUT_KEYWORDS_EN, ...WORKOUT_KEYWORDS_ES, ...WORKOUT_KEYWORDS_ZH];
const BODY_AREAS = [...BODY_AREAS_EN, ...BODY_AREAS_ES, ...BODY_AREAS_ZH];

function includesAny(text: string, list: string[]): boolean {
  return list.some(k => text.includes(k));
}

const ROUTINE_WORDS = [
  // English
  'routine', 'plan', 'program', 'exercise plan',
  // Spanish
  'rutina', 'plan', 'programa',
  // Chinese
  '计划', '方案', '例行'
];

export function inferRoutineDomain(userInput: string): RoutineDomain {
  const t = userInput.toLowerCase();

  const hasStretch = includesAny(t, STRETCH_KEYWORDS);
  const hasWorkout = includesAny(t, WORKOUT_KEYWORDS);
  const hasArea = includesAny(t, BODY_AREAS);
  const hasRoutineWord = includesAny(t, ROUTINE_WORDS);

  // Clear stretch intent takes precedence (any language)
  if (hasStretch) return 'stretch';

  // Explicit workout intent
  if (hasWorkout) return 'workout';

  // If user mentions a body area and a routine-ish word, default to stretch (our grounded CTA)
  if (hasArea && hasRoutineWord) return 'stretch';

  // If user mentions a body area without explicit workout intent, prefer stretch
  if (hasArea && !hasWorkout) return 'stretch';

  // Generic routine/plan/program with no area and no stretch intent → treat as workout text
  if (hasRoutineWord && !hasArea) return 'workout';

  // Default: ambiguous
  return 'ambiguous';
}

export function decideOutputMode(domain: RoutineDomain): OutputMode {
  if (domain === 'stretch') return 'cta';
  if (domain === 'workout') return 'text';
  return 'clarify';
}
