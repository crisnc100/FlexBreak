import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as storageDiagnostics from '../utils/storageDiagnostics';
import * as performance from '../utils/performance';

interface StorageStats {
  totalSize: number;
  itemCount: number;
  largestItems: Array<{ key: string, size: number }>;
}

const DiagnosticsScreen = ({ navigation }: { navigation: { goBack: () => void } }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
  const [performanceStats, setPerformanceStats] = useState<any>(null);
  const [optimizationResults, setOptimizationResults] = useState<any>(null);

  // Load initial stats
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const stats = await storageDiagnostics.getStorageStats();
      setStorageStats(stats);
      setPerformanceStats(performance.getAllOperationStats());
    } catch (error) {
      console.error('Error loading diagnostics data:', error);
      Alert.alert('Error', 'Failed to load diagnostics data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOptimizeStorage = async () => {
    Alert.alert(
      'Optimize Storage',
      'This will prune old routine history and limit XP history entries. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Optimize',
          onPress: async () => {
            setIsLoading(true);
            try {
              const results = await storageDiagnostics.optimizeStorage();
              setOptimizationResults(results);
              
              // Refresh storage stats
              const stats = await storageDiagnostics.getStorageStats();
              setStorageStats(stats);
            } catch (error) {
              console.error('Error optimizing storage:', error);
              Alert.alert('Error', 'Failed to optimize storage');
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleClearPerformanceData = () => {
    performance.clearPerformanceData();
    setPerformanceStats(performance.getAllOperationStats());
    Alert.alert('Success', 'Performance data cleared');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="close" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>App Diagnostics</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={loadData}>
          <Ionicons name="refresh" size={24} color="#4CAF50" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading diagnostics data...</Text>
        </View>
      ) : (
        <ScrollView style={styles.content}>
          {/* Storage Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Storage Usage</Text>
            
            {storageStats ? (
              <>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Total Size:</Text>
                  <Text style={styles.statValue}>
                    {storageDiagnostics.formatBytes(storageStats.totalSize)}
                  </Text>
                </View>
                
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Items:</Text>
                  <Text style={styles.statValue}>{storageStats.itemCount}</Text>
                </View>
                
                <Text style={styles.subsectionTitle}>Largest Items</Text>
                {storageStats.largestItems.map((item, index) => (
                  <View key={index} style={styles.itemRow}>
                    <Text style={styles.itemKey} numberOfLines={1} ellipsizeMode="middle">
                      {item.key}
                    </Text>
                    <Text style={styles.itemSize}>
                      {storageDiagnostics.formatBytes(item.size)}
                    </Text>
                  </View>
                ))}
                
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleOptimizeStorage}
                >
                  <Ionicons name="trash-outline" size={18} color="#FFF" style={styles.buttonIcon} />
                  <Text style={styles.buttonText}>Optimize Storage</Text>
                </TouchableOpacity>
                
                {optimizationResults && (
                  <View style={styles.optimizationResults}>
                    <Text style={styles.optimizationTitle}>Optimization Results</Text>
                    <Text style={styles.optimizationText}>
                      {`• Removed ${optimizationResults.routinesRemoved} routine entries\n`}
                      {`• Removed ${optimizationResults.xpEntriesRemoved} XP history entries\n`}
                      {`• Space saved: ${storageDiagnostics.formatBytes(
                        optimizationResults.sizeBefore - optimizationResults.sizeAfter
                      )}`}
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <Text style={styles.noDataText}>No storage data available</Text>
            )}
          </View>
          
          {/* Performance Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Performance Metrics</Text>
            
            {performanceStats && Object.keys(performanceStats).length > 0 ? (
              <>
                {Object.entries(performanceStats).map(([operation, stats]: [string, any]) => (
                  <View key={operation} style={styles.performanceItem}>
                    <Text style={styles.operationName}>{operation}</Text>
                    <View style={styles.performanceStats}>
                      <View style={styles.performanceStatRow}>
                        <Text style={styles.performanceLabel}>Count:</Text>
                        <Text style={styles.performanceValue}>{stats.count}</Text>
                      </View>
                      <View style={styles.performanceStatRow}>
                        <Text style={styles.performanceLabel}>Avg:</Text>
                        <Text style={[
                          styles.performanceValue,
                          stats.average > 300 ? styles.slowPerformance : {}
                        ]}>
                          {stats.average.toFixed(2)}ms
                        </Text>
                      </View>
                      <View style={styles.performanceStatRow}>
                        <Text style={styles.performanceLabel}>Min/Max:</Text>
                        <Text style={styles.performanceValue}>
                          {stats.min}ms / {stats.max}ms
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
                
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#FF9800' }]}
                  onPress={handleClearPerformanceData}
                >
                  <Ionicons name="refresh-outline" size={18} color="#FFF" style={styles.buttonIcon} />
                  <Text style={styles.buttonText}>Clear Performance Data</Text>
                </TouchableOpacity>
              </>
            ) : (
              <Text style={styles.noDataText}>No performance data collected yet</Text>
            )}
          </View>
          
          {/* System Info Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>System Information</Text>
            
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Platform:</Text>
              <Text style={styles.statValue}>{Platform.OS}</Text>
            </View>
            
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Version:</Text>
              <Text style={styles.statValue}>{Platform.Version}</Text>
            </View>
            
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Device:</Text>
              <Text style={styles.statValue}>
                {Platform.OS === 'ios' 
                  ? Platform.constants?.systemName || 'iOS' 
                  : Platform.constants && 'Brand' in Platform.constants 
                    ? Platform.constants.Brand 
                    : 'Android'}
              </Text>
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  backButton: {
    padding: 8,
  },
  refreshButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#4CAF50',
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    color: '#666',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statLabel: {
    fontSize: 16,
    color: '#666',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemKey: {
    flex: 1,
    fontSize: 14,
    color: '#666',
  },
  itemSize: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 16,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  noDataText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginVertical: 16,
  },
  performanceItem: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  operationName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  performanceStats: {
    marginLeft: 8,
  },
  performanceStatRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  performanceLabel: {
    width: 70,
    fontSize: 14,
    color: '#666',
  },
  performanceValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  slowPerformance: {
    color: '#F44336',
  },
  optimizationResults: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
  },
  optimizationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 8,
  },
  optimizationText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
});

export default DiagnosticsScreen; 