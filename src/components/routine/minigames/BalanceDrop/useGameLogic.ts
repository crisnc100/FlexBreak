import { useState, useRef, useEffect, useCallback } from 'react';
import { Animated, PanResponder } from 'react-native';
import * as haptics from '../../../../utils/haptics';
import { playCorrectSound, playIncorrectSound } from '../../../../utils/soundEffects';
import { 
  GameState, 
  Item, 
  ItemData, 
  GameStats, 
  ComboInfo,
  Round,
  StatEffect,
  LifeStats 
} from './types';
import { 
  ROUNDS,
  TUTORIAL_ROUND, 
  WORK_ITEMS, 
  LIFE_ITEMS,
  FLEXIBLE_ITEMS,
  REST_ITEMS,
  ESSENTIAL_ITEMS,
  MAX_ENERGY,
  ITEM_BASE_SIZE,
  SCALE_WIDTH,
  SCALE_HEIGHT,
  DROP_ZONE_PADDING,
  GAME_DIMENSIONS
} from './constants';

const { width, height } = GAME_DIMENSIONS;

export const useGameLogic = (
  onGameComplete: (score: number, xpEarned: number) => void
) => {
  // Game state
  const [gameState, setGameState] = useState<GameState>('menu');
  const [currentRound, setCurrentRound] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [items, setItems] = useState<Item[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [isGameplayStarted, setIsGameplayStarted] = useState(false);
  const [handledItemsCount, setHandledItemsCount] = useState(0);
  const [upcomingItems, setUpcomingItems] = useState<ItemData[]>([]);
  const [balance, setBalance] = useState(0);
  const [energyLeft, setEnergyLeft] = useState(MAX_ENERGY);
  const [skipCount, setSkipCount] = useState(0);
  const [activeDropZone, setActiveDropZone] = useState<'work' | 'life' | 'discard' | null>(null);
  const [gameAreaOffset, setGameAreaOffset] = useState({ x: 0, y: 0 });
  const [dropFeedback, setDropFeedback] = useState<{ type: 'success' | 'error' | 'skip'; position: { x: number; y: number }; message?: string } | null>(null);
  const [penaltyFeedback, setPenaltyFeedback] = useState<string | null>(null);
  const [delayedEffects, setDelayedEffects] = useState<StatEffect[]>([]);
  
  // Stats
  const [stats, setStats] = useState<GameStats>({
    score: 0,
    roundScore: 0,
    itemsPlaced: 0,
    energyRestored: 0,
    perfectBalanceCount: 0,
    currentEnergy: MAX_ENERGY,
    correctPlacements: 0,
    urgentItemsHandled: 0,
    missedUrgentItems: 0,
    lifeStats: {
      career: 50,
      family: 50,
      health: 50,
      social: 50,
      stress: 30,
    },
    decisions: [],
  });
  
  // Combo tracking
  const [lastPlacedTypes, setLastPlacedTypes] = useState<('work' | 'life')[]>([]);
  const [currentCombo, setCurrentCombo] = useState<ComboInfo | null>(null);
  
  // Refs
  const scaleRotation = useRef(new Animated.Value(0)).current;
  const energyAnimation = useRef(new Animated.Value(1)).current;
  const energyFlashAnimation = useRef(new Animated.Value(0)).current;
  const spawnInterval = useRef<NodeJS.Timeout | null>(null);
  const gameTimer = useRef<NodeJS.Timeout | null>(null);
  const itemIdCounter = useRef(0);
  const spawnedCount = useRef(0);
  const previewQueue = useRef<ItemData[]>([]);

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (spawnInterval.current) clearInterval(spawnInterval.current);
      if (gameTimer.current) clearInterval(gameTimer.current);
    };
  }, []);

  // Update scale rotation based on balance
  useEffect(() => {
    Animated.spring(scaleRotation, {
      toValue: (balance / 100) * 30,
      useNativeDriver: false,
      friction: 8,
    }).start();
  }, [balance, scaleRotation]);

  // Update urgency timers
  useEffect(() => {
    const urgencyInterval = setInterval(() => {
      setItems(prev => prev.map(item => {
        // Urgency system removed in simplified version
        // if (item.isUrgent && item.urgencyTimer && item.urgencyTimer > 0) {
        //   return { ...item, urgencyTimer: item.urgencyTimer - 1 };
        // }
        return item;
      }));
    }, 1000);
    
    return () => clearInterval(urgencyInterval);
  }, []);

  // Check if all items have been handled
  useEffect(() => {
    if (isGameplayStarted && gameState === 'playing') {
      const round = currentRound === 0 ? TUTORIAL_ROUND : ROUNDS[currentRound - 1];
      
      // If all items are handled and no more items on screen
      if (handledItemsCount >= round.itemCount && items.length === 0 && !spawnInterval.current) {
        // Give a small delay to ensure animations complete
        const timeoutId = setTimeout(() => {
          if (gameTimer.current) clearInterval(gameTimer.current);
          setStats(prev => ({ ...prev, score: prev.score + prev.roundScore }));
          setGameState('roundComplete');
          haptics.medium();
        }, 500);
        
        return () => clearTimeout(timeoutId);
      }
    }
  }, [handledItemsCount, items.length, isGameplayStarted, gameState, currentRound, stats.roundScore]);

  const startRound = useCallback((roundNumber: number) => {
    const round = roundNumber === 0 ? TUTORIAL_ROUND : ROUNDS[roundNumber - 1];
    setCurrentRound(roundNumber);
    setStats(prev => ({ ...prev, roundScore: 0, itemsPlaced: 0, energyRestored: 0, perfectBalanceCount: 0, correctPlacements: 0, urgentItemsHandled: 0, missedUrgentItems: 0, decisions: [] }));
    
    // Apply delayed effects from previous round
    if (delayedEffects.length > 0) {
      const newLifeStats = { ...stats.lifeStats };
      delayedEffects.forEach(effect => {
        newLifeStats[effect.stat] = Math.max(0, Math.min(100, newLifeStats[effect.stat] + effect.change));
      });
      setStats(prev => ({ ...prev, lifeStats: newLifeStats }));
      setDelayedEffects([]);
    }
    setTimeLeft(round.duration);
    setItems([]);
    setUpcomingItems([]);
    
    // Set random starting balance within the round's range
    const { min, max } = round.startingBalanceRange;
    const randomBalance = Math.floor(Math.random() * (max - min + 1)) + min;
    // Ensure we don't start at exactly 0 (perfect balance)
    const startingBalance = randomBalance === 0 ? (Math.random() < 0.5 ? -10 : 10) : randomBalance;
    setBalance(startingBalance);
    
    // Apply scenario energy modifier if present
    const startingEnergy = round.scenario ? Math.round(MAX_ENERGY * round.scenario.energyModifier) : MAX_ENERGY;
    setEnergyLeft(startingEnergy);
    
    // Apply scenario stat modifiers if present
    let lifeStats = { ...stats.lifeStats };
    if (round.scenario?.statModifiers) {
      Object.entries(round.scenario.statModifiers).forEach(([stat, value]) => {
        lifeStats[stat as keyof LifeStats] = value;
      });
    }
    
    setStats(prev => ({ ...prev, currentEnergy: startingEnergy, lifeStats }));
    setLastPlacedTypes([]);
    setCurrentCombo(null);
    spawnedCount.current = 0;
    previewQueue.current = [];
    setHandledItemsCount(0);
    setSkipCount(0); // Reset skip count
    
    // Generate preview items based on scenario
    generatePreviewItems(round);
    setUpcomingItems([...previewQueue.current]);
    
    setGameState(roundNumber === 0 ? 'tutorial' : 'playing');
    setIsGameplayStarted(false); // Reset flag for new round
    
    // Don't start spawning or timer yet - wait for round start message to complete
  }, []);

  const startSpawning = useCallback((round: Round) => {
    // Calculate items to spawn per batch - less overwhelming
    const itemsPerBatch = round.number === 0 ? 1 : Math.min(1 + Math.floor(round.number / 2), 2);
    
    // Spawn first batch immediately
    for (let i = 0; i < itemsPerBatch && spawnedCount.current < round.itemCount; i++) {
      setTimeout(() => spawnItem(round), i * 150); // More delay between items in batch
    }
    
    // Set up interval for remaining items
    spawnInterval.current = setInterval(() => {
      const remainingItems = round.itemCount - spawnedCount.current;
      if (remainingItems > 0) {
        const batchSize = Math.min(itemsPerBatch, remainingItems);
        for (let i = 0; i < batchSize; i++) {
          setTimeout(() => spawnItem(round), i * 150);
        }
      } else {
        if (spawnInterval.current) {
          clearInterval(spawnInterval.current);
          spawnInterval.current = null;
        }
      }
    }, round.spawnRate);
  }, []);

  // Track recent spawn history for fairness
  const spawnHistory = useRef<('work' | 'life')[]>([]);
  
  const generatePreviewItems = useCallback((round: Round) => {
    previewQueue.current = [];
    const scenario = round.scenario;
    const workChance = scenario?.workItemChance || 0.5;
    
    for (let i = 0; i < 3; i++) {
      const roll = Math.random();
      let itemData: ItemData;
      
      // 15% chance for essential items
      if (roll < 0.15) {
        itemData = ESSENTIAL_ITEMS[Math.floor(Math.random() * ESSENTIAL_ITEMS.length)];
      } 
      // 10% chance for rest items
      else if (roll < 0.25) {
        itemData = REST_ITEMS[Math.floor(Math.random() * REST_ITEMS.length)];
      }
      // Remaining split between work and life based on scenario
      else {
        const isWork = Math.random() < workChance;
        const itemList = isWork ? WORK_ITEMS : LIFE_ITEMS;
        itemData = itemList[Math.floor(Math.random() * itemList.length)];
      }
      
      previewQueue.current.push(itemData);
    }
  }, []);
  
  const spawnItem = useCallback((round: Round) => {
    let itemData: ItemData;
    let itemType: 'work' | 'life' | 'neutral' = 'work';
    let isFlexible = false;
    
    // Use item from preview queue if available
    if (previewQueue.current.length > 0) {
      itemData = previewQueue.current.shift()!;
      
      // Determine type based on item
      if (ESSENTIAL_ITEMS.includes(itemData)) {
        itemType = 'neutral';
        isFlexible = true;
      } else if (REST_ITEMS.includes(itemData) || LIFE_ITEMS.includes(itemData)) {
        itemType = 'life';
      } else if (WORK_ITEMS.includes(itemData)) {
        itemType = 'work';
      } else if (FLEXIBLE_ITEMS.includes(itemData)) {
        itemType = itemData.category === 'work' ? 'work' : 'life';
        isFlexible = true;
      }
      
      // Add new item to preview queue
      generateNextPreviewItem(round);
      setUpcomingItems([...previewQueue.current]);
    } else {
      // Emergency spawn if preview queue is empty
      const scenario = round.scenario;
      const roll = Math.random();
      
      // Balanced spawning: 10% essential, 10% rest, 15% flexible, 65% work/life
      if (roll < 0.1) {
        itemData = ESSENTIAL_ITEMS[Math.floor(Math.random() * ESSENTIAL_ITEMS.length)];
        itemType = 'neutral';
        isFlexible = true;
      } else if (roll < 0.2) {
        itemData = REST_ITEMS[Math.floor(Math.random() * REST_ITEMS.length)];
        itemType = 'life';
      } else if (roll < 0.35) {
        itemData = FLEXIBLE_ITEMS[Math.floor(Math.random() * FLEXIBLE_ITEMS.length)];
        itemType = itemData.category === 'work' ? 'work' : 'life';
        isFlexible = true;
      } else {
        // Regular work/life items - use scenario bias but ensure balance
        const workChance = scenario?.workItemChance || 0.5;
        const recentSpawns = spawnHistory.current.slice(-5);
        const recentWorkCount = recentSpawns.filter(t => t === 'work').length;
        const recentLifeCount = recentSpawns.filter(t => t === 'life').length;
        
        // Prevent streaks of more than 3 of same type
        let useWork = Math.random() < workChance;
        if (recentWorkCount >= 3 && recentLifeCount < 2) {
          useWork = false; // Force life item
        } else if (recentLifeCount >= 3 && recentWorkCount < 2) {
          useWork = true; // Force work item
        }
        
        const itemList = useWork ? WORK_ITEMS : LIFE_ITEMS;
        itemData = itemList[Math.floor(Math.random() * itemList.length)];
        itemType = useWork ? 'work' : 'life';
      }
    }
    
    // Update spawn history (don't track neutral items)
    if (itemType !== 'neutral') {
      spawnHistory.current.push(itemType);
      if (spawnHistory.current.length > 10) {
        spawnHistory.current.shift(); // Keep only last 10
      }
    }
    
    const id = `item-${itemIdCounter.current++}`;
    
    const itemSize = ITEM_BASE_SIZE + (itemData.weight - 1) * 15;
    
    // Simple spawn positions - items fall from top
    let startX = Math.random() * (width - itemSize - 40) + 20;
    let startY = -itemSize;
    
    const position = new Animated.ValueXY({ x: startX, y: startY });
    
    const newItem: Item = {
      id,
      type: itemType, // Keep neutral as neutral
      category: itemData.category,
      data: itemData,
      position,
      opacity: new Animated.Value(1),
      scale: new Animated.Value(1),
      isFlexible,
    };
    
    
    setItems(prev => [...prev, newItem]);
    spawnedCount.current += 1;
    
    // Animate falling - store animation reference
    const fallAnimation = Animated.timing(position, {
      toValue: { x: startX, y: height + itemSize + 100 }, // Fall completely off-screen
      duration: round.fallSpeed,
      useNativeDriver: false,
    });
    
    // Store animation reference on the item
    (newItem as any).fallAnimation = fallAnimation;
    
    fallAnimation.start(({ finished }) => {
      if (finished && !isPaused) {
        handleItemMissed(id);
      }
    });
  }, [isPaused]);
  
  const generateNextPreviewItem = useCallback((round: Round) => {
    const scenario = round.scenario;
    const workChance = scenario?.workItemChance || 0.5;
    const roll = Math.random();
    let itemData: ItemData;
    
    // Balanced distribution: 10% essential, 10% rest, 15% flexible, 65% work/life
    if (roll < 0.1) {
      itemData = ESSENTIAL_ITEMS[Math.floor(Math.random() * ESSENTIAL_ITEMS.length)];
    } else if (roll < 0.2) {
      itemData = REST_ITEMS[Math.floor(Math.random() * REST_ITEMS.length)];
    } else if (roll < 0.35) {
      itemData = FLEXIBLE_ITEMS[Math.floor(Math.random() * FLEXIBLE_ITEMS.length)];
    } else {
      // Check recent history to ensure balance
      const recentWork = previewQueue.current.filter(item => 
        WORK_ITEMS.includes(item) || (FLEXIBLE_ITEMS.includes(item) && item.category === 'work')
      ).length;
      const recentLife = previewQueue.current.filter(item => 
        LIFE_ITEMS.includes(item) || REST_ITEMS.includes(item) || 
        (FLEXIBLE_ITEMS.includes(item) && item.category !== 'work')
      ).length;
      
      let useWork = Math.random() < workChance;
      // Ensure some balance in preview queue
      if (recentWork >= 2 && recentLife === 0) useWork = false;
      if (recentLife >= 2 && recentWork === 0) useWork = true;
      
      const itemList = useWork ? WORK_ITEMS : LIFE_ITEMS;
      itemData = itemList[Math.floor(Math.random() * itemList.length)];
    }
    
    previewQueue.current.push(itemData);
  }, []);

  const handleItemMissed = useCallback((itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    
    // Apply skip penalty if defined
    if (item.data.effects?.skipPenalty) {
      const newLifeStats = { ...stats.lifeStats };
      const messages: string[] = [];
      
      item.data.effects.skipPenalty.forEach(effect => {
        newLifeStats[effect.stat] = Math.max(0, Math.min(100, newLifeStats[effect.stat] + effect.change));
        if (effect.message) messages.push(effect.message);
      });
      
      setStats(prev => ({ 
        ...prev, 
        lifeStats: newLifeStats,
        roundScore: Math.max(0, prev.roundScore - 5),
        decisions: [...prev.decisions, {
          item: item.data.label,
          choice: 'skip',
          effects: item.data.effects.skipPenalty
        }]
      }));
      
      if (messages.length > 0) {
        setPenaltyFeedback(messages.join(' '));
      }
    } else {
      // Small penalty for missing items
      setStats(prev => ({
        ...prev,
        roundScore: Math.max(0, prev.roundScore - 5),
      }));
    }
    
    setItems(prev => prev.filter(i => i.id !== itemId));
    setHandledItemsCount(prev => prev + 1);
  }, [items, stats.lifeStats]);

  const handleItemSkipped = useCallback((item: Item) => {
    // Check if we've exceeded skip limit
    const round = currentRound === 0 ? TUTORIAL_ROUND : ROUNDS[currentRound - 1];
    if (round.maxSkips && skipCount >= round.maxSkips) {
      // Can't skip anymore
      setPenaltyFeedback('No more skips available!');
      haptics.error();
      continueItemFalling(item);
      return;
    }
    
    // Get item position for feedback
    const itemX = (item.position.x as any)._value || 0;
    const itemY = (item.position.y as any)._value || 0;
    const itemSize = ITEM_BASE_SIZE + (item.data.weight - 1) * 15;
    
    // Show drop feedback
    setDropFeedback({
      type: 'skip',
      position: { x: itemX + itemSize / 2, y: itemY + itemSize / 2 }
    });
    
    // Strategic let go - evaluate if it helps maintain balance
    const currentBalance = Math.abs(balance);
    let points = 0;
    
    // If letting go helps prevent overwhelming imbalance, it's a good move
    if (currentBalance > 60) {
      // Scale is very imbalanced - letting go is strategic
      points = 5; // Small reward for mindful choice
    } else if (currentBalance > 40) {
      // Scale is getting imbalanced - neutral move
      points = 0;
    } else {
      // Scale is balanced - small penalty for unnecessary letting go
      points = -item.data.weight;
    }
    
    // Apply skip penalty if defined
    if (item.data.effects?.skipPenalty) {
      const newLifeStats = { ...stats.lifeStats };
      const messages: string[] = [];
      
      item.data.effects.skipPenalty.forEach(effect => {
        newLifeStats[effect.stat] = Math.max(0, Math.min(100, newLifeStats[effect.stat] + effect.change));
        if (effect.message) messages.push(effect.message);
      });
      
      setStats(prev => ({ 
        ...prev, 
        lifeStats: newLifeStats,
        roundScore: Math.max(0, prev.roundScore + points),
        decisions: [...prev.decisions, {
          item: item.data.label,
          choice: 'skip',
          effects: item.data.effects.skipPenalty
        }]
      }));
      
      if (messages.length > 0) {
        setPenaltyFeedback(messages.join(' '));
      }
    } else {
      setStats(prev => ({
        ...prev,
        roundScore: Math.max(0, prev.roundScore + points),
      }));
    }
    
    // Visual feedback
    haptics.light();
    
    // Remove item with animation
    Animated.parallel([
      Animated.timing(item.opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }),
      Animated.timing(item.scale, {
        toValue: 0.5,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start(() => {
      setItems(prev => prev.filter(i => i.id !== item.id));
      setHandledItemsCount(prev => prev + 1);
      setSkipCount(prev => prev + 1); // Increment skip count
    });
  }, [currentRound, skipCount]);

  const handleItemPlaced = useCallback((item: Item, isCorrect: boolean, onWorkSide: boolean) => {
    // Special handling for neutral items - they're always correct and don't affect balance
    if (item.type === 'neutral') {
      isCorrect = true; // Neutral items can go anywhere
    }
    // Get item position for feedback
    const itemX = (item.position.x as any)._value || 0;
    const itemY = (item.position.y as any)._value || 0;
    const itemSize = ITEM_BASE_SIZE + (item.data.weight - 1) * 15;
    
    // Show drop feedback
    setDropFeedback({
      type: isCorrect ? 'success' : 'error',
      position: { x: itemX + itemSize / 2, y: itemY + itemSize / 2 }
    });
    
    // Update energy - both work and life consume energy
    let energyCost = item.data.energyCost;
    
    // Handle flexible items - different costs for each side
    if (item.isFlexible && item.data.flexibleEnergyCost) {
      energyCost = onWorkSide ? item.data.flexibleEnergyCost.work : item.data.flexibleEnergyCost.life;
    }
    
    // Extra energy penalty for wrong placement (reduced in tutorial)
    if (!isCorrect) {
      energyCost += currentRound === 0 ? 2 : 5; // Less penalty in tutorial
      const wrongPlacementMessage = item.type === 'work' 
        ? '📱 Work spilling into life!' 
        : '🎮 Life distracting from work!';
      setPenaltyFeedback(wrongPlacementMessage);
      
      // Flash the energy bar red for wrong placement
      Animated.sequence([
        Animated.timing(energyFlashAnimation, {
          toValue: 1,
          duration: 150,
          useNativeDriver: false,
        }),
        Animated.timing(energyFlashAnimation, {
          toValue: 0,
          duration: 150,
          useNativeDriver: false,
        }),
      ]).start();
    }
    
    // Handle rest items that restore energy
    let newEnergy;
    if (item.data.energyRestore && isCorrect) {
      newEnergy = Math.min(MAX_ENERGY, energyLeft + item.data.energyRestore);
      setStats(prev => ({ ...prev, energyRestored: prev.energyRestored + item.data.energyRestore! }));
    } else {
      newEnergy = Math.max(0, energyLeft - energyCost);
    }
    
    setEnergyLeft(newEnergy);
    setStats(prev => ({ ...prev, currentEnergy: newEnergy }));
    
    // Check if energy has run out (but not in tutorial)
    if (newEnergy <= 0 && currentRound !== 0) {
      // End the round (not the whole game)
      setTimeout(() => {
        endRound(false);
      }, 100);
      return; // Prevent further execution
    }
    
    // Animate energy bar
    Animated.sequence([
      Animated.timing(energyAnimation, {
        toValue: 0.8,
        duration: 100,
        useNativeDriver: false,
      }),
      Animated.timing(energyAnimation, {
        toValue: 1,
        duration: 100,
        useNativeDriver: false,
      }),
    ]).start();
    
    // Update score based on balance maintenance
    let points = 0;
    const currentBalance = Math.abs(balance);
    
    if (isCorrect) {
      // Base points for correct placement
      points = 5 * item.data.weight;
      
      // Bonus points if this helps balance the scale (neutral items don't affect balance)
      let projectedBalance = currentBalance;
      if (item.type !== 'neutral') {
        projectedBalance = Math.abs(balance + (onWorkSide ? -1 : 1) * item.data.weight * 10);
        if (projectedBalance < currentBalance) {
          points += 15; // Bonus for improving balance
        }
        
        // Extra bonus if maintaining perfect balance (within 20 points)
        if (projectedBalance < 20) {
          points += 10;
        }
      }
      
      // Removed urgency system for simplified version
      
      setStats(prev => ({ ...prev, itemsPlaced: prev.itemsPlaced + 1 }));
      haptics.success();
      playCorrectSound();
    } else {
      // Penalty for wrong placement
      points = -10 * item.data.weight;
      haptics.error();
      playIncorrectSound();
    }
    
    // Check for combos
    const newTypes = [...lastPlacedTypes, item.type];
    if (newTypes.length > 5) newTypes.shift();
    setLastPlacedTypes(newTypes);
    
    // Check for streaks
    if (newTypes.length >= 3) {
      const last3 = newTypes.slice(-3);
      if (last3.every(t => t === 'work')) {
        setCurrentCombo({ type: 'Productivity Streak', count: 3 });
        points += 30;
        haptics.medium();
      } else if (last3.every(t => t === 'life')) {
        setCurrentCombo({ type: 'Self-Care Streak', count: 3 });
        points += 30;
        haptics.medium();
      }
    }
    
    // Check for perfect balance
    if (newTypes.length >= 5) {
      const last5 = newTypes.slice(-5);
      const isAlternating = last5.every((type, i) => 
        i === 0 || type !== last5[i - 1]
      );
      if (isAlternating) {
        setStats(prev => ({ ...prev, perfectBalanceCount: prev.perfectBalanceCount + 1 }));
        setCurrentCombo({ type: 'Perfect Balance', count: 5 });
        points += 50;
        haptics.heavy();
      }
    }
    
    // Apply immediate effects
    let effectMessages: string[] = [];
    let effectsToApply: StatEffect[] = [];
    
    // Determine which effects to apply based on item type
    if (item.isFlexible && item.data.effects) {
      // Flexible items have different effects based on placement
      const sideEffects = onWorkSide ? item.data.effects.work : item.data.effects.life;
      if (sideEffects?.immediate) {
        effectsToApply = sideEffects.immediate;
      }
    } else if (item.data.effects?.immediate) {
      // Regular items have the same effects regardless of placement
      effectsToApply = item.data.effects.immediate;
    }
    
    // Apply the effects
    if (effectsToApply.length > 0) {
      const newLifeStats = { ...stats.lifeStats };
      
      effectsToApply.forEach(effect => {
        newLifeStats[effect.stat] = Math.max(0, Math.min(100, newLifeStats[effect.stat] + effect.change));
        if (effect.message) effectMessages.push(effect.message);
      });
      
      setStats(prev => ({ 
        ...prev, 
        lifeStats: newLifeStats,
        roundScore: Math.max(0, prev.roundScore + points),
        decisions: [...prev.decisions, {
          item: item.data.label,
          choice: onWorkSide ? 'work' : 'life',
          effects: effectsToApply
        }]
      }));
      
      // Show effect messages
      if (effectMessages.length > 0) {
        setDropFeedback(prev => prev ? { ...prev, message: effectMessages[0] } : null);
      }
    } else {
      setStats(prev => ({ ...prev, roundScore: Math.max(0, prev.roundScore + points) }));
    }
    
    // Queue delayed effects for next round
    if (item.data.effects?.delayed) {
      setDelayedEffects(prev => [...prev, ...item.data.effects.delayed]);
    }
    
    // Update balance (neutral items don't affect balance)
    const balanceChange = item.type === 'neutral' ? 0 : (onWorkSide ? -1 : 1) * item.data.weight * 10;
    setBalance(prev => {
      const newBalance = Math.max(-100, Math.min(100, prev + balanceChange));
      
      // Skip failure checks in tutorial
      if (currentRound !== 0) {
        if (Math.abs(newBalance) >= 70) {
          endRound(false);
        }
        
        // Check critical life stats
        if (stats.lifeStats.stress >= 90) {
          setPenaltyFeedback('⚠️ BURNOUT! Too much stress!');
          endRound(false);
        } else if (stats.lifeStats.health <= 20) {
          setPenaltyFeedback('⚠️ HEALTH CRISIS! Need rest!');
          endRound(false);
        } else if (stats.lifeStats.family <= 20) {
          setPenaltyFeedback('⚠️ RELATIONSHIP CRISIS!');
          endRound(false);
        }
      }
      
      return newBalance;
    });
    
    // Remove item with animation
    Animated.parallel([
      Animated.timing(item.opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(item.scale, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start(() => {
      setItems(prev => prev.filter(i => i.id !== item.id));
      setHandledItemsCount(prev => prev + 1);
    });
    
    // Clear combo after display
    if (currentCombo) {
      setTimeout(() => setCurrentCombo(null), 2000);
    }
  }, [currentCombo, energyAnimation, energyLeft, lastPlacedTypes]);

  const continueItemFalling = useCallback((item: Item) => {
    // Reset scale
    Animated.spring(item.scale, {
      toValue: 1,
      useNativeDriver: false,
    }).start();
    
    // Get current position
    const currentX = (item.position.x as any)._value || 0;
    const currentY = (item.position.y as any)._value || 0;
    
    // Calculate remaining fall distance and time
    const remainingDistance = height - 100 - currentY;
    const remainingTime = Math.max(500, (remainingDistance / (height - 100)) * 2000);
    
    // Continue falling from current position
    Animated.timing(item.position, {
      toValue: { x: currentX, y: height - 100 },
      duration: remainingTime,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        handleItemMissed(item.id);
      }
    });
  }, [handleItemMissed]);

  const createPanResponder = useCallback((item: Item) => {
    const itemSize = ITEM_BASE_SIZE + (item.data.weight - 1) * 15;
    const halfSize = itemSize / 2;

    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      
      onPanResponderGrant: (evt, gesture) => {
        // Calculate actual energy cost for flexible items
        let requiredEnergy = item.data.energyCost;
        if (item.isFlexible && item.data.flexibleEnergyCost) {
          // Use the minimum cost for dragging check
          requiredEnergy = Math.min(item.data.flexibleEnergyCost.work, item.data.flexibleEnergyCost.life);
        }
        
        if (energyLeft < requiredEnergy) {
          haptics.error();
          // Show feedback that there isn't enough energy
          setPenaltyFeedback('⚡ Not enough energy!');
          return;
        }
        
        // Stop any ongoing animation
        item.position.stopAnimation();
        
        // Scale up for feedback
        Animated.spring(item.scale, {
          toValue: 1.2,
          useNativeDriver: false,
        }).start();
        
        haptics.light();
      },
      
      onPanResponderMove: (evt, gesture) => {
        // Use pageX/pageY for more accurate positioning
        const touchX = evt.nativeEvent.pageX - gameAreaOffset.x;
        const touchY = evt.nativeEvent.pageY - gameAreaOffset.y;
        
        // Center item on touch position
        let newX = touchX - halfSize;
        let newY = touchY - halfSize - 20; // Small upward offset for finger visibility
        
        // Apply bounds checking to keep item on screen
        const margin = 10;
        newX = Math.max(margin, Math.min(width - itemSize - margin, newX));
        newY = Math.max(margin, Math.min(height - itemSize - margin, newY));
        
        // Move item with offset applied
        item.position.setValue({
          x: newX,
          y: newY,
        });
        
        // Check which drop zone we're hovering over - use item center
        const itemCenterX = newX + halfSize;
        const itemCenterY = newY + halfSize;
        
        // Scale is positioned at bottom: 120 in styles, but relative to game area
        // Since items use coordinates relative to game area (0,0 at top-left of game area)
        // we need to calculate relative to game area height, not screen height
        const gameAreaHeight = height - gameAreaOffset.y;
        const scaleBottom = gameAreaHeight - 120;
        const scaleTop = scaleBottom - SCALE_HEIGHT;
        const scaleLeft = (width - SCALE_WIDTH) / 2;
        const scaleRight = scaleLeft + SCALE_WIDTH;
        const scaleCenter = width / 2;
        
        // Add padding for easier drops
        const paddedTop = scaleTop - DROP_ZONE_PADDING;
        const paddedBottom = scaleBottom + DROP_ZONE_PADDING;
        const paddedLeft = scaleLeft - DROP_ZONE_PADDING;
        const paddedRight = scaleRight + DROP_ZONE_PADDING;
        
        // Check scale zones with padding
        if (itemCenterY > paddedTop && itemCenterY < paddedBottom && 
            itemCenterX > paddedLeft && itemCenterX < paddedRight) {
          if (itemCenterX < scaleCenter) {
            setActiveDropZone('work');
          } else {
            setActiveDropZone('life');
          }
        } 
        // Check side let-go zones - positioned at 40% from top
        const letGoZoneTop = gameAreaHeight * 0.4;
        const letGoZoneSize = 100;
        const letGoZonePadding = 20; // Extra padding for easier dropping
        
        // Left let-go zone
        const leftZoneLeft = 10;
        const leftZoneRight = leftZoneLeft + letGoZoneSize + letGoZonePadding;
        
        // Right let-go zone  
        const rightZoneRight = width - 10;
        const rightZoneLeft = rightZoneRight - letGoZoneSize - letGoZonePadding;
        
        if ((itemCenterX >= leftZoneLeft - letGoZonePadding && itemCenterX <= leftZoneRight) ||
            (itemCenterX >= rightZoneLeft && itemCenterX <= rightZoneRight + letGoZonePadding)) {
          // Check Y position
          if (itemCenterY >= letGoZoneTop - letGoZonePadding && 
              itemCenterY <= letGoZoneTop + letGoZoneSize + letGoZonePadding) {
            setActiveDropZone('discard');
          } else {
            setActiveDropZone(null);
          }
        } else {
          setActiveDropZone(null);
        }
      },
      
      onPanResponderRelease: (evt, gesture) => {
        setActiveDropZone(null); // Clear active zone
        
        // Get final position of item center
        const finalX = (item.position.x as any)._value || 0;
        const finalY = (item.position.y as any)._value || 0;
        const dropX = finalX + halfSize;
        const dropY = finalY + halfSize;
        
        // Scale is positioned at bottom: 120 in styles, but relative to game area
        // Since items use coordinates relative to game area (0,0 at top-left of game area)
        // we need to calculate relative to game area height, not screen height
        const gameAreaHeight = height - gameAreaOffset.y;
        const scaleBottom = gameAreaHeight - 120;
        const scaleTop = scaleBottom - SCALE_HEIGHT;
        const scaleLeft = (width - SCALE_WIDTH) / 2;
        const scaleRight = scaleLeft + SCALE_WIDTH;
        const scaleCenter = width / 2;
        
        // Add padding for easier drops
        const paddedTop = scaleTop - DROP_ZONE_PADDING;
        const paddedBottom = scaleBottom + DROP_ZONE_PADDING;
        const paddedLeft = scaleLeft - DROP_ZONE_PADDING;
        const paddedRight = scaleRight + DROP_ZONE_PADDING;
        
        // Check if dropped on scale (with padding for easier drops)
        if (dropY > paddedTop && dropY < paddedBottom &&
            dropX > paddedLeft && dropX < paddedRight) {
          
          const droppedOnWork = dropX < scaleCenter;
          
          // Calculate actual energy cost
          let requiredEnergy = item.data.energyCost;
          if (item.isFlexible && item.data.flexibleEnergyCost) {
            requiredEnergy = droppedOnWork ? item.data.flexibleEnergyCost.work : item.data.flexibleEnergyCost.life;
          }
          
          if (energyLeft < requiredEnergy) {
            haptics.error();
            setPenaltyFeedback('⚡ Not enough energy!');
            continueItemFalling(item);
            return;
          }
          // Essential items and flexible items are always correct regardless of side
          const isEssential = ESSENTIAL_ITEMS.includes(item.data);
          const isFlexible = item.isFlexible;
          const isCorrect = isEssential || isFlexible ||
                           (droppedOnWork && item.type === 'work') || 
                           (!droppedOnWork && item.type === 'life');
          
          handleItemPlaced(item, isCorrect, droppedOnWork);
        } else {
          // Check for side let-go zones
          const letGoZoneTop = gameAreaHeight * 0.4;
          const letGoZoneSize = 100;
          const letGoZonePadding = 20;
          
          // Left zone
          const leftZoneLeft = 10;
          const leftZoneRight = leftZoneLeft + letGoZoneSize + letGoZonePadding;
          
          // Right zone  
          const rightZoneRight = width - 10;
          const rightZoneLeft = rightZoneRight - letGoZoneSize - letGoZonePadding;
          
          const discardZone = ((dropX >= leftZoneLeft - letGoZonePadding && dropX <= leftZoneRight) ||
                              (dropX >= rightZoneLeft && dropX <= rightZoneRight + letGoZonePadding)) &&
                              (dropY >= letGoZoneTop - letGoZonePadding && 
                               dropY <= letGoZoneTop + letGoZoneSize + letGoZonePadding);
          
          if (discardZone) {
            handleItemSkipped(item);
          } else {
            continueItemFalling(item);
          }
        }
      },
    });
  }, [energyLeft, continueItemFalling, handleItemPlaced, handleItemSkipped, gameAreaOffset]);

  const startTimer = useCallback((duration: number) => {
    gameTimer.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          endRound(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const endRound = useCallback((completed: boolean) => {
    if (spawnInterval.current) clearInterval(spawnInterval.current);
    if (gameTimer.current) clearInterval(gameTimer.current);
    
    items.forEach(item => {
      item.position.stopAnimation();
    });
    
    // Tutorial always completes successfully
    if (currentRound === 0) {
      setStats(prev => ({ ...prev, score: prev.score + prev.roundScore }));
      setGameState('roundComplete');
      haptics.medium();
    } else if (!completed && Math.abs(balance) >= 70) {
      // Balance failure - end the game
      setGameState('gameOver');
      haptics.heavy();
      
      const totalXP = Math.max(25, Math.min(100, stats.score + stats.roundScore));
      setTimeout(() => {
        onGameComplete(stats.score + stats.roundScore, totalXP);
      }, 2000);
    } else {
      // For all other cases (including energy depletion), just end the round
      setStats(prev => ({ ...prev, score: prev.score + prev.roundScore }));
      setGameState('roundComplete');
      haptics.medium();
    }
  }, [balance, energyLeft, items, onGameComplete, stats]);

  const nextRound = useCallback(() => {
    if (currentRound >= 3) {
      const baseXP = 50;
      const energyBonus = energyLeft > 30 ? 10 : 0;
      const balanceBonus = Math.abs(balance) < 30 ? 20 : 0;
      const comboBonus = stats.perfectBalanceCount * 5;
      const totalXP = Math.min(100, baseXP + energyBonus + balanceBonus + comboBonus);
      
      onGameComplete(stats.score, totalXP);
    } else {
      startRound(currentRound + 1);
    }
  }, [balance, currentRound, onGameComplete, startRound, stats]);

  const skipTutorial = useCallback(() => {
    if (spawnInterval.current) clearInterval(spawnInterval.current);
    if (gameTimer.current) clearInterval(gameTimer.current);
    setStats(prev => ({ ...prev, score: 0 }));
    startRound(1);
    // Note: Don't start gameplay here - let the round start message handle it
  }, [startRound]);

  const clearDropFeedback = useCallback(() => {
    setDropFeedback(null);
  }, []);
  
  const clearPenaltyFeedback = useCallback(() => {
    setPenaltyFeedback(null);
  }, []);

  const pauseGame = useCallback(() => {
    setIsPaused(true);
    
    // Pause all item animations
    items.forEach(item => {
      item.position.stopAnimation();
    });
    
    // Pause timers
    if (spawnInterval.current) clearInterval(spawnInterval.current);
    if (gameTimer.current) clearInterval(gameTimer.current);
  }, [items]);

  const startGameplay = useCallback(() => {
    // Prevent double-starting
    if (isGameplayStarted) return;
    
    setIsGameplayStarted(true);
    const round = currentRound === 0 ? TUTORIAL_ROUND : ROUNDS[currentRound - 1];
    
    // Start spawning items
    startSpawning(round);
    
    // Start game timer
    startTimer(round.duration);
  }, [currentRound, isGameplayStarted, startSpawning, startTimer]);

  const resumeGame = useCallback(() => {
    setIsPaused(false);
    
    // Resume item animations
    items.forEach(item => {
      const currentY = (item.position.y as any)._value || 0;
      const currentX = (item.position.x as any)._value || 0;
      
      // Calculate remaining fall distance and time
      const remainingDistance = height - 100 - currentY;
      if (remainingDistance > 0) {
        const round = currentRound === 0 ? TUTORIAL_ROUND : ROUNDS[currentRound - 1];
        const remainingTime = (remainingDistance / (height - 100)) * round.fallSpeed;
        
        // Continue falling from current position
        Animated.timing(item.position, {
          toValue: { x: currentX, y: height - 100 },
          duration: remainingTime,
          useNativeDriver: false,
        }).start(({ finished }) => {
          if (finished && !isPaused) {
            handleItemMissed(item.id);
          }
        });
      }
    });
    
    // Resume spawning
    const round = currentRound === 0 ? TUTORIAL_ROUND : ROUNDS[currentRound - 1];
    if (spawnedCount.current < round.itemCount) {
      startSpawning(round);
    }
    
    // Resume timer
    startTimer(timeLeft);
  }, [currentRound, height, isPaused, items, startSpawning, startTimer, timeLeft, handleItemMissed]);

  const itemsRemaining = currentRound === 0 ? 
    Math.max(0, TUTORIAL_ROUND.itemCount - handledItemsCount) : 
    (currentRound > 0 && currentRound <= 3 ? 
      Math.max(0, ROUNDS[currentRound - 1].itemCount - handledItemsCount) : 
      0);

  return {
    // State
    gameState,
    setGameState,
    currentRound,
    timeLeft,
    items,
    upcomingItems,
    balance,
    energyLeft,
    stats,
    currentCombo,
    activeDropZone,
    dropFeedback,
    penaltyFeedback,
    isPaused,
    itemsRemaining,
    skipCount,
    
    // Animations
    scaleRotation,
    energyAnimation,
    energyFlashAnimation,
    
    // Functions
    startRound,
    nextRound,
    skipTutorial,
    createPanResponder,
    setGameAreaOffset,
    clearDropFeedback,
    clearPenaltyFeedback,
    pauseGame,
    resumeGame,
    startGameplay,
  };
};