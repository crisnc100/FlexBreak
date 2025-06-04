import AsyncStorage from '@react-native-async-storage/async-storage';

// Video loading service - progressive enhancement approach
// Phase 1: Smart loading with download progress tracking
// Phase 2: Will add file system caching when available

interface VideoLoadState {
  videoId: string;
  firebaseUrl: string;
  status: 'not_loaded' | 'downloading' | 'cached' | 'error';
  downloadProgress?: number;
  cachedAt?: number;
  errorMessage?: string;
}

interface VideoStats {
  totalVideosAccessed: number;
  uniqueVideosViewed: string[];
  lastAccessTime: number;
}

const VIDEO_STATS_KEY = 'video_access_stats';
const VIDEO_STATES_KEY = 'video_load_states';

export class VideoLoaderService {
  private static instance: VideoLoaderService;
  private loadStates: Map<string, VideoLoadState> = new Map();
  private downloadPromises: Map<string, Promise<string>> = new Map();

  static getInstance(): VideoLoaderService {
    if (!VideoLoaderService.instance) {
      VideoLoaderService.instance = new VideoLoaderService();
    }
    return VideoLoaderService.instance;
  }

  // Initialize service
  async initialize(): Promise<void> {
    try {
      await this.loadVideoStates();
      console.log(`📋 Video loader initialized with ${this.loadStates.size} tracked videos`);
    } catch (error) {
      console.error('❌ Failed to initialize video loader:', error);
    }
  }

  // Load video states from storage
  private async loadVideoStates(): Promise<void> {
    try {
      const statesData = await AsyncStorage.getItem(VIDEO_STATES_KEY);
      if (statesData) {
        const states: VideoLoadState[] = JSON.parse(statesData);
        this.loadStates = new Map(states.map(state => [state.videoId, state]));
      }
    } catch (error) {
      console.error('❌ Failed to load video states:', error);
    }
  }

  // Save video states to storage
  private async saveVideoStates(): Promise<void> {
    try {
      const states = Array.from(this.loadStates.values());
      await AsyncStorage.setItem(VIDEO_STATES_KEY, JSON.stringify(states));
    } catch (error) {
      console.error('❌ Failed to save video states:', error);
    }
  }

  // Extract video ID from Firebase URL
  private extractVideoIdFromUrl(firebaseUrl: string): string | null {
    try {
      // Try both encoded and unencoded paths
      let match = firebaseUrl.match(/videos%2F([^?&]+)/);
      if (!match) {
        match = firebaseUrl.match(/videos\/([^?&]+)/);
      }
      
      if (match) {
        const fileName = decodeURIComponent(match[1]);
        const videoId = fileName.replace(/\.(mp4|mov)$/, '');
        console.log(`🔍 Extracted video ID: ${videoId} from ${fileName}`);
        return videoId;
      }
      
      console.warn('⚠️ Could not extract video ID from URL pattern:', firebaseUrl.substring(0, 100));
      return null;
    } catch (error) {
      console.error('❌ Failed to extract video ID from URL:', error);
      return null;
    }
  }

  // Get video source with smart loading
  async getVideoSource(firebaseUrl: string, onProgress?: (progress: number) => void): Promise<{
    uri: string;
    isLocal: boolean;
    status: 'streaming' | 'cached' | 'downloading';
  }> {
    const videoId = this.extractVideoIdFromUrl(firebaseUrl);
    
    if (!videoId) {
      console.warn('⚠️ Could not extract video ID from URL, streaming directly');
      return { uri: firebaseUrl, isLocal: false, status: 'streaming' };
    }

    // Track video access
    await this.trackVideoAccess(videoId);

    // For now, always stream (Phase 1)
    // TODO: Add actual caching in Phase 2
    console.log(`📺 Streaming video: ${videoId}`);
    
    // Update load state
    const loadState: VideoLoadState = {
      videoId,
      firebaseUrl,
      status: 'not_loaded'
    };
    
    this.loadStates.set(videoId, loadState);
    await this.saveVideoStates();

    return { 
      uri: firebaseUrl, 
      isLocal: false, 
      status: 'streaming' 
    };
  }

  // Track video access for analytics
  private async trackVideoAccess(videoId: string): Promise<void> {
    try {
      const statsData = await AsyncStorage.getItem(VIDEO_STATS_KEY);
      let stats: VideoStats = {
        totalVideosAccessed: 0,
        uniqueVideosViewed: [],
        lastAccessTime: Date.now()
      };

      if (statsData) {
        stats = JSON.parse(statsData);
      }

      // Update stats
      stats.totalVideosAccessed++;
      stats.lastAccessTime = Date.now();
      
      if (!stats.uniqueVideosViewed.includes(videoId)) {
        stats.uniqueVideosViewed.push(videoId);
      }

      await AsyncStorage.setItem(VIDEO_STATS_KEY, JSON.stringify(stats));
    } catch (error) {
      console.error('❌ Failed to track video access:', error);
    }
  }

  // Get video access statistics
  async getVideoStats(): Promise<VideoStats> {
    try {
      const statsData = await AsyncStorage.getItem(VIDEO_STATS_KEY);
      if (statsData) {
        return JSON.parse(statsData);
      }
    } catch (error) {
      console.error('❌ Failed to get video stats:', error);
    }

    return {
      totalVideosAccessed: 0,
      uniqueVideosViewed: [],
      lastAccessTime: 0
    };
  }

  // Check if video has been accessed before
  async hasVideoBeenAccessed(firebaseUrl: string): Promise<boolean> {
    const videoId = this.extractVideoIdFromUrl(firebaseUrl);
    if (!videoId) return false;

    const stats = await this.getVideoStats();
    return stats.uniqueVideosViewed.includes(videoId);
  }

  // Get load state for a video
  getVideoLoadState(firebaseUrl: string): VideoLoadState | null {
    const videoId = this.extractVideoIdFromUrl(firebaseUrl);
    if (!videoId) return null;

    return this.loadStates.get(videoId) || null;
  }

  // Clear all video data
  async clearVideoData(): Promise<void> {
    try {
      await AsyncStorage.removeItem(VIDEO_STATS_KEY);
      await AsyncStorage.removeItem(VIDEO_STATES_KEY);
      this.loadStates.clear();
      console.log('🗑️ Video data cleared');
    } catch (error) {
      console.error('❌ Failed to clear video data:', error);
    }
  }

  // Get summary of video usage
  async getVideoUsageSummary(): Promise<{
    totalAccessed: number;
    uniqueVideos: number;
    mostRecentAccess: Date | null;
  }> {
    const stats = await this.getVideoStats();
    
    return {
      totalAccessed: stats.totalVideosAccessed,
      uniqueVideos: stats.uniqueVideosViewed.length,
      mostRecentAccess: stats.lastAccessTime ? new Date(stats.lastAccessTime) : null
    };
  }
}

// Export singleton instance
export const videoLoaderService = VideoLoaderService.getInstance();