"use client";
import * as d3 from "d3";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import { useEffect, useRef } from "react";

const WORLD_TOPOJSON_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json";
type WorldTopology = Topology<{ land: GeometryCollection }>;

export const WorldMapStatic = () => {
  const width = 960;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    let isCancelled = false;

    const draw = async () => {
      const projection = d3.geoNaturalEarth1(); // creates a new projection function with default settings
      const outline: d3.GeoPermissibleObjects = { type: "Sphere" }; // represents the outline of the globe as a GeoJSON object
      const graticule = d3.geoGraticule10(); // generates a graticule (grid of latitude and longitude lines) as a GeoJSON object

      const world = await d3.json<WorldTopology>(WORLD_TOPOJSON_URL); // fetches the world map data in TopoJSON format and types it as WorldTopology
      if (!world || isCancelled) return;

      const land = feature(world, world.objects.land) as d3.GeoPermissibleObjects; // converts the land data from TopoJSON to GeoJSON format using the feature function from topojson-client, and types it as a GeoPermissibleObjects for use with D3's geoPath
      const [[x0, y0], [x1, y1]] = d3.geoPath(projection.fitWidth(width, outline)).bounds(outline); // fits the projection to the specified width and the outline of the globe, then calculates the bounding box of the outline in projected coordinates, returning the minimum and maximum x and y values
      const height = Math.ceil(y1 - y0); // calculates the height of the canvas based on the bounding box of the outline, ensuring that the aspect ratio is maintained when rendering the map
      const l = Math.min(Math.ceil(x1 - x0), height); // calculates the smaller dimension (either width or height) of the bounding box to determine the appropriate scale for the projection, ensuring that the map fits within the canvas without distortion

      projection.scale((projection.scale() * (l - 1)) / l).precision(0.2); // adjusts the scale of the projection to fit the smaller dimension of the bounding box, and sets the precision for rendering the map

      canvas.width = width;
      canvas.height = height;

      const path = d3.geoPath(projection, context); // creates a new geoPath generator function that uses the specified projection and renders to the provided canvas context, allowing for efficient rendering of geographic data on the canvas

      context.save();
      context.beginPath();
      path(outline);
      context.clip();
      context.fillStyle = "#fff";
      context.fillRect(0, 0, width, height);

      context.beginPath();
      path(graticule);
      context.strokeStyle = "#ccc";
      context.stroke();

      context.beginPath();
      path(land);
      context.fillStyle = "#000";
      context.fill();
      context.restore();

      context.beginPath();
      path(outline);
      context.strokeStyle = "#000";
      context.stroke();
    };

    draw().catch((error) => {
      console.error("Failed to render world map", error);
    });

    return () => {
      isCancelled = true;
    };
  }, [width]);

  return <canvas ref={canvasRef} className="h-auto w-full max-w-240" />;
};