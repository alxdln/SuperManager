import { Player, PlayerPosition, MatchLiveEvent } from '../types/football';

/**
 * SISTEMUL OFICIAL DE PUNCTAJ LIVE SUPERMANAGER
 * Conform cerințelor detaliate ale utilizatorului:
 */
export const SCORING_RULES = {
  // Pase & Atac
  PASS_FORWARD: 1,             // pasa (doar pasele in terenul advers se vor calcula) +1p
  KEY_PASS: 5,                 // pasa cheie (key pass) +5p
  LONG_PASS: 3,                // pasa lunga +3p
  ASSIST: 25,                  // pasa de gol +25p
  CROSS_SUCCESSFUL: 3,         // centrare reusita +3p
  SHOT_ON_TARGET: 10,          // sut pe poarta +10p
  GOAL: 50,                    // gol +50p
  DRIBBLE_SUCCESS: 5,          // dribling reusit +5p
  DISPOSSESSED: -3,            // deposedat -3p
  PASS_ERROR: -1,              // pasa gresita -1p
  SHOT_MISSED: -3,             // sut ratat -3p
  BIG_CHANCE_MISSED: -25,      // ocazie mare ratata -25p
  PENALTY_WON: 25,             // penalty obtinut +25p
  PENALTY_MISSED: -30,         // penalty ratat -30p

  // Dueluri & Apărare
  TACKLE: 3,                   // deposedare +3p
  CLEARANCE: 3,                // respingere +3p
  SHOT_BLOCKED: 3,             // sut blocat +3p
  DUEL_WON: 3,                 // duel castigat +3p
  DUEL_LOST: -3,               // duel pierdut -3p
  INTERCEPTION: 3,             // interceptie +3p
  AERIAL_WON: 3,               // duel aerian castigat +3p
  AERIAL_LOST: -1,             // duel aerian pierdut -1p
  GOAL_LINE_CLEARANCE: 25,     // respingere de pe linia portii +25p
  DRIBBLED_PAST: -3,           // driblat (dribbled past) -3p
  ERROR_LEAD_TO_GOAL: -25,     // greseala la gol -25p

  // Disciplină & Faulturi
  FOUL_COMMITTED: -3,          // fault -3p
  FOUL_DRAWN: 1,               // fault obtinut +1p
  PENALTY_CONCEDED: -25,       // penalty comis -25p
  YELLOW_CARD: -15,            // cartonas galben -15p
  RED_CARD: -50,               // cartonas rosu -50p

  // Portar
  SAVE: 5,                     // parada +5p
  SAVE_IN_BOX: 10,             // parada sut din careu +10p
  PUNCH: 3,                    // minge boxata +3p
  KEEPER_SWEEPER: 5,           // iesire din poarta +5p
  HIGH_CLAIM: 3,               // minge inalta prinsa +3p
  CLEAN_SHEET_GK: 30,          // poarta intacta (clean sheet portari) +30p
  CLEAN_SHEET_DEF: 15,         // poarta intacta (clean sheet fundasi) +15p

  // Meci & Prezență
  MATCH_WON: 15,               // meci castigat +15p
  MATCH_LOST: -15,             // meci pierdut -15p
  MATCH_DRAW: 5,               // meci egal +5p
  STARTER: 5,                  // titular +5p
  SUBSTITUTE_IN: 3,            // intrat de pe banca +3p
  POINTS_PER_10_MIN: 1,        // minute jucate +(1p pentru fiecare 10 min jucate)
  TEAM_GOAL_SCORED: 5,         // gol marcat de echipa +5p (in timp real cand e pe teren)
  TEAM_GOAL_CONCEDED: -5,      // gol primit de echipa -5p (in timp real cand e pe teren)
};

/**
 * Calculează punctele pentru orice acțiune din timpul meciului
 */
export function calculateEventPoints(type: MatchLiveEvent['type'], position?: PlayerPosition): number {
  switch (type) {
    // Pase & Atac
    case 'pass_forward':
      return SCORING_RULES.PASS_FORWARD;
    case 'key_pass':
      return SCORING_RULES.KEY_PASS;
    case 'long_pass':
      return SCORING_RULES.LONG_PASS;
    case 'assist':
      return SCORING_RULES.ASSIST;
    case 'cross_successful':
      return SCORING_RULES.CROSS_SUCCESSFUL;
    case 'shot_on_target':
      return SCORING_RULES.SHOT_ON_TARGET;
    case 'goal':
      return SCORING_RULES.GOAL;
    case 'dribble_success':
      return SCORING_RULES.DRIBBLE_SUCCESS;
    case 'pass_error':
      return SCORING_RULES.PASS_ERROR;
    case 'dispossessed':
      return SCORING_RULES.DISPOSSESSED;
    case 'shot_missed':
      return SCORING_RULES.SHOT_MISSED;
    case 'big_chance_missed':
      return SCORING_RULES.BIG_CHANCE_MISSED;
    case 'penalty_won':
      return SCORING_RULES.PENALTY_WON;
    case 'penalty_missed':
      return SCORING_RULES.PENALTY_MISSED;

    // Dueluri & Apărare
    case 'tackle':
      return SCORING_RULES.TACKLE;
    case 'clearance':
      return SCORING_RULES.CLEARANCE;
    case 'shot_blocked':
      return SCORING_RULES.SHOT_BLOCKED;
    case 'duel_won':
      return SCORING_RULES.DUEL_WON;
    case 'duel_lost':
      return SCORING_RULES.DUEL_LOST;
    case 'interception':
    case 'recovery':
      return SCORING_RULES.INTERCEPTION;
    case 'aerial_won':
      return SCORING_RULES.AERIAL_WON;
    case 'aerial_lost':
      return SCORING_RULES.AERIAL_LOST;
    case 'goal_line_clearance':
      return SCORING_RULES.GOAL_LINE_CLEARANCE;
    case 'dribbled_past':
      return SCORING_RULES.DRIBBLED_PAST;
    case 'error_lead_to_goal':
      return SCORING_RULES.ERROR_LEAD_TO_GOAL;

    // Disciplină & Faulturi
    case 'foul':
      return SCORING_RULES.FOUL_COMMITTED;
    case 'foul_drawn':
      return SCORING_RULES.FOUL_DRAWN;
    case 'penalty_conceded':
      return SCORING_RULES.PENALTY_CONCEDED;
    case 'yellow_card':
      return SCORING_RULES.YELLOW_CARD;
    case 'red_card':
      return SCORING_RULES.RED_CARD;

    // Portar
    case 'save':
      return SCORING_RULES.SAVE;
    case 'save_in_box':
      return SCORING_RULES.SAVE_IN_BOX;
    case 'punch':
      return SCORING_RULES.PUNCH;
    case 'keeper_sweeper':
      return SCORING_RULES.KEEPER_SWEEPER;
    case 'high_claim':
      return SCORING_RULES.HIGH_CLAIM;
    case 'clean_sheet_bonus':
      if (position === 'GK') return SCORING_RULES.CLEAN_SHEET_GK;
      if (position === 'DEF') return SCORING_RULES.CLEAN_SHEET_DEF;
      return 0;

    // Meci & Prezență
    case 'match_won':
      return SCORING_RULES.MATCH_WON;
    case 'match_lost':
      return SCORING_RULES.MATCH_LOST;
    case 'match_draw':
      return SCORING_RULES.MATCH_DRAW;
    case 'starter_bonus':
      return SCORING_RULES.STARTER;
    case 'substitute_in_bonus':
      return SCORING_RULES.SUBSTITUTE_IN;
    case 'minutes_bonus':
      return SCORING_RULES.POINTS_PER_10_MIN;
    case 'team_goal_scored':
      return SCORING_RULES.TEAM_GOAL_SCORED;
    case 'team_goal_conceded':
      return SCORING_RULES.TEAM_GOAL_CONCEDED;

    default:
      return 0;
  }
}

/**
 * Ghid detaliat al regulilor de punctaj pentru interfață
 */
export interface ScoringRuleCategory {
  category: string;
  icon: string;
  rules: { label: string; points: string; type: 'pos' | 'neg' | 'neutral' }[];
}

export const LIVE_SCORING_CATEGORIES: ScoringRuleCategory[] = [
  {
    category: 'Pase & Atac',
    icon: '⚽',
    rules: [
      { label: 'Gol marcat', points: '+50p', type: 'pos' },
      { label: 'Pasă de gol (assist)', points: '+25p', type: 'pos' },
      { label: 'Penalty obținut', points: '+25p', type: 'pos' },
      { label: 'Șut pe poartă', points: '+10p', type: 'pos' },
      { label: 'Pasă cheie (key pass)', points: '+5p', type: 'pos' },
      { label: 'Dribling reușit', points: '+5p', type: 'pos' },
      { label: 'Pasă lungă', points: '+3p', type: 'pos' },
      { label: 'Centrare reușită', points: '+3p', type: 'pos' },
      { label: 'Pasă în teren advers', points: '+1p', type: 'pos' },
      { label: 'Pasă greșită', points: '-1p', type: 'neg' },
      { label: 'Șut ratat', points: '-3p', type: 'neg' },
      { label: 'Deposedat de minge', points: '-3p', type: 'neg' },
      { label: 'Ocazie mare ratată', points: '-25p', type: 'neg' },
      { label: 'Penalty ratat', points: '-30p', type: 'neg' },
    ],
  },
  {
    category: 'Dueluri & Apărare',
    icon: '🛡️',
    rules: [
      { label: 'Respingere pe linia porții', points: '+25p', type: 'pos' },
      { label: 'Deposedare reușită', points: '+3p', type: 'pos' },
      { label: 'Respingere (clearance)', points: '+3p', type: 'pos' },
      { label: 'Intercepție', points: '+3p', type: 'pos' },
      { label: 'Duel câștigat', points: '+3p', type: 'pos' },
      { label: 'Duel aerian câștigat', points: '+3p', type: 'pos' },
      { label: 'Șut blocat', points: '+3p', type: 'pos' },
      { label: 'Duel pierdut', points: '-3p', type: 'neg' },
      { label: 'Duel aerian pierdut', points: '-1p', type: 'neg' },
      { label: 'Driblat de adversar', points: '-3p', type: 'neg' },
      { label: 'Greșeală la gol', points: '-25p', type: 'neg' },
    ],
  },
  {
    category: 'Disciplină & Faulturi',
    icon: '🟨',
    rules: [
      { label: 'Fault obținut', points: '+1p', type: 'pos' },
      { label: 'Fault comis', points: '-3p', type: 'neg' },
      { label: 'Penalty comis', points: '-25p', type: 'neg' },
      { label: 'Cartonaș galben', points: '-15p', type: 'neg' },
      { label: 'Cartonaș roșu', points: '-50p', type: 'neg' },
    ],
  },
  {
    category: 'Portar',
    icon: '🧤',
    rules: [
      { label: 'Poartă intactă (Clean Sheet POR)', points: '+30p', type: 'pos' },
      { label: 'Paradă șut din careu', points: '+10p', type: 'pos' },
      { label: 'Paradă', points: '+5p', type: 'pos' },
      { label: 'Ieșire din poartă', points: '+5p', type: 'pos' },
      { label: 'Minge înaltă prinsă', points: '+3p', type: 'pos' },
      { label: 'Minge boxată', points: '+3p', type: 'pos' },
    ],
  },
  {
    category: 'Meci & Prezență',
    icon: '⏱️',
    rules: [
      { label: 'Gol marcat de echipă', points: '+5p', type: 'pos' },
      { label: 'Meci câștigat', points: '+15p', type: 'pos' },
      { label: 'Poartă intactă (Clean Sheet FUN)', points: '+15p', type: 'pos' },
      { label: 'Meci terminat la egalitate', points: '+5p', type: 'pos' },
      { label: 'Titular în meci', points: '+5p', type: 'pos' },
      { label: 'Intrat de pe bancă', points: '+3p', type: 'pos' },
      { label: 'Minute jucate (+1p / 10 min)', points: '+1p', type: 'pos' },
      { label: 'Gol primit de echipă', points: '-5p', type: 'neg' },
      { label: 'Meci pierdut', points: '-15p', type: 'neg' },
    ],
  },
];

export function formatCurrency(amount: number): string {
  const rounded = Math.round(amount || 0);
  const formatted = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `€${formatted}`;
}

export function formatFullCurrency(amount: number): string {
  const rounded = Math.round(amount || 0);
  const formatted = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `€${formatted}`;
}

export function getPositionBadge(position: PlayerPosition): { label: string; bg: string; text: string } {
  switch (position) {
    case 'GK':
      return { label: 'PORTAR', bg: 'bg-amber-500/20 border-amber-500/40', text: 'text-amber-400' };
    case 'DEF':
      return { label: 'FUNDAȘ', bg: 'bg-blue-500/20 border-blue-500/40', text: 'text-blue-400' };
    case 'MID':
      return { label: 'MIJLOCAȘ', bg: 'bg-emerald-500/20 border-emerald-500/40', text: 'text-emerald-400' };
    case 'FWD':
      return { label: 'ATACANT', bg: 'bg-rose-500/20 border-rose-500/40', text: 'text-rose-400' };
  }
}

export function calculatePlayerRating(player: Player): number {
  const pts = player.pointsMatchday;
  if (pts <= 0) return 5.5;
  if (pts < 15) return 6.2;
  if (pts < 25) return 7.4;
  if (pts < 35) return 8.3;
  if (pts < 45) return 9.1;
  return 9.8;
}

/**
 * Maparea type_id Sportmonks -> Punctajele definite în sistemul Kickbase SuperManager
 * Verificat direct pe schema oficială Sportmonks Football v3
 */
export const SPORTMONKS_ACTION_POINTS: Record<number, number> = {
  // Goluri & Atac
  52: 50,      // Goal (+50p)
  79: 25,      // Assist (+25p)
  86: 10,      // Shots On Target (+10p)
  41: -3,      // Shots Off Target (-3p)
  581: -25,    // Big Chance Missed (-25p)
  117: 5,      // Key Passes (+5p)
  99: 3,       // Accurate Crosses (+3p)
  109: 5,      // Successful Dribbles (+5p)
  123: 3,      // Long Balls Won (+3p)
  85: 25,      // Penalty won (+25p)
  91: -30,     // Penalty missed (-30p)

  // Pase & Posesie
  116: 1,      // Accurate Passes (+1p)
  114: -1,     // Inaccurate Passes / Pasă greșită (-1p)
  94: -3,      // Dispossessed / Minge Pierdută (-3p)

  // Dueluri & Apărare
  100: 3,      // Interceptions (+3p)
  101: 3,      // Clearances (+3p)
  27267: 3,    // Tackles Won (+3p)
  78: 3,       // Tackles (+3p)
  106: 3,      // Duels Won (+3p)
  107: 3,      // Aerials Won (+3p)
  1491: -3,    // Duels Lost (-3p)
  27266: -1,   // Aerials Lost (-1p)
  110: -3,     // Dribbled Past (-3p)
  58: 3,       // Shots Blocked (+3p)
  102: 3,      // Shot Blocked (+3p)

  // Disciplină & Faulturi
  56: -3,      // Fouls Committed (-3p)
  89: -3,      // Fouls (-3p)
  96: 1,       // Fouls Drawn (+1p)
  84: -15,     // Yellowcards (-15p)
  83: -50,     // Redcards (-50p)
  82: -25,     // Penalty Conceded (-25p)

  // Portari
  57: 5,       // Saves (+5p)
  104: 10,     // Saves inside box (+10p)
  103: 3,      // Punches / Minge boxată (+3p)
  76: 5,       // Goalkeeper Comes Out / Ieșire din poartă (+5p)
  584: 3,      // Good High Claim / Minge înaltă prinsă (+3p)
  126: 25,     // Penalty Save (+25p)
  113: 25,     // Penalties Saved (+25p)

  // Acțiuni speciale & defensive
  582: 25,     // Clearance Offline / Respingere de pe linia porții (+25p)
  571: -25,    // Error Lead To Goal / Greșeală ce a dus la gol (-25p)
  27264: 3,    // Successful Long Passes (+3p)
  62: 3,       // Long Passes (+3p)
  66: 3,       // Successful Interceptions (+3p)
  97: 3,       // Blocked Shots (+3p)
  27269: 1,    // Passes In Final Third (+1p)
  583: 3,      // Last Man Tackle (+3p)
};

export const SPORTMONKS_ACTION_LABELS: Record<number, { label: string; icon: string }> = {
  52: { label: 'Gol Marcat', icon: '⚽' },
  79: { label: 'Pasă de Gol (Assist)', icon: '🎯' },
  86: { label: 'Șut pe Poartă', icon: '🔥' },
  41: { label: 'Șut Ratat / pe Lângă', icon: '💨' },
  581: { label: 'Ocazie Mare Ratată', icon: '😱' },
  117: { label: 'Pasă Cheie (Key Pass)', icon: '✨' },
  99: { label: 'Centrare Reușită', icon: '💫' },
  109: { label: 'Dribling Reușit', icon: '🕺' },
  123: { label: 'Pasă Lungă Câștigată', icon: '📡' },
  27264: { label: 'Pasă Lungă Reușită', icon: '📡' },
  62: { label: 'Pasă Lungă', icon: '📡' },
  27269: { label: 'Pasă în Treimea Adversă', icon: '↗️' },
  85: { label: 'Penalty Obținut', icon: '🌟' },
  91: { label: 'Penalty Ratat', icon: '🤦' },
  116: { label: 'Pasă Reușită', icon: '↗️' },
  114: { label: 'Pasă Greșită', icon: '' },
  94: { label: 'Deposedat / Minge Pierdută', icon: '⚠️' },
  100: { label: 'Intercepție', icon: '🧱' },
  66: { label: 'Intercepție Reușită', icon: '🧱' },
  101: { label: 'Respingere / Degajare', icon: '🥊' },
  582: { label: 'Respingere de pe Linia Porții', icon: '🏰' },
  27267: { label: 'Deposedare Reușită (Tackle)', icon: '🛡️' },
  78: { label: 'Deposedare', icon: '🛡️' },
  583: { label: 'Deposedare ca Ultim Apărător', icon: '🛡️' },
  106: { label: 'Duel Câștigat', icon: '💪' },
  107: { label: 'Duel Aerian Câștigat', icon: '🦘' },
  1491: { label: 'Duel Pierdut', icon: '📉' },
  27266: { label: 'Duel Aerian Pierdut', icon: '⬇️' },
  110: { label: 'Driblat de Adversar', icon: '🔄' },
  58: { label: 'Șut Blocat', icon: '🛑' },
  102: { label: 'Șut Blocat', icon: '🛑' },
  97: { label: 'Șut Blocat', icon: '🛑' },
  104: { label: 'Paradă din Careu Portar', icon: '🧱' },
  571: { label: 'Greșeală ce a dus la Gol', icon: '💥' },
  56: { label: 'Fault Comis', icon: '🚷' },
  89: { label: 'Fault Comis', icon: '🚷' },
  96: { label: 'Fault Obținut', icon: '🤕' },
  84: { label: 'Cartonaș Galben', icon: '🟨' },
  83: { label: 'Cartonaș Roșu', icon: '🟥' },
  82: { label: 'Penalty Comis', icon: '⛔' },
  57: { label: 'Paradă Portar', icon: '🧤' },
  103: { label: 'Minge Boxată (Portar)', icon: '👊' },
  76: { label: 'Ieșire din Poartă (Sweeper)', icon: '🏃' },
  584: { label: 'Minge Înaltă Prinsă', icon: '👐' },
  126: { label: 'Penalty Apărat de Portar', icon: '🧤' },
  113: { label: 'Penalty Apărat', icon: '🧤' },
};

export function extractDetailValue(item: any): number {
  if (!item) return 0;
  if (typeof item.data?.value === 'number') return item.data.value;
  if (typeof item.value === 'number') return item.value;
  if (typeof item.data?.value?.total === 'number') return item.data.value.total;
  if (typeof item.value?.total === 'number') return item.value.total;
  return 0;
}

export function calculateLivePointsFromSportmonks(
  details: Array<{ type_id: number; data?: { value?: any }; value?: any }>
): number {
  if (!Array.isArray(details)) return 0;
  let points = 0;
  let hasExplicitPassError = false;
  let totalPasses = 0;
  let accuratePasses = 0;

  let yellowCardCount = 0;
  let redCardCount = 0;

  for (const item of details) {
    // Ignorăm minute jucate (type_id 119) din acțiunile pure - e calculat contextual
    if (item.type_id === 119 || item.type_id === 117172) continue;

    // Gestionăm cartonașele separat pentru a respecta regula: eliminare = -50p (nu se cumulează la -80p)
    if (item.type_id === 84) {
      yellowCardCount += extractDetailValue(item);
      continue;
    }
    if (item.type_id === 83) {
      redCardCount += extractDetailValue(item);
      continue;
    }

    if (item.type_id === 114) {
      hasExplicitPassError = true;
    }
    if (item.type_id === 80) {
      totalPasses = extractDetailValue(item);
    }
    if (item.type_id === 116) {
      accuratePasses = extractDetailValue(item);
    }

    const pts = SPORTMONKS_ACTION_POINTS[item.type_id] || 0;
    const count = extractDetailValue(item);
    points += pts * count;
  }

  // Punctaj disciplină conform deciziei utilizatorului:
  // Dacă jucătorul a fost eliminat (roșu direct sau al doilea galben): -50p
  // Dacă a primit doar galben: -15p per cartonaș
  if (redCardCount > 0) {
    points += -50 * redCardCount;
  } else if (yellowCardCount > 0) {
    points += -15 * yellowCardCount;
  }

  // Dacă API-ul Sportmonks nu transmite direct type_id 114 (inaccurate passes),
  // calculăm diferența: total pase (type_id 80) - pase reușite (type_id 116)
  if (!hasExplicitPassError && totalPasses > 0 && totalPasses > accuratePasses) {
    const inaccuratePasses = totalPasses - accuratePasses;
    const passErrorPts = SPORTMONKS_ACTION_POINTS[114] ?? -1;
    points += passErrorPts * inaccuratePasses;
  }

  return points;
}

export interface ContextualMatchParams {
  position?: PlayerPosition;
  minutesPlayed: number;
  isStarter: boolean;
  teamGoalsFor: number;
  teamGoalsAgainst: number;
  isFinished?: boolean;
  teamGoalsScoredOnPitch?: number;
  teamGoalsConcededOnPitch?: number;
}

/**
 * Calculează punctele contextuale de meci:
 * - Gol marcat de echipă (+5p) & Gol primit de echipă (-5p) - în timp real dacă jucătorul este pe teren
 * - Titular (+5p) vs Intrat de pe bancă (+3p)
 * - Minute jucate (+1p la fiecare 10 min) - acordat la final
 * - Clean Sheet (+30p GK, +15p DEF dacă goluri primite = 0 și minute jucate >= 60) - acordat la final
 * - Rezultat meci (Victorie: +15p | Egal: +5p | Înfrângere: -15p) - acordat la final
 */
export function calculateContextualPoints(params: ContextualMatchParams): {
  totalContextualPoints: number;
  cleanSheetPoints: number;
  starterBonus: number;
  minutesBonus: number;
  matchResultBonus: number;
  teamScoredPoints: number;
  teamConcededPoints: number;
  teamScoredCount: number;
  teamConcededCount: number;
  breakdown: string[];
} {
  const { position, minutesPlayed, isStarter, teamGoalsFor, teamGoalsAgainst } = params;
  let totalContextualPoints = 0;
  const breakdown: string[] = [];

  // 1. Prezență: Titular vs Rezervă (dacă a bifat minute în meci)
  let starterBonus = 0;
  if (minutesPlayed > 0) {
    if (isStarter) {
      starterBonus = SCORING_RULES.STARTER; // +5p
      breakdown.push(`Titular (+${starterBonus}p)`);
    } else {
      starterBonus = SCORING_RULES.SUBSTITUTE_IN; // +3p
      breakdown.push(`Intrat de pe bancă (+${starterBonus}p)`);
    }
    totalContextualPoints += starterBonus;
  }

  // 2. Goluri marcate (+5p) și primite (-5p) de echipă în timp real (pentru minutele când jucătorul a fost pe teren)
  const teamScoredCount = params.teamGoalsScoredOnPitch ?? (minutesPlayed > 0 ? teamGoalsFor : 0);
  const teamConcededCount = params.teamGoalsConcededOnPitch ?? (minutesPlayed > 0 ? teamGoalsAgainst : 0);

  const teamScoredPoints = teamScoredCount * SCORING_RULES.TEAM_GOAL_SCORED;
  const teamConcededPoints = teamConcededCount * SCORING_RULES.TEAM_GOAL_CONCEDED;

  if (teamScoredPoints > 0) {
    totalContextualPoints += teamScoredPoints;
    breakdown.push(`Gol marcat de echipă: ${teamScoredCount} × (+${SCORING_RULES.TEAM_GOAL_SCORED}p)`);
  }
  if (teamConcededPoints < 0) {
    totalContextualPoints += teamConcededPoints;
    breakdown.push(`Gol primit de echipă: ${teamConcededCount} × (${SCORING_RULES.TEAM_GOAL_CONCEDED}p)`);
  }

  // 3, 4 & 5: Bonusurile finale de meci (se acordă EXCLUSIV după fluierul final / meci terminat FT)
  let minutesBonus = 0;
  let cleanSheetPoints = 0;
  let matchResultBonus = 0;

  if (params.isFinished) {
    // 3. Minute jucate (+1p la fiecare 10 min)
    minutesBonus = Math.floor(minutesPlayed / 10);
    if (minutesBonus > 0) {
      totalContextualPoints += minutesBonus;
      breakdown.push(`Timp pe teren: ${minutesPlayed}' (+${minutesBonus}p)`);
    }

    // 4. Clean Sheet (Poartă Intactă: +30p GK, +15p DEF dacă goluri primite = 0 și minute >= 60)
    if (teamGoalsAgainst === 0 && minutesPlayed >= 60) {
      if (position === 'GK') {
        cleanSheetPoints = SCORING_RULES.CLEAN_SHEET_GK; // +30p
        breakdown.push(`Clean Sheet Portar (+${cleanSheetPoints}p)`);
      } else if (position === 'DEF') {
        cleanSheetPoints = SCORING_RULES.CLEAN_SHEET_DEF; // +15p
        breakdown.push(`Clean Sheet Fundaș (+${cleanSheetPoints}p)`);
      }
      totalContextualPoints += cleanSheetPoints;
    }

    // 5. Rezultat meci (Victorie: +15p | Egal: +5p | Înfrângere: -15p) dacă a jucat
    if (minutesPlayed > 0) {
      if (teamGoalsFor > teamGoalsAgainst) {
        matchResultBonus = SCORING_RULES.MATCH_WON; // +15p
        breakdown.push(`Victorie Echipă (+${matchResultBonus}p)`);
      } else if (teamGoalsFor === teamGoalsAgainst) {
        matchResultBonus = SCORING_RULES.MATCH_DRAW; // +5p
        breakdown.push(`Egal Echipă (+${matchResultBonus}p)`);
      } else {
        matchResultBonus = SCORING_RULES.MATCH_LOST; // -15p
        breakdown.push(`Înfrângere Echipă (${matchResultBonus}p)`);
      }
      totalContextualPoints += matchResultBonus;
    }
  }

  return {
    totalContextualPoints,
    cleanSheetPoints,
    starterBonus,
    minutesBonus,
    matchResultBonus,
    teamScoredPoints,
    teamConcededPoints,
    teamScoredCount,
    teamConcededCount,
    breakdown,
  };
}

