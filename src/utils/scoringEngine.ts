import { Player, PlayerPosition, MatchLiveEvent } from '../types/football';

export const SCORING_RULES = {
  GOAL_GK_DEF: 60,
  GOAL_MID: 50,
  GOAL_FWD: 40,
  ASSIST: 25,
  SHOT_ON_TARGET: 10,
  SHOT_MISSED: -8,
  KEY_PASS: 8,
  PASS_COMPLETED: 2,
  CROSS_COMPLETED: 4,
  TACKLE_WON: 8,
  RECOVERY: 4,
  DRIBBLE_SUCCESS: 6,
  BALL_LOST: -3,
  FOUL_COMMITTED: -4,
  FOUL_DRAWN: 4,
  YELLOW_CARD: -15,
  RED_CARD: -40,
  PENALTY_SAVED: 45,
  PENALTY_MISSED: -20,
  CLEAN_SHEET_GK_DEF: 20,
  GOAL_CONCEDED_GK_DEF: -10,
};

export function calculateEventPoints(type: MatchLiveEvent['type'], position: PlayerPosition): number {
  switch (type) {
    case 'goal':
      if (position === 'GK' || position === 'DEF') return SCORING_RULES.GOAL_GK_DEF;
      if (position === 'MID') return SCORING_RULES.GOAL_MID;
      return SCORING_RULES.GOAL_FWD;
    case 'assist':
      return SCORING_RULES.ASSIST;
    case 'shot_on_target':
      return SCORING_RULES.SHOT_ON_TARGET;
    case 'shot_missed':
      return SCORING_RULES.SHOT_MISSED;
    case 'key_pass':
      return SCORING_RULES.KEY_PASS;
    case 'tackle':
      return SCORING_RULES.TACKLE_WON;
    case 'recovery':
      return SCORING_RULES.RECOVERY;
    case 'yellow_card':
      return SCORING_RULES.YELLOW_CARD;
    case 'red_card':
      return SCORING_RULES.RED_CARD;
    case 'save':
      return SCORING_RULES.PENALTY_SAVED;
    case 'clean_sheet_bonus':
      return (position === 'GK' || position === 'DEF') ? SCORING_RULES.CLEAN_SHEET_GK_DEF : 0;
    case 'foul':
      return SCORING_RULES.FOUL_COMMITTED;
    default:
      return 0;
  }
}

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
      return { label: 'POR', bg: 'bg-amber-500/20 border-amber-500/40', text: 'text-amber-400' };
    case 'DEF':
      return { label: 'FUN', bg: 'bg-blue-500/20 border-blue-500/40', text: 'text-blue-400' };
    case 'MID':
      return { label: 'MIJ', bg: 'bg-emerald-500/20 border-emerald-500/40', text: 'text-emerald-400' };
    case 'FWD':
      return { label: 'ATA', bg: 'bg-rose-500/20 border-rose-500/40', text: 'text-rose-400' };
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
