import { AppLayout } from "@/components/layout/AppLayout";
import { BuildingDiscoveryMap } from "@/components/common/BuildingDiscoveryMap";

export default function Search() {
  return (
    <AppLayout title="Discovery" showLogo={false}>
      <div className="h-full w-full p-4">
        <BuildingDiscoveryMap />
      </div>
    </AppLayout>
  );
}
