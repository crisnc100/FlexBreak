import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PlacedPad, PadType } from './types';
import { PAD_CONFIG, UPGRADE_CONFIG, getUpgradeCost, getSellValue } from './constants';

interface UpgradeMenuProps {
  visible: boolean;
  pad: PlacedPad | null;
  energy: number;
  theme: any;
  onClose: () => void;
  onUpgrade: (padId: number) => void;
  onSell: (padId: number) => void;
}

export const UpgradeMenu: React.FC<UpgradeMenuProps> = ({
  visible,
  pad,
  energy,
  theme,
  onClose,
  onUpgrade,
  onSell
}) => {
  if (!pad) return null;

  const padConfig = PAD_CONFIG[pad.padType];
  const upgradeConfig = UPGRADE_CONFIG[pad.padType];
  const currentLevel = upgradeConfig.levels[pad.level];
  const nextLevel = upgradeConfig.levels[pad.level + 1];
  const upgradeCost = nextLevel ? getUpgradeCost(pad.padType, pad.level) : 0;
  const sellValue = getSellValue(pad.padType, pad.level);
  const canUpgrade = nextLevel && energy >= upgradeCost;
  const isMaxLevel = pad.level >= 3;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.menuContainer, { backgroundColor: theme.cardBackground }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.padInfo}>
              <Image 
                source={padConfig.image}
                style={styles.padImage}
                resizeMode="contain"
              />
              <View>
                <Text style={[styles.padName, { color: theme.text }]}>
                  {padConfig.name}
                </Text>
                <Text style={[styles.currentLevel, { color: padConfig.color }]}>
                  Level {pad.level}: {currentLevel.name}
                </Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={onClose}
            >
              <Ionicons name="close" size={24} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Current Stats */}
          <View style={styles.statsSection}>
            <Text style={[styles.sectionTitle, { color: theme.accent }]}>
              Current Benefits
            </Text>
            <Text style={[styles.description, { color: theme.textSecondary }]}>
              {currentLevel.description}
            </Text>
          </View>

          {/* Upgrade Section */}
          {!isMaxLevel ? (
            <View style={styles.upgradeSection}>
              <Text style={[styles.sectionTitle, { color: theme.success }]}>
                Next Upgrade
              </Text>
              <View style={styles.upgradePreview}>
                <Text style={[styles.upgradeName, { color: theme.text }]}>
                  Level {pad.level + 1}: {nextLevel.name}
                </Text>
                <Text style={[styles.upgradeDescription, { color: theme.textSecondary }]}>
                  {nextLevel.description}
                </Text>
                <View style={styles.upgradeCost}>
                  <Ionicons name="flash" size={16} color={theme.accent} />
                  <Text style={[styles.costText, { color: theme.accent }]}>
                    {upgradeCost} Energy
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.maxLevelSection}>
              <Text style={[styles.sectionTitle, { color: theme.success }]}>
                ✨ Maximum Level Reached!
              </Text>
              <Text style={[styles.description, { color: theme.textSecondary }]}>
                This pad has reached its full wellness potential.
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.buttonSection}>
            {!isMaxLevel && (
              <TouchableOpacity 
                style={[
                  styles.upgradeButton, 
                  { 
                    backgroundColor: canUpgrade ? theme.success : theme.textSecondary,
                    opacity: canUpgrade ? 1 : 0.5
                  }
                ]}
                onPress={() => canUpgrade && onUpgrade(pad.slotId)}
                disabled={!canUpgrade}
              >
                <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
                <Text style={styles.buttonText}>
                  Upgrade ({upgradeCost}⚡)
                </Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={[styles.sellButton, { backgroundColor: theme.error }]}
              onPress={() => onSell(pad.slotId)}
            >
              <Ionicons name="trash" size={20} color="#FFFFFF" />
              <Text style={styles.buttonText}>
                Sell (+{sellValue}⚡)
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  padInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  padImage: {
    width: 50,
    height: 50,
    marginRight: 12,
  },
  padName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  currentLevel: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  closeButton: {
    padding: 8,
  },
  statsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  upgradeSection: {
    marginBottom: 20,
  },
  upgradePreview: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    padding: 12,
  },
  upgradeName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  upgradeDescription: {
    fontSize: 14,
    marginBottom: 8,
  },
  upgradeCost: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  costText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  maxLevelSection: {
    marginBottom: 20,
  },
  buttonSection: {
    gap: 12,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  sellButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});