import fs from 'fs';

const FILE_PATH = 'src/features/maps/components/FilterDrawer.test.tsx';
let content = fs.readFileSync(FILE_PATH, 'utf8');

// The replacement issue is because `replace` with string runs multiple times or messes up on `});`.
// Let's do it cleanly by index.

// 1. Mocks
const MOCKS = `vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({ user: null })),
}));

vi.mock('@/features/search/hooks/useBuildingSearch', () => ({
  useBuildingSearch: vi.fn(),
}));

`;

content = content.replace("vi.mock('../providers/MapContext', async () => ({", MOCKS + "vi.mock('../providers/MapContext', async () => ({");

const IMPORTS = `import * as BuildingSearch from '@/features/search/hooks/useBuildingSearch';\n`;
content = content.replace("import { useUserSearch } from '@/features/search/hooks/useUserSearch';", "import { useUserSearch } from '@/features/search/hooks/useUserSearch';\n" + IMPORTS);

const BEFORE_EACH = `  beforeEach(() => {
    vi.clearAllMocks();
    (Taxonomy.useTaxonomy as Mock).mockReturnValue(defaultTaxonomy);
    (useUserSearch as Mock).mockReturnValue({ users: [], isLoading: false });

    (BuildingSearch.useBuildingSearch as Mock).mockReturnValue({
      statusFilters: [],
      setStatusFilters: vi.fn(),
      hideVisited: false,
      setHideVisited: vi.fn(),
      hideSaved: false,
      setHideSaved: vi.fn(),
      filterContacts: false,
      setFilterContacts: vi.fn(),
      personalMinRating: 0,
      setPersonalMinRating: vi.fn(),
      contactMinRating: 0,
      setContactMinRating: vi.fn(),
      selectedArchitects: [],
      setSelectedArchitects: vi.fn(),
      selectedCollections: [],
      setSelectedCollections: vi.fn(),
      selectedFolders: [],
      setSelectedFolders: vi.fn(),
      selectedCategory: null,
      setSelectedCategory: vi.fn(),
      selectedTypologies: [],
      setSelectedTypologies: vi.fn(),
      selectedAttributes: [],
      setSelectedAttributes: vi.fn(),
      selectedContacts: [],
      setSelectedContacts: vi.fn(),
    });
  });`;

content = content.replace(/  beforeEach\(\(\) => \{\n    vi.clearAllMocks\(\);\n    \(Taxonomy.useTaxonomy as Mock\).mockReturnValue\(defaultTaxonomy\);\n    \(useUserSearch as Mock\).mockReturnValue\(\{ users: \[\], isLoading: false \}\);\n  \}\);/, BEFORE_EACH);

fs.writeFileSync(FILE_PATH, content);
