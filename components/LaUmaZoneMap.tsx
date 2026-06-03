"use client";
import { useState } from "react";
import type { LaUmaMapViewModel } from "../lib/laUmaMapData";

type ZoneShape = {
  id: number;
  name: string;
  type: string;
  cellCount: number;
  paths: string[];
};

type LaUmaMapProps = {
  mapData: LaUmaMapViewModel;
};

export const LaUmaZoneMap = ({ mapData }: LaUmaMapProps) => {
  const [hoveredZoneId, setHoveredZoneId] = useState<number | null>(null);
  const hoveredZone =
    hoveredZoneId === null ? null : mapData.zoneShapes.find((zone) => zone.id === hoveredZoneId) ?? null;

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-700 bg-[#07111f] shadow-lg shadow-black/30">
      <svg
        viewBox={`0 0 ${mapData.viewWidth} ${mapData.viewHeight}`}
        className="h-auto w-full"
        role="img"
        aria-label={`${mapData.info.mapName} map with interactive zones`}
      >
        <rect width={mapData.viewWidth} height={mapData.viewHeight} fill="#081426" />

        <g aria-hidden="true">
          {mapData.terrainPaths
            .filter((feature) => !feature.land)
            .map((feature) => (
              <path
                key={`water-${feature.id}`}
                d={feature.path}
                fill="#0d1c32"
                stroke="#19314f"
                strokeWidth={1}
              />
            ))}

          {mapData.terrainPaths
            .filter((feature) => feature.land)
            .map((feature) => (
              <path
                key={`land-${feature.id}`}
                d={feature.path}
                fill="#182b45"
                stroke="#3e5d80"
                strokeWidth={1.2}
              />
            ))}
        </g>

        <g>
          {mapData.zoneShapes.map((zone: ZoneShape) => {
            const isHovered = zone.id === hoveredZoneId;

            return (
              <g
                key={`zone-${zone.id}`}
                onMouseEnter={() => setHoveredZoneId(zone.id)}
                onMouseLeave={() => setHoveredZoneId((current) => (current === zone.id ? null : current))}
              >
                {zone.paths.map((path, index) => (
                  <path
                    key={`zone-${zone.id}-cell-${index}`}
                    d={path}
                    fill={isHovered ? "#9c57f3" : "rgba(156, 87, 243, 0.02)"}
                    fillOpacity={isHovered ? 0.45 : 1}
                    stroke={isHovered ? "#c7a4ff" : "rgba(255, 255, 255, 0.2)"}
                    strokeWidth={isHovered ? 1.8 : 0.9}
                    vectorEffect="non-scaling-stroke"
                    style={{ transition: "fill 120ms ease, stroke 120ms ease, stroke-width 120ms ease" }}
                  />
                ))}
              </g>
            );
          })}
        </g>
      </svg>

      <div className="flex items-center justify-between gap-4 border-t border-zinc-700 bg-black/20 px-4 py-3 text-sm text-zinc-200">
        <div>
          <p className="font-semibold text-zinc-100">{mapData.info.mapName}</p>
          <p className="text-zinc-400">
            Hover a zone to highlight its footprint in purple.
          </p>
        </div>

        <div className="min-h-11 text-right">
          {hoveredZone ? (
            <>
              <p className="font-semibold text-purple-300">{hoveredZone.name}</p>
              <p className="text-zinc-400">
                {hoveredZone.type} · {hoveredZone.cellCount} cells
              </p>
            </>
          ) : (
            <p className="text-zinc-500">No zone selected</p>
          )}
        </div>
      </div>
    </div>
  );
};