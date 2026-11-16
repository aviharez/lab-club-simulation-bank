// Loads the mascot actors (GLB + clips + face textures) from the synced manifest.
// Call OUTSIDE <ThreeCanvas> so each actor's delayRender is registered before capture.
//
//   const cast = useCast(["miyu", "anna", "lumi", "zuzu"]);   // in the order you want them
//   cast[0].meta / cast[0].actor (null until loaded) / cast[0].color
import manifest from "../../public/mascots/manifest.json";
import { useActor, type ActorMeta, type LoadedActor } from "../actors/Actor";
import { MASCOT_COLORS, MASCOT_NAMES, type Mascot } from "./cast";

const chars = manifest.characters as unknown as Record<
  Mascot,
  { actor: ActorMeta }
>;
/** Stable meta objects: useActor's effect depends on their identity. */
export const ACTOR_META: Record<Mascot, ActorMeta> = {
  zuzu: chars.zuzu.actor,
  anna: chars.anna.actor,
  lumi: chars.lumi.actor,
  miyu: chars.miyu.actor,
};

export type CastMember = {
  name: Mascot;
  display: string;
  meta: ActorMeta;
  actor: LoadedActor | null;
  color: string;
};

/** All four actors are always loaded (hooks need a fixed call order); `names` picks and orders the result. */
export const useCast = (names: readonly Mascot[]): CastMember[] => {
  const loaded: Record<Mascot, LoadedActor | null> = {
    miyu: useActor(ACTOR_META.miyu),
    anna: useActor(ACTOR_META.anna),
    lumi: useActor(ACTOR_META.lumi),
    zuzu: useActor(ACTOR_META.zuzu),
  };
  return names.map((name) => ({
    name,
    display: MASCOT_NAMES[name],
    meta: ACTOR_META[name],
    actor: loaded[name],
    color: MASCOT_COLORS[name],
  }));
};
