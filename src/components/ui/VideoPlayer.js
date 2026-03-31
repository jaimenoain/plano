import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useRef, useState, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
export function VideoPlayer({ src, poster, className, autoPlayOnVisible = false, muted = true, objectFit = 'contain', }) {
    const videoRef = useRef(null);
    const containerRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(muted);
    const [isControlsVisible, setIsControlsVisible] = useState(false);
    const [_hasInteracted, setHasInteracted] = useState(false);
    useEffect(() => {
        const video = videoRef.current;
        if (!video)
            return undefined;
        if (autoPlayOnVisible) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        // Only autoplay if user hasn't paused manually or if it's the first time
                        video.play().catch(() => {
                            // Autoplay might be blocked
                            setIsPlaying(false);
                        });
                        setIsPlaying(true);
                    }
                    else {
                        video.pause();
                        setIsPlaying(false);
                    }
                });
                return undefined;
            }, { threshold: 0.6 } // 60% visibility required
            );
            if (containerRef.current) {
                observer.observe(containerRef.current);
            }
            return () => observer.disconnect();
        }
        return undefined;
    }, [autoPlayOnVisible]);
    const togglePlay = (e) => {
        e?.stopPropagation();
        const video = videoRef.current;
        if (!video)
            return;
        if (isPlaying) {
            video.pause();
        }
        else {
            video.play();
        }
        setIsPlaying(!isPlaying);
        setHasInteracted(true);
    };
    const toggleMute = (e) => {
        e.stopPropagation();
        const video = videoRef.current;
        if (!video)
            return;
        video.muted = !isMuted;
        setIsMuted(!isMuted);
    };
    const toggleFullscreen = (e) => {
        e.stopPropagation();
        const video = videoRef.current;
        if (!video)
            return;
        if (document.fullscreenElement) {
            document.exitFullscreen();
        }
        else {
            video.requestFullscreen(); // Video element fullscreen
            // or containerRef.current?.requestFullscreen(); // Container fullscreen (custom controls)
        }
    };
    return (_jsxs("div", { ref: containerRef, className: cn("relative group bg-black overflow-hidden max-w-full", className), onMouseEnter: () => setIsControlsVisible(true), onMouseLeave: () => setIsControlsVisible(false), onClick: togglePlay, children: [_jsx("video", { ref: videoRef, src: src, poster: poster, className: cn("w-full h-full max-w-full", `object-${objectFit}`), playsInline: true, loop: true, muted: isMuted, preload: "metadata", onPlay: () => setIsPlaying(true), onPause: () => setIsPlaying(false) }), !isPlaying && (_jsx("div", { className: "absolute inset-0 flex items-center justify-center pointer-events-none bg-black/20", children: _jsx("div", { className: "bg-black/40 rounded-full p-4 backdrop-blur-sm", children: _jsx(Play, { className: "w-8 h-8 text-white fill-white" }) }) })), _jsxs("div", { className: cn("absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-between transition-opacity duration-300", isControlsVisible || !isPlaying ? "opacity-100" : "opacity-0"), children: [_jsx("button", { onClick: togglePlay, className: "text-white hover:bg-white/20 rounded-full p-3 transition-colors", "aria-label": isPlaying ? "Pause" : "Play", children: isPlaying ? (_jsx(Pause, { className: "w-6 h-6 fill-white" })) : (_jsx(Play, { className: "w-6 h-6 fill-white" })) }), _jsxs("div", { className: "flex items-center gap-1", children: [_jsx("button", { onClick: toggleMute, className: "text-white hover:bg-white/20 rounded-full p-3 transition-colors", "aria-label": isMuted ? "Unmute" : "Mute", children: isMuted ? _jsx(VolumeX, { className: "w-6 h-6" }) : _jsx(Volume2, { className: "w-6 h-6" }) }), _jsx("button", { onClick: toggleFullscreen, className: "text-white hover:bg-white/20 rounded-full p-3 transition-colors", "aria-label": "Toggle Fullscreen", children: _jsx(Maximize2, { className: "w-6 h-6" }) })] })] })] }));
}
