// Script to generate upload list and Firebase URLs for your videos
// Run this to see what needs to be uploaded

const fs = require('fs');
const path = require('path');

const stretchDataPath = path.join(__dirname, '../assets/stretchData');

function generateUploadPlan() {
  const uploadPlan = [];
  const folders = fs.readdirSync(stretchDataPath);
  
  console.log('📁 Found folders:', folders.length);
  console.log('\n🎬 Video Upload Plan:\n');
  
  folders.forEach(folder => {
    const folderPath = path.join(stretchDataPath, folder);
    const files = fs.readdirSync(folderPath);
    
    // Extract ID from folder name (id1_name_category)
    const idMatch = folder.match(/^id(\d+)/);
    if (!idMatch) return;
    
    const id = idMatch[0]; // 'id1', 'id2', etc.
    const videoFiles = files.filter(f => f.endsWith('.mp4') || f.endsWith('.mov'));
    
    videoFiles.forEach((file, index) => {
      const originalPath = path.join(folderPath, file);
      const extension = path.extname(file);
      
      // New naming: id1.mp4, id10_2.mp4 for multiples
      const newName = index === 0 ? `${id}${extension}` : `${id}_${index + 1}${extension}`;
      
      // Get file size
      const stats = fs.statSync(originalPath);
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(1);
      
      uploadPlan.push({
        originalPath,
        originalName: `${folder}/${file}`,
        newName,
        sizeMB,
        firebaseUrl: `https://firebasestorage.googleapis.com/v0/b/flexbreak-28ad0.appspot.com/o/videos%2F${encodeURIComponent(newName)}?alt=media`
      });
      
      console.log(`📤 ${folder}/${file}`);
      console.log(`   → videos/${newName} (${sizeMB}MB)`);
      console.log(`   📁 ${originalPath}`);
      console.log('');
    });
  });
  
  // Save upload plan to file
  fs.writeFileSync(
    path.join(__dirname, 'upload-plan.json'), 
    JSON.stringify(uploadPlan, null, 2)
  );
  
  const totalSize = uploadPlan.reduce((sum, item) => sum + parseFloat(item.sizeMB), 0);
  
  console.log('\n📊 SUMMARY:');
  console.log(`Total videos: ${uploadPlan.length}`);
  console.log(`Total size: ${totalSize.toFixed(1)}MB`);
  console.log('\n💾 Upload plan saved to: scripts/upload-plan.json');
  console.log('\n🚀 Next steps:');
  console.log('1. Review upload-plan.json');
  console.log('2. Upload videos to Firebase Storage using the new names');
  console.log('3. Use the firebaseUrl values for Firestore metadata');
  
  return uploadPlan;
}

// Run the script
generateUploadPlan();