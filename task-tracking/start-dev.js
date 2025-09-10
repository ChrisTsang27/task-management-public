const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Function to recursively delete directory
function deleteFolderRecursive(folderPath) {
  if (fs.existsSync(folderPath)) {
    try {
      fs.rmSync(folderPath, { recursive: true, force: true });
      console.log(`Deleted ${folderPath}`);
    } catch (error) {
      console.log(`Could not delete ${folderPath}, continuing anyway...`);
    }
  }
}

// Clean .next directory
console.log('Cleaning build cache...');
deleteFolderRecursive(path.join(__dirname, '.next'));

// Start dev server
console.log('Starting development server...');
const devProcess = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit',
  shell: true
});

devProcess.on('error', (error) => {
  console.error('Error starting dev server:', error);
});

devProcess.on('close', (code) => {
  console.log(`Dev server exited with code ${code}`);
});