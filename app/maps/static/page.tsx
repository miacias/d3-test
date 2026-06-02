import { MapPageShell } from "../../../components/MapPageShell";
import { WorldMapStatic } from "../../../components/WorldMapStatic";

export default function StaticMapPage() {
  return (
    <MapPageShell
      title="Static World Map"
      description="Natural Earth projection rendered on canvas with graticules and landmass outlines."
    >
      <WorldMapStatic />
    </MapPageShell>
  );
}
