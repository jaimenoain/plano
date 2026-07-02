import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from 'plano';

const slides = ['Villa Saarinen', 'Barbican Estate', 'Salk Institute'];

export const Gallery = () => (
  <div style={{ padding: '0 56px', maxWidth: 460 }}>
    <Carousel opts={{ align: 'start' }}>
      <CarouselContent>
        {slides.map((title, i) => (
          <CarouselItem key={title}>
            <div
              style={{
                aspectRatio: '4 / 3',
                background: 'var(--surface-muted)',
                border: '1px solid var(--border-default)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                padding: 16,
              }}
            >
              <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 11, color: 'var(--text-secondary)' }}>
                {String(i + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}
              </span>
              <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-secondary)' }}>
                {title}
              </span>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  </div>
);
