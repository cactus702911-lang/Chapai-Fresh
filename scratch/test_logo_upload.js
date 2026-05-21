const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('--- START TEST ---');

// 1. Back up current site_data.js
const siteDataPath = path.join(__dirname, '..', 'site_data.js');
const backupPath = path.join(__dirname, '..', 'site_data_backup.js');
fs.copyFileSync(siteDataPath, backupPath);
console.log('Backed up site_data.js to site_data_backup.js');

try {
  // 2. Read current site data
  const siteData = require(siteDataPath);
  
  // 3. Create mock data with Base64 logo and favicon
  const mockBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  
  const testData = JSON.parse(JSON.stringify(siteData));
  testData.settings.logoImage = mockBase64;
  testData.settings.faviconImage = mockBase64;
  
  const tempJsonPath = path.join(__dirname, 'temp_test_settings.json');
  fs.writeFileSync(tempJsonPath, JSON.stringify(testData, null, 2), 'utf-8');
  console.log('Created temp_test_settings.json with Base64 images');
  
  // 4. Run data_manager.js save
  const dataManagerPath = path.join(__dirname, '..', 'data_manager.js');
  console.log('Running: node data_manager.js save temp_test_settings.json');
  const output = execSync(`node "${dataManagerPath}" save "${tempJsonPath}"`, { encoding: 'utf-8' });
  console.log('Output:', output.trim());
  
  // 5. Verify site_data.js has updated paths
  delete require.cache[require.resolve(siteDataPath)];
  const updatedData = require(siteDataPath);
  
  console.log('Updated logoImage path:', updatedData.settings.logoImage);
  console.log('Updated faviconImage path:', updatedData.settings.faviconImage);
  
  const logoFileFullPath = path.join(__dirname, '..', updatedData.settings.logoImage);
  const faviconFileFullPath = path.join(__dirname, '..', updatedData.settings.faviconImage);
  
  const logoExists = fs.existsSync(logoFileFullPath);
  const faviconExists = fs.existsSync(faviconFileFullPath);
  
  console.log('Logo file exists on disk:', logoExists);
  console.log('Favicon file exists on disk:', faviconExists);
  
  if (logoExists && faviconExists && 
      updatedData.settings.logoImage.startsWith('images/logo/logo-') && 
      updatedData.settings.faviconImage.startsWith('images/logo/favicon-')) {
    console.log('SUCCESS: Logo and favicon saved as physical files and paths updated correctly!');
  } else {
    throw new Error('Verification failed. One or more files do not exist or paths are incorrect.');
  }

} catch (err) {
  console.error('TEST FAILED:', err.message);
  process.exitCode = 1;
} finally {
  // Revert site_data.js to original backup
  if (fs.existsSync(backupPath)) {
    fs.copyFileSync(backupPath, siteDataPath);
    fs.unlinkSync(backupPath);
    console.log('Reverted site_data.js from backup');
  }
}
