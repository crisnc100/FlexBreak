import React, { ReactNode } from 'react';
import { View, StyleSheet, SafeAreaView, StatusBar, ViewStyle } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

interface ThemedScreenProps {
  children: ReactNode;
  style?: ViewStyle | ViewStyle[];
  headerComponent?: ReactNode;
  useSafeArea?: boolean;
}

/**
 * A wrapper component for screens that automatically applies theme colors
 * 
 * @param children - Screen content
 * @param style - Optional additional styles to apply to the main content container
 * @param headerComponent - Optional header component to display at the top of the screen
 * @param useSafeArea - Whether to use SafeAreaView (default: true)
 */
const ThemedScreen: React.FC<ThemedScreenProps> = ({
  children,
  style,
  headerComponent,
  useSafeArea = true
}) => {
  const { theme, isDark } = useTheme();
  
  const Container = useSafeArea ? SafeAreaView : View;
  
  return (
    <Container style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar 
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={theme.background}
      />
      
      {headerComponent}
      
      <View 
        style={[
          styles.contentContainer,
          { backgroundColor: theme.background },
          Array.isArray(style) ? style : style ? [style] : null
        ]}
      >
        {children}
      </View>
    </Container>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
  }
});

export default ThemedScreen; 