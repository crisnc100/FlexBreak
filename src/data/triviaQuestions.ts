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

  // Additional Simple & Engaging Questions
  {
    id: 26,
    question: "Stretching for just 5 minutes can boost your energy.",
    answer: true,
    explanation: "Short stretching sessions increase blood flow and can make you feel more alert.",
    category: 'stretching'
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
  },

  // More Simple & Fun Questions
  {
    id: 31,
    question: "Yawning can be a sign you need to stretch.",
    answer: true,
    explanation: "Yawning often indicates fatigue or tension that stretching can help relieve.",
    category: 'wellness'
  },
  {
    id: 32,
    question: "Smiling uses fewer muscles than frowning.",
    answer: true,
    explanation: "Smiling uses about 10 muscles while frowning uses around 40 muscles.",
    category: 'wellness'
  },
  {
    id: 33,
    question: "Your brain works better when you change positions regularly.",
    answer: true,
    explanation: "Movement increases blood flow to the brain and improves cognitive function.",
    category: 'productivity'
  },
  {
    id: 34,
    question: "Sitting burns the same calories as standing.",
    answer: false,
    explanation: "Standing burns about 50% more calories than sitting due to muscle engagement.",
    category: 'wellness'
  },
  {
    id: 35,
    question: "Your spine has a natural S-curve shape.",
    answer: true,
    explanation: "The spine's S-curve helps distribute weight and absorb shock when moving.",
    category: 'posture'
  },
  // New Wellness Questions
{
  id: 36,
  question: "A 'microbreak' of 30 seconds can help reduce physical tension.",
  answer: true,
  explanation: "Brief microbreaks can reset posture and reduce muscle fatigue during long work sessions.",
  category: 'wellness'
},
{
  id: 37,
  question: "Exercise only benefits physical health, not mental health.",
  answer: false,
  explanation: "Exercise releases endorphins and improves cognitive function, benefiting mental health too.",
  category: 'wellness'
},
{
  id: 38,
  question: "Plants in your workspace can improve air quality and reduce stress.",
  answer: true,
  explanation: "Plants filter air toxins and exposure to nature elements reduces psychological stress.",
  category: 'wellness'
},
{
  id: 39,
  question: "Eye strain from screens cannot be reduced by taking breaks.",
  answer: false,
  explanation: "The 20-20-20 rule (looking 20 feet away for 20 seconds every 20 minutes) reduces eye strain.",
  category: 'wellness'
},
{
  id: 40,
  question: "Chronic stress can impact your immune system.",
  answer: true,
  explanation: "Prolonged stress suppresses immune function and increases susceptibility to illness.",
  category: 'wellness'
},

// New Stretching Questions
{
  id: 41,
  question: "Wrist stretches can help prevent carpal tunnel syndrome.",
  answer: true,
  explanation: "Regular wrist stretches reduce tension in the median nerve passage through the carpal tunnel.",
  category: 'stretching'
},
{
  id: 42,
  question: "Stretching only benefits flexibility, not strength.",
  answer: false,
  explanation: "Stretching improves range of motion, which can enhance strength through improved muscle function.",
  category: 'stretching'
},
{
  id: 43,
  question: "You should stretch both sides of your body equally.",
  answer: true,
  explanation: "Balanced stretching prevents muscle imbalances that can lead to pain and poor posture.",
  category: 'stretching'
},
{
  id: 44,
  question: "Breathing should be held during difficult stretches.",
  answer: false,
  explanation: "Deep, regular breathing helps muscles relax during stretches. Never hold your breath.",
  category: 'stretching'
},
{
  id: 45,
  question: "Stretching can improve circulation throughout the body.",
  answer: true,
  explanation: "Stretching increases blood flow to muscles, improving nutrient delivery and waste removal.",
  category: 'stretching'
},

// New Productivity Questions
{
  id: 46,
  question: "Working in 90-minute cycles aligns with the body's natural ultradian rhythm.",
  answer: true,
  explanation: "The body's natural energy cycles occur in roughly 90-minute intervals.",
  category: 'productivity'
},
{
  id: 47,
  question: "Natural light has no impact on workplace productivity.",
  answer: false,
  explanation: "Natural light improves mood, energy levels, and can increase productivity by up to 15%.",
  category: 'productivity'
},
{
  id: 48,
  question: "Decision fatigue occurs when you make too many decisions in one day.",
  answer: true,
  explanation: "Mental energy depletes with each decision, reducing decision quality over time.",
  category: 'productivity'
},
{
  id: 49,
  question: "Background noise always reduces concentration and productivity.",
  answer: false,
  explanation: "Moderate ambient noise (like coffee shop sounds) can boost creativity for some people.",
  category: 'productivity'
},
{
  id: 50,
  question: "Time-blocking is more effective than multitasking.",
  answer: true,
  explanation: "Dedicating specific time blocks to single tasks reduces context switching and increases focus.",
  category: 'productivity'
},

// New Posture Questions
{
  id: 51,
  question: "You should always sit with a 90-degree angle at your hips.",
  answer: false,
  explanation: "A slightly reclined position (100-110 degrees) reduces spinal pressure more effectively.",
  category: 'posture'
},
{
  id: 52,
  question: "Text neck is a condition caused by looking down at devices too much.",
  answer: true,
  explanation: "The forward head posture from device use can strain neck muscles and cause pain.",
  category: 'posture'
},
{
  id: 53,
  question: "Walking with good posture requires engaging your core muscles.",
  answer: true,
  explanation: "Core engagement stabilizes the spine and promotes proper alignment during walking.",
  category: 'posture'
},
{
  id: 54,
  question: "Sleeping position doesn't affect your daytime posture.",
  answer: false,
  explanation: "Poor sleeping positions can reinforce muscle imbalances that affect standing posture.",
  category: 'posture'
},
{
  id: 55,
  question: "Moving your keyboard closer to you can improve typing posture.",
  answer: true,
  explanation: "A keyboard positioned 8-10 inches from the edge of your desk reduces reaching and wrist strain.",
  category: 'posture'
},

// Additional Mixed Questions
{
  id: 56,
  question: "Drinking caffeine 6 hours before bedtime won't affect sleep quality.",
  answer: false,
  explanation: "Caffeine has a half-life of 5-6 hours and can disrupt sleep even when consumed hours before bed.",
  category: 'wellness'
},
{
  id: 57,
  question: "Foam rolling is a form of self-myofascial release that helps tight muscles.",
  answer: true,
  explanation: "Foam rolling helps release tension in the fascia surrounding muscles, improving mobility.",
  category: 'stretching'
},
{
  id: 58,
  question: "The 'two-minute rule' suggests immediately doing tasks that take less than two minutes.",
  answer: true,
  explanation: "Completing quick tasks immediately is often more efficient than scheduling them for later.",
  category: 'productivity'
},
{
  id: 59,
  question: "Standing on one leg can help improve balance and core strength.",
  answer: true,
  explanation: "Single-leg standing challenges stabilizing muscles and proprioception, improving balance.",
  category: 'wellness'
},
{
  id: 60,
  question: "Staying hydrated can help reduce joint pain during the workday.",
  answer: true,
  explanation: "Water helps maintain synovial fluid that lubricates joints and reduces friction.",
  category: 'wellness'
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