export interface MotivationalMessage {
  title: string;
  body: string;
}

export const MOTIVATIONAL_MESSAGES: MotivationalMessage[] = [
  {
    title: "💼 Neck tension building?",
    body: "Roll your shoulders back 5 times. Your future self will thank you at 5pm!"
  },
  {
    title: "⏰ Been sitting 2+ hours?",
    body: "Stand up and march in place for 30 seconds. Boost circulation and energy instantly!"
  },
  {
    title: "🖥️ Screen fatigue setting in?",
    body: "Look away from screen, focus on something 20ft away for 20 seconds. Save your eyes!"
  },
  {
    title: "☕ Coffee break = stretch break",
    body: "While coffee brews, do 3 desk push-ups. Double your energy boost!"
  },
  {
    title: "📱 Text neck alert!",
    body: "Chin to chest, then look up at ceiling. Hold 5 seconds each. Prevent that forward head!"
  },
  {
    title: "🪑 Lower back aching?",
    body: "Stand up, hands on hips, lean back gently. 30 seconds prevents hours of pain!"
  },
  {
    title: "🎯 Zoom fatigue?",
    body: "Between calls: arm circles, neck rolls, deep breaths. Reset your focus!"
  },
  {
    title: "⌨️ Wrist strain warning",
    body: "Flex and extend wrists 10 times. Prevents carpal tunnel and typing pain!"
  },
  {
    title: "🧠 3pm slump hitting?",
    body: "5 jumping jacks or walk to water fountain. Better than another coffee!"
  },
  {
    title: "💪 Shoulder check time",
    body: "Squeeze shoulder blades together, hold 5 sec. Fixes that hunched posture!"
  },
  {
    title: "🚶 Meeting prep hack",
    body: "Walk around while reviewing notes. Movement = better ideas + less stiffness!"
  },
  {
    title: "😤 Stress levels rising?",
    body: "4-7-8 breathing: Inhale 4, hold 7, exhale 8. Instant calm + oxygen boost!"
  },
  {
    title: "🦵 Legs feeling heavy?",
    body: "Calf raises at your desk - 15 reps. Prevents blood pooling and energizes!"
  },
  {
    title: "👀 Eye strain check",
    body: "Close eyes, gently massage temples. 30 seconds saves hours of headaches!"
  },
  {
    title: "⚡ Energy running low?",
    body: "Wall push-ups - just 10! Gets blood flowing better than energy drinks!"
  },
  {
    title: "🎧 Headphone neck?",
    body: "Ear to shoulder stretches, each side 10 sec. Prevents tension headaches!"
  },
  {
    title: "📊 Excel eyes burning?",
    body: "Blink rapidly 20 times, then close for 20 sec. Natural eye lubrication!"
  },
  {
    title: "🏃 Feeling sluggish?",
    body: "High knees in place for 20 seconds. Instant energy without leaving your spot!"
  },
  {
    title: "🤯 Brain fog setting in?",
    body: "Touch opposite elbow to knee 10x each side. Cross-body movement wakes up brain!"
  },
  {
    title: "💻 Hunching forward?",
    body: "Doorway chest stretch 30 sec. Opens everything that typing closes!"
  },
  {
    title: "😴 Post-lunch drowsy?",
    body: "Ankle alphabet - write A-Z with each foot. Subtle desk exercise that energizes!"
  },
  {
    title: "🔥 Hip flexors tight?",
    body: "Stand, step back into lunge, hold 20 sec each. Undo that chair damage!"
  },
  {
    title: "📞 Phone neck pain?",
    body: "Chin tucks - 10 reps. Strengthens neck and improves posture!"
  },
  {
    title: "⏳ Quick refresh needed?",
    body: "Twist left and right in chair, 10 each way. Spine mobility in 30 seconds!"
  },
  {
    title: "🎯 Focus fading fast?",
    body: "Stand on one foot for 30 sec, switch. Balance work = brain activation!"
  },
  {
    title: "💡 Need creative boost?",
    body: "Walk to furthest bathroom or water fountain. Movement sparks new ideas!"
  },
  {
    title: "😰 Deadline tension?",
    body: "Shoulder shrugs - up to ears, hold 5 sec, release. Instant stress relief!"
  },
  {
    title: "🖱️ Mouse hand cramping?",
    body: "Make fists, then spread fingers wide 10x. Prevents repetitive strain!"
  },
  {
    title: "🌟 Morning stiffness?",
    body: "Cat-cow stretches standing. 5 reps loosens entire spine for the day!"
  },
  {
    title: "🔋 Afternoon recharge",
    body: "Power pose for 30 sec - hands on hips, chest out. Boosts confidence and energy!"
  }
];

export function getRandomMotivationalMessage(): MotivationalMessage {
  const randomIndex = Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length);
  return MOTIVATIONAL_MESSAGES[randomIndex];
}

export function getRandomMotivationalMessageExcluding(excludeIndex: number | null): { message: MotivationalMessage; index: number } {
  let randomIndex = Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length);
  
  if (excludeIndex !== null && randomIndex === excludeIndex) {
    randomIndex = (randomIndex + 1) % MOTIVATIONAL_MESSAGES.length;
  }
  
  return {
    message: MOTIVATIONAL_MESSAGES[randomIndex],
    index: randomIndex
  };
}