import type { Episode } from "../mathrace/episode.ts";
import { ep01 } from "./ep01-math-race.ts";

/** Registry of Math Race episodes, keyed by id. Add new episode configs here. */
export const episodes: Record<string, Episode> = { [ep01.id]: ep01 };
