import { jsxs, jsx, Fragment } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { I as Input, A as Avatar, a as AvatarImage, b as AvatarFallback, s as supabase, u as useToast, D as Dialog, c as DialogContent, d as DialogHeader, e as DialogTitle, f as DialogDescription, B as Button, S as ScrollArea, C as Checkbox, g as DialogFooter, L as Label, h as slugify, i as Sheet, j as SheetContent, k as SheetHeader, l as SheetTitle, m as SheetDescription, T as Tabs, n as TabsList, o as TabsTrigger, p as TabsContent, q as Switch, r as Textarea, t as Separator, v as Badge, R as RadioGroup, w as RadioGroupItem, x as SheetFooter, y as AlertDialog, z as AlertDialogContent, E as AlertDialogHeader, F as AlertDialogTitle, G as AlertDialogDescription, H as AlertDialogFooter, J as AlertDialogCancel, K as AlertDialogAction, M as parseLocation, N as collectionSchema } from "./server-build-13CMcc8S.js";
import { Search, Loader2, Plus, Folder, ArrowLeft, FolderPlus, Sparkles, Download, AlertTriangle, X, MapPin, Trash2, LogOut, Bookmark } from "lucide-react";
import { toast } from "sonner";
import "@vercel/react-router/entry.server";
import "@radix-ui/react-slot";
import "class-variance-authority";
import "clsx";
import "tailwind-merge";
import "@tanstack/react-query";
import "@radix-ui/react-tooltip";
import "@radix-ui/react-toast";
import "next-themes";
import "@supabase/ssr";
import "vaul";
import "react-error-boundary";
import "@sentry/react";
import "@radix-ui/react-separator";
import "@radix-ui/react-dialog";
import "@vercel/analytics/react";
import "@radix-ui/react-label";
import "@radix-ui/react-checkbox";
import "@radix-ui/react-avatar";
import "zod";
import "use-places-autocomplete";
import "@googlemaps/js-api-loader";
import "cmdk";
import "@radix-ui/react-scroll-area";
import "@radix-ui/react-alert-dialog";
import "@radix-ui/react-radio-group";
import "react-dom";
import "maplibre-gl";
import "embla-carousel-react";
import "recharts";
import "@radix-ui/react-toggle-group";
import "@radix-ui/react-toggle";
import "date-fns";
import "@radix-ui/react-tabs";
import "@radix-ui/react-switch";
import "@radix-ui/react-select";
import "framer-motion";
import "@radix-ui/react-dropdown-menu";
import "@radix-ui/react-popover";
import "@radix-ui/react-slider";
import "@radix-ui/react-accordion";
import "@dnd-kit/core";
import "@dnd-kit/sortable";
import "@dnd-kit/utilities";
import "@radix-ui/react-hover-card";
import "@radix-ui/react-collapsible";
import "zustand";
import "react-hook-form";
import "@hookform/resolvers/zod";
function UserSearch({ onSelect, excludeIds = [] }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const searchUsers = async () => {
      if (query.length < 2) {
        setResults([]);
        return;
      }
      setLoading(true);
      const { data, error } = await supabase.from("profiles").select("id, username, avatar_url").ilike("username", `%${query}%`).not("id", "in", `(${excludeIds.join(",") || "00000000-0000-0000-0000-000000000000"})`).limit(5);
      if (!error && data) {
        setResults(data);
      }
      setLoading(false);
    };
    const timer = setTimeout(searchUsers, 300);
    return () => clearTimeout(timer);
  }, [query, excludeIds]);
  return /* @__PURE__ */ jsxs("div", { className: "relative w-full", children: [
    /* @__PURE__ */ jsxs("div", { className: "relative", children: [
      /* @__PURE__ */ jsx(Search, { className: "absolute left-3 top-2.5 h-4 w-4 text-text-secondary" }),
      /* @__PURE__ */ jsx(
        Input,
        {
          placeholder: "Type a username...",
          value: query,
          onChange: (e) => setQuery(e.target.value),
          className: "pl-9"
        }
      ),
      loading && /* @__PURE__ */ jsx(Loader2, { className: "absolute right-3 top-2.5 h-4 w-4 animate-spin text-text-secondary" })
    ] }),
    results.length > 0 && /* @__PURE__ */ jsx("div", { className: "absolute z-50 w-full mt-1 bg-surface-overlay border rounded-md shadow-lg overflow-hidden", children: results.map((u) => {
      var _a, _b;
      return /* @__PURE__ */ jsxs(
        "div",
        {
          className: "flex items-center gap-3 p-3 hover:bg-brand-secondary cursor-pointer transition-colors",
          onClick: () => {
            onSelect(u.id, u.username ?? "");
            setQuery("");
            setResults([]);
          },
          children: [
            /* @__PURE__ */ jsxs(Avatar, { className: "h-8 w-8", children: [
              /* @__PURE__ */ jsx(AvatarImage, { src: u.avatar_url ?? void 0 }),
              /* @__PURE__ */ jsx(AvatarFallback, { children: (_b = (_a = u.username) == null ? void 0 : _a[0]) == null ? void 0 : _b.toUpperCase() })
            ] }),
            /* @__PURE__ */ jsx("span", { className: "font-medium text-sm", children: u.username })
          ]
        },
        u.id
      );
    }) })
  ] });
}
function AddToFolderDialog({ open, onOpenChange, collectionId, userId, onSuccess }) {
  const { toast: toast2 } = useToast();
  const [view, setView] = useState("list");
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedFolderIds, setSelectedFolderIds] = useState(/* @__PURE__ */ new Set());
  const [processing, setProcessing] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  useEffect(() => {
    if (open) {
      setView("list");
      fetchFoldersAndStatus();
    }
  }, [open, collectionId]);
  const fetchFoldersAndStatus = async () => {
    setLoading(true);
    try {
      const { data: userFolders, error: foldersError } = await supabase.from("user_folders").select("*").eq("owner_id", userId).order("created_at", { ascending: false });
      if (foldersError) throw foldersError;
      setFolders(userFolders ?? []);
      const { data: folderItems, error: itemsError } = await supabase.from("user_folder_items").select("folder_id").eq("collection_id", collectionId);
      if (itemsError) throw itemsError;
      const currentFolderIds = new Set(
        (folderItems ?? []).map((item) => item.folder_id)
      );
      setSelectedFolderIds(currentFolderIds);
    } catch (_error) {
      toast2({ variant: "destructive", description: "Failed to load folders." });
    } finally {
      setLoading(false);
    }
  };
  const handleToggleFolder = (folderId) => {
    const newSet = new Set(selectedFolderIds);
    if (newSet.has(folderId)) {
      newSet.delete(folderId);
    } else {
      newSet.add(folderId);
    }
    setSelectedFolderIds(newSet);
  };
  const handleSave = async () => {
    setProcessing(true);
    try {
      const { data: currentItems } = await supabase.from("user_folder_items").select("folder_id").eq("collection_id", collectionId);
      const currentIds = new Set(
        (currentItems ?? []).map((i) => i.folder_id)
      );
      const targetIds = selectedFolderIds;
      const toAdd = Array.from(targetIds).filter((id) => !currentIds.has(id));
      const toRemove = Array.from(currentIds).filter((id) => !targetIds.has(id));
      if (toAdd.length > 0) {
        const { error: insertError } = await supabase.from("user_folder_items").insert(toAdd.map((id) => ({ folder_id: id, collection_id: collectionId })));
        if (insertError) throw insertError;
      }
      if (toRemove.length > 0) {
        const { error: deleteError } = await supabase.from("user_folder_items").delete().eq("collection_id", collectionId).in("folder_id", toRemove);
        if (deleteError) throw deleteError;
      }
      toast2({ description: "Collection updated in folders." });
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (_error) {
      toast2({ variant: "destructive", description: "Failed to save changes." });
    } finally {
      setProcessing(false);
    }
  };
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    setProcessing(true);
    try {
      let slug = slugify(newFolderName);
      if (!slug) slug = "folder";
      const { data: existing } = await supabase.from("user_folders").select("slug").eq("slug", slug).maybeSingle();
      if (existing) {
        slug = `${slug}-${Date.now()}`;
      }
      const { data, error } = await supabase.from("user_folders").insert({
        owner_id: userId,
        name: newFolderName,
        is_public: true,
        // Default to public
        slug
      }).select().single();
      if (error) throw error;
      setFolders([data, ...folders]);
      const newSet = new Set(selectedFolderIds);
      newSet.add(data.id);
      setSelectedFolderIds(newSet);
      setView("list");
      setNewFolderName("");
      toast2({ description: "Folder created and selected." });
    } catch (_error) {
      toast2({ variant: "destructive", description: "Failed to create folder." });
    } finally {
      setProcessing(false);
    }
  };
  return /* @__PURE__ */ jsx(Dialog, { open, onOpenChange, children: /* @__PURE__ */ jsxs(DialogContent, { className: "sm:max-w-md", children: [
    /* @__PURE__ */ jsxs(DialogHeader, { children: [
      /* @__PURE__ */ jsx(DialogTitle, { children: view === "list" ? "Add to Folder" : "New Folder" }),
      /* @__PURE__ */ jsx(DialogDescription, { children: view === "list" ? "Select folders to add this collection to." : "Create a new folder to organize your collections." })
    ] }),
    view === "list" ? /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
      /* @__PURE__ */ jsxs(Button, { onClick: () => setView("create"), variant: "outline", className: "w-full", children: [
        /* @__PURE__ */ jsx(Plus, { className: "mr-2 h-4 w-4" }),
        " Create New Folder"
      ] }),
      loading ? /* @__PURE__ */ jsx("div", { className: "flex justify-center py-8", children: /* @__PURE__ */ jsx(Loader2, { className: "h-6 w-6 animate-spin text-text-secondary" }) }) : /* @__PURE__ */ jsx(ScrollArea, { className: "h-[300px] pr-4", children: folders.length === 0 ? /* @__PURE__ */ jsx("p", { className: "text-center py-8 text-text-secondary", children: "No folders found." }) : /* @__PURE__ */ jsx("div", { className: "space-y-2", children: folders.map((folder) => /* @__PURE__ */ jsxs("div", { className: "flex items-center space-x-3 p-2 rounded hover:bg-surface-muted/30", children: [
        /* @__PURE__ */ jsx(
          Checkbox,
          {
            id: `folder-${folder.id}`,
            checked: selectedFolderIds.has(folder.id),
            onCheckedChange: () => handleToggleFolder(folder.id)
          }
        ),
        /* @__PURE__ */ jsx("div", { className: "grid gap-1.5 leading-none flex-1", children: /* @__PURE__ */ jsxs(
          "label",
          {
            htmlFor: `folder-${folder.id}`,
            className: "text-sm font-medium leading-none cursor-pointer flex items-center gap-2",
            children: [
              /* @__PURE__ */ jsx(Folder, { className: "h-4 w-4 text-text-secondary" }),
              folder.name
            ]
          }
        ) })
      ] }, folder.id)) }) }),
      /* @__PURE__ */ jsx(DialogFooter, { children: /* @__PURE__ */ jsxs(Button, { onClick: handleSave, disabled: processing || loading, children: [
        processing && /* @__PURE__ */ jsx(Loader2, { className: "mr-2 h-4 w-4 animate-spin" }),
        "Save"
      ] }) })
    ] }) : /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
      /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ jsx(Label, { htmlFor: "folder-name", children: "Folder Name" }),
        /* @__PURE__ */ jsx(
          Input,
          {
            id: "folder-name",
            value: newFolderName,
            onChange: (e) => setNewFolderName(e.target.value),
            placeholder: "e.g. Travel Ideas"
          }
        )
      ] }),
      /* @__PURE__ */ jsxs(DialogFooter, { className: "gap-2 sm:gap-0 mt-4", children: [
        /* @__PURE__ */ jsxs(Button, { variant: "outline", onClick: () => setView("list"), disabled: processing, children: [
          /* @__PURE__ */ jsx(ArrowLeft, { className: "mr-2 h-4 w-4" }),
          " Back"
        ] }),
        /* @__PURE__ */ jsxs(Button, { onClick: handleCreateFolder, disabled: processing || !newFolderName.trim(), children: [
          processing && /* @__PURE__ */ jsx(Loader2, { className: "mr-2 h-4 w-4 animate-spin" }),
          "Create Folder"
        ] })
      ] })
    ] })
  ] }) });
}
const METHOD_DESCRIPTIONS = {
  uniform: "All pins appear identical, regardless of status or rating.",
  default: "Pins are colored based on your personal status (Visited, Pending, or Unvisited).",
  status: "Pins show if locations have been visited by all selected members (Green), some (Orange), or none (Grey).",
  rating_member: "Pins highlight the highest rating among members: Masterpiece (Gold), Essential (Silver), Impressive (Bronze), or Saved (Blue).",
  custom: "Create custom categories with your own colors to organize locations."
};
function CollectionSettingsDialog({ collection, open, onOpenChange, onUpdate, showSavedCandidates, onShowSavedCandidatesChange, isOwner = false, canEdit = true, onSaveAll, currentUserId, onPlanRoute }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: collection.name,
    description: collection.description || "",
    is_public: collection.is_public,
    external_link: collection.external_link || "",
    show_community_images: collection.show_community_images,
    categorization_method: collection.categorization_method || "uniform",
    custom_categories: collection.custom_categories || [],
    categorization_selected_members: collection.categorization_selected_members || null
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [contributors, setContributors] = useState([]);
  const [loadingContributors, setLoadingContributors] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showAddToFolder, setShowAddToFolder] = useState(false);
  const [newCategory, setNewCategory] = useState({ label: "", color: "#EEFF41" });
  const [collectionFolders, setCollectionFolders] = useState([]);
  const fetchCollectionFolders = async () => {
    const { data, error } = await supabase.from("user_folder_items").select("folder_id, user_folders(id, name)").eq("collection_id", collection.id);
    if (!error && data) {
      const rows = data;
      const mapped = rows.map((item) => {
        const uf = item.user_folders;
        const folder = Array.isArray(uf) ? uf[0] : uf;
        return folder ? { id: folder.id, name: folder.name } : null;
      }).filter((x) => x !== null);
      setCollectionFolders(mapped);
    }
  };
  useEffect(() => {
    if (open) {
      setFormData({
        name: collection.name,
        description: collection.description || "",
        is_public: collection.is_public,
        external_link: collection.external_link || "",
        show_community_images: collection.show_community_images,
        categorization_method: collection.categorization_method || "uniform",
        custom_categories: collection.custom_categories || [],
        categorization_selected_members: collection.categorization_selected_members || null
      });
      fetchContributors();
      fetchCollectionFolders();
    }
  }, [open, collection]);
  const fetchContributors = async () => {
    setLoadingContributors(true);
    const { data, error } = await supabase.from("collection_contributors").select("user_id, user:profiles(id, username, avatar_url)").eq("collection_id", collection.id);
    if (!error && data) {
      const rows = data;
      setContributors(
        rows.map((row) => {
          const u = Array.isArray(row.user) ? row.user[0] : row.user;
          return u ? { user_id: row.user_id, user: u } : null;
        }).filter((c) => c !== null)
      );
    }
    setLoadingContributors(false);
  };
  const handleSaveGeneral = async () => {
    var _a, _b;
    const ext = (_a = formData.external_link) == null ? void 0 : _a.trim();
    const parsed = collectionSchema.safeParse({
      name: formData.name,
      description: formData.description || void 0,
      is_public: formData.is_public,
      external_link: ext ? ext : null
    });
    if (!parsed.success) {
      toast.error(((_b = parsed.error.issues[0]) == null ? void 0 : _b.message) ?? "Invalid collection");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("collections").update({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      is_public: parsed.data.is_public,
      external_link: parsed.data.external_link ?? null,
      show_community_images: formData.show_community_images,
      categorization_method: formData.categorization_method,
      custom_categories: formData.custom_categories,
      categorization_selected_members: formData.categorization_selected_members
    }).eq("id", collection.id);
    setSaving(false);
    if (error) {
      toast.error("Failed to update collection");
    } else {
      toast.success("Collection updated");
      onUpdate();
      onOpenChange(false);
    }
  };
  const handleAddContributor = async (userId) => {
    if (contributors.some((c) => c.user.id === userId)) {
      toast.error("User is already a contributor");
      return;
    }
    const { error } = await supabase.from("collection_contributors").insert({
      collection_id: collection.id,
      user_id: userId,
      role: "editor"
    });
    if (error) {
      toast.error("Failed to add contributor");
    } else {
      toast.success("Contributor added");
      fetchContributors();
    }
  };
  const handleRemoveContributor = async (userId) => {
    const { error } = await supabase.from("collection_contributors").delete().eq("collection_id", collection.id).eq("user_id", userId);
    if (error) {
      toast.error("Failed to remove contributor");
    } else {
      toast.success("Contributor removed");
      fetchContributors();
    }
  };
  const handleLeaveCollection = async () => {
    if (!currentUserId) return;
    if (!window.confirm("Are you sure you want to leave this collection? You will lose access to edit it.")) {
      return;
    }
    const { error } = await supabase.from("collection_contributors").delete().eq("collection_id", collection.id).eq("user_id", currentUserId);
    if (error) {
      toast.error("Failed to leave collection");
    } else {
      toast.success("You have left the collection");
      onOpenChange(false);
      navigate("/profile");
    }
  };
  const addCustomCategory = () => {
    if (!newCategory.label.trim()) return;
    const category = {
      id: crypto.randomUUID(),
      label: newCategory.label.trim(),
      color: newCategory.color
    };
    setFormData((prev) => ({
      ...prev,
      custom_categories: [...prev.custom_categories || [], category]
    }));
    setNewCategory({ label: "", color: "#EEFF41" });
  };
  const removeCustomCategory = (id) => {
    setFormData((prev) => ({
      ...prev,
      custom_categories: (prev.custom_categories || []).filter((c) => c.id !== id)
    }));
  };
  const toggleMemberSelection = (userId) => {
    const current = formData.categorization_selected_members || [];
    if (current.includes(userId)) {
      setFormData({ ...formData, categorization_selected_members: current.filter((id) => id !== userId) });
    } else {
      setFormData({ ...formData, categorization_selected_members: [...current, userId] });
    }
  };
  const handleDeleteCollection = async () => {
    setDeleting(true);
    const { error } = await supabase.from("collections").delete().eq("id", collection.id);
    if (error) {
      toast.error("Failed to delete collection");
      setDeleting(false);
    } else {
      toast.success("Collection deleted");
      onOpenChange(false);
      navigate("/profile");
    }
  };
  const handleExportData = async () => {
    try {
      setDownloading(true);
      const { data, error } = await supabase.from("collection_items").select(`
          note,
          custom_category_id,
          buildings (
            name,
            address,
            city,
            country,
            year_completed,
            location,
            building_architects (
              architects (
                name
              )
            )
          )
        `).eq("collection_id", collection.id);
      if (error) throw error;
      if (!data || data.length === 0) {
        toast.info("No items to export");
        return;
      }
      const headers = ["Name", "Address", "City", "Country", "Year", "Latitude", "Longitude", "Architects", "Note", "Category"];
      const exportRows = data;
      const rows = exportRows.map((item) => {
        var _a, _b, _c;
        const bRaw = item.buildings;
        const building = Array.isArray(bRaw) ? bRaw[0] : bRaw;
        const location = parseLocation(building == null ? void 0 : building.location);
        const architects = (_a = building == null ? void 0 : building.building_architects) == null ? void 0 : _a.map((ba) => {
          var _a2;
          return (_a2 = ba.architects) == null ? void 0 : _a2.name;
        }).filter(Boolean).join("; ");
        const category = ((_c = (_b = collection.custom_categories) == null ? void 0 : _b.find((c) => c.id === item.custom_category_id)) == null ? void 0 : _c.label) || "";
        const escape = (val) => {
          if (val === null || val === void 0) return "";
          const str = String(val);
          if (str.includes(",") || str.includes('"') || str.includes("\n")) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        };
        return [
          escape(building == null ? void 0 : building.name),
          escape(building == null ? void 0 : building.address),
          escape(building == null ? void 0 : building.city),
          escape(building == null ? void 0 : building.country),
          escape(building == null ? void 0 : building.year_completed),
          escape(location == null ? void 0 : location.lat),
          escape(location == null ? void 0 : location.lng),
          escape(architects),
          escape(item.note),
          escape(category)
        ].join(",");
      });
      const csvContent = [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `${collection.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}-export.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Export successful");
    } catch (_error) {
      toast.error("Failed to export data");
    } finally {
      setDownloading(false);
    }
  };
  return /* @__PURE__ */ jsxs(Sheet, { open, onOpenChange, children: [
    /* @__PURE__ */ jsxs(SheetContent, { side: "right", className: "w-full sm:max-w-[500px] flex flex-col h-full bg-surface-overlay border-l border-border-default shadow-lg", children: [
      /* @__PURE__ */ jsxs(SheetHeader, { className: "border-b border-border-default pb-4", children: [
        /* @__PURE__ */ jsx(SheetTitle, { children: "Collection Settings" }),
        /* @__PURE__ */ jsx(SheetDescription, { children: "Manage your collection preferences and collaborators." })
      ] }),
      /* @__PURE__ */ jsxs(Tabs, { defaultValue: "map", className: "w-full flex-1 flex flex-col min-h-0", children: [
        /* @__PURE__ */ jsxs(TabsList, { className: canEdit ? "grid w-full grid-cols-4" : "grid w-full grid-cols-1", children: [
          /* @__PURE__ */ jsx(TabsTrigger, { value: "map", children: "Map View" }),
          canEdit && /* @__PURE__ */ jsx(TabsTrigger, { value: "general", children: "General" }),
          canEdit && /* @__PURE__ */ jsx(TabsTrigger, { value: "markers", children: "Markers" }),
          canEdit && /* @__PURE__ */ jsx(TabsTrigger, { value: "collaborators", children: "Collaborators" })
        ] }),
        /* @__PURE__ */ jsxs(TabsContent, { value: "map", className: "space-y-4 py-4 overflow-y-auto flex-1", children: [
          canEdit && /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between space-x-2", children: [
            /* @__PURE__ */ jsxs(Label, { htmlFor: "community-images", className: "flex flex-col space-y-1", children: [
              /* @__PURE__ */ jsx("span", { children: "Show Community Images" }),
              /* @__PURE__ */ jsx("span", { className: "font-normal text-xs text-text-secondary", children: "Display images in map and list" })
            ] }),
            /* @__PURE__ */ jsx(
              Switch,
              {
                id: "community-images",
                checked: formData.show_community_images,
                onCheckedChange: (c) => setFormData({ ...formData, show_community_images: c })
              }
            )
          ] }),
          onShowSavedCandidatesChange && /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between space-x-2", children: [
            /* @__PURE__ */ jsxs(Label, { htmlFor: "show-saved-candidates", className: "flex flex-col space-y-1", children: [
              /* @__PURE__ */ jsx("span", { children: "Show Saved Places" }),
              /* @__PURE__ */ jsx("span", { className: "font-normal text-xs text-text-secondary", children: "Show your saved places as suggestions on the map" })
            ] }),
            /* @__PURE__ */ jsx(
              Switch,
              {
                id: "show-saved-candidates",
                checked: showSavedCandidates,
                onCheckedChange: onShowSavedCandidatesChange
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxs(TabsContent, { value: "general", className: "space-y-4 py-4 overflow-y-auto flex-1", children: [
          /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
            /* @__PURE__ */ jsx(Label, { htmlFor: "name", children: "Name" }),
            /* @__PURE__ */ jsx(
              Input,
              {
                id: "name",
                value: formData.name,
                onChange: (e) => setFormData({ ...formData, name: e.target.value })
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
            /* @__PURE__ */ jsx(Label, { htmlFor: "description", children: "Description" }),
            /* @__PURE__ */ jsx(
              Textarea,
              {
                id: "description",
                value: formData.description,
                onChange: (e) => setFormData({ ...formData, description: e.target.value }),
                rows: 3
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
            /* @__PURE__ */ jsx(Label, { htmlFor: "external-link", children: "External Link" }),
            /* @__PURE__ */ jsx(
              Input,
              {
                id: "external-link",
                value: formData.external_link,
                onChange: (e) => setFormData({ ...formData, external_link: e.target.value }),
                placeholder: "https://example.com"
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between space-x-2", children: [
            /* @__PURE__ */ jsxs(Label, { htmlFor: "public-mode", className: "flex flex-col space-y-1", children: [
              /* @__PURE__ */ jsx("span", { children: "Public Collection" }),
              /* @__PURE__ */ jsx("span", { className: "font-normal text-xs text-text-secondary", children: "Visible to everyone" })
            ] }),
            /* @__PURE__ */ jsx(
              Switch,
              {
                id: "public-mode",
                checked: formData.is_public,
                onCheckedChange: (c) => setFormData({ ...formData, is_public: c })
              }
            )
          ] }),
          /* @__PURE__ */ jsx(Separator, { className: "my-6" }),
          /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
            /* @__PURE__ */ jsxs("h3", { className: "text-sm font-medium flex items-center gap-2", children: [
              /* @__PURE__ */ jsx(FolderPlus, { className: "h-4 w-4" }),
              " Folders"
            ] }),
            /* @__PURE__ */ jsx("p", { className: "text-sm text-text-secondary", children: "Add this collection to one or more of your folders." }),
            collectionFolders.length > 0 && /* @__PURE__ */ jsx("div", { className: "flex flex-wrap gap-2", children: collectionFolders.map((folder) => /* @__PURE__ */ jsxs(Badge, { variant: "secondary", children: [
              /* @__PURE__ */ jsx(Folder, { className: "h-3 w-3 mr-1" }),
              folder.name
            ] }, folder.id)) }),
            /* @__PURE__ */ jsx(Button, { onClick: () => setShowAddToFolder(true), className: "w-full sm:w-auto", variant: "outline", children: "Manage Folders" })
          ] }),
          /* @__PURE__ */ jsx(Separator, { className: "my-6" }),
          onPlanRoute && /* @__PURE__ */ jsxs(Fragment, { children: [
            /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
              /* @__PURE__ */ jsxs("h3", { className: "text-sm font-medium flex items-center gap-2", children: [
                /* @__PURE__ */ jsx(Sparkles, { className: "h-4 w-4" }),
                " Plan Route"
              ] }),
              /* @__PURE__ */ jsx("p", { className: "text-sm text-text-secondary", children: "Generate an optimized route for visiting buildings in this collection." }),
              /* @__PURE__ */ jsx(Button, { onClick: () => {
                onPlanRoute();
                onOpenChange(false);
              }, className: "w-full sm:w-auto", children: "Open Itinerary Planner" })
            ] }),
            /* @__PURE__ */ jsx(Separator, { className: "my-6" })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
            /* @__PURE__ */ jsx("h3", { className: "text-sm font-medium", children: "Export Data" }),
            /* @__PURE__ */ jsx("p", { className: "text-sm text-text-secondary", children: "Download a CSV file containing all buildings in this collection, including coordinates and notes." }),
            /* @__PURE__ */ jsxs(Button, { onClick: handleExportData, disabled: downloading, variant: "outline", className: "w-full sm:w-auto", children: [
              downloading ? /* @__PURE__ */ jsx(Loader2, { className: "mr-2 h-4 w-4 animate-spin" }) : /* @__PURE__ */ jsx(Download, { className: "mr-2 h-4 w-4" }),
              "Download CSV"
            ] })
          ] }),
          /* @__PURE__ */ jsx(Separator, { className: "my-6" }),
          isOwner && /* @__PURE__ */ jsxs("div", { className: "border border-feedback-destructive/50 rounded-md p-4 bg-feedback-destructive/5 space-y-4", children: [
            /* @__PURE__ */ jsxs("h3", { className: "text-feedback-destructive font-medium flex items-center gap-2", children: [
              /* @__PURE__ */ jsx(AlertTriangle, { className: "h-4 w-4" }),
              " Danger Zone"
            ] }),
            /* @__PURE__ */ jsx("p", { className: "text-sm text-text-secondary", children: "Deleting this collection will permanently remove it and all its associations. This action cannot be undone." }),
            /* @__PURE__ */ jsx(
              Button,
              {
                variant: "destructive",
                onClick: () => setShowDeleteAlert(true),
                className: "w-full sm:w-auto",
                children: "Delete Collection"
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsx(TabsContent, { value: "markers", className: "space-y-4 py-4 overflow-y-auto flex-1", children: /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
          /* @__PURE__ */ jsx(Label, { children: "Categorization Method" }),
          /* @__PURE__ */ jsxs(
            RadioGroup,
            {
              value: formData.categorization_method,
              onValueChange: (val) => setFormData({
                ...formData,
                categorization_method: val
              }),
              className: "space-y-2",
              children: [
                /* @__PURE__ */ jsxs("div", { className: "flex items-center space-x-2", children: [
                  /* @__PURE__ */ jsx(RadioGroupItem, { value: "uniform", id: "cat-uniform" }),
                  /* @__PURE__ */ jsx(Label, { htmlFor: "cat-uniform", className: "font-normal cursor-pointer", children: "Uniform" })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "flex items-center space-x-2", children: [
                  /* @__PURE__ */ jsx(RadioGroupItem, { value: "default", id: "cat-default" }),
                  /* @__PURE__ */ jsx(Label, { htmlFor: "cat-default", className: "font-normal cursor-pointer", children: "Personal Status" })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "flex items-center space-x-2", children: [
                  /* @__PURE__ */ jsx(RadioGroupItem, { value: "status", id: "cat-status" }),
                  /* @__PURE__ */ jsx(Label, { htmlFor: "cat-status", className: "font-normal cursor-pointer", children: "Member Status" })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "flex items-center space-x-2", children: [
                  /* @__PURE__ */ jsx(RadioGroupItem, { value: "rating_member", id: "cat-rating" }),
                  /* @__PURE__ */ jsx(Label, { htmlFor: "cat-rating", className: "font-normal cursor-pointer", children: "Member Ratings" })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "flex items-center space-x-2", children: [
                  /* @__PURE__ */ jsx(RadioGroupItem, { value: "custom", id: "cat-custom" }),
                  /* @__PURE__ */ jsx(Label, { htmlFor: "cat-custom", className: "font-normal cursor-pointer", children: "Custom Categories" })
                ] })
              ]
            }
          ),
          /* @__PURE__ */ jsx("div", { className: "text-sm text-text-secondary bg-surface-muted/10 p-2 rounded-md border mt-2", children: METHOD_DESCRIPTIONS[formData.categorization_method] }),
          (formData.categorization_method === "status" || formData.categorization_method === "rating_member") && /* @__PURE__ */ jsxs("div", { className: "pl-6 space-y-3 border-l-2 ml-1 mt-2", children: [
            /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
              /* @__PURE__ */ jsx(Label, { className: "text-xs font-semibold", children: "Member Filter" }),
              /* @__PURE__ */ jsxs("div", { className: "flex items-center space-x-2 mt-1", children: [
                /* @__PURE__ */ jsx(
                  Checkbox,
                  {
                    id: "specific-members",
                    checked: formData.categorization_selected_members !== null,
                    onCheckedChange: (checked) => {
                      if (checked) {
                        setFormData({ ...formData, categorization_selected_members: [] });
                      } else {
                        setFormData({ ...formData, categorization_selected_members: null });
                      }
                    }
                  }
                ),
                /* @__PURE__ */ jsx(Label, { htmlFor: "specific-members", className: "text-sm font-normal cursor-pointer", children: "Apply to specific members only" })
              ] })
            ] }),
            formData.categorization_selected_members !== null && /* @__PURE__ */ jsx(ScrollArea, { className: "h-[150px] border rounded-md p-2 bg-surface-muted/5", children: contributors.length > 0 ? /* @__PURE__ */ jsx("div", { className: "space-y-2", children: contributors.map((c) => {
              var _a;
              if (!c.user) return null;
              return /* @__PURE__ */ jsxs("div", { className: "flex items-center space-x-2", children: [
                /* @__PURE__ */ jsx(
                  Checkbox,
                  {
                    id: `member-${c.user.id}`,
                    checked: (_a = formData.categorization_selected_members) == null ? void 0 : _a.includes(c.user.id),
                    onCheckedChange: () => toggleMemberSelection(c.user.id)
                  }
                ),
                /* @__PURE__ */ jsx(Label, { htmlFor: `member-${c.user.id}`, className: "font-normal cursor-pointer text-sm", children: c.user.username })
              ] }, c.user.id);
            }) }) : /* @__PURE__ */ jsx("div", { className: "text-xs text-text-secondary py-4 text-center", children: "No collaborators found." }) })
          ] }),
          formData.categorization_method === "custom" && /* @__PURE__ */ jsxs("div", { className: "space-y-4 pt-2", children: [
            /* @__PURE__ */ jsx(Separator, {}),
            /* @__PURE__ */ jsxs("div", { className: "flex gap-2 items-end", children: [
              /* @__PURE__ */ jsxs("div", { className: "flex-1 space-y-2", children: [
                /* @__PURE__ */ jsx(Label, { className: "text-xs", children: "Category Name" }),
                /* @__PURE__ */ jsx(
                  Input,
                  {
                    value: newCategory.label,
                    onChange: (e) => setNewCategory({ ...newCategory, label: e.target.value }),
                    placeholder: "e.g. Must Visit",
                    className: "h-9"
                  }
                )
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
                /* @__PURE__ */ jsx(Label, { className: "text-xs", children: "Color" }),
                /* @__PURE__ */ jsx("div", { className: "flex items-center gap-2", children: /* @__PURE__ */ jsx(
                  Input,
                  {
                    type: "color",
                    value: newCategory.color,
                    onChange: (e) => setNewCategory({ ...newCategory, color: e.target.value }),
                    className: "h-9 w-12 p-1 cursor-pointer"
                  }
                ) })
              ] }),
              /* @__PURE__ */ jsx(Button, { size: "sm", onClick: addCustomCategory, disabled: !newCategory.label, children: /* @__PURE__ */ jsx(Plus, { className: "h-4 w-4" }) })
            ] }),
            /* @__PURE__ */ jsx(ScrollArea, { className: "h-[200px] border rounded-md bg-surface-muted/10 p-2", children: formData.custom_categories && formData.custom_categories.length > 0 ? /* @__PURE__ */ jsx("div", { className: "space-y-2", children: formData.custom_categories.map((cat) => /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between bg-surface-card p-2 rounded-md shadow-sm border", children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
                /* @__PURE__ */ jsx(
                  "div",
                  {
                    className: "w-4 h-4 rounded-full border shadow-sm",
                    style: { backgroundColor: cat.color }
                  }
                ),
                /* @__PURE__ */ jsx("span", { className: "text-sm font-medium", children: cat.label })
              ] }),
              /* @__PURE__ */ jsx(Button, { variant: "ghost", size: "icon", className: "h-6 w-6 text-text-secondary hover:text-feedback-destructive", onClick: () => removeCustomCategory(cat.id), children: /* @__PURE__ */ jsx(X, { className: "h-3 w-3" }) })
            ] }, cat.id)) }) : /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center justify-center h-full text-text-secondary text-xs gap-2 opacity-50", children: [
              /* @__PURE__ */ jsx(MapPin, { className: "h-6 w-6" }),
              /* @__PURE__ */ jsx("p", { children: "No custom categories yet" })
            ] }) })
          ] })
        ] }) }),
        /* @__PURE__ */ jsxs(TabsContent, { value: "collaborators", className: "space-y-4 py-4 overflow-y-auto flex-1", children: [
          isOwner && /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
            /* @__PURE__ */ jsx(Label, { children: "Add Collaborator" }),
            /* @__PURE__ */ jsx(
              UserSearch,
              {
                onSelect: (id) => handleAddContributor(id),
                excludeIds: contributors.map((c) => {
                  var _a;
                  return (_a = c.user) == null ? void 0 : _a.id;
                }).filter(Boolean)
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
            /* @__PURE__ */ jsx(Label, { children: "Current Collaborators" }),
            loadingContributors ? /* @__PURE__ */ jsx("div", { className: "flex justify-center py-4", children: /* @__PURE__ */ jsx(Loader2, { className: "h-4 w-4 animate-spin text-text-secondary" }) }) : contributors.length === 0 ? /* @__PURE__ */ jsx("div", { className: "text-center py-8 text-text-secondary text-sm border rounded-md border-dashed", children: "No collaborators yet." }) : /* @__PURE__ */ jsx(ScrollArea, { className: "h-[200px] border rounded-md", children: /* @__PURE__ */ jsx("div", { className: "divide-y", children: contributors.map((contributor) => {
              var _a;
              if (!contributor.user) return null;
              const isMe = currentUserId === contributor.user.id;
              return /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between p-3", children: [
                /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
                  /* @__PURE__ */ jsxs(Avatar, { className: "h-8 w-8", children: [
                    /* @__PURE__ */ jsx(AvatarImage, { src: contributor.user.avatar_url || void 0 }),
                    /* @__PURE__ */ jsx(AvatarFallback, { children: (_a = contributor.user.username) == null ? void 0 : _a.charAt(0) })
                  ] }),
                  /* @__PURE__ */ jsxs("span", { className: "text-sm font-medium", children: [
                    contributor.user.username,
                    isMe && /* @__PURE__ */ jsx("span", { className: "ml-2 text-xs text-text-secondary", children: "(You)" })
                  ] })
                ] }),
                isOwner && !isMe && /* @__PURE__ */ jsx(
                  Button,
                  {
                    variant: "ghost",
                    size: "icon",
                    className: "h-8 w-8 text-text-secondary hover:text-feedback-destructive",
                    onClick: () => handleRemoveContributor(contributor.user.id),
                    children: /* @__PURE__ */ jsx(Trash2, { className: "h-4 w-4" })
                  }
                ),
                isMe && !isOwner && /* @__PURE__ */ jsx(
                  Button,
                  {
                    variant: "ghost",
                    size: "icon",
                    className: "h-8 w-8 text-text-secondary hover:text-feedback-destructive",
                    onClick: handleLeaveCollection,
                    title: "Leave Collection",
                    children: /* @__PURE__ */ jsx(LogOut, { className: "h-4 w-4" })
                  }
                )
              ] }, contributor.user.id);
            }) }) })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "mt-auto pt-4 border-t", children: /* @__PURE__ */ jsx(SheetFooter, { children: canEdit ? /* @__PURE__ */ jsxs(Button, { onClick: handleSaveGeneral, disabled: saving, className: "w-full", children: [
        saving && /* @__PURE__ */ jsx(Loader2, { className: "mr-2 h-4 w-4 animate-spin" }),
        "Save Changes"
      ] }) : onSaveAll ? /* @__PURE__ */ jsxs(Button, { onClick: () => {
        onSaveAll();
        onOpenChange(false);
      }, className: "w-full", variant: "outline", children: [
        /* @__PURE__ */ jsx(Bookmark, { className: "w-4 h-4 mr-2" }),
        "Save All"
      ] }) : null }) })
    ] }),
    /* @__PURE__ */ jsx(AlertDialog, { open: showDeleteAlert, onOpenChange: setShowDeleteAlert, children: /* @__PURE__ */ jsxs(AlertDialogContent, { children: [
      /* @__PURE__ */ jsxs(AlertDialogHeader, { children: [
        /* @__PURE__ */ jsx(AlertDialogTitle, { children: "Are you absolutely sure?" }),
        /* @__PURE__ */ jsx(AlertDialogDescription, { children: "This action cannot be undone. This will permanently delete your collection and remove all buildings associated with it." })
      ] }),
      /* @__PURE__ */ jsxs(AlertDialogFooter, { children: [
        /* @__PURE__ */ jsx(AlertDialogCancel, { children: "Cancel" }),
        /* @__PURE__ */ jsx(
          AlertDialogAction,
          {
            onClick: handleDeleteCollection,
            className: "bg-feedback-destructive text-feedback-destructive-foreground hover:bg-feedback-destructive/90",
            disabled: deleting,
            children: deleting ? "Deleting..." : "Delete Collection"
          }
        )
      ] })
    ] }) }),
    showAddToFolder && currentUserId && /* @__PURE__ */ jsx(
      AddToFolderDialog,
      {
        open: showAddToFolder,
        onOpenChange: setShowAddToFolder,
        collectionId: collection.id,
        userId: currentUserId,
        onSuccess: fetchCollectionFolders
      }
    )
  ] });
}
export {
  CollectionSettingsDialog
};
