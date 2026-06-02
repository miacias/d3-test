"use client";
import * as d3 from "d3";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import { useEffect, useRef } from "react";

const US_TOPOJSON_URL =
  "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";
type UsTopology = Topology<{ states: GeometryCollection }>;

// on hover, state is highlighted; on click, state rotates 360 degrees around its centroid and off-set to the left (returns to original position after second click)
export const UsHoverRotateMap = () => {
  const width = 960;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    let isCancelled = false;

    const draw = async () => {
      const projection = d3.geoAlbersUsa();
      const us = await d3.json<UsTopology>(US_TOPOJSON_URL);
      if (!us || isCancelled) return;

      const states = feature(us, us.objects.states) as d3.GeoPermissibleObjects;
      const pathForBounds = d3.geoPath(projection.fitWidth(width, states));
      const [[x0, y0], [x1, y1]] = pathForBounds.bounds(states);
      const height = Math.ceil(y1 - y0);

      canvas.width = width;
      canvas.height = height;

      const path = d3.geoPath(projection, context);

      context.clearRect(0, 0, width, height);
      context.beginPath();
      path(states);
      context.fillStyle = "#e5e7eb";
      context.fill();
      context.strokeStyle = "#1f2937";
      context.lineWidth = 0.7;
      context.stroke();
    };

    draw().catch((error) => {
      console.error("Failed to render US map", error);
    });

    return () => {
      isCancelled = true;
    };
  }, [width]);

  return <canvas ref={canvasRef} style={{ width: "100%", height: "auto" }} />;
};
