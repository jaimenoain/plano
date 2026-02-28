const fs = require('fs');

const FILE_PATH = 'src/features/maps/components/FilterDrawer.tsx';
let content = fs.readFileSync(FILE_PATH, 'utf8');

if (!content.includes("import { useBuildingSearch } from '@/features/search/hooks/useBuildingSearch';")) {
  content = content.replace(
    "import { UserSearchResult } from '@/features/search/hooks/useUserSearch';",
    "import { UserSearchResult } from '@/features/search/hooks/useUserSearch';\nimport { useBuildingSearch } from '@/features/search/hooks/useBuildingSearch';"
  );
}

// Write it back (testing purposes)
fs.writeFileSync('temp_patch.ts', content);
