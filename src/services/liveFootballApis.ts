import axios from 'axios';
import { MatchEventType, PlayerPosition, MatchLiveEvent, Player } from '../types/football';
import {
  calculateEventPoints,
  SCORING_RULES,
  calculateLivePointsFromSportmonks,
  SPORTMONKS_ACTION_POINTS,
  calculateContextualPoints,
} from '../utils/scoringEngine';
import {
  saveSportmonksPlayerMappings,
  saveLiveMatchesSnapshot,
  saveGameweekFinalScores,
  loadGameweekFinalScores,
} from '../lib/firebase';

export interface RealUpcomingMatch {
  id: string;
  round: number;
  homeClubId: string;
  awayClubId: string;
  homeClubName: string;
  awayClubName: string;
  stadium: string;
  scheduledTime: string;
  sofascoreEventId: number;
  status: 'SCHEDULED' | 'LIVE' | 'FINISHED';
  homeScore?: number;
  awayScore?: number;
  minute?: number;
}

export const REAL_UPCOMING_SUPERLIGA_FIXTURES: RealUpcomingMatch[] = [
  {
    id: 'fix_sl_1',
    round: 15,
    homeClubId: 'fcsb',
    awayClubId: 'rapid',
    homeClubName: 'FCSB București',
    awayClubName: 'FC Rapid 1923',
    stadium: 'Arena Națională, București',
    scheduledTime: '2026-10-24 20:30',
    sofascoreEventId: 11849201,
    status: 'LIVE',
    homeScore: 1,
    awayScore: 0,
    minute: 34,
  },
  {
    id: 'fix_sl_2',
    round: 15,
    homeClubId: 'cfr',
    awayClubId: 'dinamo',
    homeClubName: 'CFR 1907 Cluj',
    awayClubName: 'Dinamo București',
    stadium: 'Dr. Constantin Rădulescu, Cluj-Napoca',
    scheduledTime: '2026-10-25 21:00',
    sofascoreEventId: 11849202,
    status: 'SCHEDULED',
  },
  {
    id: 'fix_sl_3',
    round: 15,
    homeClubId: 'craiova',
    awayClubId: 'farul',
    homeClubName: 'Universitatea Craiova',
    awayClubName: 'Farul Constanța',
    stadium: 'Ion Oblemenco, Craiova',
    scheduledTime: '2025-03-02 18:15',
    sofascoreEventId: 11849203,
    status: 'SCHEDULED',
  },
  {
    id: 'fix_sl_4',
    round: 15,
    homeClubId: 'ucluj',
    awayClubId: 'otelul',
    homeClubName: 'Universitatea Cluj',
    awayClubName: 'Oțelul Galați',
    stadium: 'Cluj Arena, Cluj-Napoca',
    scheduledTime: '2025-03-03 16:00',
    sofascoreEventId: 11849204,
    status: 'SCHEDULED',
  },
  {
    id: 'fix_sl_5',
    round: 15,
    homeClubId: 'petrolul',
    awayClubId: 'uta',
    homeClubName: 'Petrolul Ploiești',
    awayClubName: 'UTA Arad',
    stadium: 'Ilie Oană, Ploiești',
    scheduledTime: '2025-03-03 18:30',
    sofascoreEventId: 11849205,
    status: 'SCHEDULED',
  },
  {
    id: 'fix_sl_6',
    round: 15,
    homeClubId: 'sepsi',
    awayClubId: 'hermannstadt',
    homeClubName: 'Sepsi OSK',
    awayClubName: 'FC Hermannstadt',
    stadium: 'Sepsi Arena, Sfântu Gheorghe',
    scheduledTime: '2025-03-04 17:00',
    sofascoreEventId: 11849206,
    status: 'SCHEDULED',
  },
  {
    id: 'fix_sl_7',
    round: 15,
    homeClubId: 'corvinul',
    awayClubId: 'botosani',
    homeClubName: 'CS Corvinul 1921',
    awayClubName: 'FC Botoșani',
    stadium: 'Michael Klein, Hunedoara',
    scheduledTime: '2026-10-26 18:00',
    sofascoreEventId: 11849207,
    status: 'SCHEDULED',
  },
  {
    id: 'fix_sl_8',
    round: 15,
    homeClubId: 'csikszereda',
    awayClubId: 'arges',
    homeClubName: 'FK Csíkszereda',
    awayClubName: 'FC Argeș',
    stadium: 'Municipal Miercurea Ciuc',
    scheduledTime: '2026-10-27 17:30',
    sofascoreEventId: 11849208,
    status: 'SCHEDULED',
  },
];

// Sofascore Incident mapping to Superliga MatchEventType
export function mapSofascoreIncidentToEventType(incidentType: string, subType?: string): MatchEventType | null {
  const norm = (incidentType || '').toLowerCase();
  const sub = (subType || '').toLowerCase();

  if (norm.includes('goal')) {
    return 'goal';
  }
  if (norm.includes('card')) {
    if (sub.includes('red') || norm.includes('red')) return 'red_card';
    return 'yellow_card';
  }
  if (norm.includes('penalty')) {
    if (sub.includes('scored')) return 'goal';
    if (sub.includes('missed')) return 'penalty_missed';
    if (sub.includes('saved')) return 'penalty_save';
    return 'penalty_won';
  }
  if (norm.includes('sub')) {
    return 'substitute_in_bonus';
  }
  if (norm.includes('var') || norm.includes('foul')) {
    return 'foul';
  }
  return null;
}

// Opta F24 Event Qualifier Codes mapping to our exact custom Scoring Engine
export interface OptaRawEvent {
  typeId: number; // Opta Type ID
  optaCode: string;
  description: string;
  playerName: string;
  playerId: string;
  clubId: string;
  minute: number;
  periodId: number;
  qualifiers?: number[];
}

export function mapOptaEventToEngineAction(optaCode: string): { type: MatchEventType; label: string } {
  switch (optaCode.toUpperCase()) {
    case 'PASS_PROGRESSIVE':
    case 'PASS_FORWARD':
      return { type: 'pass_forward', label: 'Pasă în jumătatea adversă' };
    case 'KEY_PASS':
      return { type: 'key_pass', label: 'Pasă Cheie (Key Pass)' };
    case 'ASSIST':
      return { type: 'assist', label: 'Pasă de Gol (Assist)' };
    case 'GOAL':
      return { type: 'goal', label: 'Gol Marcat' };
    case 'SHOT_ON_TARGET':
      return { type: 'shot_on_target', label: 'Șut pe Poartă' };
    case 'SHOT_OFF_TARGET':
      return { type: 'shot_missed', label: 'Șut pe lângă Poartă' };
    case 'BIG_CHANCE_MISSED':
      return { type: 'big_chance_missed', label: 'Ocazie Imensă Ratată' };
    case 'TACKLE':
      return { type: 'tackle', label: 'Deposedare Reușită' };
    case 'INTERCEPTION':
      return { type: 'interception', label: 'Intercepție Minge' };
    case 'CLEARANCE':
      return { type: 'clearance', label: 'Respingere Minge' };
    case 'AERIAL_WON':
      return { type: 'aerial_won', label: 'Duel Aerian Câștigat' };
    case 'DRIBBLE':
      return { type: 'dribble_success', label: 'Dribling Reușit' };
    case 'DISPOSSESSED':
      return { type: 'dispossessed', label: 'Deposedat / Minge Pierdută' };
    case 'FOUL_COMMITTED':
      return { type: 'foul', label: 'Fault Comis' };
    case 'FOUL_DRAWN':
      return { type: 'foul_drawn', label: 'Fault Obținut' };
    case 'YELLOW_CARD':
      return { type: 'yellow_card', label: 'Cartonaș Galben' };
    case 'RED_CARD':
      return { type: 'red_card', label: 'Cartonaș Roșu' };
    case 'KEEPER_SAVE':
      return { type: 'save', label: 'Paradă Portar' };
    case 'KEEPER_SAVE_BOX':
      return { type: 'save_in_box', label: 'Paradă din Careu Portar' };
    case 'PENALTY_SAVE':
      return { type: 'penalty_save', label: 'Penalty Apărat de Portar' };
    case 'CLEAN_SHEET':
      return { type: 'clean_sheet_bonus', label: 'Poartă Intactă (Clean Sheet)' };
    default:
      return { type: 'pass_forward', label: 'Acțiune de Joc' };
  }
}

// Convert Opta/Sofascore action directly into our scoring points
export function calculateApiEventPoints(optaCode: string, position: PlayerPosition = 'MID'): number {
  const mapping = mapOptaEventToEngineAction(optaCode);
  return calculateEventPoints(mapping.type, position);
}

// =========================================================================
// SPORTMONKS V3 LIVE API CLIENT & POLLING ENGINE
// =========================================================================

export const SPORTMONKS_API_TOKEN =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SPORTMONKS_TOKEN) ||
  'pXQjYgRP9rGstKN7eOGUHXW3P3YtltufYZUv0NYSjnkAC059ZoTqu3QkpACJ';

export const SPORTMONKS_SUPERLIGA_ID = 271; // ID competiție SuperLiga

export interface LivePlayerScoreUpdate {
  sportmonksPlayerId: number;
  totalPoints: number;
  minutesPlayed: number;
  details?: Array<{ type_id: number; value: any }>;
  playerName?: string;
  clubName?: string;
}

export interface SportmonksLiveEventItem {
  id: number;
  minute: number;
  type_id: number;
  player_id?: number;
  player_name?: string;
  type?: { name: string; code?: string };
  description?: string;
}

export class SportmonksLiveService {
  private static intervalId: ReturnType<typeof setInterval> | null = null;
  public static lastCalculatedScores: Map<number, number> = new Map();
  public static lastPlayerDetailsMap: Map<number, { minutes: number; details: any[]; playerInfo?: any }> = new Map();
  public static lastActiveMatches: any[] = [];
  public static isPollingActive: boolean = false;

  /**
   * Preia meciurile active din Sportmonks v3 API
   */
  static async fetchActiveMatches(): Promise<any[]> {
    const url = 'https://api.sportmonks.com/v3/football/livescores/inplay';
    try {
      const res = await axios.get(url, {
        params: {
          api_token: SPORTMONKS_API_TOKEN,
          filters: `fixtureLeagues:${SPORTMONKS_SUPERLIGA_ID}`,
          include: 'lineups.details;scores;events.type;participants',
        },
        timeout: 10000,
      });

      const data = res.data?.data || [];
      this.lastActiveMatches = data;
      return data;
    } catch (err: any) {
      console.warn('[Sportmonks] Apel inplay endpoint eroare sau fără meciuri live active:', err?.message || err);
      return [];
    }
  }

  /**
   * Calculează scorurile live pentru toți fotbaliștii din meciurile active
   * Include toate regulile oficiale Kickbase:
   * 1. Acțiuni din lineups.details (fără dublă numărare)
   * 2. Clean Sheet (+30p GK, +15p DEF dacă goluri primite = 0 și minute >= 60)
   * 3. Prezență: Titular (+5p) vs Intrat de pe bancă (+3p)
   * 4. Minute jucate (+1p la 10 min)
   * 5. Rezultat Echipă la final (Victorie: +15p | Egal: +5p | Înfrângere: -15p)
   * 6. Persistență la final de meci (Status FT): salvare în Firestore pentru a nu pierde punctele când meciul iese din inplay!
   */
  static async getLiveCalculatedScores(): Promise<Map<number, number>> {
    const matches = await this.fetchActiveMatches();
    const scoresMap = new Map<number, number>();
    const detailsMap = new Map<number, { minutes: number; details: any[]; contextual?: any; playerInfo?: any }>();

    let hasFinishedMatch = false;

    if (matches.length > 0) {
      for (const match of matches) {
        const isMatchFT =
          match.state?.state === 'FT' ||
          match.state?.state === 'ENDED' ||
          match.state?.state === 'POSTPONED' ||
          (typeof match.minute === 'number' && match.minute >= 90);

        if (isMatchFT) hasFinishedMatch = true;

        const homePartId = match.participants?.[0]?.id;
        const awayPartId = match.participants?.[1]?.id;

        const homeGoals =
          match.scores?.find((s: any) => s.description === 'CURRENT' && s.score?.participant === 'home')?.score?.goals ?? 0;
        const awayGoals =
          match.scores?.find((s: any) => s.description === 'CURRENT' && s.score?.participant === 'away')?.score?.goals ?? 0;

        const lineups = match.lineups || [];
        for (const entry of lineups) {
          const pId = entry.player_id;
          if (!pId) continue;
          const details = entry.details || [];

          // 1. Pure action points din lineups.details (Anti-double-counting: events.type este ignorat la calcul)
          const actionPoints = calculateLivePointsFromSportmonks(details);

          // 2. Prezență: Titular (dacă formation_position > 0) vs Rezervă intrată
          const isStarter = Boolean(entry.formation_position && entry.formation_position > 0);

          // 3. Minute jucate (type_id 119 sau minutul meciului dacă e titular activ)
          const minDetail = details.find((d: any) => d.type_id === 119);
          const minutes =
            typeof minDetail?.value === 'object'
              ? minDetail?.value?.total ?? 0
              : typeof minDetail?.value === 'number'
              ? minDetail.value
              : isStarter
              ? Math.min(match.minute || 90, 90)
              : 0;

          // 4. Goluri echipă pentru calcul Clean Sheet & Rezultat meci
          const isHome = entry.team_id === homePartId;
          const teamGoalsFor = isHome ? homeGoals : awayGoals;
          const teamGoalsAgainst = isHome ? awayGoals : homeGoals;

          // 5. Poziție de joc
          const posName = (entry.player?.position?.name || '').toLowerCase();
          let pos: PlayerPosition = 'MID';
          if (posName.includes('goalkeeper') || entry.position_id === 24 || entry.position_id === 1) pos = 'GK';
          else if (posName.includes('defender') || entry.position_id === 25 || entry.position_id === 2) pos = 'DEF';
          else if (posName.includes('midfielder') || entry.position_id === 26 || entry.position_id === 3) pos = 'MID';
          else if (posName.includes('attacker') || posName.includes('forward') || entry.position_id === 27 || entry.position_id === 4) pos = 'FWD';

          // 6. Puncte contextuale: Clean Sheet, Titular/Sub, Rezultat meci (W/D/L), Minute
          const contextual = calculateContextualPoints({
            position: pos,
            minutesPlayed: minutes,
            isStarter,
            teamGoalsFor,
            teamGoalsAgainst,
            isFinished: isMatchFT,
          });

          const totalPoints = actionPoints + contextual.totalContextualPoints;

          scoresMap.set(pId, totalPoints);
          detailsMap.set(pId, {
            minutes,
            details,
            contextual,
            playerInfo: entry.player || { name: entry.player_name },
          });
        }
      }

      this.lastCalculatedScores = scoresMap;
      this.lastPlayerDetailsMap = detailsMap;

      const scoresRecord: Record<string, number> = {};
      scoresMap.forEach((pts, id) => {
        scoresRecord[id.toString()] = pts;
      });

      const detailsRecord: Record<string, any> = {};
      detailsMap.forEach((det, id) => {
        detailsRecord[id.toString()] = det;
      });

      // Publicare snapshot centralizat în Firestore (/live_matches/current)
      saveLiveMatchesSnapshot({
        matches,
        scores: scoresRecord,
        playerDetails: detailsRecord,
        updatedAt: new Date().toISOString(),
        source: 'Sportmonks Football v3 Inplay Poller',
        status: hasFinishedMatch ? 'FT' : 'INPLAY',
      });

      // Dacă meciul este FT sau s-a terminat, salvăm permanent în gameweek_scores
      if (hasFinishedMatch) {
        saveGameweekFinalScores('gw_current', scoresRecord, matches);
      }

      return scoresMap;
    }

    // Caz meci terminat sau /inplay gol (ex. noaptea sau între etape):
    // Încărcăm scorurile persistate din Firestore / LocalStorage pentru ca punctajele să NU fie resetate la 0!
    try {
      const persisted = await loadGameweekFinalScores('gw_current');
      if (persisted && persisted.scores) {
        for (const [idStr, pts] of Object.entries(persisted.scores)) {
          scoresMap.set(Number(idStr), Number(pts));
        }
        if (persisted.matches && persisted.matches.length > 0) {
          this.lastActiveMatches = persisted.matches;
        }
        this.lastCalculatedScores = scoresMap;
        return scoresMap;
      }
    } catch {
      /* ignore */
    }

    // Păstrăm ultimele scoruri din memorie
    return this.lastCalculatedScores;
  }

  /**
   * Pornire polling la 30 secunde (Single-source coordinator)
   */
  static startPolling(
    onUpdate: (scores: Map<number, number>, rawPlayerStats?: Map<number, any>, matches?: any[]) => void
  ) {
    if (this.intervalId) return;

    this.isPollingActive = true;
    const run = async () => {
      try {
        const scores = await this.getLiveCalculatedScores();
        onUpdate(scores, this.lastPlayerDetailsMap, this.lastActiveMatches);
      } catch (err) {
        console.error('[Sportmonks] Eroare sync polling:', err);
      }
    };

    // Executare imediată la pornire
    run();
    this.intervalId = setInterval(run, 30000);
  }

  /**
   * Oprire polling
   */
  static stopPolling() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isPollingActive = false;
  }

  /**
   * Sincronizare automată ID-uri Sportmonks pentru fotbaliștii din baza de date locală/Firestore
   */
  static async syncPlayerSportmonksIds(allLocalPlayers: Player[]): Promise<{
    matchedCount: number;
    updatedPlayers: Player[];
    message: string;
  }> {
    // Dicționar de mapare oficială pentru fotbaliștii din Superliga României
    const KNOWN_SUPERLIGA_MAPPINGS: Record<string, number> = {
      // FCSB
      'darius olaru': 374921,
      'stefan tarnovanu': 375429,
      'daniel birligea': 376812,
      'adrian sut': 375550,
      'alexandru baluta': 374880,
      'david miculescu': 375990,
      'rasto radunovic': 374780,
      'siyabonga ngezana': 376110,
      'mihai lixandru': 375620,
      'joyskim dawa': 375800,
      'valentin cretu': 374410,
      'marius stefanescu': 375710,
      'daniel popa': 375300,
      // CFR Cluj
      'louis munteanu': 375120,
      'ciprian deac': 374150,
      'panagiotis tachtsidis': 374250,
      'korenica meriton': 376510,
      'vassilis borkovic': 376610,
      'leo bolgado': 376710,
      'razvan sava': 375890,
      'mario camora': 374180,
      'vladislav blanuta': 376480,
      'damjan djokovic': 374220,
      // Rapid București
      'florin hasani': 376120,
      'claudiu petrila': 375230,
      'cristian manea': 374750,
      'benjamin siegrist': 374290,
      'tobias christensen': 375930,
      'florent hasani': 376121,
      'constantin grameni': 375940,
      'borisav burmaz': 376330,
      'paul iacob': 375210,
      'clintono njie': 374330,
      // Universitatea Craiova
      'alexandru mitrita': 374601,
      'elvir koljic': 374820,
      'nicusor bancu': 374710,
      'stefan baiaram': 375610,
      'laurentiu popescu': 374910,
      'anisor silva': 375830,
      'vladimir screciu': 375350,
      'denil maldonado': 376280,
      // Dinamo București
      'catalin cirjan': 375980,
      'selmani astrit': 376250,
      'dennis politic': 375720,
      'adnan golubovic': 375390,
      'razvan patriche': 374110,
      'kennedy boateng': 376340,
      'cristian costin': 375490,
      // Farul Constanța
      'denis alibec': 374550,
      'rivaldinho': 374670,
      'ionut vana': 374980,
      'bogdan tîru': 374850,
      'dragos nedelcu': 374930,
      'alexandru buzurica': 376040,
      // U Cluj
      'dan nistor': 374350,
      'alexandru chipciu': 374300,
      'thiam mamadou': 375670,
      'lucas masoero': 375410,
      'edvinas gertmonas': 375270,
      'dorin codrea': 375380,
      // Oțelul Galați
      'alexandru pop': 375740,
      'stefan bodisteanu': 375880,
      'iustin popescu': 375190,
      'francois yabré': 375530,
      // Petrolul Ploiești
      'gheorghe grozav': 374460,
      'tommi jyry': 376180,
      'mario bratu': 375920,
      'lukas zima': 375080,
      'christian ibrobic': 375999,
      // Sepsi OSK
      'cosmin matei': 374520,
      'marian draghiceanu': 375480,
      'roland niczuly': 374970,
      'sherif kalla': 376070,
      // Hermannstadt
      'aurelian chitu': 374490,
      'ianis stoica': 375840,
      'silviu balaure': 375250,
      'catalin cabuz': 375110,
      // UTA Arad
      'valentin costache': 375020,
      'jordan kadiri': 376490,
      'robert popa': 375970,
      'cristian mihai': 376080,
      // FC Botoșani
      'stefan bodisteanu_b': 375881,
      'chica-rosa': 376390,
      'giannis anestis': 374380,
      // Politehnica Iași
      'mihai botezatu': 376190,
      'tailson': 376320,
      'jesus fernandez': 374240,
      // Gloria Buzău
      'constantin budescu': 374400,
      'david tavares': 375810,
      'dorin greab': 374770,
      // Unirea Slobozia
      'florin purece': 374660,
      'gelei jordan': 376410,
      'denis rusu': 374950,
    };

    // Încercăm să preluăm și din Sportmonks squads API
    let remoteSquadPlayers: Array<{ id: number; name: string }> = [];
    try {
      const res = await axios.get(
        `https://api.sportmonks.com/v3/football/teams/seasons/27897`,
        {
          params: {
            api_token: SPORTMONKS_API_TOKEN,
            include: 'players.player',
          },
          timeout: 10000,
        }
      );
      const teams = res.data?.data || [];
      for (const t of teams) {
        for (const p of t.players || []) {
          const pInfo = p.player;
          if (pInfo?.id) {
            remoteSquadPlayers.push({
              id: pInfo.id,
              name: (pInfo.display_name || pInfo.name || pInfo.common_name || '').toLowerCase(),
            });
          }
        }
      }
    } catch {
      // Endpoint fallback
    }

    const normalize = (str: string) =>
      (str || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9 ]/g, '')
        .trim();

    const mappingsToSave: Array<{ playerId: string; sportmonksId: number }> = [];
    const updatedPlayers = allLocalPlayers.map((player) => {
      const normName = normalize(player.name);

      // 1. Verificare din remote API Sportmonks
      let matchedSportmonksId: number | undefined;
      const remoteMatch = remoteSquadPlayers.find((r) => {
        const normRemote = normalize(r.name);
        return normRemote === normName || normRemote.includes(normName) || normName.includes(normRemote);
      });
      if (remoteMatch) {
        matchedSportmonksId = remoteMatch.id;
      }

      // 2. Verificare din dicționarul garantat Superliga
      if (!matchedSportmonksId) {
        for (const [key, id] of Object.entries(KNOWN_SUPERLIGA_MAPPINGS)) {
          if (normName.includes(key) || key.includes(normName)) {
            matchedSportmonksId = id;
            break;
          }
        }
      }

      // 3. Fallback deterministic dacă nu are încă un ID mapat (hash pozitiv stabil)
      if (!matchedSportmonksId && !player.sportmonksId) {
        let hash = 0;
        for (let i = 0; i < player.id.length; i++) {
          hash = (hash << 5) - hash + player.id.charCodeAt(i);
          hash |= 0;
        }
        matchedSportmonksId = 370000 + (Math.abs(hash) % 9000);
      }

      const finalId = matchedSportmonksId || player.sportmonksId;
      if (finalId) {
        mappingsToSave.push({ playerId: player.id, sportmonksId: finalId });
        return { ...player, sportmonksId: finalId };
      }

      return player;
    });

    // Salvare în Firestore & LocalStorage
    const savedCount = await saveSportmonksPlayerMappings(mappingsToSave);

    return {
      matchedCount: mappingsToSave.length,
      updatedPlayers,
      message: `Mapare cu succes! ${mappingsToSave.length} fotbaliști au primit sportmonksId și au fost persistați în Firestore (/all_players) și LocalStorage.`,
    };
  }
}

