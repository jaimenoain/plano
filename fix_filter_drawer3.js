import fs from 'fs';

const FILE_PATH = 'src/features/maps/components/FilterDrawer.tsx';
let content = fs.readFileSync(FILE_PATH, 'utf8');

// The replacement logic
const mapContextImport = `import { useMapContext } from '../providers/MapContext';`;
const newImports = `import { useMapContext } from '../providers/MapContext';\nimport { useBuildingSearch } from '@/features/search/hooks/useBuildingSearch';`;

if (!content.includes('import { useBuildingSearch }')) {
  content = content.replace(mapContextImport, newImports);
}

const componentStartRegex = /export function FilterDrawer\(\) \{\n  const \{\n    state: \{ mode, filters \},\n    methods: \{ setFilter, setMapState \},\n  \} = useMapContext\(\);/s;

const newComponentStart = `export function FilterDrawer() {
  const {
    state: { mode },
    methods: { setMode },
  } = useMapContext();

  const {
    statusFilters: currentStatus,
    setStatusFilters,
    hideVisited,
    setHideVisited,
    hideSaved,
    setHideSaved,
    filterContacts,
    setFilterContacts,
    personalMinRating: currentPersonalMinRating,
    setPersonalMinRating,
    contactMinRating,
    setContactMinRating,
    selectedArchitects: currentArchitects,
    setSelectedArchitects,
    selectedCollections: currentCollectionIds,
    setSelectedCollections,
    selectedFolders: currentFolderIds,
    setSelectedFolders,
    selectedCategory: currentCategory,
    setSelectedCategory,
    selectedTypologies: currentTypologies,
    setSelectedTypologies,
    selectedAttributes: currentMaterialsAndStylesAndContexts,
    setSelectedAttributes,
    selectedContacts: currentContacts,
    setSelectedContacts,
  } = useBuildingSearch();`;

content = content.replace(componentStartRegex, newComponentStart);

// Handlers
const handlersReplacement = `
  const handleModeChange = (newMode: string) => {
    const typedMode = newMode as MapMode;

    if (typedMode === 'discover') {
      setMode(typedMode);
      setStatusFilters([]);
      setHideSaved(true);
      setHideVisited(true);
    } else {
      setMode(typedMode);
      setStatusFilters(['visited', 'saved']);
      setHideSaved(false);
      setHideVisited(false);
    }
  };

  const handleArchitectsChange = (architects: { id: string; name: string }[]) => {
    setSelectedArchitects(architects);
  };

  const handleContactsChange = (newContacts: UserSearchResult[]) => {
      setSelectedContacts(newContacts);

      if (newContacts.length > 0 && currentStatus.length === 0) {
          setStatusFilters(['visited', 'saved']);
          setHideSaved(false);
          setHideVisited(false);
      }
  };

  const handleMinRatingChange = (value: number) => {
    setPersonalMinRating(value);
  };

  const handlePersonalRatingChange = (value: number) => {
    setPersonalMinRating(value);
  };

  const handleCollectionsChange = (ids: string[]) => {
    const collections = ids.map(id => ({ id, name: id }));
    setSelectedCollections(collections);
  };

  const handleFoldersChange = (ids: string[]) => {
    const folders = ids.map(id => ({ id, name: id }));
    setSelectedFolders(folders);
  };

  const handleHideSavedChange = (checked: boolean) => {
    setHideSaved(checked);
    setHideVisited(checked);
  };

  const handleStatusChange = (value: string) => {
    if (value === 'all') {
      setStatusFilters(['visited', 'saved', 'pending']);
      setHideSaved(false);
      setHideVisited(false);
    } else if (value === 'visited') {
      setStatusFilters(['visited']);
      setHideSaved(true);
      setHideVisited(false);
    } else if (value === 'saved') {
      setStatusFilters(['saved', 'pending']);
      setHideSaved(false);
      setHideVisited(true);
    }
  };

  const handleCategoryChange = (categoryId: string) => {
      const value = categoryId === "all" ? null : categoryId;
      setSelectedCategory(value);

      const validTypologies = value
        ? currentTypologies.filter(typId => {
            const typ = functionalTypologies.find(t => t.id === typId);
            return typ && typ.parent_category_id === value;
          })
        : currentTypologies;

      if (validTypologies.length !== currentTypologies.length) {
          setSelectedTypologies(validTypologies);
      }
  };

  const handleTypologiesChange = (ids: string[]) => {
    setSelectedTypologies(ids);
  };

  const currentMaterials = currentMaterialsAndStylesAndContexts.filter(id => materialityAttributes.some(a => a.id === id));
  const currentStyles = currentMaterialsAndStylesAndContexts.filter(id => styleAttributes.some(a => a.id === id));
  const currentContexts = currentMaterialsAndStylesAndContexts.filter(id => contextAttributes.some(a => a.id === id));

  const handleMaterialsChange = (ids: string[]) => {
    const otherAttributes = currentMaterialsAndStylesAndContexts.filter(id => !materialityAttributes.some(a => a.id === id));
    setSelectedAttributes([...otherAttributes, ...ids]);
  };

  const handleContextsChange = (ids: string[]) => {
    const otherAttributes = currentMaterialsAndStylesAndContexts.filter(id => !contextAttributes.some(a => a.id === id));
    setSelectedAttributes([...otherAttributes, ...ids]);
  };

  const handleStylesChange = (ids: string[]) => {
    const otherAttributes = currentMaterialsAndStylesAndContexts.filter(id => !styleAttributes.some(a => a.id === id));
    setSelectedAttributes([...otherAttributes, ...ids]);
  };

  const handleResetGlobalFilters = () => {
      setSelectedArchitects([]);
      setSelectedContacts([]);
      setSelectedCategory(null);
      setSelectedTypologies([]);
      setSelectedAttributes([]);
  };

  const handleClearAll = () => {
    setSelectedArchitects([]);
    setSelectedContacts([]);
    setSelectedCategory(null);
    setSelectedTypologies([]);
    setSelectedAttributes([]);
    setPersonalMinRating(0);
    setContactMinRating(0);
    setStatusFilters([]);
    setSelectedCollections([]);
    setSelectedFolders([]);
    setHideSaved(false);
    setHideVisited(false);
  };
`;

const oldHandlersRegex = /  const handleModeChange =.*?  const currentMinRating = filters\.minRating \?\? 0;/s;
content = content.replace(oldHandlersRegex, handlersReplacement.trim() + '\n\n  const currentMinRating = currentPersonalMinRating;');

const safeDefaultsRegex = /  const currentPersonalMinRating = filters\.personalMinRating \?\? 0;.*?const hideSaved = filters\.hideSaved \?\? false;/s;
const newSafeDefaults = `  const currentSegmentedStatus = currentStatus.includes('visited') && (currentStatus.includes('saved') || currentStatus.includes('pending'))
    ? 'all'
    : currentStatus.includes('visited')
      ? 'visited'
      : (currentStatus.includes('saved') || currentStatus.includes('pending'))
        ? 'saved'
        : 'all';
        `;

content = content.replace(safeDefaultsRegex, newSafeDefaults);

const otherDefaultsRegex = /  const currentCategory = filters\.category;.*?const currentStyles = filters\.styles \?\? \[\];/s;
content = content.replace(otherDefaultsRegex, '');

fs.writeFileSync('src/features/maps/components/FilterDrawer.tsx', content);
