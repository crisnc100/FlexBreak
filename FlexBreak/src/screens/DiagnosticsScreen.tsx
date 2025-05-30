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
  Platform,
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as storageDiagnostics from '../utils/performance/storageDiagnostics';
import * as performance from '../utils/performance/performance';
import * as appHealthCheck from '../utils/performance/appHealthCheck';
import { AppHealthScore, AppHealthIssue } from '../utils/performance/appHealthCheck';

interface StorageStats {
  totalSize: number;
  itemCount: number;
  largestItems: Array<{ key: string, size: number }>;
}

const DiagnosticsScreen = ({ navigation }: { navigation: { goBack: () => void } }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
  const [performanceStats, setPerformanceStats] = useState<any>(null);
  const [optimizationResults, setOptimizationResults] = useState<any>(null);
  const [appHealth, setAppHealth] = useState<AppHealthScore | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Animated values for score display
  const scoreAnim = useState(new Animated.Value(0))[0];
  const scoreRotation = scoreAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0deg', '180deg']
  });
  
  // Load initial stats
  useEffect(() => {
    loadData();
  }, []);
  
  // Animate score when app health changes
  useEffect(() => {
    if (appHealth) {
      Animated.timing(scoreAnim, {
        toValue: appHealth.score,
        duration: 1000,
        useNativeDriver: true
      }).start();
    }
  }, [appHealth]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Get storage stats
      const stats = await storageDiagnostics.getStorageStats();
      setStorageStats(stats);
      
      // Get performance stats
      setPerformanceStats(performance.getAllOperationStats());
      
      // Get app health score
      const health = await appHealthCheck.getAppHealthScore();
      setAppHealth(health);
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
              
              // Refresh app health
              const health = await appHealthCheck.getAppHealthScore();
              setAppHealth(health);
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
  
  const handleFixAllIssues = async () => {
    setIsFixing(true);
    try {
      const result = await appHealthCheck.fixAllIssues();
      
      if (result.success) {
        // Refresh all data
        const stats = await storageDiagnostics.getStorageStats();
        setStorageStats(stats);
        
        setPerformanceStats(performance.getAllOperationStats());
        
        const health = await appHealthCheck.getAppHealthScore();
        setAppHealth(health);
        
        Alert.alert(
          'Success!', 
          `App health improved from ${result.beforeScore}% to ${result.afterScore}%`
        );
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      console.error('Error fixing issues:', error);
      Alert.alert('Error', 'Failed to fix issues');
    } finally {
      setIsFixing(false);
    }
  };
  
  const handleFixIssue = async (issue: AppHealthIssue) => {
    setIsFixing(true);
    try {
      if (issue.fixAction === 'optimizeStorage') {
        const result = await appHealthCheck.fixStorageIssues();
        if (result.success) {
          // Refresh data
          const stats = await storageDiagnostics.getStorageStats();
          setStorageStats(stats);
          
          const health = await appHealthCheck.getAppHealthScore();
          setAppHealth(health);
          
          Alert.alert('Success!', result.message);
        } else {
          Alert.alert('Error', result.message);
        }
      } else if (issue.fixAction === 'clearPerformanceData') {
        performance.clearPerformanceData();
        setPerformanceStats(performance.getAllOperationStats());
        
        // Refresh health
        const health = await appHealthCheck.getAppHealthScore();
        setAppHealth(health);
        
        Alert.alert('Success', 'Performance data reset successfully');
      }
    } catch (error) {
      console.error('Error fixing issue:', error);
      Alert.alert('Error', 'Failed to fix issue');
    } finally {
      setIsFixing(false);
    }
  };

  // Render health score gauge
  const renderHealthGauge = () => {
    if (!appHealth) return null;
    
    let color = '#4CAF50'; // Green for good
    if (appHealth.score < 50) {
      color = '#F44336'; // Red for bad
    } else if (appHealth.score < 80) {
      color = '#FF9800'; // Orange for moderate
    }
    
    return (
      <View style={styles.gaugeContainer}>
        <View style={styles.gauge}>
          <View style={styles.gaugeBackground}>
            <Animated.View 
              style={[
                styles.gaugeFill, 
                { 
                  backgroundColor: color,
                  width: `${appHealth.score}%` 
                }
              ]} 
            />
          </View>
          <Text style={styles.gaugeScore}>{appHealth.score}%</Text>
        </View>
        <Text style={styles.gaugeLabel}>App Health Score</Text>
        <Text style={styles.recommendationText}>
          {appHealthCheck.getHealthRecommendation(appHealth.score)}
        </Text>
      </View>
    );
  };
  
  // Render issues
  const renderIssues = () => {
    if (!appHealth || appHealth.issues.length === 0) {
      return (
        <View style={styles.noIssuesContainer}>
          <Ionicons name="checkmark-circle" size={48} color="#4CAF50" />
          <Text style={styles.noIssuesText}>No issues detected!</Text>
        </View>
      );
    }
    
    return (
      <View style={styles.issuesContainer}>
        <Text style={styles.issuesTitle}>Detected Issues</Text>
        {appHealth.issues.map((issue, index) => (
          <View key={issue.id} style={styles.issueCard}>
            <View style={styles.issueHeader}>
              <Ionicons 
                name={
                  issue.type === 'critical' ? 'alert-circle' :
                  issue.type === 'warning' ? 'warning' : 'information-circle'
                } 
                size={24} 
                color={
                  issue.type === 'critical' ? '#F44336' :
                  issue.type === 'warning' ? '#FF9800' : '#2196F3'
                } 
                style={styles.issueIcon}
              />
              <Text style={styles.issueTitle}>{issue.title}</Text>
            </View>
            <Text style={styles.issueDescription}>{issue.description}</Text>
            {issue.autoFixAvailable && (
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  { backgroundColor: '#4CAF50' }
                ]}
                onPress={() => handleFixIssue(issue)}
                disabled={isFixing}
              >
                <Ionicons name="construct-outline" size={18} color="#FFF" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>Fix This Issue</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
        
        <TouchableOpacity
          style={[
            styles.actionButton,
            { backgroundColor: '#2196F3', marginTop: 16 }
          ]}
          onPress={handleFixAllIssues}
          disabled={isFixing}
        >
          <Ionicons name="rocket-outline" size={18} color="#FFF" style={styles.buttonIcon} />
          <Text style={styles.buttonText}>Fix All Issues</Text>
        </TouchableOpacity>
      </View>
    );
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
        <Text style={styles.headerTitle}>Diagnostics</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={loadData} disabled={isLoading}>
          <Ionicons name="refresh" size={24} color="#4CAF50" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Analyzing app health...</Text>
        </View>
      ) : (
        <ScrollView style={styles.content}>
          {/* App Health Section */}
          <View style={styles.section}>
            {renderHealthGauge()}
            {renderIssues()}
          </View>
          
          {/* Toggle for advanced section */}
          <TouchableOpacity 
            style={styles.advancedToggle}
            onPress={() => setShowAdvanced(!showAdvanced)}
          >
            <Text style={styles.advancedToggleText}>
              {showAdvanced ? 'Hide Technical Details' : 'Show Technical Details'}
            </Text>
            <Ionicons 
              name={showAdvanced ? 'chevron-up' : 'chevron-down'} 
              size={18} 
              color="#666" 
            />
          </TouchableOpacity>
          
          {showAdvanced && (
            <>
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
            </>
          )}
        </ScrollView>
      )}
      
      {isFixing && (
        <View style={styles.fixingOverlay}>
          <ActivityIndicator size="large" color="#FFF" />
          <Text style={styles.fixingText}>Fixing issues...</Text>
        </View>
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
  gaugeContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  gauge: {
    width: '100%',
    height: 40,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  gaugeBackground: {
    flex: 1,
    height: 20,
    backgroundColor: '#E0E0E0',
    borderRadius: 10,
    overflow: 'hidden',
  },
  gaugeFill: {
    height: '100%',
    borderRadius: 10,
  },
  gaugeScore: {
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 12,
    color: '#333',
  },
  gaugeLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  recommendationText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  issuesContainer: {
    marginTop: 20,
  },
  issuesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  issueCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  issueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  issueIcon: {
    marginRight: 8,
  },
  issueTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  issueDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  noIssuesContainer: {
    alignItems: 'center',
    marginTop: 20,
    padding: 16,
  },
  noIssuesText: {
    fontSize: 16,
    color: '#4CAF50',
    marginTop: 8,
    fontWeight: 'bold',
  },
  advancedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginBottom: 16,
  },
  advancedToggleText: {
    fontSize: 16,
    color: '#666',
    marginRight: 8,
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
  fixingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fixingText: {
    color: '#fff',
    fontSize: 18,
    marginTop: 16,
  },
});

export default DiagnosticsScreen; 