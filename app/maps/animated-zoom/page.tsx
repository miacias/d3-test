import { MapPageShell } from "../../../components/MapPageShell";
import { WorldMapAnimatedZoom } from "../../../components/WorldMapAnimatedZoom";

export default function AnimatedZoomPage() {
  return (
    <MapPageShell
      title="Animated Zoom"
      description="Automatically rotates to countries and zooms in and out, while still allowing manual drag and zoom interaction."
    >
      <WorldMapAnimatedZoom />
    </MapPageShell>
  );
}
