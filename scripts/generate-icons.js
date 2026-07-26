import fs from 'fs';
import sharp from 'sharp';

const svgPath = './icons/icon.svg';
const iconsDir = './icons';

const sizes = [
  { name: 'icon-512x512.png', size: 512 },
  { name: 'icon-192x192.png', size: 192 },
  { name: 'apple-touch-icon.png', size: 180 },
];

async function generateIcons() {
  const svgBuffer = fs.readFileSync(svgPath);
  
  for (const { name, size } of sizes) {
    await sharp(svgBuffer)
      .resize(size, size)
      .png({ quality: 100 })
      .toFile(`${iconsDir}/${name}`);
    console.log(`Generated ${name}`);
  }
  
  await sharp(svgBuffer)
    .resize(48, 48)
    .png({ quality: 100 })
    .toFile('./favicon.png');
  console.log('Generated favicon.png');
  
  console.log('All icons generated successfully!');
}

generateIcons().catch(console.error);