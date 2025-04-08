import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stretch, CustomRestPeriod } from '../../../types';

interface SelectedItemsListProps {
  selectedStretches: (Stretch | CustomRestPeriod)[];
  moveItem: (fromIndex: number, toIndex: number) => void;
  removeItem: (index: number) => void;
  theme: any;
  isDark: boolean;
}

const SelectedItemsList: React.FC<SelectedItemsListProps> = ({
  selectedStretches,
  moveItem,
  removeItem,
  theme,
  isDark
}) => {
  if (selectedStretches.length === 0) {
    return null;
  }

  return (
    <>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Your Routine Order
        </Text>
        <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
          Drag to reorder
        </Text>
      </View>
      
      <View style={styles.selectedItemsContainer}>
        {selectedStretches.map((item, index) => {
          const isRest = 'isRest' in item;
          
          return (
            <View 
              key={`${item.id}-${index}`} 
              style={[
                styles.selectedItemRow, 
                { backgroundColor: isDark ? theme.backgroundLight : '#f8f8f8' }
              ]}
            >
              <View style={styles.selectedItemInfo}>
                <View style={styles.itemIndexContainer}>
                  <Text style={[styles.itemIndexText, { color: theme.textSecondary }]}>
                    {index + 1}
                  </Text>
                </View>
                
                <View style={{ flex: 1 }}>
                  <Text style={[styles.selectedItemName, { color: theme.text }]}>
                    {item.name}
                  </Text>
                  <Text style={[styles.selectedItemDuration, { color: theme.textSecondary }]}>
                    {isRest ? `${item.duration}s rest` : `${item.duration}s${(item as Stretch).bilateral ? ' (both sides)' : ''}`}
                  </Text>
                </View>
              </View>
              
              <View style={styles.selectedItemActions}>
                {index > 0 && (
                  <TouchableOpacity 
                    style={styles.itemActionButton} 
                    onPress={() => moveItem(index, index - 1)}
                  >
                    <Ionicons name="chevron-up" size={20} color={theme.textSecondary} />
                  </TouchableOpacity>
                )}
                
                {index < selectedStretches.length - 1 && (
                  <TouchableOpacity 
                    style={styles.itemActionButton} 
                    onPress={() => moveItem(index, index + 1)}
                  >
                    <Ionicons name="chevron-down" size={20} color={theme.textSecondary} />
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity 
                  style={styles.itemActionButton} 
                  onPress={() => removeItem(index)}
                >
                  <Ionicons name="close" size={20} color="#FF5252" />
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  sectionSubtitle: {
    fontSize: 12,
  },
  selectedItemsContainer: {
    marginBottom: 16,
  },
  selectedItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    justifyContent: 'space-between',
  },
  selectedItemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  itemIndexContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemIndexText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  selectedItemName: {
    fontSize: 14,
    fontWeight: '500',
  },
  selectedItemDuration: {
    fontSize: 12,
  },
  selectedItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemActionButton: {
    padding: 6,
  },
});

export default SelectedItemsList; 