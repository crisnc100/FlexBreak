// Script to upload videos to Firebase Storage and create Firestore metadata
// Run this once to migrate your videos from local assets to Firebase

import firebase from 'firebase/compat/app';
import 'firebase/compat/storage';
import 'firebase/compat/firestore';
import * as fs from 'fs';
import * as path from 'path';
import firebaseConfig from '../firebase.config';

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const storage = firebase.storage();
const firestore = firebase.firestore();

interface VideoFile {
  id: string;
  title: string;
  category: string;
  filePath: string;
  format: 'mp4' | 'mov';
}

// Parse your existing video structure
function parseVideoDirectory(assetsPath: string): VideoFile[] {
  const videos: VideoFile[] = [];
  const stretchDataPath = path.join(assetsPath, 'stretchData');
  
  if (!fs.existsSync(stretchDataPath)) {
    console.error('stretchData directory not found');
    return videos;
  }

  const folders = fs.readdirSync(stretchDataPath);
  
  for (const folder of folders) {
    const folderPath = path.join(stretchDataPath, folder);
    const stat = fs.statSync(folderPath);
    
    if (stat.isDirectory()) {
      // Parse folder name: id{number}_{name}_{category}
      const match = folder.match(/^id(\d+)_(.+)_(\w+)$/);
      if (!match) continue;
      
      const [, idNum, name, category] = match;
      const files = fs.readdirSync(folderPath);
      
      for (const file of files) {
        if (file.endsWith('.mp4') || file.endsWith('.mov')) {
          const format = file.endsWith('.mp4') ? 'mp4' : 'mov';
          const title = name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          
          videos.push({
            id: `id${idNum}`,
            title,
            category,
            filePath: path.join(folderPath, file),
            format
          });
        }
      }
    }
  }
  
  return videos;
}

// Upload video to Firebase Storage
async function uploadVideo(video: VideoFile): Promise<string> {
  const fileBuffer = fs.readFileSync(video.filePath);
  const fileName = `${video.id}.${video.format}`;
  const storageRef = storage.ref(`videos/${fileName}`);
  
  console.log(`Uploading ${fileName}...`);
  
  await storageRef.put(fileBuffer, {
    contentType: video.format === 'mp4' ? 'video/mp4' : 'video/quicktime'
  });
  
  const downloadURL = await storageRef.getDownloadURL();
  console.log(`✓ Uploaded ${fileName}`);
  
  return downloadURL;
}

// Create Firestore document
async function createVideoMetadata(video: VideoFile, storageUrl: string, fileSize: number) {
  const videoDoc = {
    id: video.id,
    title: video.title,
    category: video.category,
    storageUrl,
    fileSize,
    format: video.format,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    lastAccessed: null
  };
  
  await firestore.collection('videos').doc(video.id).set(videoDoc);
  console.log(`✓ Created metadata for ${video.id}`);
}

// Main upload function
async function uploadAllVideos() {
  const assetsPath = path.join(__dirname, '../assets');
  const videos = parseVideoDirectory(assetsPath);
  
  console.log(`Found ${videos.length} videos to upload`);
  
  for (const video of videos) {
    try {
      // Get file size
      const stats = fs.statSync(video.filePath);
      const fileSize = stats.size;
      
      // Upload to Storage
      const storageUrl = await uploadVideo(video);
      
      // Create Firestore metadata
      await createVideoMetadata(video, storageUrl, fileSize);
      
      console.log(`✅ Completed ${video.id}`);
      
    } catch (error) {
      console.error(`❌ Error uploading ${video.id}:`, error);
    }
  }
  
  console.log('🎉 Upload complete!');
}

// Run the upload
uploadAllVideos().catch(console.error);

// USAGE INSTRUCTIONS:
// 1. Install dependencies: npm install firebase typescript @types/node
// 2. Run: npx ts-node scripts/uploadVideosToFirebase.ts
// 3. Monitor Firebase Console for uploads
// 4. Verify Firestore collection 'videos' is created