import fs from 'fs';

const FILE_PATH = 'src/features/maps/components/FilterDrawer.test.tsx';
let content = fs.readFileSync(FILE_PATH, 'utf8');

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

content = content.replace(/  beforeEach\(async \(\) => \{[\s\S]*?\}\);/, updatedBeforeEach);

// ensure the mock uses async () => ({ useBuildingSearch: vi.fn() })
content = content.replace("vi.mock('@/features/search/hooks/useBuildingSearch', () => ({", "vi.mock('@/features/search/hooks/useBuildingSearch', async () => ({");

fs.writeFileSync(FILE_PATH, content);
