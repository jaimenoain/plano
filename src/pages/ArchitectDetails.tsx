import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link, Navigate } from "react-router-dom";
import { useArchitect } from "@/hooks/useArchitect";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MetaHead } from "@/components/common/MetaHead";
import { MapPin, Globe, Edit, Map as MapIcon, BadgeCheck } from "lucide-react";
import { getBuildingImageUrl } from "@/utils/image";
import { supabase } from "@/integrations/supabase/client";
import { ClaimProfileDialog } from "@/components/architect/ClaimProfileDialog";

export default function ArchitectDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { architect, buildings, linkedUser, loading, error } = useArchitect(id);

  const [claimStatus, setClaimStatus] = useState<{
    is_verified: boolean;
    my_claim_status: string | null;
  }>({ is_verified: false, my_claim_status: null });
  const [claimDialogOpen, setClaimDialogOpen] = useState(false);

  const fetchClaimStatus = useCallback(async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase.rpc('get_architect_claim_status', {
        p_architect_id: id
      });
      if (error) throw error;
      if (data) {
        setClaimStatus(data as unknown as { is_verified: boolean; my_claim_status: string | null });
      }
    } catch (err) {
      console.error("Error fetching claim status:", err);
    }
  }, [id]);

  useEffect(() => {
    fetchClaimStatus();
  }, [fetchClaimStatus, user]);

  if (loading) {
    return (
      <AppLayout showBack>
        <div className="px-4 py-6 md:px-6 space-y-8">
          <div className="space-y-4">
            <Skeleton className="h-10 w-1/3" />
            <Skeleton className="h-6 w-20" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="overflow-hidden">
                <CardContent className="p-0">
                  <Skeleton className="aspect-[4/3] w-full rounded-none" />
                  <div className="p-4 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  // Redirect to user profile if linked
  if (linkedUser?.username) {
    return <Navigate to={`/profile/${linkedUser.username}`} replace />;
  }

  if (error || !architect) {
    return (
      <AppLayout showBack>
        <div className="px-4 py-6 md:px-6 flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
          <h1 className="text-2xl font-bold">Architect not found</h1>
          <p className="text-muted-foreground">
            The architect you are looking for does not exist or an error occurred.
          </p>
          <Button asChild variant="secondary">
             <Link to="/">Return to Home</Link>
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout showBack>
      <MetaHead
        title={architect.name}
      />
      <div className="px-4 py-6 md:py-10 max-w-7xl mx-auto animate-fade-in space-y-8">
        <div className="flex flex-col md:flex-row gap-6 md:gap-10 items-start md:items-center">

          {/* Avatar Section */}
          <div className="shrink-0 mx-auto md:mx-0">
            <Avatar className="h-24 w-24 md:h-40 md:w-40 border-2 border-border shadow-sm">
              <AvatarImage src={buildings[0]?.main_image_url ? getBuildingImageUrl(buildings[0].main_image_url) : undefined} className="object-cover" />
              <AvatarFallback className="text-3xl bg-secondary">{architect.name?.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
          </div>

          {/* Info Section */}
          <div className="flex-1 min-w-0 w-full">
            {/* Top Row: Name + Actions */}
            <div className="flex flex-col md:flex-row items-center md:items-start gap-4 mb-4 md:mb-6">
              <h1 className="text-xl md:text-2xl font-bold truncate min-w-0 max-w-[200px] md:max-w-none">
                <span className="flex items-center gap-2">
                  {architect.name}
                  {claimStatus.is_verified && (
                    <div className="inline-flex items-center text-foreground shrink-0" title="Verified Architect">
                      <BadgeCheck className="w-5 h-5 md:w-6 md:h-6" />
                    </div>
                  )}
                </span>
              </h1>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 w-full md:w-auto mt-2 md:mt-0">
                {user && !claimStatus.is_verified && claimStatus.my_claim_status !== 'pending' && (
                  <Button
                    variant="default"
                    size="sm"
                    className="h-8 px-5 font-semibold"
                    onClick={() => setClaimDialogOpen(true)}
                  >
                    Claim Profile
                  </Button>
                )}
                {user && claimStatus.my_claim_status === 'pending' && (
                  <Badge variant="secondary" className="h-8 px-4 font-medium">
                    Claim Pending
                  </Badge>
                )}
                {user && (
                  <Button variant="secondary" size="sm" asChild className="h-8">
                    <Link to={`/architect/${id}/edit`}>
                      Edit
                    </Link>
                  </Button>
                )}
                <Button variant="secondary" size="sm" asChild className="h-8">
                  <Link to={`/search?filters=${encodeURIComponent(JSON.stringify({ query: architect.name }))}`}>
                    <MapIcon className="h-4 w-4 md:mr-2" />
                    <span className="hidden md:inline">View on Map</span>
                  </Link>
                </Button>
                {architect.website_url && (
                  <Button variant="secondary" size="sm" asChild className="h-8">
                    <a
                      href={architect.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Globe className="h-4 w-4 md:mr-2" />
                      <span className="hidden md:inline">Website</span>
                    </a>
                  </Button>
                )}
              </div>
            </div>

            {/* Subtitle / Stats equivalent */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-6 gap-y-2 md:gap-10 mb-5 px-2 md:px-0 border-y md:border-none py-3 md:py-0 border-border/40 text-sm text-muted-foreground">
               <div className="flex items-center gap-1 group">
                 <span className="font-bold text-base md:text-md text-foreground group-hover:text-primary transition-colors">
                   {buildings.length}
                 </span>
                 <span className="text-xs md:text-sm text-muted-foreground capitalize">
                   edificios
                 </span>
               </div>
               <div className="flex items-center gap-1 group">
                 <span className="font-bold text-base md:text-md text-foreground group-hover:text-primary transition-colors capitalize">
                   {architect.type}
                 </span>
               </div>
               {architect.headquarters && (
                 <div className="flex items-center gap-1 group">
                   <MapPin className="h-4 w-4" />
                   <span className="text-xs md:text-sm text-muted-foreground">
                     {architect.headquarters}
                   </span>
                 </div>
               )}
            </div>

            {/* Bio */}
            <div className="text-center md:text-left px-2 md:px-0">
               {architect.bio && (
                 <p className="text-sm leading-relaxed whitespace-pre-wrap mb-2 text-muted-foreground line-clamp-3 md:line-clamp-none">
                   {architect.bio}
                 </p>
               )}
            </div>
          </div>
        </div>

        {buildings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-muted/30 rounded-lg border border-dashed">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <MapPin className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No designs listed yet</h3>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto">
              We haven't added any buildings for this architect yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {buildings.map((building) => (
              <Card
                key={building.id}
                className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow group"
                onClick={() => navigate(`/building/${building.id}`)}
              >
                <CardContent className="p-0">
                  <AspectRatio ratio={4 / 3}>
                    {getBuildingImageUrl(building.main_image_url) ? (
                      <img
                        src={getBuildingImageUrl(building.main_image_url)}
                        alt={building.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground">
                        No Image
                      </div>
                    )}
                  </AspectRatio>
                  <div className="p-4 space-y-1">
                    <h3 className="font-semibold text-lg line-clamp-1">{building.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {[building.city, building.country].filter(Boolean).join(", ")}
                    </p>
                    {building.year_completed && (
                        <p className="text-xs text-muted-foreground pt-1">
                            {building.year_completed}
                        </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <ClaimProfileDialog
        architectId={id || ""}
        architectName={architect.name}
        open={claimDialogOpen}
        onOpenChange={setClaimDialogOpen}
        onSuccess={fetchClaimStatus}
      />
    </AppLayout>
  );
}
