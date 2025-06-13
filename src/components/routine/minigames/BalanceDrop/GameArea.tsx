import React, { useState } from 'react';
import { View, Text, Animated, PanResponder } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../context/ThemeContext';
import { Item, ItemData } from './types';
import { WORK_ITEMS, LIFE_ITEMS, MAX_TILT, ITEM_BASE_SIZE, CATEGORY_COLORS, SCALE_WIDTH, SCALE_HEIGHT, GAME_DIMENSIONS } from './constants';
import { styles } from './styles';
import { DropFeedback } from './DropFeedback';

const { width, height } = GAME_DIMENSIONS;

interface GameAreaProps {
  items: Item[];
  upcomingItems: ItemData[];
  scaleRotation: Animated.Value;
  createPanResponder: (item: Item) => any;
  activeDropZone: 'work' | 'life' | 'discard' | null;
  setGameAreaOffset?: (offset: { x: number; y: number }) => void;
  dropFeedback?: { type: 'success' | 'error' | 'discard'; position: { x: number; y: number } } | null;
  onDropFeedbackComplete?: () => void;
  hoursLeft?: number;
}

export const GameArea: React.FC<GameAreaProps> = ({
  items,
  upcomingItems,
  scaleRotation,
  createPanResponder,
  activeDropZone,
  setGameAreaOffset,
  dropFeedback,
  onDropFeedbackComplete,
  hoursLeft = 24,
}) => {
  const { theme } = useTheme();

  const getItemSize = (weight: number) => ITEM_BASE_SIZE + (weight - 1) * 15;
  
  const handleLayout = (event: any) => {
    const { x, y } = event.nativeEvent.layout;
    if (setGameAreaOffset) {
      setGameAreaOffset({ x, y });
    }
  };

  return (
    <View style={styles.gameArea} onLayout={handleLayout}>
      {/* Preview Queue */}
      <View style={[styles.previewQueue, { backgroundColor: `${theme.cardBackground}80` }]}>
        <Text style={[styles.previewTitle, { color: theme.textSecondary }]}>Next Up:</Text>
        {upcomingItems.slice(0, 3).map((item, index) => {
          const size = 30 + (item.weight - 1) * 8;
          
          return (
            <View 
              key={index} 
              style={[
                styles.previewItem,
                {
                  backgroundColor: CATEGORY_COLORS[item.category],
                  width: size,
                  height: size,
                }
              ]}
            >
              <Ionicons name={item.icon as any} size={16} color="#FFFFFF" />
              <View style={styles.weightIndicator}>
                {Array.from({ length: item.weight }).map((_, i) => (
                  <View key={i} style={styles.weightDot} />
                ))}
              </View>
            </View>
          );
        })}
      </View>
      
      {/* Falling items */}
      {items.map(item => {
        const panResponder = createPanResponder(item);
        const itemSize = getItemSize(item.data.weight);
        
        // Check if we have enough hours for this item
        let requiredHours = item.data.timeCost;
        if (item.isDual && item.data.dualTimeCost) {
          requiredHours = Math.min(item.data.dualTimeCost.work, item.data.dualTimeCost.life);
        }
        const hasEnoughHours = hoursLeft >= requiredHours;
        
        return (
          <Animated.View
            key={item.id || `item-${Math.random()}`}
            {...panResponder.panHandlers}
            style={[
              styles.item,
              {
                backgroundColor: hasEnoughHours ? 
                  (item.isDual ? '#8B4513' : CATEGORY_COLORS[item.category]) : 
                  '#666666',
                width: itemSize,
                height: itemSize,
                borderWidth: item.isUrgent ? 3 : (item.isCritical ? 4 : 0),
                borderColor: item.isUrgent ? '#FFD700' : (item.isCritical ? '#FF0000' : 'transparent'),
                borderStyle: item.isCritical ? 'dashed' : 'solid',
                left: item.position.x,
                top: item.position.y,
                transform: [{ scale: item.scale }],
                opacity: item.opacity,
              },
            ]}
          >
            <Ionicons name={item.data.icon as any} size={28} color="#FFFFFF" />
            <Text style={styles.itemLabel}>{item.data.label || ''}</Text>
            <View style={styles.itemWeightDots}>
              {Array.from({ length: item.data.weight }).map((_, i) => (
                <View key={i} style={styles.itemDot} />
              ))}
            </View>
            {item.isDual && (
              <View style={styles.dualBadge}>
                <Text style={styles.dualText}>⇄</Text>
              </View>
            )}
            {item.isCritical && (
              <View style={styles.criticalBadge}>
                <Text style={styles.criticalText}>!</Text>
              </View>
            )}
            {item.isUrgent && item.urgencyTimer !== undefined && item.urgencyTimer > 0 && (
              <View style={styles.urgencyBadge}>
                <Text style={styles.urgencyText}>{String(item.urgencyTimer)}</Text>
              </View>
            )}
            {!hasEnoughHours && (
              <View style={styles.noHoursBadge}>
                <Ionicons name="ban" size={24} color="#FF0000" />
              </View>
            )}
          </Animated.View>
        );
      })}
      
      {/* Left Let Go Zone */}
      <Animated.View 
        style={[
          styles.discardZone, 
          styles.discardZoneLeft, 
          { 
            borderColor: activeDropZone === 'discard' ? '#9370DB' : 'rgba(147, 112, 219, 0.5)',
            backgroundColor: activeDropZone === 'discard' ? 'rgba(147, 112, 219, 0.3)' : 'rgba(147, 112, 219, 0.15)',
            transform: [{ scale: activeDropZone === 'discard' ? 1.15 : 1 }],
          }
        ]}
      >
        <Ionicons name="hand-left-outline" size={32} color={activeDropZone === 'discard' ? '#9370DB' : '#7B68EE'} />
        <Text style={[styles.discardText, { color: activeDropZone === 'discard' ? '#9370DB' : '#7B68EE' }]}>Let Go</Text>
      </Animated.View>
      
      {/* Right Let Go Zone */}
      <Animated.View 
        style={[
          styles.discardZone, 
          styles.discardZoneRight, 
          { 
            borderColor: activeDropZone === 'discard' ? '#9370DB' : 'rgba(147, 112, 219, 0.5)',
            backgroundColor: activeDropZone === 'discard' ? 'rgba(147, 112, 219, 0.3)' : 'rgba(147, 112, 219, 0.15)',
            transform: [{ scale: activeDropZone === 'discard' ? 1.15 : 1 }],
          }
        ]}
      >
        <Ionicons name="hand-right-outline" size={32} color={activeDropZone === 'discard' ? '#9370DB' : '#7B68EE'} />
        <Text style={[styles.discardText, { color: activeDropZone === 'discard' ? '#9370DB' : '#7B68EE' }]}>Let Go</Text>
      </Animated.View>
      
      {/* Scale */}
      <View style={styles.scaleContainer}>
        <Animated.View
          style={[
            styles.scale,
            {
              backgroundColor: theme.cardBackground,
              borderColor: (activeDropZone === 'work' || activeDropZone === 'life') ? theme.accent : theme.border,
              borderWidth: (activeDropZone === 'work' || activeDropZone === 'life') ? 4 : 3,
              transform: [
                { rotate: scaleRotation.interpolate({
                  inputRange: [-MAX_TILT, MAX_TILT],
                  outputRange: [`-${MAX_TILT}deg`, `${MAX_TILT}deg`],
                }) },
                { scale: (activeDropZone === 'work' || activeDropZone === 'life') ? 1.05 : 1 }
              ],
            },
          ]}
        >
          <View style={[
            styles.scaleSide, 
            styles.workSide,
            activeDropZone === 'work' && { 
              backgroundColor: '#FF6B6B40',
              borderWidth: 3,
              borderColor: '#FF6B6B'
            }
          ]}>
            <Text style={[
              styles.scaleLabel,
              activeDropZone === 'work' && { 
                color: '#FF6B6B', 
                fontWeight: '900',
                fontSize: 16 
              }
            ]}>WORK</Text>
          </View>
          <View style={styles.scaleDivider} />
          <View style={[
            styles.scaleSide, 
            styles.wellnessSide,
            activeDropZone === 'life' && { 
              backgroundColor: '#4CAF5040',
              borderWidth: 3,
              borderColor: '#4CAF50'
            }
          ]}>
            <Text style={[
              styles.scaleLabel,
              activeDropZone === 'life' && { 
                color: '#4CAF50', 
                fontWeight: '900',
                fontSize: 16 
              }
            ]}>LIFE</Text>
          </View>
        </Animated.View>
        
        <View style={[styles.fulcrum, { backgroundColor: theme.textSecondary }]} />
      </View>
      
      {/* Drop Feedback */}
      {dropFeedback && (
        <DropFeedback
          type={dropFeedback.type}
          position={dropFeedback.position}
          onComplete={onDropFeedbackComplete || (() => {})}
        />
      )}
    </View>
  );
};