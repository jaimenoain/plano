import re

with open("src/features/maps/components/FilterDrawer.tsx", "r") as f:
    content = f.read()

# Replace handleModeChange
old_handle_mode = """  const handleModeChange = (newMode: string) => {
    const typedMode = newMode as MapMode;

    if (typedMode === 'discover') {
      // Switch to Discover mode:
      // - Clear status (so we see everything relevant to discovery)
      // - Hide saved items by default
      // - Keep other filters (architects, rating, etc.)

      setMapState({
        mode: typedMode,
        filters: {
          ...filters,
          status: undefined,
          hideSaved: true,
          hideVisited: true,
        },
      });
    } else {
      // Switch to Library mode:
      // - Set status to ['visited', 'saved'] to show user's collection
      // - Ensure we show saved/visited items by disabling hide flags

      setMapState({
        mode: typedMode,
        filters: {
          ...filters,
          status: ['visited', 'saved'],
          hideSaved: false,
          hideVisited: false,
        },
      });
    }
  };"""

new_handle_mode = """  const handleModeChange = (newMode: string) => {
    const typedMode = newMode as MapMode;
    setMapState({ mode: typedMode });

    if (typedMode === 'discover') {
      setStatus([]);
      setHideSaved(true);
      setHideVisited(true);
    } else {
      setStatus(['visited', 'saved']);
      setHideSaved(false);
      setHideVisited(false);
    }
  };"""

content = content.replace(old_handle_mode, new_handle_mode)

# Replace other handlers
replacements = [
    ("setFilter('architects', architects);", "setArchitects(architects);"),
    ("const newFilters = { ...filters, contacts: mapped };", "setContacts(mapped);"),
    ("if (mapped.length > 0 && (!filters.status || filters.status.length === 0)) {\n          newFilters.status = ['visited', 'saved'];\n          // Also ensure visibility is enabled\n          newFilters.hideSaved = false;\n          newFilters.hideVisited = false;\n      }\n\n      setMapState({ filters: newFilters });", "if (mapped.length > 0 && currentStatus.length === 0) {\n          setStatus(['visited', 'saved']);\n          setHideSaved(false);\n          setHideVisited(false);\n      }"),
    ("setFilter('minRating', value as MichelinRating);", "setMinRating(value as MichelinRating);"),
    ("setFilter('personalMinRating', value);", "setPersonalRating(value);"),
    ("setFilter('collectionIds', ids);", "const collections = ids.map(id => ({ id, name: id })); setCollections(collections);"),
    ("setFilter('folderIds', ids);", "const folders = ids.map(id => ({ id, name: id })); setFolders(folders);"),
    ("setMapState({\n      filters: {\n        ...filters,\n        hideSaved: checked,\n        hideVisited: checked,\n      },\n    });", "setHideSaved(checked);\n    setHideVisited(checked);"),
    ("const updates: Partial<typeof filters> = { status: value };\n\n    // If \"saved\" is selected, ensure hideSaved is false\n    if (value.includes('saved')) {\n       updates.hideSaved = false;\n    }\n    // If \"visited\" is selected, ensure hideVisited is false\n    if (value.includes('visited')) {\n       updates.hideVisited = false;\n    }\n\n    setMapState({\n        filters: {\n            ...filters,\n            ...updates\n        }\n    });", "setStatus(value);\n    if (value.includes('saved')) setHideSaved(false);\n    if (value.includes('visited')) setHideVisited(false);"),
    ("setMapState({\n          filters: {\n              ...filters,\n              category: value,\n              typologies: validTypologies.length !== currentTypologies.length ? validTypologies : currentTypologies\n          }\n      });", "setCategory(value || null);\n      if (validTypologies.length !== currentTypologies.length) setTypologies(validTypologies);"),
    ("setFilter('typologies', ids);", "setTypologies(ids);"),
    ("setFilter('materials', ids);", "setAttributes([...currentAttributes.filter(id => !materialityAttributes.map(a => a.id).includes(id)), ...ids]);"),
    ("setFilter('contexts', ids);", "setAttributes([...currentAttributes.filter(id => !contextAttributes.map(a => a.id).includes(id)), ...ids]);"),
    ("setFilter('styles', ids);", "setAttributes([...currentAttributes.filter(id => !styleAttributes.map(a => a.id).includes(id)), ...ids]);"),
    ("setMapState({\n          filters: {\n              ...filters,\n              // Explicitly clear global filters including Contacts, but preserve View Mode settings (status, hideSaved, etc.)\n              architects: undefined,\n              contacts: undefined,\n              category: undefined,\n              typologies: undefined,\n              materials: undefined,\n              contexts: undefined,\n              styles: undefined\n          }\n      });", "setArchitects([]);\n      setContacts([]);\n      setCategory(null);\n      setTypologies([]);\n      setAttributes([]);"),
    ("setMapState({\n      filters: {\n        ...filters,\n        // Global Taxonomy\n        architects: undefined,\n        contacts: undefined,\n        category: undefined,\n        typologies: undefined,\n        materials: undefined,\n        contexts: undefined,\n        styles: undefined,\n        // Mode-Specific\n        minRating: undefined,\n        personalMinRating: undefined,\n        status: undefined,\n        collectionIds: undefined,\n        folderIds: undefined,\n        hideSaved: false,\n        hideVisited: false,\n      }\n    });", "setArchitects([]);\n    setContacts([]);\n    setCategory(null);\n    setTypologies([]);\n    setAttributes([]);\n    setMinRating(0);\n    setPersonalRating(0);\n    setStatus([]);\n    setCollections([]);\n    setFolders([]);\n    setHideSaved(false);\n    setHideVisited(false);")
]

for old, new_s in replacements:
    content = content.replace(old, new_s)

# Remove safe defaults section because useBuildingSearch provides defaults
safe_defaults_regex = r"// Safe defaults.*?const hideSaved = filters\.hideSaved \?\? false;"
content = re.sub(safe_defaults_regex, "", content, flags=re.DOTALL)

with open("src/features/maps/components/FilterDrawer.tsx", "w") as f:
    f.write(content)
