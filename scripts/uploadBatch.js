// Upload videos in smaller batches to avoid timeout
const { execSync } = require('child_process');
const admin = require('firebase-admin');

try {
  const serviceAccount = require('./serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: 'flexbreak-28ad0'
  });
} catch (error) {
  console.error('❌ Firebase setup failed:', error.message);
  process.exit(1);
}

const firestore = admin.firestore();

async function checkUploadProgress() {
  try {
    console.log('📊 Checking upload progress...');
    
    const snapshot = await firestore.collection('videos').get();
    const uploadedVideos = snapshot.docs.map(doc => doc.id).sort();
    
    console.log(`✅ Successfully uploaded: ${uploadedVideos.length} videos`);
    console.log('📋 Uploaded videos:', uploadedVideos.slice(0, 20).join(', '), uploadedVideos.length > 20 ? '...' : '');
    
    // List some that might be missing (common ones)
    const expectedVideos = ['id1', 'id2', 'id3', 'id4', 'id5', 'id36', 'id40', 'id50', 'id59', 'id73', 'id77', 'id79', 'id88', 'id92', 'id95', 'id97'];
    const missing = expectedVideos.filter(id => !uploadedVideos.includes(id));
    
    if (missing.length > 0) {
      console.log(`❌ Some videos might be missing: ${missing.join(', ')}`);
      console.log('\n🔄 Rerun the upload to catch any missing videos:');
      console.log('node autoUploadToFirebase.js --full');
    } else {
      console.log('🎉 All major videos appear to be uploaded!');
    }
    
    return uploadedVideos.length;
    
  } catch (error) {
    console.error('❌ Error checking progress:', error.message);
    return 0;
  }
}

checkUploadProgress()
  .then(count => {
    console.log(`\n📈 Upload Progress: ${count}/118 videos`);
    
    if (count < 110) {
      console.log('\n⏳ Continue uploading remaining videos...');
      console.log('💡 The script will automatically skip already uploaded videos');
    } else {
      console.log('\n✅ Upload appears mostly complete!');
    }
    
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Check failed:', error);
    process.exit(1);
  });