import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { useBuildingImages } from "@/features/buildings";
import { getBuildingImageUrl } from "@/utils/image";
import { ExternalLink, MapPin } from "lucide-react";
import { getBuildingUrl } from "@/utils/url";
import { Link } from "react-router";
import { BuildingAttributes } from "@/features/buildings/components/BuildingAttributes";

interface BuildingDetailPanelProps {
  building: {
    id: string;
    name: string;
    city: string | null;
    country: string | null;
    slug: string;
    hero_image_url: string | null;
    typology?: string[] | null;
    materials?: string[] | null;
    status?: string | null;
    styles?: string[] | { name: string }[] | null;
    context?: string | null;
    intervention?: string | null;
    category?: string | null;
    year_completed?: number | null;
  };
}

export function BuildingDetailPanel({ building }: BuildingDetailPanelProps) {
  const { data: images } = useBuildingImages(building.id);

  const allImages: { id: string; url: string }[] = [];

  const heroResolved = getBuildingImageUrl(building.hero_image_url);
  if (heroResolved) {
    allImages.push({ id: "hero", url: heroResolved });
  }

  if (images) {
    images.forEach((img) => {
      const url = getBuildingImageUrl(img.storage_path);
      if (url && url !== heroResolved) {
        allImages.push({ id: img.id, url });
      }
    });
  }

  return (
    <div className="flex-1 h-full flex flex-col bg-surface-card min-w-0">
      <div className="p-6 space-y-6 overflow-y-auto h-full">
        <div>
          <Link
            to={getBuildingUrl(building.id, building.slug)}
            target="_blank"
            className="group flex items-start gap-2 hover:text-brand-primary transition-colors"
          >
            <h2 className="text-xl font-semibold leading-tight">{building.name}</h2>
            <ExternalLink className="h-5 w-5 opacity-50 group-hover:opacity-100 shrink-0 mt-0.5" />
          </Link>
          <div className="flex items-center text-text-secondary text-sm mt-2">
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
                  <Link
                    to={getBuildingUrl(building.id, building.slug)}
                    target="_blank"
                    className="block aspect-square relative overflow-hidden rounded-none border bg-surface-muted group cursor-pointer"
                  >
                    <img
                      src={img.url}
                      alt={building.name}
                      className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                    />
                  </Link>
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
          <div className="aspect-square rounded-md border bg-surface-muted flex items-center justify-center text-text-secondary">
            No images available
          </div>
        )}

        <BuildingAttributes
            building={building}
            className="grid-cols-2"
        />
      </div>
    </div>
  );
}
