import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Dimensions, 
  TouchableOpacity,
  ScrollView
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
    description: 'Part 1: Test core app features including routines, challenges, and user experience as a level 1 user.\n\nPart 2: Use our simulation tool to test the gamification system without waiting for real-time progression.',
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
    title: 'Premium Features Enabled',
    description: 'As a tester, you have been granted PREMIUM access to all features! IMPORTANT: You may need to RESTART the app (close and reopen) for premium features to be fully activated.',
    icon: 'diamond-outline'
  },
  {
    id: '6',
    title: 'Ready to Begin?',
    description: "You'll find a checklist of features to test in Part 1. Take your time with each item and provide feedback as you complete them.",
    icon: 'play-outline'
  }
];

const TestingIntroSlides: React.FC<TestingIntroSlidesProps> = ({ onComplete }) => {
  const { theme, isDark } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };
  
  // Render current slide based on index
  const currentSlide = slides[currentIndex];

  return (
    <View style={styles.container}>
      <View style={styles.progressContainer}>
        <Text style={[styles.progressText, { color: theme.textSecondary }]}>
          Slide {currentIndex + 1} of {slides.length}
        </Text>
      </View>
      
      <View style={[styles.slideContainer, { backgroundColor: theme.cardBackground }]}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={[styles.iconContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
            <Ionicons name={currentSlide.icon as any} size={60} color={theme.accent} />
          </View>
          <Text style={[styles.title, { color: theme.text }]}>{currentSlide.title}</Text>
          <Text style={[styles.description, { color: theme.textSecondary }]}>{currentSlide.description}</Text>
        </ScrollView>
      </View>
      
      <View style={styles.dotsContainer}>
        {slides.map((_, index) => (
          <View 
            key={index} 
            style={[
              styles.dot, 
              { 
                width: currentIndex === index ? 20 : 10,
                opacity: currentIndex === index ? 1 : 0.3,
                backgroundColor: theme.accent 
              }
            ]} 
          />
        ))}
      </View>
      
      <View style={styles.buttonContainer}>
        {currentIndex > 0 ? (
          <TouchableOpacity
            style={[styles.button, styles.backButton, { borderColor: theme.border }]}
            onPress={handleBack}
          >
            <Text style={[styles.buttonText, { color: theme.text }]}>Back</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.emptyButtonSpace} />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 20,
  },
  progressContainer: {
    alignSelf: 'flex-end',
    paddingRight: 20,
    paddingTop: 10,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '500',
  },
  slideContainer: {
    flex: 1,
    width: width - 40,
    borderRadius: 16,
    marginVertical: 20,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
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
  dotsContainer: {
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
    marginBottom: 20,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    borderWidth: 1,
  },
  emptyButtonSpace: {
    minWidth: 120,
  },
  nextButton: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  nextButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default TestingIntroSlides; 