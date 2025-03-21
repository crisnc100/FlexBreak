import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TabType } from '../../hooks/progress/useProgressTabManagement';

interface TabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

/**
 * Tab navigation component for the Progress Screen
 */
export const TabNavigation: React.FC<TabNavigationProps> = ({ 
  activeTab, 
  onTabChange 
}) => {
  return (
    <View style={styles.tabBar}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'stats' && styles.activeTab]}
        onPress={() => onTabChange('stats')}
      >
        <Ionicons
          name="stats-chart"
          size={24}
          color={activeTab === 'stats' ? '#4CAF50' : '#999'}
        />
        <Text style={[styles.tabText, activeTab === 'stats' && styles.activeTabText]}>
          Stats
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.tab, activeTab === 'achievements' && styles.activeTab]}
        onPress={() => onTabChange('achievements')}
      >
        <Ionicons
          name="trophy"
          size={24}
          color={activeTab === 'achievements' ? '#4CAF50' : '#999'}
        />
        <Text style={[styles.tabText, activeTab === 'achievements' && styles.activeTabText]}>
          Achievements
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.tab, activeTab === 'challenges' && styles.activeTab]}
        onPress={() => onTabChange('challenges')}
      >
        <Ionicons
          name="flag"
          size={24}
          color={activeTab === 'challenges' ? '#4CAF50' : '#999'}
        />
        <Text style={[styles.tabText, activeTab === 'challenges' && styles.activeTabText]}>
          Challenges
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.tab, activeTab === 'rewards' && styles.activeTab]}
        onPress={() => onTabChange('rewards')}
      >
        <Ionicons
          name="gift"
          size={24}
          color={activeTab === 'rewards' ? '#4CAF50' : '#999'}
        />
        <Text style={[styles.tabText, activeTab === 'rewards' && styles.activeTabText]}>
          Rewards
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    paddingVertical: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#4CAF50',
  },
  tabText: {
    fontSize: 12,
    marginTop: 4,
    color: '#999',
  },
  activeTabText: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
});

export default TabNavigation; 