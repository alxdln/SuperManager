import { MatchEventType, PlayerPosition, MatchLiveEvent } from '../types/football';
import { calculateEventPoints, SCORING_RULES } from '../utils/scoringEngine';

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
    scheduledTime: '2025-03-01 20:30',
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
    scheduledTime: '2025-03-02 21:00',
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
    homeClubId: 'iasi',
    awayClubId: 'botosani',
    homeClubName: 'Politehnica Iași',
    awayClubName: 'FC Botoșani',
    stadium: 'Emil Alexandrescu, Iași',
    scheduledTime: '2025-03-04 19:30',
    sofascoreEventId: 11849207,
    status: 'SCHEDULED',
  },
  {
    id: 'fix_sl_8',
    round: 15,
    homeClubId: 'buzau',
    awayClubId: 'slobozia',
    homeClubName: 'Gloria Buzău',
    awayClubName: 'Unirea Slobozia',
    stadium: 'Municipal Buzău, Buzău',
    scheduledTime: '2025-03-05 17:30',
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
