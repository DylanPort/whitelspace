// Node.js script to merge all content files into one
const fs = require('fs');
const path = require('path');

console.log('\n🔄 Merging ALL content files into content.js...\n');

// List of files to merge
const files = [
  'content-complete.js',
  'content-part2.js',
  'content-part3.js',
  'content-part4.js',
  'content-part5.js',
  'content-part6.js',
  'content-part7.js',
  'content-part8.js',
  'content-part9-guides.js',
  'content-part10-final-sections.js'
];

// Read the base content.js
let baseContent = fs.readFileSync('content.js', 'utf8');

// Extract the main object content (everything between const content = { and };)
const contentMatch = baseContent.match(/const content = \{([\s\S]*?)\n\};/);
if (!contentMatch) {
  console.error('❌ Could not parse base content.js');
  process.exit(1);
}

let allSections = contentMatch[1];

// Process each part file
files.forEach(file => {
  if (!fs.existsSync(file)) {
    console.log(`⚠️  File not found: ${file}`);
    return;
  }
  
  console.log(`📄 Reading: ${file}`);
  let content = fs.readFileSync(file, 'utf8');
  
  // Extract sections from this file
  // Look for patterns like: 'section-name': ` or "section-name": `
  const sectionPattern = /\s+['"]([a-z-]+)['"]:\s*`([\s\S]*?)`(?=\s*[,}])/g;
  let match;
  let count = 0;
  
  while ((match = sectionPattern.exec(content)) !== null) {
    const sectionName = match[1];
    const sectionContent = match[2];
    
    // Add this section
    allSections += `,\n\n  '${sectionName}': \`${sectionContent}\``;
    count++;
  }
  
  console.log(`   ✅ Added ${count} sections`);
});

// Build the complete file
const completeContent = `// CryptWhistle Documentation Content
// Complete documentation with ALL 52 sections - MERGED VERSION
// Generated: ${new Date().toISOString()}

const content = {
${allSections}
};

// Export for use in app.js
window.content = content;

console.log('✅ CryptWhistle Documentation Loaded - ALL Sections Available');
console.log('Total sections:', Object.keys(content).length);
`;

// Write the new content.js
fs.writeFileSync('content.js', completeContent, 'utf8');

console.log('\n✅ MERGE COMPLETE!');
console.log(`📊 Output: content.js (${(fs.statSync('content.js').size / 1024).toFixed(1)} KB)`);
console.log('\n🚀 Refresh your browser to see all sections!\n');

