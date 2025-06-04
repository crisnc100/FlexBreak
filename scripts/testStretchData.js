// Quick test to check what stretch data looks like now
const fs = require('fs');
const path = require('path');

// Read the stretches.ts file and extract first few stretches
const stretchesPath = path.join(__dirname, '../src/data/stretches.ts');
const content = fs.readFileSync(stretchesPath, 'utf8');

// Extract the first stretch definition
const match = content.match(/{\s*id:\s*1,[\s\S]*?image:\s*{[^}]+}[\s\S]*?},/);

if (match) {
  console.log('📋 First stretch definition:');
  console.log(match[0]);
  
  // Check if it has .mp4 or .mov in the URI
  const uriMatch = match[0].match(/uri:\s*'([^']+)'/);
  if (uriMatch) {
    const uri = uriMatch[1];
    console.log('\n🔗 Image URI:', uri.substring(0, 100) + '...');
    console.log('📹 Is video?', uri.includes('.mp4') || uri.includes('.mov'));
    console.log('🔥 Is Firebase?', uri.includes('storage.googleapis.com'));
  }
} else {
  console.log('❌ Could not find stretch definition');
}

// Check if any markAsVideo references remain
const markAsVideoCount = (content.match(/markAsVideo/g) || []).length;
console.log(`\n🔍 Remaining markAsVideo references: ${markAsVideoCount}`);

// Check total stretches
const stretchDefinitions = (content.match(/{\s*id:\s*\d+,/g) || []).length;
console.log(`📊 Total stretch definitions: ${stretchDefinitions}`);