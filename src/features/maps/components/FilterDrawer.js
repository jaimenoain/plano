import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo } from 'react';
import { ListFilter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ArchitectSelect } from '@/features/search/components/ArchitectSelect';
import { ContactPicker } from '@/features/search/components/ContactPicker';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { useBuildingSearch } from '@/features/search/hooks/useBuildingSearch';
import { QualityRatingFilter } from './filters/QualityRatingFilter';
import { FolderAndCollectionMultiSelect } from './filters/FolderAndCollectionMultiSelect';
import { useTaxonomy } from '@/hooks/useTaxonomy';
import { Slider } from '@/components/ui/slider';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger, } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
function MultiSelectCheckboxList({ items, selectedIds, onChange, className }) {
    const toggleItem = (id) => {
        if (selectedIds.includes(id)) {
            onChange(selectedIds.filter(itemId => itemId !== id));
        }
        else {
            onChange([...selectedIds, id]);
        }
    };
    if (items.length === 0) {
        return _jsx("div", { className: "text-xs text-text-secondary py-2", children: "No items available" });
    }
    return (_jsx(ScrollArea, { className: cn("h-[200px] w-full border rounded-md p-2", className), children: _jsx("div", { className: "space-y-2", children: items.map((item) => (_jsxs("div", { className: "flex items-center space-x-2", children: [_jsx(Checkbox, { id: item.id, checked: selectedIds.includes(item.id), onCheckedChange: () => toggleItem(item.id) }), _jsx(Label, { htmlFor: item.id, className: "text-sm font-normal cursor-pointer leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", children: item.name })] }, item.id))) }) }));
}
export function FilterDrawer() {
    const { statusFilters: currentStatus, setStatusFilters, hideVisited: _hideVisited, setHideVisited, hideSaved, setHideSaved, filterContacts: _filterContacts, setFilterContacts: _setFilterContacts, personalMinRating: currentPersonalMinRating, setPersonalMinRating, globalMinRating: currentGlobalMinRating, setGlobalMinRating, contactMinRating: _contactMinRating, setContactMinRating, selectedArchitects: currentArchitects, setSelectedArchitects, selectedCollections: currentCollectionIds, setSelectedCollections, selectedFolders: currentFolderIds, setSelectedFolders, selectedCategory: currentCategory, setSelectedCategory, selectedTypologies: currentTypologies, setSelectedTypologies, selectedAttributes: currentMaterialsAndStylesAndContexts, setSelectedAttributes, selectedContacts: currentContacts, setSelectedContacts, constructionStatuses, setConstructionStatuses, mode, setMode, } = useBuildingSearch();
    const { functionalCategories, functionalTypologies, materialityAttributes, contextAttributes, styleAttributes, } = useTaxonomy();
    const handleModeChange = (newMode) => {
        const typedMode = newMode;
        if (typedMode === 'discover') {
            setMode(typedMode);
            setStatusFilters([]);
            setHideSaved(true);
            setHideVisited(true);
        }
        else {
            setMode(typedMode);
            setStatusFilters(['visited', 'saved', 'pending']);
            setHideSaved(false);
            setHideVisited(false);
        }
    };
    const handleArchitectsChange = (architects) => {
        setSelectedArchitects(architects);
    };
    const handleContactsChange = (newContacts) => {
        setSelectedContacts(newContacts);
        if (newContacts.length > 0 && currentStatus.length === 0) {
            setStatusFilters(['visited', 'saved', 'pending']);
            setHideSaved(false);
            setHideVisited(false);
        }
    };
    const handleMinRatingChange = (value) => {
        setGlobalMinRating(value);
    };
    const handlePersonalRatingChange = (value) => {
        setPersonalMinRating(value);
    };
    const handleCollectionsChange = (ids) => {
        const collections = ids.map(id => ({ id, name: id }));
        setSelectedCollections(collections);
    };
    const handleFoldersChange = (ids) => {
        const folders = ids.map(id => ({ id, name: id }));
        setSelectedFolders(folders);
    };
    const handleHideSavedChange = (checked) => {
        setHideSaved(checked);
        setHideVisited(checked);
    };
    const handleStatusChange = (value) => {
        if (value === 'all') {
            setStatusFilters(['visited', 'saved', 'pending']);
            setHideSaved(false);
            setHideVisited(false);
        }
        else if (value === 'visited') {
            setStatusFilters(['visited']);
            setHideSaved(true);
            setHideVisited(false);
        }
        else if (value === 'saved') {
            setStatusFilters(['saved', 'pending']);
            setHideSaved(false);
            setHideVisited(true);
        }
    };
    const handleCategoryChange = (categoryId) => {
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
    const handleTypologiesChange = (ids) => {
        setSelectedTypologies(ids);
    };
    const currentMaterials = currentMaterialsAndStylesAndContexts.filter(id => materialityAttributes.some(a => a.id === id));
    const currentStyles = currentMaterialsAndStylesAndContexts.filter(id => styleAttributes.some(a => a.id === id));
    const currentContexts = currentMaterialsAndStylesAndContexts.filter(id => contextAttributes.some(a => a.id === id));
    const handleMaterialsChange = (ids) => {
        const otherAttributes = currentMaterialsAndStylesAndContexts.filter(id => !materialityAttributes.some(a => a.id === id));
        setSelectedAttributes([...otherAttributes, ...ids]);
    };
    const handleContextsChange = (ids) => {
        const otherAttributes = currentMaterialsAndStylesAndContexts.filter(id => !contextAttributes.some(a => a.id === id));
        setSelectedAttributes([...otherAttributes, ...ids]);
    };
    const handleStylesChange = (ids) => {
        const otherAttributes = currentMaterialsAndStylesAndContexts.filter(id => !styleAttributes.some(a => a.id === id));
        setSelectedAttributes([...otherAttributes, ...ids]);
    };
    const handleConstructionStatusesChange = (ids) => {
        setConstructionStatuses(ids);
    };
    const handleResetGlobalFilters = () => {
        setSelectedArchitects([]);
        setSelectedContacts([]);
        setSelectedCategory(null);
        setSelectedTypologies([]);
        setSelectedAttributes([]);
        setConstructionStatuses([]);
    };
    const handleClearAll = () => {
        setSelectedArchitects([]);
        setSelectedContacts([]);
        setSelectedCategory(null);
        setSelectedTypologies([]);
        setSelectedAttributes([]);
        setConstructionStatuses([]);
        setPersonalMinRating(0);
        setGlobalMinRating(0);
        setContactMinRating(0);
        setStatusFilters([]);
        setSelectedCollections([]);
        setSelectedFolders([]);
        setHideSaved(false);
        setHideVisited(false);
    };
    const currentMinRating = currentGlobalMinRating;
    const currentSegmentedStatus = currentStatus.includes('visited') && (currentStatus.includes('saved') || currentStatus.includes('pending'))
        ? 'all'
        : currentStatus.includes('visited')
            ? 'visited'
            : (currentStatus.includes('saved') || currentStatus.includes('pending'))
                ? 'saved'
                : 'all';
    const activeFilterCount = useMemo(() => {
        let count = 0;
        // Global filters
        if (currentArchitects.length > 0)
            count++;
        if (currentContacts.length > 0)
            count++;
        if (currentCategory)
            count++;
        if (currentTypologies.length > 0)
            count++;
        if (currentMaterials.length > 0)
            count++;
        if (currentContexts.length > 0)
            count++;
        if (currentStyles.length > 0)
            count++;
        if (constructionStatuses?.length > 0)
            count++;
        if (mode === 'discover') {
            if (currentMinRating > 0)
                count++;
            // In discover mode, hideSaved being true is a restriction/filter state
            if (hideSaved)
                count++;
        }
        else {
            // Library mode
            if (currentPersonalMinRating > 0)
                count++;
            if (currentCollectionIds.length > 0)
                count++;
            if (currentFolderIds.length > 0)
                count++;
            if (currentStatus.length > 0)
                count++;
        }
        return count;
    }, [
        mode,
        currentArchitects,
        currentContacts,
        currentMinRating,
        hideSaved,
        currentPersonalMinRating,
        currentCollectionIds,
        currentFolderIds,
        currentStatus,
        currentCategory,
        currentTypologies,
        currentMaterials,
        currentContexts,
        currentStyles,
        constructionStatuses
    ]);
    // Derived Data for Display
    const filteredTypologies = useMemo(() => {
        if (!currentCategory)
            return functionalTypologies;
        return functionalTypologies.filter(t => t.parent_category_id === currentCategory);
    }, [functionalTypologies, currentCategory]);
    const getTierLabel = (value) => {
        switch (value) {
            case 0: return 'All';
            case 1: return 'Top 20%';
            case 2: return 'Top 5%';
            case 3: return 'Top 1%';
            default: return 'All';
        }
    };
    const isContactMode = currentContacts.length > 0;
    // If contact mode is active, we behave like Library mode but for the contact
    const effectiveMode = isContactMode ? 'library' : mode;
    return (_jsxs(Sheet, { children: [_jsx(SheetTrigger, { asChild: true, children: _jsxs(Button, { variant: "outline", size: "icon", className: "h-9 w-9 relative", "aria-label": "Filters", children: [_jsx(ListFilter, { className: "h-4 w-4" }), activeFilterCount > 0 && (_jsx("span", { className: "absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-brand-primary text-[8px] text-brand-primary-foreground", children: activeFilterCount }))] }) }), _jsxs(SheetContent, { className: "w-[340px] sm:w-[380px] overflow-y-auto", children: [_jsxs(SheetHeader, { className: "flex flex-row items-center justify-between space-y-0", children: [_jsx(SheetTitle, { children: "Filters" }), activeFilterCount > 0 && (_jsx(Button, { variant: "ghost", size: "sm", onClick: handleClearAll, className: "h-auto px-2 text-xs text-text-secondary hover:text-text-primary", children: "Clear all" }))] }), _jsxs("div", { className: "grid gap-6 py-6", children: [_jsxs("div", { className: "space-y-2", children: [_jsx("h3", { className: "text-sm font-medium leading-none", children: "View Mode" }), _jsx(SegmentedControl, { options: [
                                            { label: 'Discover', value: 'discover' },
                                            { label: 'My Library', value: 'library' },
                                        ], value: mode, onValueChange: handleModeChange, className: "w-full" })] }), effectiveMode === 'discover' ? (
                            /* Discover Mode Section */
                            _jsx(_Fragment, { children: _jsxs("div", { className: "space-y-4", children: [_jsx("h3", { className: "text-sm font-semibold text-text-secondary uppercase tracking-wider text-xs", children: "Discovery Settings" }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsx(Label, { htmlFor: "hide-saved", className: "text-sm font-medium cursor-pointer", children: "Hide my saved buildings" }), _jsx(Switch, { id: "hide-saved", checked: hideSaved, onCheckedChange: handleHideSavedChange })] }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx(Label, { className: "text-sm font-medium", children: "Show only the best" }), _jsx("span", { className: "text-xs text-text-secondary", children: getTierLabel(currentMinRating) })] }), _jsx(Slider, { defaultValue: [0], max: 3, step: 1, value: [currentMinRating], onValueChange: (values) => handleMinRatingChange(values[0]), className: "w-full" })] })] }) })) : (
                            /* Library Mode Section */
                            _jsx(_Fragment, { children: _jsxs("div", { className: "space-y-4", children: [_jsx("h3", { className: "text-sm font-semibold text-text-secondary uppercase tracking-wider text-xs", children: isContactMode ? 'Contact Filters' : 'Library Settings' }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { className: "text-sm font-medium", children: isContactMode ? 'Curator Status' : 'Status' }), _jsx(SegmentedControl, { options: [
                                                        { label: 'All', value: 'all' },
                                                        { label: 'Visited', value: 'visited' },
                                                        { label: 'Bucket List', value: 'saved' },
                                                    ], value: currentSegmentedStatus, onValueChange: handleStatusChange, className: "w-full" })] }), _jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx(Label, { className: "text-sm font-medium", children: isContactMode ? 'Your Rating (Overlap)' : 'Your Rating' }), currentPersonalMinRating > 0 && (_jsxs("span", { className: "text-xs text-text-secondary", children: ["Min ", currentPersonalMinRating] }))] }), _jsx(QualityRatingFilter, { value: currentPersonalMinRating, onChange: handlePersonalRatingChange })] }), !isContactMode && (_jsx(Accordion, { type: "single", collapsible: true, className: "w-full", children: _jsxs(AccordionItem, { value: "collections", className: "border-none", children: [_jsx(AccordionTrigger, { className: "text-sm font-medium py-2 hover:no-underline", children: "Folders & Collections" }), _jsx(AccordionContent, { children: _jsx(FolderAndCollectionMultiSelect, { selectedCollectionIds: currentCollectionIds.map((c) => c.id), selectedFolderIds: currentFolderIds.map((f) => f.id), onCollectionChange: handleCollectionsChange, onFolderChange: handleFoldersChange }) })] }) }))] }) })), _jsx(Separator, {}), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h3", { className: "text-sm font-semibold text-text-secondary uppercase tracking-wider text-xs", children: "Global Filters" }), _jsx(Button, { variant: "ghost", size: "sm", onClick: handleResetGlobalFilters, className: "h-auto p-0 text-xs text-text-secondary hover:text-text-primary", children: "Reset" })] }), _jsxs(Accordion, { type: "single", collapsible: true, className: "w-full", children: [mode === 'discover' && (_jsxs(AccordionItem, { value: "curators", children: [_jsx(AccordionTrigger, { className: "text-sm", children: "Curators & Friends" }), _jsx(AccordionContent, { children: _jsx(ContactPicker, { selectedContacts: currentContacts, setSelectedContacts: handleContactsChange, placeholder: "Search people..." }) })] })), _jsxs(AccordionItem, { value: "architects", children: [_jsx(AccordionTrigger, { className: "text-sm", children: "Architects" }), _jsx(AccordionContent, { children: _jsx(ArchitectSelect, { selectedArchitects: currentArchitects, setSelectedArchitects: handleArchitectsChange, placeholder: "Search architects..." }) })] }), _jsxs(AccordionItem, { value: "function", children: [_jsx(AccordionTrigger, { className: "text-sm", children: "Function" }), _jsxs(AccordionContent, { className: "space-y-4 pt-2", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { className: "text-xs font-medium text-text-secondary", children: "Category" }), _jsxs(Select, { value: currentCategory || "all", onValueChange: handleCategoryChange, children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "Select Category" }) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "all", children: "All Categories" }), functionalCategories.map(cat => (_jsx(SelectItem, { value: cat.id, children: cat.name }, cat.id)))] })] })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { className: "text-xs font-medium text-text-secondary", children: "Typology" }), _jsx(MultiSelectCheckboxList, { items: filteredTypologies, selectedIds: currentTypologies, onChange: handleTypologiesChange, className: "h-[150px]" })] })] })] }), _jsxs(AccordionItem, { value: "materiality", children: [_jsx(AccordionTrigger, { className: "text-sm", children: "Materiality" }), _jsx(AccordionContent, { className: "pt-2", children: _jsx(MultiSelectCheckboxList, { items: materialityAttributes, selectedIds: currentMaterials, onChange: handleMaterialsChange }) })] }), _jsxs(AccordionItem, { value: "style", children: [_jsx(AccordionTrigger, { className: "text-sm", children: "Style" }), _jsx(AccordionContent, { className: "pt-2", children: _jsx(MultiSelectCheckboxList, { items: styleAttributes, selectedIds: currentStyles, onChange: handleStylesChange }) })] }), _jsxs(AccordionItem, { value: "context", children: [_jsx(AccordionTrigger, { className: "text-sm", children: "Context" }), _jsx(AccordionContent, { className: "pt-2", children: _jsx(MultiSelectCheckboxList, { items: contextAttributes, selectedIds: currentContexts, onChange: handleContextsChange }) })] }), _jsxs(AccordionItem, { value: "construction_status", children: [_jsx(AccordionTrigger, { className: "text-sm", children: "Global Status" }), _jsx(AccordionContent, { className: "pt-2", children: _jsx(MultiSelectCheckboxList, { items: [
                                                                { id: 'Built', name: 'Built' },
                                                                { id: 'Lost', name: 'Lost' },
                                                                { id: 'Under Construction', name: 'Under Construction' },
                                                                { id: 'Unbuilt', name: 'Unbuilt' },
                                                            ], selectedIds: constructionStatuses || [], onChange: handleConstructionStatusesChange, className: "h-[150px]" }) })] })] })] })] })] })] }));
}
