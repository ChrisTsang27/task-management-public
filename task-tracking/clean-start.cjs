const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Attempting to clean .next directory...');

try {
  // Try to remove .next directory
  const nextPath = path.join(__dirname, '.next');
  if (fs.existsSync(nextPath)) {
    execSync('rmdir /s /q .next', { stdio: 'inherit' });
    console.log('Successfully cleaned .next directory');
  }
} catch (error) {
  console.log('Could not clean .next directory, but continuing...');
}

console.log('Starting development server...');
try {
  execSync('npm run dev', { stdio: 'inherit' });
} catch (error) {
  console.error('Error starting dev server:', error.message);
}