"use client";
import * as d3 from "d3";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import { useEffect, useRef } from "react";
import type { FeatureCollection, Geometry } from "geojson";

const US_TOPOJSON_URL =
  "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";
type UsTopology = Topology<{ states: GeometryCollection }>;

// On hover, a state is highlighted and scaled up slightly without shifting others.
export const UsHoverRotateMap = () => {
  const width = 960;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    let isCancelled = false;
    let animationFrameId: number | null = null;
    let removeListeners: (() => void) | null = null;

    const draw = async () => {
      const projection = d3.geoAlbersUsa();
      const us = await d3.json<UsTopology>(US_TOPOJSON_URL);
      if (!us || isCancelled) return;

      const states = feature(us, us.objects.states);
      if (states.type !== "FeatureCollection") return;

      const statesCollection = states as FeatureCollection<Geometry>;
      const pathForBounds = d3.geoPath(projection.fitWidth(width, states));
      const [[, y0], [, y1]] = pathForBounds.bounds(states);
      const height = Math.ceil(y1 - y0);

      canvas.width = width;
      canvas.height = height;

      const path = d3.geoPath(projection, context);

      const statePaths = statesCollection.features.map((feature) => {
        const path2d = new Path2D();
        const pathBuilder = d3.geoPath(
          projection,
          path2d as unknown as CanvasRenderingContext2D,
        );
        pathBuilder(feature);
        return { feature, path: path2d };
      });

      let hoveredStateIndex: number | null = null;

      const getMousePos = (event: MouseEvent) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return {
          x: (event.clientX - rect.left) * scaleX,
          y: (event.clientY - rect.top) * scaleY,
        };
      };

      const handleMouseMove = (event: MouseEvent) => {
        const { x, y } = getMousePos(event);
        hoveredStateIndex = null;

        for (let index = statePaths.length - 1; index >= 0; index -= 1) {
          const state = statePaths[index];
          if (context.isPointInPath(state.path, x, y)) {
            hoveredStateIndex = index;
            break;
          }
        }
      };

      canvas.addEventListener("mousemove", handleMouseMove);
      const handleMouseLeave = () => {
        hoveredStateIndex = null;
      };
      canvas.addEventListener("mouseleave", handleMouseLeave);

      const drawState = (state: (typeof statePaths)[number], isHovered: boolean) => {
        if (isHovered) {
          const [cx, cy] = path.centroid(state.feature);
          context.save();
          context.translate(cx, cy);
          context.scale(1.08, 1.08);
          context.translate(-cx, -cy);
        }

        context.fillStyle = isHovered ? "#7e22ce" : "#e5e7eb";
        context.strokeStyle = "#1f2937";
        context.lineWidth = 0.7;
        context.fill(state.path);
        context.stroke(state.path);

        if (isHovered) {
          context.restore();
        }
      };

      const animate = () => {
        if (isCancelled) return;

        context.clearRect(0, 0, width, height);

        for (let index = 0; index < statePaths.length; index += 1) {
          if (index !== hoveredStateIndex) {
            drawState(statePaths[index], false);
          }
        }

        if (hoveredStateIndex !== null) {
          drawState(statePaths[hoveredStateIndex], true);
        }

        animationFrameId = requestAnimationFrame(animate);
      };

      animate();

      removeListeners = () => {
        canvas.removeEventListener("mousemove", handleMouseMove);
        canvas.removeEventListener("mouseleave", handleMouseLeave);
      };
    };

    draw().catch((error) => {
      console.error("Failed to render US map", error);
    });

    return () => {
      isCancelled = true;
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
      removeListeners?.();
    };
  }, [width]);

  return <canvas ref={canvasRef} style={{ width: "100%", height: "auto" }} />;
};
