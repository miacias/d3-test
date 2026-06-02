import { MapPageShell } from "../../../components/MapPageShell";
import { UsHoverMap } from "../../../components/UsHoverMap";

export default function HoverMapPage() {
  return (
    <MapPageShell
      title="Hover US Map"
      description="Albers USA projection of the US that highlights states on hover, implemented with D3's geoAlbersUsa and geoPath."
    >
      <UsHoverMap />
    </MapPageShell>
  );
}
