// Script to regenerate Firebase URLs for problematic videos
const admin = require('firebase-admin');

try {
  const serviceAccount = require('./serviceAccountKey.json');
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: 'flexbreak-28ad0'
  });
} catch (error) {
  console.error('❌ Firebase Admin SDK not initialized. Please add serviceAccountKey.json');
  process.exit(1);
}

const bucket = admin.storage().bucket();

async function generateSignedUrl(fileName) {
  try {
    const file = bucket.file(`videos/${fileName}`);
    
    // Check if file exists
    const [exists] = await file.exists();
    if (!exists) {
      console.log(`❌ File does not exist: ${fileName}`);
      return null;
    }
    
    // Generate signed URL with 1 year expiry
    const options = {
      version: 'v4',
      action: 'read',
      expires: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year from now
    };
    
    const [url] = await file.getSignedUrl(options);
    return url;
  } catch (error) {
    console.error(`❌ Error generating URL for ${fileName}:`, error);
    return null;
  }
}

async function main() {
  console.log('🔧 Regenerating Firebase URLs for problematic videos...\n');
  
  const problematicVideos = [
    'id10_2.mp4',  // Wall Calf Stretch
    'id16_2.mp4',  // Belt-Assisted Calf Stretch
    'id11.mp4',    // Deep Lunge with Twist (should use id11, not id10_2)
    'id17.mp4'     // Side Lunge with Desk Support (should use id17, not id16_2)
  ];
  
  for (const fileName of problematicVideos) {
    console.log(`📥 Generating URL for: ${fileName}`);
    const url = await generateSignedUrl(fileName);
    
    if (url) {
      console.log(`✅ Generated URL for ${fileName}:`);
      console.log(`   ${url}\n`);
    } else {
      console.log(`❌ Failed to generate URL for ${fileName}\n`);
    }
  }
  
  console.log('✅ Done!');
  process.exit(0);
}

main().catch(console.error);