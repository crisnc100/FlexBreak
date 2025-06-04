// Automated script to upload videos to Firebase Storage with proper naming
// This will read your current folder structure and upload with renamed files

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

// You'll need to download the Firebase Admin SDK service account key
// Go to Firebase Console > Project Settings > Service Accounts > Generate new private key
// Save it as 'serviceAccountKey.json' in the scripts folder

try {
  const serviceAccount = require('./serviceAccountKey.json');
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: 'flexbreak-28ad0'
  });
} catch (error) {
  console.error('❌ Firebase Admin SDK not initialized. Please add serviceAccountKey.json');
  console.log('\n🔧 Setup instructions:');
  console.log('1. Go to Firebase Console > Project Settings > Service Accounts');
  console.log('2. Click "Generate new private key"');
  console.log('3. Save the file as "serviceAccountKey.json" in the scripts folder');
  process.exit(1);
}

const bucket = admin.storage().bucket();
const firestore = admin.firestore();

async function uploadVideoFromFolder(folderPath, foldername) {
  try {
    // Extract ID from folder name (id1_name_category)
    const idMatch = foldername.match(/^id(\d+)/);
    if (!idMatch) {
      console.log(`⚠️  Skipping ${foldername} - no ID found`);
      return [];
    }

    const id = idMatch[0]; // 'id1', 'id2', etc.
    
    // Check if already uploaded
    const existingDoc = await firestore.collection('videos').doc(id).get();
    if (existingDoc.exists) {
      console.log(`⏭️  Skipping ${id} - already uploaded`);
      return [];
    }
    
    const files = fs.readdirSync(folderPath);
    const videoFiles = files.filter(f => f.endsWith('.mp4') || f.endsWith('.mov'));
    
    const uploadResults = [];

    for (let i = 0; i < videoFiles.length; i++) {
      const file = videoFiles[i];
      const localPath = path.join(folderPath, file);
      const extension = path.extname(file);
      
      // Create Firebase Storage filename
      const firebaseFilename = i === 0 ? `${id}${extension}` : `${id}_${i + 1}${extension}`;
      const firebasePath = `videos/${firebaseFilename}`;
      
      console.log(`📤 Uploading: ${foldername}/${file} → ${firebasePath}`);
      
      // Upload to Firebase Storage
      await bucket.upload(localPath, {
        destination: firebasePath,
        metadata: {
          contentType: extension === '.mp4' ? 'video/mp4' : 'video/quicktime'
        }
      });
      
      // Get download URL
      const [url] = await bucket.file(firebasePath).getSignedUrl({
        action: 'read',
        expires: '03-09-2491' // Far future date for permanent URL
      });
      
      // Get file size
      const stats = fs.statSync(localPath);
      
      // Parse title and category from folder name
      const nameMatch = foldername.match(/^id\d+_(.+)_(\w+)$/);
      const title = nameMatch ? nameMatch[1].replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Unknown';
      const category = nameMatch ? nameMatch[2] : 'unknown';
      
      const videoData = {
        id: i === 0 ? id : `${id}_${i + 1}`,
        title: i === 0 ? title : `${title} (Version ${i + 1})`,
        category,
        storageUrl: url,
        format: extension.substring(1), // Remove the dot
        fileSize: stats.size,
        originalPath: `${foldername}/${file}`,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      // Create Firestore document
      await firestore.collection('videos').doc(videoData.id).set(videoData);
      
      console.log(`✅ Uploaded and documented: ${videoData.id}`);
      uploadResults.push(videoData);
    }
    
    return uploadResults;
    
  } catch (error) {
    console.error(`❌ Error uploading ${foldername}:`, error.message);
    return [];
  }
}

async function uploadAllVideos(testMode = true) {
  const stretchDataPath = path.join(__dirname, '../assets/stretchData');
  const folders = fs.readdirSync(stretchDataPath);
  
  // In test mode, only upload first 5 videos
  const foldersToProcess = testMode ? folders.slice(0, 5) : folders;
  
  console.log(`🚀 Starting upload ${testMode ? '(TEST MODE - 5 videos)' : '(ALL VIDEOS)'}`);
  console.log(`📁 Processing ${foldersToProcess.length} folders\n`);
  
  const allResults = [];
  
  for (const folder of foldersToProcess) {
    const folderPath = path.join(stretchDataPath, folder);
    const stat = fs.statSync(folderPath);
    
    if (stat.isDirectory()) {
      const results = await uploadVideoFromFolder(folderPath, folder);
      allResults.push(...results);
      
      // Small delay to avoid overwhelming Firebase
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log('\n🎉 Upload Complete!');
  console.log(`📊 Successfully uploaded: ${allResults.length} videos`);
  console.log(`🔗 Firebase Storage: https://console.firebase.google.com/project/flexbreak-28ad0/storage`);
  console.log(`📄 Firestore: https://console.firebase.google.com/project/flexbreak-28ad0/firestore`);
  
  return allResults;
}

// Check command line arguments
const args = process.argv.slice(2);
const isFullUpload = args.includes('--full');

// Run the upload
uploadAllVideos(!isFullUpload)
  .then(() => {
    console.log('\n✨ Done!');
    if (!isFullUpload) {
      console.log('\n🔄 To upload ALL videos, run: node autoUploadToFirebase.js --full');
    }
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Upload failed:', error);
    process.exit(1);
  });