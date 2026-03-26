import type { GameState } from '../types/game-state.js';
import type { Player, PlayerId } from '../types/player.js';
import type { Mission, MissionId } from '../types/mission.js';

let _missionIdCounter = 0;
export function generateMissionId(): MissionId {
  return `mission-${Date.now()}-${_missionIdCounter++}`;
}

export const MISSION_LIBRARY: Omit<Mission, 'id' | 'assignedTo' | 'completed' | 'rewardsClaimed'>[] = [
  {
    title: 'Architect of Worlds',
    description: 'Control a dominion in 3 separate realms simultaneously.',
    scope: 'cross_realm',
    conditions: [{ type: 'control_dominions_in_realms', threshold: 3, progress: 0, description: 'Dominions in different realms' }],
    rewards: [{ type: 'souls', soulAmount: 300, description: '300 Souls' }]
  },
  {
    title: 'Faith in the Fire',
    description: 'Have your religion present on at least 3 nodes in The Crucible (Wrath).',
    scope: 'realm',
    conditions: [{ type: 'religion_dominant_in_realm', targetRealmIds: ['wrath'], threshold: 3, progress: 0, description: 'Nodes controlled by your faith in Wrath' }],
    rewards: [{ type: 'relic', relicId: 'relic_blade_of_wrath', description: 'Blade of Wrath' }, { type: 'souls', soulAmount: 100, description: '100 Souls' }]
  },
  {
    title: 'Master of the Arcane',
    description: 'Acquire and possess 3 Relics.',
    scope: 'cross_realm',
    conditions: [{ type: 'custom', threshold: 3, progress: 0, description: 'Relics possessed' }],
    rewards: [{ type: 'souls', soulAmount: 400, description: '400 Souls' }]
  },
  {
    title: 'Greed of the Old Covenant',
    description: 'Accumulate a balance of 1000 Souls.',
    scope: 'local',
    conditions: [{ type: 'accumulate_souls', threshold: 1000, progress: 0, description: 'Souls hoarded' }],
    rewards: [{ type: 'ability', description: 'Unlock permanent -50% AP cost on Rites (narrative effect only for prototype)' }]
  },
  {
    title: 'Agent of Decay',
    description: 'Control 4 Dominions within The Ever-Dying Land (Entropy).',
    scope: 'realm',
    conditions: [{ type: 'control_dominions_in_realms', targetRealmIds: ['entropy'], threshold: 4, progress: 0, description: 'Dominions in Entropy' }],
    rewards: [{ type: 'souls', soulAmount: 250, description: '250 Souls' }]
  },
  {
    title: 'Empire',
    description: 'Control 8 Dominions globally.',
    scope: 'cross_realm',
    conditions: [{ type: 'conquer_nodes', threshold: 8, progress: 0, description: 'Total dominions' }],
    rewards: [{ type: 'souls', soulAmount: 350, description: '350 Souls' }]
  },
  {
    title: 'Reaper',
    description: 'Perform the Rite of Harvest 2 times (tracked via total earned souls spike).',
    scope: 'cross_realm',
    conditions: [{ type: 'custom', threshold: 2, progress: 0, description: 'Rites of Harvest performed' }],
    rewards: [{ type: 'souls', soulAmount: 200, description: '200 Souls' }]
  },
  {
    title: 'Voices in the Void',
    description: 'Found 3 distinct religions.',
    scope: 'cross_realm',
    conditions: [{ type: 'found_religions', threshold: 3, progress: 0, description: 'Religions founded' }],
    rewards: [{ type: 'souls', soulAmount: 250, description: '250 Souls' }]
  },
  {
    title: 'Keeper of the Covenant',
    description: 'Control 5 Dominions in The Eternal Hierarchy (Dominion).',
    scope: 'realm',
    conditions: [{ type: 'control_dominions_in_realms', targetRealmIds: ['dominion'], threshold: 5, progress: 0, description: 'Dominions in The Eternal Hierarchy' }],
    rewards: [{ type: 'souls', soulAmount: 300, description: '300 Souls' }]
  },
  {
    title: 'Omnipresent Faith',
    description: 'Have a religion you founded spread to at least 10 nodes.',
    scope: 'cross_realm',
    conditions: [{ type: 'custom', threshold: 10, progress: 0, description: 'Nodes following your religion' }],
    rewards: [{ type: 'souls', soulAmount: 500, description: '500 Souls' }]
  }
];

export function drawInitialMissions(playerId: PlayerId): Mission[] {
  const shuffled = [...MISSION_LIBRARY].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 3).map(template => ({
    ...template,
    id: generateMissionId(),
    assignedTo: playerId,
    completed: false,
    rewardsClaimed: false,
    conditions: template.conditions.map(c => ({ ...c })) // clone conditions
  }));
}

export function drawSingleMission(playerId: PlayerId, _excludeIds: string[] = []): Mission {
  // Exclude logic if needed, but for prototype random draw is fine
  const template = MISSION_LIBRARY[Math.floor(Math.random() * MISSION_LIBRARY.length)];
  return {
    ...template,
    id: generateMissionId(),
    assignedTo: playerId,
    completed: false,
    rewardsClaimed: false,
    conditions: template.conditions.map(c => ({ ...c }))
  };
}

export function checkPlayerMissions(state: GameState, player: Player): Mission[] {
  const updatedMissions: Mission[] = [];
  
  for (const mission of player.missions) {
    if (mission.completed) {
      updatedMissions.push(mission);
      continue;
    }

    let allConditionsMet = true;
    const updatedConditions = [];

    for (const cond of mission.conditions) {
      let currentProgress = cond.progress;

      switch (cond.type) {
        case 'control_dominions_in_realms':
          if (cond.targetRealmIds) {
            // Count dominions in specific realms
            currentProgress = player.dominionIds.filter(domId => cond.targetRealmIds!.includes(state.dominions[domId]?.realmId)).length;
          } else {
            // Count unique realms where player has a dominion
            const realms = new Set(player.dominionIds.map(domId => state.dominions[domId]?.realmId));
            currentProgress = realms.size;
          }
          break;

        case 'religion_dominant_in_realm':
          if (cond.targetRealmIds) {
            // How many nodes the player's religions have in total in this realm
            let nodesCount = 0;
            for (const relId of player.religionIds) {
              const rel = state.religions[relId];
              if (rel && rel.foundedRealmId === cond.targetRealmIds[0]) {
                const realmNodes = state.realmGraphs[cond.targetRealmIds[0]]?.nodes || [];
                for (const node of realmNodes) {
                  if (rel.followersByNode[node.id] > 0) nodesCount++;
                }
              }
            }
            currentProgress = nodesCount;
          }
          break;

        case 'accumulate_souls':
          currentProgress = player.soulLedger.balance;
          break;

        case 'conquer_nodes':
          currentProgress = player.dominionIds.length;
          break;

        case 'found_religions':
          currentProgress = player.religionIds.length;
          break;
          
        case 'custom':
          // Custom heuristic fallbacks
          if (cond.description === 'Relics possessed') {
            currentProgress = player.relicIds.length;
          } else if (cond.description === 'Rites of Harvest performed') {
            // Heuristic string match check not optimal, but ok for prototype scale
            currentProgress = player.soulLedger.history.filter(log => 'source' in log && log.source === 'rite_of_harvest').length;
          } else if (cond.description === 'Nodes following your religion') {
            currentProgress = player.religionIds.reduce((sum, relId) => sum + (state.religions[relId]?.nodeCount || 0), 0);
          }
          break;
          
        default:
          break;
      }

      if (cond.threshold && currentProgress >= cond.threshold) {
        currentProgress = cond.threshold;
      } else {
        allConditionsMet = false;
      }

      updatedConditions.push({ ...cond, progress: currentProgress });
    }

    updatedMissions.push({
      ...mission,
      conditions: updatedConditions,
      completed: allConditionsMet,
      completedTurn: allConditionsMet ? state.turnNumber : undefined
    });
  }
  return updatedMissions;
}
