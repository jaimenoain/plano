import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Loader2 } from "lucide-react";

interface PlanRouteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collectionId: string;
  onPlanGenerated?: () => void;
}

export function PlanRouteDialog({
  open,
  onOpenChange,
  collectionId,
  onPlanGenerated,
}: PlanRouteDialogProps) {
  const { toast } = useToast();
  const [days, setDays] = useState<number>(3);
  const [transportMode, setTransportMode] = useState<string>("walking");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectionId) return;

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("generate-itinerary", {
        body: {
          collection_id: collectionId,
          days: Number(days),
          transportMode: transportMode,
        },
      });

      if (error) throw error;

      // Check if the function returned an error in the body
      if (data && data.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Itinerary Generated",
        description: "Your route has been successfully planned.",
      });

      onOpenChange(false);
      if (onPlanGenerated) {
        onPlanGenerated();
      }
    } catch (error: any) {
      console.error("Error generating itinerary:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate itinerary. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>✨ Plan Route</DialogTitle>
          <DialogDescription>
            Optimize your trip by selecting the number of days and your preferred mode of transport.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="days">Number of Days</Label>
            <Input
              id="days"
              type="number"
              min={1}
              max={14}
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value) || 1)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Select between 1 and 14 days for your itinerary.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Transport Mode</Label>
            <SegmentedControl
              value={transportMode}
              onValueChange={setTransportMode}
              options={[
                { label: "Walking", value: "walking" },
                { label: "Cycling", value: "cycling" },
                { label: "Driving", value: "driving" },
              ]}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                "Generate Itinerary"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
