import React, { useState, forwardRef } from 'react';
import { 
  FlatList, 
  RefreshControl, 
  StyleSheet, 
  FlatListProps,
  ActivityIndicator,
  View,
  Text
} from 'react-native';

interface RefreshableFlatListProps<T> extends FlatListProps<T> {
  onRefresh: () => Promise<void>;
  refreshing?: boolean;
  refreshColor?: string | string[];
  refreshTimeout?: number;
  showRefreshingFeedback?: boolean;
}

/**
 * A FlatList component with pull-to-refresh functionality
 * 
 * @param onRefresh Function to call when the user pulls to refresh
 * @param refreshing Optional boolean to control the refreshing state externally
 * @param refreshColor Optional color or array of colors for the refresh indicator
 * @param refreshTimeout Optional timeout in ms after which refresh will be considered complete
 * @param showRefreshingFeedback Optional boolean to show a feedback message when refreshing
 * @param props Other FlatList props
 */
const RefreshableFlatList = forwardRef(<T,>(
  {
    onRefresh,
    refreshing: externalRefreshing,
    refreshColor = ['#4CAF50'],
    refreshTimeout = 10000, // 10 seconds default timeout
    showRefreshingFeedback = false,
    ListHeaderComponent,
    ...props
  }: RefreshableFlatListProps<T>,
  ref
) => {
  const [internalRefreshing, setInternalRefreshing] = useState(false);
  const [refreshFailed, setRefreshFailed] = useState(false);
  
  // Use external refreshing state if provided, otherwise use internal state
  const refreshing = externalRefreshing !== undefined ? externalRefreshing : internalRefreshing;
  
  const handleRefresh = async () => {
    try {
      setInternalRefreshing(true);
      setRefreshFailed(false);
      
      // Create a promise that resolves after the timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Refresh timeout')), refreshTimeout);
      });
      
      // Race between the actual refresh and the timeout
      await Promise.race([onRefresh(), timeoutPromise]);
      
      setInternalRefreshing(false);
    } catch (error) {
      console.error('Refresh failed:', error);
      setRefreshFailed(true);
      setInternalRefreshing(false);
    }
  };
  
  // Combine custom header with refresh feedback
  const CustomHeader = () => (
    <>
      {/* Refreshing feedback message */}
      {showRefreshingFeedback && refreshing && (
        <View style={styles.refreshingContainer}>
          <ActivityIndicator size="small" color="#4CAF50" />
          <Text style={styles.refreshingText}>Refreshing data...</Text>
        </View>
      )}
      
      {/* Error feedback message */}
      {refreshFailed && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            Couldn't refresh data. Pull down to try again.
          </Text>
        </View>
      )}
      
      {/* Original header component */}
      {ListHeaderComponent}
    </>
  );
  
  return (
    <FlatList
      ref={ref}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={Array.isArray(refreshColor) ? refreshColor : [refreshColor]}
          tintColor={Array.isArray(refreshColor) ? refreshColor[0] : refreshColor}
        />
      }
      ListHeaderComponent={<CustomHeader />}
      {...props}
    />
  );
});

const styles = StyleSheet.create({
  refreshingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: '#E8F5E9',
  },
  refreshingText: {
    marginLeft: 8,
    color: '#4CAF50',
    fontSize: 14,
  },
  errorContainer: {
    padding: 8,
    backgroundColor: '#FFEBEE',
    alignItems: 'center',
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 14,
  },
});

export default RefreshableFlatList; 