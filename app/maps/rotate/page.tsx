import { MapPageShell } from "../../../components/MapPageShell";
import { UsRotateMap } from "../../../components/UsRotateMap";

export default function RotateMapPage() {
  return (
    <MapPageShell
      title="Rotate US Map"
      description="Albers USA projection of the US that rotates states on click, implemented with D3's geoAlbersUsa and geoPath."
    >
      <UsRotateMap />
    </MapPageShell>
  );
}
