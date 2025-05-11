import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView,
  Alert,
  Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

interface TestingFeedbackFormProps {
  onComplete: () => void;
}

// Email address for feedback
const FEEDBACK_EMAIL = 'cortegafit@gmail.com';

const TestingFeedbackForm: React.FC<TestingFeedbackFormProps> = ({ onComplete }) => {
  const { theme, isDark } = useTheme();
  const [overallExperience, setOverallExperience] = useState('');
  const [suggestions, setSuggestions] = useState('');
  const [bugs, setBugs] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!rating) {
      Alert.alert('Rating Required', 'Please provide an overall rating for your testing experience.');
      return;
    }

    // In a real app, we would submit this data to a server
    // For now, we'll just ask the user to email their feedback
    Alert.alert(
      'Submit Anonymous Feedback',
      'Your feedback will be sent anonymously to our development team. No personal information will be included.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Email Feedback', 
          onPress: () => {
            const subject = encodeURIComponent('Anonymous FlexBreak Testing Feedback');
            const body = encodeURIComponent(`
[THIS IS ANONYMOUS FEEDBACK FROM TESTING]

Overall Rating: ${rating}/5

Overall Experience:
${overallExperience}

Suggestions:
${suggestions}

Bugs/Issues:
${bugs}
            `);
            
            Linking.openURL(`mailto:${FEEDBACK_EMAIL}?subject=${subject}&body=${body}`);
            setSubmitted(true);
            
            // Show confirmation after email is triggered
            setTimeout(() => {
              Alert.alert(
                'Thank You!',
                'Your feedback is valuable to us. Would you like to submit more feedback or complete testing?',
                [
                  { text: 'Add More Feedback', style: 'cancel', onPress: () => setSubmitted(false) },
                  { text: 'Complete Testing', onPress: onComplete }
                ]
              );
            }, 1000);
          }
        },
        {
          text: 'Complete Without Submitting',
          onPress: onComplete
        }
      ]
    );
  };

  const renderRatingStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <TouchableOpacity
          key={i}
          onPress={() => setRating(i)}
          style={styles.starContainer}
        >
          <Ionicons
            name={i <= (rating || 0) ? 'star' : 'star-outline'}
            size={32}
            color={i <= (rating || 0) ? '#FFD700' : theme.textSecondary}
          />
        </TouchableOpacity>
      );
    }
    return (
      <View style={styles.starsContainer}>
        {stars}
      </View>
    );
  };

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerContainer}>
        <Ionicons name="chatbubble-ellipses-outline" size={40} color={theme.accent} />
        <Text style={[styles.title, { color: theme.text }]}>
          Your Feedback Matters
        </Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Thank you for completing the testing tasks! Please share your overall thoughts about FlexBreak.
        </Text>
        
        <View style={[styles.anonymousBadge, { backgroundColor: theme.accent + '20' }]}>
          <Ionicons name="shield-checkmark-outline" size={16} color={theme.accent} style={styles.anonymousIcon} />
          <Text style={[styles.anonymousText, { color: theme.accent }]}>
            Your feedback is completely anonymous
          </Text>
        </View>
        
        <View style={[styles.noticeContainer, { backgroundColor: isDark ? 'rgba(255, 193, 7, 0.15)' : 'rgba(255, 193, 7, 0.1)', marginTop: 16 }]}>
          <Ionicons name="alert-circle-outline" size={22} color="#FFC107" style={styles.noticeIcon} />
          <Text style={[styles.noticeText, { color: isDark ? '#FFC107' : '#856404' }]}>
            Note: These testing screens will be removed from the app at launch. Please focus your feedback on the app's main features, not these testing tools.
          </Text>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Overall Rating
        </Text>
        
        {renderRatingStars()}
        
        <Text style={[styles.fieldLabel, { color: theme.text }]}>
          Overall Experience
        </Text>
        <View style={[styles.textAreaContainer, { backgroundColor: theme.backgroundLight }]}>
          <TextInput
            style={[styles.textArea, { color: theme.text }]}
            placeholder="What was your overall experience using FlexBreak? Was it intuitive and easy to use?"
            placeholderTextColor={theme.textSecondary}
            multiline
            value={overallExperience}
            onChangeText={setOverallExperience}
          />
        </View>
        
        <Text style={[styles.fieldLabel, { color: theme.text }]}>
          Suggestions for Improvement
        </Text>
        <View style={[styles.textAreaContainer, { backgroundColor: theme.backgroundLight }]}>
          <TextInput
            style={[styles.textArea, { color: theme.text }]}
            placeholder="What features would you like to see added or improved?"
            placeholderTextColor={theme.textSecondary}
            multiline
            value={suggestions}
            onChangeText={setSuggestions}
          />
        </View>
        
        <Text style={[styles.fieldLabel, { color: theme.text }]}>
          Bugs or Issues
        </Text>
        <View style={[styles.textAreaContainer, { backgroundColor: theme.backgroundLight }]}>
          <TextInput
            style={[styles.textArea, { color: theme.text }]}
            placeholder="Did you encounter any bugs or issues while testing?"
            placeholderTextColor={theme.textSecondary}
            multiline
            value={bugs}
            onChangeText={setBugs}
          />
        </View>
      </View>
      
      <TouchableOpacity
        style={[styles.submitButton, { backgroundColor: theme.accent }]}
        onPress={handleSubmit}
      >
        <Ionicons name="send" size={20} color="white" style={styles.submitIcon} />
        <Text style={styles.submitButtonText}>
          Submit Anonymous Feedback
        </Text>
      </TouchableOpacity>
      
      <Text style={[styles.emailNote, { color: theme.textSecondary }]}>
        Your feedback helps us improve FlexBreak for everyone. Thank you!
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  anonymousBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 8,
  },
  anonymousIcon: {
    marginRight: 6,
  },
  anonymousText: {
    fontSize: 14,
    fontWeight: '500',
  },
  card: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
  },
  starContainer: {
    padding: 8,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  textAreaContainer: {
    borderRadius: 8,
    marginBottom: 20,
    padding: 8,
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
    fontSize: 16,
    padding: 8,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  submitIcon: {
    marginRight: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  emailNote: {
    textAlign: 'center',
    fontSize: 14,
    marginBottom: 40,
  },
  noticeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
  },
  noticeIcon: {
    marginRight: 8,
  },
  noticeText: {
    fontSize: 14,
    fontWeight: '500',
  }
});

export default TestingFeedbackForm; 