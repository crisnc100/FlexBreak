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
        
        return (
          <Animated.View
            key={item.id || `item-${Math.random()}`}
            {...panResponder.panHandlers}
            style={[
              styles.item,
              {
                backgroundColor: CATEGORY_COLORS[item.category],
                width: itemSize,
                height: itemSize,
                borderWidth: item.isUrgent ? 3 : 0,
                borderColor: item.isUrgent ? '#FFD700' : 'transparent',
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
            {item.isUrgent && item.urgencyTimer !== undefined && item.urgencyTimer > 0 && (
              <View style={styles.urgencyBadge}>
                <Text style={styles.urgencyText}>{String(item.urgencyTimer)}</Text>
              </View>
            )}
          </Animated.View>
        );
      })}
      
      {/* Central Discard Zone */}
      <Animated.View 
        style={[
          styles.discardZone, 
          styles.discardZoneCenter, 
          { 
            borderColor: activeDropZone === 'discard' ? theme.accent : theme.border,
            backgroundColor: activeDropZone === 'discard' ? `${theme.accent}20` : 'rgba(255, 255, 255, 0.05)',
            transform: [{ scale: activeDropZone === 'discard' ? 1.1 : 1 }],
          }
        ]}
      >
        <Ionicons name="trash-outline" size={24} color={activeDropZone === 'discard' ? theme.accent : theme.textSecondary} />
        <Text style={[styles.discardText, { color: activeDropZone === 'discard' ? theme.accent : theme.textSecondary }]}>Discard</Text>
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