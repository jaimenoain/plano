import fs from 'fs';

const FILE_PATH = 'src/features/maps/components/FilterDrawer.test.tsx';
let content = fs.readFileSync(FILE_PATH, 'utf8');

const buildingSearchMock = `vi.mock('@/features/search/hooks/useBuildingSearch', () => ({
  useBuildingSearch: vi.fn(),
}));`;

content = content.replace("vi.mock('@/features/search/hooks/useUserSearch'", buildingSearchMock + "\n\nvi.mock('@/features/search/hooks/useUserSearch'");

const buildingSearchImport = `import * as BuildingSearch from '@/features/search/hooks/useBuildingSearch';`;
content = content.replace("import { useUserSearch } from '@/features/search/hooks/useUserSearch';", "import { useUserSearch } from '@/features/search/hooks/useUserSearch';\n" + buildingSearchImport);

const updatedBeforeEach = `  beforeEach(() => {
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

content = content.replace(/  beforeEach\(\(\) => \{[\s\S]*?\}\);/g, updatedBeforeEach);

// Mock useAuth correctly
const authMock = `vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({ user: null })),
}));`;
content = content.replace("vi.mock('../providers/MapContext'", authMock + "\n\nvi.mock('../providers/MapContext'");

fs.writeFileSync(FILE_PATH, content);
