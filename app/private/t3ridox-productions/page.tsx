import { MapPageShell } from "../../../components/MapPageShell";
import { LaUmaStateMap } from "../../../components/LaUmaStateMap";
import { LaUmaZoneMap } from "../../../components/LaUmaZoneMap";
import { getLaUmaMapData } from "../../../lib/laUmaMapData";

export default async function LaUmaPage() {
  const mapData = await getLaUmaMapData();

  return (
    <MapPageShell
      title="La Uma"
      description="Flat D3 rendering of the La Uma world with hoverable zone and country overlays from the full export."
    >
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-zinc-100">Zones</h2>
          <LaUmaZoneMap mapData={mapData} />
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-zinc-100">Countries</h2>
          <LaUmaStateMap mapData={mapData} />
        </div>
      </div>
    </MapPageShell>
  );
}
