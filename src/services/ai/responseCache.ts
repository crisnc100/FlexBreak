import AsyncStorage from '@react-native-async-storage/async-storage';
import { categorizeInput } from './contextBuilder';

interface CachedResponse {
  response: string;
  category: string;
  timestamp: number;
  hitCount: number;
}

interface CacheEntry {
  key: string;
  patterns: string[];
  responses: {
    morning?: string;
    afternoon?: string;
    evening?: string;
    default: string;
  };
}

// Common queries and their cached responses
const CACHED_RESPONSES: CacheEntry[] = [
  {
    key: 'tired',
    patterns: ['tired', 'exhausted', 'sleepy', 'fatigue', 'no energy'],
    responses: {
      morning: "Morning fatigue is tough! Try the wake-up energizer: Stand up, do 10 arm circles backward, then 5 forward rolls. Follow with 5 deep breaths. 30 seconds total. This gets blood flowing! ☕",
      afternoon: "Afternoon slump hitting hard? Quick 2-minute reset: Stand and march in place for 30 seconds, then do 5 desk push-ups. End with looking out a window for 30 seconds. You'll feel refreshed! 💪",
      evening: "Long day wearing you down? Time for gentle recovery: Do 5 slow neck rolls each direction, then interlace fingers and stretch arms overhead for 10 seconds. Just 1 minute to feel better! 🌙",
      default: "Feeling drained? Try this 2-minute energy boost: Stand up, roll shoulders back 10 times, do 5 gentle twists each side, then take 3 deep belly breaths. Small movement, big difference! ⚡"
    }
  },
  {
    key: 'back_pain',
    patterns: ['back hurts', 'back pain', 'lower back', 'upper back', 'back ache', 'back sore'],
    responses: {
      morning: "Morning back stiffness? Start gentle: Cat-cow stretches for 30 seconds - on all fours, arch and round your back slowly. Follow with standing back extensions. Ease into your day! 🌅",
      afternoon: "Sitting too long? Quick back relief: Stand, hands on lower back, gently arch backward 3 times. Then seated spinal twists - 5 each side, holding 5 seconds. 2 minutes to feel better! 🪑",
      evening: "Back aching after the day? Time for relief: Lie on back, hug knees to chest for 20 seconds. Then gentle knee rocks side to side. If pain persists, consider seeing a healthcare provider. 🩺",
      default: "Back discomfort needs attention! Try this 90-second relief: Stand, hands on hips, gentle side bends 5x each way. Then forward fold with bent knees. For persistent pain, consult a professional. 💚"
    }
  },
  {
    key: 'stressed',
    patterns: ['stressed', 'anxious', 'overwhelmed', 'pressure', 'stress', 'anxiety'],
    responses: {
      morning: "Starting the day stressed? Let's reset: Box breathing technique - breathe in 4 counts, hold 4, out 4, hold 4. Repeat 4 times. Just 1 minute to find your calm center. You've got this! 🌟",
      afternoon: "Work stress building up? Quick relief: Step away for 2 minutes. Do 5 shoulder shrugs, then progressive muscle relaxation - tense and release arms, shoulders, face. Instant tension release! 🎯",
      evening: "Evening stress lingering? Wind-down routine: 5 gentle neck stretches each side, then close eyes and count 10 slow breaths. Let today's tension melt away. Tomorrow is a fresh start! 🌛",
      default: "Feeling overwhelmed? 90-second stress buster: Stand up, shake out your hands and arms for 10 seconds. Then 5 deep belly breaths with extended exhales. You're stronger than you know! 💪"
    }
  },
  {
    key: 'neck_pain',
    patterns: ['neck hurts', 'neck pain', 'stiff neck', 'neck ache', 'shoulders tight'],
    responses: {
      morning: "Morning neck stiffness? Gentle wake-up: Slowly look left, hold 10 seconds, then right. Ear to shoulder stretches next - 10 seconds each side. Move slowly and breathe. Ready for the day! 🌤️",
      afternoon: "Screen time causing neck strain? 2-minute fix: Chin tucks - pull chin back 10 times. Then gentle head rolls in figure-8 pattern. Look away from screen every 20 minutes too! 💻",
      evening: "Neck tension from the day? Release time: Gentle neck stretches holding 15 seconds each direction. Apply warm compress if available. Persistent pain? Consider professional help. 🤲",
      default: "Neck needs attention! 90-second relief: Shoulder rolls backward 10x, then gentle neck rotations 5x each way. Finish with shoulder blade squeezes. Keep that neck happy and mobile! 😊"
    }
  },
  {
    key: 'focus',
    patterns: ['cant focus', 'distracted', 'concentration', 'focus issues', 'mind wandering'],
    responses: {
      morning: "Morning focus fuzzy? Brain activation time: 20 jumping jacks, then balance on one foot for 10 seconds each. End with 3 energizing breaths. 90 seconds to mental clarity! 🧠",
      afternoon: "Afternoon brain fog? Focus reset: 20-20-20 rule - look at something 20 feet away for 20 seconds. Then do 20 desk shoulder shrugs. Your concentration will thank you! 👀",
      evening: "Evening focus fading? That's normal! Try: 5 deep breaths with counts of 4-7-8 (in-hold-out). Then gentle temple massage for 30 seconds. Let your mind start to unwind. 🌆",
      default: "Need to refocus? 2-minute clarity break: Stand and do 10 cross-body arm swings. Then wall push-ups x10. Finish with palming eyes for 20 seconds. Mental reset complete! ✨"
    }
  }
];

const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
const MAX_CACHE_ENTRIES = 100;

export class ResponseCacheService {
  private memoryCache: Map<string, CachedResponse> = new Map();
  
  async getCachedResponse(userInput: string, timeOfDay: string): Promise<string | null> {
    const normalizedInput = userInput.toLowerCase().trim();
    
    // Check memory cache first
    const cacheKey = `${normalizedInput}_${timeOfDay}`;
    const cached = this.memoryCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_EXPIRY) {
      // Update hit count
      cached.hitCount++;
      this.memoryCache.set(cacheKey, cached);
      console.log(`Cache hit for: "${normalizedInput}" (${timeOfDay})`);
      return cached.response;
    }
    
    // Check if input matches any cached patterns
    for (const entry of CACHED_RESPONSES) {
      const matches = entry.patterns.some(pattern => 
        normalizedInput.includes(pattern) || 
        this.fuzzyMatch(normalizedInput, pattern)
      );
      
      if (matches) {
        // Get time-appropriate response
        const response = entry.responses[timeOfDay as keyof typeof entry.responses] || entry.responses.default;
        
        // Cache it
        const cacheData: CachedResponse = {
          response,
          category: entry.key,
          timestamp: Date.now(),
          hitCount: 1
        };
        
        this.memoryCache.set(cacheKey, cacheData);
        
        // Limit cache size
        if (this.memoryCache.size > MAX_CACHE_ENTRIES) {
          const firstKey = this.memoryCache.keys().next().value;
          this.memoryCache.delete(firstKey);
        }
        
        console.log(`Cached response used for: "${normalizedInput}" (${timeOfDay})`);
        return response;
      }
    }
    
    return null;
  }
  
  private fuzzyMatch(input: string, pattern: string): boolean {
    // Simple fuzzy matching - all words in pattern must be in input
    const patternWords = pattern.split(' ');
    return patternWords.every(word => input.includes(word));
  }
  
  async getCacheStats(): Promise<{
    hitRate: number;
    totalHits: number;
    cacheSize: number;
    mostUsed: string[];
  }> {
    let totalHits = 0;
    const entries = Array.from(this.memoryCache.entries());
    
    entries.forEach(([_, data]) => {
      totalHits += data.hitCount;
    });
    
    const sortedByHits = entries
      .sort((a, b) => b[1].hitCount - a[1].hitCount)
      .slice(0, 5)
      .map(([key, _]) => key);
    
    return {
      hitRate: this.memoryCache.size > 0 ? totalHits / this.memoryCache.size : 0,
      totalHits,
      cacheSize: this.memoryCache.size,
      mostUsed: sortedByHits
    };
  }
  
  clearCache(): void {
    this.memoryCache.clear();
    console.log('Response cache cleared');
  }
}

export default new ResponseCacheService();