import { useParams, useNavigate, Link } from "react-router-dom";
import { useArchitect } from "@/hooks/useArchitect";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { MetaHead } from "@/components/common/MetaHead";
import { MapPin } from "lucide-react";

export default function ArchitectDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { architect, buildings, loading, error } = useArchitect(id);

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
        image={buildings[0]?.main_image_url || '/placeholder.png'}
      />
      <div className="px-4 py-6 md:px-6 space-y-8 animate-fade-in">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">{architect.name}</h1>
          <Badge variant="secondary" className="capitalize">
            {architect.type}
          </Badge>
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
                    {building.main_image_url ? (
                      <img
                        src={building.main_image_url}
                        alt={building.name}
                        className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
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
    </AppLayout>
  );
}
