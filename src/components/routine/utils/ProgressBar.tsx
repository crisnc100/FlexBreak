import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '../../../context/ThemeContext';

interface ProgressBarProps {
  currentIndex: number;
  totalItems: number;
  label?: string;
  showPercentage?: boolean;
  showFraction?: boolean;
  height?: number;
  barColor?: string;
  backgroundColor?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  currentIndex,
  totalItems,
  label = 'Progress',
  showPercentage = true,
  showFraction = false,
  height = 8,
  barColor,
  backgroundColor
}) => {
  const { theme, isDark, isSunset } = useTheme();
  const progressPercentage = Math.min(Math.max((currentIndex / totalItems) * 100, 0), 100);
  
  // Use provided colors or fall back to theme colors
  const actualBarColor = barColor || (isDark || isSunset ? theme.accent : '#4CAF50');
  const actualBackgroundColor = backgroundColor || (isDark || isSunset ? 'rgba(255,255,255,0.1)' : '#E0E0E0');

  const renderLabel = () => {
    if (!label && !showPercentage && !showFraction) return null;
    
    return (
      <View style={styles.labelContainer}>
        {label ? (
          <Text style={[styles.label, { color: isDark || isSunset ? theme.text : '#333' }]}>
            {label}
          </Text>
        ) : null}
        
        <View style={styles.rightLabels}>
          {showFraction ? (
            <Text style={[styles.fractionText, { color: isDark || isSunset ? theme.text : '#333' }]}>
              {currentIndex}/{totalItems}
            </Text>
          ) : null}
          
          {showPercentage ? (
            <Text style={[styles.percentageText, { color: isDark || isSunset ? theme.textSecondary : '#666' }]}>
              {Math.round(progressPercentage)}%
            </Text>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {renderLabel()}
      
      <View style={[styles.progressBackground, { 
        backgroundColor: actualBackgroundColor,
        height: height,
        borderRadius: height / 2
      }]}>
        <View
          style={[
            styles.progressBar,
            {
              width: `${progressPercentage}%`,
              backgroundColor: actualBarColor,
              height: height,
              borderRadius: height / 2
            }
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: 10,
  },
  labelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  rightLabels: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fractionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginRight: 8,
  },
  percentageText: {
    fontSize: 14,
    color: '#666',
  },
  progressBackground: {
    width: '100%',
    backgroundColor: '#E0E0E0',
    overflow: 'hidden',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#4CAF50',
  },
});

export default ProgressBar; 