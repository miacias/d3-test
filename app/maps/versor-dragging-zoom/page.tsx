import { MapPageShell } from "../../../components/MapPageShell";
import { WorldMapVersorDraggingZoom } from "../../../components/WorldMapVersorDraggingZoom";

export default function VersorDraggingZoomPage() {
  return (
    <MapPageShell
      title="Versor Dragging With Zoom"
      description="Orthographic globe with versor-based drag rotation and interactive zoom controls."
    >
      <WorldMapVersorDraggingZoom />
    </MapPageShell>
  );
}
