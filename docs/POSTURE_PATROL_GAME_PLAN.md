# Posture Patrol - Mini Game Development Plan

## 🎮 Game Overview

**Name:** Postu 
**Duration:** 60-90 seconds  
**Type:** Educational Tower Defense  
**Target:** Office workers learning posture correction  

### Core Concept
Poor posture figures shuffle toward your desk. Tap them and select the correct stretch to transform bad posture into good posture before they reach your workspace.

---

## 🎯 Game Mechanics

### Basic Gameplay Loop
1. **Poor posture figures spawn** at top of screen
2. **Figures move slowly** toward desk at bottom
3. **Player taps figure** → **radial menu appears** at tap location
4. **Player selects correct stretch** from 4 options
5. **Correct choice** → figure transforms to good posture, disappears
6. **Wrong choice** → figure continues moving toward desk
7. **Figure reaches desk** → increases tension meter, lose health

### Win/Lose Conditions
- **Win:** Complete 3 waves without tension meter filling
- **Lose:** Tension meter fills completely
- **Score:** Points for correct stretch selections + speed bonus

---

## 👥 The 4 Posture Figures

### 1. "Tech Neck" 🦒
- **Problem:** Forward head posture, neck craned toward screen
- **Correct Stretch:** Chin tucks / Neck stretches
- **Visual:** Head jutting forward, curved neck

### 2. "Desk Hunch" 📱  
- **Problem:** Rounded shoulders, caved chest
- **Correct Stretch:** Doorway chest stretch / Shoulder blade squeezes
- **Visual:** Shoulders rolled forward, hunched upper back

### 3. "Slouch Slump" 📉
- **Problem:** Curved spine, poor sitting posture
- **Correct Stretch:** Back extensions / Spinal twists  
- **Visual:** C-curved spine, slumped forward

### 4. "Lean Twist" ↗️
- **Problem:** Sitting crooked/sideways, twisted spine
- **Correct Stretch:** Seated spinal twists / Core stretches
- **Visual:** Body leaning to one side, asymmetrical

---

## 🎨 User Interface Design

### Radial Menu System
- **Trigger:** Tap on posture figure
- **Location:** Appears centered on tap point
- **Options:** 4 stretch icons in circular arrangement
- **Feedback:** Haptic pulse on correct selection
- **Speed:** Quick selection for fast gameplay

### HUD Elements
- **Top:** Wave countdown timer (visible progress)
- **Bottom:** Tension meter (health bar)
- **Score:** Running point total
- **Wave indicator:** "Wave 2 of 3"

### Visual Feedback
- **Correct selection:** Figure glows, transforms to good posture
- **Wrong selection:** Figure flashes red, continues moving
- **Damage numbers:** +10 points pop up on success
- **Haptic feedback:** Light pulse on correct hits

---

## 📈 Difficulty Progression

### Wave 1 (0-30 seconds)
- **Figures:** Only "Tech Neck" 
- **Speed:** Slow movement
- **Spawn rate:** 1 figure every 3 seconds
- **Goal:** Learn basic mechanics

### Wave 2 (30-60 seconds)  
- **Figures:** "Tech Neck" + "Desk Hunch"
- **Speed:** Normal movement
- **Spawn rate:** 1 figure every 2.5 seconds
- **Challenge:** Multiple posture types

### Wave 3 (60-90 seconds)
- **Figures:** All 4 posture types
- **Speed:** Mixed (70% normal, 30% fast)
- **Spawn rate:** 1 figure every 2 seconds  
- **Challenge:** Speed variance + full complexity

---

## 🎓 Educational Integration

### Learning Objectives
1. **Pattern Recognition:** Identify common posture problems
2. **Solution Mapping:** Match stretches to specific issues
3. **Self-Awareness:** Recognize personal posture habits
4. **Practical Application:** Learn desk-appropriate stretches

### Educational Features
- **First-time tooltips:** "Forward head posture causes neck strain"
- **Optional explanations:** Tap to expand stretch details
- **Missed stretch tracking:** Analytics for personalized recommendations
- **Post-game tips:** "You missed neck stretches - try this exercise"

---

## 🔧 Technical Implementation

### Assets Required
- **4 bad posture sprites** (PNG format, consistent style)
- **4 good posture sprites** (transformation targets)
- **4 stretch icons** (for radial menu)
- **UI elements** (timer bar, tension meter, buttons)

### Core Components Needed

#### 1. GameManager Component
```typescript
interface GameState {
  wave: number;
  timeLeft: number;
  score: number;
  tensionLevel: number;
  gameActive: boolean;
  figures: PostureFigure[];
}
```

#### 2. PostureFigure Component
```typescript
interface PostureFigure {
  id: string;
  type: 'tech_neck' | 'desk_hunch' | 'slouch_slump' | 'lean_twist';
  position: {x: number, y: number};
  speed: number;
  isSelected: boolean;
}
```

#### 3. RadialMenu Component
```typescript
interface RadialMenuProps {
  visible: boolean;
  position: {x: number, y: number};
  onStretchSelect: (stretchType: string) => void;
  correctAnswer: string;
}
```

#### 4. Stretch Mapping System
```typescript
const STRETCH_MAPPING = {
  tech_neck: 'neck_stretch',
  desk_hunch: 'chest_stretch', 
  slouch_slump: 'back_extension',
  lean_twist: 'spinal_twist'
};
```

### Animation Requirements
- **Figure movement:** Linear translation down screen
- **Transformation:** Bad posture → good posture morph
- **Radial menu:** Fade in/out with scale animation
- **Feedback effects:** Particle effects, color flashes

---

## 📊 Analytics & Personalization

### Data Collection
- **Missed stretches:** Track which stretch types user struggles with
- **Response time:** How quickly user identifies postures
- **Accuracy rate:** Percentage of correct selections
- **Session completion:** Full game vs early exit

### Personalization Features
- **Adaptive difficulty:** Spawn more of user's weak areas
- **Custom recommendations:** "You often miss wrist stretches"
- **Progress tracking:** "Posture recognition improved 23%"
- **Targeted content:** Surface relevant stretches in main app

---

## ♿ Accessibility Considerations

### Visual Accessibility
- **Color + Shape coding:** Don't rely on color alone
- **High contrast:** Clear figure silhouettes
- **Size considerations:** Tap targets > 44px
- **Text readability:** Sufficient contrast ratios

### Motor Accessibility  
- **Generous tap areas:** Forgiving hit detection
- **Adjustable speed:** Option for slower gameplay
- **Alternative inputs:** Consider voice commands later

### Cognitive Accessibility
- **Clear visual hierarchy:** Important elements prominent
- **Consistent patterns:** Predictable interactions
- **Error recovery:** Undo/retry options
- **Progress indicators:** Clear feedback on status

---

## 🚀 Development Phases

### Phase 1: Core Mechanics (3-4 days)
- [ ] Basic figure spawning and movement
- [ ] Tap detection system
- [ ] Radial menu implementation
- [ ] Basic scoring and health system
- [ ] Simple UI (timer, health bar)

### Phase 2: Game Logic (2-3 days)  
- [ ] Wave progression system
- [ ] Difficulty scaling
- [ ] Win/lose conditions
- [ ] Educational tooltips
- [ ] Analytics hooks

### Phase 3: Polish & UX (2-3 days)
- [ ] Animations and visual effects
- [ ] Haptic feedback
- [ ] Sound design
- [ ] Accessibility improvements
- [ ] Performance optimization

### Phase 4: Integration (1-2 days)
- [ ] Connect to main app analytics
- [ ] Personalization features
- [ ] Testing and bug fixes
- [ ] Documentation

---

## 🎯 Success Metrics

### Engagement Metrics
- **Completion rate:** % of users who finish full session
- **Replay rate:** Users who play multiple times
- **Session duration:** Average time spent playing
- **Exit points:** Where users typically quit

### Educational Metrics  
- **Accuracy improvement:** Learning curve over time
- **Knowledge retention:** Correct answers on subsequent plays
- **Real-world application:** Integration with stretching routines
- **Awareness increase:** Self-reported posture consciousness

### Technical Metrics
- **Performance:** Frame rate, load times
- **Crash rate:** Stability metrics
- **Device compatibility:** Works across target devices
- **Battery impact:** Minimal resource usage

---

## 📝 Next Steps

### Immediate Tasks
1. **Review posture figure assets** in `/assets/images/`
2. **Set up base game structure** using existing mini-game patterns
3. **Implement basic spawning system**
4. **Create radial menu prototype**
5. **Test core gameplay loop**

### Future Enhancements
- **Boss battles:** Extra challenging "extreme posture" figures
- **Power-ups:** Temporary abilities like "slow time" or "auto-correct"
- **Achievements:** "Perfect posture," "Speed demon," "Consistency champion"
- **Leaderboards:** Daily/weekly posture patrol champions
- **Multiplayer:** Cooperative posture correction sessions

---

## 📂 File Structure

```
src/components/routine/minigames/PosturePatrol/
├── index.tsx                 # Main game component
├── components/
│   ├── GameManager.tsx       # Core game logic
│   ├── PostureFigure.tsx     # Individual figure component
│   ├── RadialMenu.tsx        # Stretch selection menu
│   ├── GameHUD.tsx           # UI elements (timer, score, etc.)
│   └── index.ts              # Component exports
├── hooks/
│   ├── useGameLogic.ts       # Game state management
│   ├── usePostureSpawning.ts # Figure generation logic
│   └── index.ts              # Hook exports
├── utils/
│   ├── stretchMapping.ts     # Posture → stretch relationships
│   ├── difficultyScaling.ts  # Wave progression logic
│   └── analytics.ts          # Data collection helpers
├── constants.ts              # Game configuration
├── styles.ts                 # Component styling
└── types.ts                  # TypeScript interfaces
```

---

*This document serves as the complete development roadmap for Posture Patrol. Update as implementation progresses and new requirements emerge.*