import { useState, useRef, useEffect, useCallback } from 'react';
import { Animated, PanResponder } from 'react-native';
import * as haptics from '../../../../utils/haptics';
import { 
  GameState, 
  Item, 
  ItemData, 
  GameStats, 
  ComboInfo,
  Round 
} from './types';
import { 
  ROUNDS,
  TUTORIAL_ROUND, 
  WORK_ITEMS, 
  LIFE_ITEMS,
  HEAVY_WORK_ITEMS,
  HEAVY_LIFE_ITEMS,
  DUAL_ITEMS,
  CRITICAL_ITEMS,
  MAX_HOURS,
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
  const [hoursLeft, setHoursLeft] = useState(MAX_HOURS);
  const [letGoCount, setLetGoCount] = useState(0);
  const [activeDropZone, setActiveDropZone] = useState<'work' | 'life' | 'discard' | null>(null);
  const [gameAreaOffset, setGameAreaOffset] = useState({ x: 0, y: 0 });
  const [dropFeedback, setDropFeedback] = useState<{ type: 'success' | 'error' | 'discard'; position: { x: number; y: number } } | null>(null);
  const [penaltyFeedback, setPenaltyFeedback] = useState<string | null>(null);
  
  // Stats
  const [stats, setStats] = useState<GameStats>({
    score: 0,
    roundScore: 0,
    correctPlacements: 0,
    urgentItemsHandled: 0,
    missedUrgentItems: 0,
    perfectBalanceCount: 0,
  });
  
  // Combo tracking
  const [lastPlacedTypes, setLastPlacedTypes] = useState<('work' | 'wellness')[]>([]);
  const [currentCombo, setCurrentCombo] = useState<ComboInfo | null>(null);
  
  // Refs
  const scaleRotation = useRef(new Animated.Value(0)).current;
  const hoursAnimation = useRef(new Animated.Value(1)).current;
  const hoursFlashAnimation = useRef(new Animated.Value(0)).current;
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
        if (item.isUrgent && item.urgencyTimer && item.urgencyTimer > 0) {
          return { ...item, urgencyTimer: item.urgencyTimer - 1 };
        }
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
    setStats(prev => ({ ...prev, roundScore: 0, correctPlacements: 0, urgentItemsHandled: 0, missedUrgentItems: 0, perfectBalanceCount: 0 }));
    setTimeLeft(round.duration);
    setItems([]);
    setUpcomingItems([]);
    
    // Set random starting balance within the round's range
    const { min, max } = round.startingBalanceRange;
    const randomBalance = Math.floor(Math.random() * (max - min + 1)) + min;
    // Ensure we don't start at exactly 0 (perfect balance)
    const startingBalance = randomBalance === 0 ? (Math.random() < 0.5 ? -10 : 10) : randomBalance;
    setBalance(startingBalance);
    
    setHoursLeft(MAX_HOURS);
    setLastPlacedTypes([]);
    setCurrentCombo(null);
    spawnedCount.current = 0;
    previewQueue.current = [];
    setHandledItemsCount(0);
    setLetGoCount(0); // Reset let-go count
    
    // Generate preview items
    for (let i = 0; i < 3; i++) {
      const isWork = Math.random() < 0.5;
      const itemList = isWork ? WORK_ITEMS : LIFE_ITEMS;
      const itemData = itemList[Math.floor(Math.random() * itemList.length)];
      previewQueue.current.push(itemData);
    }
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
  
  const spawnItem = useCallback((round: Round) => {
    let itemData: ItemData;
    let isWork: boolean;
    let isDual = false;
    let isCritical = false;
    
    // Determine special item type based on round chances
    const specialRoll = Math.random();
    
    if (round.dualItemChance && specialRoll < round.dualItemChance) {
      // Spawn dual item
      itemData = DUAL_ITEMS[Math.floor(Math.random() * DUAL_ITEMS.length)];
      isDual = true;
      isWork = itemData.category === 'work'; // Default side based on category
    } else if (round.criticalItemChance && specialRoll < (round.dualItemChance || 0) + round.criticalItemChance) {
      // Spawn critical item
      itemData = CRITICAL_ITEMS[Math.floor(Math.random() * CRITICAL_ITEMS.length)];
      isCritical = true;
      isWork = itemData.category === 'work';
    } else if (round.heavyItemChance && specialRoll < (round.dualItemChance || 0) + (round.criticalItemChance || 0) + round.heavyItemChance) {
      // Spawn heavy item
      const heavyRoll = Math.random();
      if (heavyRoll < 0.5) {
        itemData = HEAVY_WORK_ITEMS[Math.floor(Math.random() * HEAVY_WORK_ITEMS.length)];
        isWork = true;
      } else {
        itemData = HEAVY_LIFE_ITEMS[Math.floor(Math.random() * HEAVY_LIFE_ITEMS.length)];
        isWork = false;
      }
    } else {
      // Normal item with fairness check
      const recentSpawns = spawnHistory.current.slice(-3);
      const workCount = recentSpawns.filter(type => type === 'work').length;
      const lifeCount = recentSpawns.filter(type => type === 'life').length;
      
      if (workCount >= 3) {
        isWork = false;
      } else if (lifeCount >= 3) {
        isWork = true;
      } else {
        const workBias = lifeCount > workCount ? 0.7 : (workCount > lifeCount ? 0.3 : 0.5);
        isWork = Math.random() < workBias;
      }
      
      if (previewQueue.current.length > 0) {
        itemData = previewQueue.current.shift()!;
        
        // Add new item to preview queue
        const itemList = isWork ? WORK_ITEMS : LIFE_ITEMS;
        const newItem = itemList[Math.floor(Math.random() * itemList.length)];
        previewQueue.current.push(newItem);
        setUpcomingItems([...previewQueue.current]);
      } else {
        const itemList = isWork ? WORK_ITEMS : LIFE_ITEMS;
        itemData = itemList[Math.floor(Math.random() * itemList.length)];
      }
    }
    
    // Update spawn history
    spawnHistory.current.push(isWork ? 'work' : 'life');
    if (spawnHistory.current.length > 10) {
      spawnHistory.current.shift(); // Keep only last 10
    }
    
    const id = `item-${itemIdCounter.current++}`;
    const isWorkItem = WORK_ITEMS.includes(itemData) || HEAVY_WORK_ITEMS.includes(itemData) || 
                      (itemData.category === 'work' && (isDual || isCritical));
    const isUrgent = !isCritical && !isDual && Math.random() < round.urgentItemChance;
    
    const itemSize = ITEM_BASE_SIZE + (itemData.weight - 1) * 15;
    
    // More challenging spawn positions - items can appear from different heights
    const spawnZone = Math.random();
    let startX = Math.random() * (width - itemSize - 40) + 20;
    let startY = -itemSize;
    
    // 30% chance to spawn from sides at different heights
    if (spawnZone < 0.15) {
      // Spawn from left side
      startX = -itemSize;
      startY = Math.random() * (height * 0.3);
    } else if (spawnZone < 0.3) {
      // Spawn from right side
      startX = width;
      startY = Math.random() * (height * 0.3);
    }
    
    const position = new Animated.ValueXY({ x: startX, y: startY });
    
    const newItem: Item = {
      id,
      type: isWorkItem ? 'work' : 'life',
      category: itemData.category,
      data: itemData,
      position,
      opacity: new Animated.Value(1),
      scale: new Animated.Value(1),
      isUrgent: isUrgent && !isCritical, // Critical items can't be urgent
      urgencyTimer: isUrgent && !isCritical ? 5 : undefined,
      isDual,
      isCritical,
    };
    
    
    setItems(prev => [...prev, newItem]);
    spawnedCount.current += 1;
    
    // Animate falling - store animation reference
    const fallAnimation = Animated.timing(position, {
      toValue: { x: startX, y: height - 100 },
      duration: round.fallSpeed,
      useNativeDriver: false,
    });
    
    // Store animation reference on the item
    (newItem as any).fallAnimation = fallAnimation;
    
    fallAnimation.start(({ finished }) => {
      if (finished && !isPaused) {
        handleItemMissed(id, isUrgent);
      }
    });
  }, [isPaused]);

  const handleItemMissed = useCallback((itemId: string, isUrgent: boolean) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    
    setStats(prev => ({
      ...prev,
      roundScore: Math.max(0, prev.roundScore - (2 * item.data.weight)),
      missedUrgentItems: isUrgent ? prev.missedUrgentItems + 1 : prev.missedUrgentItems,
    }));
    
    if (isUrgent) {
      setStats(prev => ({
        ...prev,
        roundScore: Math.max(0, prev.roundScore - 10),
      }));
    }
    
    setItems(prev => prev.filter(i => i.id !== itemId));
    setHandledItemsCount(prev => prev + 1);
  }, [items]);

  const handleItemDiscarded = useCallback((item: Item) => {
    // Check if we've exceeded let-go limit
    const round = currentRound === 0 ? TUTORIAL_ROUND : ROUNDS[currentRound - 1];
    if (round.maxLetGo && letGoCount >= round.maxLetGo) {
      // Can't let go anymore - show penalty feedback
      setPenaltyFeedback('🚫 No more let-go uses!');
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
      type: 'discard',
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
    
    setStats(prev => ({
      ...prev,
      roundScore: Math.max(0, prev.roundScore + points),
    }));
    
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
      setLetGoCount(prev => prev + 1); // Increment let-go count
    });
  }, [currentRound, letGoCount, continueItemFalling]);

  const handleItemPlaced = useCallback((item: Item, isCorrect: boolean, onWorkSide: boolean) => {
    // Get item position for feedback
    const itemX = (item.position.x as any)._value || 0;
    const itemY = (item.position.y as any)._value || 0;
    const itemSize = ITEM_BASE_SIZE + (item.data.weight - 1) * 15;
    
    // Show drop feedback
    setDropFeedback({
      type: isCorrect ? 'success' : 'error',
      position: { x: itemX + itemSize / 2, y: itemY + itemSize / 2 }
    });
    
    // Update hours - both work and life consume time
    let timeCost = item.data.timeCost;
    
    // Handle dual items - different costs for each side
    if (item.isDual && item.data.dualTimeCost) {
      timeCost = onWorkSide ? item.data.dualTimeCost.work : item.data.dualTimeCost.life;
    }
    
    // Extra time penalty for wrong placement - "Role Confusion"
    if (!isCorrect) {
      // Critical items have severe penalty
      if (item.isCritical) {
        timeCost += 4; // Severe penalty for critical items
        const criticalMessage = item.type === 'work' 
          ? '⚠️ CRITICAL: Missed important work!' 
          : '⚠️ CRITICAL: Neglected essential life!';
        setPenaltyFeedback(criticalMessage);
      } else {
        timeCost += 1.5; // Normal penalty
        const wrongPlacementMessage = item.type === 'work' 
          ? '📱 Bringing work home!' 
          : '🎮 Distracted at work!';
        setPenaltyFeedback(wrongPlacementMessage);
      }
      
      // Flash the hours bar red for wrong placement
      Animated.sequence([
        Animated.timing(hoursFlashAnimation, {
          toValue: 1,
          duration: 150,
          useNativeDriver: false,
        }),
        Animated.timing(hoursFlashAnimation, {
          toValue: 0,
          duration: 150,
          useNativeDriver: false,
        }),
      ]).start();
    }
    
    const newHours = Math.max(0, hoursLeft - timeCost);
    setHoursLeft(newHours);
    
    // Check if hours have run out
    if (newHours <= 0) {
      // End game immediately
      setTimeout(() => endRound(false), 100);
    }
    
    // Animate hours bar
    Animated.sequence([
      Animated.timing(hoursAnimation, {
        toValue: 0.8,
        duration: 100,
        useNativeDriver: false,
      }),
      Animated.timing(hoursAnimation, {
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
      
      // Bonus points if this helps balance the scale
      const newBalance = Math.abs(balance + (onWorkSide ? -1 : 1) * item.data.weight * 10);
      if (newBalance < currentBalance) {
        points += 15; // Bonus for improving balance
      }
      
      // Extra bonus if maintaining perfect balance (within 20 points)
      if (newBalance < 20) {
        points += 10;
      }
      
      if (item.isUrgent && item.urgencyTimer! > 2) {
        points += 20;
        setStats(prev => ({ ...prev, urgentItemsHandled: prev.urgentItemsHandled + 1 }));
      }
      
      setStats(prev => ({ ...prev, correctPlacements: prev.correctPlacements + 1 }));
      haptics.success();
    } else {
      // Penalty for wrong placement
      points = -10 * item.data.weight;
      haptics.error();
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
      } else if (last3.every(t => t === 'wellness')) {
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
    
    setStats(prev => ({ ...prev, roundScore: Math.max(0, prev.roundScore + points) }));
    
    // Update balance
    const balanceChange = (onWorkSide ? -1 : 1) * item.data.weight * 10;
    setBalance(prev => {
      const newBalance = Math.max(-100, Math.min(100, prev + balanceChange));
      
      if (Math.abs(newBalance) >= 70) {
        endRound(false);
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
  }, [currentCombo, hoursAnimation, hoursLeft, lastPlacedTypes, endRound]);

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
        handleItemMissed(item.id, item.isUrgent);
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
        // Calculate actual time cost for dual items
        let requiredHours = item.data.timeCost;
        if (item.isDual && item.data.dualTimeCost) {
          // Use the minimum cost for dragging check
          requiredHours = Math.min(item.data.dualTimeCost.work, item.data.dualTimeCost.life);
        }
        
        if (hoursLeft < requiredHours) {
          haptics.error();
          // Show feedback that there aren't enough hours
          setPenaltyFeedback('⏰ Not enough hours!');
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
        
        // Scale is positioned at bottom: 180 in styles, but relative to game area
        // Since items use coordinates relative to game area (0,0 at top-left of game area)
        // we need to calculate relative to game area height, not screen height
        const gameAreaHeight = height - gameAreaOffset.y;
        const scaleBottom = gameAreaHeight - 180;
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
        
        // Scale is positioned at bottom: 180 in styles, but relative to game area
        // Since items use coordinates relative to game area (0,0 at top-left of game area)
        // we need to calculate relative to game area height, not screen height
        const gameAreaHeight = height - gameAreaOffset.y;
        const scaleBottom = gameAreaHeight - 180;
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
          
          // Calculate actual time cost
          let requiredHours = item.data.timeCost;
          if (item.isDual && item.data.dualTimeCost) {
            requiredHours = droppedOnWork ? item.data.dualTimeCost.work : item.data.dualTimeCost.life;
          }
          
          if (hoursLeft < requiredHours) {
            haptics.error();
            setPenaltyFeedback('⏰ Not enough hours!');
            continueItemFalling(item);
            return;
          }
          
          const droppedOnWork = dropX < scaleCenter;
          const isCorrect = (droppedOnWork && item.type === 'work') || 
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
            handleItemDiscarded(item);
          } else {
            continueItemFalling(item);
          }
        }
      },
    });
  }, [hoursLeft, continueItemFalling, handleItemPlaced, handleItemDiscarded, gameAreaOffset]);

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
    
    if (!completed && Math.abs(balance) >= 70) {
      setGameState('gameOver');
      haptics.heavy();
      
      const totalXP = Math.max(25, Math.min(100, stats.score + stats.roundScore));
      setTimeout(() => {
        onGameComplete(stats.score + stats.roundScore, totalXP);
      }, 2000);
    } else if (!completed && hoursLeft <= 0) {
      setGameState('gameOver');
      haptics.heavy();
      
      const totalXP = Math.max(25, Math.min(100, stats.score + stats.roundScore));
      setTimeout(() => {
        onGameComplete(stats.score + stats.roundScore, totalXP);
      }, 2000);
    } else {
      setStats(prev => ({ ...prev, score: prev.score + prev.roundScore }));
      setGameState('roundComplete');
      haptics.medium();
    }
  }, [balance, hoursLeft, items, onGameComplete, stats]);

  const nextRound = useCallback(() => {
    if (currentRound >= 3) {
      const baseXP = 50;
      const urgencyBonus = Math.floor((stats.urgentItemsHandled / (stats.urgentItemsHandled + stats.missedUrgentItems + 0.1)) * 20);
      const balanceBonus = Math.abs(balance) < 30 ? 20 : 0;
      const comboBonus = stats.perfectBalanceCount * 5;
      const totalXP = Math.min(100, baseXP + urgencyBonus + balanceBonus + comboBonus);
      
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
            handleItemMissed(item.id, item.isUrgent);
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
    hoursLeft,
    stats,
    currentCombo,
    activeDropZone,
    dropFeedback,
    penaltyFeedback,
    isPaused,
    itemsRemaining,
    letGoCount,
    
    // Animations
    scaleRotation,
    hoursAnimation,
    hoursFlashAnimation,
    
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