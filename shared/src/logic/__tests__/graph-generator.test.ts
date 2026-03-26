/**
 * Tests for the procedural graph generator.
 *
 * Verifies:
 * - Each realm generates a connected graph
 * - Node counts are within expected bounds
 * - Special nodes (rite sites, relics) are present
 * - Realm-specific properties (e.g., Communion > Dominion connectivity)
 * - Determinism (same seed → same graph)
 * - Edge weights are positive
 */

import { describe, it, expect } from 'vitest';
import {
  generateRealmGraph,
  generateAllRealmGraphs,
  computeAverageConnectivity,
  isGraphConnected,
} from '../graph-generator.js';
import type { RealmId } from '../../types/realm.js';

const ALL_REALMS: RealmId[] = ['dominion', 'entropy', 'communion', 'wrath', 'memory'];
const SEED = 42;

describe('generateRealmGraph', () => {
  // ─── Connectivity ─────────────────────────────────────────

  describe('connectivity', () => {
    it.each(ALL_REALMS)('generates a connected graph for %s', (realmId) => {
      const graph = generateRealmGraph(realmId, SEED);
      expect(isGraphConnected(graph)).toBe(true);
    });

    it.each(ALL_REALMS)('remains connected with different seeds for %s', (realmId) => {
      for (let seed = 1; seed <= 5; seed++) {
        const graph = generateRealmGraph(realmId, seed * 137);
        expect(isGraphConnected(graph)).toBe(true);
      }
    });
  });

  // ─── Node Counts ──────────────────────────────────────────

  describe('node counts', () => {
    it.each(ALL_REALMS)('generates nodes within expected bounds for %s', (realmId) => {
      const graph = generateRealmGraph(realmId, SEED);
      // All realms should have between 15–30 nodes
      expect(graph.nodes.length).toBeGreaterThanOrEqual(15);
      expect(graph.nodes.length).toBeLessThanOrEqual(30);
    });

    it('Dominion has among the most nodes (orderly, many settlements)', () => {
      const dominion = generateRealmGraph('dominion', SEED);
      const entropy = generateRealmGraph('entropy', SEED);
      expect(dominion.nodes.length).toBeGreaterThanOrEqual(entropy.nodes.length);
    });

    it('Memory has the most nodes (layered, dense)', () => {
      const memory = generateRealmGraph('memory', SEED);
      expect(memory.nodes.length).toBeGreaterThanOrEqual(22);
    });
  });

  // ─── Special Nodes ────────────────────────────────────────

  describe('special nodes', () => {
    it.each(ALL_REALMS)('has at least 2 rite sites for %s', (realmId) => {
      const graph = generateRealmGraph(realmId, SEED);
      const riteSites = graph.nodes.filter((n) => n.type === 'rite_site');
      expect(riteSites.length).toBeGreaterThanOrEqual(2);
    });

    it.each(ALL_REALMS)('has at least 1 relic location for %s', (realmId) => {
      const graph = generateRealmGraph(realmId, SEED);
      const relicLocations = graph.nodes.filter((n) => n.type === 'relic_location');
      expect(relicLocations.length).toBeGreaterThanOrEqual(1);
    });

    it.each(ALL_REALMS)('rite sites have available rite IDs for %s', (realmId) => {
      const graph = generateRealmGraph(realmId, SEED);
      const riteSites = graph.nodes.filter((n) => n.type === 'rite_site');
      for (const site of riteSites) {
        expect(site.availableRiteIds).toBeDefined();
        expect(site.availableRiteIds!.length).toBeGreaterThan(0);
      }
    });

    it.each(ALL_REALMS)('relic locations have relic IDs for %s', (realmId) => {
      const graph = generateRealmGraph(realmId, SEED);
      const relicLocations = graph.nodes.filter((n) => n.type === 'relic_location');
      for (const loc of relicLocations) {
        expect(loc.relicId).toBeDefined();
        expect(loc.relicClaimed).toBe(false);
      }
    });

    it.each(ALL_REALMS)('has cities and landmarks for %s', (realmId) => {
      const graph = generateRealmGraph(realmId, SEED);
      const cities = graph.nodes.filter((n) => n.type === 'city');
      const landmarks = graph.nodes.filter((n) => n.type === 'landmark');
      expect(cities.length).toBeGreaterThan(0);
      expect(landmarks.length).toBeGreaterThan(0);
    });
  });

  // ─── Realm-Specific Properties ────────────────────────────

  describe('realm-specific topology', () => {
    it('Communion has higher average connectivity than Dominion', () => {
      const communion = generateRealmGraph('communion', SEED);
      const dominion = generateRealmGraph('dominion', SEED);
      const communionConn = computeAverageConnectivity(communion);
      const dominionConn = computeAverageConnectivity(dominion);
      expect(communionConn).toBeGreaterThan(dominionConn);
    });

    it('Communion has higher average connectivity than Wrath', () => {
      const communion = generateRealmGraph('communion', SEED);
      const wrath = generateRealmGraph('wrath', SEED);
      expect(computeAverageConnectivity(communion)).toBeGreaterThan(
        computeAverageConnectivity(wrath),
      );
    });

    it('Wrath has fortress-like clustering (lower connectivity)', () => {
      const wrath = generateRealmGraph('wrath', SEED);
      const communion = generateRealmGraph('communion', SEED);
      expect(computeAverageConnectivity(wrath)).toBeLessThan(
        computeAverageConnectivity(communion),
      );
    });
  });

  // ─── Edge Properties ──────────────────────────────────────

  describe('edge properties', () => {
    it.each(ALL_REALMS)('all edges have positive weights for %s', (realmId) => {
      const graph = generateRealmGraph(realmId, SEED);
      for (const edge of graph.edges) {
        expect(edge.weight).toBeGreaterThan(0);
      }
    });

    it.each(ALL_REALMS)('all edges reference valid nodes for %s', (realmId) => {
      const graph = generateRealmGraph(realmId, SEED);
      const nodeIds = new Set(graph.nodes.map((n) => n.id));
      for (const edge of graph.edges) {
        expect(nodeIds.has(edge.sourceNodeId)).toBe(true);
        expect(nodeIds.has(edge.targetNodeId)).toBe(true);
      }
    });

    it.each(ALL_REALMS)('no self-loops for %s', (realmId) => {
      const graph = generateRealmGraph(realmId, SEED);
      for (const edge of graph.edges) {
        expect(edge.sourceNodeId).not.toBe(edge.targetNodeId);
      }
    });

    it.each(ALL_REALMS)('no duplicate edges for %s', (realmId) => {
      const graph = generateRealmGraph(realmId, SEED);
      const edgeKeys = new Set<string>();
      for (const edge of graph.edges) {
        const key =
          edge.sourceNodeId < edge.targetNodeId
            ? `${edge.sourceNodeId}-${edge.targetNodeId}`
            : `${edge.targetNodeId}-${edge.sourceNodeId}`;
        expect(edgeKeys.has(key)).toBe(false);
        edgeKeys.add(key);
      }
    });

    it.each(ALL_REALMS)('edges are not temporary (intra-realm) for %s', (realmId) => {
      const graph = generateRealmGraph(realmId, SEED);
      for (const edge of graph.edges) {
        expect(edge.temporary).toBe(false);
      }
    });
  });

  // ─── Determinism ──────────────────────────────────────────

  describe('determinism', () => {
    it.each(ALL_REALMS)('same seed produces identical graph for %s', (realmId) => {
      const graph1 = generateRealmGraph(realmId, 12345);
      const graph2 = generateRealmGraph(realmId, 12345);

      expect(graph1.nodes.length).toBe(graph2.nodes.length);
      expect(graph1.edges.length).toBe(graph2.edges.length);

      for (let i = 0; i < graph1.nodes.length; i++) {
        expect(graph1.nodes[i].id).toBe(graph2.nodes[i].id);
        expect(graph1.nodes[i].position.x).toBe(graph2.nodes[i].position.x);
        expect(graph1.nodes[i].position.y).toBe(graph2.nodes[i].position.y);
      }
    });

    it.each(ALL_REALMS)('different seeds produce different graphs for %s', (realmId) => {
      const graph1 = generateRealmGraph(realmId, 100);
      const graph2 = generateRealmGraph(realmId, 200);

      // Different seeds should produce different node positions
      const positionsMatch = graph1.nodes.every(
        (n, i) =>
          n.position.x === graph2.nodes[i].position.x &&
          n.position.y === graph2.nodes[i].position.y,
      );
      expect(positionsMatch).toBe(false);
    });
  });

  // ─── Node Properties ──────────────────────────────────────

  describe('node properties', () => {
    it.each(ALL_REALMS)('all nodes have positive population for %s', (realmId) => {
      const graph = generateRealmGraph(realmId, SEED);
      for (const node of graph.nodes) {
        expect(node.population).toBeGreaterThan(0);
      }
    });

    it.each(ALL_REALMS)('all nodes start not depopulated for %s', (realmId) => {
      const graph = generateRealmGraph(realmId, SEED);
      for (const node of graph.nodes) {
        expect(node.depopulated).toBe(false);
        expect(node.depopulationTurnsRemaining).toBe(0);
      }
    });

    it.each(ALL_REALMS)('all nodes have unique IDs for %s', (realmId) => {
      const graph = generateRealmGraph(realmId, SEED);
      const ids = graph.nodes.map((n) => n.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it.each(ALL_REALMS)('all nodes have the correct realmId for %s', (realmId) => {
      const graph = generateRealmGraph(realmId, SEED);
      for (const node of graph.nodes) {
        expect(node.realmId).toBe(realmId);
      }
    });
  });
});

describe('generateAllRealmGraphs', () => {
  it('generates graphs for all 5 realms', () => {
    const graphs = generateAllRealmGraphs(SEED);
    expect(Object.keys(graphs)).toHaveLength(5);
    for (const realmId of ALL_REALMS) {
      expect(graphs[realmId]).toBeDefined();
      expect(graphs[realmId].realmId).toBe(realmId);
    }
  });

  it('all generated graphs are connected', () => {
    const graphs = generateAllRealmGraphs(SEED);
    for (const realmId of ALL_REALMS) {
      expect(isGraphConnected(graphs[realmId])).toBe(true);
    }
  });
});
