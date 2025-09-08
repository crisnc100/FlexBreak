export interface WeekendMessage {
  title: string;
  body: string;
}

export const WEEKEND_MESSAGES: WeekendMessage[] = [
  { title: "🌿 Weekend reset", body: "Take 2 minutes for deep breathing. Let your shoulders drop." },
  { title: "☀️ Gentle morning start", body: "Neck rolls + shoulder circles x5. Ease into the day." },
  { title: "🚶 Move a little", body: "Short walk, sunlight, water. Your body will thank you." },
  { title: "🧘 Stretch + breathe", body: "30s chest opener in a doorway. Slow exhales." },
  { title: "💧 Hydrate break", body: "Refill water and do 10 calf raises while you wait." },
  { title: "📵 Unplug moment", body: "20 seconds eyes off screens. Look far away, blink slowly." },
  { title: "🌳 Fresh air nudge", body: "Open a window or step outside for 1 minute of slow breaths." },
  { title: "😌 Low-back love", body: "Hands on hips, gentle backbend x3. Move carefully and slow." },
  { title: "🦶 Ankles awake", body: "Draw the ABCs with your feet. Mobility without the mat." },
  { title: "🕯️ Wind-down mini", body: "4-7-8 breathing: inhale 4, hold 7, exhale 8. Twice." },
  { title: "🎧 Music + stretch", body: "Play a favorite song and do a slow side bend each side." },
  { title: "🌙 Easy evening reset", body: "Seated hamstring stretch 20s each side. Light and gentle." },
];

export function getRandomWeekendMessageExcluding(excludeIndex: number | null): { message: WeekendMessage; index: number } {
  if (WEEKEND_MESSAGES.length === 0) {
    return { message: { title: "Take a mindful pause", body: "Two deep breaths, shoulders down, jaw unclench." }, index: 0 };
  }
  let randomIndex = Math.floor(Math.random() * WEEKEND_MESSAGES.length);
  if (excludeIndex !== null && excludeIndex >= 0 && randomIndex === excludeIndex) {
    randomIndex = (randomIndex + 1) % WEEKEND_MESSAGES.length;
  }
  return { message: WEEKEND_MESSAGES[randomIndex], index: randomIndex };
}

