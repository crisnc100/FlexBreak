import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { usePremium } from '../../context/PremiumContext';

interface HomeHeaderProps {
  title?: string;
  subtitle?: string;
}

/**
 * Enhanced header component for the home screen with modern styling
 * Shows "Pro" badge only for premium users
 */
const HomeHeader: React.FC<HomeHeaderProps> = ({
  title = 'FlexBreak',
  subtitle = 'Stretch. Relax. Work Better.'
}) => {
  const { theme, isDark } = useTheme();
  const { isPremium } = usePremium();
  
  return (
    <View style={styles.container}>
      <View style={styles.titleContainer}>
        <View style={styles.logoContainer}>
          <Image 
            source={require('../../../assets/images/potentialLogo3.png')} 
            style={styles.logoImage}
          />
        </View>
        
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: theme.text }]}>
            {title}
            {isPremium && <Text style={styles.highlight}> Pro</Text>}
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {subtitle}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
    paddingTop: 4,
    paddingHorizontal: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoContainer: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'visible'
  },
  logoImage: {
    width: 110,
    height: 110,
    resizeMode: 'contain',
    backgroundColor: 'transparent'
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  highlight: {
    color: '#4CAF50',
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
  }
});

export default HomeHeader; 