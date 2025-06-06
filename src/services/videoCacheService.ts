import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

// Video cache configuration
const VIDEO_CACHE_DIR = `${FileSystem.documentDirectory}videoCache/`;
const CACHE_INDEX_KEY = 'video_cache_index';

interface CacheEntry {
  videoId: string;
  localPath: string;
  firebaseUrl: string;
  downloadedAt: number;
  fileSize: number;
}

interface CacheIndex {
  [videoId: string]: CacheEntry;
}

export class VideoCacheService {
  private static instance: VideoCacheService;
  private cacheIndex: CacheIndex = {};
  private downloadPromises: Map<string, Promise<string>> = new Map();

  static getInstance(): VideoCacheService {
    if (!VideoCacheService.instance) {
      VideoCacheService.instance = new VideoCacheService();
    }
    return VideoCacheService.instance;
  }

  // Initialize cache directory and load index
  async initialize(): Promise<void> {
    try {
      // Create cache directory if it doesn't exist
      const dirInfo = await FileSystem.getInfoAsync(VIDEO_CACHE_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(VIDEO_CACHE_DIR, { intermediates: true });
        console.log('📁 Video cache directory created');
      }

      // Load cache index
      await this.loadCacheIndex();
      console.log(`📋 Video cache initialized with ${Object.keys(this.cacheIndex).length} cached videos`);
    } catch (error) {
      console.error('❌ Failed to initialize video cache:', error);
    }
  }

  // Load cache index from storage
  private async loadCacheIndex(): Promise<void> {
    try {
      const indexData = await AsyncStorage.getItem(CACHE_INDEX_KEY);
      if (indexData) {
        this.cacheIndex = JSON.parse(indexData);
      }
    } catch (error) {
      console.error('❌ Failed to load cache index:', error);
      this.cacheIndex = {};
    }
  }

  // Save cache index to storage
  private async saveCacheIndex(): Promise<void> {
    try {
      await AsyncStorage.setItem(CACHE_INDEX_KEY, JSON.stringify(this.cacheIndex));
    } catch (error) {
      console.error('❌ Failed to save cache index:', error);
    }
  }

  // Extract video ID from Firebase URL
  private extractVideoIdFromUrl(firebaseUrl: string): string | null {
    try {
      const match = firebaseUrl.match(/videos%2F([^?&]+)/);
      if (match) {
        return decodeURIComponent(match[1]).replace(/\.(mp4|mov)$/, '');
      }
      return null;
    } catch (error) {
      console.error('❌ Failed to extract video ID from URL:', error);
      return null;
    }
  }

  // Check if video is cached locally
  async isVideoCached(firebaseUrl: string): Promise<boolean> {
    const videoId = this.extractVideoIdFromUrl(firebaseUrl);
    if (!videoId) return false;

    const cacheEntry = this.cacheIndex[videoId];
    if (!cacheEntry) return false;

    // Check if file actually exists
    try {
      const fileInfo = await FileSystem.getInfoAsync(cacheEntry.localPath);
      return fileInfo.exists;
    } catch {
      return false;
    }
  }

  // Get video source - returns local path if cached, initiates download if not
  async getVideoSource(firebaseUrl: string): Promise<{ uri: string; isLocal: boolean }> {
    const videoId = this.extractVideoIdFromUrl(firebaseUrl);
    
    if (!videoId) {
      console.warn('⚠️ Could not extract video ID from URL, streaming directly');
      return { uri: firebaseUrl, isLocal: false };
    }

    // Check if already cached
    if (await this.isVideoCached(firebaseUrl)) {
      const cacheEntry = this.cacheIndex[videoId];
      console.log(`✅ Using cached video: ${videoId}`);
      return { uri: cacheEntry.localPath, isLocal: true };
    }

    // Check if download is already in progress
    if (this.downloadPromises.has(videoId)) {
      console.log(`⏳ Download in progress for: ${videoId}`);
      try {
        const localPath = await this.downloadPromises.get(videoId)!;
        return { uri: localPath, isLocal: true };
      } catch (error) {
        console.error(`❌ Download failed for ${videoId}, streaming directly:`, error);
        return { uri: firebaseUrl, isLocal: false };
      }
    }

    // Start download
    console.log(`📥 Starting download for: ${videoId}`);
    const downloadPromise = this.downloadVideo(firebaseUrl, videoId);
    this.downloadPromises.set(videoId, downloadPromise);

    try {
      const localPath = await downloadPromise;
      this.downloadPromises.delete(videoId);
      return { uri: localPath, isLocal: true };
    } catch (error) {
      console.error(`❌ Download failed for ${videoId}, streaming directly:`, error);
      this.downloadPromises.delete(videoId);
      return { uri: firebaseUrl, isLocal: false };
    }
  }

  // Download video and cache it
  private async downloadVideo(firebaseUrl: string, videoId: string): Promise<string> {
    const fileName = `${videoId}.${firebaseUrl.includes('.mov') ? 'mov' : 'mp4'}`;
    const localPath = `${VIDEO_CACHE_DIR}${fileName}`;

    try {
      console.log(`📥 Downloading video: ${videoId}`);
      
      const downloadResult = await FileSystem.downloadAsync(firebaseUrl, localPath);
      
      if (downloadResult.status === 200) {
        // Get file size
        const fileInfo = await FileSystem.getInfoAsync(localPath);
        const fileSize = fileInfo.exists ? fileInfo.size : 0;

        // Update cache index
        const cacheEntry: CacheEntry = {
          videoId,
          localPath,
          firebaseUrl,
          downloadedAt: Date.now(),
          fileSize
        };

        this.cacheIndex[videoId] = cacheEntry;
        await this.saveCacheIndex();

        console.log(`✅ Downloaded and cached: ${videoId} (${(fileSize / 1024 / 1024).toFixed(1)}MB)`);
        return localPath;
      } else {
        throw new Error(`Download failed with status: ${downloadResult.status}`);
      }
    } catch (error) {
      console.error(`❌ Failed to download video ${videoId}:`, error);
      // Clean up partial download
      try {
        await FileSystem.deleteAsync(localPath, { idempotent: true });
      } catch {}
      throw error;
    }
  }

  // Get cache statistics
  async getCacheStats(): Promise<{
    totalVideos: number;
    totalSize: number;
    sizeInMB: number;
  }> {
    const entries = Object.values(this.cacheIndex);
    const totalSize = entries.reduce((sum, entry) => sum + entry.fileSize, 0);
    
    return {
      totalVideos: entries.length,
      totalSize,
      sizeInMB: Math.round(totalSize / 1024 / 1024 * 10) / 10
    };
  }

  // Clear cache
  async clearCache(): Promise<void> {
    try {
      // Delete all cached files
      for (const entry of Object.values(this.cacheIndex)) {
        try {
          await FileSystem.deleteAsync(entry.localPath, { idempotent: true });
        } catch (error) {
          console.warn(`⚠️ Failed to delete cached file: ${entry.localPath}`);
        }
      }

      // Clear index
      this.cacheIndex = {};
      await this.saveCacheIndex();

      console.log('🗑️ Video cache cleared');
    } catch (error) {
      console.error('❌ Failed to clear cache:', error);
    }
  }

  // Delete specific video from cache
  async deleteCachedVideo(firebaseUrl: string): Promise<void> {
    const videoId = this.extractVideoIdFromUrl(firebaseUrl);
    if (!videoId) return;

    const cacheEntry = this.cacheIndex[videoId];
    if (cacheEntry) {
      try {
        await FileSystem.deleteAsync(cacheEntry.localPath, { idempotent: true });
        delete this.cacheIndex[videoId];
        await this.saveCacheIndex();
        console.log(`🗑️ Deleted cached video: ${videoId}`);
      } catch (error) {
        console.error(`❌ Failed to delete cached video ${videoId}:`, error);
      }
    }
  }
}

// Export singleton instance
export const videoCacheService = VideoCacheService.getInstance();