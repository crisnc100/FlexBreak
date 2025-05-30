import { BodyArea, IssueType, Position, SmartRoutineInput } from '../../types';

// Extracted and centralised parseUserInput so it can be reused across the smart-routine pipeline
export const parseUserInput = (input: string): SmartRoutineInput => {
  // === Keyword dictionaries ===

  // Body-area synonyms
  const areaKeywords: Record<string, BodyArea> = {
    // Neck
    'neck': 'Neck',
    'throat': 'Neck',
    'cervical': 'Neck',

    // Shoulders & Arms
    'shoulder': 'Shoulders & Arms',
    'deltoid': 'Shoulders & Arms',
    'arm': 'Shoulders & Arms',
    'elbow': 'Shoulders & Arms',
    'wrist': 'Shoulders & Arms',
    'hand': 'Shoulders & Arms',
    'finger': 'Shoulders & Arms',
    'bicep': 'Shoulders & Arms',
    'tricep': 'Shoulders & Arms',
    'forearm': 'Shoulders & Arms',

    // Upper Back & Chest
    'upper back': 'Upper Back & Chest',
    'thoracic': 'Upper Back & Chest',
    'chest': 'Upper Back & Chest',
    'pectoral': 'Upper Back & Chest',
    'pec': 'Upper Back & Chest',
    'trap': 'Upper Back & Chest',
    'traps': 'Upper Back & Chest',
    'trapezius': 'Upper Back & Chest',
    'posture': 'Upper Back & Chest',
    'slouch': 'Upper Back & Chest',

    // Lower Back
    'lower back': 'Lower Back',
    'lumbar': 'Lower Back',
    'spine': 'Lower Back',
    'back pain': 'Lower Back',
    'sciatic': 'Lower Back',
    'sciatica': 'Lower Back',

    // Hips & Legs
    'hip': 'Hips & Legs',
    'leg': 'Hips & Legs',
    'thigh': 'Hips & Legs',
    'quad': 'Hips & Legs',
    'quadricep': 'Hips & Legs',
    'hamstring': 'Hips & Legs',
    'calf': 'Hips & Legs',
    'calves': 'Hips & Legs',
    'knee': 'Hips & Legs',
    'ankle': 'Hips & Legs',
    'foot': 'Hips & Legs',
    'feet': 'Hips & Legs',
    'toe': 'Hips & Legs',
    'glute': 'Hips & Legs',
    'gluteal': 'Hips & Legs',
    'piriformis': 'Hips & Legs',
    'it band': 'Hips & Legs',
    'iliotibial': 'Hips & Legs',

    // Full Body (acts as a wildcard later on)
    'full': 'Full Body',
    'body': 'Full Body',
    'whole': 'Full Body',
    'entire': 'Full Body',
    'all over': 'Full Body',
    'everything': 'Full Body',
    'head to toe': 'Full Body',
  };

  // Issue synonyms
  const issueKeywords: Record<string, IssueType> = {
    /* Stiffness */
    'stiff': 'stiffness',
    'tight': 'stiffness',
    'tense': 'stiffness',
    'rigid': 'stiffness',
    'restricted': 'stiffness',
    'limited': 'stiffness',
    'stuck': 'stiffness',
    'lock': 'stiffness',
    'locked': 'stiffness',
    'knot': 'stiffness',
    'knotted': 'stiffness',
    'cramped': 'stiffness',

    /* Pain */
    'pain': 'pain',
    'ache': 'pain',
    'hurt': 'pain',
    'sore': 'pain',
    'tender': 'pain',
    'discomfort': 'pain',
    'irritation': 'pain',
    'sharp': 'pain',
    'shooting': 'pain',
    'throbbing': 'pain',
    'burning': 'pain',

    /* Tiredness */
    'tired': 'tiredness',
    'fatigue': 'tiredness',
    'exhaust': 'tiredness',
    'worn': 'tiredness',
    'drained': 'tiredness',
    'lethargic': 'tiredness',
    'sluggish': 'tiredness',
    'weary': 'tiredness',
    'weak': 'tiredness',
    'recover': 'tiredness',
    'recovery': 'tiredness',
    'rest': 'tiredness',

    /* Flexibility */
    'stretch': 'flexibility',
    'flexible': 'flexibility',
    'mobility': 'flexibility',
    'loosen': 'flexibility',
    'limber': 'flexibility',
    'supple': 'flexibility',
    'agile': 'flexibility',
    'range of motion': 'flexibility',
    'rom': 'flexibility',
  };

  // Activity keywords => canonical activity string
  const activityKeywords: Record<string, string> = {
    /* Running */
    'running': 'running',
    'run': 'running',
    'jogging': 'running',
    'jog': 'running',
    'sprint': 'running',

    /* Cycling */
    'cycling': 'cycling',
    'cycle': 'cycling',
    'biking': 'cycling',
    'bike': 'cycling',
    'spinning': 'cycling',

    /* Swimming */
    'swimming': 'swimming',
    'swim': 'swimming',
    'pool': 'swimming',

    /* Workouts */
    'workout': 'working out',
    'exercise': 'working out',
    'training': 'working out',
    'gym': 'working out',
    'cardio': 'working out',
    'weights': 'working out',
    'lifting': 'weight lifting',
    'lift': 'weight lifting',
    'strength': 'weight lifting',

    /* Misc sport / movement */
    'yoga': 'yoga',
    'pilates': 'pilates',
    'hiking': 'hiking',
    'hike': 'hiking',
    'walking': 'walking',
    'walk': 'walking',
    'tennis': 'tennis',
    'golf': 'golf',
    'basketball': 'basketball',
    'soccer': 'soccer',
    'football': 'football',
    'hockey': 'hockey',
    'baseball': 'baseball',
    'volleyball': 'volleyball',
    'climbing': 'climbing',
    'dance': 'dancing',
    'dancing': 'dancing',

    /* Desk / sedentary */
    'sitting': 'sitting',
    'computer': 'desk work',
    'desk': 'desk work',
    'typing': 'desk work',
    'coding': 'desk work',
    'gaming': 'gaming',
    'driving': 'driving',
    'commuting': 'commuting',
  };

  // Position keywords (preferred starting position)
  const positionKeywords: Record<string, Position> = {
    'stand': 'Standing',
    'standing': 'Standing',
    'upright': 'Standing',
    'sit': 'Sitting',
    'sitting': 'Sitting',
    'chair': 'Sitting',
    'seated': 'Sitting',
    'lie': 'Lying',
    'lying': 'Lying',
    'floor': 'Lying',
    'mat': 'Lying',
    'bed': 'Lying',
    'ground': 'Lying',
    'down': 'Lying',
  };

  // Contextual patterns that can override or clarify
  type Context = { area?: BodyArea; issue?: IssueType; activity?: string; position?: Position };
  const contextPatterns: Record<string, Context> = {
    'hunched over': { area: 'Upper Back & Chest', issue: 'stiffness' },
    'slumped': { area: 'Upper Back & Chest', issue: 'stiffness' },
    'rounded shoulders': { area: 'Upper Back & Chest', issue: 'stiffness' },
    'text neck': { area: 'Neck', issue: 'stiffness' },
    'tech neck': { area: 'Neck', issue: 'stiffness' },
    'poor posture': { area: 'Upper Back & Chest', issue: 'stiffness' },
    'desk job': { activity: 'desk work', position: 'Sitting' },
    'office work': { activity: 'desk work', position: 'Sitting' },
    'woke up': { issue: 'stiffness' },
    'morning': { issue: 'stiffness' },
    'before bed': { issue: 'tiredness', position: 'Lying' },
    'quick stretch': { issue: 'flexibility' },
    'cool down': { issue: 'tiredness' },
    'warm up': { issue: 'flexibility' },
    'at my desk': { position: 'Sitting' },
    'on the floor': { position: 'Lying' },
    'standing up': { position: 'Standing' },
    'standing desk': { position: 'Standing' },
  };

  const lowercaseInput = input.toLowerCase();

  // 1. Detect body areas
  const parsedArea: BodyArea[] = [];
  for (const [keyword, area] of Object.entries(areaKeywords)) {
    if (lowercaseInput.includes(keyword) && !parsedArea.includes(area)) {
      parsedArea.push(area);
    }
  }

  // 2. Detect primary issue
  let parsedIssue: IssueType | null = null;
  for (const [keyword, issue] of Object.entries(issueKeywords)) {
    if (lowercaseInput.includes(keyword)) {
      parsedIssue = issue;
      break;
    }
  }

  // 3. Detect activities
  let parsedActivity: string | null = null;
  for (const [keyword, activity] of Object.entries(activityKeywords)) {
    if (lowercaseInput.includes(keyword)) {
      parsedActivity = activity;
      break;
    }
  }

  // 4. Detect preferred position
  let parsedPosition: Position | null = null;
  for (const [keyword, pos] of Object.entries(positionKeywords)) {
    if (lowercaseInput.includes(keyword)) {
      parsedPosition = pos;
      break;
    }
  }

  // 5. Apply contextual overrides
  for (const [pattern, ctx] of Object.entries(contextPatterns)) {
    if (lowercaseInput.includes(pattern)) {
      if (ctx.area && !parsedArea.includes(ctx.area)) parsedArea.push(ctx.area);
      if (ctx.issue && !parsedIssue) parsedIssue = ctx.issue;
      if (ctx.activity && !parsedActivity) parsedActivity = ctx.activity;
      if (ctx.position && !parsedPosition) parsedPosition = ctx.position;
    }
  }

  // 6. Fallbacks & heuristics
  if (parsedArea.length === 0) parsedArea.push('Full Body');

  if (!parsedIssue) {
    parsedIssue = parsedActivity ? 'flexibility' : 'stiffness';
  }

  if (!parsedPosition) {
    if (parsedActivity === 'desk work' || lowercaseInput.includes('desk') || lowercaseInput.includes('chair')) {
      parsedPosition = 'Sitting';
    } else if (
      parsedActivity === 'yoga' ||
      lowercaseInput.includes('floor') ||
      lowercaseInput.includes('mat') ||
      lowercaseInput.includes('lying')
    ) {
      parsedPosition = 'Lying';
    } else {
      parsedPosition = 'Standing';
    }
  }

  return {
    rawInput: input,
    parsedArea,
    parsedIssue,
    parsedActivity,
    parsedPosition,
  };
}; 