/**
 * Wellness & Stretching Trivia Questions
 * True/False format for mini-game
 */

export interface TriviaQuestion {
  id: number;
  question: string;
  answer: boolean;
  explanation: string;
  category: 'stretching' | 'posture' | 'productivity' | 'wellness';
}

export const triviaQuestions: TriviaQuestion[] = [
  // Stretching Category
  {
    id: 1,
    question: "You should hold a stretch for at least 30 seconds to be effective.",
    answer: true,
    explanation: "Holding stretches for 30+ seconds allows muscles to relax and lengthen properly.",
    category: 'stretching'
  },
  {
    id: 2,
    question: "It's better to stretch before warming up your muscles.",
    answer: false,
    explanation: "Cold muscles are more prone to injury. Light movement or warm-up should come first.",
    category: 'stretching'
  },
  {
    id: 3,
    question: "Stretching can help reduce muscle tension and stress.",
    answer: true,
    explanation: "Stretching releases physical tension and can trigger relaxation responses in the body.",
    category: 'stretching'
  },
  {
    id: 4,
    question: "You should feel pain when stretching for it to be effective.",
    answer: false,
    explanation: "Stretching should feel like gentle tension, not pain. Pain can indicate injury risk.",
    category: 'stretching'
  },
  {
    id: 5,
    question: "Dynamic stretching is better for warm-ups than static stretching.",
    answer: true,
    explanation: "Dynamic stretching prepares muscles for activity, while static is better for cool-downs.",
    category: 'stretching'
  },

  // Posture Category
  {
    id: 6,
    question: "Your computer screen should be at eye level to maintain good posture.",
    answer: true,
    explanation: "Eye-level screens prevent neck strain and encourage proper spine alignment.",
    category: 'posture'
  },
  {
    id: 7,
    question: "Slouching occasionally won't affect your long-term health.",
    answer: false,
    explanation: "Consistent poor posture can lead to chronic pain and musculoskeletal issues.",
    category: 'posture'
  },
  {
    id: 8,
    question: "Your feet should be flat on the floor when sitting at a desk.",
    answer: true,
    explanation: "Flat feet provide stability and reduce strain on legs and lower back.",
    category: 'posture'
  },
  {
    id: 9,
    question: "It's fine to cross your legs while working at a desk all day.",
    answer: false,
    explanation: "Crossing legs can reduce circulation and create muscle imbalances.",
    category: 'posture'
  },
  {
    id: 10,
    question: "Your shoulders should be relaxed and pulled slightly back for good posture.",
    answer: true,
    explanation: "Relaxed, back shoulders open the chest and align the spine properly.",
    category: 'posture'
  },

  // Productivity Category
  {
    id: 11,
    question: "Taking regular breaks can actually increase productivity.",
    answer: true,
    explanation: "Short breaks prevent fatigue and help maintain focus and creativity throughout the day.",
    category: 'productivity'
  },
  {
    id: 12,
    question: "Working longer hours always leads to better results.",
    answer: false,
    explanation: "Extended work without breaks often decreases quality and efficiency due to fatigue.",
    category: 'productivity'
  },
  {
    id: 13,
    question: "Physical movement can boost brain function and creativity.",
    answer: true,
    explanation: "Exercise increases blood flow to the brain and stimulates neuroplasticity.",
    category: 'productivity'
  },
  {
    id: 14,
    question: "Multitasking is the most efficient way to work.",
    answer: false,
    explanation: "Studies show multitasking reduces efficiency and increases errors compared to focused work.",
    category: 'productivity'
  },
  {
    id: 15,
    question: "The Pomodoro Technique suggests 25-minute focused work sessions.",
    answer: true,
    explanation: "The Pomodoro Technique uses 25-minute work blocks followed by 5-minute breaks.",
    category: 'productivity'
  },

  // Wellness Category
  {
    id: 16,
    question: "Desk jobs increase the risk of cardiovascular disease.",
    answer: true,
    explanation: "Prolonged sitting is linked to increased risk of heart disease and other health issues.",
    category: 'wellness'
  },
  {
    id: 17,
    question: "Drinking water regularly has no impact on mental clarity.",
    answer: false,
    explanation: "Even mild dehydration can impair concentration, mood, and cognitive function.",
    category: 'wellness'
  },
  {
    id: 18,
    question: "Deep breathing exercises can help reduce workplace stress.",
    answer: true,
    explanation: "Deep breathing activates the parasympathetic nervous system, promoting relaxation.",
    category: 'wellness'
  },
  {
    id: 19,
    question: "Blue light from screens doesn't affect sleep quality.",
    answer: false,
    explanation: "Blue light can disrupt circadian rhythms and make it harder to fall asleep.",
    category: 'wellness'
  },
  {
    id: 20,
    question: "Regular movement breaks can improve mood and energy levels.",
    answer: true,
    explanation: "Physical activity releases endorphins and improves circulation, boosting mood and energy.",
    category: 'wellness'
  },

  // Additional Stretching Questions
  {
    id: 21,
    question: "Neck stretches should be done slowly and gently.",
    answer: true,
    explanation: "The neck is delicate and quick movements can cause strain or injury.",
    category: 'stretching'
  },
  {
    id: 22,
    question: "You only need to stretch if you exercise regularly.",
    answer: false,
    explanation: "Everyone benefits from stretching, especially those with sedentary jobs.",
    category: 'stretching'
  },
  {
    id: 23,
    question: "Hip flexor stretches are important for people who sit a lot.",
    answer: true,
    explanation: "Sitting tightens hip flexors, which can lead to lower back pain if not addressed.",
    category: 'stretching'
  },
  {
    id: 24,
    question: "Stretching before bed can improve sleep quality.",
    answer: true,
    explanation: "Gentle stretching relaxes the body and mind, preparing you for better sleep.",
    category: 'stretching'
  },
  {
    id: 25,
    question: "You should bounce while stretching to increase flexibility faster.",
    answer: false,
    explanation: "Bouncing (ballistic stretching) can cause muscle tears and injury.",
    category: 'stretching'
  },

  // Additional Posture Questions
  {
    id: 26,
    question: "Text neck is a real condition caused by looking down at phones.",
    answer: true,
    explanation: "Repeatedly looking down strains neck muscles and can cause chronic pain.",
    category: 'posture'
  },
  {
    id: 27,
    question: "Standing desks eliminate all posture problems.",
    answer: false,
    explanation: "Poor standing posture can also cause issues. Variety and proper form are key.",
    category: 'posture'
  },
  {
    id: 28,
    question: "Your wrists should be straight when typing on a keyboard.",
    answer: true,
    explanation: "Straight wrists prevent strain and reduce the risk of repetitive stress injuries.",
    category: 'posture'
  },
  {
    id: 29,
    question: "Carrying a heavy bag on one shoulder doesn't affect posture.",
    answer: false,
    explanation: "Uneven weight distribution can cause muscle imbalances and spinal misalignment.",
    category: 'posture'
  },
  {
    id: 30,
    question: "Core strength is important for maintaining good posture.",
    answer: true,
    explanation: "Strong core muscles support the spine and help maintain proper alignment.",
    category: 'posture'
  }
];

/**
 * Get random trivia questions for the mini-game
 */
export const getRandomTriviaQuestions = (count: number = 5): TriviaQuestion[] => {
  const shuffled = [...triviaQuestions].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

/**
 * Get questions by category
 */
export const getQuestionsByCategory = (category: TriviaQuestion['category']): TriviaQuestion[] => {
  return triviaQuestions.filter(q => q.category === category);
};

/**
 * Get a single random question
 */
export const getRandomQuestion = (): TriviaQuestion => {
  const randomIndex = Math.floor(Math.random() * triviaQuestions.length);
  return triviaQuestions[randomIndex];
};