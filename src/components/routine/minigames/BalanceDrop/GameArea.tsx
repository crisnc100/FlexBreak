import React, { useState } from 'react';
import { View, Text, Animated, PanResponder } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../context/ThemeContext';
import { Item, ItemData } from './types';
import { WORK_ITEMS, LIFE_ITEMS, ESSENTIAL_ITEMS, MAX_TILT, ITEM_BASE_SIZE, CATEGORY_COLORS, SCALE_WIDTH, SCALE_HEIGHT, GAME_DIMENSIONS } from './constants';
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
  dropFeedback?: { type: 'success' | 'error' | 'skip'; position: { x: number; y: number }; message?: string } | null;
  onDropFeedbackComplete?: () => void;
  energyLeft?: number;
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
  energyLeft = 100,
}) => {
  const { theme, isDark, isSunset } = useTheme();

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
                  backgroundColor: item.isCritical ? '#9370DB' : 
                                 item.energyRestore ? '#4CAF50' :
                                 item.isFlexible ? '#FF6B6B' :
                                 CATEGORY_COLORS[item.category],
                  width: size,
                  height: size,
                  borderWidth: item.isCritical ? 2 : 0,
                  borderColor: '#FFD700',
                }
              ]}
            >
              <Ionicons name={item.icon as any} size={16} color="#FFFFFF" />
              {item.isCritical && (
                <View style={{ position: 'absolute', top: -5, right: -5, backgroundColor: '#FFD700', borderRadius: 6, padding: 1 }}>
                  <Ionicons name="alert" size={10} color="#000" />
                </View>
              )}
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
        
        // Check if we have enough energy for this item
        let requiredEnergy = item.data.energyCost;
        if (item.isFlexible && item.data.flexibleEnergyCost) {
          requiredEnergy = Math.min(item.data.flexibleEnergyCost.work, item.data.flexibleEnergyCost.life);
        }
        const hasEnoughEnergy = energyLeft >= requiredEnergy;
        
        return (
          <Animated.View
            key={item.id || `item-${Math.random()}`}
            {...panResponder.panHandlers}
            style={[
              styles.item,
              {
                backgroundColor: hasEnoughEnergy ? 
                  (item.type === 'neutral' ? '#9370DB' : // Purple for neutral/essential
                  item.data.energyRestore ? '#4CAF50' : // Green for rest items
                  CATEGORY_COLORS[item.category]) : // Use natural category color
                  '#666666',
                width: itemSize,
                height: itemSize,
                borderWidth: item.type === 'neutral' ? 3 : 
                             item.data.energyRestore ? 2 : 0,
                borderColor: item.type === 'neutral' ? '#FFD700' : // Gold border for essential
                            item.data.energyRestore ? '#00FF00' : 'transparent', // Bright green for rest
                borderStyle: item.type === 'neutral' ? 'solid' : 'solid',
                left: item.position.x,
                top: item.position.y,
                transform: [{ scale: item.scale }],
                opacity: item.opacity,
                overflow: 'visible',
              },
            ]}
          >
            <Ionicons name={item.data.icon as any} size={28} color="#FFFFFF" />
            <Text style={styles.itemLabel}>{item.data.label || ''}</Text>
            {/* Show description on larger items */}
            {item.data.weight >= 3 && item.data.description && (
              <Text style={styles.itemDescription}>{item.data.description}</Text>
            )}
            <View style={styles.itemWeightDots}>
              {Array.from({ length: item.data.weight }).map((_, i) => (
                <View key={i} style={styles.itemDot} />
              ))}
            </View>
            {/* Flexible item badge */}
            {item.isFlexible && !item.data.energyRestore && (
              <View style={{
                position: 'absolute',
                top: 4,
                left: 4,
                backgroundColor: '#8B4513',
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 8,
                flexDirection: 'row',
                alignItems: 'center',
              }}>
                <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '700', marginRight: 2 }}>FLEXIBLE</Text>
                <Text style={{ color: '#FFFFFF', fontSize: 12 }}>⇄</Text>
              </View>
            )}
            {item.data.energyRestore && (
              <View style={{
                position: 'absolute',
                top: 4,
                left: 4,
                backgroundColor: '#00C853',
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 8,
              }}>
                <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '700' }}>REST +{item.data.energyRestore}</Text>
              </View>
            )}
            {!hasEnoughEnergy && (
              <View style={styles.noEnergyBadge}>
                <Ionicons name="ban" size={24} color="#FF0000" />
              </View>
            )}
            {/* Essential item indicators */}
            {item.type === 'neutral' && (
              <>
                <View style={[styles.urgencyBadge, { backgroundColor: '#FFD700', top: -10, right: -10 }]}>
                  <Ionicons name="alert" size={14} color="#000" />
                </View>
                <View style={{
                  position: 'absolute',
                  top: 4,
                  left: 4,
                  backgroundColor: '#FFD700',
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 8,
                }}>
                  <Text style={{ color: '#000', fontSize: 10, fontWeight: '900' }}>ESSENTIAL</Text>
                </View>
              </>
            )}
            {/* Energy cost preview - only show if not already showing REST badge */}
            {!item.data.energyRestore && (
              <View style={[styles.energyCostBadge, { 
                backgroundColor: '#FF9800' 
              }]}>
                <Text style={styles.energyCostText}>
                  -{requiredEnergy}
                </Text>
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
            (isDark || isSunset) && {
              backgroundColor: '#FF6B6B30', // More vibrant in dark/sunset
            },
            activeDropZone === 'work' && { 
              backgroundColor: (isDark || isSunset) ? '#FF6B6B60' : '#FF6B6B40',
              borderWidth: 3,
              borderColor: '#FF6B6B'
            }
          ]}>
            <Text style={[
              styles.scaleLabel,
              (isDark || isSunset) && {
                color: '#FF9999', // Brighter label in dark/sunset
              },
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
            (isDark || isSunset) && {
              backgroundColor: '#4CAF5030', // More vibrant in dark/sunset
            },
            activeDropZone === 'life' && { 
              backgroundColor: (isDark || isSunset) ? '#4CAF5060' : '#4CAF5040',
              borderWidth: 3,
              borderColor: '#4CAF50'
            }
          ]}>
            <Text style={[
              styles.scaleLabel,
              (isDark || isSunset) && {
                color: '#81C784', // Brighter label in dark/sunset
              },
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