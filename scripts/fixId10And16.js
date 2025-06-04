// Fix id10 and id16 to use id10_2 and id16_2 Firebase URLs
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

async function fixStretchIds() {
  try {
    console.log('🔧 Fixing id10 and id16 to use id10_2 and id16_2 URLs...');
    
    // Get the URLs for id10_2 and id16_2
    const id10Doc = await firestore.collection('videos').doc('id10_2').get();
    const id16Doc = await firestore.collection('videos').doc('id16_2').get();
    
    if (!id10Doc.exists || !id16Doc.exists) {
      console.error('❌ Could not find id10_2 or id16_2 in Firestore');
      return;
    }
    
    const id10Url = id10Doc.data().storageUrl;
    const id16Url = id16Doc.data().storageUrl;
    
    console.log('📋 Found URLs:');
    console.log(`  id10_2: ${id10Url.substring(0, 80)}...`);
    console.log(`  id16_2: ${id16Url.substring(0, 80)}...`);
    
    // Read stretches.ts file
    const stretchesPath = path.join(__dirname, '../src/data/stretches.ts');
    let content = fs.readFileSync(stretchesPath, 'utf8');
    
    // Find and replace id: 10 section
    const id10Pattern = /({\s*id:\s*10,[\s\S]*?image:\s*{\s*uri:\s*')[^']+('[\s\S]*?})/;
    const id10Match = content.match(id10Pattern);
    
    if (id10Match) {
      const newId10 = id10Match[0].replace(id10Pattern, `$1${id10Url}$2`);
      content = content.replace(id10Match[0], newId10);
      console.log('✅ Updated stretch id: 10 to use id10_2 URL');
    } else {
      console.log('⚠️  Could not find stretch id: 10');
    }
    
    // Find and replace id: 16 section
    const id16Pattern = /({\s*id:\s*16,[\s\S]*?image:\s*{\s*uri:\s*')[^']+('[\s\S]*?})/;
    const id16Match = content.match(id16Pattern);
    
    if (id16Match) {
      const newId16 = id16Match[0].replace(id16Pattern, `$1${id16Url}$2`);
      content = content.replace(id16Match[0], newId16);
      console.log('✅ Updated stretch id: 16 to use id16_2 URL');
    } else {
      console.log('⚠️  Could not find stretch id: 16');
    }
    
    // Write updated file
    fs.writeFileSync(stretchesPath, content);
    
    console.log('\n🎉 Successfully updated stretches.ts!');
    console.log('📋 Summary:');
    console.log('  - Stretch id: 10 now uses id10_2 video URL');
    console.log('  - Stretch id: 16 now uses id16_2 video URL');
    
  } catch (error) {
    console.error('❌ Error fixing IDs:', error.message);
  }
}

fixStretchIds()
  .then(() => {
    console.log('\n✨ Fix complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Fix failed:', error);
    process.exit(1);
  });