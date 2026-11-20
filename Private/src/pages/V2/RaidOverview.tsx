
// import api from '../../api/api';

import { useOutletContext } from "react-router-dom";
import { TrackingRaidData, TrackingRaidDataPlayers } from '../../types/api_types'
import './Raids.css'
import { msToHMS } from "../../helpers";

import { useEffect, useMemo, useState } from "react";
import _ from "lodash";
import { getLocationLabel } from '../../helpers/locations';
import { getFactionRole, resolveBotType, isRaiderHunter, createPlayerColorResolver } from "../../helpers/players";
import { getIsbDisplayName } from '../../helpers/isb';
import { displayPlayerName } from '../../helpers/playerNames';
import { isHumanPlayer, playerGroupKey } from '../../helpers/playerIdentity';
import { finalPlayerStatuses, peakActiveBots, playerStatusLabel } from '../../helpers/playerStatuses';

const FACTION_COLORS: Record<string, { color: string, label: string }> = {
    'BOSS':        { color: '#FF0000', label: 'Boss' },
    'GOON':        { color: '#ff005d', label: 'Goon' },
    'FOLLOWER':    { color: '#ff7b00', label: 'Follower' },
    'RAIDER':      { color: '#FF00FF', label: 'Raider' },
    'ROGUE':       { color: '#ff7b00', label: 'Rogue' },
    'CULTIST':     { color: '#6f00ff', label: 'Cultist' },
    'BLOODHOUND':  { color: '#6d0000', label: 'Bloodhound' },
    'MERCENARY':   { color: '#FFD700', label: 'Mercenary' },
    'RUAF':        { color: '#4A90D9', label: 'RUAF' },
    'UNTAR':       { color: '#00BFFF', label: 'UNTAR' },
    'BLACK DIV':   { color: '#555555', label: 'Black Div' },
    'ISB':         { color: '#1ABC9C', label: 'ISB' },
    'ISB WT':      { color: '#D5E8E4', label: 'ISB WT' },
    'COMBINE':     { color: '#4B6584', label: 'Combine' },
    'SNIPER':      { color: '#00911a', label: 'Sniper' },
    'PLAYER SCAV': { color: '#33FF8D', label: 'P. Scav' },
    'INFECTED':    { color: '#7FFF00', label: 'Infected' },
    'SPECIAL':     { color: '#00eeff', label: 'Special' },
};

const SIDE_COLORS: Record<string, { color: string, label: string }> = {
    'Usec':   { color: '#1E90FF', label: 'USEC' },
    'Bear':   { color: '#CD5C5C', label: 'BEAR' },
    'Savage': { color: '#33FF57', label: 'Scav' },
};

function needsDarkText(hex: string): boolean {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5;
}

type SortKey = 'lvl' | 'kills' | 'lootings' | 'lootedValue' | 'spawnValue' | 'accuracy' | null;

function formatCompactNumber(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
    return String(n);
}

// Phone cards: also compact negative values so they fit their column.
function formatSignedCompactNumber(n: number): string {
    return n < 0 ? `-${formatCompactNumber(-n)}` : formatCompactNumber(n);
}

// The client joins mod names with bare commas: allow a line break after each one.
function formatModList(mods: string | undefined) {
    if (!mods) return mods;
    const names = mods.split(',');
    return names.map((name, i) => <span key={i}>{name}{i < names.length - 1 ? <>,<wbr /></> : null}</span>);
}
type SortDir = 'asc' | 'desc';

export default function RaidOverview() {
    const { raid } = useOutletContext() as { raid: TrackingRaidData, intl: { [key:string] : string } };
    const getPlayerColor = useMemo(() => createPlayerColorResolver(raid?.players, raid?.profileId), [raid?.players, raid?.profileId]);


    const [ calcStats, setCalcStats ] = useState(null as null | Map<string, { kills: number, lootings: number, lootedValue: number, spawnValue: number, accuracy: number }>);
    const [ raidSummary, setRaidSummary ] = useState([] as { title: string; value: any;}[]);
    const [ groupedByType, setGroupedByType ] = useState('TEAM' as string);
    const [ groupedBy, setGroupedBy ] = useState([] as TrackingRaidDataPlayers[][]);
    const [ sortKey, setSortKey ] = useState<SortKey>(null);
    const [ sortDir, setSortDir ] = useState<SortDir>('desc');
    const [ killedByMap, setKilledByMap ] = useState<Map<string, { killerName: string, weapon: string, distance: string, bodyPart: string }>>(new Map());
    const [ selectedProfileId, setSelectedProfileId ] = useState<string | null>(null);


    function handleSort(key: SortKey) {
      if (sortKey === key) {
        setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
      } else {
        setSortKey(key);
        setSortDir('desc');
      }
    }

    function sortIndicator(key: SortKey) {
      if (sortKey !== key) return '';
      return sortDir === 'asc' ? ' ▲' : ' ▼';
    }

    function sortPlayers(players: TrackingRaidDataPlayers[]): TrackingRaidDataPlayers[] {
      if (!sortKey || !calcStats) return players;
      return [...players].sort((a, b) => {
        let aVal = 0, bVal = 0;
        if (sortKey === 'lvl') {
          aVal = Number(a.level) || 0;
          bVal = Number(b.level) || 0;
        } else {
          const aStats = calcStats.get(a.profileId);
          const bStats = calcStats.get(b.profileId);
          aVal = aStats ? aStats[sortKey] : 0;
          bVal = bStats ? bStats[sortKey] : 0;
        }
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      });
    }

    useEffect(() => {
      if (raid && raid.players) {
        // Filter out internal inventory moves (same player, same itemId, dropped+looted within 1s)
        const allLoot = (raid.looting || []) as any[]
        const moveIds = new Set<number>()
        for (let i = 0; i < allLoot.length; i++) {
          if (moveIds.has(i)) continue
          const a = allLoot[i]
          const aAdded = String(a.added).match(/^(1|true)$/i)
          for (let j = i + 1; j < allLoot.length; j++) {
            if (moveIds.has(j)) continue
            const b = allLoot[j]
            if (b.profileId !== a.profileId || b.itemId !== a.itemId) continue
            if (Math.abs(Number(b.time) - Number(a.time)) > 1000) break
            const bAdded = String(b.added).match(/^(1|true)$/i)
            if (!!aAdded !== !!bAdded) {
              moveIds.add(i)
              moveIds.add(j)
              break
            }
          }
        }
        const filteredLoot = allLoot.filter((_, idx) => !moveIds.has(idx))

        const calculatedStats = new Map();
        for (let i = 0; i < raid.players.length; i++) {
          const player = raid.players[i];

          let kills = _.filter(raid.kills, (killer) => killer.profileId === player.profileId).length;
          let lootingsAdded = _.filter(filteredLoot, (looter) => looter.profileId === player.profileId && String(looter.added).match(/^(1|true)$/i)).length;
          let lootingsRemoved = _.filter(filteredLoot, (looter) => looter.profileId === player.profileId && String(looter.added).match(/^(0|false)$/i)).length;
          let lootings = lootingsAdded - lootingsRemoved;

          // Looted value: sum of (price × qty) for added items minus dropped items
          let lootedValue = 0;
          for (const loot of filteredLoot) {
            if (loot.profileId !== player.profileId) continue;
            const price = Number(loot.price) || 0;
            const qty = Number(loot.qty) || 1;
            const isAdded = String(loot.added).match(/^(1|true)$/i);
            lootedValue += isAdded ? price * qty : -(price * qty);
          }

          let allShots = _.filter(raid.ballistic, (shot) => shot.profileId === player.profileId).length;
          let hitShots = _.filter(raid.ballistic, (shot) => shot.profileId === player.profileId && shot.hitPlayerId).length
          let accuracy = Number(((hitShots / allShots) * 100).toFixed(0));

          if (Number.isNaN(accuracy)) {
            accuracy = 0;
          }

          // Bot spawn value from player_inventory (exclude non-lootable slots: main, SecuredContainer)
          let spawnValue = 0;
          if (raid.player_inventory) {
            for (const inv of raid.player_inventory) {
              if (inv.profileId !== player.profileId) continue;
              const slot = inv.slot || '';
              if (/^(main|SecuredContainer)$/i.test(slot)) continue;
              spawnValue += (Number(inv.price) || 0) * (Number(inv.qty) || 1);
            }
          }

          calculatedStats.set(player.profileId, {
            kills,
            lootings,
            lootedValue,
            spawnValue,
            accuracy
          })
        }
        setCalcStats(calculatedStats);

        const nameMap = new Map<string, string>();
        for (const p of raid.players) {
          nameMap.set(p.profileId, p.name);
        }
        const newKilledByMap = new Map<string, { killerName: string, weapon: string, distance: string, bodyPart: string }>();
        if (raid.kills) {
          for (const kill of raid.kills) {
            newKilledByMap.set(kill.killedId, {
              killerName: nameMap.get(kill.profileId) || 'Unknown',
              weapon: kill.weapon,
              distance: kill.distance,
              bodyPart: kill.bodyPart,
            });
          }
        }
        setKilledByMap(newKilledByMap);

        if (groupedByType === '') {
          setGroupedBy([[...raid.players]])
        }

        if (groupedByType === 'GROUP') {
          const newGrouped = _.chain(raid.players).groupBy(p => playerGroupKey(p, raid.profileId)).valuesIn().value();
          setGroupedBy([...newGrouped])
        }

        if (groupedByType === 'TEAM') {
          const SIDE_ORDER = ['Player', 'USEC', 'BEAR', 'P. Scav', 'Boss', 'Goon', 'Follower', 'Raider', 'Rogue', 'Cultist', 'Bloodhound', 'Special', 'Infected', 'Mercenary', 'RUAF', 'UNTAR', 'Black Div', 'ISB', 'ISB WT', 'Combine', 'Sniper', 'Scav'];
          const grouped = _.groupBy(raid.players, p => {
            if (isHumanPlayer(p, raid.profileId)) return 'Player';
            const isb = resolveBotType(p);
            if (isb === 'ISB' || isb === 'ISB_WT') return isb === 'ISB_WT' ? 'ISB WT' : 'ISB';
            const isPMC = p.team === 'Usec' || p.team === 'Bear';
            if (isPMC) {
              const sideLabel = SIDE_COLORS[p.team]?.label || p.team;
              return `${sideLabel}#${p.group}`;
            }
            const brain = getPlayerBrain(p);
            if (FACTION_COLORS[brain]) return FACTION_COLORS[brain].label;
            return SIDE_COLORS[p.team]?.label || p.team;
          });
          const sorted = _.sortBy(Object.entries(grouped), ([key]) => {
            const base = key.split('#')[0];
            const idx = SIDE_ORDER.indexOf(base);
            const teamNum = key.includes('#') ? Number(key.split('#')[1]) || 0 : 0;
            return (idx === -1 ? SIDE_ORDER.length : idx) * 100 + teamNum;
          });
          setGroupedBy(sorted.map(([, players]) => players));
        }
      }


      let newRaidSummary = [];

      newRaidSummary.push({
        title: 'Map',
        // @ts-ignore
        value: getLocationLabel(raid.location, raid.locationVariant)
      });

      newRaidSummary.push({
        title: 'Status',
        value: raid.exitStatus
      });

      newRaidSummary.push({
        title: 'Time In Raid',
        value: msToHMS(Number(raid.timeInRaid))
      });


      newRaidSummary.push({
        title: 'Extract Point',
        value: raid.exitName || '-'
      });

      newRaidSummary.push({
        title: 'Total Players/Bots',
        value: raid.players ? raid.players.length : 0
      });

      newRaidSummary.push({
        title: 'Peak Active Bots',
        value: peakActiveBots(raid.player_status, raid.players?.filter(p => p.type === 'HUMAN').map(p => p.profileId))
      });

      newRaidSummary.push({
        title: 'Total Kills',
        value: raid.kills ? raid.kills.length : 0
      });

      newRaidSummary.push({
        title: 'Detected Mods',
        value: formatModList(raid.detectedMods)
      });

      let positionsTrackedMap = { "COMPILED" : "Available", "RAW" : "Processing", "NOT_AVAILABLE" : "Not Available" }
      newRaidSummary.push({
        title: 'Positional Data',

        // @ts-ignore
        value: raid.positionsTracked ? positionsTrackedMap[raid.positionsTracked] : 'N/A'
      });

      setRaidSummary(newRaidSummary);
    },[ raid, groupedByType ])

    function getPlayerBrain(player: TrackingRaidDataPlayers): string {
        if (player) {
          if (isHumanPlayer(player, raid.profileId)) return 'PLAYER';

          const botMapping = { type: resolveBotType(player) };

          switch (botMapping.type){
              case 'BOSS':
                  return "BOSS"
              case 'RAIDER':
                  return "RAIDER"
              case 'FOLLOWER':
                  return "FOLLOWER"
              case 'PLAYER_SCAV':
                  return "PLAYER SCAV"
              case 'SNIPER':
                  return "SNIPER"
              case 'GOON':
                  return "GOON"
              case 'ROGUE':
                  return "ROGUE"
              case 'CULT':
                  return "CULTIST"
              case 'BLOODHOUND':
                  return "BLOODHOUND"
              case 'MERCENARY':
                  return "MERCENARY"
              case 'RUAF':
                  return "RUAF"
              case 'UNTAR':
                  return "UNTAR"
              case 'BLACKDIV':
                  return "BLACK DIV"
              case 'ISB':
                  return "ISB"
              case 'ISB_WT':
                  return "ISB WT"
              case 'COMBINE':
                  return "COMBINE"
              case 'INFECTED':
                  return "INFECTED"
              case 'SPECIAL':
              case 'OTHER':
                  return "SPECIAL"
              default:
                  if(player.team === "Savage") {
                    return ""
                  }
                  return player.mod_SAIN_brain != null ? `${player.mod_SAIN_brain}` : "(PMC)"
          }
        }

        return "(UNKNOWN)"
      }

      function getPlayerDifficultyAndBrain(player: TrackingRaidDataPlayers): string {
        if (player) {
          if (isHumanPlayer(player, raid.profileId)) return 'PLAYER';
          let difficulty = player.mod_SAIN_difficulty;
          let brain = isRaiderHunter(player) ? 'Raider (Hunter)' : getPlayerBrain(player);

          const category = resolveBotType(player);
          if (["RUAF", "UNTAR", "BLACKDIV", "MERCENARY", "COMBINE"].includes(category)) {
            const role = getFactionRole(player);
            if (role) return role;
          }

          // ISB only: its WildSpawnType names are misleading (variants reuse the
          // boss-roster slot names). Prefer SAIN's author-controlled bot-type name
          // (e.g. "ISB Operator"), appending the SAIN personality when known; if no
          // SAIN name was captured, use the known role's display name.
          if (["ISB", "ISB_WT"].includes(resolveBotType(player))) {
            const sainName = getIsbDisplayName(player);
            const personality = (player.mod_SAIN_brain || "").trim();
            const hasPersonality = personality !== "" && !["UNKNOWN", "PMC", "SCAV", "PLAYER"].includes(personality);
            if (sainName !== "") {
              return hasPersonality ? `${sainName} - ${personality}` : sainName;
            }
            if (hasPersonality) brain = personality;
          }

          if (difficulty !== null && difficulty !== "") {
            if(player.team === "Savage" && brain === "") {
              return difficulty;
            }
            return `${difficulty} - ${brain}`;
          }

          else if (player.team === "Savage") {
            if(brain !== null && brain !== "") {
              return `${brain}`;
            }
            else return "";
          }

          return `${brain}`;
        }

        return "";
      }

      function getFactionBadge(player: TrackingRaidDataPlayers, isMainPlayer: boolean): { color: string, label: string } {
        if (isHumanPlayer(player) || isMainPlayer) {
          return { color: getPlayerColor(player, 0), label: 'Player' };
        }
        const brain = getPlayerBrain(player);
        if (FACTION_COLORS[brain]) {
          return FACTION_COLORS[brain];
        }
        const side = SIDE_COLORS[player.team];
        if (side && (player.team === 'Usec' || player.team === 'Bear')) {
          const teamColor = getPlayerColor(player, 0);
          return { color: teamColor, label: `${side.label} #${player.group}` };
        }
        return side || { color: '#6B7280', label: player.team };
      }

      type PlayerRow = {
        p: TrackingRaidDataPlayers
        index: number
        groupIndex: number
        SAIN: string
        isMainPlayer: boolean
        lastStatus: ReturnType<ReturnType<typeof finalPlayerStatuses>['get']>
        isDead: boolean
        isExtracted: boolean
        badge: { color: string, label: string }
        stats: { kills: number, lootings: number, lootedValue: number, spawnValue: number, accuracy: number } | undefined
        accuracy: number
        accuracyColor: string
        killInfo: { killerName: string, weapon: string, distance: string, bodyPart: string } | null | undefined
        groupBorder: string
        groupTint: string
        highlightClass: string
      }

      // Shared by the desktop table and the phone cards.
      function buildPlayerRows(raid: TrackingRaidData): PlayerRow[][] | null {
        if (!raid || !groupedBy || groupedBy.length === 0) return null;

        const victimIds = selectedProfileId
          ? new Set(raid.kills?.filter(k => k.profileId === selectedProfileId).map(k => k.killedId))
          : new Set<string>();
        const killerOfSelected = selectedProfileId
          ? raid.kills?.find(k => k.killedId === selectedProfileId)?.profileId
          : null;

        const statusByProfile = finalPlayerStatuses(raid.player_status, raid.isHeadless ? Number(raid.timeInRaid) : undefined);
        const mainExtracted = /^(Survived|Runner)$/i.test(raid.exitStatus || '');

        return groupedBy.map((gp, groupIndex) => {
          const sorted = sortPlayers(gp);
          return sorted.map((p, index) => {
            // No .toLowerCase() here: the `capitalize` CSS on the cell only upper-cases
            // the first letter of each word, so lower-casing first would mangle all-caps
            // labels like "ISB" into "Isb". The map legend doesn't lower-case either, so
            // this keeps the two views consistent.
            const SAIN = getPlayerDifficultyAndBrain(p);
            const isMainPlayer = p.profileId === raid.profileId;
            const lastStatus = statusByProfile.get(p.profileId);
            // The local player's raid result is authoritative.
            const isDead = isMainPlayer
              ? !mainExtracted && /^(Killed|MissingInAction|LeftRaid|Left)$/i.test(raid.exitStatus || '')
              : lastStatus === 'Dead';
            const isExtracted = isMainPlayer
              ? (!isDead && mainExtracted)
              : (!isDead && lastStatus === 'Extracted');
            const badge = getFactionBadge(p, isMainPlayer);
            const stats = calcStats?.get(p.profileId);
            const accuracy = stats?.accuracy || 0;
            const accuracyColor = accuracy >= 50 ? '#22C55E' : accuracy >= 20 ? '#EAB308' : '#EF4444';
            const killInfo = isDead ? killedByMap.get(p.profileId) : null;

            const groupBorder = index === 0 ? 'border-t border-dashed border-eft' : index === sorted.length - 1 ? 'border-b border-dashed border-eft' : '';
            const groupTint = groupIndex % 2 === 1 ? 'leaderboard-group-alt' : '';

            let highlightClass = '';
            if (selectedProfileId) {
              if (p.profileId === selectedProfileId) highlightClass = 'leaderboard-selected';
              else if (victimIds.has(p.profileId)) highlightClass = 'leaderboard-victim';
              else if (p.profileId === killerOfSelected) highlightClass = 'leaderboard-killer';
            }

            return { p, index, groupIndex, SAIN, isMainPlayer, lastStatus, isDead, isExtracted, badge, stats, accuracy, accuracyColor, killInfo, groupBorder, groupTint, highlightClass };
          });
        });
      }

      function renderStatus({ isDead, isExtracted, isMainPlayer, lastStatus }: PlayerRow) {
        return isDead
          ? <span className="text-red-500 font-semibold">KIA</span>
          : isExtracted
            ? <span className="text-blue-400 font-semibold">Extracted</span>
            : <span className={`${lastStatus === 'Downed' ? 'text-yellow-400' : lastStatus === 'Alive' || isMainPlayer ? 'text-green-500' : 'text-gray-400'} font-semibold`}>{isMainPlayer && lastStatus !== 'Downed' ? 'Alive' : playerStatusLabel(lastStatus)}</span>
      }

      function renderBadge(badge: { color: string, label: string }) {
        return (
          <span
            className="inline-block rounded px-2 py-0.5 text-xs font-bold uppercase whitespace-nowrap"
            style={{ background: badge.color, color: needsDarkText(badge.color) ? '#000' : '#fff' }}
          >
            {badge.label}
          </span>
        );
      }

      function renderAccuracy({ accuracy, accuracyColor }: PlayerRow) {
        return (
          <div className="flex items-center justify-center gap-1">
            <div className="w-10 h-1.5 rounded-full overflow-hidden" style={{ background: '#333' }}>
              <div className="h-full rounded-full" style={{ width: `${accuracy}%`, background: accuracyColor }} />
            </div>
            <span className="text-xs">{accuracy > 0 ? `${accuracy}%` : '-'}</span>
          </div>
        );
      }

      function toggleSelected(profileId: string) {
        setSelectedProfileId(prev => prev === profileId ? null : profileId);
      }

      function generatePlayerTable(rows: PlayerRow[][] | null) {
        if (!rows) return null;

        return rows.map(group => group.map(row => {
          const { p, index, groupIndex, SAIN, isMainPlayer, isDead, badge, stats, killInfo, groupBorder, groupTint, highlightClass } = row;
          return (
              <tr
                key={`g${groupIndex}-${index}`}
                className={`${isDead ? 'opacity-75' : ''} ${groupBorder} ${groupTint} ${isMainPlayer ? 'leaderboard-player-row font-bold' : ''} ${highlightClass}`}
                onClick={() => toggleSelected(p.profileId)}
              >
                <td className="text-center p-2">
                  {renderBadge(badge)}
                </td>
                <td className="text-center p-2 uppercase border-x border-eft">{p.group}</td>
                <td className="text-center p-2 border-x border-eft">{p.level}</td>
                <td className="text-left p-2">
                  <div>{displayPlayerName(p.name)}</div>
                  {killInfo && (
                    <div className="text-xs opacity-50 mt-0.5">
                      by {displayPlayerName(killInfo.killerName)} ({killInfo.weapon}, {Number(killInfo.distance).toFixed(0)}m, {killInfo.bodyPart})
                    </div>
                  )}
                </td>
                <td className="text-center p-2 border-x border-eft">
                  {renderStatus(row)}
                </td>
                <td className="text-right p-2 capitalize">{raid.detectedMods?.match(/SAIN/gi) ? SAIN : ''}</td>
                <td className="text-center p-2 w-12 border-l border-eft">{stats ? stats.kills || '-' : null}</td>
                <td className={`text-center p-2 w-12 ${(stats && stats.lootings < 0) ? 'text-red-400' : 'text-green-400'}`}>{stats ? stats.lootings || '-' : null}</td>
                <td className={`text-center p-2 w-16 text-xs ${stats && stats.lootedValue < 0 ? 'text-red-400' : 'text-yellow-400'}`}>
                  {stats ? (stats.lootedValue ? formatCompactNumber(stats.lootedValue) : '-') : null}
                </td>
                <td className="text-center p-2 w-16 text-xs text-orange-300">
                  {stats ? (stats.spawnValue ? formatCompactNumber(stats.spawnValue) : '-') : null}
                </td>
                <td className="text-center p-2 w-24">
                  {stats ? renderAccuracy(row) : null}
                </td>
                <td className="text-right p-2 border-l border-eft">{msToHMS(Number(p.spawnTime))}</td>
              </tr>
          );
        }));
      }

      function generatePlayerCards(rows: PlayerRow[][] | null) {
        if (!rows) return <div className="border border-eft p-3">No Data.</div>;
        const hasSain = !!raid.detectedMods?.match(/SAIN/gi);

        return rows.map((group, groupIndex) => (
          <div key={`g${groupIndex}`} className={`leaderboard-group border border-eft ${groupIndex % 2 === 1 ? 'leaderboard-group-alt' : ''}`}>
            {group.map(row => {
              const { p, index, SAIN, isMainPlayer, isDead, badge, stats, killInfo, highlightClass } = row;
              const selected = selectedProfileId === p.profileId;
              return (
                <div
                  key={`g${groupIndex}-${index}`}
                  role="button"
                  tabIndex={0}
                  aria-pressed={selected}
                  className={`leaderboard-card ${isDead ? 'opacity-75' : ''} ${isMainPlayer ? 'leaderboard-player-row' : ''} ${highlightClass}`}
                  onClick={() => toggleSelected(p.profileId)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSelected(p.profileId); } }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {renderBadge(badge)}
                    <span className={`truncate ${isMainPlayer ? 'font-bold' : ''}`}>{displayPlayerName(p.name)}</span>
                    <span className="ml-auto text-sm whitespace-nowrap">{renderStatus(row)}</span>
                  </div>
                  <div className="flex items-baseline justify-between gap-2 text-xs mt-1">
                    <span className="opacity-70 whitespace-nowrap">Lvl {p.level} · Team {p.group} · {msToHMS(Number(p.spawnTime))}</span>
                    {hasSain && SAIN && <span className="capitalize opacity-70 truncate text-right">{SAIN}</span>}
                  </div>
                  {killInfo && (
                    <div className="text-xs opacity-50 mt-1 break-words">
                      by {displayPlayerName(killInfo.killerName)} ({killInfo.weapon}, {Number(killInfo.distance).toFixed(0)}m, {killInfo.bodyPart})
                    </div>
                  )}
                  {stats && (
                    <dl className="leaderboard-card-stats">
                      <div><dt>Kills</dt><dd>{stats.kills || '-'}</dd></div>
                      <div><dt>Loot</dt><dd className={stats.lootings < 0 ? 'text-red-400' : 'text-green-400'}>{stats.lootings || '-'}</dd></div>
                      <div><dt>Value</dt><dd className={stats.lootedValue < 0 ? 'text-red-400' : 'text-yellow-400'}>{stats.lootedValue ? formatSignedCompactNumber(stats.lootedValue) : '-'}</dd></div>
                      <div><dt>Spawn</dt><dd className="text-orange-300">{stats.spawnValue ? formatSignedCompactNumber(stats.spawnValue) : '-'}</dd></div>
                      <div>
                        <dt>Acc.</dt>
                        <dd style={{ color: row.accuracy > 0 ? row.accuracyColor : undefined }}>{row.accuracy > 0 ? `${row.accuracy}%` : '-'}</dd>
                        <div className="leaderboard-card-accuracy" aria-hidden="true"><div style={{ width: `${row.accuracy}%`, background: row.accuracyColor }} /></div>
                      </div>
                    </dl>
                  )}
                </div>
              );
            })}
          </div>
        ));
      }

      const playerRows = buildPlayerRows(raid);

    return (
      <>
        <section>
          <div className="w-full text-lg font-bold">Overview</div>
          <table id="raid-overview" className="mb-2 w-full border border-eft">
                  <tbody>
                      {raidSummary && raidSummary.length ? raidSummary.map(rs =>
                        <tr key={rs.title}>
                          <td className="text-right bg-eft text-black font-bold px-2">{ rs.title }</td>
                          <td className="px-2">{ rs.value }</td>
                        </tr>
                      ) : <tr>
                        <td colSpan={2}>No Data...</td>
                      </tr>}
                  </tbody>
            </table>
        </section>

        <section className="mt-4">
            <div className="w-full flex flex-row justify-between items-center">
              <span className="text-lg font-bold">Leaderboard</span>
              <span className="text-sm opacity-70 max-md:hidden">Click row to show kills | Sort by Lvl, K, L, V, SV, A%</span>
              <span className="text-xs opacity-70 md:hidden">Tap a player to show kills</span>
            </div>

            <div className="leaderboard-controls md:hidden">
              <div className="flex items-center gap-2">
                <span className="opacity-70">Group</span>
                <div className="leaderboard-segmented" role="group" aria-label="Group players by">
                  {([['TEAM', 'Side'], ['GROUP', 'Squad'], ['', 'None']] as const).map(([value, label]) => (
                    <button key={label} type="button" aria-pressed={groupedByType === value}
                      className={groupedByType === value ? 'bg-eft text-black' : ''}
                      onClick={() => setGroupedByType(value)}>{label}</button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="leaderboard-sort" className="opacity-70">Sort</label>
                <select id="leaderboard-sort" value={sortKey ?? ''}
                  onChange={e => { const key = (e.target.value || null) as SortKey; setSortKey(key); setSortDir('desc'); }}>
                  <option value="">Default</option>
                  <option value="lvl">Level</option>
                  <option value="kills">Kills</option>
                  <option value="lootings">Looted items</option>
                  <option value="lootedValue">Looted value</option>
                  <option value="spawnValue">Spawn value</option>
                  <option value="accuracy">Accuracy</option>
                </select>
                <button type="button" disabled={!sortKey} aria-label={sortDir === 'asc' ? 'Ascending, switch to descending' : 'Descending, switch to ascending'}
                  className="leaderboard-sort-dir"
                  onClick={() => setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')}>{sortDir === 'asc' ? '▲' : '▼'}</button>
              </div>
            </div>

            <div className="leaderboard-cards md:hidden">
              {generatePlayerCards(playerRows)}
            </div>

            <table id="raid-leaderboard" className="mb-2 w-full border border-eft max-md:hidden">
                <thead>
                    <tr className="bg-eft text-black">
                        <th className={`text-center px-2 underline cursor-pointer ${groupedByType === 'TEAM' ? 'bg-black text-eft' : ''}`} onClick={() => setGroupedByType('TEAM')}>Side</th>
                        <th className={`text-center px-2 underline cursor-pointer ${groupedByType === 'GROUP' ? 'bg-black text-eft' : ''}`} onClick={() => setGroupedByType('GROUP')}>Team</th>
                        <th className="text-center px-2 cursor-pointer hover:bg-black/10" onClick={() => handleSort('lvl')}>Lvl{sortIndicator('lvl')}</th>
                        <th className="text-left px-2">Username</th>
                        <th className="text-center px-2">Status</th>
                        <th className="text-right px-2">{raid.detectedMods?.match(/SAIN/gi) ? 'SAIN' : ''}</th>
                        <th className="text-center px-2 cursor-pointer hover:bg-black/10" title="Kills" onClick={() => handleSort('kills')}>K{sortIndicator('kills')}</th>
                        <th className="text-center px-2 cursor-pointer hover:bg-black/10" title="Looted items" onClick={() => handleSort('lootings')}>L{sortIndicator('lootings')}</th>
                        <th className="text-center px-2 cursor-pointer hover:bg-black/10" title="Looted value (₽)" onClick={() => handleSort('lootedValue')}>V{sortIndicator('lootedValue')}</th>
                        <th className="text-center px-2 cursor-pointer hover:bg-black/10" title="Spawn value (₽)" onClick={() => handleSort('spawnValue')}>SV{sortIndicator('spawnValue')}</th>
                        <th className="text-center px-2 cursor-pointer hover:bg-black/10" title="Accuracy" onClick={() => handleSort('accuracy')}>A%{sortIndicator('accuracy')}</th>
                        <th className={`text-right px-2 underline cursor-pointer ${groupedByType === '' ? 'bg-black text-eft' : ''}`} onClick={() => setGroupedByType('')}>Spawned</th>
                    </tr>
                </thead>
                <tbody>
                    {generatePlayerTable(playerRows) || <tr><td colSpan={12}>No Data.</td></tr>}
                </tbody>
            </table>
        </section>
      </>
    );
}
