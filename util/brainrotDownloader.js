const fs = require('fs');
const path = require('path');
const imageHash = require('image-hash');

// Directory where your images are stored
const imageFolder = '../public/img/brainrot/';

// Path to the reference image
const referenceImagePath = './reference_image.jpg';

// Function to calculate the hash of an image
const getImageHash = (imagePath) => {
  return new Promise((resolve, reject) => {
    imageHash.hash(imagePath, 16, true, (err, hash) => {
      if (err) reject(err);
      else resolve(hash);
    });
  });
};

// Function to compare hashes and calculate similarity
const compareImages = async (referenceHash, folderPath) => {
  const files = fs.readdirSync(folderPath);
  const similarImages = [];

  for (const file of files) {
    const filePath = path.join(folderPath, file);
    
    // Only compare image files (you can add more file types)
    if (fs.lstatSync(filePath).isFile() && ['.jpg', '.jpeg', '.png'].includes(path.extname(file))) {
      const imageHashValue = await getImageHash(filePath);
      console.log(`Comparing ${file} with reference image. Hash: ${imageHashValue}`);

      // Calculate Hamming distance (difference between hashes)
      const difference = hammingDistance(referenceHash, imageHashValue);
      console.log(`Hamming Distance: ${difference}`);

      // If the difference is low, consider it similar
      if (difference < 10) { // You can adjust this threshold
        similarImages.push(file);
      }
    }
  }

  return similarImages;
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

// Main function
const main = async () => {
  try {
    const referenceHash = await getImageHash(referenceImagePath);
    console.log(`Reference Image Hash: ${referenceHash}`);

    const similarImages = await compareImages(referenceHash, imageFolder);

    console.log('Similar images found:');
    similarImages.forEach(image => {
      console.log(image);
    });
  } catch (err) {
    console.error('Error:', err);
  }
};

main();
