import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

interface ThemedCardProps {
  children: ReactNode;
  style?: ViewStyle | ViewStyle[];
  onPress?: () => void;
  elevation?: number;
  useBorder?: boolean;
}

/**
 * A card component with theming support
 * 
 * @param children - Card content
 * @param style - Optional additional styles to apply
 * @param onPress - Optional onPress handler to make the card touchable
 * @param elevation - Shadow elevation (0-10)
 * @param useBorder - Whether to use a border instead of shadow
 */
const ThemedCard: React.FC<ThemedCardProps> = ({
  children,
  style,
  onPress,
  elevation = 2,
  useBorder = false
}) => {
  const { theme, isDark } = useTheme();
  
  // Card styling with proper shadow
  const cardStyle = {
    backgroundColor: theme.cardBackground,
    borderColor: theme.border,
    borderWidth: useBorder ? 1 : 0,
    shadowColor: theme.text,
    shadowOffset: { width: 0, height: elevation / 2 },
    shadowOpacity: isDark ? 0.3 : 0.1,
    shadowRadius: elevation,
    elevation: elevation,
  };
  
  // Decide whether to use TouchableOpacity or View based on onPress
  const CardComponent = onPress ? TouchableOpacity : View;
  
  return (
    <CardComponent
      style={[
        styles.card,
        cardStyle,
        Array.isArray(style) ? style : style ? [style] : null
      ]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      {children}
    </CardComponent>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 8,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 0,
  }
});

export default ThemedCard; 