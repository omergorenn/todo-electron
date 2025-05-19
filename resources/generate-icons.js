/**
 * Generate tray icons for macOS and other platforms
 * Run this with: node resources/generate-icons.js
 */

const fs = require('fs');
const path = require('path');

// Ensure resources dir exists
const resourcesDir = path.join(__dirname);
if (!fs.existsSync(resourcesDir)) {
  fs.mkdirSync(resourcesDir, { recursive: true });
}

// Check if the trayIcon.png exists
const trayIconPath = path.join(resourcesDir, 'trayIcon.png');
if (!fs.existsSync(trayIconPath)) {
  console.error('Error: trayIcon.png not found in resources directory');
  process.exit(1);
}

// Create a small fallback icon in case the user's icon is too large
const fallbackIconPath = path.join(resourcesDir, 'fallbackIcon.png');
// A simple, small icon encoded as base64
const fallbackIconData = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAMNJREFUeNpi/P//PwMlgImBQjDwBrCgCxgbGzcDKQcgVmDEo3nv3r3tuOSZsAj2AukkIP5PpO5eZANYsAjmEqMZyM6FGcCCRdEBIt3XYGRktBCbF1iA+OpfCBBAjETG1tZVQKoLiO9TGoieQMwGxMbEGnAXiGWA+AEpBlwBYlkgfkiMF64DsQgQPyHFgKtALArET5ENANn8HYh1yE0HIEeJAfErdAMYgex0KJ9sADJgDhAfpHaGmoNsAECAAQC8qy19CBLzOwAAAABJRU5ErkJggg==',
  'base64'
);

try {
  // Write the fallback icon to file system
  fs.writeFileSync(fallbackIconPath, fallbackIconData);
  console.log(`Created fallback icon at: ${fallbackIconPath}`);
  
  // Simple copy for the template icon
  const iconData = fs.readFileSync(trayIconPath);
  const macOSIconPath = path.join(resourcesDir, 'trayIconTemplate.png');
  fs.writeFileSync(macOSIconPath, iconData);
  console.log(`Created macOS template icon at: ${macOSIconPath}`);
  
  console.log('Icon setup complete!');
  console.log('NOTE: For macOS, make sure your icon is 16x16 pixels for best results.');
  console.log('      If your icon doesn\'t appear, try using the fallbackIcon.png instead.');
} catch (error) {
  console.error('Error creating icons:', error);
} 