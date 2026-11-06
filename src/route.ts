import { WIDTH } from "./actors.ts";

/**
 * The run's route as data: each sector's name, banner subtitle, length and
 * waves. GameScene reads this table for the route panel, the banners, the
 * timing between sectors and every enemy spawn. After the last sector comes
 * the Warden.
 */

export type EnemyKind = "drone" | "dart" | "turret" | "lancer";

export interface EnemyStats {
  hp: number;
  score: number;
  radius: number;
  dropChance: number;
  canShoot: boolean;
}

export const ENEMIES: Record<EnemyKind, EnemyStats> = {
  drone: { hp: 2, score: 100, radius: 13, dropChance: 0.015, canShoot: true },
  dart: { hp: 1, score: 150, radius: 12, dropChance: 0.015, canShoot: false },
  turret: { hp: 12, score: 400, radius: 19, dropChance: 0.3, canShoot: true },
  lancer: { hp: 4, score: 250, radius: 15, dropChance: 0.06, canShoot: true },
};

/**
 * How a wave's enemies are arranged:
 * - line: side by side, all at once
 * - vee: side by side, the middle ones first
 * - column: one lane, one after another
 * - pincer: from both screen edges, two at a time
 */
export type Formation = "line" | "vee" | "column" | "pincer";

export interface Wave {
  /** Ticks after the sector begins when the wave starts. */
  at: number;
  kind: EnemyKind;
  count: number;
  formation: Formation;
  /** Center of a line or vee, or the lane of a column. Default: mid-screen. */
  x?: number;
}

export interface Sector {
  name: string;
  /** Shown under the sector's banner. */
  subtitle: string;
  /**
   * Ticks before the route moves on. It waits until then even if the sky is
   * clear, and for at most CLEAR_GRACE_TICKS more if enemies remain.
   */
  length: number;
  waves: Wave[];
}

export const CLEAR_GRACE_TICKS = 240;

export const SECTORS: Sector[] = [
  {
    name: "Outer Drift",
    subtitle: "Scouts ahead",
    length: 1560,
    waves: [
      { at: 60, kind: "drone", count: 4, formation: "line" },
      { at: 360, kind: "drone", count: 5, formation: "vee", x: 168 },
      { at: 660, kind: "drone", count: 5, formation: "vee", x: 312 },
      { at: 960, kind: "drone", count: 6, formation: "line" },
      { at: 1200, kind: "drone", count: 4, formation: "column", x: 120 },
      { at: 1260, kind: "drone", count: 4, formation: "column", x: 360 },
    ],
  },
  {
    name: "Shatter Belt",
    subtitle: "Divers incoming",
    length: 1800,
    waves: [
      { at: 60, kind: "drone", count: 6, formation: "vee" },
      { at: 300, kind: "dart", count: 4, formation: "line" },
      { at: 600, kind: "dart", count: 5, formation: "column", x: 144 },
      { at: 720, kind: "dart", count: 5, formation: "column", x: 336 },
      { at: 1020, kind: "drone", count: 7, formation: "line" },
      { at: 1140, kind: "dart", count: 5, formation: "vee" },
      { at: 1440, kind: "dart", count: 6, formation: "line" },
    ],
  },
  {
    name: "Gun Lanes",
    subtitle: "Turrets online",
    length: 1920,
    waves: [
      { at: 60, kind: "turret", count: 1, formation: "line" },
      { at: 240, kind: "drone", count: 6, formation: "vee" },
      { at: 540, kind: "turret", count: 2, formation: "line" },
      { at: 840, kind: "dart", count: 6, formation: "column" },
      { at: 1080, kind: "turret", count: 2, formation: "line" },
      { at: 1140, kind: "drone", count: 6, formation: "line" },
      { at: 1500, kind: "turret", count: 3, formation: "line" },
    ],
  },
  {
    name: "Lancer Gate",
    subtitle: "Crossfire",
    length: 1920,
    waves: [
      { at: 60, kind: "lancer", count: 4, formation: "pincer" },
      { at: 360, kind: "dart", count: 6, formation: "vee" },
      { at: 600, kind: "lancer", count: 6, formation: "pincer" },
      { at: 780, kind: "turret", count: 2, formation: "line" },
      { at: 1140, kind: "lancer", count: 6, formation: "pincer" },
      { at: 1260, kind: "drone", count: 8, formation: "vee" },
      { at: 1560, kind: "dart", count: 8, formation: "line" },
    ],
  },
  {
    name: "Last Approach",
    subtitle: "Everything they have",
    length: 2040,
    waves: [
      { at: 60, kind: "turret", count: 3, formation: "line" },
      { at: 180, kind: "lancer", count: 6, formation: "pincer" },
      { at: 540, kind: "dart", count: 6, formation: "column", x: 120 },
      { at: 540, kind: "dart", count: 6, formation: "column", x: 360 },
      { at: 900, kind: "drone", count: 9, formation: "vee" },
      { at: 1020, kind: "turret", count: 2, formation: "line" },
      { at: 1320, kind: "lancer", count: 8, formation: "pincer" },
      { at: 1560, kind: "dart", count: 8, formation: "vee" },
    ],
  },
];

/** One enemy to create: when (ticks into the sector) and where. */
export interface Spawn {
  at: number;
  kind: EnemyKind;
  x: number;
  y: number;
  /** 1 or -1: which way the enemy sways or flies. */
  side: number;
}

const ABOVE_SCREEN = -30;
const LINE_SPACING = 64;
const VEE_SPACING = 44;
const VEE_STAGGER = 10;
const COLUMN_STAGGER = 24;
const PINCER_STAGGER = 30;
const PINCER_TOP = 70;
const PINCER_ROW = 50;

/** Expands a wave into its enemies, in the order they must be created. */
export function layout(
  { at, kind, count, formation, x = WIDTH / 2 }: Wave,
): Spawn[] {
  const middle = (count - 1) / 2;
  return Array.from({ length: count }, (_, i): Spawn => {
    const side = i % 2 === 0 ? 1 : -1;
    const y = ABOVE_SCREEN;
    switch (formation) {
      case "line":
        return { at, kind, x: x + (i - middle) * LINE_SPACING, y, side };
      case "vee":
        return {
          at: at + Math.abs(i - middle) * VEE_STAGGER,
          kind,
          x: x + (i - middle) * VEE_SPACING,
          y,
          side,
        };
      case "column":
        return { at: at + i * COLUMN_STAGGER, kind, x, y, side };
      case "pincer": {
        const pair = Math.floor(i / 2);
        return {
          at: at + pair * PINCER_STAGGER,
          kind,
          x: side === 1 ? -30 : WIDTH + 30,
          y: PINCER_TOP + pair * PINCER_ROW,
          side,
        };
      }
    }
  });
}
