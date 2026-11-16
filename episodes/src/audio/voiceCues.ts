// Character voices driven by the acting. Reusable by every episode.
//
// Each actor's state (clip, expression, visible manga symbols) is sampled on every frame. A rule fires on the
// frame its trigger starts matching (a transition), and maps it to one of that character's voice reactions.
// Then the line-up is resolved so only one voice plays at a time:
//   - higher priority is placed first and never moves;
//   - a lower-priority voice that starts before a placed one is cut short (if enough of it is heard),
//     otherwise it is shifted to the next free slot (while its acting state still holds), otherwise dropped;
//   - the same reaction never repeats inside its cooldown;
//   - voices sharing a `group` (e.g. the CTA cheer) may overlap each other, staggered 3-6 frames.
// Everything that was shifted, cut or dropped is written to the log for the report.
import { voice, type AudioRef, type Character, type Reaction } from "./library.ts";
import type { Cue } from "./mix.ts";

export type ActingSample = { clip: string; expression: string; symbols: readonly string[] };

/** All given fields must match; `symbol` means "this manga symbol is visible". */
export type Trigger = { clip?: string; expression?: string; symbol?: string };

export type VoiceRule<C extends Character = Character> = {
  reaction: Reaction<C>;
  on: Trigger;
  label: string;
  /** higher wins a collision */
  priority: number;
  /** only fire inside this frame window */
  window?: [number, number];
  /** only the first time the trigger starts matching */
  once?: boolean;
  /** how far (frames) the voice may slide to find a free slot. Default 30. */
  maxShift?: number;
  volume?: number;
  /** play only this part of the file, in seconds [from, to] */
  slice?: [number, number];
  /** repeating rules: cycle through these parts of the file instead (e.g. breathe in / breathe out) */
  slices?: [number, number][];
  group?: string;
  /** instead of firing once, keep filling the time the trigger holds: one play every `every` frames, at least `minLen` long */
  repeat?: { every: number; minLen: number };
};

export type CastVoices = { [C in Character]?: { sample: (f: number) => ActingSample; rules: VoiceRule<C>[] } };

export type VoiceOptions = { duration: number; fps: number; /** frames before the same reaction may play again */ cooldown?: number; /** silent frames kept between two voices */ gap?: number; stagger?: [number, number]; /** default voice level (rules can override) */ volume?: number };

const matches = (s: ActingSample, t: Trigger) =>
  (t.clip === undefined || s.clip === t.clip) && (t.expression === undefined || s.expression === t.expression) && (t.symbol === undefined || s.symbols.includes(t.symbol));

type Candidate = { character: Character; rule: VoiceRule; file: AudioRef; at: number; len: number; until: number; slice?: [number, number] };

export const buildVoiceCues = (cast: CastVoices, opts: VoiceOptions): { cues: Cue[]; log: string[] } => {
  const { duration, fps, cooldown = 45, gap = 2, stagger = [3, 6], volume = 1 } = opts;
  const log: string[] = [];
  const candidates: Candidate[] = [];
  const fillers: Candidate[] = [];

  for (const character of Object.keys(cast) as Character[]) {
    const { sample, rules } = cast[character]!;
    const states = Array.from({ length: duration }, (_, f) => sample(f));
    for (const rule of rules as VoiceRule[]) {
      const file = voice(character, rule.reaction as never);
      const full = rule.slice ? rule.slice[1] - rule.slice[0] : file.duration;
      const len = Math.ceil(full * fps);
      const [w0, w1] = rule.window ?? [0, duration];
      let fired = false;
      for (let f = Math.max(1, w0); f < Math.min(duration, w1); f++) {
        if (!matches(states[f], rule.on) || matches(states[f - 1], rule.on)) continue;
        if (rule.once && fired) break;
        fired = true;
        let until = f;
        while (until < duration && matches(states[until], rule.on)) until++;
        (rule.repeat ? fillers : candidates).push({ character, rule, file, at: f, len, until, slice: rule.slice });
      }
    }
  }

  const placed: Cue[] = [];
  const name = (c: Candidate) => `${c.character}/${c.rule.reaction}`;
  const end = (p: Cue) => p.at + p.len!;
  const blockers = (c: Candidate, start: number, len: number) =>
    placed.filter((p) => !(c.rule.group && p.group === c.rule.group) && p.at < start + len + gap && start < end(p) + gap).sort((a, b) => a.at - b.at);
  const inCooldown = (c: Candidate, start: number) => placed.some((p) => p.character === c.character && p.reaction === c.rule.reaction && Math.abs(p.at - start) < cooldown);
  const put = (c: Candidate, at: number, len: number) => {
    const cut = len < c.len;
    placed.push({
      at,
      layer: "voice",
      file: c.file,
      volume: c.rule.volume ?? volume,
      label: `${c.rule.label} "${c.file.text}"`,
      offset: c.slice?.[0],
      len,
      fadeOut: cut ? 5 : c.slice ? 3 : 0,
      character: c.character,
      reaction: c.rule.reaction,
      group: c.rule.group,
    });
  };

  candidates.sort((a, b) => b.rule.priority - a.rule.priority || a.at - b.at);
  for (const c of candidates) {
    const maxShift = c.rule.maxShift ?? 30;
    const minAudible = Math.max(12, Math.round(c.len * 0.6));
    let start = c.at;
    for (;;) {
      if (inCooldown(c, start)) {
        log.push(`DROP  ${name(c)} @${c.at}: same reaction inside its ${cooldown}-frame cooldown`);
        break;
      }
      const b = blockers(c, start, c.len);
      if (!b.length) {
        put(c, start, c.len);
        if (start !== c.at) log.push(`SHIFT ${name(c)} @${c.at} -> @${start} (+${start - c.at}): slot taken by a higher-priority voice`);
        break;
      }
      const covering = b.filter((p) => p.at <= start);
      const room = b[0].at - gap - start;
      if (!covering.length && room >= minAudible) {
        put(c, start, room);
        log.push(`CUT   ${name(c)} @${start}: ${room}/${c.len} frames, fades out for ${b[0].character}/${b[0].reaction} @${b[0].at}${start !== c.at ? ` (shifted +${start - c.at})` : ""}`);
        break;
      }
      const next = Math.max(...(covering.length ? covering : b).map(end)) + gap;
      if (next - c.at > maxShift || next >= c.until) {
        const by = b.map((p) => `${p.character}/${p.reaction} @${p.at}`).join(", ");
        log.push(`DROP  ${name(c)} @${c.at}: collides with ${by}; ${next >= c.until ? "the acting moment is over by the next free slot" : `next free slot is +${next - c.at} frames (max ${maxShift})`}`);
        break;
      }
      start = next;
    }
  }

  // group moments: overlap allowed, but entries are staggered so they read as separate voices
  for (const group of new Set(placed.map((p) => p.group).filter(Boolean))) {
    const members = placed.filter((p) => p.group === group).sort((a, b) => a.at - b.at);
    for (let i = 1; i < members.length; i++) {
      const want = Math.min(members[i - 1].at + stagger[1], Math.max(members[i - 1].at + stagger[0], members[i].at));
      if (want !== members[i].at) {
        log.push(`SHIFT ${members[i].character}/${members[i].reaction} @${members[i].at} -> @${want}: ${group} group stagger ${stagger[0]}-${stagger[1]} frames`);
        members[i].at = want;
      }
    }
  }

  // repeating fillers (snores, humming...) take whatever is left while their trigger holds
  for (const c of fillers) {
    const { every, minLen } = c.rule.repeat!;
    let n = 0;
    for (let t = c.at; t + minLen <= c.until; ) {
      if (c.rule.slices) {
        c.slice = c.rule.slices[n % c.rule.slices.length];
        c.len = Math.ceil((c.slice[1] - c.slice[0]) * fps);
      }
      const b = blockers(c, t, c.len);
      const covering = b.filter((p) => p.at <= t);
      if (covering.length) {
        t = Math.max(...covering.map(end)) + gap;
        continue;
      }
      const room = Math.min(c.len, c.until - t, b.length ? b[0].at - gap - t : Infinity);
      if (room >= minLen) {
        put(c, t, room);
        n++;
        if (room < c.len) log.push(`CUT   ${name(c)} @${t}: ${room}/${c.len} frames, fades out for ${b.length ? `${b[0].character}/${b[0].reaction} @${b[0].at}` : "the end of the moment"}`);
        t += Math.max(every, cooldown);
      } else {
        t = b.length ? end(b[0]) + gap : c.until;
      }
    }
    const wanted = Math.max(1, Math.floor((c.until - c.at) / every));
    if (n < wanted) log.push(`DROP  ${name(c)}: ${wanted - n} of ${wanted} repeats between @${c.at} and @${c.until} had no free slot (other voices were playing)`);
  }

  return { cues: placed.sort((a, b) => a.at - b.at), log };
};

/** Checks used by the report: overlapping voices outside a shared group, and reactions repeating inside the cooldown. */
export const checkVoices = (cues: Cue[], cooldown = 45) => {
  const v = cues.filter((c) => c.layer === "voice").sort((a, b) => a.at - b.at);
  const overlaps: string[] = [];
  const repeats: string[] = [];
  for (let i = 0; i < v.length; i++)
    for (let j = i + 1; j < v.length; j++) {
      const [a, b] = [v[i], v[j]];
      if (b.at < a.at + a.len! && !(a.group && a.group === b.group)) overlaps.push(`${a.file.id} @${a.at}-${a.at + a.len!} overlaps ${b.file.id} @${b.at}`);
      if (a.character === b.character && a.reaction === b.reaction && b.at - a.at < cooldown) repeats.push(`${a.file.id} @${a.at} repeats @${b.at}`);
    }
  return { overlaps, repeats };
};
