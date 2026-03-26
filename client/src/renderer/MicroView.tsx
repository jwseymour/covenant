/**
 * MicroView — 2D graph view of a single realm using Canvas2D.
 *
 * GDD §3.6: "Micro view: In-realm graph with dominions, religions,
 * armies, rite sites."
 *
 * Renders the realm's graph (nodes + edges) with:
 * - Node type–specific shapes (city, landmark, rite_site, relic)
 * - Edge weight as thickness
 * - Pan and zoom controls
 * - Node selection with info display
 * - Realm-specific colour theming
 */

import { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import type { RealmId, RealmGraph, GameNode, GameEdge, NodeId, GameState, PlayerId } from '@shattered-covenant/shared';
import { generateRealmGraph } from '@shattered-covenant/shared';
import { REALM_VISUALS } from './realm-visuals';

// ─── Types ──────────────────────────────────────────────────────

interface MicroViewProps {
  realmId: RealmId;
  /** Pre-generated graph (optional — will generate with defaults if absent). */
  graph?: RealmGraph;
  /** Called when the user clicks the back button. */
  onBack: () => void;
  /** Called when a node is selected/deselected. */
  onNodeSelect?: (nodeId: NodeId | null) => void;
  /** Game state for dominion overlays. */
  gameState?: GameState;
  /** Current player ID for highlighting own dominions. */
  playerId?: PlayerId;
}

interface ViewTransform {
  offsetX: number;
  offsetY: number;
  scale: number;
}

// ─── Colour Themes Per Realm ────────────────────────────────────

interface MicroTheme {
  bg: string;
  bgGradientEnd: string;
  edgeColor: string;
  edgeAlpha: number;
  cityFill: string;
  cityStroke: string;
  landmarkFill: string;
  riteSiteFill: string;
  riteSiteGlow: string;
  relicFill: string;
  relicGlow: string;
  textColor: string;
  textMuted: string;
  selectionRing: string;
}

const MICRO_THEMES: Record<RealmId, MicroTheme> = {
  dominion: {
    bg: '#0c0e14', bgGradientEnd: '#141828',
    edgeColor: '#3a4a66', edgeAlpha: 0.4,
    cityFill: '#5a6882', cityStroke: '#8899bb',
    landmarkFill: '#3a4666', riteSiteFill: '#6688bb', riteSiteGlow: '#88aadd',
    relicFill: '#c4a265', relicGlow: '#e6c878',
    textColor: '#c8d4e8', textMuted: '#6a7a9a', selectionRing: '#88aadd',
  },
  entropy: {
    bg: '#120e14', bgGradientEnd: '#1e1428',
    edgeColor: '#5a3a5a', edgeAlpha: 0.35,
    cityFill: '#7a4a7a', cityStroke: '#aa66aa',
    landmarkFill: '#5a3a6a', riteSiteFill: '#9b5aaa', riteSiteGlow: '#cc88dd',
    relicFill: '#c4a265', relicGlow: '#e6c878',
    textColor: '#d8c8e8', textMuted: '#7a5a8a', selectionRing: '#cc88dd',
  },
  communion: {
    bg: '#0a120e', bgGradientEnd: '#142820',
    edgeColor: '#2a5a3a', edgeAlpha: 0.35,
    cityFill: '#3a7a5a', cityStroke: '#66aa88',
    landmarkFill: '#2a6a4a', riteSiteFill: '#44aa77', riteSiteGlow: '#66ddaa',
    relicFill: '#c4a265', relicGlow: '#e6c878',
    textColor: '#c8e8d8', textMuted: '#5a8a6a', selectionRing: '#66ddaa',
  },
  wrath: {
    bg: '#14100c', bgGradientEnd: '#281814',
    edgeColor: '#5a2a2a', edgeAlpha: 0.4,
    cityFill: '#8a3a2a', cityStroke: '#cc5544',
    landmarkFill: '#6a2a1a', riteSiteFill: '#bb4422', riteSiteGlow: '#ff6644',
    relicFill: '#c4a265', relicGlow: '#e6c878',
    textColor: '#e8d0c8', textMuted: '#8a5a4a', selectionRing: '#ff6644',
  },
  memory: {
    bg: '#12100a', bgGradientEnd: '#221e14',
    edgeColor: '#5a4a2a', edgeAlpha: 0.35,
    cityFill: '#8a7a4a', cityStroke: '#bbaa66',
    landmarkFill: '#6a5a3a', riteSiteFill: '#aa9944', riteSiteGlow: '#ddcc66',
    relicFill: '#c4a265', relicGlow: '#e6c878',
    textColor: '#e8dcc8', textMuted: '#8a7a5a', selectionRing: '#ddcc66',
  },
};

// ─── Drawing Helpers ────────────────────────────────────────────

function worldToScreen(
  wx: number, wy: number, transform: ViewTransform, canvasW: number, canvasH: number,
): [number, number] {
  const x = (wx - 500) * transform.scale + canvasW / 2 + transform.offsetX;
  const y = (wy - 500) * transform.scale + canvasH / 2 + transform.offsetY;
  return [x, y];
}

function screenToWorld(
  sx: number, sy: number, transform: ViewTransform, canvasW: number, canvasH: number,
): [number, number] {
  const wx = (sx - canvasW / 2 - transform.offsetX) / transform.scale + 500;
  const wy = (sy - canvasH / 2 - transform.offsetY) / transform.scale + 500;
  return [wx, wy];
}

function drawEdge(
  ctx: CanvasRenderingContext2D,
  edge: GameEdge,
  nodeMap: Map<NodeId, GameNode>,
  transform: ViewTransform,
  canvasW: number, canvasH: number,
  theme: MicroTheme,
) {
  const src = nodeMap.get(edge.sourceNodeId);
  const tgt = nodeMap.get(edge.targetNodeId);
  if (!src || !tgt) return;

  const [x1, y1] = worldToScreen(src.position.x, src.position.y, transform, canvasW, canvasH);
  const [x2, y2] = worldToScreen(tgt.position.x, tgt.position.y, transform, canvasW, canvasH);

  const thickness = Math.max(1, 3 / (edge.weight || 1)) * Math.min(transform.scale, 2);

  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = theme.edgeColor;
  ctx.globalAlpha = edge.severed ? 0.1 : theme.edgeAlpha;
  ctx.lineWidth = thickness;
  if (edge.severed) ctx.setLineDash([4, 4]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
}

function drawNode(
  ctx: CanvasRenderingContext2D,
  node: GameNode,
  transform: ViewTransform,
  canvasW: number, canvasH: number,
  theme: MicroTheme,
  isSelected: boolean,
  isHovered: boolean,
  time: number,
) {
  const [x, y] = worldToScreen(node.position.x, node.position.y, transform, canvasW, canvasH);
  const baseRadius = node.type === 'city' ? 8 : 6;
  const r = baseRadius * Math.min(transform.scale * 0.8, 2.5);
  const highlight = isSelected || isHovered;

  // Type-specific rendering
  switch (node.type) {
    case 'city': {
      // Filled circle
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = theme.cityFill;
      ctx.fill();
      ctx.strokeStyle = highlight ? theme.selectionRing : theme.cityStroke;
      ctx.lineWidth = highlight ? 2.5 : 1.2;
      ctx.stroke();
      break;
    }
    case 'landmark': {
      // Diamond shape
      ctx.beginPath();
      ctx.moveTo(x, y - r);
      ctx.lineTo(x + r, y);
      ctx.lineTo(x, y + r);
      ctx.lineTo(x - r, y);
      ctx.closePath();
      ctx.fillStyle = theme.landmarkFill;
      ctx.fill();
      ctx.strokeStyle = highlight ? theme.selectionRing : theme.cityStroke;
      ctx.lineWidth = highlight ? 2.5 : 1;
      ctx.stroke();
      break;
    }
    case 'rite_site': {
      // Pulsing glow + hexagon
      const pulse = 0.7 + Math.sin(time * 3) * 0.3;
      // Glow
      ctx.beginPath();
      ctx.arc(x, y, r * 2.2 * pulse, 0, Math.PI * 2);
      ctx.fillStyle = theme.riteSiteGlow;
      ctx.globalAlpha = 0.12 * pulse;
      ctx.fill();
      ctx.globalAlpha = 1;
      // Hexagon
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        const px = x + r * Math.cos(angle);
        const py = y + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = theme.riteSiteFill;
      ctx.fill();
      ctx.strokeStyle = highlight ? theme.selectionRing : theme.riteSiteGlow;
      ctx.lineWidth = highlight ? 2.5 : 1.5;
      ctx.stroke();
      break;
    }
    case 'relic_location': {
      // Star/sparkle shape with glow
      const sparkle = 0.8 + Math.sin(time * 2 + 1) * 0.2;
      // Glow
      ctx.beginPath();
      ctx.arc(x, y, r * 2.5 * sparkle, 0, Math.PI * 2);
      ctx.fillStyle = theme.relicGlow;
      ctx.globalAlpha = 0.15 * sparkle;
      ctx.fill();
      ctx.globalAlpha = 1;
      // Star
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI / 4) * i;
        const rad = i % 2 === 0 ? r : r * 0.5;
        const px = x + rad * Math.cos(angle);
        const py = y + rad * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = theme.relicFill;
      ctx.fill();
      ctx.strokeStyle = highlight ? theme.selectionRing : theme.relicGlow;
      ctx.lineWidth = highlight ? 2.5 : 1.5;
      ctx.stroke();
      break;
    }
  }

  // Selection ring
  if (isSelected) {
    ctx.beginPath();
    ctx.arc(x, y, r + 5, 0, Math.PI * 2);
    ctx.strokeStyle = theme.selectionRing;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.6 + Math.sin(time * 4) * 0.2;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // Node name (only at sufficient zoom)
  if (transform.scale > 0.4) {
    ctx.font = `${Math.max(9, 11 * Math.min(transform.scale, 1.5))}px Inter, sans-serif`;
    ctx.fillStyle = highlight ? theme.textColor : theme.textMuted;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.globalAlpha = Math.min(1, transform.scale);
    ctx.fillText(node.name, x, y + r + 4);
    ctx.globalAlpha = 1;
  }
}

// ─── Component ──────────────────────────────────────────────────

export function MicroView({ realmId, graph: externalGraph, onBack, onNodeSelect, gameState, playerId: _playerId }: MicroViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  const [selectedNodeId, setSelectedNodeId] = useState<NodeId | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<NodeId | null>(null);
  const [transform, setTransform] = useState<ViewTransform>({ offsetX: 0, offsetY: 0, scale: 0.7 });

  // Refs for the render loop so it doesn't re-mount on state changes
  const transformRef = useRef(transform);
  transformRef.current = transform;
  const selectedNodeIdRef = useRef(selectedNodeId);
  selectedNodeIdRef.current = selectedNodeId;
  const hoveredNodeIdRef = useRef(hoveredNodeId);
  hoveredNodeIdRef.current = hoveredNodeId;
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  // Dragging state — startX/startY track the initial mouseDown position (never updated during drag)
  const dragRef = useRef<{ dragging: boolean; startX: number; startY: number; lastX: number; lastY: number }>({
    dragging: false, startX: 0, startY: 0, lastX: 0, lastY: 0,
  });

  const graph = useMemo(
    () => externalGraph ?? generateRealmGraph(realmId, 42),
    [externalGraph, realmId],
  );

  const theme = MICRO_THEMES[realmId];
  const realmVisual = REALM_VISUALS[realmId];

  // Build node map for quick lookup
  const nodeMap = useMemo(() => {
    const map = new Map<NodeId, GameNode>();
    for (const node of graph.nodes) map.set(node.id, node);
    return map;
  }, [graph]);

  const selectedNode = selectedNodeId ? nodeMap.get(selectedNodeId) ?? null : null;

  // ─── Hit Testing ──────────────────────────────────────────

  const hitTestNode = useCallback(
    (sx: number, sy: number): GameNode | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const t = transformRef.current;
      const [wx, wy] = screenToWorld(sx, sy, t, canvas.width / window.devicePixelRatio, canvas.height / window.devicePixelRatio);
      const hitRadius = 15 / t.scale;

      for (let i = graph.nodes.length - 1; i >= 0; i--) {
        const node = graph.nodes[i];
        const dx = node.position.x - wx;
        const dy = node.position.y - wy;
        if (dx * dx + dy * dy < hitRadius * hitRadius) return node;
      }
      return null;
    },
    [graph],
  );

  // ─── Mouse Events ─────────────────────────────────────────

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragRef.current = { dragging: true, startX: e.clientX, startY: e.clientY, lastX: e.clientX, lastY: e.clientY };
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;

      if (dragRef.current.dragging) {
        const dx = e.clientX - dragRef.current.lastX;
        const dy = e.clientY - dragRef.current.lastY;
        dragRef.current.lastX = e.clientX;
        dragRef.current.lastY = e.clientY;
        setTransform((t) => ({ ...t, offsetX: t.offsetX + dx, offsetY: t.offsetY + dy }));
      } else {
        const node = hitTestNode(sx, sy);
        setHoveredNodeId(node?.id ?? null);
        if (canvasRef.current) {
          canvasRef.current.style.cursor = node ? 'pointer' : 'grab';
        }
      }
    },
    [hitTestNode],
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (!dragRef.current.dragging) return;
      // Compare with the INITIAL mouseDown position, not the last move position
      const dx = Math.abs(e.clientX - dragRef.current.startX);
      const dy = Math.abs(e.clientY - dragRef.current.startY);
      dragRef.current.dragging = false;

      // Only select if the mouse didn't move much (i.e. it was a click, not a drag)
      if (dx < 5 && dy < 5) {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const node = hitTestNode(e.clientX - rect.left, e.clientY - rect.top);
        const curSelected = selectedNodeIdRef.current;
        const newId = node?.id === curSelected ? null : node?.id ?? null;
        setSelectedNodeId(newId);
        onNodeSelect?.(newId);
      }
    },
    [hitTestNode, onNodeSelect],
  );

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setTransform((t) => ({
      ...t,
      scale: Math.max(0.2, Math.min(4, t.scale * delta)),
    }));
  }, []);

  // ─── Render Loop ──────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize handler
    const resize = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);

    let running = true;

    const render = () => {
      if (!running) return;
      const w = canvas.width / window.devicePixelRatio;
      const h = canvas.height / window.devicePixelRatio;
      const time = performance.now() / 1000;

      ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);

      // Background gradient
      const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) / 2);
      grad.addColorStop(0, theme.bgGradientEnd);
      grad.addColorStop(1, theme.bg);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Read current state from refs (avoids re-mounting the effect)
      const curTransform = transformRef.current;
      const curSelectedId = selectedNodeIdRef.current;
      const curHoveredId = hoveredNodeIdRef.current;
      const curGameState = gameStateRef.current;

      // Draw edges
      for (const edge of graph.edges) {
        drawEdge(ctx, edge, nodeMap, curTransform, w, h, theme);
      }

      // Draw dominion overlays (colour ring around controlled nodes)
      if (curGameState) {
        for (const dom of Object.values(curGameState.dominions)) {
          if (dom.realmId !== realmId) continue;
          const ownerPlayer = curGameState.players[dom.ownerId];
          const ownerColour = ownerPlayer?.colour ?? '#c4a265';

          // Territory overlay — subtle fill on all controlled nodes
          for (const controlledId of dom.controlledNodeIds) {
            const cNode = nodeMap.get(controlledId);
            if (!cNode) continue;
            const [cx, cy] = worldToScreen(cNode.position.x, cNode.position.y, curTransform, w, h);
            const cri = 10 * Math.min(curTransform.scale * 0.8, 2.5);
            ctx.fillStyle = ownerColour;
            ctx.globalAlpha = controlledId === dom.primaryNodeId ? 0.15 : 0.08;
            ctx.beginPath();
            ctx.arc(cx, cy, cri + 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
          }

          // Primary node influence ring
          const node = nodeMap.get(dom.primaryNodeId);
          if (!node) continue;
          const [nx, ny] = worldToScreen(node.position.x, node.position.y, curTransform, w, h);
          const ri = 12 * Math.min(curTransform.scale * 0.8, 2.5);
          // Influence ring
          ctx.beginPath();
          ctx.arc(nx, ny, ri + 4, 0, Math.PI * 2 * (dom.influence / 100));
          ctx.strokeStyle = ownerColour;
          ctx.lineWidth = 3;
          ctx.globalAlpha = 0.7;
          ctx.stroke();
          ctx.globalAlpha = 1;
          // Owner marker
          ctx.fillStyle = ownerColour;
          ctx.globalAlpha = 0.2;
          ctx.beginPath();
          ctx.arc(nx, ny, ri + 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }
      // Draw religion overlays (coloured halo rings — distinct from solid dominion fills)
      if (curGameState) {
        for (const rel of Object.values(curGameState.religions)) {
          if (rel.foundedRealmId !== realmId) continue;
          const ownerPlayer = curGameState.players[rel.founderId];
          // Use purple-shifted hue for religions (distinct from gold dominion)
          const baseHue = ownerPlayer ? 270 : 280;
          const relColour = `hsl(${baseHue}, 60%, 65%)`;

          for (const [nodeId, followerPct] of Object.entries(rel.followersByNode)) {
            const rNode = nodeMap.get(nodeId);
            if (!rNode) continue;
            const [rx, ry] = worldToScreen(rNode.position.x, rNode.position.y, curTransform, w, h);
            const rri = 14 * Math.min(curTransform.scale * 0.8, 2.5);

            ctx.globalAlpha = 0.15 + (followerPct / 100) * 0.4;

            if (rel.fractured) {
              // Dashed halo for fractured religions
              ctx.setLineDash([4, 4]);
            }

            ctx.beginPath();
            ctx.arc(rx, ry, rri + 6, 0, Math.PI * 2);
            ctx.strokeStyle = relColour;
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.setLineDash([]);
            ctx.globalAlpha = 1;
          }
        }
      }

      // Draw nodes
      for (const node of graph.nodes) {
        drawNode(
          ctx, node, curTransform, w, h, theme,
          node.id === curSelectedId,
          node.id === curHoveredId,
          time,
        );
      }

      rafRef.current = requestAnimationFrame(render);
    };

    rafRef.current = requestAnimationFrame(render);

    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
      resizeObserver.disconnect();
    };
  }, [graph, nodeMap, theme, realmId]);

  // ─── Node Type Labels ─────────────────────────────────────

  const nodeTypeLabel = (type: string) => {
    switch (type) {
      case 'city': return 'City';
      case 'landmark': return 'Landmark';
      case 'rite_site': return 'Rite Site';
      case 'relic_location': return 'Relic Location';
      default: return type;
    }
  };

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        style={{ display: 'block', cursor: 'grab' }}
      />

      {/* Back button */}
      <button
        onClick={onBack}
        style={{
          position: 'absolute', top: '16px', left: '16px',
          background: 'rgba(10, 10, 15, 0.85)',
          border: '1px solid rgba(196, 162, 101, 0.3)',
          borderRadius: '6px', padding: '8px 16px',
          color: '#c4a265', cursor: 'pointer',
          fontFamily: "'Cinzel', serif", fontSize: '13px', fontWeight: '600',
          letterSpacing: '0.08em',
          backdropFilter: 'blur(8px)',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          (e.target as HTMLButtonElement).style.background = 'rgba(196, 162, 101, 0.15)';
        }}
        onMouseLeave={(e) => {
          (e.target as HTMLButtonElement).style.background = 'rgba(10, 10, 15, 0.85)';
        }}
      >
        ← Macro View
      </button>

      {/* Realm title */}
      <div
        style={{
          position: 'absolute', top: '16px', left: '50%', transform: 'translateX(-50%)',
          fontFamily: "'Cinzel', serif", fontSize: '18px', fontWeight: '700',
          color: realmVisual.accent, letterSpacing: '0.1em',
          textShadow: `0 0 12px ${realmVisual.emissive}`,
          textTransform: 'uppercase', pointerEvents: 'none',
        }}
      >
        {realmVisual.name}
      </div>

      {/* Graph stats */}
      <div
        style={{
          position: 'absolute', top: '16px', right: '16px',
          background: 'rgba(10, 10, 15, 0.85)', border: '1px solid rgba(196, 162, 101, 0.2)',
          borderRadius: '6px', padding: '10px 14px',
          fontSize: '11px', color: '#9e9a93', fontFamily: 'monospace',
          backdropFilter: 'blur(8px)',
        }}
      >
        <div>Nodes: {graph.nodes.length}</div>
        <div>Edges: {graph.edges.length}</div>
        <div>Cities: {graph.nodes.filter((n) => n.type === 'city').length}</div>
        <div>Rite Sites: {graph.nodes.filter((n) => n.type === 'rite_site').length}</div>
        <div>Relics: {graph.nodes.filter((n) => n.type === 'relic_location').length}</div>
      </div>

      {/* Node Legend */}
      <div
        style={{
          position: 'absolute', bottom: '16px', right: '16px',
          background: 'rgba(10, 10, 15, 0.85)', border: '1px solid rgba(196, 162, 101, 0.2)',
          borderRadius: '6px', padding: '10px 14px', fontSize: '11px',
          backdropFilter: 'blur(8px)',
        }}
      >
        {[
          { label: 'City', color: theme.cityFill, shape: '●' },
          { label: 'Landmark', color: theme.landmarkFill, shape: '◆' },
          { label: 'Rite Site', color: theme.riteSiteFill, shape: '⬡' },
          { label: 'Relic', color: theme.relicFill, shape: '✦' },
        ].map(({ label, color, shape }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
            <span style={{ color, fontSize: '14px' }}>{shape}</span>
            <span style={{ color: '#9e9a93' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Selected node info */}
      {selectedNode && (
        <div
          style={{
            position: 'absolute', bottom: '16px', left: '16px',
            background: 'rgba(10, 10, 15, 0.92)',
            border: '1px solid rgba(196, 162, 101, 0.3)',
            borderRadius: '8px', padding: '14px 18px', maxWidth: '280px',
            backdropFilter: 'blur(8px)', animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <div style={{
            fontFamily: "'Cinzel', serif", fontSize: '14px', fontWeight: '700',
            color: realmVisual.accent, marginBottom: '4px', letterSpacing: '0.06em',
          }}>
            {selectedNode.name}
          </div>
          <div style={{ fontSize: '11px', color: '#8a8680', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            {nodeTypeLabel(selectedNode.type)}
          </div>
          <div style={{ fontSize: '12px', color: '#c8c4be', lineHeight: '1.4' }}>
            <div>Population: <span style={{ color: realmVisual.accent }}>{selectedNode.population.toLocaleString()}</span></div>
            {selectedNode.depopulated && (
              <div style={{ color: '#f87171' }}>Depopulated ({selectedNode.depopulationTurnsRemaining} turns remaining)</div>
            )}
            {selectedNode.availableRiteIds && (
              <div style={{ color: theme.riteSiteGlow }}>Rites available: {selectedNode.availableRiteIds.length}</div>
            )}
            {selectedNode.relicId && !selectedNode.relicClaimed && (
              <div style={{ color: theme.relicGlow }}>Relic: Unclaimed</div>
            )}
            {selectedNode.relicId && selectedNode.relicClaimed && (
              <div style={{ color: '#6b6760' }}>Relic: Claimed</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
