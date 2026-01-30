import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { useBuildingImages } from "@/hooks/useBuildingImages";
import { getBuildingImageUrl } from "@/utils/image";
import { ExternalLink, MapPin } from "lucide-react";
import { Link } from "react-router-dom";

interface BuildingDetailPanelProps {
  building: {
    id: string;
    name: string;
    city: string | null;
    country: string | null;
    slug: string;
    hero_image_url: string | null;
  };
}

export function BuildingDetailPanel({ building }: BuildingDetailPanelProps) {
  const { data: images } = useBuildingImages(building.id);

  const allImages = [];

  if (building.hero_image_url) {
    allImages.push({ id: 'hero', url: building.hero_image_url });
  }

  if (images) {
    images.forEach(img => {
       const url = getBuildingImageUrl(img.storage_path);
       if (url !== building.hero_image_url) {
         allImages.push({ id: img.id, url });
       }
    });
  }

  return (
    <div className="w-[400px] border-l h-full flex flex-col bg-background shrink-0">
      <div className="p-6 space-y-6 overflow-y-auto h-full">
        <div>
          <Link
            to={`/building/${building.slug}`}
            target="_blank"
            className="group flex items-start gap-2 hover:text-primary transition-colors"
          >
            <h2 className="text-xl font-semibold leading-tight">{building.name}</h2>
            <ExternalLink className="h-5 w-5 opacity-50 group-hover:opacity-100 shrink-0 mt-0.5" />
          </Link>
          <div className="flex items-center text-muted-foreground text-sm mt-2">
            <MapPin className="h-4 w-4 mr-1" />
            <span>
              {building.city && building.country
                ? `${building.city}, ${building.country}`
                : "Unknown location"}
            </span>
          </div>
        </div>

        {allImages.length > 0 ? (
          <Carousel className="w-full">
            <CarouselContent>
              {allImages.map((img) => (
                <CarouselItem key={img.id}>
                  <div className="aspect-square relative overflow-hidden rounded-md border bg-muted">
                    <img
                      src={img.url}
                      alt={building.name}
                      className="object-cover w-full h-full"
                    />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            {allImages.length > 1 && (
              <>
                <CarouselPrevious className="left-2" />
                <CarouselNext className="right-2" />
              </>
            )}
          </Carousel>
        ) : (
          <div className="aspect-square rounded-md border bg-muted flex items-center justify-center text-muted-foreground">
            No images available
          </div>
        )}
      </div>
    </div>
  );
}
