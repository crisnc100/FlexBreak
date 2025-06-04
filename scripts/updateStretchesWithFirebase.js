// Script to update stretches.ts with Firebase Storage URLs
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

// Initialize Firebase
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

async function updateStretchesFile() {
  try {
    console.log('🔄 Updating stretches.ts with Firebase URLs...');
    
    // Get all video metadata from Firestore
    const snapshot = await firestore.collection('videos').get();
    const videoData = {};
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      videoData[doc.id] = data.storageUrl;
    });
    
    console.log(`📋 Found ${Object.keys(videoData).length} videos in Firestore`);
    
    // Read current stretches.ts file
    const stretchesPath = path.join(__dirname, '../src/data/stretches.ts');
    let stretchesContent = fs.readFileSync(stretchesPath, 'utf8');
    
    console.log('📝 Processing stretches.ts...');
    
    // Track replacements
    let replacements = 0;
    let skipped = 0;
    
    // Replace image: markAsVideo(require('../../assets/stretchData/idX_name/image.mp4'))
    // with image: { uri: 'FIREBASE_URL' }
    stretchesContent = stretchesContent.replace(
      /image:\s*markAsVideo\(require\('\.\.\/\.\.\/assets\/stretchData\/id(\d+)_[^']+\/image\.(mp4|mov)'\)\)/g,
      (match, idNum, extension) => {
        const videoId = `id${idNum}`;
        
        // Special cases for id10 and id16 (use _2 versions)
        let actualVideoId = videoId;
        if (videoId === 'id10' || videoId === 'id16') {
          actualVideoId = `${videoId}_2`;
        }
        
        if (videoData[actualVideoId]) {
          replacements++;
          console.log(`  ✅ Replacing ${videoId} → ${actualVideoId}`);
          return `image: { uri: '${videoData[actualVideoId]}' }`;
        } else {
          skipped++;
          console.log(`  ⚠️  Skipping ${videoId} - not found in Firebase`);
          return match; // Keep original if not found
        }
      }
    );
    
    // Remove the markAsVideo import since we're not using it anymore
    stretchesContent = stretchesContent.replace(
      /import\s*{\s*markAsVideo\s*}\s*from\s*['"'][^'"]+['"'];\s*\n/,
      ''
    );
    
    // Write updated file
    fs.writeFileSync(stretchesPath, stretchesContent);
    
    console.log('\n📊 Update Summary:');
    console.log(`  ✅ Successful replacements: ${replacements}`);
    console.log(`  ⚠️  Skipped: ${skipped}`);
    console.log(`  📁 Updated file: ${stretchesPath}`);
    
    if (replacements > 0) {
      console.log('\n🎉 stretches.ts updated successfully!');
      console.log('\n🚀 Next steps:');
      console.log('1. Test your app to verify video loading works');
      console.log('2. If everything works, delete assets/stretchData folder');
      console.log('3. Rebuild app to see final size reduction');
    } else {
      console.log('\n❌ No replacements made. Check the file format.');
    }
    
  } catch (error) {
    console.error('❌ Error updating stretches.ts:', error.message);
  }
}

updateStretchesFile()
  .then(() => {
    console.log('\n✨ Update complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Update failed:', error);
    process.exit(1);
  });