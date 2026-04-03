import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { s as supabase, O as getBuildingImageUrl, P as Carousel, Q as CarouselContent, U as CarouselItem, V as CarouselPrevious, W as CarouselNext, X as BuildingAttributes, Y as useUserBuildingStatuses, Z as Card, _ as cn, v as Badge, A as Avatar, a as AvatarImage, b as AvatarFallback, $ as getBuildingUrl, a0 as Skeleton, B as Button, a1 as useAuth, a2 as useDebounce, a3 as searchBuildingsRpc, M as parseLocation, D as Dialog, c as DialogContent, d as DialogHeader, e as DialogTitle, T as Tabs, n as TabsList, o as TabsTrigger, p as TabsContent, I as Input, S as ScrollArea, a4 as config, a5 as Command, a6 as CommandList, a7 as CommandGroup, a8 as CommandItem, a9 as CommandEmpty } from "./server-build-CoO-4tuU.js";
import { ExternalLink, MapPin, Circle, EyeOff, Building2, MapPinPlus, PlusCircle, Search, X, Check, Plus, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import usePlacesAutocomplete, { getGeocode, getLatLng } from "use-places-autocomplete";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import "clsx";
import "maplibre-gl";
import "react-error-boundary";
import { Command as Command$1 } from "cmdk";
import "@vercel/react-router/entry.server";
import "@radix-ui/react-tooltip";
import "tailwind-merge";
import "@radix-ui/react-toast";
import "class-variance-authority";
import "next-themes";
import "@supabase/supabase-js";
import "@radix-ui/react-slot";
import "vaul";
import "@sentry/react";
import "@supabase/ssr";
import "@radix-ui/react-separator";
import "@radix-ui/react-dialog";
import "@radix-ui/react-label";
import "@radix-ui/react-checkbox";
import "@radix-ui/react-avatar";
import "zod";
import "@radix-ui/react-scroll-area";
import "@radix-ui/react-alert-dialog";
import "@radix-ui/react-radio-group";
import "react-dom";
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
import "zustand";
import "@ffmpeg/ffmpeg";
import "@ffmpeg/util";
import "@radix-ui/react-aspect-ratio";
import "react-hook-form";
import "@hookform/resolvers/zod";
function useBuildingImages(buildingId, enabled = true) {
  return useQuery({
    queryKey: ["building_images", buildingId],
    queryFn: async () => {
      const { data, error } = await supabase.from("review_images").select(`
          id,
          storage_path,
          likes_count,
          created_at,
          user_buildings!review_images_review_id_fkey!inner(
            building_id,
            user:profiles(
              id,
              username,
              avatar_url,
              first_name,
              last_name
            )
          )
        `).eq("user_buildings.building_id", buildingId).order("likes_count", { ascending: false }).order("created_at", { ascending: false }).limit(10);
      if (error)
        throw error;
      return data;
    },
    enabled: !!buildingId && enabled,
    staleTime: 1e3 * 60 * 5
    // 5 minutes
  });
}
function BuildingDetailPanel({ building }) {
  const { data: images } = useBuildingImages(building.id);
  const allImages = [];
  if (building.hero_image_url) {
    allImages.push({ id: "hero", url: building.hero_image_url });
  }
  if (images) {
    images.forEach((img) => {
      const url = getBuildingImageUrl(img.storage_path);
      if (url !== building.hero_image_url) {
        allImages.push({ id: img.id, url });
      }
    });
  }
  return jsx("div", { className: "flex-1 border-l h-full flex flex-col bg-surface-default min-w-0", children: jsxs("div", { className: "p-6 space-y-6 overflow-y-auto h-full", children: [jsxs("div", { children: [jsxs(Link, { to: `/building/${building.slug || building.id}`, target: "_blank", className: "group flex items-start gap-2 hover:text-brand-primary transition-colors", children: [jsx("h2", { className: "text-xl font-semibold leading-tight", children: building.name }), jsx(ExternalLink, { className: "h-5 w-5 opacity-50 group-hover:opacity-100 shrink-0 mt-0.5" })] }), jsxs("div", { className: "flex items-center text-text-secondary text-sm mt-2", children: [jsx(MapPin, { className: "h-4 w-4 mr-1" }), jsx("span", { children: building.city && building.country ? `${building.city}, ${building.country}` : "Unknown location" })] })] }), allImages.length > 0 ? jsxs(Carousel, { className: "w-full", children: [jsx(CarouselContent, { children: allImages.map((img) => jsx(CarouselItem, { children: jsx(Link, { to: `/building/${building.slug || building.id}`, target: "_blank", className: "block aspect-square relative overflow-hidden rounded-md border bg-surface-muted group cursor-pointer", children: jsx("img", { src: img.url, alt: building.name, className: "object-cover w-full h-full transition-transform duration-300 group-hover:scale-105" }) }) }, img.id)) }), allImages.length > 1 && jsxs(Fragment, { children: [jsx(CarouselPrevious, { className: "left-2" }), jsx(CarouselNext, { className: "right-2" })] })] }) : jsx("div", { className: "aspect-square rounded-md border bg-surface-muted flex items-center justify-center text-text-secondary", children: "No images available" }), jsx(BuildingAttributes, { building, className: "grid-cols-2" })] }) });
}
function DiscoveryBuildingCard({ building, socialContext: _socialContext, distance: _distance, action, onClick, imagePosition = "right", target }) {
  var _a, _b;
  const imageUrl = getBuildingImageUrl(building.main_image_url);
  const { statuses, ratings } = useUserBuildingStatuses();
  const userStatus = statuses[building.id];
  const userRating = ratings[building.id];
  const isHidden = userStatus === "ignored";
  const ImageComponent = imageUrl && jsx("div", { className: "relative w-32 shrink-0 aspect-[4/3] overflow-hidden", children: jsx("img", { src: imageUrl, alt: building.name, className: "absolute inset-0 w-full h-full object-cover", loading: "lazy" }) });
  const actionPositionClass = imagePosition === "left" ? "bottom-2 right-2" : "top-2 right-2";
  const Content = jsxs(Card, { className: "overflow-hidden shadow-none transition-shadow group relative min-w-0", children: [action && jsx("div", { className: cn("absolute z-10", actionPositionClass), onClick: (e) => {
    e.preventDefault();
    e.stopPropagation();
  }, children: action }), jsxs("div", { className: "flex flex-row", children: [imagePosition === "left" && ImageComponent, jsxs("div", { className: "flex flex-col flex-1 p-3 justify-center min-w-0", children: [jsxs("div", { className: "flex flex-col pr-6", children: [jsx("h3", { className: "font-semibold text-base leading-tight line-clamp-2 group-hover:text-brand-primary transition-colors", children: building.name }), building.alt_name && building.alt_name !== building.name && jsx("span", { className: "text-xs text-text-secondary line-clamp-1 italic", children: building.alt_name })] }), jsxs("div", { className: cn("text-xs text-text-secondary mt-1", imageUrl ? "line-clamp-2" : "line-clamp-1"), children: [building.city && jsxs(Fragment, { children: [jsx("span", { children: building.city }), jsx("span", { children: " • " })] }), jsx("span", { children: ((_b = (_a = building.architects) == null ? void 0 : _a[0]) == null ? void 0 : _b.name) || "Unknown Architect" }), building.year_completed && jsxs(Fragment, { children: [jsx("span", { children: " • " }), jsx("span", { children: building.year_completed })] })] }), jsxs("div", { className: "flex flex-wrap gap-2 mt-2", children: [(userStatus === "visited" || userStatus === "pending") && jsxs(Badge, { variant: "secondary", className: "flex items-center gap-1 font-normal text-xs px-2 py-0.5 h-auto bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20 border-brand-primary/20 border max-w-full truncate", children: [userStatus === "visited" ? "Visited" : "Saved", userRating && userRating > 0 && jsx("div", { className: "flex gap-0.5 ml-1", children: Array.from({ length: userRating }).map((_, i) => jsx(Circle, { className: "w-2 h-2 fill-current" }, i)) })] }), (building.status === "Lost" || building.status === "Unbuilt") && jsx(Badge, { variant: "outline", className: "flex items-center gap-1 font-normal text-xs px-2 py-0.5 h-auto text-text-secondary border-text-secondary/30 max-w-full truncate", children: building.status }), isHidden && jsxs(Badge, { variant: "outline", className: "flex items-center gap-1 font-normal text-xs px-2 py-0.5 h-auto text-text-secondary border-dashed max-w-full truncate", children: [jsx(EyeOff, { className: "h-3 w-3" }), "Hidden"] })] }), building.contact_interactions && building.contact_interactions.length > 0 && (() => {
    const sortedInteractions = [...building.contact_interactions].sort((a, b) => {
      const aHasAvatar = !!a.user.avatar_url;
      const bHasAvatar = !!b.user.avatar_url;
      if (aHasAvatar && !bHasAvatar)
        return -1;
      if (!aHasAvatar && bHasAvatar)
        return 1;
      return 0;
    });
    return jsxs("div", { className: "flex items-center gap-2 mt-2 min-w-0", children: [jsx("div", { className: "flex -space-x-2 shrink-0", children: sortedInteractions.slice(0, 3).map((interaction) => {
      var _a2, _b2;
      return jsxs(Avatar, { className: "w-5 h-5 border border-surface-default", children: [jsx(AvatarImage, { src: interaction.user.avatar_url || void 0 }), jsx(AvatarFallback, { className: "text-[8px]", children: ((_a2 = interaction.user.username) == null ? void 0 : _a2[0]) || ((_b2 = interaction.user.first_name) == null ? void 0 : _b2[0]) || "?" })] }, interaction.user.id);
    }) }), jsx("span", { className: "text-xs text-text-secondary truncate", children: getInteractionText(sortedInteractions) })] });
  })()] }), imagePosition === "right" && ImageComponent] })] });
  if (onClick) {
    return jsx("div", { onClick, className: "block cursor-pointer", children: Content });
  }
  return jsx(Link, { to: getBuildingUrl(building.id, building.slug, building.short_id), className: "block", target, children: Content });
}
function getInteractionText(interactions) {
  if (interactions.length === 0)
    return "";
  const getAction = (i) => {
    const hasRating = i.rating !== null && i.rating > 0;
    const isSaved = i.status === "pending";
    const isVisited = i.status === "visited";
    if (hasRating && isSaved)
      return "Prioritised";
    if (hasRating)
      return "Recommended";
    if (isSaved)
      return "Saved";
    if (isVisited)
      return "Visited";
    return "Interacted";
  };
  if (interactions.length === 1) {
    const i = interactions[0];
    const name = i.user.username || i.user.first_name || "Friend";
    const action = getAction(i);
    return `${action} by ${name}`;
  }
  const actions = interactions.map(getAction);
  const uniqueActions = Array.from(new Set(actions));
  if (uniqueActions.length === 1) {
    const action = uniqueActions[0];
    const firstUser = interactions[0].user.username || interactions[0].user.first_name || "Friend";
    return `${action} by ${firstUser} +${interactions.length - 1}`;
  }
  const priority = {
    "Prioritised": 4,
    "Recommended": 3,
    "Saved": 2,
    "Visited": 1,
    "Interacted": 0
  };
  const sortedActions = uniqueActions.sort((a, b) => (priority[b] || 0) - (priority[a] || 0));
  return sortedActions.slice(0, 2).join(" and ");
}
function DiscoveryList({ buildings, isLoading, currentLocation, renderAction, onBuildingClick, emptyState, className, imagePosition, itemTarget, searchQuery, footer }) {
  if (isLoading) {
    return jsx("div", { className: "space-y-4 p-4", children: [...Array(5)].map((_, i) => jsxs("div", { className: "flex flex-row h-auto overflow-hidden rounded-sm border border-border-default bg-surface-card text-text-primary shadow-none", children: [jsx(Skeleton, { className: "w-32 h-32 shrink-0 rounded-none" }), jsxs("div", { className: "flex-1 p-4 space-y-2", children: [jsx(Skeleton, { className: "h-5 w-3/4" }), jsx(Skeleton, { className: "h-3 w-1/2" }), jsxs("div", { className: "flex gap-2 pt-2", children: [jsx(Skeleton, { className: "h-4 w-16" }), jsx(Skeleton, { className: "h-4 w-20" })] })] })] }, i)) });
  }
  if (buildings.length === 0) {
    if (emptyState) {
      return jsx(Fragment, { children: emptyState });
    }
    return jsxs("div", { className: "flex flex-col items-center justify-center py-12 px-4 text-center h-full min-h-[50vh]", children: [jsx("div", { className: "bg-surface-muted rounded-full p-4 mb-4", children: jsx(Building2, { className: "h-10 w-10 text-text-secondary" }) }), jsx("h3", { className: "text-lg font-semibold", children: "No buildings found here yet" }), jsx("p", { className: "text-text-secondary max-w-sm mt-1 mb-6", children: "Be the first to map this area." }), currentLocation && jsx(Button, { asChild: true, children: jsxs(Link, { to: `/add-building?lat=${currentLocation.lat}&lng=${currentLocation.lng}`, children: [jsx(MapPinPlus, { className: "mr-2 h-4 w-4" }), "Add Building Here"] }) })] });
  }
  return jsxs("div", { className: cn("space-y-4 p-4 pb-20 md:pb-4", className), children: [buildings.map((building) => jsx(DiscoveryBuildingCard, { building, distance: building.distance, socialContext: building.social_context ?? void 0, action: renderAction == null ? void 0 : renderAction(building), onClick: onBuildingClick ? () => onBuildingClick(building) : void 0, imagePosition, target: itemTarget }, building.id)), footer, searchQuery && !footer && jsxs("div", { className: "flex flex-col items-center justify-center py-8 gap-3 border-t mt-4", children: [jsx("h3", { className: "text-sm font-medium text-text-secondary", children: "Not what you are looking for?" }), jsx(Button, { asChild: true, variant: "outline", children: jsxs(Link, { to: `/add-building?name=${encodeURIComponent(searchQuery)}${currentLocation ? `&lat=${currentLocation.lat}&lng=${currentLocation.lng}` : ""}`, children: [jsx(MapPinPlus, { className: "mr-2 h-4 w-4" }), 'Add "', searchQuery, '"'] }) })] })] });
}
const mapGoogleTypeToCategory = (types = []) => {
  if (types.some((t) => ["restaurant", "cafe", "bar", "bakery", "meal_takeaway", "meal_delivery", "food"].includes(t))) {
    return "dining";
  }
  if (types.some((t) => ["lodging", "hotel", "motel", "hostel", "guesthouse"].includes(t))) {
    return "accommodation";
  }
  if (types.some((t) => ["transit_station", "subway_station", "bus_station", "train_station", "airport", "taxi_stand", "light_rail_station"].includes(t))) {
    return "transport";
  }
  if (types.some((t) => ["museum", "park", "tourist_attraction", "point_of_interest", "art_gallery", "amusement_park", "aquarium", "zoo"].includes(t))) {
    return "attraction";
  }
  return "other";
};
function OtherMarkersSearch({ collectionId, userId }) {
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  useEffect(() => {
    const initMap = async () => {
      var _a, _b;
      if ((_b = (_a = window.google) == null ? void 0 : _a.maps) == null ? void 0 : _b.places) {
        setScriptLoaded(true);
        return;
      }
      const apiKey = config.googleMaps.apiKey;
      if (!apiKey) {
        setHasError(true);
        return;
      }
      try {
        setOptions({
          key: apiKey
        });
        await importLibrary("places");
        await importLibrary("geocoding");
        setScriptLoaded(true);
      } catch (_error) {
        setHasError(true);
      }
    };
    initMap();
  }, []);
  if (hasError) {
    return jsx("div", { className: "p-4 text-center text-red-500", children: "Error loading Google Maps. Please try again later." });
  }
  if (!scriptLoaded) {
    return jsx("div", { className: "flex items-center justify-center p-8", children: jsx(Loader2, { className: "h-6 w-6 animate-spin text-text-secondary" }) });
  }
  return jsx(PlacesAutocomplete, { collectionId, userId });
}
function PlacesAutocomplete({ collectionId, userId }) {
  const { ready, value, setValue, suggestions: { status, data }, clearSuggestions } = usePlacesAutocomplete({
    debounce: 300,
    initOnMount: true
  });
  const queryClient = useQueryClient();
  const handleSelect = async (address, placeId, mainText) => {
    setValue(address, false);
    clearSuggestions();
    try {
      const results = await getGeocode({ placeId });
      const { lat, lng } = getLatLng(results[0]);
      const types = results[0].types;
      const category = mapGoogleTypeToCategory(types);
      const { error } = await supabase.from("collection_markers").insert({
        collection_id: collectionId,
        google_place_id: placeId,
        name: mainText,
        category,
        lat,
        lng,
        address,
        created_by: userId
      });
      if (error)
        throw error;
      toast.success("Marker added to collection");
      setValue("", false);
      queryClient.invalidateQueries({ queryKey: ["collection_items", collectionId] });
    } catch (_error) {
      toast.error("Failed to add marker");
    }
  };
  return jsxs(Command, { shouldFilter: false, className: "h-full flex flex-col overflow-hidden bg-transparent", children: [jsx("div", { className: "p-4 border-b shrink-0", children: jsxs("div", { className: "relative", children: [jsx(MapPin, { className: "absolute left-3 top-3 h-4 w-4 text-text-secondary z-10" }), jsx(Command$1.Input, { value, onValueChange: (val) => {
    setValue(val);
  }, disabled: !ready, placeholder: "Search for a place (e.g. 'Central Station')...", autoComplete: "off", className: cn("flex h-10 w-full rounded-md border-none bg-transparent pl-9 pr-3 py-2 text-sm outline-none placeholder:text-text-secondary disabled:cursor-not-allowed disabled:opacity-50") })] }) }), jsx("div", { className: "flex-1 overflow-y-auto", children: status === "OK" || status === "ZERO_RESULTS" ? jsxs(CommandList, { className: "max-h-full overflow-visible p-2", children: [jsx(CommandGroup, { heading: "Suggestions", children: status === "OK" && data.map(({ place_id, description, structured_formatting }) => jsxs(CommandItem, { value: description, onSelect: () => handleSelect(description, place_id, (structured_formatting == null ? void 0 : structured_formatting.main_text) || description), className: "cursor-pointer", children: [jsx(MapPin, { className: "mr-2 h-4 w-4 shrink-0" }), jsx("span", { children: description })] }, place_id)) }), status === "ZERO_RESULTS" && jsx(CommandEmpty, { children: "No results found." })] }) : jsxs("div", { className: "flex flex-col items-center justify-center h-full text-text-secondary p-8 text-center", children: [jsx("p", { children: "Search for real-world locations like restaurants, hotels, or transit stations to add them to your collection map." }), jsx("p", { className: "mt-2", children: "Selected locations are saved immediately." })] }) })] });
}
function AddBuildingsToCollectionDialog({ collectionId, existingBuildingIds, existingBuildings, hiddenBuildingIds, open, onOpenChange }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [selectedBuildingId, setSelectedBuildingId] = useState(null);
  const { data: buildings, isLoading } = useQuery({
    queryKey: ["add-buildings-dialog", user == null ? void 0 : user.id, debouncedSearchQuery],
    queryFn: async () => {
      if (!user)
        return [];
      if (debouncedSearchQuery && debouncedSearchQuery.trim().length > 0) {
        const results = await searchBuildingsRpc({
          query_text: debouncedSearchQuery,
          p_limit: 50
        });
        return results.map((b) => ({
          ...b,
          main_image_url: b.main_image_url ? getBuildingImageUrl(b.main_image_url) : null
        }));
      }
      const { data, error } = await supabase.from("user_buildings").select(`
          building_id,
          status,
          rating,
          building:buildings (
            id,
            name,
            city,
            country,
            address,
            slug,
            location,
            hero_image_url,
            year_completed,
            building_architects(architect:architects(id, name))
          )
        `).eq("user_id", user.id).neq("status", "ignored").returns();
      if (error)
        throw error;
      const buildings2 = data.filter((item) => item.building).map((item) => {
        var _a;
        const b = item.building;
        const location = parseLocation(b.location);
        return {
          ...b,
          rating: item.rating,
          main_image_url: b.hero_image_url ? getBuildingImageUrl(b.hero_image_url) : null,
          architects: ((_a = b.building_architects) == null ? void 0 : _a.map((ba) => ba.architect).filter(Boolean)) || [],
          location_lat: (location == null ? void 0 : location.lat) || 0,
          location_lng: (location == null ? void 0 : location.lng) || 0,
          styles: []
        };
      });
      const buildingsWithoutImages = buildings2.filter((b) => !b.main_image_url);
      const buildingIdsWithoutImages = buildingsWithoutImages.map((b) => b.id);
      if (buildingIdsWithoutImages.length > 0) {
        const { data: imagesData } = await supabase.from("review_images").select("storage_path, user_buildings!inner(building_id)").in("user_buildings.building_id", buildingIdsWithoutImages).limit(50);
        if (imagesData) {
          const imageMap = /* @__PURE__ */ new Map();
          imagesData.forEach((img) => {
            var _a;
            if (!img.user_buildings)
              return;
            const bId = Array.isArray(img.user_buildings) ? (_a = img.user_buildings[0]) == null ? void 0 : _a.building_id : img.user_buildings.building_id;
            if (bId && !imageMap.has(bId)) {
              imageMap.set(bId, img.storage_path);
            }
          });
          buildings2.forEach((b) => {
            if (!b.main_image_url && imageMap.has(b.id)) {
              b.main_image_url = getBuildingImageUrl(imageMap.get(b.id));
            }
          });
        }
      }
      return buildings2;
    },
    enabled: !!user && open
  });
  const filteredBuildings = useMemo(() => {
    if (!buildings)
      return [];
    let result = [...buildings];
    if (hiddenBuildingIds && hiddenBuildingIds.size > 0) {
      result = result.filter((b) => !hiddenBuildingIds.has(b.id));
    }
    if (!debouncedSearchQuery && existingBuildings && existingBuildings.length > 0) {
      const validExisting = existingBuildings.filter((b) => b.location_lat !== 0 || b.location_lng !== 0);
      if (validExisting.length > 0) {
        const sum = validExisting.reduce((acc, b) => ({ lat: acc.lat + b.location_lat, lng: acc.lng + b.location_lng }), { lat: 0, lng: 0 });
        const centroid = { lat: sum.lat / validExisting.length, lng: sum.lng / validExisting.length };
        result.sort((a, b) => {
          if (a.location_lat === 0 && a.location_lng === 0)
            return 1;
          if (b.location_lat === 0 && b.location_lng === 0)
            return -1;
          const distA = Math.pow(a.location_lat - centroid.lat, 2) + Math.pow(a.location_lng - centroid.lng, 2);
          const distB = Math.pow(b.location_lat - centroid.lat, 2) + Math.pow(b.location_lng - centroid.lng, 2);
          return distA - distB;
        });
      }
    }
    return result;
  }, [buildings, hiddenBuildingIds, existingBuildings, debouncedSearchQuery]);
  const hideMutation = useMutation({
    mutationFn: async (buildingId) => {
      const { error } = await supabase.from("collection_items").insert({
        collection_id: collectionId,
        building_id: buildingId,
        is_hidden: true
      });
      if (error)
        throw error;
    },
    onSuccess: () => {
      toast.success("Building hidden from suggestions");
      queryClient.invalidateQueries({ queryKey: ["collection_items", collectionId] });
    },
    onError: (_error) => {
      toast.error("Failed to hide building");
    }
  });
  const addMutation = useMutation({
    mutationFn: async (buildingId) => {
      var _a;
      const { data: maxOrderData, error: maxOrderError } = await supabase.from("collection_items").select("order_index").eq("collection_id", collectionId).order("order_index", { ascending: false }).limit(1);
      if (maxOrderError)
        throw maxOrderError;
      const currentMax = ((_a = maxOrderData == null ? void 0 : maxOrderData[0]) == null ? void 0 : _a.order_index) ?? -1;
      const nextOrderIndex = currentMax + 1;
      const { error } = await supabase.from("collection_items").insert({
        collection_id: collectionId,
        building_id: buildingId,
        order_index: nextOrderIndex
      });
      if (error)
        throw error;
    },
    onSuccess: () => {
      toast.success("Building added to collection");
      queryClient.invalidateQueries({ queryKey: ["collection_items", collectionId] });
    },
    onError: (_error) => {
      toast.error("Failed to add building");
    }
  });
  const selectedBuilding = useMemo(() => {
    if (!selectedBuildingId || !buildings)
      return null;
    return buildings.find((b) => b.id === selectedBuildingId);
  }, [selectedBuildingId, buildings]);
  const searchFooter = searchQuery ? jsxs("div", { className: "flex flex-col items-center justify-center py-8 gap-4 border-t mt-4", children: [jsx("p", { className: "text-center text-text-secondary", children: "Not finding what you are looking for?" }), jsxs(Button, { variant: "outline", size: "sm", onClick: () => navigate(`/add-building?name=${encodeURIComponent(searchQuery)}`), className: "gap-2", children: [jsx(PlusCircle, { className: "h-4 w-4" }), "Create new building"] })] }) : null;
  return jsx(Dialog, { open, onOpenChange, children: jsxs(DialogContent, { className: "max-w-5xl h-[80vh] flex flex-col p-0 gap-0 overflow-hidden", children: [jsx(DialogHeader, { className: "p-4 pb-2 shrink-0 border-b", children: jsx(DialogTitle, { children: "Add to Collection" }) }), jsxs(Tabs, { defaultValue: "architecture", className: "flex flex-col flex-1 h-full min-h-0 overflow-hidden", children: [jsx("div", { className: "px-4 border-b", children: jsxs(TabsList, { className: "justify-start w-full h-12 p-0 bg-transparent rounded-none", children: [jsx(TabsTrigger, { value: "architecture", className: "relative h-12 rounded-none border-b-2 border-b-transparent bg-transparent px-4 pb-3 pt-2 font-semibold text-text-secondary shadow-none transition-none data-[state=active]:border-b-primary data-[state=active]:text-text-primary data-[state=active]:shadow-none", children: "Architecture" }), jsx(TabsTrigger, { value: "other-markers", className: "relative h-12 rounded-none border-b-2 border-b-transparent bg-transparent px-4 pb-3 pt-2 font-semibold text-text-secondary shadow-none transition-none data-[state=active]:border-b-primary data-[state=active]:text-text-primary data-[state=active]:shadow-none", children: "Other Markers" })] }) }), jsxs(TabsContent, { value: "architecture", className: "flex flex-1 h-full min-h-0 m-0 mt-0 border-none p-0 data-[state=inactive]:hidden", children: [jsxs("div", { className: "w-[350px] shrink-0 flex flex-col border-r", children: [jsx("div", { className: "p-4 pb-2 border-b space-y-2", children: jsxs("div", { className: "relative", children: [jsx(Search, { className: "absolute left-2.5 top-2.5 h-4 w-4 text-text-secondary" }), jsx(Input, { placeholder: "Search by name, city, country, or address...", value: searchQuery, onChange: (e) => setSearchQuery(e.target.value), className: "pl-9" })] }) }), jsx(ScrollArea, { className: "flex-1", children: jsx(DiscoveryList, { buildings: filteredBuildings, isLoading, className: "p-2", emptyState: jsxs("div", { className: "flex flex-col items-center justify-center py-8 gap-4", children: [jsx("p", { className: "text-center text-text-secondary", children: searchQuery ? "No buildings found matching your search." : "No saved buildings found." }), searchQuery && jsxs(Button, { variant: "outline", size: "sm", onClick: () => navigate(`/add-building?name=${encodeURIComponent(searchQuery)}`), className: "gap-2", children: [jsx(PlusCircle, { className: "h-4 w-4" }), "Create new building"] })] }), onBuildingClick: (building) => setSelectedBuildingId(building.id), imagePosition: "left", footer: searchFooter, renderAction: (building) => {
    const isAdded = existingBuildingIds.has(building.id);
    return jsxs("div", { className: "flex items-center gap-1", children: [!isAdded && jsx(Button, { size: "sm", variant: "ghost", className: "h-8 w-8 p-0 shrink-0 text-text-secondary hover:text-text-primary hover:bg-surface-muted", title: "Hide suggestion", disabled: hideMutation.isPending || addMutation.isPending, onClick: (e) => {
      e.stopPropagation();
      hideMutation.mutate(building.id);
    }, children: jsx(X, { className: "h-4 w-4" }) }), jsx(Button, { size: "sm", variant: isAdded ? "secondary" : "default", className: "h-8 w-8 p-0 shrink-0 shadow-sm", disabled: isAdded || addMutation.isPending || hideMutation.isPending, onClick: (e) => {
      e.stopPropagation();
      addMutation.mutate(building.id);
    }, children: isAdded ? jsx(Check, { className: "h-4 w-4" }) : jsx(Plus, { className: "h-4 w-4" }) })] });
  } }) })] }), selectedBuilding ? jsx(BuildingDetailPanel, { building: {
    ...selectedBuilding,
    slug: selectedBuilding.slug ?? selectedBuilding.id,
    hero_image_url: selectedBuilding.main_image_url ?? null
  } }) : jsx("div", { className: "flex-1 border-l hidden lg:flex items-center justify-center text-text-secondary bg-surface-muted/10", children: "Select a building to view details" })] }), jsx(TabsContent, { value: "other-markers", className: "flex-1 p-0 m-0 mt-0 border-none data-[state=inactive]:hidden", children: user && jsx(OtherMarkersSearch, { collectionId, userId: user.id }) })] })] }) });
}
export {
  AddBuildingsToCollectionDialog
};
