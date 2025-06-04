import firebase from 'firebase/compat/app';
import 'firebase/compat/storage';
import 'firebase/compat/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Video metadata interface
export interface VideoMetadata {
  id: string;
  title: string;
  description?: string;
  category: string; // 'office', 'grass', 'gym', etc.
  storageUrl: string; // Firebase Storage download URL
  format: 'mp4' | 'mov';
  fileSize?: number;
  duration?: number;
}

export class VideoStorageService {
  private static instance: VideoStorageService;
  private firestore: firebase.firestore.Firestore;

  constructor() {
    this.firestore = firebase.firestore();
  }

  static getInstance(): VideoStorageService {
    if (!VideoStorageService.instance) {
      VideoStorageService.instance = new VideoStorageService();
    }
    return VideoStorageService.instance;
  }

  // Get video metadata from Firestore
  async getVideoMetadata(videoId: string): Promise<VideoMetadata | null> {
    try {
      const doc = await this.firestore.collection('videos').doc(videoId).get();
      if (doc.exists) {
        return doc.data() as VideoMetadata;
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
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as VideoMetadata));
    } catch (error) {
      console.error('Error getting all videos:', error);
      return [];
    }
  }

  // Get video URL for playback
  async getVideoUrl(videoId: string): Promise<string | null> {
    try {
      const metadata = await this.getVideoMetadata(videoId);
      return metadata?.storageUrl || null;
    } catch (error) {
      console.error('Error getting video URL:', error);
      return null;
    }
  }

  // Create/update video metadata (for initial setup)
  async createVideoMetadata(videoData: VideoMetadata): Promise<void> {
    try {
      await this.firestore.collection('videos').doc(videoData.id).set({
        ...videoData,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastAccessed: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.error('Error creating video metadata:', error);
    }
  }

  // Update video access time
  async updateVideoAccess(videoId: string): Promise<void> {
    try {
      await this.firestore.collection('videos').doc(videoId).update({
        lastAccessed: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating video access:', error);
    }
  }
}

// Export singleton instance
export const videoStorageService = VideoStorageService.getInstance();