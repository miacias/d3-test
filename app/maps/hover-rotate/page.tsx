import { MapPageShell } from "../../../components/MapPageShell";
import { UsHoverRotateMap } from "../../../components/UsHoverRotateMap";

export default function HoverRotateMapPage() {
  return (
    <MapPageShell
      title="Hover Rotate US Map"
      description="Albers USA projection of the US that rotates on hover, implemented with D3's geoAlbersUsa and geoPath."
    >
      <UsHoverRotateMap />
    </MapPageShell>
  );
}
