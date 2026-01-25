import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminBuilding } from "@/types/admin_building";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BuildingForm, BuildingFormData } from "@/components/BuildingForm";
import { BuildingLocationPicker } from "@/components/BuildingLocationPicker";
import { Loader2, MapPin, Pencil, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { parseLocation } from "@/utils/location";

export default function Buildings() {
  const [buildings, setBuildings] = useState<AdminBuilding[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "verified" | "deleted" | "pending">("all");

  // Edit State
  const [editingBuilding, setEditingBuilding] = useState<AdminBuilding | null>(null);
  const [locationData, setLocationData] = useState<{
    lat: number | null;
    lng: number | null;
    address: string;
    city: string | null;
    country: string | null;
    precision: 'exact' | 'approximate';
  } | null>(null);

  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    fetchBuildings();
  }, [page, searchQuery, statusFilter]);

  const fetchBuildings = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("buildings")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      if (searchQuery) {
        query = query.ilike("name", `%${searchQuery}%`);
      }

      if (statusFilter === "verified") {
        query = query.eq("is_verified", true);
      } else if (statusFilter === "deleted") {
        query = query.eq("is_deleted", true);
      } else if (statusFilter === "pending") {
        query = query.eq("is_verified", false).eq("is_deleted", false);
      }

      const from = (page - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      const { data, count, error } = await query.range(from, to);

      if (error) throw error;

      setBuildings((data as unknown as AdminBuilding[]) || []);
      if (count) {
        setTotalPages(Math.ceil(count / ITEMS_PER_PAGE));
      }
    } catch (error) {
      console.error("Error fetching buildings:", error);
      toast.error("Failed to load buildings");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("buildings")
        .update({ is_verified: !currentStatus })
        .eq("id", id);

      if (error) throw error;

      setBuildings(prev => prev.map(b =>
        b.id === id ? { ...b, is_verified: !currentStatus } : b
      ));
      toast.success(currentStatus ? "Building un-verified" : "Building verified");
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const handleSoftDelete = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("buildings")
        .update({ is_deleted: !currentStatus })
        .eq("id", id);

      if (error) throw error;

      setBuildings(prev => prev.map(b =>
        b.id === id ? { ...b, is_deleted: !currentStatus } : b
      ));
      toast.success(currentStatus ? "Building restored" : "Building soft-deleted");
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const openEditDialog = (building: AdminBuilding) => {
    // Parse location
    const coords = parseLocation(building.location);
    const lat = coords ? coords.lat : null;
    const lng = coords ? coords.lng : null;

    setLocationData({
        lat,
        lng,
        address: building.address || "",
        city: building.city,
        country: building.country,
        // @ts-ignore
        precision: building.location_precision || 'exact'
    });
    setEditingBuilding(building);
  };

  const handleSaveBuilding = async (formData: BuildingFormData) => {
    if (!editingBuilding || !locationData) return;

    if (locationData.lat === null || locationData.lng === null) {
        toast.error("Please set location on the map tab");
        return;
    }

    try {
      const { error } = await supabase
        .from('buildings')
        .update({
          name: formData.name,
          year_completed: formData.year_completed,
          architects: formData.architects,
          // @ts-ignore
          functional_category_id: formData.functional_category_id,
          // @ts-ignore
          functional_typology_ids: formData.functional_typology_ids,
          // @ts-ignore
          selected_attribute_ids: formData.selected_attribute_ids,
          main_image_url: formData.main_image_url,

          address: locationData.address,
          city: locationData.city,
          country: locationData.country,
          location: `POINT(${locationData.lng} ${locationData.lat})` as unknown,
          // @ts-ignore
          location_precision: locationData.precision,

          // Implicitly verified if edited by admin? Maybe optional.
          // Let's keep existing status unless changed.
        })
        .eq('id', editingBuilding.id);

      if (error) throw error;

      toast.success("Building updated");
      setEditingBuilding(null);
      fetchBuildings(); // Refresh list
    } catch (error) {
      console.error(error);
      toast.error("Failed to update building");
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Building Registry</h1>
        <div className="flex gap-2">
            <Input
                placeholder="Search buildings..."
                className="max-w-xs"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Select
                value={statusFilter}
                onValueChange={(val: any) => setStatusFilter(val)}
            >
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="verified">Verified</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="deleted">Deleted</SelectItem>
                </SelectContent>
            </Select>
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
                <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                        <div className="flex justify-center items-center">
                            <Loader2 className="h-6 w-6 animate-spin mr-2" />
                            Loading...
                        </div>
                    </TableCell>
                </TableRow>
            ) : buildings.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                        No buildings found.
                    </TableCell>
                </TableRow>
            ) : (
                buildings.map((building) => (
                    <TableRow key={building.id} className={building.is_deleted ? "opacity-60 bg-muted/50" : ""}>
                        <TableCell className="font-medium">
                            {building.name}
                            {building.year_completed && <span className="text-muted-foreground font-normal ml-2">({building.year_completed})</span>}
                        </TableCell>
                        <TableCell>
                            {building.city && building.country ? `${building.city}, ${building.country}` : building.address || "Unknown"}
                        </TableCell>
                        <TableCell>
                            <div className="flex gap-2">
                                {building.is_verified && <Badge variant="default" className="bg-green-600 hover:bg-green-700">Verified</Badge>}
                                {building.is_deleted && <Badge variant="destructive">Deleted</Badge>}
                                {!building.is_verified && !building.is_deleted && <Badge variant="secondary">Pending</Badge>}
                            </div>
                        </TableCell>
                        <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                                <Button size="icon" variant="ghost" title="Locate on Map" onClick={() => openEditDialog(building)}>
                                    <MapPin className="h-4 w-4" />
                                </Button>
                                <Button size="icon" variant="ghost" title="Edit Details" onClick={() => openEditDialog(building)}>
                                    <Pencil className="h-4 w-4" />
                                </Button>
                                <div className="h-8 w-px bg-border mx-1" />
                                <Switch
                                    checked={building.is_verified}
                                    onCheckedChange={() => handleVerify(building.id, building.is_verified)}
                                    className="data-[state=checked]:bg-green-600"
                                    title="Toggle Verification"
                                />
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className={building.is_deleted ? "text-green-600" : "text-destructive"}
                                    onClick={() => handleSoftDelete(building.id, building.is_deleted)}
                                    title={building.is_deleted ? "Restore" : "Soft Delete"}
                                >
                                    {building.is_deleted ? <CheckCircle2 className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                                </Button>
                            </div>
                        </TableCell>
                    </TableRow>
                ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-center gap-2">
         <Button
            variant="outline"
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
         >
            Previous
         </Button>
         <Button
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
         >
            Next
         </Button>
      </div>

      <Dialog open={!!editingBuilding} onOpenChange={(open) => !open && setEditingBuilding(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle>Edit Building: {editingBuilding?.name}</DialogTitle>
            </DialogHeader>

            {editingBuilding && locationData && (
                <Tabs defaultValue="details">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="details">Details</TabsTrigger>
                        <TabsTrigger value="location">Location & Map</TabsTrigger>
                    </TabsList>

                    <TabsContent value="details" className="mt-4">
                        <BuildingForm
                            initialValues={{
                                name: editingBuilding.name,
                                year_completed: editingBuilding.year_completed,
                                architects: editingBuilding.architects || [],
                                functional_category_id: (editingBuilding as any).functional_category_id || "",
                                functional_typology_ids: (editingBuilding as any).functional_typology_ids || [],
                                selected_attribute_ids: (editingBuilding as any).selected_attribute_ids || [],
                                main_image_url: editingBuilding.main_image_url
                            }}
                            onSubmit={handleSaveBuilding}
                            isSubmitting={false}
                            submitLabel="Save Changes"
                        />
                    </TabsContent>

                    <TabsContent value="location" className="mt-4">
                        <div className="mb-4 p-4 border rounded-md bg-yellow-50 text-yellow-800 text-sm">
                            Adjust the location below. When finished, go back to the <strong>Details</strong> tab to click "Save Changes".
                        </div>
                        <BuildingLocationPicker
                            initialLocation={{
                                lat: locationData.lat,
                                lng: locationData.lng,
                                address: locationData.address,
                                city: locationData.city,
                                country: locationData.country
                            }}
                            initialPrecision={locationData.precision}
                            onLocationChange={(newLoc) => setLocationData(newLoc)}
                        />
                    </TabsContent>
                </Tabs>
            )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
