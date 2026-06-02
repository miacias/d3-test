"use client";
import * as d3 from "d3";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import { useEffect, useRef } from "react";
import versor from "versor";

const WORLD_TOPOJSON_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json";
type WorldTopology = Topology<{ land: GeometryCollection }>;

export const WorldMapVersorDraggingZoom = () => {
  const width = 960;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d"); // gets the 2D rendering context for the canvas, which is used to draw shapes, text, images, and other objects on the canvas
    if (!context) return;

    let isCancelled = false;

    const draw = async () => {
      const projection: d3.GeoProjection = d3.geoOrthographic().clipAngle(90);
      const sphere: d3.GeoPermissibleObjects = { type: "Sphere" };
      const graticule = d3.geoGraticule10();

      const world = await d3.json<WorldTopology>(WORLD_TOPOJSON_URL);
      if (!world || isCancelled) return;

      const land = feature(world, world.objects.land) as d3.GeoPermissibleObjects;
      const [[x0, y0], [x1, y1]] = d3.geoPath(projection.fitWidth(width, sphere)).bounds(sphere);
      const height = Math.ceil(y1 - y0);
      const l = Math.min(Math.ceil(x1 - x0), height);

      projection.scale((projection.scale() * (l - 1)) / l).precision(0.2);
      // zoom with: mouse wheel, double-click, or touch screen pinch
      const baseScale = projection.scale(); // Store the initial scale of the projection to use as a reference for zooming

      canvas.width = width;
      canvas.height = height;

      const path = d3.geoPath(projection, context);

      const render = () => {
        context.clearRect(0, 0, width, height);

        context.beginPath();
        path(sphere);
        context.fillStyle = "#fff";
        context.fill();

        context.beginPath();
        path(graticule);
        context.strokeStyle = "#ccc";
        context.stroke();

        context.beginPath();
        path(land);
        context.fillStyle = "#000";
        context.fill();

        context.beginPath();
        path(sphere);
        context.strokeStyle = "#000";
        context.stroke();
      };

      const dragBehavior = () => {
        let v0 = [0, 0, 0] as [number, number, number];
        let q0 = [1, 0, 0, 0] as [number, number, number, number];
        let r0 = [0, 0, 0] as [number, number, number];
        let a0 = 0;
        let touchCount = 0;

        function pointer(event: d3.D3DragEvent<HTMLCanvasElement, unknown, unknown>, node: HTMLCanvasElement) {
          const sourceEvent = event.sourceEvent ?? event;
          const touches = d3.pointers(sourceEvent, node);

          if (touches.length !== touchCount) {
            touchCount = touches.length;

            if (touchCount > 1) {
              a0 = Math.atan2(touches[1][1] - touches[0][1], touches[1][0] - touches[0][0]);
            }

            dragstarted.call(node, event);
          }

          if (touchCount > 1) {
            const x = d3.mean(touches, (point) => point[0]) ?? 0;
            const y = d3.mean(touches, (point) => point[1]) ?? 0;
            const a = Math.atan2(touches[1][1] - touches[0][1], touches[1][0] - touches[0][0]);
            return [x, y, a] as const;
          }

          return touches[0];
        }

        function dragstarted(event: d3.D3DragEvent<HTMLCanvasElement, unknown, unknown>) {
          const point = projection.invert?.([event.x, event.y]);
          if (!point) return;

          v0 = versor.cartesian(point);
          q0 = versor((r0 = projection.rotate()));
        }

        function dragged(this: HTMLCanvasElement, event: d3.D3DragEvent<HTMLCanvasElement, unknown, unknown>) {
          const rotatedProjection = projection.rotate(r0);
          const point = rotatedProjection.invert?.([event.x, event.y]);
          if (!point) return;

          const v1 = versor.cartesian(point);
          const delta = versor.delta(v0, v1);
          let q1 = versor.multiply(q0, delta);

          const p = pointer(event, this);
          if (p[2]) {
            const d = (p[2] - a0) / 2;
            const s = -Math.sin(d);
            const c = Math.sign(Math.cos(d));
            q1 = versor.multiply([Math.sqrt(1 - s * s), 0, 0, c * s], q1);
          }

          projection.rotate(versor.rotation(q1));
          render();
        }

        return d3.drag<HTMLCanvasElement, unknown>().on("start", dragstarted).on("drag", dragged);
      };

      const zoomBehavior = d3
        .zoom<HTMLCanvasElement, unknown>()
        .scaleExtent([0.75, 8])
        .filter((event) => {
          if (event.type === "wheel" || event.type === "dblclick") return true;
          if ("touches" in event) return event.touches.length > 1;
          return false;
        })
        .on("zoom", (event) => {
          projection.scale(baseScale * event.transform.k);
          render();
        });

      const canvasSelection = d3.select<HTMLCanvasElement, unknown>(canvas);
      canvasSelection.call(dragBehavior()).call(zoomBehavior);
      render();
    };

    draw().catch((error) => {
      console.error("Failed to render world map", error);
    });

    return () => {
      isCancelled = true;
      d3.select(canvas).on(".drag", null).on(".zoom", null);
    };
  }, [width]);

  return <canvas ref={canvasRef} className="h-auto w-full max-w-240" style={{ touchAction: "none" }} />;
};