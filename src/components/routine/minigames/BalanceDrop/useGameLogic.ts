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
  const [upcomingItems, setUpcomingItems] = useState<ItemData[]>([]);
  const [balance, setBalance] = useState(0);
  const [energy, setEnergy] = useState(MAX_ENERGY);
  const [activeDropZone, setActiveDropZone] = useState<'work' | 'life' | 'discard' | null>(null);
  const [gameAreaOffset, setGameAreaOffset] = useState({ x: 0, y: 0 });
  const [dropFeedback, setDropFeedback] = useState<{ type: 'success' | 'error' | 'discard'; position: { x: number; y: number } } | null>(null);
  
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
  const energyAnimation = useRef(new Animated.Value(1)).current;
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

  const startRound = useCallback((roundNumber: number) => {
    const round = roundNumber === 0 ? TUTORIAL_ROUND : ROUNDS[roundNumber - 1];
    setCurrentRound(roundNumber);
    setStats(prev => ({ ...prev, roundScore: 0, correctPlacements: 0, urgentItemsHandled: 0, missedUrgentItems: 0, perfectBalanceCount: 0 }));
    setTimeLeft(round.duration);
    setItems([]);
    setUpcomingItems([]);
    setBalance(0);
    setEnergy(MAX_ENERGY);
    setLastPlacedTypes([]);
    setCurrentCombo(null);
    spawnedCount.current = 0;
    previewQueue.current = [];
    
    // Generate preview items
    for (let i = 0; i < 3; i++) {
      const isWork = Math.random() < 0.5;
      const itemList = isWork ? WORK_ITEMS : LIFE_ITEMS;
      const itemData = itemList[Math.floor(Math.random() * itemList.length)];
      previewQueue.current.push(itemData);
    }
    setUpcomingItems([...previewQueue.current]);
    
    setGameState(roundNumber === 0 ? 'tutorial' : 'playing');
    
    // Start spawning items
    startSpawning(round);
    
    // Start game timer
    startTimer(round.duration);
  }, []);

  const startSpawning = useCallback((round: Round) => {
    // Spawn first item immediately
    if (spawnedCount.current < round.itemCount) {
      spawnItem(round);
    }
    
    // Set up interval for remaining items
    spawnInterval.current = setInterval(() => {
      if (spawnedCount.current < round.itemCount) {
        spawnItem(round);
      } else {
        if (spawnInterval.current) {
          clearInterval(spawnInterval.current);
          spawnInterval.current = null;
        }
      }
    }, round.spawnRate);
  }, []);

  const spawnItem = useCallback((round: Round) => {
    let itemData: ItemData;
    if (previewQueue.current.length > 0) {
      itemData = previewQueue.current.shift()!;
      
      // Add new item to preview queue
      const isWork = Math.random() < 0.5;
      const itemList = isWork ? WORK_ITEMS : LIFE_ITEMS;
      const newItem = itemList[Math.floor(Math.random() * itemList.length)];
      previewQueue.current.push(newItem);
      setUpcomingItems([...previewQueue.current]);
    } else {
      const isWork = Math.random() < 0.5;
      const itemList = isWork ? WORK_ITEMS : LIFE_ITEMS;
      itemData = itemList[Math.floor(Math.random() * itemList.length)];
    }
    
    const id = `item-${itemIdCounter.current++}`;
    const isWork = WORK_ITEMS.includes(itemData);
    const isUrgent = Math.random() < round.urgentItemChance;
    
    const itemSize = ITEM_BASE_SIZE + (itemData.weight - 1) * 15;
    const startX = Math.random() * (width - itemSize - 40) + 20;
    const position = new Animated.ValueXY({ x: startX, y: -itemSize });
    
    const newItem: Item = {
      id,
      type: isWork ? 'work' : 'life',
      category: itemData.category,
      data: itemData,
      position,
      opacity: new Animated.Value(1),
      scale: new Animated.Value(1),
      isUrgent,
      urgencyTimer: isUrgent ? 5 : undefined,
    };
    
    
    setItems(prev => [...prev, newItem]);
    spawnedCount.current += 1;
    
    // Animate falling
    Animated.timing(position, {
      toValue: { x: startX, y: height - 100 },
      duration: round.fallSpeed,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        handleItemMissed(id, isUrgent);
      }
    });
  }, []);

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
  }, [items]);

  const handleItemDiscarded = useCallback((item: Item) => {
    // Get item position for feedback
    const itemX = (item.position.x as any)._value || 0;
    const itemY = (item.position.y as any)._value || 0;
    const itemSize = ITEM_BASE_SIZE + (item.data.weight - 1) * 15;
    
    // Show drop feedback
    setDropFeedback({
      type: 'discard',
      position: { x: itemX + itemSize / 2, y: itemY + itemSize / 2 }
    });
    
    // Strategic discard - evaluate if it helps balance
    const currentBalance = Math.abs(balance);
    let points = 0;
    
    // If discarding helps prevent imbalance, it's a good move
    if (currentBalance > 60) {
      // Scale is very imbalanced - discarding is strategic
      points = 5; // Small reward for smart play
    } else if (currentBalance > 40) {
      // Scale is getting imbalanced - neutral move
      points = 0;
    } else {
      // Scale is balanced - small penalty for unnecessary discard
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
    });
  }, []);

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
    
    // Update energy
    const netEnergy = -item.data.energyCost + (item.data.energyRestore || 0);
    setEnergy(prev => Math.max(0, Math.min(MAX_ENERGY, prev + netEnergy)));
    
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
      
      if (Math.abs(newBalance) >= 80) {
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
    });
    
    // Clear combo after display
    if (currentCombo) {
      setTimeout(() => setCurrentCombo(null), 2000);
    }
  }, [currentCombo, energyAnimation, lastPlacedTypes]);

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
        if (energy < item.data.energyCost) {
          haptics.error();
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
        // Check central discard zone (below the scale)
        // Discard zone is at bottom: 20 with height: 100, relative to game area
        const discardBottom = gameAreaHeight - 20;
        const discardTop = discardBottom - 100;
        
        if (itemCenterX > width / 2 - 50 && itemCenterX < width / 2 + 50 && 
            itemCenterY > discardTop && itemCenterY < discardBottom) {
          setActiveDropZone('discard');
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
          
          if (energy < item.data.energyCost) {
            haptics.error();
            continueItemFalling(item);
            return;
          }
          
          const droppedOnWork = dropX < scaleCenter;
          const isCorrect = (droppedOnWork && item.type === 'work') || 
                           (!droppedOnWork && item.type === 'life');
          
          handleItemPlaced(item, isCorrect, droppedOnWork);
        } else {
          // Check for central discard zone
          // Discard zone is at bottom: 20 with height: 100, relative to game area
          const discardBottom = gameAreaHeight - 20;
          const discardTop = discardBottom - 100;
          
          const discardZone = dropX > width / 2 - 50 && dropX < width / 2 + 50 && 
                             dropY > discardTop && dropY < discardBottom;
          
          if (discardZone) {
            handleItemDiscarded(item);
          } else {
            continueItemFalling(item);
          }
        }
      },
    });
  }, [energy, continueItemFalling, handleItemPlaced, handleItemDiscarded, gameAreaOffset]);

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
    
    if (!completed && Math.abs(balance) >= 80) {
      setGameState('gameOver');
      haptics.heavy();
      
      const totalXP = Math.max(25, Math.min(100, stats.score + stats.roundScore));
      setTimeout(() => {
        onGameComplete(stats.score + stats.roundScore, totalXP);
      }, 2000);
    } else if (!completed && energy <= 0) {
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
  }, [balance, energy, items, onGameComplete, stats]);

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
  }, [startRound]);

  const clearDropFeedback = useCallback(() => {
    setDropFeedback(null);
  }, []);

  return {
    // State
    gameState,
    setGameState,
    currentRound,
    timeLeft,
    items,
    upcomingItems,
    balance,
    energy,
    stats,
    currentCombo,
    activeDropZone,
    dropFeedback,
    
    // Animations
    scaleRotation,
    energyAnimation,
    
    // Functions
    startRound,
    nextRound,
    skipTutorial,
    createPanResponder,
    setGameAreaOffset,
    clearDropFeedback,
  };
};