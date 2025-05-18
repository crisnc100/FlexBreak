import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import { useAppDispatch } from '../../state/hooks'; 
import { updateStreakStatus } from '../../state/slices/streakSlice';

import { Ionicons } from '@expo/vector-icons';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { BodyArea, Duration } from '../../types';
import { AppNavigationProp } from '../../types';

import { generateRoutine } from '../../utils/generators/routineGenerator';
import { saveFavoriteRoutine } from '../../services/storageService';
import XpNotificationManager from '../notifications/XpNotificationManager';
import { useTheme } from '../../context/ThemeContext';
import { createThemedStyles } from '../../utils/themeUtils';
import { useRefresh } from '../../context/RefreshContext';
import { Toast } from 'react-native-toast-notifications';

import LevelUpDisplay from './tabs/LevelUpDisplay';
import XpBreakdown from './tabs/XpBreakdown';
import SimpleXpDisplay from './tabs/SimpleXpDisplay';
import RoutineStats from './tabs/RoutineStats';
import ActionButtons from './tabs/ActionButtons';

import {
  CompletedRoutineProps as CompletedRoutinePropsType,
} from './types/completedRoutine.types';

import { useAchievements } from './hooks/useAchievements';
import {
  detectXpBoost,
  calculateOriginalXp,
  simulateLevelUpWithBoost,
  shouldShowLevelUp,
  calculateLevelDisplay,
} from './utils/xpUtils';
import * as streakManager from '../../utils/progress/modules/streakManager';
import { useDispatch } from 'react-redux';

/* ───────────── types ───────────── */
type CompletedRoutineProps = CompletedRoutinePropsType;

/* ───────────── component ───────────── */
const CompletedRoutine: React.FC<CompletedRoutineProps> = ({
  area,
  duration,
  isPremium,
  xpEarned = 0,
  xpBreakdown = [],
  levelUp,
  isXpBoosted,
  savedStretches = [],
  onShowDashboard,
  onNavigateHome,
  onOpenSubscription,
}) => {
  /* hooks */
  const navigation = useNavigation<AppNavigationProp>();
  const { theme, isDark, isSunset } = useTheme();
  const { triggerRefresh } = useRefresh();
  const dispatch = useAppDispatch();
  const styles = themedStyles(theme);

  /* streak: record that TODAY we finished a routine */
  useEffect(() => {
    dispatch(updateStreakStatus(true));
  }, [dispatch]);

  /* state */
  const [routineLength, setRoutineLength] = useState(0);

  /* achievements */
  const { unlockedAchievements } = useAchievements(levelUp);

  /* listen for streak-updated events so UI refreshes */
  useEffect(() => {
    const handler = () => triggerRefresh();
    streakManager.streakEvents.on('streak_updated', handler);
    return () => streakManager.streakEvents.off('streak_updated', handler);
  }, [triggerRefresh]);

  /* load routine length once */
  useEffect(() => {
    (async () => {
      try {
        const generated = await (generateRoutine as any)(
          area,
          duration,
          'beginner',
          undefined,
          isPremium,
        );
        setRoutineLength(generated.length);
      } catch {
        setRoutineLength(0);
      }
    })();
  }, []);

  /* XP / level-up calcs */
  const hasXpBoost = detectXpBoost(xpBreakdown, isXpBoosted);
  const originalXpEarned = calculateOriginalXp(
    xpEarned,
    hasXpBoost,
    xpBreakdown,
  );
  const showLevelUp = shouldShowLevelUp(levelUp);
  const showAnyLevelUp = showLevelUp;
  const simulated = simulateLevelUpWithBoost(hasXpBoost, levelUp, xpEarned);
  const { oldLevel: displayOldLevel, newLevel: displayNewLevel } =
    calculateLevelDisplay(levelUp, simulated, xpEarned);

  /* animations */
  const boostPulseAnim = useRef(new Animated.Value(1)).current;
  const shineAnim = useRef(new Animated.Value(-100)).current;
  const levelUpAnim = useRef(new Animated.Value(0)).current;
  const levelUpScale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (showAnyLevelUp) {
      Animated.sequence([
        Animated.timing(levelUpAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(levelUpScale, { toValue: 1.05, duration: 300, useNativeDriver: true }),
        Animated.timing(levelUpScale, { toValue: 1.03, duration: 200, useNativeDriver: true }),
        Animated.timing(levelUpScale, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [showAnyLevelUp]);

  useEffect(() => {
    if (hasXpBoost) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(boostPulseAnim, { toValue: 1.1, duration: 1200, useNativeDriver: true }),
          Animated.timing(boostPulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        ]),
      ).start();
      Animated.loop(
        Animated.timing(shineAnim, { toValue: 400, duration: 5000, useNativeDriver: true }),
      ).start();
    }
  }, [hasXpBoost]);

  /* toast helpers */
  const showMessage = (msg: string, type: 'success' | 'warning' | 'danger' = 'success') => {
    Toast?.show?.(msg, {
      type,
      placement: 'bottom',
      duration: type === 'warning' ? 4000 : 3000,
      animationType: 'slide-in',
    });
  };

  /* save-to-favorites animation */
  const favScale = useRef(new Animated.Value(0)).current;
  const favOpacity = useRef(new Animated.Value(0)).current;
  const [isSaving, setIsSaving] = useState(false);

  /* helpers */
  const navigateTo = (screen: string, params?: any) =>
    navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: screen, params }] }));

  const handleNewRoutine = () => {
    triggerRefresh();
    onShowDashboard();
    navigateTo('Home');
  };

  const saveToFavorites = async () => {
    if (!isPremium) {
      onOpenSubscription();
      return;
    }
    setIsSaving(true);
    Animated.sequence([
      Animated.parallel([
        Animated.timing(favScale, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(favOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
      Animated.delay(800),
      Animated.timing(favOpacity, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();

    const routineParams = {
      name: `${area} ${duration} min routine`,
      area,
      duration,
      level: 'beginner',
      savedStretches,
    };
    const result = await saveFavoriteRoutine(routineParams as any);

    if (result.success) {
      showMessage(result.message || 'Routine saved to favorites!');
      setTimeout(() => {
        setIsSaving(false);
        onShowDashboard();
        navigateTo('Favorites', { newSave: true, savedRoutineId: Date.now().toString(), area, duration });
      }, 1200);
    } else {
      showMessage(result.message || 'Failed to save', result.limitReached ? 'warning' : 'danger');
      setIsSaving(false);
    }
  };

  const startSmartPick = () => {
    if (!isPremium) {
      onOpenSubscription();
      return;
    }
    triggerRefresh();
    onShowDashboard();
    setTimeout(() => {
      navigation.dispatch(
        CommonActions.navigate({
          name: 'Routine',
          params: { area: 'Neck' as BodyArea, duration: '5' as Duration, level: 'beginner', includePremiumStretches: isPremium },
        }),
      );
    }, 100);
  };

  /* render */
  return (
    <View style={styles.container}>
      <XpNotificationManager showLevelUpInRoutine={!showAnyLevelUp} />

      {isSaving && (
        <Animated.View style={[styles.savingOverlay, { opacity: favOpacity }]}>
          <Animated.View style={[styles.savingAnimationContainer, { transform: [{ scale: favScale }] }]}>
            <Ionicons name="bookmark" size={70} color="#FF9800" />
            <Text style={styles.savingText}>Saving to Favorites...</Text>
          </Animated.View>
        </Animated.View>
      )}

      <TouchableOpacity
        style={[styles.completedContainer, showAnyLevelUp && styles.completedContainerWithLevelUp]}
        activeOpacity={1}
        onPress={() => {
          triggerRefresh();
          onShowDashboard();
        }}>
        <Ionicons name="checkmark-circle" size={showAnyLevelUp ? 60 : 80} color={theme.success} />
        <Text style={styles.completedTitle}>Routine Complete!</Text>
        <Text style={[styles.completedSubtitle, showAnyLevelUp && styles.reducedMargin]}>
          Great job on your stretching routine
        </Text>

        {showAnyLevelUp && (
          <LevelUpDisplay
            oldLevel={displayOldLevel}
            newLevel={displayNewLevel}
            isDark={isDark}
            isSunset={isSunset}
            isSimulated={false}
            rewards={levelUp?.rewards || []}
            animValues={{ levelUpAnim, levelUpScale }}
          />
        )}

        {xpBreakdown.length ? (
          <XpBreakdown
            xpBreakdown={xpBreakdown}
            unlockedAchievements={unlockedAchievements}
            hasXpBoost={hasXpBoost}
            showAnyLevelUp={showAnyLevelUp}
            theme={theme}
            isDark={isDark}
            isSunset={isSunset}
            animValues={{ shineAnim }}
          />
        ) : (
          <SimpleXpDisplay
            xpEarned={xpEarned}
            originalXpEarned={originalXpEarned}
            hasXpBoost={hasXpBoost}
            showAnyLevelUp={showAnyLevelUp}
            theme={theme}
            animValues={{ boostPulseAnim }}
          />
        )}

        <RoutineStats
          area={area}
          duration={duration}
          numStretches={routineLength}
          showAnyLevelUp={showAnyLevelUp}
          theme={theme}
        />

        <Text style={[styles.nextStepsText, showAnyLevelUp && styles.nextStepsTextCompact]}>
          What would you like to do next?
        </Text>

        <ActionButtons
          isPremium={isPremium}
          showAnyLevelUp={showAnyLevelUp}
          theme={theme}
          onSaveToFavorites={saveToFavorites}
          onSmartPick={startSmartPick}
          onNewRoutine={handleNewRoutine}
          onOpenSubscription={onOpenSubscription}
        />

        <View style={styles.tapIndicatorContainer}>
          <Ionicons name="finger-print-outline" size={16} color={theme.textSecondary} />
          <Text style={styles.tapIndicatorText}>Tap anywhere to continue</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

/* ───────────── themed styles ───────────── */
const themedStyles = createThemedStyles(theme =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    completedContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      backgroundColor: theme.cardBackground,
    },
    completedContainerWithLevelUp: { paddingTop: 15, paddingBottom: 15 },
    completedTitle: { fontSize: 24, fontWeight: 'bold', marginTop: 20, marginBottom: 10, color: theme.text },
    completedSubtitle: { fontSize: 16, textAlign: 'center', marginBottom: 20, color: theme.textSecondary },
    reducedMargin: { marginBottom: 12 },
    nextStepsText: { fontSize: 18, fontWeight: '600', marginBottom: 16, color: theme.text },
    nextStepsTextCompact: { fontSize: 16, marginBottom: 12 },
    tapIndicatorContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16, opacity: 0.7 },
    tapIndicatorText: { fontSize: 12, color: theme.textSecondary, marginLeft: 6 },
    savingOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10,
    },
    savingAnimationContainer: {
      backgroundColor: theme.cardBackground,
      padding: 30,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 8,
      minWidth: 200,
    },
    savingText: { fontSize: 20, fontWeight: 'bold', color: theme.text, marginTop: 20, textAlign: 'center' },
  }),
);

export default CompletedRoutine;
