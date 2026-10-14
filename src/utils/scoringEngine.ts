import { Player, PlayerPosition, MatchLiveEvent } from '../types/football';

/**
 * SISTEMUL OFICIAL DE PUNCTAJ LIVE SUPERMANAGER (KICKBASE STYLE)
 * Conform cerințelor detaliate ale utilizatorului:
 */
export const SCORING_RULES = {
  // Pase & Atac
  PASS_FORWARD: 1,             // pasa (doar pasele in terenul advers se vor calcula) +1p
  KEY_PASS: 5,                 // pasa cheie (key pass) +5p
  LONG_PASS: 3,                // pasa lunga +3p
  ASSIST: 30,                  // pasa de gol +30p
  CROSS_SUCCESSFUL: 3,         // centrare reusita +3p
  SHOT_ON_TARGET: 10,          // sut pe poarta +10p
  GOAL: 50,                    // gol +50p
  DRIBBLE_SUCCESS: 5,          // dribling reusit +5p
  DISPOSSESSED: -3,            // deposedat -3p
  PASS_ERROR: -1,              // pasa gresita -1p
  SHOT_MISSED: -3,             // sut ratat -3p
  BIG_CHANCE_MISSED: -15,      // ocazie mare ratata -15p
  PENALTY_WON: 25,             // penalty obtinut +25p
  PENALTY_MISSED: -30,         // penalty ratat -30p

  // Dueluri & Apărare
  TACKLE: 5,                   // deposedare +5p
  CLEARANCE: 5,                // respingere +5p
  SHOT_BLOCKED: 3,             // sut blocat +3p
  DUEL_WON: 3,                 // duel castigat +3p
  DUEL_LOST: -1,               // duel pierdut -1p
  INTERCEPTION: 5,             // interceptie +5p
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
      { label: 'Pasă de gol (assist)', points: '+30p', type: 'pos' },
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
      { label: 'Ocazie mare ratată', points: '-15p', type: 'neg' },
      { label: 'Penalty ratat', points: '-30p', type: 'neg' },
    ],
  },
  {
    category: 'Dueluri & Apărare',
    icon: '🛡️',
    rules: [
      { label: 'Respingere pe linia porții', points: '+25p', type: 'pos' },
      { label: 'Deposedare reușită', points: '+5p', type: 'pos' },
      { label: 'Respingere (clearance)', points: '+5p', type: 'pos' },
      { label: 'Intercepție', points: '+5p', type: 'pos' },
      { label: 'Duel câștigat', points: '+3p', type: 'pos' },
      { label: 'Duel aerian câștigat', points: '+3p', type: 'pos' },
      { label: 'Șut blocat', points: '+3p', type: 'pos' },
      { label: 'Duel pierdut', points: '-1p', type: 'neg' },
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
      { label: 'Meci câștigat', points: '+15p', type: 'pos' },
      { label: 'Poartă intactă (Clean Sheet FUN)', points: '+15p', type: 'pos' },
      { label: 'Meci terminat la egalitate', points: '+5p', type: 'pos' },
      { label: 'Titular în meci', points: '+5p', type: 'pos' },
      { label: 'Intrat de pe bancă', points: '+3p', type: 'pos' },
      { label: 'Minute jucate (+1p / 10 min)', points: '+1p', type: 'pos' },
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
