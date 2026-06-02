import { MapPageShell } from "../../../components/MapPageShell";
import { WorldMapVersorDragging } from "../../../components/WorldMapVersorDragging";

export default function VersorDraggingPage() {
  return (
    <MapPageShell
      title="Versor Dragging"
      description="Orthographic globe with drag interaction powered by versor math for smooth rotation."
    >
      <WorldMapVersorDragging />
    </MapPageShell>
  );
}
