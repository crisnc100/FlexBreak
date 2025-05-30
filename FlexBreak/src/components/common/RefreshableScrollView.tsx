import React, { useState, forwardRef, ForwardedRef, useRef, useCallback } from 'react';
import { 
  ScrollView, 
  RefreshControl, 
  StyleSheet, 
  ScrollViewProps,
  ActivityIndicator,
  View,
  Text,
  Animated
} from 'react-native';

interface RefreshableScrollViewProps extends ScrollViewProps {
  onRefresh: () => Promise<void>;
  refreshing?: boolean;
  refreshColor?: string | string[];
  refreshTimeout?: number;
  showRefreshingFeedback?: boolean;
  minimumRefreshTime?: number;
}

/**
 * A ScrollView component with pull-to-refresh functionality
 * 
 * @param onRefresh Function to call when the user pulls to refresh
 * @param refreshing Optional boolean to control the refreshing state externally
 * @param refreshColor Optional color or array of colors for the refresh indicator
 * @param refreshTimeout Optional timeout in ms after which refresh will be considered complete
 * @param showRefreshingFeedback Optional boolean to show a feedback message when refreshing
 * @param minimumRefreshTime Optional minimum time in ms that the refresh indicator will show
 * @param children Content to render inside the scroll view
 * @param props Other ScrollView props
 */
const RefreshableScrollView = forwardRef<ScrollView, RefreshableScrollViewProps>(({
  onRefresh,
  refreshing: externalRefreshing,
  refreshColor = ['#4CAF50'],
  refreshTimeout = 10000, // 10 seconds default timeout
  showRefreshingFeedback = false,
  minimumRefreshTime = 500, // Minimum refresh time to avoid jumpiness
  children,
  ...props
}, ref) => {
  const [internalRefreshing, setInternalRefreshing] = useState(false);
  const [refreshFailed, setRefreshFailed] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const successTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const isRefreshing = useRef(false);
  
  // Use external refreshing state if provided, otherwise use internal state
  const refreshing = externalRefreshing !== undefined ? externalRefreshing : internalRefreshing;
  
  // Clear timeouts on unmount
  React.useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);
  
  // Show success message with animation
  const showSuccessMessage = useCallback((message: string) => {
    setSuccessMessage(message);
    
    // Animate the success message
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true
      }),
      Animated.delay(1500),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true
      })
    ]).start(() => {
      setSuccessMessage(null);
    });
  }, [fadeAnim]);
  
  const handleRefresh = useCallback(async () => {
    // Prevent multiple refreshes from occurring simultaneously
    if (isRefreshing.current) {
      console.log('Refresh already in progress, skipping');
      return;
    }
    
    try {
      isRefreshing.current = true;
      setInternalRefreshing(true);
      setRefreshFailed(false);
      
      console.log('Starting smooth refresh...');
      const startTime = Date.now();
      
      // Create a promise that resolves after the timeout
      const timeoutPromise = new Promise((_, reject) => {
        refreshTimeoutRef.current = setTimeout(() => reject(new Error('Refresh timeout')), refreshTimeout);
      });
      
      // Race between the actual refresh and the timeout
      await Promise.race([
        onRefresh().catch(error => {
          console.error('Refresh operation failed:', error);
          throw error;
        }), 
        timeoutPromise
      ]);
      
      // Calculate how much time has elapsed
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, minimumRefreshTime - elapsedTime);
      
      // Keep the refresh indicator visible for the minimum time to avoid jumpiness
      if (remainingTime > 0) {
        await new Promise(resolve => setTimeout(resolve, remainingTime));
      }
      
      console.log('Refresh completed successfully');
      
      // Show success message
      showSuccessMessage('✓ Refresh completed successfully');
      
      setInternalRefreshing(false);
    } catch (error) {
      console.error('Refresh failed:', error);
      setRefreshFailed(true);
      setInternalRefreshing(false);
      
      // After a delay, clear the error state
      setTimeout(() => {
        setRefreshFailed(false);
      }, 3000);
    } finally {
      isRefreshing.current = false;
      
      // Clear timeout
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
    }
  }, [onRefresh, refreshTimeout, minimumRefreshTime, showSuccessMessage]);
  
  return (
    <View style={styles.container}>
      <ScrollView
        ref={ref}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={Array.isArray(refreshColor) ? refreshColor : [refreshColor]}
            tintColor={Array.isArray(refreshColor) ? refreshColor[0] : refreshColor}
            progressViewOffset={showRefreshingFeedback ? 40 : 0}
          />
        }
        contentContainerStyle={[
          props.contentContainerStyle, 
          showRefreshingFeedback && refreshing && styles.extraTopPadding
        ]}
        {...props}
      >
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
        
        {children}
      </ScrollView>
      
      {/* Success message overlay */}
      {successMessage && (
        <Animated.View style={[styles.successContainer, { opacity: fadeAnim }]}>
          <Text style={styles.successText}>{successMessage}</Text>
        </Animated.View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative'
  },
  extraTopPadding: {
    paddingTop: 8
  },
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
  successContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  successText: {
    color: 'white',
    fontWeight: 'bold',
  }
});

export default RefreshableScrollView; 