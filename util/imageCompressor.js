const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Directories
const srcDir = `./public/img`; // Your source folder with images
const destDir = `./public/imgcompress`; // Folder to save the optimized images

// Ensure destination folder exists
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir);
}

// Function to compress a single image
async function compressImage(filePath, destPath, format) {
  if(fs.existsSync(destPath)) return;

  try {
    // Check if we need to convert the image
    if (format === 'webp') {
      await sharp(filePath, {
        animated: true
      })
        .webp({ quality: 50 })
        .toFile(destPath);
      console.log(`Compressed to WebP: ${destPath}`);
    } else if (format === 'avif') {
      await sharp(filePath)
        .avif({ quality: 50 })
        .toFile(destPath);
      console.log(`Compressed to AVIF: ${destPath}`);
    }
  } catch (error) {
    console.error(`Error compressing ${filePath}:`, error);
  }
}

// Function to process a folder (including subfolders)
async function processFolder(folderPath) {
  const files = fs.readdirSync(folderPath);

  for (const file of files) {
    const fullPath = path.join(folderPath, file);
    const stat = fs.lstatSync(fullPath);

    // Skip excluded subfolders
    if (stat.isDirectory() && fullPath.includes("songThumbnails")) {
      console.log(`Skipping folder: ${fullPath}`);
      continue;
    }

    if (stat.isDirectory()) {
      // If it's a directory, process it recursively
      const relativePath = path.relative(srcDir, fullPath);
      const destFolder = path.join(destDir, relativePath);
      if (!fs.existsSync(destFolder)) {
        fs.mkdirSync(destFolder, { recursive: true });
      }
      await processFolder(fullPath); // Recursive call
    } else {
      // Process image files
      const ext = path.extname(file).toLowerCase();
      const relativePath = path.relative(srcDir, fullPath);
      const destFolder = path.join(destDir, path.dirname(relativePath));

      // Create subfolder in destination if it doesn't exist
      if (!fs.existsSync(destFolder)) {
        fs.mkdirSync(destFolder, { recursive: true });
      }

      // Define destination paths for WebP and AVIF
      const destPathWebP = path.join(destFolder, path.basename(file, ext) + '.webp');
      const destPathAVIF = path.join(destFolder, path.basename(file, ext) + '.avif');

      // Convert based on file type
      if (ext === '.gif') {
        await compressImage(fullPath, destPathWebP, 'webp');
      } else if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
        await compressImage(fullPath, destPathAVIF, 'avif');
      }
    }
  }
}

// Start processing from the source directory
processFolder(srcDir)
  .then(() => console.log('Image compression completed!'))
  .catch((error) => console.error('Error in processing:', error));
