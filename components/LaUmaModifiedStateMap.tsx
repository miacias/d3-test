"use client";
import { useState } from "react";
import type { LaUmaMapViewModel } from "../lib/laUmaMapData";

type CountryShape = {
  id: number;
  name: string;
  type: string;
  cellCount: number;
  paths: string[];
};

type LaUmaMapProps = {
  mapData: LaUmaMapViewModel;
};

export const LaUmaStateMap = ({ mapData }: LaUmaMapProps) => {
  const [hoveredCountryId, setHoveredCountryId] = useState<number | null>(null);
  const hoveredCountry =
    hoveredCountryId === null ? null : mapData.countryShapes.find((country) => country.id === hoveredCountryId) ?? null;
  
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-700 bg-[#07111f] shadow-lg shadow-black/30">
      <svg
        viewBox={`0 0 ${mapData.viewWidth} ${mapData.viewHeight}`}
        className="h-auto w-full"
        role="img"
        aria-label={`${mapData.info.mapName} map with interactive countries`}
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
          {mapData.countryShapes.map((country: CountryShape) => {
            const isHovered = country.id === hoveredCountryId;

            return (
              <g
                key={`country-${country.id}`}
                onMouseEnter={() => setHoveredCountryId(country.id)}
                onMouseLeave={() => setHoveredCountryId((current) => (current === country.id ? null : current))}
              >
                {country.paths.map((path, index) => (
                  <path
                    key={`country-${country.id}-cell-${index}`}
                    d={path}
                    fill={isHovered ? "#22d3ee" : "rgba(34, 211, 238, 0.02)"}
                    fillOpacity={isHovered ? 0.45 : 1}
                    stroke={isHovered ? "#67e8f9" : "rgba(255, 255, 255, 0.2)"}
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
            Hover a country to highlight its footprint.
          </p>
        </div>

        <div className="min-h-11 text-right">
          {hoveredCountry ? (
            <>
              <p className="font-semibold text-cyan-300">{hoveredCountry.name}</p>
              <p className="text-zinc-400">
                {hoveredCountry.type} · {hoveredCountry.cellCount} cells
              </p>
            </>
          ) : (
            <p className="text-zinc-500">No country selected</p>
          )}
        </div>
      </div>
    </div>
  );
};