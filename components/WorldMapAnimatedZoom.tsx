"use client";
import * as d3 from "d3";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import { useEffect, useRef, useState } from "react";
import versor from "versor";

const WORLD_TOPOJSON_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
type WorldTopology = Topology<{ land: GeometryCollection; countries: GeometryCollection }>;

export const WorldMapAnimatedZoom = () => {
  const width = 960;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const isPlayingRef = useRef(true);

  const togglePlayback = () => {
    setIsPlaying((prev) => {
      const next = !prev;
      isPlayingRef.current = next;
      return next;
    });
  };

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

      const land = feature(world, world.objects.land) as d3.GeoPermissibleObjects; // converts the TopoJSON geometry for land into GeoJSON format, which is easier to work with for rendering and interaction. The resulting land variable is a GeoJSON object representing the land areas of the world that can be rendered on the map.
      const countriesCollection = feature(world, world.objects.countries) as GeoJSON.FeatureCollection<
        GeoJSON.Geometry,
        GeoJSON.GeoJsonProperties
      >; // converts the TopoJSON geometry for countries into GeoJSON format, which is easier to work with for rendering and interaction. The resulting countriesCollection is a GeoJSON FeatureCollection containing individual country features that can be rendered and interacted with on the map.
      const countries = countriesCollection.features.filter((country) => Boolean(country.geometry)); // filters the countriesCollection to include only those features that have a valid geometry. This is important because some features in the TopoJSON data may not have geometries, and attempting to render or interact with them could lead to errors. The resulting countries array contains only the country features that can be rendered and interacted with on the map.

      const [[x0, y0], [x1, y1]] = d3.geoPath(projection.fitWidth(width, sphere)).bounds(sphere);
      const height = Math.ceil(y1 - y0);
      const l = Math.min(Math.ceil(x1 - x0), height);

      projection.scale((projection.scale() * (l - 1)) / l).precision(0.2);
      // zoom with: mouse wheel, double-click, or touch screen pinch
      const baseScale = projection.scale(); // Store the initial scale of the projection to use as a reference for zooming

      canvas.width = width;
      canvas.height = height;

      const path = d3.geoPath(projection, context); // creates a new geographic path generator that uses the specified projection and rendering context. The path generator is responsible for converting GeoJSON data into drawable paths on the canvas based on the provided projection. By passing the context, the generated paths will be drawn directly onto the canvas using the 2D rendering context.
      let highlightedCountry: GeoJSON.Feature<GeoJSON.Geometry, GeoJSON.GeoJsonProperties> | null = null; // initializes a variable to keep track of the currently highlighted country on the map. This variable will be used to store the GeoJSON feature of the country that is currently highlighted, allowing the rendering logic to differentiate it from other countries and apply special styling (e.g., different fill color or stroke) when drawing the map. Initially, it is set to null, indicating that no country is highlighted at the start.
      let interactionCooldownUntil = 0;

      const nextFrame = () => // defines a function that returns a promise that resolves on the next animation frame. This is used to create smooth animations by allowing the rendering logic to wait until the next frame before updating the canvas. By using requestAnimationFrame, the browser can optimize the rendering process and ensure that updates occur at an appropriate time for smooth visual performance.
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => resolve());
        });

      const wait = async (ms: number) => { // defines an asynchronous function that creates a delay for a specified number of milliseconds. This function is used to introduce pauses in the animation sequence, allowing for timed transitions between different states (e.g., highlighting a country, zooming in, etc.). The function uses a while loop to continuously check if the specified time has elapsed, and it awaits the next animation frame to ensure that the delay is non-blocking and allows for smooth animations.
        const start = performance.now();

        while (!isCancelled && performance.now() - start < ms) {
          await nextFrame();
        }
      };

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
        context.fillStyle = "#111827";
        context.fill();

        if (highlightedCountry) { // checks if there is a currently highlighted country. If there is, it proceeds to render that country with special styling to make it stand out on the map. This typically involves filling the country with a different color and adding a stroke around it to visually differentiate it from other countries. The rendering logic uses the path generator to create the path for the highlighted country and applies the specified fill and stroke styles before drawing it on the canvas.
          context.beginPath();
          path(highlightedCountry);
          context.fillStyle = "#f97316";
          context.fill();

          context.beginPath();
          path(highlightedCountry);
          context.strokeStyle = "#fff"; // sets the stroke color for the highlighted country. This color is used to draw the outline around the highlighted country, making it visually distinct from other countries on the map.
          context.lineWidth = 0.8; // sets the width of the stroke for the highlighted country. A thicker line can make the highlighted country stand out more prominently.
          context.stroke();
        }

        context.beginPath();
        path(sphere);
        context.strokeStyle = "#000"; // sets the stroke color for the sphere (the outline of the globe). This color is used to draw the outer boundary of the globe, providing a clear visual separation between the globe and the background.
        context.stroke();
      };

      const dragBehavior = () => {
        let v0 = [0, 0, 0] as [number, number, number];
        let q0 = [1, 0, 0, 0] as [number, number, number, number];
        let r0 = [0, 0, 0] as [number, number, number]; // stores the initial rotation of the globe. This is used to calculate the new rotation based on user interactions, allowing the globe to be rotated smoothly.
        let a0 = 0; // stores the initial angle between two touch points. This is used to calculate the rotation of the globe when the user performs a pinch-to-zoom gesture.
        let touchCount = 0; // keeps track of the number of touch points. This is used to differentiate between single-touch and multi-touch interactions.

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
          interactionCooldownUntil = performance.now() + 3000;

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
          interactionCooldownUntil = performance.now() + 3000;
          projection.scale(baseScale * event.transform.k);
          render();
        });

      const canvasSelection = d3.select<HTMLCanvasElement, unknown>(canvas);
      canvasSelection.call(dragBehavior()).call(zoomBehavior);
      render();

      // defines an asynchronous function that animates the transition to a specific country on the map. This function calculates the target rotation and scale needed to center and zoom in on the specified country, and then smoothly interpolates the projection's rotation and scale over a defined duration using an easing function. The animation is performed by repeatedly updating the projection and rendering the map until the transition is complete or cancelled.
      const animateToCountry = async ( 
        country: GeoJSON.Feature<GeoJSON.Geometry, GeoJSON.GeoJsonProperties>,
      ) => {
        const centroid = d3.geoCentroid(country);
        const currentRotate = projection.rotate();

        const targetLon = -centroid[0];
        const targetLat = -centroid[1];
        const deltaLon = ((((targetLon - currentRotate[0]) % 360) + 540) % 360) - 180;
        const targetRotate: [number, number, number] = [currentRotate[0] + deltaLon, targetLat, 0];

        const zoomFactor = Math.max(1.6, Math.min(3.6, 2.4 / Math.sqrt(Math.max(d3.geoArea(country), 1e-6))));
        const targetScale = baseScale * zoomFactor;
        const duration = 1800;
        const interpolateRotate = d3.interpolate(currentRotate, targetRotate);
        const interpolateScale = d3.interpolateNumber(projection.scale(), targetScale);
        const ease = d3.easeCubicInOut;
        const start = performance.now();
        let adjustedStart = start;
        let previousNow = start;

        while (!isCancelled) {
          const now = performance.now();

          if (!isPlayingRef.current) {
            adjustedStart += now - previousNow;
            previousNow = now;
            await nextFrame();
            continue;
          }

          const t = Math.min(1, (now - adjustedStart) / duration);
          const k = ease(t);

          projection.rotate(interpolateRotate(k));
          projection.scale(interpolateScale(k));
          render();
          previousNow = now;

          if (t >= 1) break;
          await nextFrame();
        }
      };

      // defines an asynchronous function that animates the zooming out from a specific country back to the original view of the map. This function calculates the target scale needed to return to the base view and smoothly interpolates the projection's scale over a defined duration using an easing function. The animation is performed by repeatedly updating the projection and rendering the map until the transition is complete or cancelled.
      const animateZoomOut = async () => {
        const currentRotate = projection.rotate();
        const startScale = projection.scale();
        const targetScale = baseScale * 1.05;
        const duration = 1100;
        const interpolateScale = d3.interpolateNumber(startScale, targetScale);
        const ease = d3.easeCubicInOut;
        const start = performance.now();
        let adjustedStart = start;
        let previousNow = start;

        while (!isCancelled) {
          const now = performance.now();

          if (!isPlayingRef.current) {
            adjustedStart += now - previousNow;
            previousNow = now;
            await nextFrame();
            continue;
          }

          const t = Math.min(1, (now - adjustedStart) / duration);
          const k = ease(t);

          projection.rotate(currentRotate);
          projection.scale(interpolateScale(k));
          render();
          previousNow = now;

          if (t >= 1) break;
          await nextFrame();
        }
      };

      // defines an asynchronous function that runs a sequence of animations for each country on the map. It shuffles the list of countries and iterates through them, performing a series of actions for each country: highlighting the country, animating the zoom to the country, waiting for a moment, then animating the zoom back out. The function also checks for cancellation at various points to ensure that the animation can be stopped gracefully if needed.
      const runCountrySequence = async () => {
        const ordered = d3.shuffle([...countries]);
        let index = 0;

        while (!isCancelled && ordered.length > 0) {
          if (!isPlayingRef.current) {
            await wait(120);
            continue;
          }

          if (performance.now() < interactionCooldownUntil) {
            await wait(120);
            continue;
          }

          const country = ordered[index % ordered.length];
          highlightedCountry = country;
          render();

          await wait(450);
          if (isCancelled) break;

          await animateToCountry(country);
          if (isCancelled) break;

          await wait(900);
          if (isCancelled) break;

          highlightedCountry = null;
          render();

          await animateZoomOut();
          if (isCancelled) break;

          await wait(250);
          index += 1;
        }
      };

      void runCountrySequence();
    };

    draw().catch((error) => {
      console.error("Failed to render world map", error);
    });

    return () => {
      isCancelled = true;
      d3.select(canvas).on(".drag", null).on(".zoom", null);
    };
  }, [width]);

  return (
    <div className="flex w-full max-w-240 flex-col gap-3">
      <button
        type="button"
        onClick={togglePlayback}
        className="w-fit rounded-md border border-zinc-300 bg-white px-3 py-1 text-sm font-medium text-zinc-900 hover:bg-zinc-100"
      >
        {isPlaying ? "Pause animation" : "Play animation"}
      </button>
      <canvas ref={canvasRef} className="h-auto w-full" style={{ touchAction: "none" }} />
    </div>
  );
};