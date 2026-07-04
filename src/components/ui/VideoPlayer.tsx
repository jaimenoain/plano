import React, { useRef, useState, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface VideoPlayerProps {
  src: string;
  poster?: string;
  className?: string;
  autoPlayOnVisible?: boolean;
  muted?: boolean;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
}

export function VideoPlayer({
  src,
  poster,
  className,
  autoPlayOnVisible = false,
  muted = true,
  objectFit = 'contain',
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(muted);
  const [isControlsVisible, setIsControlsVisible] = useState(false);
  const [_hasInteracted, setHasInteracted] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;

    if (autoPlayOnVisible) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              // Only autoplay if user hasn't paused manually or if it's the first time
              video.play().catch(() => {
                // Autoplay might be blocked
                setIsPlaying(false);
              });
              setIsPlaying(true);
            } else {
              video.pause();
              setIsPlaying(false);
            }
          });
          return undefined;
        },
        { threshold: 0.6 } // 60% visibility required
      );

      if (containerRef.current) {
        observer.observe(containerRef.current);
      }

      return () => observer.disconnect();
    }
    return undefined;
  }, [autoPlayOnVisible]);

  const togglePlay = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
    setHasInteracted(true);
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const toggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      video.requestFullscreen(); // Video element fullscreen
      // or containerRef.current?.requestFullscreen(); // Container fullscreen (custom controls)
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn("relative group bg-black overflow-hidden max-w-full rounded-sm", className)}
      onMouseEnter={() => setIsControlsVisible(true)}
      onMouseLeave={() => setIsControlsVisible(false)}
      onClick={togglePlay}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className={cn("w-full h-full max-w-full", `object-${objectFit}`)}
        playsInline
        loop
        muted={isMuted}
        preload="metadata"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {!isPlaying && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20">
          <div className="rounded-sm bg-black/60 p-3 backdrop-blur-xs">
            <Play className="w-8 h-8 text-white fill-white" />
          </div>
        </div>
      )}

      {/* Controls Bar */}
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 flex items-center justify-between bg-black/60 p-2 backdrop-blur-xs transition-opacity duration-300",
          isControlsVisible || !isPlaying ? "opacity-100" : "opacity-0"
        )}
      >
        <button
          onClick={togglePlay}
          className="rounded-sm p-2 text-white transition-colors hover:bg-white/20"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <Pause className="w-6 h-6 fill-white" />
          ) : (
            <Play className="w-6 h-6 fill-white" />
          )}
        </button>

        <div className="flex items-center gap-1">
            <button
                onClick={toggleMute}
                className="rounded-sm p-2 text-white transition-colors hover:bg-white/20"
                aria-label={isMuted ? "Unmute" : "Mute"}
            >
                {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
            </button>

            <button
                onClick={toggleFullscreen}
                className="rounded-sm p-2 text-white transition-colors hover:bg-white/20"
                aria-label="Toggle Fullscreen"
            >
                <Maximize2 className="w-6 h-6" />
            </button>
        </div>
      </div>
    </div>
  );
}
