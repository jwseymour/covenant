/**
 * Realm visual configuration — colours, materials, and shapes
 * matching each realm's lore identity.
 *
 * lore_complete.md §4:
 * - Dominion: geometric, monumental, grey stone
 * - Entropy: organic, decaying/blooming, shifting colours
 * - Communion: flowing, interconnected, translucent
 * - Wrath: fiery, volcanic, sharp edges
 * - Memory: layered, dense, archival gold/amber
 */

import type { RealmId } from '@shattered-covenant/shared';

export interface RealmVisualConfig {
  /** Primary colour (hex). */
  color: string;
  /** Emissive glow colour. */
  emissive: string;
  /** Emissive intensity. */
  emissiveIntensity: number;
  /** Secondary/accent colour for particles and effects. */
  accent: string;
  /** Display name. */
  name: string;
  /** Short lore description for UI. */
  description: string;
  /** Geometry type hint for the realm body. */
  shape: 'dodecahedron' | 'icosahedron' | 'sphere' | 'octahedron' | 'box';
  /** Base scale multiplier. */
  scale: number;
  /** Rotation speed (radians per frame). */
  rotationSpeed: number;
  /** Opacity of the outer shell (0–1). */
  shellOpacity: number;
  /** Whether to show inner glow mesh. */
  innerGlow: boolean;
}

export const REALM_VISUALS: Record<RealmId, RealmVisualConfig> = {
  dominion: {
    color: '#5a6882',
    emissive: '#3a4a66',
    emissiveIntensity: 0.4,
    accent: '#8899bb',
    name: 'The Eternal Hierarchy',
    description: 'Geometric order. Grey stone and iron law.',
    shape: 'dodecahedron',
    scale: 1.1,
    rotationSpeed: 0.001,
    shellOpacity: 0.85,
    innerGlow: true,
  },
  entropy: {
    color: '#7a4a7a',
    emissive: '#9b3a8b',
    emissiveIntensity: 0.6,
    accent: '#cc66bb',
    name: 'The Ever-Dying Land',
    description: 'Perpetual decay and rebirth. Nothing persists.',
    shape: 'icosahedron',
    scale: 0.95,
    rotationSpeed: 0.004,
    shellOpacity: 0.65,
    innerGlow: true,
  },
  communion: {
    color: '#3a7a5a',
    emissive: '#22aa66',
    emissiveIntensity: 0.5,
    accent: '#66ddaa',
    name: 'The Interwoven',
    description: 'Boundaries dissolved. All things connected.',
    shape: 'sphere',
    scale: 1.0,
    rotationSpeed: 0.002,
    shellOpacity: 0.55,
    innerGlow: true,
  },
  wrath: {
    color: '#8a3a2a',
    emissive: '#cc4422',
    emissiveIntensity: 0.7,
    accent: '#ff6644',
    name: 'The Crucible',
    description: 'Perpetual conflict. Strength is the only truth.',
    shape: 'octahedron',
    scale: 1.05,
    rotationSpeed: 0.003,
    shellOpacity: 0.8,
    innerGlow: true,
  },
  memory: {
    color: '#8a7a4a',
    emissive: '#bbaa55',
    emissiveIntensity: 0.45,
    accent: '#ddcc88',
    name: 'The Archive',
    description: 'Nothing forgotten. Crushed under the weight of ages.',
    shape: 'box',
    scale: 1.0,
    rotationSpeed: 0.0008,
    shellOpacity: 0.75,
    innerGlow: true,
  },
};

/** Get all realm IDs for iteration. */
export const REALM_IDS: RealmId[] = ['dominion', 'entropy', 'communion', 'wrath', 'memory'];
