import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AdService from '../../services/adService';
import { usePremium } from '../../context/PremiumContext';

const MOTIVATIONAL_QUOTES = [
  // FlexBreak Original Quotes
  { text: "Your body deserves a break. Your mind deserves peace.", author: "FlexBreak" },
  { text: "Stretch your body, expand your mind.", author: "FlexBreak" },
  { text: "Every stretch is a step towards better health.", author: "FlexBreak" },
  { text: "The grind includes recovery. Honor both.", author: "FlexBreak" },
  { text: "Success needs flexibility - in body and mind.", author: "FlexBreak" },
  { text: "Your hustle is stronger when your body is balanced.", author: "FlexBreak" },
  { text: "Champions take breaks. That's how they stay champions.", author: "FlexBreak" },
  { text: "Movement breaks are productivity hacks in disguise.", author: "FlexBreak" },
  
  // Perseverance & Never Giving Up
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { text: "Fall seven times, stand up eight.", author: "Japanese Proverb" },
  { text: "The man who moves a mountain begins by carrying away small stones.", author: "Confucius" },
  { text: "Great works are performed not by strength but by perseverance.", author: "Samuel Johnson" },
  { text: "He conquers who endures.", author: "Persius" },
  { text: "Never give up, for that is just the place and time that the tide will turn.", author: "Harriet Beecher Stowe" },
  { text: "If you're going through hell, keep going.", author: "Winston Churchill" },
  { text: "Our greatest glory is not in never falling, but in rising every time we fall.", author: "Nelson Mandela" },
  
  // The Grind & Hard Work
  { text: "Good things happen to those who hustle.", author: "Chuck Noll" },
  { text: "The dream is free. The hustle is sold separately.", author: "Unknown" },
  { text: "Grind now, shine later.", author: "Unknown" },
  { text: "You can't cheat the grind. It knows how much you've invested.", author: "Unknown" },
  { text: "Work hard in silence, let success make the noise.", author: "Frank Ocean" },
  { text: "The only place success comes before work is in the dictionary.", author: "Vince Lombardi" },
  { text: "Dreams don't work unless you do.", author: "John C. Maxwell" },
  
  // Overcoming Struggles
  { text: "Strength doesn't come from what you can do. It comes from overcoming the things you once thought you couldn't.", author: "Rikki Rogers" },
  { text: "The struggle you're in today is developing the strength you need for tomorrow.", author: "Robert Tew" },
  { text: "Difficult roads often lead to beautiful destinations.", author: "Zig Ziglar" },
  { text: "The greater the obstacle, the more glory in overcoming it.", author: "Molière" },
  { text: "Difficulties strengthen the mind, as labor does the body.", author: "Seneca" },
  { text: "An empty stomach will teach you lessons a full stomach can't.", author: "Michael Bassey Johnson" },
  
  // Success & Achievement
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { text: "I have failed again and again throughout my life. And that is why I succeed.", author: "Michael Jordan" },
  { text: "The difference between ordinary and extraordinary is that little extra.", author: "Jimmy Johnson" },
  { text: "Success is the sum of small efforts repeated day in and day out.", author: "Robert Collier" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  
  // Mind & Body Connection
  { text: "Take care of your body. It's the only place you have to live.", author: "Jim Rohn" },
  { text: "Movement is medicine for creating change.", author: "Carol Welch" },
  { text: "Physical fitness is the first requisite of happiness.", author: "Joseph Pilates" },
  { text: "The body achieves what the mind believes.", author: "Napoleon Hill" },
  { text: "Your health is an investment, not an expense.", author: "Unknown" },
  
  // Rest & Recovery
  { text: "Rest when you're weary. Refresh and renew yourself.", author: "Ralph Marston" },
  { text: "The pause is as important as the push.", author: "Unknown" },
  { text: "Rest is not idleness, it's preparation for productivity.", author: "John Lubbock" },
  { text: "Sometimes the most productive thing you can do is relax.", author: "Mark Black" },
  
  // Motivation & Action
  { text: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
  { text: "Start where you are. Use what you have. Do what you can.", author: "Arthur Ashe" },
  { text: "You miss 100% of the shots you don't take.", author: "Wayne Gretzky" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
  
  // Discipline & Consistency
  { text: "Discipline is choosing between what you want now and what you want most.", author: "Abraham Lincoln" },
  { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Aristotle" },
  { text: "Successful people do what unsuccessful people are not willing to do.", author: "Jim Rohn" },
  { text: "The only bad workout is the one that didn't happen.", author: "Unknown" },
];

interface DailyQuoteRewardProps {
  onQuoteUnlocked?: (quote: { text: string; author: string }) => void;
}

export const DailyQuoteReward: React.FC<DailyQuoteRewardProps> = ({ onQuoteUnlocked }) => {
  const { isPremium } = usePremium();
  const [loading, setLoading] = useState(false);
  const [lastQuoteDate, setLastQuoteDate] = useState<string | null>(null);
  const [hasSeenToday, setHasSeenToday] = useState(false);

  useEffect(() => {
    checkLastQuoteDate();
  }, []);

  const checkLastQuoteDate = async () => {
    try {
      const lastDate = await AsyncStorage.getItem('lastQuoteDate');
      const today = new Date().toDateString();
      
      setLastQuoteDate(lastDate);
      setHasSeenToday(lastDate === today && !isPremium);
      
      // If premium, they can see quotes unlimited times
      if (isPremium && lastDate !== today) {
        await AsyncStorage.setItem('lastQuoteDate', today);
      }
    } catch (error) {
      console.error('Error checking last quote date:', error);
    }
  };

  const handleWatchAd = async () => {
    if (isPremium) {
      // Premium users get instant access
      showRandomQuote();
      return;
    }

    if (hasSeenToday) {
      return;
    }

    setLoading(true);
    
    try {
      console.log('📺 DailyQuoteReward: About to show rewarded ad');
      console.log('📺 DailyQuoteReward: AdService status:', AdService.getAdStatus());
      
      const rewarded = await AdService.showRewardedAd();
      
      console.log('📺 DailyQuoteReward: Rewarded ad promise resolved with:', rewarded);
      console.log('📺 DailyQuoteReward: Type of rewarded:', typeof rewarded);
      
      if (rewarded === true) {
        console.log('✅ DailyQuoteReward: Reward was TRUE, showing quote now!');
        showRandomQuote();
        
        // Save that user has seen quote today
        const today = new Date().toDateString();
        await AsyncStorage.setItem('lastQuoteDate', today);
        setHasSeenToday(true);
        console.log('✅ DailyQuoteReward: Quote should be visible now');
      } else {
        console.log('❌ DailyQuoteReward: Reward was FALSE or undefined:', rewarded);
        if (__DEV__) {
          // DEBUG: In dev mode, show quote anyway if ad fails
          console.log('🔧 DailyQuoteReward: DEV MODE - Showing quote anyway');
          showRandomQuote();
        }
      }
    } catch (error) {
      console.error('❌ DailyQuoteReward: Error showing rewarded ad:', error);
      if (__DEV__) {
        console.log('🔧 DailyQuoteReward: DEV MODE - Showing quote after error');
        showRandomQuote();
      }
    } finally {
      console.log('📺 DailyQuoteReward: Setting loading to false');
      setLoading(false);
    }
  };

  const showRandomQuote = () => {
    console.log('🎯 DailyQuoteReward: showRandomQuote() called');
    const randomQuote = MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
    console.log('🎯 DailyQuoteReward: Selected quote:', randomQuote);
    
    // Call the callback to display quote in DailyTip
    if (onQuoteUnlocked) {
      console.log('🎯 DailyQuoteReward: Calling onQuoteUnlocked callback');
      onQuoteUnlocked(randomQuote);
    }
  };

  const getButtonText = () => {
    if (isPremium) return "Get Daily Motivation";
    if (hasSeenToday) return "Come back tomorrow!";
    return "Watch Ad for Daily Quote";
  };

  const getButtonIcon = () => {
    if (isPremium) return "sparkles";
    if (hasSeenToday) return "time-outline";
    return "play-circle-outline";
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        hasSeenToday && !isPremium && styles.buttonDisabled,
        isPremium && styles.buttonPremium
      ]}
      onPress={handleWatchAd}
      disabled={loading || (hasSeenToday && !isPremium)}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator size="small" color={isPremium ? "#fff" : "#4A90E2"} />
      ) : (
        <>
          <Ionicons 
            name={getButtonIcon() as any} 
            size={20} 
            color={isPremium ? "#fff" : hasSeenToday ? "#999" : "#4A90E2"} 
          />
          <Text style={[
            styles.buttonText,
            hasSeenToday && !isPremium && styles.buttonTextDisabled,
            isPremium && styles.buttonTextPremium
          ]}>
            {getButtonText()}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F7FF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    marginVertical: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: '#4A90E2',
  },
  buttonPremium: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  buttonDisabled: {
    backgroundColor: '#F5F5F5',
    borderColor: '#DDD',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A90E2',
  },
  buttonTextPremium: {
    color: '#fff',
  },
  buttonTextDisabled: {
    color: '#999',
  },
});