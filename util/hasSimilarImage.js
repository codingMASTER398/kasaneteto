const fs = require('fs');
const path = require('path');
const imageHash = require('image-hash');

// Function to calculate the hash of an image
const getImageHash = (imagePath) => {
  return new Promise((resolve, reject) => {
    imageHash.imageHash(imagePath, 8, true, (err, hash) => {
      if (err) reject(err);
      else resolve(hash);
    });
  });
};

// Function to calculate the Hamming distance between two hashes
const hammingDistance = (hash1, hash2) => {
  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    if (hash1[i] !== hash2[i]) {
      distance++;
    }
  }
  return distance;
};

// Function to check if a directory contains a similar image
const hasSimilarImage = async (referenceImagePath, directoryPath, threshold = 10) => {
  try {
    const referenceHash = await getImageHash(referenceImagePath);
    const files = fs.readdirSync(directoryPath);
    
    for (const file of files) {
      const filePath = path.join(directoryPath, file);
      
      if (fs.lstatSync(filePath).isFile() && ['.jpg', '.jpeg', '.png', '.webp'].includes(path.extname(file))) {
        const imageHashValue = await getImageHash(filePath);
        const difference = hammingDistance(referenceHash, imageHashValue);
        
        if (difference < threshold) {
          return true;
        }
      }
    }
  } catch (err) {
    console.error('Error:', err);
  }
  return false;
};

module.exports = hasSimilarImage;