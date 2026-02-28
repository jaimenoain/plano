import fs from 'fs';

const FILE_PATH = 'src/features/maps/components/FilterDrawer.tsx';
let content = fs.readFileSync(FILE_PATH, 'utf8');

// 1. Add useBuildingSearch
if (!content.includes("import { useBuildingSearch }")) {
  content = content.replace("import { UserSearchResult }", "import { UserSearchResult } from '@/features/search/hooks/useUserSearch';\nimport { useBuildingSearch }");
}

// Write the modified content back
fs.writeFileSync('temp_patch.tsx', content);
