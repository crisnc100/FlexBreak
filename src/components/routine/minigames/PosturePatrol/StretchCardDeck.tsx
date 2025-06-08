import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../context/ThemeContext';
import { StretchCard, PostureFigure } from './types';
import { isCardAvailable, getCardCooldownRemaining } from './utils';

interface StretchCardDeckProps {
  cards: StretchCard[];
  selectedFigure: PostureFigure | null;
  onCardSelect: (card: StretchCard) => void;
  onCloseSelection: () => void;
}

export const StretchCardDeck: React.FC<StretchCardDeckProps> = ({
  cards,
  selectedFigure,
  onCardSelect,
  onCloseSelection,
}) => {
  const { theme } = useTheme();
  

  return (
    <View style={[styles.cardDeck, { backgroundColor: (theme.cardBackground || '#FFFFFF') + 'DD' }]}>
      <View style={styles.cardDeckHeader}>
        <Text style={[styles.cardDeckTitle, { color: theme.text || '#000000' }]}>
          {selectedFigure ? 'Select Stretch' : 'Stretch Cards'}
        </Text>
        {selectedFigure && (
          <Text style={[styles.selectedMonsterText, { color: theme.accent }]}>
            Target: {selectedFigure.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </Text>
        )}
      </View>
      
      <View style={styles.cardsContainer}>
        {cards.map((card) => {
          const currentTime = Date.now();
          const isAvailable = isCardAvailable(card, currentTime);
          const cooldownRemaining = getCardCooldownRemaining(card, currentTime);
          const isEffective = selectedFigure && 
            card.effectiveAgainst.includes(selectedFigure.type);
          
          return (
            <TouchableOpacity
              key={card.id}
              style={[
                styles.stretchCard,
                {
                  backgroundColor: isEffective ? '#4CAF50' : (theme.accent || '#6366F1'),
                  opacity: isAvailable ? 1 : 0.5,
                  borderColor: selectedFigure && isEffective ? '#2E7D32' : (theme.border || '#E5E7EB'),
                }
              ]}
              onPress={() => onCardSelect(card)}
              disabled={!isAvailable} // Temporarily allow without selectedFigure
              activeOpacity={0.8}
            >
              <View style={styles.cardIconContainer}>
                <Ionicons 
                  name={card.icon as any} 
                  size={14} 
                  color="#FFFFFF" 
                />
              </View>
              
              <Text style={styles.cardName} numberOfLines={2}>
                {card.name}
              </Text>
              
              {/* Charges indicator */}
              <View style={styles.chargesContainer}>
                {[...Array(card.maxCharges)].map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.chargeIndicator,
                      {
                        backgroundColor: i < card.charges ? '#FFFFFF' : 'rgba(255,255,255,0.3)'
                      }
                    ]}
                  />
                ))}
              </View>
              
              {/* Cooldown overlay */}
              {cooldownRemaining > 0 && (
                <View style={styles.cooldownOverlay}>
                  <Text style={styles.cooldownText}>
                    {Math.ceil(cooldownRemaining)}s
                  </Text>
                </View>
              )}
              
              {/* Effective indicator */}
              {isEffective && selectedFigure && (
                <View style={styles.effectiveIndicator}>
                  <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
      
      {/* Close selection button */}
      {selectedFigure && (
        <TouchableOpacity 
          style={[styles.closeSelectionButton, { backgroundColor: theme.textSecondary }]}
          onPress={onCloseSelection}
        >
          <Text style={styles.closeSelectionText}>Cancel</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  cardDeck: {
    position: 'absolute',
    bottom: 20, // Add space from bottom edge
    left: 8,
    right: 8,
    paddingTop: 8,
    paddingHorizontal: 8,
    paddingBottom: 12,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    maxHeight: 110, // Smaller height
  },
  cardDeckHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardDeckTitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  selectedMonsterText: {
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  cardsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  stretchCard: {
    flex: 1,
    aspectRatio: 1.0,
    borderRadius: 6,
    padding: 4,
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    position: 'relative',
    maxHeight: 65,
  },
  cardIconContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 1,
  },
  cardName: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 10,
  },
  chargesContainer: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 4,
  },
  chargeIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  cooldownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cooldownText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  effectiveIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeSelectionButton: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginTop: 8,
  },
  closeSelectionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});