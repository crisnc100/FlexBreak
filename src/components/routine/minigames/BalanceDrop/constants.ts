import { Dimensions } from 'react-native';
import { ItemData, Round } from './types';

const { width, height } = Dimensions.get('window');

export const ITEM_BASE_SIZE = 70;
export const SCALE_WIDTH = width * 0.85;
export const SCALE_HEIGHT = 60; // Increased height for better visibility
export const MAX_TILT = 25;
export const MAX_HOURS = 24; // 24 hours in a day
export const DROP_ZONE_PADDING = 80; // Even larger hit area for drops

// Color scheme for categories
export const CATEGORY_COLORS = {
  work: '#FF6B6B',
  family: '#4ECDC4',
  wellness: '#4CAF50',
  hobbies: '#FFB347',
  goals: '#9B59B6',
  social: '#3498DB',
};

// Work-related items (consume time from your day)
export const WORK_ITEMS: ItemData[] = [
  { icon: 'laptop-outline', label: 'Big Project', weight: 3, timeCost: 3, category: 'work' },
  { icon: 'time-outline', label: 'Urgent Deadline', weight: 3, timeCost: 4, category: 'work' },
  { icon: 'document-text-outline', label: 'Reports', weight: 2, timeCost: 2, category: 'work' },
  { icon: 'briefcase-outline', label: 'Overtime', weight: 3, timeCost: 4, category: 'work' },
  { icon: 'people-outline', label: 'Meeting', weight: 2, timeCost: 1, category: 'work' },
  { icon: 'mail-outline', label: 'Emails', weight: 1, timeCost: 0.5, category: 'work' },
  { icon: 'call-outline', label: 'Work Calls', weight: 1, timeCost: 0.5, category: 'work' },
  { icon: 'analytics-outline', label: 'Data Analysis', weight: 2, timeCost: 2, category: 'work' },
  { icon: 'calendar-outline', label: 'Planning', weight: 2, timeCost: 1, category: 'work' },
  { icon: 'create-outline', label: 'Presentations', weight: 2, timeCost: 2, category: 'work' },
  { icon: 'sync-outline', label: 'Status Update', weight: 1, timeCost: 0.5, category: 'work' },
  { icon: 'alarm-outline', label: 'Early Morning', weight: 3, timeCost: 2, category: 'work' },
  { icon: 'desktop-outline', label: 'Tech Issues', weight: 2, timeCost: 1, category: 'work' },
  { icon: 'clipboard-outline', label: 'Admin Tasks', weight: 1, timeCost: 0.5, category: 'work' },
];

// Life-related items (also consume time but fulfill personal needs)
export const LIFE_ITEMS: ItemData[] = [
  // Family
  { icon: 'home-outline', label: 'Family Time', weight: 3, timeCost: 3, category: 'family' },
  { icon: 'heart-outline', label: 'Date Night', weight: 2, timeCost: 3, category: 'family' },
  { icon: 'people-circle-outline', label: 'Kids Activities', weight: 2, timeCost: 2, category: 'family' },
  { icon: 'pizza-outline', label: 'Family Dinner', weight: 2, timeCost: 2, category: 'family' },
  { icon: 'car-outline', label: 'Weekend Trip', weight: 3, timeCost: 6, category: 'family' },
  
  // Wellness
  { icon: 'fitness-outline', label: 'Exercise', weight: 3, timeCost: 1, category: 'wellness' },
  { icon: 'moon-outline', label: 'Good Sleep', weight: 3, timeCost: 6, category: 'wellness' },
  { icon: 'restaurant-outline', label: 'Healthy Meal', weight: 2, timeCost: 0.5, category: 'wellness' },
  { icon: 'leaf-outline', label: 'Meditation', weight: 2, timeCost: 0.5, category: 'wellness' },
  { icon: 'water-outline', label: 'Hydration', weight: 1, timeCost: 0.25, category: 'wellness' },
  { icon: 'bicycle-outline', label: 'Bike Ride', weight: 2, timeCost: 1, category: 'wellness' },
  { icon: 'sunny-outline', label: 'Nature Walk', weight: 2, timeCost: 0.5, category: 'wellness' },
  
  // Hobbies
  { icon: 'game-controller-outline', label: 'Gaming', weight: 2, timeCost: 3, category: 'hobbies' },
  { icon: 'book-outline', label: 'Reading', weight: 2, timeCost: 2, category: 'hobbies' },
  { icon: 'brush-outline', label: 'Creative Time', weight: 3, timeCost: 3, category: 'hobbies' },
  { icon: 'musical-notes-outline', label: 'Music', weight: 1, timeCost: 1, category: 'hobbies' },
  { icon: 'camera-outline', label: 'Photography', weight: 2, timeCost: 2, category: 'hobbies' },
  { icon: 'color-palette-outline', label: 'Art Project', weight: 3, timeCost: 4, category: 'hobbies' },
  
  // Goals
  { icon: 'school-outline', label: 'Learning', weight: 2, timeCost: 2, category: 'goals' },
  { icon: 'rocket-outline', label: 'Side Project', weight: 3, timeCost: 3, category: 'goals' },
  { icon: 'trophy-outline', label: 'Personal Goal', weight: 2, timeCost: 2, category: 'goals' },
  { icon: 'barbell-outline', label: 'Fitness Goal', weight: 2, timeCost: 2, category: 'goals' },
  
  // Social
  { icon: 'beer-outline', label: 'Friends', weight: 2, timeCost: 3, category: 'social' },
  { icon: 'chatbubbles-outline', label: 'Social Time', weight: 1, timeCost: 2, category: 'social' },
  { icon: 'gift-outline', label: 'Volunteering', weight: 2, timeCost: 3, category: 'social' },
  { icon: 'cafe-outline', label: 'Coffee Chat', weight: 1, timeCost: 1, category: 'social' },
  { icon: 'happy-outline', label: 'Party', weight: 3, timeCost: 5, category: 'social' },
];

// Heavy items - appear in later rounds
export const HEAVY_WORK_ITEMS: ItemData[] = [
  { icon: 'briefcase-outline', label: 'Major Project', weight: 4, timeCost: 5, category: 'work' },
  { icon: 'rocket-outline', label: 'Product Launch', weight: 5, timeCost: 6, category: 'work' },
  { icon: 'analytics-outline', label: 'Annual Review', weight: 4, timeCost: 4, category: 'work' },
];

export const HEAVY_LIFE_ITEMS: ItemData[] = [
  { icon: 'airplane-outline', label: 'Vacation', weight: 5, timeCost: 8, category: 'family' },
  { icon: 'home-outline', label: 'Home Renovation', weight: 4, timeCost: 6, category: 'family' },
  { icon: 'trophy-outline', label: 'Marathon Training', weight: 4, timeCost: 4, category: 'wellness' },
];

// Dual items - can go to either side with different costs
export const DUAL_ITEMS: ItemData[] = [
  { 
    icon: 'phone-portrait-outline', 
    label: 'Phone Time', 
    weight: 2, 
    timeCost: 2, 
    category: 'work',
    isDual: true,
    dualTimeCost: { work: 1, life: 3 } // More efficient at work
  },
  { 
    icon: 'laptop-outline', 
    label: 'Personal Project', 
    weight: 3, 
    timeCost: 3, 
    category: 'goals',
    isDual: true,
    dualTimeCost: { work: 4, life: 2 } // More efficient at home
  },
  { 
    icon: 'cafe-outline', 
    label: 'Coffee Break', 
    weight: 1, 
    timeCost: 1, 
    category: 'social',
    isDual: true,
    dualTimeCost: { work: 0.5, life: 1.5 } // Quick at work, longer at home
  },
];

// Critical items - severe penalty for wrong placement
export const CRITICAL_ITEMS: ItemData[] = [
  { 
    icon: 'medical-outline', 
    label: 'Doctor Visit', 
    weight: 3, 
    timeCost: 2, 
    category: 'wellness',
    isCritical: true 
  },
  { 
    icon: 'calendar-outline', 
    label: 'Important Meeting', 
    weight: 3, 
    timeCost: 2, 
    category: 'work',
    isCritical: true 
  },
  { 
    icon: 'heart-outline', 
    label: 'Anniversary', 
    weight: 3, 
    timeCost: 4, 
    category: 'family',
    isCritical: true 
  },
];

// Updated rounds - strategic difficulty progression
export const ROUNDS: Round[] = [
  { 
    number: 1, 
    duration: 30, 
    spawnRate: 1500, // Spawn every 1.5 seconds
    fallSpeed: 4000, // Moderate speed
    itemCount: 20, // 20 items in 30 seconds
    urgentItemChance: 0.15,
    startingBalanceRange: { min: -30, max: 30 }, // Moderate imbalance
    maxLetGo: 999, // Unlimited in round 1
  },
  { 
    number: 2, 
    duration: 30, 
    spawnRate: 1800, // Spawn every 1.8 seconds (reduced from 1.2)
    fallSpeed: 3800, // Slightly faster (reduced from 3500)
    itemCount: 25, // 25 items
    urgentItemChance: 0.25,
    startingBalanceRange: { min: -40, max: 40 }, // Higher imbalance
    maxLetGo: 5, // Limited let-go uses
    heavyItemChance: 0.2, // 20% chance of heavy items
  },
  { 
    number: 3, 
    duration: 30, 
    spawnRate: 1400, // Spawn every 1.4 seconds (reduced from 1.0)
    fallSpeed: 3500, // Same as level 2 (reduced from 3000)
    itemCount: 30, // 30 items
    urgentItemChance: 0.30, // Slightly reduced
    startingBalanceRange: { min: -50, max: 50 }, // Extreme imbalance
    maxLetGo: 3, // Very limited let-go uses
    heavyItemChance: 0.25, // More heavy items
    dualItemChance: 0.15, // 15% chance of dual items
    criticalItemChance: 0.1, // 10% chance of critical items
  },
];

// Tutorial round - gentler starting imbalance
export const TUTORIAL_ROUND: Round = {
  number: 0, 
  duration: 15, 
  spawnRate: 3500, 
  fallSpeed: 5000, 
  itemCount: 5, 
  urgentItemChance: 0,
  startingBalanceRange: { min: -20, max: 20 }, // Gentle imbalance for learning
  maxLetGo: 999, // Unlimited in tutorial
};

export const GAME_DIMENSIONS = { width, height };