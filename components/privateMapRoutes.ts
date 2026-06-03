export type MapRoute = {
  href: string;
  label: string;
  description: string;
};

export const PRIVATE_MAP_ROUTES: MapRoute[] = [
  {
    href: "/private/t3ridox-productions",
    label: "Private Maps",
    description: "Maps that require password entry.",
  },
];