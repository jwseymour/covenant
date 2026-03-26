/**
 * Procedural graph generator — creates unique realm-specific board topologies.
 *
 * GDD §3.5: "Procedurally generated graph per realm."
 * Each realm feels structurally different based on its lore (lore_complete.md §4):
 *
 * - Dominion (The Eternal Hierarchy): geometric, orderly, concentric rings.
 *   Regular lattice-like structure, few random edges, many nodes.
 *
 * - Entropy (The Ever-Dying Land): organic, irregular, variable density.
 *   More random connections, some clusters, chaotic structure.
 *
 * - Communion (The Interwoven): highly connected, dense edges.
 *   Small diameter, every node reachable in few steps.
 *
 * - Wrath (The Crucible): fortress-like, clustered around strongholds.
 *   Contested borders, bottleneck paths between clusters.
 *
 * - Memory (The Archive): layered, deep rather than wide.
 *   Stacked structure, many nodes, moderate edges.
 */

import type { RealmId } from '../types/realm.js';
import type { NodeId, EdgeId, NodeType, GameNode, GameEdge, RealmGraph } from '../types/graph.js';

// ─── Seeded Random ──────────────────────────────────────────────

/**
 * Simple seeded PRNG (mulberry32). Deterministic graphs for the same seed.
 */
function createRandom(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Name Generators ────────────────────────────────────────────

const DOMINION_NAMES = [
  'The Spire of Edicts', 'Irongate', 'The Marble Court', 'Edict Hall',
  'The Warden\'s Keep', 'Seal-Crown', 'Pillar of Law', 'The Adjudicator',
  'Ordinal', 'The Compact Tower', 'Authority\'s Reach', 'The Registrar',
  'Throne-Root', 'The Chancellor\'s Gate', 'Domicile Prime', 'The Edict Stones',
  'Hierarch\'s Rest', 'The Bound Archive', 'Mandate', 'The Grey Pinnacle',
  'Sovereign\'s Ring', 'The Codex Garrison', 'Wardenship', 'The Iron Verdict',
  'The Ordained Seat', 'Lawhold', 'The Pillar Bastion', 'Decree-Spire',
];

const ENTROPY_NAMES = [
  'The Blooming Ruin', 'Ashen Cradle', 'Shifting Bazaar', 'Moth-Gate',
  'The Dissolving Palace', 'Reborn Hollow', 'The Last Market', 'Ember Drift',
  'Crumble-Song', 'The New Ruin', 'Twice-Fallen', 'Silt-Crown',
  'The Rotbloom', 'Fading Glory', 'Ephemera', 'The Quick Grave',
  'Dust Song', 'The Thrice-Built', 'Rebirth Stone', 'The Changing Gate',
  'Wilt Reach', 'The Unnamed Ruin', 'Brief Throne', 'Splint-Hall',
];

const COMMUNION_NAMES = [
  'The Woven Way', 'Threadheart', 'The Open Hall', 'Mindpool',
  'Root-Communion', 'The Shared Flame', 'Tide-Link', 'Breathweave',
  'The Collective', 'Whisper-Knot', 'Bond-Root', 'The Merging',
  'Flow-Moot', 'The Unbordered', 'Soulthread', 'The Confluence',
  'Twin-Heart', 'The Empathic Well', 'Weave-Song', 'Link-Bridge',
  'The Common Dream', 'Pact-Stone', 'Thought-Hall', 'The Shared Root',
];

const WRATH_NAMES = [
  'The Forge of Fury', 'Blood-Anvil', 'Storm-Perch', 'The Proving Ground',
  'Ashfall Keep', 'The Crucible Gate', 'War-Song Hold', 'Iron Storm',
  'Flame-Crown', 'The Battle Forge', 'Rage-Spire', 'The Victor\'s Mark',
  'Shatter-Hold', 'The Burning Wall', 'Siege-Born', 'The Challenge Stone',
  'Wrath\'s Teeth', 'The Tempest Throne', 'Fire-Maw', 'Blood-Crown',
  'The War-Temple', 'Thunder-Keep', 'Strife-Gate', 'The Forged Path',
];

const MEMORY_NAMES = [
  'The First Library', 'Echo-Vault', 'The Weight of Ages', 'Archive Prime',
  'Remembrance Hall', 'The Layered City', 'Amber-Truth', 'The Chronicle',
  'Memory-Stone', 'The Preserved', 'Deep Record', 'The Undying Script',
  'Ghost-Archive', 'The Patient Tower', 'Seal of Ages', 'The Endless Index',
  'Layer-Root', 'The Scholar\'s Burden', 'Inscription-Spire', 'The Recalled',
  'History-Heart', 'The Weight Tower', 'Truth-Hold', 'The Echoing Archive',
];

const REALM_NAMES: Record<RealmId, string[]> = {
  dominion: DOMINION_NAMES,
  entropy: ENTROPY_NAMES,
  communion: COMMUNION_NAMES,
  wrath: WRATH_NAMES,
  memory: MEMORY_NAMES,
};

// ─── Configuration Per Realm ────────────────────────────────────

interface RealmGraphConfig {
  /** Total node count (approximate). */
  nodeCount: number;
  /** Target edges per node (average connectivity). */
  avgConnectivity: number;
  /** Number of rite site nodes. GDD §4.5: "start with 2 per realm". */
  riteSites: number;
  /** Number of relic location nodes. */
  relicLocations: number;
  /** Proportion of cities vs landmarks. */
  cityRatio: number;
}

const REALM_CONFIG: Record<RealmId, RealmGraphConfig> = {
  // Dominion: many nodes, orderly, moderate connectivity
  dominion: { nodeCount: 22, avgConnectivity: 2.8, riteSites: 2, relicLocations: 2, cityRatio: 0.7 },
  // Entropy: fewer nodes, variable density, moderate connectivity
  entropy: { nodeCount: 18, avgConnectivity: 2.5, riteSites: 2, relicLocations: 1, cityRatio: 0.5 },
  // Communion: moderate nodes, very high connectivity
  communion: { nodeCount: 20, avgConnectivity: 4.0, riteSites: 2, relicLocations: 1, cityRatio: 0.55 },
  // Wrath: moderate nodes, low connectivity (bottlenecks)
  wrath: { nodeCount: 20, avgConnectivity: 2.3, riteSites: 2, relicLocations: 2, cityRatio: 0.6 },
  // Memory: many nodes, deep not wide, moderate connectivity
  memory: { nodeCount: 24, avgConnectivity: 2.6, riteSites: 2, relicLocations: 2, cityRatio: 0.65 },
};

// ─── Helpers ────────────────────────────────────────────────────

function makeNodeId(realmId: RealmId, index: number): NodeId {
  return `${realmId}-node-${index}`;
}

function makeEdgeId(realmId: RealmId, index: number): EdgeId {
  return `${realmId}-edge-${index}`;
}

/**
 * Determine a node's type based on its index and the realm's config,
 * with rite sites and relic locations placed at strategic positions
 * (not random). GDD §3.5: "concrete reasons to expand".
 */
function assignNodeType(
  index: number,
  totalNodes: number,
  config: RealmGraphConfig,
  rand: () => number,
): NodeType {
  // Place rite sites at strategic positions (roughly evenly spaced)
  const riteSiteInterval = Math.floor(totalNodes / (config.riteSites + 1));
  for (let i = 1; i <= config.riteSites; i++) {
    if (index === riteSiteInterval * i) return 'rite_site';
  }

  // Place relic locations at strategic positions (different from rite sites)
  const relicOffset = Math.floor(riteSiteInterval / 2);
  for (let i = 0; i < config.relicLocations; i++) {
    const pos = relicOffset + riteSiteInterval * i;
    if (index === pos && pos < totalNodes) return 'relic_location';
  }

  // Remaining nodes are cities or landmarks
  return rand() < config.cityRatio ? 'city' : 'landmark';
}

/** Euclidean distance between two 2D positions. */
function dist2d(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Ensure graph connectivity via BFS. Returns a set of unreachable node indices.
 */
function findUnreachableNodes(
  nodeCount: number,
  adjacency: Map<number, Set<number>>,
): Set<number> {
  if (nodeCount === 0) return new Set();
  const visited = new Set<number>();
  const queue = [0];
  visited.add(0);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const neighbours = adjacency.get(current);
    if (neighbours) {
      for (const n of neighbours) {
        if (!visited.has(n)) {
          visited.add(n);
          queue.push(n);
        }
      }
    }
  }

  const unreachable = new Set<number>();
  for (let i = 0; i < nodeCount; i++) {
    if (!visited.has(i)) unreachable.add(i);
  }
  return unreachable;
}

// ─── Topology Generators (Per-Realm) ────────────────────────────

/**
 * Dominion (The Eternal Hierarchy) — geometric, orderly, concentric rings.
 * lore §4.1: "Everything is geometric — circles, axes, radial symmetry."
 * "Cities built like declarations — monumental, symmetrical."
 */
function generateDominionPositions(count: number, rand: () => number): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = [];
  // Central authority node
  positions.push({ x: 500, y: 500 });

  // Concentric rings
  const rings = 3;
  const remaining = count - 1;
  const perRing = Math.ceil(remaining / rings);

  for (let ring = 1; ring <= rings; ring++) {
    const radius = ring * 150;
    const nodesInRing = Math.min(perRing, count - positions.length);
    for (let i = 0; i < nodesInRing; i++) {
      const angle = (2 * Math.PI * i) / nodesInRing + (rand() * 0.15); // slight irregularity
      positions.push({
        x: 500 + radius * Math.cos(angle),
        y: 500 + radius * Math.sin(angle),
      });
    }
  }
  return positions;
}

function generateDominionEdges(
  nodes: { x: number; y: number }[],
  rand: () => number,
): [number, number][] {
  const edges: [number, number][] = [];
  const edgeSet = new Set<string>();
  const addEdge = (a: number, b: number) => {
    const key = a < b ? `${a}-${b}` : `${b}-${a}`;
    if (!edgeSet.has(key) && a !== b) { edgeSet.add(key); edges.push([a, b]); }
  };

  // Connect centre to inner ring
  const innerCount = Math.min(7, nodes.length - 1);
  for (let i = 1; i <= innerCount; i++) addEdge(0, i);

  // Connect within rings and between adjacent rings
  const rings = 3;
  const remaining = nodes.length - 1;
  const perRing = Math.ceil(remaining / rings);
  for (let ring = 0; ring < rings; ring++) {
    const start = 1 + ring * perRing;
    const end = Math.min(start + perRing, nodes.length);
    // Connect sequentially within ring (circular)
    for (let i = start; i < end; i++) {
      const next = i + 1 < end ? i + 1 : start;
      addEdge(i, next);
    }
    // Connect to next ring (radial edges)
    if (ring < rings - 1) {
      const nextStart = 1 + (ring + 1) * perRing;
      const nextEnd = Math.min(nextStart + perRing, nodes.length);
      for (let i = start; i < end; i++) {
        const target = nextStart + Math.floor(((i - start) / (end - start)) * (nextEnd - nextStart));
        if (target < nodes.length) addEdge(i, target);
      }
    }
  }

  // Few random long-range edges (the rigid bureaucracy still has some shortcuts)
  for (let i = 0; i < 2; i++) {
    const a = Math.floor(rand() * nodes.length);
    const b = Math.floor(rand() * nodes.length);
    if (a !== b) addEdge(a, b);
  }

  return edges;
}

/**
 * Entropy (The Ever-Dying Land) — organic, irregular, chaotic.
 * lore §4.2: "Ruins covered in new growth. Impermanent."
 */
function generateEntropyPositions(count: number, rand: () => number): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = [];
  // Scattered randomly with some clustering
  const clusterCentres = [
    { x: 300, y: 300 }, { x: 700, y: 400 }, { x: 400, y: 700 },
  ];

  for (let i = 0; i < count; i++) {
    const cluster = clusterCentres[i % clusterCentres.length];
    positions.push({
      x: cluster.x + (rand() - 0.5) * 350,
      y: cluster.y + (rand() - 0.5) * 350,
    });
  }
  return positions;
}

function generateEntropyEdges(
  nodes: { x: number; y: number }[],
  rand: () => number,
): [number, number][] {
  const edges: [number, number][] = [];
  const edgeSet = new Set<string>();
  const addEdge = (a: number, b: number) => {
    const key = a < b ? `${a}-${b}` : `${b}-${a}`;
    if (!edgeSet.has(key) && a !== b) { edgeSet.add(key); edges.push([a, b]); }
  };

  // Connect nearest neighbours (organic growth)
  for (let i = 0; i < nodes.length; i++) {
    const distances = nodes.map((n, j) => ({ j, d: dist2d(nodes[i], n) }))
      .filter((d) => d.j !== i)
      .sort((a, b) => a.d - b.d);

    // Connect to 1–3 nearest neighbours (variable density)
    const connectCount = 1 + Math.floor(rand() * 2);
    for (let k = 0; k < connectCount && k < distances.length; k++) {
      addEdge(i, distances[k].j);
    }
  }

  // A few random long-range edges (chaotic connections)
  for (let i = 0; i < 3; i++) {
    addEdge(Math.floor(rand() * nodes.length), Math.floor(rand() * nodes.length));
  }

  return edges;
}

/**
 * Communion (The Interwoven) — highly connected mesh.
 * lore §4.3: "Networks of roads, rivers, root systems linking everything."
 * "No walls. No gates. No clear edges."
 */
function generateCommunionPositions(count: number, rand: () => number): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = [];
  // Fairly even distribution (no clear clusters — everything is connected)
  const gridSize = Math.ceil(Math.sqrt(count));
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / gridSize);
    const col = i % gridSize;
    positions.push({
      x: 100 + (col * 800 / gridSize) + (rand() - 0.5) * 100,
      y: 100 + (row * 800 / gridSize) + (rand() - 0.5) * 100,
    });
  }
  return positions;
}

function generateCommunionEdges(
  nodes: { x: number; y: number }[],
  rand: () => number,
): [number, number][] {
  const edges: [number, number][] = [];
  const edgeSet = new Set<string>();
  const addEdge = (a: number, b: number) => {
    const key = a < b ? `${a}-${b}` : `${b}-${a}`;
    if (!edgeSet.has(key) && a !== b) { edgeSet.add(key); edges.push([a, b]); }
  };

  // Connect to MANY nearest neighbours (dense mesh)
  for (let i = 0; i < nodes.length; i++) {
    const distances = nodes.map((n, j) => ({ j, d: dist2d(nodes[i], n) }))
      .filter((d) => d.j !== i)
      .sort((a, b) => a.d - b.d);

    // Connect to 3–5 nearest neighbours (very dense)
    const connectCount = 3 + Math.floor(rand() * 3);
    for (let k = 0; k < connectCount && k < distances.length; k++) {
      addEdge(i, distances[k].j);
    }
  }

  // Extra random connections (everything bleeds together)
  for (let i = 0; i < 5; i++) {
    addEdge(Math.floor(rand() * nodes.length), Math.floor(rand() * nodes.length));
  }

  return edges;
}

/**
 * Wrath (The Crucible) — fortress clusters with bottleneck connections.
 * lore §4.4: "Every settlement is a fortress. Every border is contested."
 * "Cities are built like weapons."
 */
function generateWrathPositions(count: number, rand: () => number): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = [];
  // 4 fortress clusters with fortress-centre nodes
  const fortresses = [
    { x: 250, y: 250 }, { x: 750, y: 250 },
    { x: 250, y: 750 }, { x: 750, y: 750 },
  ];

  const perFortress = Math.ceil(count / fortresses.length);
  for (let i = 0; i < count; i++) {
    const fortress = fortresses[Math.floor(i / perFortress)];
    if (i % perFortress === 0) {
      // Fortress centre
      positions.push({ x: fortress.x, y: fortress.y });
    } else {
      // Surrounding nodes (tight cluster)
      const angle = rand() * Math.PI * 2;
      const r = 60 + rand() * 100;
      positions.push({
        x: fortress.x + r * Math.cos(angle),
        y: fortress.y + r * Math.sin(angle),
      });
    }
  }
  return positions;
}

function generateWrathEdges(
  nodes: { x: number; y: number }[],
  rand: () => number,
): [number, number][] {
  const edges: [number, number][] = [];
  const edgeSet = new Set<string>();
  const addEdge = (a: number, b: number) => {
    const key = a < b ? `${a}-${b}` : `${b}-${a}`;
    if (!edgeSet.has(key) && a !== b) { edgeSet.add(key); edges.push([a, b]); }
  };

  const perFortress = Math.ceil(nodes.length / 4);

  // Dense connections within each fortress cluster
  for (let f = 0; f < 4; f++) {
    const start = f * perFortress;
    const end = Math.min(start + perFortress, nodes.length);
    // Connect fortress centre to all its members
    for (let i = start + 1; i < end; i++) {
      addEdge(start, i);
    }
    // Connect members to each other (some)
    for (let i = start + 1; i < end; i++) {
      if (i + 1 < end) addEdge(i, i + 1);
    }
  }

  // Bottleneck connections between fortress clusters (1-2 bridges each)
  // These are the contested borders
  for (let f1 = 0; f1 < 4; f1++) {
    for (let f2 = f1 + 1; f2 < 4; f2++) {
      const start1 = f1 * perFortress;
      const end1 = Math.min(start1 + perFortress, nodes.length);
      const start2 = f2 * perFortress;
      const end2 = Math.min(start2 + perFortress, nodes.length);

      // Find closest pair between clusters for the bridge
      let bestDist = Infinity;
      let bestPair: [number, number] = [start1, start2];
      for (let i = start1; i < end1; i++) {
        for (let j = start2; j < end2; j++) {
          const d = dist2d(nodes[i], nodes[j]);
          if (d < bestDist) { bestDist = d; bestPair = [i, j]; }
        }
      }
      addEdge(bestPair[0], bestPair[1]);

      // Sometimes add a second bridge
      if (rand() > 0.5 && end1 - start1 > 2 && end2 - start2 > 2) {
        const a = start1 + 1 + Math.floor(rand() * (end1 - start1 - 1));
        const b = start2 + 1 + Math.floor(rand() * (end2 - start2 - 1));
        addEdge(a, b);
      }
    }
  }

  return edges;
}

/**
 * Memory (The Archive) — layered, deep, dense.
 * lore §4.5: "Cities built on top of cities, each layer visible through the next."
 * Deep structure: many layers, moderate width per layer.
 */
function generateMemoryPositions(count: number, rand: () => number): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = [];
  // 5 horizontal layers (archaeological strata)
  const layers = 5;
  const perLayer = Math.ceil(count / layers);

  for (let layer = 0; layer < layers; layer++) {
    const y = 100 + layer * 180;
    const nodesInLayer = Math.min(perLayer, count - positions.length);
    for (let i = 0; i < nodesInLayer; i++) {
      positions.push({
        x: 100 + (i * 800 / nodesInLayer) + (rand() - 0.5) * 40,
        y: y + (rand() - 0.5) * 30,
      });
    }
  }
  return positions;
}

function generateMemoryEdges(
  nodes: { x: number; y: number }[],
  rand: () => number,
): [number, number][] {
  const edges: [number, number][] = [];
  const edgeSet = new Set<string>();
  const addEdge = (a: number, b: number) => {
    const key = a < b ? `${a}-${b}` : `${b}-${a}`;
    if (!edgeSet.has(key) && a !== b) { edgeSet.add(key); edges.push([a, b]); }
  };

  const layers = 5;
  const perLayer = Math.ceil(nodes.length / layers);

  // Connect within each layer (horizontal)
  for (let layer = 0; layer < layers; layer++) {
    const start = layer * perLayer;
    const end = Math.min(start + perLayer, nodes.length);
    for (let i = start; i < end - 1; i++) {
      addEdge(i, i + 1);
    }
  }

  // Connect between adjacent layers (vertical — digging deeper)
  for (let layer = 0; layer < layers - 1; layer++) {
    const start = layer * perLayer;
    const end = Math.min(start + perLayer, nodes.length);
    const nextStart = (layer + 1) * perLayer;
    const nextEnd = Math.min(nextStart + perLayer, nodes.length);

    for (let i = start; i < end; i++) {
      // Connect to the node directly below (or nearby below)
      const below = nextStart + (i - start);
      if (below < nextEnd) addEdge(i, below);
      // Sometimes connect diagonally too
      if (rand() > 0.6 && below + 1 < nextEnd) addEdge(i, below + 1);
    }
  }

  // A few skip-layer connections (ancient shafts)
  for (let i = 0; i < 3; i++) {
    const a = Math.floor(rand() * Math.floor(nodes.length * 0.4));
    const b = Math.floor(nodes.length * 0.6) + Math.floor(rand() * Math.floor(nodes.length * 0.4));
    if (b < nodes.length) addEdge(a, b);
  }

  return edges;
}

// ─── Main Generator ─────────────────────────────────────────────

// Dispatch tables
const POSITION_GENERATORS: Record<RealmId, (count: number, rand: () => number) => { x: number; y: number }[]> = {
  dominion: generateDominionPositions,
  entropy: generateEntropyPositions,
  communion: generateCommunionPositions,
  wrath: generateWrathPositions,
  memory: generateMemoryPositions,
};

const EDGE_GENERATORS: Record<RealmId, (nodes: { x: number; y: number }[], rand: () => number) => [number, number][]> = {
  dominion: generateDominionEdges,
  entropy: generateEntropyEdges,
  communion: generateCommunionEdges,
  wrath: generateWrathEdges,
  memory: generateMemoryEdges,
};

/**
 * Generate a procedural graph for a given realm.
 *
 * @param realmId - Which realm to generate
 * @param seed - Random seed for deterministic generation
 * @returns A complete RealmGraph with nodes, edges, and proper types
 */
export function generateRealmGraph(realmId: RealmId, seed: number = 42): RealmGraph {
  const rand = createRandom(seed);
  const config = REALM_CONFIG[realmId];
  const names = [...REALM_NAMES[realmId]];

  // Shuffle names
  for (let i = names.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [names[i], names[j]] = [names[j], names[i]];
  }

  // Generate positions using realm-specific layout
  const positions = POSITION_GENERATORS[realmId](config.nodeCount, rand);
  const nodeCount = positions.length;

  // Create nodes
  const nodes: GameNode[] = positions.map((pos, i) => {
    const nodeType = assignNodeType(i, nodeCount, config, rand);
    return {
      id: makeNodeId(realmId, i),
      realmId,
      type: nodeType,
      name: names[i % names.length],
      position: pos,
      population: nodeType === 'city' ? 500 + Math.floor(rand() * 1500)
        : nodeType === 'landmark' ? 100 + Math.floor(rand() * 400)
          : 200 + Math.floor(rand() * 300),
      depopulated: false,
      depopulationTurnsRemaining: 0,
      availableRiteIds: nodeType === 'rite_site' ? [`${realmId}-rite-${i}`] : undefined,
      relicId: nodeType === 'relic_location' ? (
        realmId === 'dominion' ? 'relic_crown_of_authority' :
        realmId === 'entropy' ? 'relic_chalice_of_entropy' :
        realmId === 'communion' ? 'relic_woven_strand' :
        realmId === 'wrath' ? 'relic_blade_of_wrath' :
        realmId === 'memory' ? 'relic_tome_of_memory' :
        'relic_neutral_gem'
      ) : undefined,
      relicClaimed: false,
    };
  });

  // Generate edges using realm-specific topology
  const rawEdges = EDGE_GENERATORS[realmId](positions, rand);

  // Build adjacency for connectivity check
  const adjacency = new Map<number, Set<number>>();
  for (let i = 0; i < nodeCount; i++) adjacency.set(i, new Set());
  for (const [a, b] of rawEdges) {
    adjacency.get(a)!.add(b);
    adjacency.get(b)!.add(a);
  }

  // Ensure connectivity — connect any orphan components
  const unreachable = findUnreachableNodes(nodeCount, adjacency);
  const extraEdges: [number, number][] = [];
  for (const orphan of unreachable) {
    // Connect to the nearest reachable node
    let bestDist = Infinity;
    let bestTarget = 0;
    for (let j = 0; j < nodeCount; j++) {
      if (!unreachable.has(j)) {
        const d = dist2d(positions[orphan], positions[j]);
        if (d < bestDist) { bestDist = d; bestTarget = j; }
      }
    }
    extraEdges.push([orphan, bestTarget]);
    // Update adjacency for subsequent orphans
    adjacency.get(orphan)!.add(bestTarget);
    adjacency.get(bestTarget)!.add(orphan);
    unreachable.delete(orphan);
  }

  const allRawEdges = [...rawEdges, ...extraEdges];

  // Deduplicate edges
  const edgeSet = new Set<string>();
  const uniqueEdges: [number, number][] = [];
  for (const [a, b] of allRawEdges) {
    const key = a < b ? `${a}-${b}` : `${b}-${a}`;
    if (!edgeSet.has(key) && a !== b && a < nodeCount && b < nodeCount) {
      edgeSet.add(key);
      uniqueEdges.push([a, b]);
    }
  }

  // Create typed edges with weights
  const edges: GameEdge[] = uniqueEdges.map(([a, b], i) => ({
    id: makeEdgeId(realmId, i),
    sourceNodeId: nodes[a].id,
    targetNodeId: nodes[b].id,
    weight: Math.round(dist2d(positions[a], positions[b]) / 50 * 10) / 10 || 1,
    temporary: false,
    severed: false,
  }));

  return { realmId, nodes, edges };
}

/**
 * Generate graphs for all five realms.
 * @param baseSeed - Base seed (each realm gets a derived seed)
 */
export function generateAllRealmGraphs(
  baseSeed: number = 42,
): Record<RealmId, RealmGraph> {
  const realms: RealmId[] = ['dominion', 'entropy', 'communion', 'wrath', 'memory'];
  const result: Partial<Record<RealmId, RealmGraph>> = {};

  for (let i = 0; i < realms.length; i++) {
    result[realms[i]] = generateRealmGraph(realms[i], baseSeed + i * 1000);
  }

  return result as Record<RealmId, RealmGraph>;
}

/**
 * Utility: compute average connectivity (edges per node) of a graph.
 */
export function computeAverageConnectivity(graph: RealmGraph): number {
  if (graph.nodes.length === 0) return 0;
  // Each edge contributes 1 to each endpoint's degree → total degree = 2 * edges
  return (2 * graph.edges.length) / graph.nodes.length;
}

/**
 * Utility: check if a graph is connected (all nodes reachable from node 0).
 */
export function isGraphConnected(graph: RealmGraph): boolean {
  if (graph.nodes.length <= 1) return true;

  const nodeIndex = new Map<NodeId, number>();
  graph.nodes.forEach((n, i) => nodeIndex.set(n.id, i));

  const adjacency = new Map<number, Set<number>>();
  for (let i = 0; i < graph.nodes.length; i++) adjacency.set(i, new Set());
  for (const edge of graph.edges) {
    const a = nodeIndex.get(edge.sourceNodeId);
    const b = nodeIndex.get(edge.targetNodeId);
    if (a !== undefined && b !== undefined) {
      adjacency.get(a)!.add(b);
      adjacency.get(b)!.add(a);
    }
  }

  const unreachable = findUnreachableNodes(graph.nodes.length, adjacency);
  return unreachable.size === 0;
}
