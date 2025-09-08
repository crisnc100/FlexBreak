import {
  BannerAd,
  BannerAdSize,
  InterstitialAd,
  RewardedAd,
  RewardedAdEventType,
  AdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const INTERSTITIAL_COOLDOWN = 10 * 60 * 1000; // 10 minutes between interstitials
const SETTINGS_OPEN_FREQUENCY = 3; // Show ad every 3rd time settings opened

class AdService {
  private static instance: AdService;
  private interstitialAd: InterstitialAd | null = null;
  private rewardedAd: RewardedAd | null = null;
  private lastInterstitialTime: number = 0;
  private breaksCompleted: number = 0;
  private settingsOpenCount: number = 0;
  private achievementsOpenCount: number = 0;
  private isPremium: boolean = false;
  private initialized: boolean = false;

  // Ad Unit IDs - Using test IDs for development
  // TODO: Create ad units in AdMob console and replace these IDs
  private adUnitIds = {
    banner: __DEV__ 
      ? TestIds.BANNER 
      : 'ca-app-pub-9873959079273159/9281519601',
    
    interstitial: __DEV__
      ? TestIds.INTERSTITIAL
      : 'ca-app-pub-9873959079273159/2281815225',
    
    rewarded: __DEV__
      ? TestIds.REWARDED
      : 'ca-app-pub-9873959079273159/4300671571',
  };

  private constructor() {
    // Make initialization lazy to avoid competing with onboarding/audio on first boot
    this.loadStoredCounts();
  }

  static getInstance(): AdService {
    if (!AdService.instance) {
      AdService.instance = new AdService();
    }
    return AdService.instance;
  }

  private async initializeAds() {
    try {
      console.log('AdService: Initializing ads...');
      
      // Initialize interstitial ad
      console.log('AdService: Creating interstitial ad with ID:', this.adUnitIds.interstitial);
      this.interstitialAd = InterstitialAd.createForAdRequest(this.adUnitIds.interstitial);
      
      // Initialize rewarded ad
      console.log('AdService: Creating rewarded ad with ID:', this.adUnitIds.rewarded);
      this.rewardedAd = RewardedAd.createForAdRequest(this.adUnitIds.rewarded);
      
      // Load ads
      console.log('AdService: Loading interstitial and rewarded ads...');
      this.loadInterstitialAd();
      this.loadRewardedAd();
      
      console.log('AdService: Ad initialization completed');
    } catch (error) {
      console.error('Error initializing ads:', error);
    }
  }

  async initialize() {
    if (this.initialized) {
      return;
    }
    this.initialized = true;
    await this.initializeAds();
  }

  private async loadStoredCounts() {
    try {
      const breaksStr = await AsyncStorage.getItem('adBreaksCompleted');
      const settingsStr = await AsyncStorage.getItem('adSettingsOpenCount');
      const achievementsStr = await AsyncStorage.getItem('adAchievementsOpenCount');
      
      this.breaksCompleted = breaksStr ? parseInt(breaksStr, 10) : 0;
      this.settingsOpenCount = settingsStr ? parseInt(settingsStr, 10) : 0;
      this.achievementsOpenCount = achievementsStr ? parseInt(achievementsStr, 10) : 0;
    } catch (error) {
      console.error('Error loading ad counts:', error);
    }
  }

  private async saveCount(key: string, value: number) {
    try {
      await AsyncStorage.setItem(key, value.toString());
    } catch (error) {
      console.error('Error saving ad count:', error);
    }
  }

  setPremiumStatus(isPremium: boolean) {
    this.isPremium = isPremium;
  }

  getBannerAdUnitId(): string {
    return this.adUnitIds.banner;
  }

  // Debug method to check ad initialization status
  getAdStatus(): object {
    return {
      interstitialInitialized: !!this.interstitialAd,
      rewardedInitialized: !!this.rewardedAd,
      breaksCompleted: this.breaksCompleted,
      isPremium: this.isPremium,
      lastInterstitialTime: this.lastInterstitialTime,
      canShowInterstitial: this.canShowInterstitial()
    };
  }

  private loadInterstitialAd() {
    if (!this.interstitialAd || this.isPremium) return;

    const unsubscribe = this.interstitialAd.addAdEventListener(
      AdEventType.LOADED,
      () => {
        console.log('Interstitial ad loaded');
      }
    );

    this.interstitialAd.load();
    return unsubscribe;
  }

  private loadRewardedAd() {
    if (!this.rewardedAd) {
      console.error('AdService: Cannot load rewarded ad - not initialized');
      return;
    }
    
    if (this.isPremium) {
      console.log('AdService: Skipping rewarded ad load - user is premium');
      return;
    }

    console.log('AdService: Loading rewarded ad...');
    
    // Add error listener
    const unsubscribeError = this.rewardedAd.addAdEventListener(
      AdEventType.ERROR,
      (error: any) => {
        console.error('AdService: Rewarded ad error:', error);
      }
    );
    
    const unsubscribeLoaded = this.rewardedAd.addAdEventListener(
      RewardedAdEventType.LOADED,
      () => {
        console.log('AdService: Rewarded ad loaded successfully');
      }
    );

    this.rewardedAd.load();
    return unsubscribeLoaded;
  }

  private canShowInterstitial(): boolean {
    if (this.isPremium) return false;
    
    const now = Date.now();
    const timeSinceLastAd = now - this.lastInterstitialTime;
    
    return timeSinceLastAd >= INTERSTITIAL_COOLDOWN;
  }

  // Post-routine interstitials removed for better user experience
  // Keeping track of break completions for potential future features
  async onBreakCompleted() {
    if (this.isPremium) {
      console.log('AdService: User is premium, no ads');
      return;
    }
    
    this.breaksCompleted++;
    console.log(`AdService: Break completed! Total: ${this.breaksCompleted}`);
    await this.saveCount('adBreaksCompleted', this.breaksCompleted);
    
    // Post-routine ads removed - better UX with just banner + rewarded ads
  }

  async onSettingsOpened() {
    if (this.isPremium) return;
    
    this.settingsOpenCount++;
    await this.saveCount('adSettingsOpenCount', this.settingsOpenCount);
    
    if (this.settingsOpenCount >= SETTINGS_OPEN_FREQUENCY && this.canShowInterstitial()) {
      await this.showInterstitialAd();
      this.settingsOpenCount = 0;
      await this.saveCount('adSettingsOpenCount', 0);
    }
  }

  async onAchievementsOpened() {
    if (this.isPremium) return;
    
    this.achievementsOpenCount++;
    await this.saveCount('adAchievementsOpenCount', this.achievementsOpenCount);
    
    // Show ad every 2nd time for achievements
    if (this.achievementsOpenCount >= 2 && this.canShowInterstitial()) {
      await this.showInterstitialAd();
      this.achievementsOpenCount = 0;
      await this.saveCount('adAchievementsOpenCount', 0);
    }
  }

  private async showInterstitialAd(): Promise<void> {
    if (this.isPremium || !this.interstitialAd) return;

    try {
      const isLoaded = await this.interstitialAd.isLoaded();
      
      if (isLoaded) {
        await this.interstitialAd.show();
        this.lastInterstitialTime = Date.now();
        
        // Reload for next time
        setTimeout(() => {
          this.loadInterstitialAd();
        }, 1000);
      } else {
        // Try to load if not loaded
        this.loadInterstitialAd();
      }
    } catch (error) {
      console.error('Error showing interstitial ad:', error);
      this.loadInterstitialAd();
    }
  }

  async showRewardedAd(): Promise<boolean> {
    console.log('AdService: showRewardedAd called');
    
    if (this.isPremium) {
      console.log('AdService: User is premium, granting reward without ad');
      return true;
    }
    
    if (!this.rewardedAd) {
      console.error('AdService: Rewarded ad not initialized, creating new one...');
      // Try to create a new one
      this.rewardedAd = RewardedAd.createForAdRequest(this.adUnitIds.rewarded);
      if (!this.rewardedAd) {
        return false;
      }
    }

    return new Promise((resolve) => {
      let isResolved = false;
      let cleanupTimeoutId: NodeJS.Timeout | null = null;
      
      // Helper to safely resolve only once and cleanup
      const safeResolve = (value: boolean) => {
        if (!isResolved) {
          isResolved = true;
          if (cleanupTimeoutId) {
            clearTimeout(cleanupTimeoutId);
            cleanupTimeoutId = null;
          }
          resolve(value);
        }
      };
      
      console.log('AdService: Setting up rewarded ad event listeners...');
      
      // Set up earned reward listener
      const unsubscribeEarned = this.rewardedAd!.addAdEventListener(
        RewardedAdEventType.EARNED_REWARD,
        (reward: any) => {
          console.log('AdService: ✅ USER EARNED REWARD!', reward);
          safeResolve(true);
          // Clean up listeners
          unsubscribeEarned();
          unsubscribeClosed();
          unsubscribeError();
          unsubscribeOpened();
          // Preload next ad
          setTimeout(() => this.loadRewardedAd(), 1000);
        }
      );

      // Set up closed listener
      const unsubscribeClosed = this.rewardedAd!.addAdEventListener(
        AdEventType.CLOSED,
        () => {
          console.log('AdService: 📱 Rewarded ad CLOSED event fired');
          console.log('AdService: 📱 isResolved status:', isResolved);
          console.log('AdService: 📱 __DEV__ mode:', __DEV__);
          
          // For test ads, sometimes the reward is granted but event doesn't fire properly
          // In dev mode, assume success if ad was shown
          if (__DEV__ && !isResolved) {
            console.log('AdService: ✅ DEV MODE - Treating closed ad as successful reward');
            console.log('AdService: ✅ Calling safeResolve(true) now...');
            safeResolve(true);
            // Clean up listeners
            unsubscribeEarned();
            unsubscribeClosed();
            unsubscribeError();
            unsubscribeOpened();
            console.log('AdService: ✅ Promise resolved with true, listeners cleaned up');
          } else if (!isResolved) {
            // Don't resolve false immediately - reward might have been earned
            setTimeout(() => {
              if (!isResolved) {
                console.log('AdService: No reward was granted, resolving false');
                safeResolve(false);
                // Clean up listeners
                unsubscribeEarned();
                unsubscribeClosed();
                unsubscribeError();
                unsubscribeOpened();
              }
            }, 500);
          }
          // Preload next ad
          setTimeout(() => this.loadRewardedAd(), 1000);
        }
      );
      
      // Add OPENED event listener to confirm ad is showing
      const unsubscribeOpened = this.rewardedAd!.addAdEventListener(
        AdEventType.OPENED,
        () => {
          console.log('AdService: 📺 Rewarded ad OPENED and displaying');
        }
      );
      
      // Set up error listener
      const unsubscribeError = this.rewardedAd!.addAdEventListener(
        AdEventType.ERROR,
        (error: any) => {
          console.error('AdService: Rewarded ad error:', error);
          safeResolve(false);
          // Clean up listeners
          unsubscribeEarned();
          unsubscribeClosed();
          unsubscribeError();
          unsubscribeOpened();
        }
      );

      // Try to show the ad directly (it might already be loaded from initialization)
      console.log('AdService: Attempting to show rewarded ad directly...');
      this.rewardedAd!.show()
        .then(() => {
          console.log('AdService: Rewarded ad show() succeeded');
        })
        .catch((showError: any) => {
          console.log('AdService: Ad not ready, loading first...', showError.message);
          
          // Ad not loaded, so load it first
          const unsubscribeLoaded = this.rewardedAd!.addAdEventListener(
            RewardedAdEventType.LOADED,
            () => {
              console.log('AdService: Rewarded ad loaded, showing now...');
              unsubscribeLoaded();
              
              // Now show the loaded ad
              this.rewardedAd!.show()
                .then(() => {
                  console.log('AdService: Rewarded ad shown after loading');
                })
                .catch((error: any) => {
                  console.error('AdService: Failed to show after loading:', error);
                  safeResolve(false);
                });
            }
          );
          
          // Load the ad
          console.log('AdService: Loading rewarded ad...');
          this.rewardedAd!.load();
          
          // Timeout if loading takes too long
          cleanupTimeoutId = setTimeout(() => {
            console.log('AdService: Load timeout reached');
            unsubscribeLoaded();
            safeResolve(false);
            // Clean up all listeners
            unsubscribeEarned();
            unsubscribeClosed();
            unsubscribeError();
            unsubscribeOpened();
          }, 15000);
        });
      
      // Add ultimate cleanup timeout to prevent stuck ads
      setTimeout(() => {
        if (!isResolved) {
          console.log('AdService: Ultimate timeout reached, cleaning up');
          safeResolve(false);
        }
      }, 30000);
    });
  }

  pauseAds() {
    console.log('AdService: Pausing all ads');
    // This method can be called when app goes to background
    // The actual ad instances will handle their own lifecycle
  }

  resumeAds() {
    console.log('AdService: Resuming ads');
    // Re-load ads if needed when app comes back
    if (this.interstitialAd && !this.isPremium) {
      this.loadInterstitialAd();
    }
    if (this.rewardedAd && !this.isPremium) {
      this.loadRewardedAd();
    }
  }

  cleanup() {
    console.log('AdService: Cleaning up all ads');
    // Properly dispose of ad instances
    this.interstitialAd = null;
    this.rewardedAd = null;
  }
}

export default AdService.getInstance();
