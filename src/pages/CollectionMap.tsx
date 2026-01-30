import { AppLayout } from "@/components/layout/AppLayout";
import { Loader2 } from "lucide-react";

export default function CollectionMap() {
  return (
    <AppLayout title="Collection Map" showBack>
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Collection Map</h2>
        <p className="text-muted-foreground">This feature is coming soon.</p>
      </div>
    </AppLayout>
  );
}
