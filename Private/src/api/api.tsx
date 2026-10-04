import { parseAirdropFlights } from '../helpers/airdropFlights';
import { parseSwitches } from '../helpers/switches';
import { parseAirdrops } from '../helpers/airdrops';
import { parseGhostWakes } from '../helpers/ghostWakes';
import { ISptProfile } from '../types/api_types';
import { TrackingRaidData, TrackingCoreDataRaids } from '../types/api_types';
import { parseGhostHearing } from '../helpers/ghostHearing';
import type { TrackingOrbitGhostHearing } from '../types/api_types';

let isDev = window.location.host.includes("5173");
let hostname = isDev ? 'http://127.0.0.1:7829' : '';

const api = {
    getIntl: async function() : Promise<{ [key: string] : string }> {
        let intl = {} as { [key: string] : string };
        try {
            const response = await fetch(hostname + '/api/intl');
            const data = await response.json() as { [key: string] : string };
            return data;
        } 
        
        catch (error) {
            return intl;
        }
    },

    getRaids: async function(profileIds: string[] = []) : Promise<TrackingCoreDataRaids[]> {
        let raids = [] as TrackingCoreDataRaids[];
        try {
            const query = profileIds.length > 0 ? `?profiles=${encodeURIComponent(JSON.stringify(profileIds))}` : '';
            const response = await fetch(hostname + `/api/raids` + query);
            const data = await response.json() as TrackingCoreDataRaids[];
            raids = data;
            return data
        } 
        
        catch (error) {
            return raids;
        }
    },


    getProfiles: async function() : Promise<ISptProfile[]> {
        let profiles = [] as ISptProfile[];
        try {
            const response = await fetch(hostname + '/api/profile/all');
            const data = await response.json() as ISptProfile[];

            return data;
        } 
        
        catch (error) {
            return profiles;
        }
    },


    getRaid : async function(raidId: string) : Promise<TrackingRaidData> {
        let raid = {} as TrackingRaidData;
        try {
            const response = await fetch(hostname + `/api/raids/${raidId}`);
            const data = await response.json() as TrackingRaidData;
            raid = data;
            return raid
        } 
        
        catch (error) {
            return raid;
        }
    },

    getRaidTempFiles : async function(raidId: string) : Promise<boolean> {
        try {
            const response = await fetch(hostname + `/api/raids/${raidId}/tempFiles`);
            const data = await response.json() as boolean;
            return data;
        } 
        
        catch (error) {
            return false;
        }
    },

    deleteRaidsTempFiles : async function(payload : string[]) : Promise<string[]> {
        try {
            const response = await fetch(hostname + `/api/raids/deleteTempFiles`, {
                method: 'POST',
                headers: {
                  'Accept': 'application/json',
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    "raidIds": payload
                })
            });
            const delete_result = await response.json() as string[];

            return delete_result;
        } 
        
        catch (error) {
            return [];
        }
    },

    deleteRaids : async function(payload : string[]) : Promise<string[]> {
        try {

            const response = await fetch(hostname + `/api/raids/deleteAllData`, {
                method: 'POST',
                headers: {
                  'Accept': 'application/json',
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    "raidIds": payload
                })
            });
            const delete_result = await response.json() as string[];

            return delete_result
        } 
        
        catch (error) {
            return [];
        }
    },

    getRaidPositionalData : async function(raidId: string) : Promise<any> {
        let positions = [] as any;
        try {
            const cached = window.sessionStorage.getItem(`${raidId}_positions`);
            if (cached) {
                positions = JSON.parse(cached);
            } 
            
            else {
                const response = await fetch(hostname + `/api/raids/${raidId}/positions`);
                positions = await response.json() as any;
            }

            if (positions) {
                window.sessionStorage.setItem(`${raidId}_positions`, JSON.stringify(positions));
            }

            return positions;
        } catch (error) {
            return positions;
        }
    },

    getRaidHeatmapData : async function(raidId: string) : Promise<any> {
        let heatmapData = [] as any;
        try {
            const response = await fetch(hostname + `/api/raids/${raidId}/positions/heatmap`);
            heatmapData = await response.json() as any;
            return heatmapData;
        } catch (error) {
            return heatmapData;
        }
    },

    getRaidLooseLoot : async function(raidId: string) : Promise<any[]> {
        try {
            const response = await fetch(hostname + `/api/raids/${raidId}/loose_loot`);
            return await response.json();
        } catch (error) {
            return [];
        }
    },

    getRaidBotQuests : async function(raidId: string) : Promise<any[]> {
        try {
            const response = await fetch(hostname + `/api/raids/${raidId}/bot_quests`);
            return await response.json();
        } catch (error) {
            return [];
        }
    },

    getRaidBotObjectives : async function(raidId: string) : Promise<any[]> {
        try {
            const response = await fetch(hostname + `/api/raids/${raidId}/bot_objectives`);
            return await response.json();
        } catch (error) {
            return [];
        }
    },

    getRaidPhobosField : async function(raidId: string) : Promise<any[]> {
        try {
            const response = await fetch(hostname + `/api/raids/${raidId}/phobos_field`);
            return await response.json();
        } catch (error) {
            return [];
        }
    },

    getRaidOrbitField : async function(raidId: string) : Promise<any[]> {
        try {
            const response = await fetch(hostname + `/api/raids/${raidId}/orbit_field`);
            return await response.json();
        } catch (error) {
            return [];
        }
    },

    getRaidOrbitBotObjectives : async function(raidId: string) : Promise<any[]> {
        try {
            const response = await fetch(hostname + `/api/raids/${raidId}/orbit_bot_objectives`);
            return await response.json();
        } catch (error) {
            return [];
        }
    },

    getRaidSwitches: async function(raidId: string, signal?: AbortSignal) {
        const response = await fetch(hostname + `/api/raids/${raidId}/switches`, { signal });
        if (response.status === 404) return null;
        if (!response.ok) throw new Error('Could not load switches');
        return parseSwitches(await response.json());
    },

    getRaidAirdropFlights: async function(raidId: string, signal?: AbortSignal) {
        const response = await fetch(hostname + `/api/raids/${raidId}/airdrop_flights`, { signal });
        if (response.status === 404) return null;
        if (!response.ok) throw new Error('Could not load airdrop flights');
        return parseAirdropFlights(await response.json());
    },

    getRaidAirdrops: async function(raidId: string, signal?: AbortSignal) {
        const response = await fetch(hostname + `/api/raids/${raidId}/airdrops`, { signal });
        if (response.status === 404) return null;
        if (!response.ok) throw new Error('Could not load airdrops');
        return parseAirdrops(await response.json());
    },

    getRaidOrbitGhostWakes: async function(raidId: string, signal?: AbortSignal): Promise<import('../helpers/ghostWakes').GhostWake[] | null> {
        const response = await fetch(hostname + `/api/raids/${raidId}/orbit_ghost_wake`, { signal });
        if (response.status === 404) return null;
        if (!response.ok) throw new Error('Could not load Ghost wake diagnostics');
        return parseGhostWakes(await response.json());
    },

    getRaidOrbitGhostHearing : async function(raidId: string, signal?: AbortSignal) : Promise<TrackingOrbitGhostHearing[] | null> {
        const response = await fetch(hostname + `/api/raids/${raidId}/orbit_ghost_hearing`, { signal });
        if (response.status === 404) return null;
        if (!response.ok) throw new Error('Could not load Ghost hearing');
        return parseGhostHearing(await response.json());
    },

    getRaidOrbitGhostFights : async function(raidId: string) : Promise<any[]> {
        try {
            const response = await fetch(hostname + `/api/raids/${raidId}/orbit_ghost_fights`);
            return await response.json();
        } catch (error) {
            return [];
        }
    },

    getRaidOrbitMainObjectives : async function(raidId: string) : Promise<any[]> {
        try {
            const response = await fetch(hostname + `/api/raids/${raidId}/orbit_main_objectives`);
            return await response.json();
        } catch (error) {
            return [];
        }
    },

    // Map of SPT quest zoneId → quest title (built server-side from
    // quests.json + locale). Used to resolve friendly names on ORBIT
    // Quest waypoint tooltips. One-shot, cached server-side and frontend-side.
    getQuestNames : async function() : Promise<Record<string, string>> {
        try {
            const response = await fetch(hostname + `/api/quest_names`);
            return await response.json();
        } catch (error) {
            return {};
        }
    }
}

export default api
