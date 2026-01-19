
import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import ForceGraph2D, { ForceGraphMethods } from "react-force-graph-2d";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useTheme } from "next-themes";
import { Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TasteWebProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    allPairs: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    members: any[];
}

export function TasteWeb({ allPairs, members }: TasteWebProps) {
    const { theme } = useTheme();
    const fgRef = useRef<ForceGraphMethods | undefined>(undefined);
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Cache for loaded images
    const imageCache = useRef<Record<string, HTMLImageElement>>({});
    // Track requested images to avoid multiple loads
    const requestedImages = useRef<Set<string>>(new Set());

    // Update dimensions on resize
    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                setDimensions({
                    width: containerRef.current.clientWidth,
                    height: isFullscreen ? window.innerHeight : 400
                });
            }
        };

        window.addEventListener('resize', updateDimensions);
        updateDimensions();

        return () => window.removeEventListener('resize', updateDimensions);
    }, [isFullscreen]);

    const graphData = useMemo(() => {
        // NODES: All members
        const nodes = members.map(m => ({
            id: m.user.id,
            name: m.user.username,
            img: m.user.avatar_url,
            val: 1 // Base size
        }));

        // LINKS: Based on allPairs (only positive correlations for the web usually looks better, or all)
        const links = (allPairs || [])
            .filter(p => p.score > 0) // Only positive correlations pull nodes together
            .map(p => ({
                source: p.u1,
                target: p.u2,
                value: p.score, // Used for link visual
                distance: 100 * (1 - p.score) // Higher score = shorter distance
            }));

        return { nodes, links };
    }, [allPairs, members]);

    const isDark = theme === 'dark';
    const linkColor = isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)";
    const nodeColor = isDark ? "#ffffff" : "#000000";

    const toggleFullscreen = () => {
        setIsFullscreen(!isFullscreen);
    };

    // Custom Node Rendering to draw Images (Avatars)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const paintNode = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
        const r = 12;

        // Draw Circle Background
        ctx.beginPath();
        ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, false);
        ctx.fillStyle = nodeColor;
        ctx.fill();

        // Handle Avatar Image
        if (node.img) {
            // Check cache first
            if (imageCache.current[node.img]) {
                const img = imageCache.current[node.img];
                ctx.save();
                ctx.beginPath();
                ctx.arc(node.x, node.y, r - 2, 0, Math.PI * 2, true);
                ctx.closePath();
                ctx.clip();
                try {
                    ctx.drawImage(img, node.x - r, node.y - r, r * 2, r * 2);
                } catch (e) {
                    // Ignore drawing errors
                }
                ctx.restore();
            } else if (!requestedImages.current.has(node.img)) {
                // Load image if not already requested
                requestedImages.current.add(node.img);
                const img = new Image();
                img.src = node.img;
                img.crossOrigin = "Anonymous"; // Crucial for canvas export if needed
                img.onload = () => {
                    imageCache.current[node.img] = img;
                    // Force re-render not strictly needed as loop continues,
                    // but sometimes helpful if static.
                    // ForceGraph re-renders constantly on physics, so it should appear.
                };
            }
        }

        // If no image loaded yet or failed, show initial
        if (!node.img || !imageCache.current[node.img]) {
             ctx.fillStyle = "#1e3a8a"; // blue-900
             ctx.fill(); // Re-fill background with blue

             ctx.fillStyle = "#22d3ee"; // cyan-400 (primary)
             ctx.font = `${r}px Sans-Serif`;
             ctx.textAlign = "center";
             ctx.textBaseline = "middle";
             ctx.fillText(node.name?.[0]?.toUpperCase() || "?", node.x, node.y);
        }

        // Removed name label below icon as per request
    }, [isDark, nodeColor]);

    return (
        <Card className={`border-none shadow-sm bg-accent/5 overflow-hidden transition-all duration-500 ${isFullscreen ? "fixed inset-0 z-50 rounded-none bg-background" : ""}`}>
             <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-sm font-medium">The Taste Web</CardTitle>
                    <CardDescription>Network graph of shared taste compatibility</CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={toggleFullscreen}>
                    {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
            </CardHeader>
            <CardContent className="p-0 relative" ref={containerRef}>
                <div style={{ width: '100%', height: dimensions.height }}>
                    {/* @ts-expect-error ForceGraph2D types are sometimes tricky */}
                    <ForceGraph2D
                        ref={fgRef}
                        width={dimensions.width}
                        height={dimensions.height}
                        graphData={graphData}
                        nodeLabel="name"
                        nodeRelSize={8}
                        linkColor={() => linkColor}
                        linkWidth={link => Math.max(1, (link as any).value * 5)} // Thicker lines for stronger bonds
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        linkLabel={(link: any) => `Match: ${(link.value * 100).toFixed(0)}%`}
                        nodeCanvasObject={paintNode}
                        nodePointerAreaPaint={(node: any, color, ctx) => {
                            ctx.fillStyle = color;
                            ctx.beginPath();
                            ctx.arc(node.x, node.y, 12, 0, 2 * Math.PI, false);
                            ctx.fill();
                        }}
                        enableNodeDrag={true}
                        d3VelocityDecay={0.3}
                        cooldownTicks={100}
                        onEngineStop={() => fgRef.current?.zoomToFit(400)}
                    />
                </div>
                {isFullscreen && (
                     <div className="absolute bottom-4 left-4 right-4 text-center pointer-events-none">
                        <p className="text-xs text-muted-foreground bg-background/50 backdrop-blur px-2 py-1 rounded inline-block">
                            Drag nodes to play • Scroll to zoom • Hover lines for %
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
