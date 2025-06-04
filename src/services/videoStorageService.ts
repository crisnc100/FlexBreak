import firebase from 'firebase/compat/app';
import 'firebase/compat/storage';
import 'firebase/compat/firestore';
// Using AsyncStorage for now - simpler implementation
import AsyncStorage from '@react-native-async-storage/async-storage';

// Video metadata interface
export interface VideoMetadata {
  id: string;
  title: string;
  description?: string;
  duration?: number;
  category: string; // 'office', 'grass', 'gym', etc.
  storageUrl: string; // Firebase Storage download URL
  fileSize: number; // in bytes
  format: 'mp4' | 'mov';
  isDownloaded?: boolean; // local flag
  localPath?: string; // local file path
  lastAccessed?: Date;
}

// Cache tracking with AsyncStorage
const VIDEO_CACHE_KEY = 'video_cache_info';

export class VideoStorageService {
  private static instance: VideoStorageService;
  private firestore: firebase.firestore.Firestore;
  private storage: firebase.storage.Storage;

  constructor() {
    this.firestore = firebase.firestore();
    this.storage = firebase.storage();
  }

  static getInstance(): VideoStorageService {
    if (!VideoStorageService.instance) {
      VideoStorageService.instance = new VideoStorageService();
    }
    return VideoStorageService.instance;
  }

  // Initialize video cache directory
  async initializeCache(): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(VIDEO_CACHE_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(VIDEO_CACHE_DIR, { intermediates: true });
        console.log('Video cache directory created');
      }
    } catch (error) {
      console.error('Error initializing video cache:', error);
    }
  }

  // Get video metadata from Firestore
  async getVideoMetadata(videoId: string): Promise<VideoMetadata | null> {
    try {
      const doc = await this.firestore.collection('videos').doc(videoId).get();
      if (doc.exists) {
        const data = doc.data() as VideoMetadata;
        
        // Check if video is cached locally
        const localPath = `${VIDEO_CACHE_DIR}${videoId}.${data.format}`;
        const fileInfo = await FileSystem.getInfoAsync(localPath);
        
        return {
          ...data,
          isDownloaded: fileInfo.exists,
          localPath: fileInfo.exists ? localPath : undefined
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting video metadata:', error);
      return null;
    }
  }

  // Get all video metadata
  async getAllVideos(): Promise<VideoMetadata[]> {
    try {
      const snapshot = await this.firestore.collection('videos').get();
      const videos: VideoMetadata[] = [];

      for (const doc of snapshot.docs) {
        const data = doc.data() as VideoMetadata;
        
        // Check if each video is cached locally
        const localPath = `${VIDEO_CACHE_DIR}${doc.id}.${data.format}`;
        const fileInfo = await FileSystem.getInfoAsync(localPath);
        
        videos.push({
          ...data,
          id: doc.id,
          isDownloaded: fileInfo.exists,
          localPath: fileInfo.exists ? localPath : undefined
        });
      }

      return videos;
    } catch (error) {
      console.error('Error getting all videos:', error);
      return [];
    }
  }

  // Download and cache video
  async downloadVideo(
    videoId: string, 
    onProgress?: (progress: number) => void
  ): Promise<string | null> {
    try {
      const metadata = await this.getVideoMetadata(videoId);
      if (!metadata) {
        throw new Error('Video metadata not found');
      }

      // Check if already downloaded
      if (metadata.isDownloaded && metadata.localPath) {
        return metadata.localPath;
      }

      const localPath = `${VIDEO_CACHE_DIR}${videoId}.${metadata.format}`;
      
      // Download with progress tracking
      const downloadResumable = FileSystem.createDownloadResumable(
        metadata.storageUrl,
        localPath,
        {},
        (downloadProgress) => {
          const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
          onProgress?.(progress);
        }
      );

      const result = await downloadResumable.downloadAsync();
      
      if (result?.uri) {
        // Update last accessed time
        await this.updateVideoAccess(videoId);
        return result.uri;
      }
      
      return null;
    } catch (error) {
      console.error('Error downloading video:', error);
      return null;
    }
  }

  // Get video source (local if cached, remote if not)
  async getVideoSource(videoId: string): Promise<{ uri: string; isLocal: boolean } | null> {
    try {
      const metadata = await this.getVideoMetadata(videoId);
      if (!metadata) return null;

      if (metadata.isDownloaded && metadata.localPath) {
        return { uri: metadata.localPath, isLocal: true };
      } else {
        return { uri: metadata.storageUrl, isLocal: false };
      }
    } catch (error) {
      console.error('Error getting video source:', error);
      return null;
    }
  }

  // Update video access time
  private async updateVideoAccess(videoId: string): Promise<void> {
    try {
      await this.firestore.collection('videos').doc(videoId).update({
        lastAccessed: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating video access:', error);
    }
  }

  // Get cache size and info
  async getCacheInfo(): Promise<{ totalSize: number; videoCount: number; videos: string[] }> {
    try {
      const dirInfo = await FileSystem.readDirectoryAsync(VIDEO_CACHE_DIR);
      let totalSize = 0;
      const videos: string[] = [];

      for (const fileName of dirInfo) {
        const filePath = `${VIDEO_CACHE_DIR}${fileName}`;
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        if (fileInfo.exists && fileInfo.size) {
          totalSize += fileInfo.size;
          videos.push(fileName);
        }
      }

      return { totalSize, videoCount: videos.length, videos };
    } catch (error) {
      console.error('Error getting cache info:', error);
      return { totalSize: 0, videoCount: 0, videos: [] };
    }
  }

  // Clear video cache
  async clearCache(): Promise<void> {
    try {
      const dirInfo = await FileSystem.readDirectoryAsync(VIDEO_CACHE_DIR);
      
      for (const fileName of dirInfo) {
        const filePath = `${VIDEO_CACHE_DIR}${fileName}`;
        await FileSystem.deleteAsync(filePath);
      }
      
      console.log('Video cache cleared');
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  // Delete specific video from cache
  async deleteVideoFromCache(videoId: string): Promise<void> {
    try {
      const metadata = await this.getVideoMetadata(videoId);
      if (metadata?.localPath) {
        await FileSystem.deleteAsync(metadata.localPath);
        console.log(`Video ${videoId} deleted from cache`);
      }
    } catch (error) {
      console.error('Error deleting video from cache:', error);
    }
  }
}

// Export singleton instance
export const videoStorageService = VideoStorageService.getInstance();