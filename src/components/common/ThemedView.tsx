import React, { ReactNode } from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

interface ThemedViewProps {
  children: ReactNode;
  style?: ViewStyle | ViewStyle[];
  useCardBackground?: boolean;
  useBorder?: boolean;
}

/**
 * A themed view component that automatically applies theme colors
 * 
 * @param children - React children
 * @param style - Optional additional styles to apply
 * @param useCardBackground - If true, uses cardBackground color instead of background
 * @param useBorder - If true, adds a border with the theme's border color
 */
const ThemedView: React.FC<ThemedViewProps> = ({
  children,
  style,
  useCardBackground = false,
  useBorder = false
}) => {
  const { theme } = useTheme();
  
  return (
    <View 
      style={[
        {
          backgroundColor: useCardBackground ? theme.cardBackground : theme.background,
          ...(useBorder ? { borderColor: theme.border, borderWidth: 1 } : {})
        },
        Array.isArray(style) ? style : style ? [style] : null
      ]}
    >
      {children}
    </View>
  );
};

export default ThemedView; 