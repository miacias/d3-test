export type MapRoute = {
  href: string;
  label: string;
  description: string;
};

export const MAP_ROUTES: MapRoute[] = [
  {
    href: "/maps/animated-zoom",
    label: "Animated Zoom",
    description:
      "Auto-focuses and zooms into countries, with pause and drag support.",
  },
  {
    href: "/maps/versor-dragging-zoom",
    label: "Versor Drag + Zoom",
    description:
      "Orthographic globe with smooth versor dragging and zoom controls.",
  },
  {
    href: "/maps/versor-dragging",
    label: "Versor Drag",
    description: "Drag-only orthographic globe using versor rotation math.",
  },
  {
    href: "/maps/static",
    label: "Static Map",
    description: "Natural Earth world map with graticules on a fixed canvas.",
  },
  {
    href: "/maps/hover-rotate",
    label: "Hover Map",
    description:
      "Albers USA projection of the US that highlights states on hover, implemented with D3's geoAlbersUsa and geoPath.",
  },
];
