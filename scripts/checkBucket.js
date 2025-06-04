const admin = require('firebase-admin');

try {
  const serviceAccount = require('./serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'flexbreak-28ad0'
  });
  
  console.log('🔍 Checking available storage buckets...');
  
  // List buckets
  admin.storage().getBuckets()
    .then(([buckets]) => {
      console.log('📁 Available buckets:');
      buckets.forEach(bucket => {
        console.log(`  - ${bucket.name}`);
      });
      
      if (buckets.length === 0) {
        console.log('❌ No buckets found. You need to create a bucket in Firebase Console.');
      }
    })
    .catch(error => {
      console.error('❌ Error listing buckets:', error.message);
      console.log('\n💡 Try these bucket names:');
      console.log('  - flexbreak-28ad0.appspot.com');
      console.log('  - flexbreak-28ad0.firebasestorage.app');
    });
    
} catch (error) {
  console.error('❌ Setup error:', error.message);
}