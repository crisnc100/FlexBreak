import { Dimensions } from 'react-native';
import { ItemData, Round } from './types';

const { width, height } = Dimensions.get('window');

export const ITEM_BASE_SIZE = 70;
export const SCALE_WIDTH = width * 0.85;
export const SCALE_HEIGHT = 60; // Increased height for better visibility
export const MAX_TILT = 25;
export const MAX_ENERGY = 100;
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

// Work-related items (drain energy, add to work side)
export const WORK_ITEMS: ItemData[] = [
  { icon: 'laptop-outline', label: 'Big Project', weight: 3, energyCost: 25, category: 'work' },
  { icon: 'time-outline', label: 'Urgent Deadline', weight: 3, energyCost: 30, category: 'work' },
  { icon: 'document-text-outline', label: 'Reports', weight: 2, energyCost: 15, category: 'work' },
  { icon: 'briefcase-outline', label: 'Overtime', weight: 3, energyCost: 35, category: 'work' },
  { icon: 'people-outline', label: 'Meeting', weight: 2, energyCost: 20, category: 'work' },
  { icon: 'mail-outline', label: 'Emails', weight: 1, energyCost: 5, category: 'work' },
  { icon: 'call-outline', label: 'Work Calls', weight: 1, energyCost: 10, category: 'work' },
  { icon: 'analytics-outline', label: 'Data Analysis', weight: 2, energyCost: 20, category: 'work' },
];

// Life-related items (restore energy, add to life side)
export const LIFE_ITEMS: ItemData[] = [
  // Family
  { icon: 'home-outline', label: 'Family Time', weight: 3, energyCost: 0, energyRestore: 25, category: 'family' },
  { icon: 'heart-outline', label: 'Date Night', weight: 2, energyCost: 10, energyRestore: 20, category: 'family' },
  { icon: 'people-circle-outline', label: 'Kids Activities', weight: 2, energyCost: 15, energyRestore: 10, category: 'family' },
  
  // Wellness
  { icon: 'fitness-outline', label: 'Exercise', weight: 3, energyCost: 20, energyRestore: 30, category: 'wellness' },
  { icon: 'moon-outline', label: 'Good Sleep', weight: 3, energyCost: 0, energyRestore: 40, category: 'wellness' },
  { icon: 'restaurant-outline', label: 'Healthy Meal', weight: 2, energyCost: 5, energyRestore: 15, category: 'wellness' },
  { icon: 'leaf-outline', label: 'Meditation', weight: 2, energyCost: 0, energyRestore: 20, category: 'wellness' },
  { icon: 'water-outline', label: 'Hydration', weight: 1, energyCost: 0, energyRestore: 5, category: 'wellness' },
  
  // Hobbies
  { icon: 'game-controller-outline', label: 'Gaming', weight: 2, energyCost: 10, energyRestore: 15, category: 'hobbies' },
  { icon: 'book-outline', label: 'Reading', weight: 2, energyCost: 5, energyRestore: 15, category: 'hobbies' },
  { icon: 'brush-outline', label: 'Creative Time', weight: 3, energyCost: 10, energyRestore: 25, category: 'hobbies' },
  { icon: 'musical-notes-outline', label: 'Music', weight: 1, energyCost: 0, energyRestore: 10, category: 'hobbies' },
  
  // Goals
  { icon: 'school-outline', label: 'Learning', weight: 2, energyCost: 15, energyRestore: 10, category: 'goals' },
  { icon: 'rocket-outline', label: 'Side Project', weight: 3, energyCost: 20, energyRestore: 15, category: 'goals' },
  { icon: 'trophy-outline', label: 'Personal Goal', weight: 2, energyCost: 10, energyRestore: 20, category: 'goals' },
  
  // Social
  { icon: 'beer-outline', label: 'Friends', weight: 2, energyCost: 15, energyRestore: 20, category: 'social' },
  { icon: 'chatbubbles-outline', label: 'Social Time', weight: 1, energyCost: 5, energyRestore: 10, category: 'social' },
  { icon: 'gift-outline', label: 'Volunteering', weight: 2, energyCost: 10, energyRestore: 25, category: 'social' },
];

// Updated rounds - 20 seconds each, progressively harder
export const ROUNDS: Round[] = [
  { number: 1, duration: 20, spawnRate: 3000, fallSpeed: 4500, itemCount: 10, urgentItemChance: 0.1 },
  { number: 2, duration: 20, spawnRate: 2500, fallSpeed: 3500, itemCount: 12, urgentItemChance: 0.25 },
  { number: 3, duration: 20, spawnRate: 2000, fallSpeed: 3000, itemCount: 15, urgentItemChance: 0.4 },
];

// Tutorial round
export const TUTORIAL_ROUND: Round = {
  number: 0, 
  duration: 15, 
  spawnRate: 3500, 
  fallSpeed: 5000, 
  itemCount: 5, 
  urgentItemChance: 0
};

export const GAME_DIMENSIONS = { width, height };