"use client";
import * as d3 from "d3";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import { useEffect, useRef } from "react";
import type { FeatureCollection, Geometry } from "geojson";

const US_TOPOJSON_URL =
  "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";
type UsTopology = Topology<{ states: GeometryCollection }>;
const ACTIVE_SCALE = 1.08;
const ACTIVE_OFFSET_X = -110;
const ACTIVE_LIFT_Y = -70;
const ACTIVATION_DURATION_MS = 900;

// On click, a state is highlighted, scaled up slightly without shifting others, rotated 360 to the left, and off-set left of center.
export const UsRotateMap = () => {
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

      let activeStateIndex: number | null = null;
      let activeRotationDegrees = 0;
      let activeMotionProgress = 0;
      let isAnimating = false;
      let animationStartedAt = 0;
      let animationFromProgress = 0;
      let animationToProgress = 0;
      let animationFromRotation = 0;
      let animationToRotation = 0;
      let clearActiveOnAnimationEnd = false;

      const getMousePos = (event: MouseEvent) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return {
          x: (event.clientX - rect.left) * scaleX,
          y: (event.clientY - rect.top) * scaleY,
        };
      };

      const applyActiveTransform = (
        state: (typeof statePaths)[number],
        motionProgress: number,
        rotationDegrees: number,
      ) => {
        const [cx, cy] = path.centroid(state.feature);
        const offsetX = ACTIVE_OFFSET_X * motionProgress;
        const offsetY = ACTIVE_LIFT_Y * motionProgress;
        const scale = 1 + (ACTIVE_SCALE - 1) * motionProgress;

        context.translate(offsetX, offsetY);
        context.translate(cx, cy);
        context.scale(scale, scale);
        context.rotate((-rotationDegrees * Math.PI) / 180);
        context.translate(-cx, -cy);
      };

      const isPointInState = (
        state: (typeof statePaths)[number],
        x: number,
        y: number,
        isActive: boolean,
      ) => {
        if (!isActive) {
          return context.isPointInPath(state.path, x, y);
        }

        // Match hit testing to the same transform used for rendering the active state.
        context.save();
        applyActiveTransform(state, activeMotionProgress, activeRotationDegrees);
        const hit = context.isPointInPath(state.path, x, y);
        context.restore();
        return hit;
      };

      const handleClick = (event: MouseEvent) => {
        const { x, y } = getMousePos(event);
        let clickedStateIndex: number | null = null;

        if (activeStateIndex !== null) {
          const activeState = statePaths[activeStateIndex];
          if (isPointInState(activeState, x, y, true)) {
            clickedStateIndex = activeStateIndex;
          }
        }

        if (clickedStateIndex === null) {
          for (let index = statePaths.length - 1; index >= 0; index -= 1) {
            if (index === activeStateIndex) {
              continue;
            }

            const state = statePaths[index];
            if (isPointInState(state, x, y, false)) {
              clickedStateIndex = index;
              break;
            }
          }
        }

        if (clickedStateIndex === null) {
          return;
        }

        const now = performance.now();

        if (clickedStateIndex === activeStateIndex) {
          // Clicking the active state reverses it back to resting position.
          isAnimating = true;
          animationStartedAt = now;
          animationFromProgress = activeMotionProgress;
          animationToProgress = 0;
          animationFromRotation = activeRotationDegrees;
          animationToRotation = 0;
          clearActiveOnAnimationEnd = true;
          return;
        }

        activeStateIndex = clickedStateIndex;
        isAnimating = true;
        animationStartedAt = now;
        animationFromProgress = 0;
        animationToProgress = 1;
        animationFromRotation = 0;
        animationToRotation = 360;
        activeMotionProgress = 0;
        activeRotationDegrees = 0;
        clearActiveOnAnimationEnd = false;
      };
      canvas.addEventListener("click", handleClick);

      const drawState = (state: (typeof statePaths)[number], isActive: boolean) => {
        if (isActive) {
          context.save();
          applyActiveTransform(state, activeMotionProgress, activeRotationDegrees);
        }

        context.fillStyle = isActive ? "#2563eb" : "#e5e7eb";
        context.strokeStyle = "#1f2937";
        context.lineWidth = 0.7;
        context.fill(state.path);
        context.stroke(state.path);

        if (isActive) {
          context.restore();
        }
      };

      const animate = (timestamp: number) => {
        if (isCancelled) return;

        if (isAnimating) {
          const elapsed = timestamp - animationStartedAt;
          const progress = Math.min(elapsed / ACTIVATION_DURATION_MS, 1);

          activeMotionProgress =
            animationFromProgress +
            (animationToProgress - animationFromProgress) * progress;
          activeRotationDegrees =
            animationFromRotation +
            (animationToRotation - animationFromRotation) * progress;

          if (progress >= 1) {
            isAnimating = false;
            activeMotionProgress = animationToProgress;
            activeRotationDegrees = animationToRotation;

            if (clearActiveOnAnimationEnd) {
              activeStateIndex = null;
              activeMotionProgress = 0;
              activeRotationDegrees = 0;
              clearActiveOnAnimationEnd = false;
            }
          }
        }

        context.clearRect(0, 0, width, height);

        for (let index = 0; index < statePaths.length; index += 1) {
          if (index !== activeStateIndex) {
            drawState(statePaths[index], false);
          }
        }

        if (activeStateIndex !== null) {
          drawState(statePaths[activeStateIndex], true);
        }

        animationFrameId = requestAnimationFrame(animate);
      };

      animationFrameId = requestAnimationFrame(animate);

      removeListeners = () => {
        canvas.removeEventListener("click", handleClick);
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
