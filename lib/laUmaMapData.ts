// import { readFile } from "node:fs/promises";
import path from "node:path";
import * as d3 from "d3";

type Point = [number, number];

type Vertex = {
  i: number;
  p: Point;
};

type Cell = {
  i: number;
  v: number[];
};

type MapFeature = {
  i: number;
  land: boolean;
  vertices: number[];
};

type Zone = {
  i: number;
  name: string;
  type: string;
  cells: number[];
};

type State = {
  i: number;
  name?: string;
  type?: string;
  removed?: boolean;
};

type LaUmaRawData = {
  info: {
    mapName: string;
    width: number;
    height: number;
  };
  pack: {
    vertices: Vertex[];
    cells: Cell[];
    features: Array<MapFeature | 0 | null>;
    states: Array<State | null | 0>;
    zones: Zone[];
  };
};

type TerrainPath = {
  id: number;
  land: boolean;
  path: string;
};

type ZoneShape = {
  id: number;
  name: string;
  type: string;
  cellCount: number;
  paths: string[];
};

type CountryShape = {
  id: number;
  name: string;
  type: string;
  cellCount: number;
  paths: string[];
  outlinePaths: string[];
};

export type LaUmaMapViewModel = {
  info: LaUmaRawData["info"];
  viewWidth: number;
  viewHeight: number;
  terrainPaths: TerrainPath[];
  zoneShapes: ZoneShape[];
  countryShapes: CountryShape[];
};

// const SOURCE_FILE = path.join(process.cwd(), "data", "La Uma Full 2026-06-03-02-24.json");
const SOURCE_URL = process.env.LA_UMA_BLOB_URL;
const VIEW_WIDTH = 960;
const PADDING = 24;

let cachedMapData: LaUmaMapViewModel | null = null;

const sanitizeLoneSurrogates = (jsonText: string) =>
  jsonText
    .replace(
      /\\u(d[89ab][0-9a-f]{2})(?!\\u[dD][c-fC-F][0-9a-f]{2})/gi,
      "\\uFFFD",
    )
    .replace(
      /(?<!\\u[dD][89abAB][0-9a-f]{2})\\u(d[c-f][0-9a-f]{2})/gi,
      "\\uFFFD",
    );

const buildViewModel = (mapData: LaUmaRawData): LaUmaMapViewModel => {
  const viewHeight = Math.round(
    (mapData.info.height / mapData.info.width) * VIEW_WIDTH,
  );
  const xScale = d3.scaleLinear(
    [0, mapData.info.width],
    [PADDING, VIEW_WIDTH - PADDING],
  );
  const yScale = d3.scaleLinear(
    [0, mapData.info.height],
    [PADDING, viewHeight - PADDING],
  );
  const line = d3
    .line<Point>()
    .x(([x]) => xScale(x))
    .y(([, y]) => yScale(y))
    .curve(d3.curveLinearClosed);

  const vertexById = new Map(
    mapData.pack.vertices.map((vertex) => [vertex.i, vertex]),
  );
  const cellById = new Map(mapData.pack.cells.map((cell) => [cell.i, cell]));

  const toPath = (vertexIds: number[]) => {
    const points = vertexIds
      .map((vertexId) => vertexById.get(vertexId)?.p)
      .filter(
        (point): point is Point => Array.isArray(point) && point.length === 2,
      );

    if (points.length < 3) {
      return null;
    }

    return line(points) ?? null;
  };

  const terrainPaths = mapData.pack.features
    .filter((feature): feature is MapFeature =>
      Boolean(feature && feature.vertices?.length),
    )
    .map((feature) => ({
      id: feature.i,
      land: feature.land,
      path: toPath(feature.vertices),
    }))
    .filter((feature): feature is TerrainPath => Boolean(feature.path));

  const zoneShapes = mapData.pack.zones
    .map((zone) => ({
      id: zone.i,
      name: zone.name,
      type: zone.type,
      cellCount: zone.cells.length,
      paths: zone.cells
        .map((cellId) => {
          const cell = cellById.get(cellId);
          return cell ? toPath(cell.v) : null;
        })
        .filter((cellPath): cellPath is string => Boolean(cellPath)),
    }))
    .filter((zone): zone is ZoneShape => zone.paths.length > 0);

  const cellIdsByStateId = new Map<number, number[]>();
  mapData.pack.cells.forEach((cell) => {
    const stateId = (cell as Cell & { state?: number }).state;
    if (typeof stateId !== "number" || stateId <= 0) {
      return;
    }

    const existing = cellIdsByStateId.get(stateId);
    if (existing) {
      existing.push(cell.i);
      return;
    }

    cellIdsByStateId.set(stateId, [cell.i]);
  });

  const countryShapes = mapData.pack.states
    .filter((state): state is State =>
      Boolean(state && typeof state.i === "number"),
    )
    .filter((state) => !state.removed && state.i > 0)
    .map((state) => {
      const cellIds = cellIdsByStateId.get(state.i) ?? [];
      const stateName = state.name?.trim() || `State ${state.i}`;
      const edgeCounts = new Map<string, number>();
      const edgeVertices = new Map<string, [number, number]>();

      cellIds.forEach((cellId) => {
        const cell = cellById.get(cellId);
        if (!cell || cell.v.length < 2) {
          return;
        }

        for (let index = 0; index < cell.v.length; index += 1) {
          const a = cell.v[index];
          const b = cell.v[(index + 1) % cell.v.length];

          if (a < 0 || b < 0) {
            continue;
          }

          const edgeKey = a < b ? `${a}:${b}` : `${b}:${a}`;
          edgeCounts.set(edgeKey, (edgeCounts.get(edgeKey) ?? 0) + 1);

          if (!edgeVertices.has(edgeKey)) {
            edgeVertices.set(edgeKey, [a, b]);
          }
        }
      });

      const boundaryEdges = [...edgeCounts.entries()]
        .filter(([, count]) => count === 1)
        .map(([edgeKey]) => edgeVertices.get(edgeKey))
        .filter((edge): edge is [number, number] => Boolean(edge));

      const adjacency = new Map<number, number[]>();
      boundaryEdges.forEach(([a, b]) => {
        const aNeighbors = adjacency.get(a) ?? [];
        aNeighbors.push(b);
        adjacency.set(a, aNeighbors);

        const bNeighbors = adjacency.get(b) ?? [];
        bNeighbors.push(a);
        adjacency.set(b, bNeighbors);
      });

      const toEdgeKey = (a: number, b: number) =>
        a < b ? `${a}:${b}` : `${b}:${a}`;
      const remainingEdges = new Set(
        boundaryEdges.map(([a, b]) => toEdgeKey(a, b)),
      );
      const boundaryLoops: number[][] = [];

      while (remainingEdges.size > 0) {
        const [seedEdgeKey] = remainingEdges;
        if (!seedEdgeKey) {
          break;
        }

        const seedEdge = edgeVertices.get(seedEdgeKey);
        if (!seedEdge) {
          remainingEdges.delete(seedEdgeKey);
          continue;
        }

        const [start, next] = seedEdge;
        const loop: number[] = [start, next];
        let previous = start;
        let current = next;
        remainingEdges.delete(seedEdgeKey);

        while (current !== start) {
          const neighbors = adjacency.get(current) ?? [];
          const candidate =
            neighbors.find(
              (neighbor) =>
                neighbor !== previous &&
                remainingEdges.has(toEdgeKey(current, neighbor)),
            ) ??
            neighbors.find((neighbor) =>
              remainingEdges.has(toEdgeKey(current, neighbor)),
            );

          if (typeof candidate !== "number") {
            break;
          }

          const candidateEdgeKey = toEdgeKey(current, candidate);
          remainingEdges.delete(candidateEdgeKey);
          previous = current;
          current = candidate;
          loop.push(current);

          if (loop.length > boundaryEdges.length + 1) {
            break;
          }
        }

        if (loop.length >= 4 && loop[0] === loop[loop.length - 1]) {
          boundaryLoops.push(loop.slice(0, -1));
        }
      }

      const outlinePaths = boundaryLoops
        .map((vertexLoop) => toPath(vertexLoop))
        .filter((cellPath): cellPath is string => Boolean(cellPath));

      return {
        id: state.i,
        name: stateName,
        type: state.type?.trim() || "Unknown",
        cellCount: cellIds.length,
        paths: cellIds
          .map((cellId) => {
            const cell = cellById.get(cellId);
            return cell ? toPath(cell.v) : null;
          })
          .filter((cellPath): cellPath is string => Boolean(cellPath)),
        outlinePaths,
      };
    })
    .filter((state): state is CountryShape => state.paths.length > 0);

  return {
    info: mapData.info,
    viewWidth: VIEW_WIDTH,
    viewHeight,
    terrainPaths,
    zoneShapes,
    countryShapes,
  };
};

export const getLaUmaMapData = async () => {
  if (cachedMapData) return cachedMapData;

  if (!SOURCE_URL) {
    throw new Error("Missing LA_UMA_BLOB_URL environment variable.");
  }

  // const rawText = await fetch(SOURCE_FILE, "utf8");
  // const mapData = JSON.parse(sanitizeLoneSurrogates(rawText)) as LaUmaRawData;

  // cachedMapData = buildViewModel(mapData);
  // return cachedMapData;
  const response = await fetch(SOURCE_URL, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to load LA UMA blob data.");
  }

  const rawText = await response.text();
  const mapData = JSON.parse(sanitizeLoneSurrogates(rawText)) as LaUmaRawData;

  cachedMapData = buildViewModel(mapData);
  return cachedMapData;
};
