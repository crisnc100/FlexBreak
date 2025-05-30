import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Types
export interface UpdateInfo {
  isUpdateAvailable: boolean;
  currentVersion: string;
  latestVersion: string;
  updateUrl: string;
  releaseNotes?: string;
  isMandatory?: boolean;
}

interface GitHubRelease {
  tag_name: string;
  name: string;
  body: string;
  published_at: string;
  prerelease: boolean;
  draft: boolean;
}

// Configuration
const UPDATE_CHECK_KEY = '@flexbreak_last_update_check';
const UPDATE_DISMISSED_KEY = '@flexbreak_update_dismissed_version';
const UPDATE_CHECK_INTERVAL = 1000 * 60 * 60 * 6; // 6 hours
const GITHUB_REPO_OWNER = 'crisnc100'; // TODO: Replace with your GitHub username
const GITHUB_REPO_NAME = 'FlexBreak'; // Your repo name

class UpdateService {
  private static instance: UpdateService;
  
  private constructor() {}
  
  static getInstance(): UpdateService {
    if (!UpdateService.instance) {
      UpdateService.instance = new UpdateService();
    }
    return UpdateService.instance;
  }

  /**
   * Get the current app version
   */
  getCurrentVersion(): string {
    return Constants.expoConfig?.version || Constants.manifest?.version || '1.0.0';
  }

  /**
   * Compare two semantic versions
   * Returns: 1 if v1 > v2, -1 if v1 < v2, 0 if equal
   */
  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const part1 = parts1[i] || 0;
      const part2 = parts2[i] || 0;
      
      if (part1 > part2) return 1;
      if (part1 < part2) return -1;
    }
    
    return 0;
  }

  /**
   * Check if we should perform an update check
   */
  private async shouldCheckForUpdate(): Promise<boolean> {
    try {
      const lastCheck = await AsyncStorage.getItem(UPDATE_CHECK_KEY);
      if (!lastCheck) return true;
      
      const lastCheckTime = parseInt(lastCheck, 10);
      const now = Date.now();
      
      return now - lastCheckTime > UPDATE_CHECK_INTERVAL;
    } catch (error) {
      console.error('Error checking last update time:', error);
      return true;
    }
  }

  /**
   * Save the last update check time
   */
  private async saveLastCheckTime(): Promise<void> {
    try {
      await AsyncStorage.setItem(UPDATE_CHECK_KEY, Date.now().toString());
    } catch (error) {
      console.error('Error saving last check time:', error);
    }
  }

  /**
   * Check if user has dismissed this version
   */
  async hasUserDismissedVersion(version: string): Promise<boolean> {
    try {
      const dismissedVersion = await AsyncStorage.getItem(UPDATE_DISMISSED_KEY);
      return dismissedVersion === version;
    } catch (error) {
      console.error('Error checking dismissed version:', error);
      return false;
    }
  }

  /**
   * Save that user dismissed this version
   */
  async dismissVersion(version: string): Promise<void> {
    try {
      await AsyncStorage.setItem(UPDATE_DISMISSED_KEY, version);
    } catch (error) {
      console.error('Error saving dismissed version:', error);
    }
  }

  /**
   * Fetch latest release from GitHub
   */
  private async fetchLatestRelease(): Promise<GitHubRelease | null> {
    try {
      const response = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases/latest`,
        {
          headers: {
            'Accept': 'application/vnd.github.v3+json',
          },
        }
      );

      if (!response.ok) {
        console.error('Failed to fetch latest release:', response.status);
        return null;
      }

      const release = await response.json() as GitHubRelease;
      
      // Only consider non-prerelease, non-draft releases
      if (release.prerelease || release.draft) {
        return null;
      }

      return release;
    } catch (error) {
      console.error('Error fetching latest release:', error);
      return null;
    }
  }

  /**
   * Get the store URL for updates
   */
  private getStoreUrl(): string {
    if (Platform.OS === 'ios') {
      // Your App Store URL
      return 'https://apps.apple.com/app/flexbreak/id6743581671';
    } else {
      // Android version not available yet
      // Return empty string or a coming soon page
      return '';
    }
  }

  /**
   * Check for updates
   */
  async checkForUpdate(forceCheck = false): Promise<UpdateInfo> {
    const currentVersion = this.getCurrentVersion();
    const defaultResponse: UpdateInfo = {
      isUpdateAvailable: false,
      currentVersion,
      latestVersion: currentVersion,
      updateUrl: this.getStoreUrl(),
    };

    try {
      // Check if we should perform the check
      if (!forceCheck && !(await this.shouldCheckForUpdate())) {
        console.log('Skipping update check - too soon since last check');
        return defaultResponse;
      }

      // Fetch latest release from GitHub
      const latestRelease = await this.fetchLatestRelease();
      if (!latestRelease) {
        console.log('No valid release found');
        return defaultResponse;
      }

      // Extract version from tag (remove 'v' prefix if present)
      const latestVersion = latestRelease.tag_name.replace(/^v/, '');
      
      // Compare versions
      const comparison = this.compareVersions(latestVersion, currentVersion);
      const isUpdateAvailable = comparison > 0;

      // Check if update is mandatory (you can implement your own logic)
      // For example, mandatory if major version changed
      const currentMajor = parseInt(currentVersion.split('.')[0], 10);
      const latestMajor = parseInt(latestVersion.split('.')[0], 10);
      const isMandatory = latestMajor > currentMajor;

      // Save last check time
      await this.saveLastCheckTime();

      const updateInfo: UpdateInfo = {
        isUpdateAvailable,
        currentVersion,
        latestVersion,
        updateUrl: this.getStoreUrl(),
        releaseNotes: latestRelease.body,
        isMandatory,
      };

      console.log('Update check result:', updateInfo);
      return updateInfo;

    } catch (error) {
      console.error('Error checking for updates:', error);
      return defaultResponse;
    }
  }

  /**
   * Clear all update-related data
   */
  async clearUpdateData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([UPDATE_CHECK_KEY, UPDATE_DISMISSED_KEY]);
    } catch (error) {
      console.error('Error clearing update data:', error);
    }
  }
}

export default UpdateService.getInstance();