import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  Dimensions, 
  TouchableOpacity,
  Animated 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

interface TestingIntroSlidesProps {
  onComplete: () => void;
}

const { width } = Dimensions.get('window');

const slides = [
  {
    id: '1',
    title: 'Welcome to FlexBreak Testing',
    description: 'Thank you for participating in our testing program! Your feedback will help us improve the app experience for all users.',
    icon: 'people-outline'
  },
  {
    id: '2',
    title: 'Testing Goals',
    description: 'Our primary goal is to ensure that core features work correctly and provide a seamless experience. We value your honest feedback on functionality, not just minor UI details.',
    icon: 'checkmark-circle-outline'
  },
  {
    id: '3',
    title: 'Two-Part Testing Process',
    description: 'Part 1: Test core app features including routines, challenges, and user experience.\n\nPart 2: Use our simulation tool to test the gamification system without waiting for real-time progression.',
    icon: 'layers-outline'
  },
  {
    id: '4',
    title: 'Providing Feedback',
    description: 'As you test each feature, note what worked well and any issues you encountered. Your detailed feedback is essential to help us improve FlexBreak.',
    icon: 'chatbubble-outline'
  },
  {
    id: '5',
    title: 'Ready to Begin?',
    description: "You'll find a checklist of features to test in Part 1. Take your time with each item and provide feedback as you complete them.",
    icon: 'play-outline'
  }
];

const TestingIntroSlides: React.FC<TestingIntroSlidesProps> = ({ onComplete }) => {
  const { theme, isDark } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const renderItem = ({ item, index }: { item: typeof slides[0], index: number }) => {
    return (
      <View style={[styles.slide, { backgroundColor: theme.cardBackground, width }]}>
        <View style={[styles.iconContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
          <Ionicons name={item.icon as any} size={60} color={theme.accent} />
        </View>
        <Text style={[styles.title, { color: theme.text }]}>{item.title}</Text>
        <Text style={[styles.description, { color: theme.textSecondary }]}>{item.description}</Text>
      </View>
    );
  };

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
      setCurrentIndex(currentIndex + 1);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      flatListRef.current?.scrollToIndex({ index: currentIndex - 1, animated: true });
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const renderDots = () => {
    return (
      <View style={styles.dotContainer}>
        {slides.map((_, index) => {
          const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
          
          const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [10, 20, 10],
            extrapolate: 'clamp'
          });
          
          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.3, 1, 0.3],
            extrapolate: 'clamp'
          });
          
          return (
            <Animated.View 
              key={index} 
              style={[
                styles.dot, 
                { 
                  width: dotWidth,
                  opacity,
                  backgroundColor: theme.accent 
                }
              ]} 
            />
          );
        })}
      </View>
    );
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems[0]) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50
  }).current;

  return (
    <View style={styles.container}>
      <Animated.FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
      />
      
      {renderDots()}
      
      <View style={styles.buttonContainer}>
        {currentIndex > 0 ? (
          <TouchableOpacity
            style={[styles.button, styles.backButton, { borderColor: theme.border }]}
            onPress={handleBack}
          >
            <Text style={[styles.buttonText, { color: theme.text }]}>Back</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.button, styles.skipButton, { borderColor: theme.border }]}
            onPress={handleSkip}
          >
            <Text style={[styles.buttonText, { color: theme.text }]}>Skip</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={[styles.button, styles.nextButton, { backgroundColor: theme.accent }]}
          onPress={handleNext}
        >
          <Text style={styles.nextButtonText}>
            {currentIndex === slides.length - 1 ? 'Get Started' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  slide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  dotContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 20,
  },
  dot: {
    height: 10,
    borderRadius: 5,
    marginHorizontal: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 40,
    marginBottom: 40,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    borderWidth: 1,
  },
  skipButton: {
    borderWidth: 1,
  },
  nextButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});

export default TestingIntroSlides; 