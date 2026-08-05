/**
 * BuildingDrawerGallery.tsx
 *
 * The swipeable photo strip at the top of the building detail drawer: the
 * building's hero + review photos, then a final card linking out to Google
 * Images. Most buildings only have one photo (some none), so that last slide is
 * what turns a dead end into "see more of this building". The slide counter
 * stays on real photos only — the search card is not a photo.
 *
 * Extracted from BuildingDrawerBody to keep that file under its size ratchet.
 */
import { useEffect, useMemo, useState } from 'react';
import { ImagePlus } from 'lucide-react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from '@/components/ui/carousel';

export interface DrawerGallerySlide {
  id: string;
  url: string;
}

interface BuildingDrawerGalleryProps {
  slides: DrawerGallerySlide[];
  /** Building name — the alt text, and the Google Images query. */
  name?: string | null;
  /** Narrows the search query when we have it. */
  city?: string | null;
}

export function BuildingDrawerGallery({ slides, name, city }: BuildingDrawerGalleryProps) {
  const googleImagesUrl = useMemo(() => {
    if (!name) return null;
    const query = [name, city].filter(Boolean).join(' ');
    return `https://www.google.com/search?udm=2&q=${encodeURIComponent(query)}`;
  }, [name, city]);

  const totalSlides = slides.length + (googleImagesUrl ? 1 : 0);

  const [api, setApi] = useState<CarouselApi>();
  const [slideIndex, setSlideIndex] = useState(0);
  useEffect(() => {
    if (!api) return;
    setSlideIndex(api.selectedScrollSnap());
    const onSelect = () => setSlideIndex(api.selectedScrollSnap());
    api.on('select', onSelect);
    return () => {
      api.off('select', onSelect);
    };
  }, [api]);

  return (
    <div className="relative w-full bg-surface-muted">
      {totalSlides > 0 ? (
        <Carousel opts={{ align: 'start' }} setApi={setApi} className="w-full">
          <CarouselContent className="ml-0!">
            {slides.map((img) => (
              <CarouselItem key={img.id} className="pl-0!">
                <div className="h-64 w-full bg-surface-muted sm:h-72">
                  <img
                    src={img.url}
                    alt={name || 'Building'}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
              </CarouselItem>
            ))}
            {googleImagesUrl && (
              <CarouselItem key="google-images" className="pl-0!">
                <a
                  href={googleImagesUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-64 w-full flex-col items-center justify-center gap-2 bg-surface-muted px-6 text-center transition-colors hover:bg-surface-card sm:h-72"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border border-border-default bg-surface-card text-text-primary">
                    <ImagePlus className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-medium text-text-primary">
                    Search images on Google
                  </span>
                  <span className="text-xs text-text-secondary">{name}</span>
                </a>
              </CarouselItem>
            )}
          </CarouselContent>
          {totalSlides > 1 && (
            <>
              <CarouselPrevious className="left-2 h-8 w-8 border border-border-default bg-surface-card/80 text-text-primary backdrop-blur-sm hover:bg-surface-card" />
              <CarouselNext className="right-2 h-8 w-8 border border-border-default bg-surface-card/80 text-text-primary backdrop-blur-sm hover:bg-surface-card" />
              {slides.length > 1 && slideIndex < slides.length && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full border border-border-default bg-surface-card/80 px-2.5 py-0.5 text-2xs text-text-secondary backdrop-blur-sm">
                  {slideIndex + 1} / {slides.length}
                </div>
              )}
            </>
          )}
        </Carousel>
      ) : (
        <div className="flex h-64 w-full items-center justify-center text-xs text-text-secondary sm:h-72">
          No image
        </div>
      )}
    </div>
  );
}
