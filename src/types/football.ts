export type PlayerPosition = 'GK' | 'DEF' | 'MID' | 'FWD';

export interface Club {
  id: string;
  name: string;
  shortName: string;
  city: string;
  logoColor: string;
  secondaryColor: string;
  badgeText: string;
  stadium: string;
}

export interface PlayerStats {
  matches: number;
  goals: number;
  assists: number;
  shotsOnTarget: number;
  shotsMissed: number;
  passesCompleted: number;
  keyPasses: number;
  crossesCompleted: number;
  tacklesWon: number;
  recoveries: number;
  dribblesCompleted: number;
  ballsLost: number;
  foulsCommitted: number;
  foulsDrawn: number;
  yellowCards: number;
  redCards: number;
  cleanSheets: number;
  penaltySaves: number;
  goalsConceded: number;
}

export interface MatchHistoryItem {
  matchday: number;
  opponentClubId: string;
  result: string;
  minutesPlayed: number;
  points: number;
  goals: number;
  assists: number;
  rating: number;
  eventsSummary?: string;
}

export interface Player {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  clubId: string;
  position: PlayerPosition;
  number: number;
  marketValue: number; // EUR
  previousMarketValue: number;
  pointsTotal: number;
  pointsMatchday: number;
  status: 'active' | 'injured' | 'suspended';
  injuryReason?: string;
  avatar: string;
  nationality: string;
  age: number;
  stats: PlayerStats;
  matchHistory: MatchHistoryItem[];
  valueTrend: number[]; // Last 5 market valuations
}

export type TacticalFormation = 
  | '3-4-3'
  | '3-5-2'
  | '3-6-1'
  | '4-3-3'
  | '4-4-2'
  | '4-5-1'
  | '5-3-2'
  | '5-2-3';

export interface FormationSlot {
  slotId: string;
  label: string; // e.g., 'GK', 'LCB', 'RCB', 'LB', 'RB', 'LCM', etc.
  position: PlayerPosition;
  x: number; // percentage from left (0 to 100)
  y: number; // percentage from top (0 to 100)
}

export interface SquadState {
  formation: TacticalFormation;
  startingSlots: Record<string, string | null>; // slotId -> playerId
  benchPlayerIds: string[]; // up to 7 reserves
  captainPlayerId: string | null; // 2x points multiplier
  boosterActive: boolean; // 1.2x fan rewards booster
}

export interface BidEntry {
  bidderId: string;
  bidderName: string;
  amount: number;
  time: string;
}

export interface MarketOfferEntry {
  id: string;
  bidderId: string;
  bidderName?: string;
  amount: number;
  time: string;
  status: 'pending' | 'accepted' | 'refused';
}

export interface UnifiedMarketItem {
  id: string;
  playerId: string;
  isLeagueListing: boolean; // true if listed by Superliga, false if listed by a manager
  sellerId: string; // 'superliga_lpf' or user.id
  sellerName: string; // 'Superliga României' or teamName
  currentBid: number;
  highestBidderId: string | null;
  highestBidderName: string | null;
  minAskingPrice: number; // if bid reaches this, transfer clause is triggered instantly
  leagueBaseOffer: number; // guaranteed league baseline offer for seller
  expiresAt: number | null; // null for member listings (stays until manager cancels), timestamp for league listings (24h-72h)
  bidHistory: BidEntry[];
  receivedOffers?: MarketOfferEntry[];
}

// Keep AuctionItem as alias if needed
export type AuctionItem = UnifiedMarketItem;

export interface Transaction {
  id: string;
  type: 'buy' | 'sell' | 'auction_win' | 'reward' | 'prediction_win';
  playerId?: string;
  playerName?: string;
  amount: number;
  date: string;
  description: string;
}

export interface LeagueNewsArticle {
  id: string;
  title: string;
  summary: string;
  content: string;
  date: string;
  tag: 'TRANSFER' | 'RECORD' | 'CLAUZĂ ACTIVATĂ' | 'ETAPĂ' | 'COTE PIAȚĂ' | 'LICITAȚIE';
  amount?: number;
  playerName?: string;
  buyerName?: string;
  sellerName?: string;
  avatar?: string;
}

export interface MatchLiveEvent {
  id: string;
  minute: number;
  type: 
    | 'goal'
    | 'assist'
    | 'shot_on_target'
    | 'shot_missed'
    | 'tackle'
    | 'recovery'
    | 'key_pass'
    | 'yellow_card'
    | 'red_card'
    | 'save'
    | 'clean_sheet_bonus'
    | 'foul';
  playerId: string;
  playerName: string;
  clubId: string;
  pointsChange: number;
  description: string;
}

export interface Fixture {
  id: string;
  round: number;
  homeClubId: string;
  awayClubId: string;
  homeScore: number;
  awayScore: number;
  minute: number;
  isLive: boolean;
  isFinished: boolean;
  scheduledTime: string;
  events: MatchLiveEvent[];
}

export interface SuperligaStanding {
  clubId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  points: number;
  form: ('W' | 'D' | 'L')[];
}

export interface Prediction {
  fixtureId: string;
  homeScore: number;
  awayScore: number;
  status: 'pending' | 'won_exact' | 'won_diff' | 'won_sign' | 'lost';
  rewardClaimed: boolean;
  rewardAmount: number;
}

export interface LeagueMemberPlayerSlot {
  slotLabel: string;
  playerId: string;
  isCaptain?: boolean;
}

export interface MemberGameweekHistoryItem {
  matchday: number;
  points: number;
  rank?: number;
  topScorerName?: string;
}

export interface LeagueMember {
  id: string;
  name: string;
  teamName: string;
  avatar: string;
  totalPoints: number;
  matchdayPoints: number;
  squadValue: number;
  rank: number;
  formation: TacticalFormation;
  startingLineup: LeagueMemberPlayerSlot[];
  gameweekHistory?: MemberGameweekHistoryItem[];
}

export interface LeagueSettings {
  leagueName: string;
  leagueCode: string;
  startingBudget: number;
  maxSquadSize: number;
  allowMemberAuctions: boolean;
  transferWindowOpen: boolean;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'transfer' | 'auction' | 'injury' | 'live_event' | 'reward';
  time: string;
  read: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  teamName: string;
  avatar: string;
  favoriteClubId: string;
  budget: number;
  fanCoins: number;
  checkinsCount: number;
}
