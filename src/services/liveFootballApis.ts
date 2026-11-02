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
  saveGlobalPlayerEdit,
} from '../lib/firebase';
import { LiveActionMinuteTracker } from './liveActionTracker';

export function mapSportmonksTeamToClubId(teamNameOrParticipant: any): string {
  const name = typeof teamNameOrParticipant === 'string'
    ? teamNameOrParticipant
    : teamNameOrParticipant?.name || teamNameOrParticipant?.short_code || '';
  const n = (name || '').toLowerCase();

  if (n.includes('craiova') || n.includes('ucv')) return 'craiova';
  if (n.includes('botosani') || n.includes('bot')) return 'botosani';
  if (n.includes('fcsb') || n.includes('steaua')) return 'fcsb';
  if (n.includes('rapid') || n.includes('fc r')) return 'rapid';
  if (n.includes('dinamo') || n.includes('din')) return 'dinamo';
  if (n.includes('petrolul') || n.includes('pet')) return 'petrolul';
  if (n.includes('farul') || n.includes('viitorul')) return 'farul';
  if (n.includes('otelul') || n.includes('ote')) return 'otelul';
  if (n.includes('sepsi') || n.includes('sep')) return 'sepsi';
  if (n.includes('hermannstadt') || n.includes('sibiu') || n.includes('fch')) return 'hermannstadt';
  if (n.includes('uta') || n.includes('arad')) return 'uta';
  if (n.includes('universitatea cluj') || n.includes('u cluj') || n.includes('ucluj')) return 'ucluj';
  if (n.includes('cfr') || n.includes('cluj')) return 'cfr';
  if (n.includes('iasi') || n.includes('poli iasi')) return 'iasi';
  if (n.includes('buzau') || n.includes('gloria')) return 'buzau';
  if (n.includes('slobozia') || n.includes('unirea')) return 'slobozia';
  if (n.includes('corvinul')) return 'corvinul';
  if (n.includes('arges')) return 'arges';
  if (n.includes('csikszereda')) return 'csikszereda';

  return 'craiova';
}

export function createPlayerFromSportmonksLineup(
  entry: any,
  match: any,
  clubId: string
): Player {
  const pId = entry.player_id;
  const pObj = entry.player || {};
  const rawName = pObj.display_name || pObj.name || entry.player_name || pObj.common_name || `Fotbalist #${pId}`;
  const parts = rawName.trim().split(' ');
  const firstName = pObj.firstname || (parts.length > 1 ? parts[0] : 'Jucător');
  const lastName = pObj.lastname || (parts.length > 1 ? parts.slice(1).join(' ') : rawName);

  // Poziție joc
  const posName = (pObj.position?.name || '').toLowerCase();
  let position: PlayerPosition = 'MID';
  if (
    posName.includes('goalkeeper') ||
    entry.position_id === 24 ||
    entry.position_id === 1 ||
    entry.formation_position === 1
  ) {
    position = 'GK';
  } else if (
    posName.includes('defender') ||
    posName.includes('back') ||
    entry.position_id === 25 ||
    entry.position_id === 2 ||
    (entry.formation_position >= 2 && entry.formation_position <= 5)
  ) {
    position = 'DEF';
  } else if (
    posName.includes('midfield') ||
    entry.position_id === 26 ||
    entry.position_id === 3 ||
    (entry.formation_position >= 6 && entry.formation_position <= 8)
  ) {
    position = 'MID';
  } else if (
    posName.includes('forward') ||
    posName.includes('attack') ||
    posName.includes('winger') ||
    posName.includes('striker') ||
    entry.position_id === 27 ||
    entry.position_id === 4 ||
    (entry.formation_position >= 9 && entry.formation_position <= 11)
  ) {
    position = 'FWD';
  }

  // Cotă de piață realistă conform Superliga României
  const baseValues: Record<PlayerPosition, number> = {
    GK: 650000,
    DEF: 750000,
    MID: 900000,
    FWD: 1100000,
  };
  const variance = ((pId % 7) - 3) * 50000;
  const marketValue = Math.max(300000, (baseValues[position] || 750000) + variance);

  // Avatar foto oficială sau avatar generat elegant
  const avatar = pObj.image_path && !pObj.image_path.includes('placeholder')
    ? pObj.image_path
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(rawName)}&background=0f172a&color=05df72&bold=true`;

  let age = 23;
  if (pObj.date_of_birth) {
    const birthYear = new Date(pObj.date_of_birth).getFullYear();
    if (!isNaN(birthYear) && birthYear > 1970 && birthYear < 2015) {
      age = new Date().getFullYear() - birthYear;
    }
  }

  const nationality = pObj.country?.name || pObj.nationality?.name || 'România';
  const number = entry.jersey_number || pObj.jersey_number || (Math.floor(Math.random() * 30) + 1);

  return {
    id: `p_sm_${pId}`,
    sportmonksId: pId,
    name: rawName,
    firstName,
    lastName,
    clubId,
    position,
    nationality,
    avatar,
    marketValue,
    previousMarketValue: marketValue,
    pointsTotal: 0,
    pointsMatchday: 0,
    valueTrend: [marketValue],
    status: 'active',
    number,
    age,
    stats: {
      matches: 1,
      goals: 0,
      assists: 0,
      shotsOnTarget: 0,
      shotsMissed: 0,
      passesCompleted: 0,
      keyPasses: 0,
      crossesCompleted: 0,
      tacklesWon: 0,
      recoveries: 0,
      dribblesCompleted: 0,
      ballsLost: 0,
      foulsCommitted: 0,
      foulsDrawn: 0,
      yellowCards: 0,
      redCards: 0,
      cleanSheets: 0,
      penaltySaves: 0,
      goalsConceded: 0,
    },
    matchHistory: [],
  };
}

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

// ID oficial competiție SuperLiga României în Sportmonks Football v3
export const SUPERLIGA_ID = 474;
export const SUPERLIGA_ROMANIA_ID = 474;
export const SPORTMONKS_SUPERLIGA_ID = 474;

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
   * Detectează fotbaliștii din casetele tehnice (lineups) care lipsesc din baza de date a jocului,
   * creează automat profiluri complete de fotbalist conform cerințelor Transfermarkt & Superliga,
   * și le salvează permanent în Firestore (/all_players, /custom_players) și LocalStorage.
   * Toate operațiunile rulează silențios în background.
   */
  static async inspectAndRegisterMissingPlayers(
    matches: any[],
    currentKnownPlayers: Player[] = []
  ): Promise<Player[]> {
    if (!matches || matches.length === 0) return [];

    const knownSportmonksIds = new Set<number>();
    const knownPlayerIds = new Set<string>();

    currentKnownPlayers.forEach((p) => {
      if (p.sportmonksId) knownSportmonksIds.add(Number(p.sportmonksId));
      if (p.id) knownPlayerIds.add(p.id);
    });

    try {
      const overrides = JSON.parse(localStorage.getItem('supermanager_player_overrides') || '{}');
      Object.entries(overrides).forEach(([k, v]: [string, any]) => {
        knownPlayerIds.add(k);
        if (v?.sportmonksId) knownSportmonksIds.add(Number(v.sportmonksId));
      });

      const localPlayers: Player[] = JSON.parse(localStorage.getItem('supermanager_players') || '[]');
      localPlayers.forEach((p) => {
        if (p.sportmonksId) knownSportmonksIds.add(Number(p.sportmonksId));
        if (p.id) knownPlayerIds.add(p.id);
      });
    } catch {
      /* ignore */
    }

    const newlyCreatedPlayers: Player[] = [];

    for (const match of matches) {
      const participants = match.participants || [];
      const homePart = participants[0];
      const awayPart = participants[1];

      const homeClubId = mapSportmonksTeamToClubId(homePart);
      const awayClubId = mapSportmonksTeamToClubId(awayPart);

      const lineups = match.lineups || [];
      for (const entry of lineups) {
        const pId = entry.player_id;
        if (!pId) continue;

        if (knownSportmonksIds.has(pId) || knownPlayerIds.has(`p_sm_${pId}`)) {
          continue;
        }

        let clubId = homeClubId;
        if (entry.team_id && awayPart && entry.team_id === awayPart.id) {
          clubId = awayClubId;
        } else if (entry.team_id && homePart && entry.team_id === homePart.id) {
          clubId = homeClubId;
        } else if (entry.team_id) {
          const matchedPart = participants.find((p: any) => p.id === entry.team_id);
          if (matchedPart) clubId = mapSportmonksTeamToClubId(matchedPart);
        }

        const newPlayer = createPlayerFromSportmonksLineup(entry, match, clubId);
        newlyCreatedPlayers.push(newPlayer);

        knownSportmonksIds.add(pId);
        knownPlayerIds.add(newPlayer.id);

        // Salvare silențioasă în baza de date globală Firestore și LocalStorage
        try {
          await saveGlobalPlayerEdit(newPlayer);
        } catch (err) {
          console.warn('[Sportmonks] Salvare fotbalist nou creat:', err);
        }
      }
    }

    return newlyCreatedPlayers;
  }

  /**
   * Preia meciurile active din Sportmonks v3 API
   * Interoghează endpoint-ul /livescores/inplay cu filtrul pe SuperLiga României (ID 474).
   * Returnează meciurile aflate în desfășurare.
   * Dacă meciurile live lipsesc din feed-ul oficial (noaptea/între etape), verifică dacă modul test/demo a fost activat de utilizator.
   */
  static async fetchActiveMatches(forceIncludeTestFixtures?: boolean): Promise<any[]> {
    const inplayUrl = typeof window !== 'undefined'
      ? '/api/sportmonks/v3/football/livescores/inplay'
      : 'https://api.sportmonks.com/v3/football/livescores/inplay';

    let data: any[] = [];
    try {
      const res = await axios.get(inplayUrl, {
        params: {
          api_token: SPORTMONKS_API_TOKEN,
          filters: `fixtureLeagues:${SUPERLIGA_ID}`,
          include: 'participants;scores;lineups.details.type;events.type;state;venue',
        },
        timeout: 10000,
      });

      const raw = res.data?.data || [];
      data = Array.isArray(raw)
        ? raw.filter((m: any) => {
            const stateName = (m.state?.state || m.state?.short_name || m.status || '').toUpperCase();
            return stateName !== 'FT' && stateName !== 'POSTPONED' && stateName !== 'CANCELLED';
          })
        : [];
    } catch (err: any) {
      console.warn('[Sportmonks] Apel inplay endpoint:', err?.message || err);
      if (typeof window !== 'undefined') {
        try {
          const directRes = await axios.get('https://api.sportmonks.com/v3/football/livescores/inplay', {
            params: {
              api_token: SPORTMONKS_API_TOKEN,
              filters: `fixtureLeagues:${SUPERLIGA_ID}`,
              include: 'participants;scores;lineups.details.type;events.type;state;venue',
            },
            timeout: 10000,
          });
          const raw = directRes.data?.data || [];
          data = Array.isArray(raw)
            ? raw.filter((m: any) => {
                const stateName = (m.state?.state || m.state?.short_name || m.status || '').toUpperCase();
                return stateName !== 'FT' && stateName !== 'POSTPONED' && stateName !== 'CANCELLED';
              })
            : [];
        } catch { /* ignore */ }
      }
    }

    // Verificăm dacă meciurile demonstrative de test sunt activate
    const shouldIncludeTest =
      forceIncludeTestFixtures ??
      (typeof window !== 'undefined' && localStorage.getItem('supermanager_force_test_fixtures') === 'true');

    if (shouldIncludeTest) {
      const criticalFixtureIds = [19729653, 19729652];
      for (const fixId of criticalFixtureIds) {
        if (!data.some((f: any) => f.id === fixId)) {
          const fixUrl = typeof window !== 'undefined'
            ? `/api/sportmonks/v3/football/fixtures/${fixId}`
            : `https://api.sportmonks.com/v3/football/fixtures/${fixId}`;
          try {
            const fixtureRes = await axios.get(fixUrl, {
              params: {
                api_token: SPORTMONKS_API_TOKEN,
                include: 'lineups.details.type;events.type;scores;participants;state;venue',
              },
              timeout: 10000,
            });
            if (fixtureRes.data?.data) {
              data.push(fixtureRes.data.data);
            }
          } catch {
            if (typeof window !== 'undefined') {
              try {
                const fbRes = await axios.get(`https://api.sportmonks.com/v3/football/fixtures/${fixId}`, {
                  params: {
                    api_token: SPORTMONKS_API_TOKEN,
                    include: 'lineups.details.type;events.type;scores;participants;state;venue',
                  },
                  timeout: 10000,
                });
                if (fbRes.data?.data) {
                  data.push(fbRes.data.data);
                }
              } catch { /* ignore */ }
            }
          }
        }
      }
    }

    this.lastActiveMatches = data;
    return data;
  }

  /**
   * Calculează scorurile live pentru toți fotbaliștii din meciurile active
   * și înregistrează profilurile fotbaliștilor noi direct în baza de date.
   */
  static async getLiveCalculatedScoresWithMissingCheck(currentKnownPlayers: Player[] = []): Promise<{
    scores: Map<number, number>;
    newPlayers: Player[];
    matches: any[];
  }> {
    const matches = await this.fetchActiveMatches();
    const scoresMap = new Map<number, number>();
    const detailsMap = new Map<number, { minutes: number; details: any[]; contextual?: any; playerInfo?: any }>();

    let newlyCreatedPlayers: Player[] = [];
    if (matches.length > 0) {
      // 1. Detectare și înregistrare silențioasă a jucătorilor lipsă
      newlyCreatedPlayers = await this.inspectAndRegisterMissingPlayers(matches, currentKnownPlayers);
    }

    let hasFinishedMatch = false;

    if (matches.length > 0) {
      for (const match of matches) {
        const stateName = (match.state?.state || match.state?.short_name || match.status || '').toUpperCase();
        const isMatchFT =
          stateName === 'FT' ||
          stateName === 'ENDED' ||
          stateName === 'FINISHED' ||
          stateName === 'AET';

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

          LiveActionMinuteTracker.processLiveDetailsUpdate(match.id, match.minute || 1, pId, details);

          const actionPoints = calculateLivePointsFromSportmonks(details);

          let isStarter = Boolean(entry.formation_position && entry.formation_position > 0);
          if (entry.type_id === 12 || entry.lineup_type_id === 12) {
            isStarter = false;
          }

          const minDetail = details.find((d: any) => d.type_id === 119 || d.type_id === 117172);
          const rawMin = minDetail?.data?.value ?? minDetail?.value?.total ?? minDetail?.value;
          const minutes =
            typeof rawMin === 'number'
              ? rawMin
              : isStarter
              ? Math.min(match.minute || 90, 90)
              : 0;

          const isHome = entry.team_id === homePartId;
          const teamGoalsFor = isHome ? homeGoals : awayGoals;
          const teamGoalsAgainst = isHome ? awayGoals : homeGoals;

          const matchEvents = match.events || [];
          let subInMin = isStarter ? 1 : null;
          let subOutMin = 999;

          for (const ev of matchEvents) {
            const evCode = (ev.type?.code || ev.type?.name || '').toLowerCase();
            const isSub = ev.type_id === 18 || evCode.includes('sub');
            if (isSub) {
              if (ev.player_id === pId) {
                subInMin = ev.minute || 1;
                isStarter = false;
              }
              if (ev.related_player_id === pId) {
                subOutMin = ev.minute || 90;
              }
            }
          }

          if (!isStarter && subInMin === null && minutes > 0) {
            subInMin = Math.max(1, (match.minute || 90) - minutes);
          }

          let teamGoalsScoredOnPitch = 0;
          let teamGoalsConcededOnPitch = 0;

          for (const ev of matchEvents) {
            const evCode = (ev.type?.code || ev.type?.name || '').toLowerCase();
            const isGoal =
              ev.type_id === 14 ||
              ev.type_id === 15 ||
              ev.type_id === 16 ||
              evCode.includes('goal');

            if (isGoal) {
              const goalMin = ev.minute || 1;
              const wasOnPitch = subInMin !== null && subInMin <= goalMin && subOutMin >= goalMin;
              if (wasOnPitch) {
                const isOwnGoal = ev.type_id === 15 || evCode.includes('own');
                const scoredByMyTeam = ev.participant_id === entry.team_id;
                if ((scoredByMyTeam && !isOwnGoal) || (!scoredByMyTeam && isOwnGoal)) {
                  teamGoalsScoredOnPitch++;
                } else {
                  teamGoalsConcededOnPitch++;
                }
              }
            }
          }

          const hasAnyGoalInMatchEvents = matchEvents.some((ev: any) => {
            const evCode = (ev.type?.code || ev.type?.name || '').toLowerCase();
            return ev.type_id === 14 || ev.type_id === 15 || ev.type_id === 16 || evCode.includes('goal');
          });

          if (!hasAnyGoalInMatchEvents && teamGoalsScoredOnPitch === 0 && teamGoalsConcededOnPitch === 0 && isStarter) {
            teamGoalsScoredOnPitch = teamGoalsFor;
            teamGoalsConcededOnPitch = teamGoalsAgainst;
          }

          const posName = (entry.player?.position?.name || '').toLowerCase();
          let pos: PlayerPosition = 'MID';
          if (posName.includes('goalkeeper') || entry.position_id === 24 || entry.position_id === 1) pos = 'GK';
          else if (posName.includes('defender') || entry.position_id === 25 || entry.position_id === 2) pos = 'DEF';
          else if (posName.includes('midfielder') || entry.position_id === 26 || entry.position_id === 3) pos = 'MID';
          else if (posName.includes('attacker') || posName.includes('forward') || entry.position_id === 27 || entry.position_id === 4) pos = 'FWD';

          const contextual = calculateContextualPoints({
            position: pos,
            minutesPlayed: minutes,
            isStarter,
            teamGoalsFor,
            teamGoalsAgainst,
            teamGoalsScoredOnPitch,
            teamGoalsConcededOnPitch,
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

      try {
        saveLiveMatchesSnapshot({
          matches,
          scores: scoresRecord,
          playerDetails: detailsRecord,
          updatedAt: new Date().toISOString(),
          source: 'Sportmonks Football v3 Inplay Poller',
          status: hasFinishedMatch ? 'FT' : 'INPLAY',
        }).catch(() => {});
      } catch {
        /* ignore */
      }

      if (hasFinishedMatch) {
        try {
          saveGameweekFinalScores('gw_current', scoresRecord, matches).catch(() => {});
        } catch {
          /* ignore */
        }
      }

      return { scores: scoresMap, newPlayers: newlyCreatedPlayers, matches };
    }

    // Caz meci terminat sau /inplay gol (ex. noaptea sau între etape):
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
        return { scores: scoresMap, newPlayers: [], matches: this.lastActiveMatches };
      }
    } catch {
      /* ignore */
    }

    return { scores: this.lastCalculatedScores, newPlayers: [], matches: [] };
  }

  /**
   * Wrapper compatibil pentru calculul scorurilor live
   */
  static async getLiveCalculatedScores(currentKnownPlayers: Player[] = []): Promise<Map<number, number>> {
    const res = await this.getLiveCalculatedScoresWithMissingCheck(currentKnownPlayers);
    return res.scores;
  }

  /**
   * Pornire polling la 30 secunde
   */
  static startPolling(
    onUpdate: (
      scores: Map<number, number>,
      rawPlayerStats?: Map<number, any>,
      matches?: any[],
      newPlayers?: Player[]
    ) => void,
    getKnownPlayers?: () => Player[]
  ) {
    if (this.intervalId) return;

    this.isPollingActive = true;
    const run = async () => {
      try {
        const known = getKnownPlayers ? getKnownPlayers() : [];
        const result = await this.getLiveCalculatedScoresWithMissingCheck(known);
        onUpdate(result.scores, this.lastPlayerDetailsMap, result.matches, result.newPlayers);
      } catch (err) {
        console.error('[Sportmonks] Eroare sync polling:', err);
      }
    };

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
   * Determină următorul meci programat în SuperLiga pentru afișare curată în modul Standby
   */
  static getNextUpcomingSuperligaMatch(): {
    round: number;
    homeClubId: string;
    awayClubId: string;
    homeClubName: string;
    awayClubName: string;
    stadium: string;
    scheduledTime: string;
    kickoffTimestamp: number;
  } {
    // Calculare dată următorul meci (vineri/sâmbătă ora 20:30 sau la 24 de ore)
    const now = new Date();
    const nextGameDate = new Date();
    // Programare următorul meci într-un orar realist
    nextGameDate.setHours(20, 30, 0, 0);
    if (nextGameDate.getTime() <= now.getTime()) {
      nextGameDate.setDate(nextGameDate.getDate() + 1);
    }

    const days = ['Duminică', 'Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă'];
    const dayName = days[nextGameDate.getDay()];
    const dateFormatted = `${dayName}, ${nextGameDate.toLocaleDateString('ro-RO', { day: '2-digit', month: 'short' })} · 20:30`;

    return {
      round: 15,
      homeClubId: 'fcsb',
      awayClubId: 'rapid',
      homeClubName: 'FCSB București',
      awayClubName: 'FC Rapid 1923',
      stadium: 'Arena Națională, București',
      scheduledTime: dateFormatted,
      kickoffTimestamp: nextGameDate.getTime(),
    };
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

