import fs from 'fs';
const file = fs.readFileSync('src/components/collections/ItineraryList.tsx', 'utf8');

const lines = file.split('\n');
for (let i = 560; i < 590; i++) {
  console.log(`${i+1}: ${lines[i]}`);
}
