#!/usr/bin/env node

/**
 * This script identifies JavaScript files (.js, .jsx) in the project
 * and helps convert them to TypeScript (.ts, .tsx).
 * 
 * Usage: node scripts/convert-to-typescript.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const rootDir = path.resolve(__dirname, '..');
const srcDir = path.join(rootDir, 'src');
const ignorePatterns = [
  'node_modules',
  '.next',
  'out',
  'build',
  'public',
  'supabase',
];

// File extension mappings
const extensionMap = {
  '.js': '.ts',
  '.jsx': '.tsx',
};

// Find all JavaScript files
function findJavaScriptFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const relativePath = path.relative(rootDir, filePath);
    
    // Skip ignored directories
    if (ignorePatterns.some(pattern => relativePath.includes(pattern))) {
      return;
    }
    
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      findJavaScriptFiles(filePath, fileList);
    } else {
      const ext = path.extname(file);
      if (ext === '.js' || ext === '.jsx') {
        fileList.push(filePath);
      }
    }
  });
  
  return fileList;
}

// Convert a file to TypeScript
function convertToTypeScript(filePath) {
  const ext = path.extname(filePath);
  const newExt = extensionMap[ext];
  
  if (!newExt) {
    console.log(`Skipping ${filePath} - not a JavaScript file`);
    return;
  }
  
  const newFilePath = filePath.replace(ext, newExt);
  const relativePath = path.relative(rootDir, filePath);
  const newRelativePath = path.relative(rootDir, newFilePath);
  
  console.log(`Converting ${relativePath} to ${newRelativePath}`);
  
  // Read the file content
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Add basic TypeScript annotations
  let newContent = content;
  
  // Add React import for JSX files if not present
  if (ext === '.jsx' && !content.includes('import React')) {
    newContent = `import React from 'react';
${newContent}`;
  }
  
  // Add "use client" directive for component files if not present
  if ((ext === '.jsx' || ext === '.js') && 
      (content.includes('export default') || content.includes('function')) && 
      !content.includes('"use client"') && 
      !content.includes('\'use client\'')) {
    newContent = `"use client";

${newContent}`;
  }
  
  // Write the new TypeScript file
  fs.writeFileSync(newFilePath, newContent);
  
  // Remove the original JavaScript file
  fs.unlinkSync(filePath);
  
  console.log(`✓ Converted ${relativePath} to ${newRelativePath}`);
  
  // Update imports in other files
  updateImportsInProject(relativePath, newRelativePath);
}

// Update imports in all project files
function updateImportsInProject(oldPath, newPath) {
  const oldImportPath = oldPath.replace(/\\+/g, '/').replace(/\.[^/.]+$/, '');
  const newImportPath = newPath.replace(/\\+/g, '/').replace(/\.[^/.]+$/, '');
  
  // Skip if paths are the same (just extension changed)
  if (oldImportPath === newImportPath) {
    return;
  }
  
  console.log(`Updating imports: ${oldImportPath} -> ${newImportPath}`);
  
  try {
    // Use grep to find files with the import
    const grepCommand = `grep -r "${oldImportPath}" ${srcDir} --include="*.{ts,tsx,js,jsx}" -l`;
    const filesToUpdate = execSync(grepCommand, { encoding: 'utf8' }).split('\n').filter(Boolean);
    
    filesToUpdate.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      const newContent = content.replace(new RegExp(`(['"](\.\.?\/)*${oldImportPath})['"](;?)`, 'g'), `$1$3`);
      
      if (content !== newContent) {
        fs.writeFileSync(file, newContent);
        console.log(`  Updated imports in ${file}`);
      }
    });
  } catch (error) {
    console.log(`  No files importing ${oldImportPath} found`);
  }
}

// Main function
function main() {
  console.log('Searching for JavaScript files...');
  const jsFiles = findJavaScriptFiles(srcDir);
  
  if (jsFiles.length === 0) {
    console.log('No JavaScript files found. The project is already fully TypeScript! 🎉');
    return;
  }
  
  console.log(`Found ${jsFiles.length} JavaScript files:`);
  jsFiles.forEach(file => console.log(`- ${path.relative(rootDir, file)}`));
  
  console.log('\nConverting files to TypeScript...');
  jsFiles.forEach(convertToTypeScript);
  
  console.log('\nConversion complete! 🎉');
  console.log('Remember to check the converted files for any TypeScript errors.');
}

// Run the script
main();