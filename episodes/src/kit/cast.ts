// The four Lab Club mascots: names, display names and on-screen colours (UI chips, chart lines, set accents).
// Pure data, safe to import from node scripts.
export const MASCOTS = ["zuzu", "anna", "lumi", "miyu"] as const;
export type Mascot = (typeof MASCOTS)[number];

export const MASCOT_COLORS: Record<Mascot, string> = {
  zuzu: "#f2bf3b",
  anna: "#f27096",
  lumi: "#80adf2",
  miyu: "#6e4a8f",
};

export const MASCOT_NAMES: Record<Mascot, string> = {
  zuzu: "Zuzu",
  anna: "Anna",
  lumi: "Lumi",
  miyu: "Miyu",
};
