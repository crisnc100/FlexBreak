// Test Firebase connection and create sample video metadata
const admin = require('firebase-admin');

try {
  const serviceAccount = require('./serviceAccountKey.json');
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'flexbreak-28ad0'
  });
  
  console.log('✅ Firebase Admin SDK initialized successfully');
} catch (error) {
  console.error('❌ Firebase initialization failed:', error.message);
  process.exit(1);
}

const firestore = admin.firestore();

// Test Firestore connection and create sample video metadata
async function testFirestore() {
  try {
    console.log('🔗 Testing Firestore connection...');
    
    // Create a test video document
    const testVideoData = {
      id: 'id1',
      title: 'Kneeling Hip Flexor',
      category: 'grass',
      format: 'mp4',
      // This will be a manual upload URL - you'll replace this after manual upload
      storageUrl: 'https://firebasestorage.googleapis.com/v0/b/flexbreak-28ad0.firebasestorage.app/o/videos%2Fid1.mp4?alt=media',
      fileSize: 5500000, // ~5.5MB
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await firestore.collection('videos').doc('id1').set(testVideoData);
    console.log('✅ Test video metadata created in Firestore');
    
    // Read it back
    const doc = await firestore.collection('videos').doc('id1').get();
    if (doc.exists) {
      console.log('✅ Successfully read video metadata:', doc.data());
    }
    
    console.log('\n🎯 Next Steps:');
    console.log('1. Enable Firebase Storage in console');
    console.log('2. Manually upload id1.mp4 to test');
    console.log('3. Update the storageUrl in Firestore with the real download URL');
    console.log('4. Test video playback in your app');
    
  } catch (error) {
    console.error('❌ Firestore test failed:', error.message);
  }
}

testFirestore()
  .then(() => {
    console.log('\n✨ Test complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  });