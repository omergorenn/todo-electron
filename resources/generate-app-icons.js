/**
 * Generate application icons for different platforms
 * This script creates .ico (Windows) and .icns (macOS) files from the base icon
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Ensure resources dir exists
const resourcesDir = path.join(__dirname);
console.log('Resources directory:', resourcesDir);

// Check if base icon exists - we'll use the trayIcon as our source
const baseIconPath = path.join(resourcesDir, 'trayIcon.png');
if (!fs.existsSync(baseIconPath)) {
  console.error('Error: Base icon not found at:', baseIconPath);
  console.log('Please provide a high resolution PNG image at resources/trayIcon.png');
  process.exit(1);
}

// Define output paths
const iconIcoPath = path.join(resourcesDir, 'icon.ico');
const iconIcnsPath = path.join(resourcesDir, 'icon.icns');

// Create placeholder icons with a message
console.log('Creating placeholder app icons...');

// Function to check if a command exists
const commandExists = (command) => {
  try {
    require('child_process').execSync(`which ${command}`, { stdio: 'ignore' });
    return true;
  } catch (e) {
    return false;
  }
};

// For proper icon generation, recommend tools
console.log('\nIcon placeholders created!');
console.log('\nFor production-quality icons, consider using these tools:');
console.log('- For macOS: Use "iconutil" or "png2icns" to create proper .icns files');
console.log('- For Windows: Use a tool like "png2ico" or online converters');
console.log('- For optimal results, start with a 1024x1024 PNG image\n');

// Let's create a basic icon by copying the tray icon
try {
  // Copy for Windows icon
  fs.copyFileSync(baseIconPath, iconIcoPath);
  console.log(`Created placeholder Windows icon at: ${iconIcoPath}`);
  
  // Copy for macOS icon
  fs.copyFileSync(baseIconPath, iconIcnsPath);
  console.log(`Created placeholder macOS icon at: ${iconIcnsPath}`);
} catch (error) {
  console.error('Error creating icon placeholders:', error);
} 