import fs from 'fs';

const filePath = 'src/components/collections/ItineraryList.tsx';
let code = fs.readFileSync(filePath, 'utf8');

// Update collisionDetection in ItineraryList
code = code.replace(
  'collisionDetection={closestCorners}',
  'collisionDetection={closestCenter}'
);

fs.writeFileSync(filePath, code);
