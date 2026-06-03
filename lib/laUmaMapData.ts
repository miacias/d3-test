import { readFile } from "node:fs/promises";
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
};

export type LaUmaMapViewModel = {
  info: LaUmaRawData["info"];
  viewWidth: number;
  viewHeight: number;
  terrainPaths: TerrainPath[];
  zoneShapes: ZoneShape[];
  countryShapes: CountryShape[];
};

const SOURCE_FILE = path.join(process.cwd(), "data", "La Uma Full 2026-06-03-02-24.json");
const VIEW_WIDTH = 960;
const PADDING = 24;

let cachedMapData: LaUmaMapViewModel | null = null;

const sanitizeLoneSurrogates = (jsonText: string) =>
  jsonText
    .replace(/\\u(d[89ab][0-9a-f]{2})(?!\\u[dD][c-fC-F][0-9a-f]{2})/gi, "\\uFFFD")
    .replace(/(?<!\\u[dD][89abAB][0-9a-f]{2})\\u(d[c-f][0-9a-f]{2})/gi, "\\uFFFD");

const buildViewModel = (mapData: LaUmaRawData): LaUmaMapViewModel => {
  const viewHeight = Math.round((mapData.info.height / mapData.info.width) * VIEW_WIDTH);
  const xScale = d3.scaleLinear([0, mapData.info.width], [PADDING, VIEW_WIDTH - PADDING]);
  const yScale = d3.scaleLinear([0, mapData.info.height], [PADDING, viewHeight - PADDING]);
  const line = d3
    .line<Point>()
    .x(([x]) => xScale(x))
    .y(([, y]) => yScale(y))
    .curve(d3.curveLinearClosed);

  const vertexById = new Map(mapData.pack.vertices.map((vertex) => [vertex.i, vertex]));
  const cellById = new Map(mapData.pack.cells.map((cell) => [cell.i, cell]));

  const toPath = (vertexIds: number[]) => {
    const points = vertexIds
      .map((vertexId) => vertexById.get(vertexId)?.p)
      .filter((point): point is Point => Array.isArray(point) && point.length === 2);

    if (points.length < 3) {
      return null;
    }

    return line(points) ?? null;
  };

  const terrainPaths = mapData.pack.features
    .filter((feature): feature is MapFeature => Boolean(feature && feature.vertices?.length))
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
    .filter((state): state is State => Boolean(state && typeof state.i === "number"))
    .filter((state) => !state.removed && state.i > 0)
    .map((state) => {
      const cellIds = cellIdsByStateId.get(state.i) ?? [];
      const stateName = state.name?.trim() || `State ${state.i}`;

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
  if (cachedMapData) {
    return cachedMapData;
  }

  const rawText = await readFile(SOURCE_FILE, "utf8");
  const mapData = JSON.parse(sanitizeLoneSurrogates(rawText)) as LaUmaRawData;

  cachedMapData = buildViewModel(mapData);
  return cachedMapData;
};
