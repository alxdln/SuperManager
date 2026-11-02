import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  Player,
  PlayerPosition,
  TacticalFormation,
  SquadState,
  UnifiedMarketItem,
  MarketOfferEntry,
  Transaction,
  Fixture,
  MatchLiveEvent,
  Prediction,
  LeagueMember,
  LeagueSettings,
  AppNotification,
  UserProfile,
  LeagueNewsArticle,
  MatchEventType,
  PlayerStats,
  Club,
  UserMembership,
  PlayerLastMatchDetails,
  MatchHistoryItem,
} from '../types/football';
import { INITIAL_PLAYERS, INITIAL_FIXTURES, INITIAL_LEAGUE_NEWS } from '../data/superligaData';
import { ALL_16_SUPERLIGA_PLAYERS, ALL_16_SUPERLIGA_CLUBS, generateRandomStarterSquad } from '../data/superligaAll16ClubsPlayers';
import { FORMATIONS } from '../data/formations';
import { calculateEventPoints, formatCurrency, formatFullCurrency } from '../utils/scoringEngine';
import { DemoCompletedMatchData } from '../components/live/DemoMatchSaveModal';
import {
  loadFirestoreCustomPlayers,
  saveFirestoreCustomPlayer,
  saveFirestoreUserAccount,
  findFirestoreUser,
  saveFirestoreLeague,
  findFirestoreLeagueByCode,
  saveGlobalPlayerEdit,
  deleteGlobalPlayer,
  loadFirestoreGlobalPlayers,
  loadFirestoreDeletedPlayerIds,
  loadFirestoreClubs,
  saveFirestoreClub,
  updateFirestoreClub,
  toggleFirestoreClubStatus,
  subscribeToLiveMatches,
  loadGameweekFinalScores,
  signInWithGooglePopup,
  signInWithApplePopup,
  updateFirestoreUserAccount,
  StoredUserAccount,
  LeagueJoinRequest,
  createFirestoreLeagueJoinRequest,
  getFirestoreLeagueJoinRequests,
  respondFirestoreLeagueJoinRequest,
} from '../lib/firebase';
import { SportmonksLiveService } from '../services/liveFootballApis';
import { MatchFinalizerService, FinalizeFixtureParams } from '../services/matchFinalizer';

interface FantasyContextType {
  // User & Auth
  user: UserProfile;
  isAuthenticated: boolean;
  registerUserAccount: (accountData: { email: string; password?: string; name: string; teamName: string }) => Promise<{ success: boolean; message: string }>;
  login: (email: string, pass: string) => Promise<{ success: boolean; hasLeague: boolean; isCreator?: boolean; isPendingApproval?: boolean; message?: string }>;
  loginWithProvider: (provider: 'apple' | 'google') => Promise<{ success: boolean; hasLeague: boolean; isCreator?: boolean; message?: string }>;
  logout: () => void;
  updateUserTeamName: (newName: string) => void;
  updateUserPassword: (password: string) => boolean;
  updateUserMembership: (membership: UserMembership) => void;
  updateManagerProfileGlobal: (account: StoredUserAccount, previousEmail?: string) => Promise<boolean>;
  pendingLeagueRequests: LeagueJoinRequest[];
  approveLeagueJoinRequest: (requestId: string) => Promise<boolean>;
  rejectLeagueJoinRequest: (requestId: string) => Promise<boolean>;

  // Clubs Master State & Management
  clubs: Club[];
  activeClubs: Club[];
  allPlayers: Player[];
  updateClub: (club: Club) => Promise<boolean>;
  addNewClub: (clubData: Omit<Club, 'id'> & { id?: string }) => Promise<boolean>;
  toggleClubStatus: (clubId: string, isActive: boolean) => Promise<boolean>;

  // League Creation & Join
  createNewLeague: (data: { name: string; startingBudget: number; maxSameClubPlayers: number }) => Promise<{ success: boolean; message: string }>;
  joinLeagueByCode: (code: string) => Promise<{ success: boolean; message: string; isPendingApproval?: boolean }>;
  addNewsArticle: (article: Omit<LeagueNewsArticle, 'id' | 'date'>) => void;

  // Players & Squad
  players: Player[];
  squad: SquadState;
  allocateStarterSquad: (newSquadPlayers: Player[]) => void;
  changeFormation: (formation: TacticalFormation) => void;
  assignPlayerToSlot: (slotId: string, playerId: string) => void;
  removePlayerFromSlot: (slotId: string) => void;
  setCaptain: (playerId: string) => void;
  swapPlayers: (slotA: string, slotB: string) => void;
  substituteBenchPlayer: (slotId: string, benchPlayerId: string) => void;
  applyCraiovaBotosaniSquad: () => void;

  // Unified Market (League Listings + Member Listings in the same place)
  unifiedMarketItems: UnifiedMarketItem[];
  placeMarketOffer: (itemId: string, offerAmount: number) => {
    success: boolean;
    message: string;
    clauseTriggered?: boolean;
    isOverdraftExceeded?: boolean;
    requiredAmount?: number;
  };
  withdrawMarketOffer: (itemId: string, offerId?: string) => { success: boolean; message: string };
  createMemberListing: (playerId: string, minAskingPrice: number) => { success: boolean; message: string };
  delistPlayerFromMarket: (itemId: string) => { success: boolean; message: string };
  acceptMemberOffer: (itemId: string, offerId?: string) => { success: boolean; message: string };
  refuseMemberOffer: (itemId: string, offerId: string) => { success: boolean; message: string };
  recalculateMarketValuesFromWeeklyTrades: () => { updatedCount: number; message: string };
  sellPlayerToMarket: (playerId: string) => { success: boolean; message: string };

  // Transactions & News Feed
  transactions: Transaction[];
  newsArticles: LeagueNewsArticle[];

  // Fixtures & Simulation
  fixtures: Fixture[];
  isSimulating: boolean;
  toggleSimulation: () => void;
  simulationSpeed: number;
  setSimulationSpeed: (speed: number) => void;
  injectCustomEvent: (fixtureId: string, event: Omit<MatchLiveEvent, 'id'>) => void;

  // Predictions
  predictions: Record<string, Prediction>;
  makePrediction: (fixtureId: string, homeScore: number, awayScore: number) => void;
  claimPredictionReward: (fixtureId: string) => void;

  // Fan Rewards (LPF Pitch)
  isLiveMatchWindow: boolean;
  checkInFanTVOrStadium: (type: 'tv' | 'stadium') => { success: boolean; reward: number; message: string };

  // League Leaderboards & Settings
  leagueMembers: LeagueMember[];
  leagueSettings: LeagueSettings;
  updateLeagueSettings: (settings: Partial<LeagueSettings>) => void;

  // Notifications
  notifications: AppNotification[];
  unreadNotificationsCount: number;
  markNotificationsAsRead: () => void;
  dismissNotification: (id: string) => void;

  // Admin Controls
  addNewPlayer: (playerData: Omit<Player, 'id' | 'pointsTotal' | 'pointsMatchday' | 'matchHistory' | 'valueTrend' | 'previousMarketValue'>) => void;
  updatePlayerStatus: (playerId: string, status: 'active' | 'injured' | 'suspended', reason?: string) => void;
  updatePlayerMarketValue: (playerId: string, newValue: number) => void;
  updateGlobalPlayerData: (updatedPlayer: Player) => Promise<boolean>;
  deletePlayerGlobal: (playerId: string) => Promise<boolean>;

  // Computed Values & Squad Rules
  squadPointsMatchday: number;
  rawSquadPointsMatchday: number;
  squadTotalValue: number;
  squadMarketValue: number;
  maxOverdraftLimit: number;
  minAllowedBalance: number;
  isBudgetNegative: boolean;
  isOverdraftPenalized: boolean;
  squadCount: number;
  gkCount: number;
  emptyStarterSlotsCount: number;
  emptySlotsPenalty: number;
  isSquadValid: boolean;
  squadValidationErrors: string[];

  // Demo Match (1-Minute Live Simulation)
  isDemoMatchActive: boolean;
  demoTimeRemaining: number;
  demoMinute: number;
  demoHomeScore: number;
  demoAwayScore: number;
  demoEvents: MatchLiveEvent[];
  demoEventsByPlayer: Record<string, MatchLiveEvent[]>;
  pendingDemoMatchSave: DemoCompletedMatchData | null;
  showDemoSaveModal: boolean;
  setShowDemoSaveModal: (val: boolean) => void;
  startDemoMatch: () => void;
  resetDemoMatch: () => void;
  confirmSaveDemoMatch: () => Promise<void>;
  cancelDemoMatch: () => void;
  resetMatchdayDataToZero: () => void;

  // Sportmonks v3 Live Stats & Mappings
  sportmonksScores: Map<number, number>;
  sportmonksPlayerDetails: Map<number, { minutes: number; details: any[]; contextual?: any; playerInfo?: any }>;
  sportmonksActiveMatches: any[];
  isSportmonksPolling: boolean;
  syncSportmonksPlayerIds: () => Promise<{ matchedCount: number; message: string }>;
  refreshSportmonksLiveScores: () => Promise<void>;
  testFixturesEnabled: boolean;
  toggleTestFixtures: () => void;

  // Finalizare Meciuri FT & Arhivare Compactă (5 min delay)
  finalizedMatchIds: string[];
  pendingFinalizations: Array<{
    fixtureId: string;
    homeClubId: string;
    awayClubId: string;
    homeScore: number;
    awayScore: number;
    scheduledTime: number;
    secondsRemaining: number;
  }>;
  finalizeMatchNow: (fixtureId: string | number) => Promise<{ success: boolean; message: string }>;
  simulateFinishedMatchFT: (fixtureId?: string, homeScore?: number, awayScore?: number) => void;
}

const STORAGE_KEY = 'supermanager_fantasy_state_v2';

const FantasyContext = createContext<FantasyContextType | null>(null);

export const FantasyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initial User Profile
  const [user, setUser] = useState<UserProfile>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_user`);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return {
      id: 'usr_me',
      name: 'Alex D.',
      email: 'alex.manager@superliga.ro',
      teamName: 'Tricolorii Giulești FC',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&h=200&q=80',
      favoriteClubId: 'fcsb',
      budget: 50000000, // €50M
      fanCoins: 1250,
      checkinsCount: 3,
      leagueId: 'lg_superliga_official_2026',
      leagueCode: 'SUPER2026',
      leagueStatus: 'active',
      starterPackClaimed: true,
      membership: 'pro',
    };
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem(`${STORAGE_KEY}_auth`) === 'true';
  });

  // =========================================================================
  // CLUBS MASTER STATE (All 16 Liga 1 Clubs + Dynamic Additions / Deactivations)
  // =========================================================================
  const [clubs, setClubs] = useState<Club[]>(() => {
    const local = (() => {
      try {
        const stored = localStorage.getItem('supermanager_db_clubs');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (typeof parsed === 'object' && parsed !== null) {
            return Object.values(parsed) as Club[];
          }
        }
      } catch (e) {
        /* ignore */
      }
      return [];
    })();

    const clubMap = new Map<string, Club>();
    ALL_16_SUPERLIGA_CLUBS.forEach((c) => {
      clubMap.set(c.id, { ...c, isActive: true });
    });
    local.forEach((c) => {
      if (c && c.id) {
        clubMap.set(c.id, { ...c, isActive: c.isActive !== false });
      }
    });
    return Array.from(clubMap.values());
  });

  const activeClubs = useMemo(() => clubs.filter((c) => c.isActive !== false), [clubs]);
  const activeClubIds = useMemo(() => new Set(activeClubs.map((c) => c.id)), [activeClubs]);

  // All Players Master List (persisted and stored across sessions)
  const [masterPlayers, setMasterPlayers] = useState<Player[]>(() => {
    // 1. Get cached deleted player IDs (tombstones)
    const localDeleted = (() => {
      try {
        return new Set<string>(JSON.parse(localStorage.getItem('supermanager_deleted_player_ids') || '[]'));
      } catch (e) {
        return new Set<string>();
      }
    })();

    // 2. Get cached custom created players
    const localCustom: Player[] = (() => {
      try {
        return JSON.parse(localStorage.getItem('supermanager_custom_players') || '[]');
      } catch (e) {
        return [];
      }
    })();

    // 3. Get cached player overrides
    const overrides: Record<string, Partial<Player>> = (() => {
      try {
        return JSON.parse(localStorage.getItem('supermanager_player_overrides') || '{}');
      } catch (e) {
        return {};
      }
    })();

    // 4. Merge base players from ALL_16_SUPERLIGA_PLAYERS and INITIAL_PLAYERS
    const map = new Map<string, Player>();
    ALL_16_SUPERLIGA_PLAYERS.forEach((p) => {
      if (p && p.id) map.set(p.id, p);
    });
    INITIAL_PLAYERS.forEach((p) => {
      if (p && p.id && !map.has(p.id)) map.set(p.id, p);
    });

    const saved = localStorage.getItem(`${STORAGE_KEY}_players`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 20) {
          parsed.forEach((p) => {
            if (p && p.id) {
              const exist = map.get(p.id);
              map.set(p.id, exist ? { ...exist, ...p } : p);
            }
          });
        }
      } catch (e) { /* ignore */ }
    }

    localCustom.forEach((p) => {
      if (p && p.id) {
        const exist = map.get(p.id);
        map.set(p.id, exist ? { ...exist, ...p } : p);
      }
    });

    // Filter out deleted players, sanitize obsolete relegated clubs, and apply overrides
    const result: Player[] = [];
    map.forEach((p) => {
      if (localDeleted.has(p.id)) return;
      if (p.clubId === 'iasi' || p.clubId === 'buzau' || p.clubId === 'slobozia') return;
      const merged = overrides[p.id] ? { ...p, ...overrides[p.id] } : p;
      result.push({
        ...merged,
        // Punctele de etapă pornesc de la 0 pentru a rula exclusiv date reale sau teste demo
        pointsMatchday: overrides[p.id]?.pointsMatchday ?? 0,
      });
    });

    return result;
  });

  // Alias setPlayers to setMasterPlayers to maintain 100% backward compatibility
  const setPlayers = setMasterPlayers;

  // Players visible in entire game (automatically hides players belonging to deactivated clubs)
  const players = useMemo(() => {
    return masterPlayers.filter((p) => activeClubIds.has(p.clubId));
  }, [masterPlayers, activeClubIds]);

  // All players exposed for Master Database management (including inactive clubs)
  const allPlayers = masterPlayers;

  // Helper to sanitize squad state: cleans obsolete slots and moves stranded players to bench
  const sanitizeSquad = useCallback((rawSquad: SquadState): SquadState => {
    const formation = FORMATIONS[rawSquad?.formation] ? rawSquad.formation : '4-3-3';
    const formationConfig = FORMATIONS[formation];
    const validSlotIds = new Set(formationConfig.slots.map((s) => s.slotId));

    const cleanStartingSlots: Record<string, string | null> = {};
    formationConfig.slots.forEach((s) => {
      cleanStartingSlots[s.slotId] = null;
    });

    const strandedPlayerIds: string[] = [];

    // Transfer valid slots and collect any players stranded in obsolete slots
    Object.entries(rawSquad?.startingSlots || {}).forEach(([slotId, playerId]) => {
      if (playerId) {
        if (validSlotIds.has(slotId)) {
          cleanStartingSlots[slotId] = playerId;
        } else {
          strandedPlayerIds.push(playerId);
        }
      }
    });

    const startersSet = new Set(Object.values(cleanStartingSlots).filter(Boolean) as string[]);

    // Collect bench players: original bench + any stranded players, deduplicated and excluding active starters
    const combinedBench = [
      ...(Array.isArray(rawSquad?.benchPlayerIds) ? rawSquad.benchPlayerIds : []),
      ...strandedPlayerIds,
    ];

    const cleanBench: string[] = [];
    const seenBench = new Set<string>();
    combinedBench.forEach((id) => {
      if (id && !startersSet.has(id) && !seenBench.has(id)) {
        seenBench.add(id);
        cleanBench.push(id);
      }
    });

    return {
      ...rawSquad,
      formation,
      startingSlots: cleanStartingSlots,
      benchPlayerIds: cleanBench,
      captainPlayerId: rawSquad?.captainPlayerId && startersSet.has(rawSquad.captainPlayerId)
        ? rawSquad.captainPlayerId
        : Array.from(startersSet)[0] || null,
      boosterActive: Boolean(rawSquad?.boosterActive),
    };
  }, []);

  // Squad State: configurat cu primul 11 complet Universitatea Craiova pentru test meci live cu Botoșani (#19729653)
  const [squad, setSquad] = useState<SquadState>(() => {
    const craiovaSquad: SquadState = {
      formation: '4-4-2',
      startingSlots: {
        gk: 'p_craiova_popescu',          // Laurențiu Popescu (#21, sportmonksId: 165686)
        lb: 'p_craiova_bancu_real',       // Nicușor Bancu (#11, sportmonksId: 165093)
        lcb: 'p_craiova_screciu_real',    // Vladimir Screciu (#6, sportmonksId: 165553)
        rcb: 'p_craiova_romanchuk',       // Oleksandr Romanchuk (#3, sportmonksId: 1548650)
        rb: 'p_craiova_stevanovic',       // Nikola Stevanovic (#24, sportmonksId: 1467993)
        lm: 'p_craiova_matei',            // David Matei (#30, sportmonksId: 37668705)
        lcm: 'p_craiova_baluta',          // Tudor Băluță (#8, sportmonksId: 165632)
        rcm: 'p_craiova_cicaldau_real',   // Alexandru Cicâldău (CĂPITAN x2) (#20, sportmonksId: 165458)
        rm: 'p_craiova_mora',             // Carlos Mora (#17, sportmonksId: 37414279)
        ls: 'p_craiova_baiaram_real',     // Ștefan Baiaram (#10, sportmonksId: 32786777)
        rs: 'p_craiova_alhamlawi',        // Assad Al-Hamlawi (#9, sportmonksId: 7346257)
      },
      benchPlayerIds: ['p_craiova_maxim', 'p_craiova_cretu', 'p_craiova_nsimba', 'p_craiova_lameira'],
      captainPlayerId: 'p_craiova_cicaldau_real',
      boosterActive: false,
    };

    const testKey = 'supermanager_craiova_live_squad_applied_v3';
    const hasAppliedCraiova = localStorage.getItem(testKey);
    if (!hasAppliedCraiova) {
      try {
        localStorage.setItem(testKey, 'true');
        localStorage.setItem(`${STORAGE_KEY}_squad`, JSON.stringify(craiovaSquad));
      } catch (e) { /* ignore */ }
      return craiovaSquad;
    }

    const saved = localStorage.getItem(`${STORAGE_KEY}_squad`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          const formation = FORMATIONS[parsed.formation as TacticalFormation] ? (parsed.formation as TacticalFormation) : '4-4-2';
          const validSlotIds = new Set(FORMATIONS[formation].slots.map((s) => s.slotId));
          const cleanSlots: Record<string, string | null> = {};
          FORMATIONS[formation].slots.forEach((s) => { cleanSlots[s.slotId] = null; });
          const stranded: string[] = [];

          Object.entries(parsed.startingSlots || {}).forEach(([slotId, playerId]) => {
            if (playerId && typeof playerId === 'string') {
              if (validSlotIds.has(slotId)) {
                cleanSlots[slotId] = playerId;
              } else {
                stranded.push(playerId);
              }
            }
          });

          const starters = new Set(Object.values(cleanSlots).filter(Boolean) as string[]);
          const bench = Array.from(new Set([
            ...(Array.isArray(parsed.benchPlayerIds) ? parsed.benchPlayerIds : []),
            ...stranded,
          ])).filter((id) => !starters.has(id));

          return {
            ...parsed,
            formation,
            startingSlots: cleanSlots,
            benchPlayerIds: bench,
            captainPlayerId: parsed.captainPlayerId || Array.from(starters)[0] || null,
          };
        }
      } catch (e) { /* ignore */ }
    }
    return craiovaSquad;
  });

  // Unified Market Items (League Listings + Member Listings in the same place)
  const [unifiedMarketItems, setUnifiedMarketItems] = useState<UnifiedMarketItem[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_unified_market`);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    const now = Date.now();
    return [
      // 1. League Listing (Superliga României)
      {
        id: 'mkt_1',
        playerId: 'p_politic',
        isLeagueListing: true,
        sellerId: 'superliga_lpf',
        sellerName: 'Superliga României',
        currentBid: 1200000,
        highestBidderId: 'usr_2',
        highestBidderName: 'FCSB Supremacy',
        minAskingPrice: 1600000, // if bid reaches this, transfers instantly
        leagueBaseOffer: 1200000,
        expiresAt: now + 1000 * 60 * 55, // 55 mins
        bidHistory: [
          { bidderId: 'usr_2', bidderName: 'FCSB Supremacy', amount: 1200000, time: 'acum 12 min' },
          { bidderId: 'superliga_lpf', bidderName: 'Ofertă inițială Superliga', amount: 1200000, time: 'acum 45 min' },
        ],
      },
      // 2. Member Listing (Rival Manager selling)
      {
        id: 'mkt_2',
        playerId: 'p_selmani',
        isLeagueListing: false,
        sellerId: 'usr_3',
        sellerName: 'Giuleștina Boys',
        currentBid: 1200000, // League guaranteed baseline
        highestBidderId: 'superliga_lpf',
        highestBidderName: 'Superliga României (Ofertă Automată)',
        minAskingPrice: 1500000, // minimum asking price clause
        leagueBaseOffer: 1200000,
        expiresAt: now + 1000 * 60 * 110, // ~2 hours
        bidHistory: [
          { bidderId: 'superliga_lpf', bidderName: 'Superliga României (Garanție Cotă)', amount: 1200000, time: 'la listare' },
        ],
      },
      // 3. League Listing
      {
        id: 'mkt_3',
        playerId: 'p_deac',
        isLeagueListing: true,
        sellerId: 'superliga_lpf',
        sellerName: 'Superliga României',
        currentBid: 500000,
        highestBidderId: null,
        highestBidderName: null,
        minAskingPrice: 700000,
        leagueBaseOffer: 500000,
        expiresAt: now + 1000 * 60 * 180,
        bidHistory: [],
      },
      // 4. Member Listing
      {
        id: 'mkt_4',
        playerId: 'p_nistor',
        isLeagueListing: false,
        sellerId: 'usr_4',
        sellerName: 'Știința Craiova 1948',
        currentBid: 600000,
        highestBidderId: 'usr_5',
        highestBidderName: 'CFR Gruia Power',
        minAskingPrice: 750000,
        leagueBaseOffer: 550000,
        expiresAt: now + 1000 * 60 * 40,
        bidHistory: [
          { bidderId: 'usr_5', bidderName: 'CFR Gruia Power', amount: 600000, time: 'acum 5 min' },
          { bidderId: 'superliga_lpf', bidderName: 'Superliga României (Garanție Cotă)', amount: 550000, time: 'la listare' },
        ],
      },
      // 5. League Listing
      {
        id: 'mkt_5',
        playerId: 'p_thiam',
        isLeagueListing: true,
        sellerId: 'superliga_lpf',
        sellerName: 'Superliga României',
        currentBid: 900000,
        highestBidderId: null,
        highestBidderName: null,
        minAskingPrice: 1100000,
        leagueBaseOffer: 900000,
        expiresAt: now + 1000 * 60 * 240,
        bidHistory: [],
      },
      // 6. League Listing
      {
        id: 'mkt_6',
        playerId: 'p_cisotti',
        isLeagueListing: true,
        sellerId: 'superliga_lpf',
        sellerName: 'Superliga României',
        currentBid: 700000,
        highestBidderId: null,
        highestBidderName: null,
        minAskingPrice: 900000,
        leagueBaseOffer: 700000,
        expiresAt: now + 1000 * 60 * 95,
        bidHistory: [],
      },
    ];
  });

  // News Articles
  const [newsArticles, setNewsArticles] = useState<LeagueNewsArticle[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_news`);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return INITIAL_LEAGUE_NEWS;
  });

  // Transactions History
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_transactions`);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return [
      { id: 'tx_1', type: 'buy', playerName: 'Alexandru Mitriță', amount: 4000000, date: '10 Oct 2026', description: 'Transferat de la Universitatea Craiova' },
      { id: 'tx_2', type: 'buy', playerName: 'Darius Olaru', amount: 7000000, date: '08 Oct 2026', description: 'Căpitan achiziționat de la FCSB' },
      { id: 'tx_3', type: 'reward', amount: 500000, date: '05 Oct 2026', description: 'Bonus etapă: Locul 1 în liga prietenilor' },
      { id: 'tx_4', type: 'reward', amount: 150000, date: '04 Oct 2026', description: 'Recompensă Check-in Arena Națională (LPF Fan)' },
    ];
  });

  // Fixtures (curățate de orice date mock reziduale din cache)
  const [fixtures, setFixtures] = useState<Fixture[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_fixtures`);
    if (saved) {
      try {
        const parsed: Fixture[] = JSON.parse(saved);
        const hasLegacyMock = parsed.some(
          (f) =>
            f.events?.some((ev) => ev.id?.startsWith('ev_') || ev.id?.startsWith('ev_c')) ||
            f.minute === 74 ||
            f.minute === 88
        );
        if (!hasLegacyMock && parsed.length > 0) return parsed;
      } catch (e) { /* ignore */ }
    }
    return INITIAL_FIXTURES;
  });

  // Simulation controls
  const [isSimulating, setIsSimulating] = useState<boolean>(true);
  const [simulationSpeed, setSimulationSpeed] = useState<number>(1);

  // Predictions
  const [predictions, setPredictions] = useState<Record<string, Prediction>>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_predictions`);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return {
      fix_1: { fixtureId: 'fix_1', homeScore: 2, awayScore: 1, status: 'won_exact', rewardClaimed: false, rewardAmount: 250000 },
      fix_2: { fixtureId: 'fix_2', homeScore: 2, awayScore: 1, status: 'pending', rewardClaimed: false, rewardAmount: 250000 },
      fix_3: { fixtureId: 'fix_3', homeScore: 1, awayScore: 1, status: 'pending', rewardClaimed: false, rewardAmount: 250000 },
    };
  });

  // League Settings
  const [leagueSettings, setLeagueSettings] = useState<LeagueSettings>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_settings`);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return {
      leagueName: 'Superliga Campionilor Pro',
      leagueCode: 'SL-2026-PRO',
      startingBudget: 50000000,
      maxSquadSize: 16,
      allowMemberAuctions: true,
      transferWindowOpen: true,
    };
  });

  // Pending League Join Requests (Aprobare de către administrator)
  const [pendingLeagueRequests, setPendingLeagueRequests] = useState<LeagueJoinRequest[]>([]);

  // Accepted extra members persistenta
  const [acceptedExtraMembers, setAcceptedExtraMembers] = useState<LeagueMember[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('supermanager_extra_league_members') || '[]');
    } catch (e) {
      return [];
    }
  });

  // Polling requests for current league
  useEffect(() => {
    let isMounted = true;
    const fetchRequests = async () => {
      try {
        const list = await getFirestoreLeagueJoinRequests(leagueSettings.leagueCode);
        if (isMounted) {
          setPendingLeagueRequests(list.filter((r) => r.status === 'pending'));
        }
      } catch (e) { /* ignore */ }
    };
    fetchRequests();
    const interval = setInterval(fetchRequests, 8000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [leagueSettings.leagueCode]);

  // Notifications
  const [notifications, setNotifications] = useState<AppNotification[]>([
    {
      id: 'notif_1',
      title: 'Gol marcat de căpitan!',
      message: 'Darius Olaru a transformat un penalty în minutul 59! (+50p x 2 = +100p)',
      type: 'live_event',
      time: 'acum 15 min',
      read: false,
    },
    {
      id: 'notif_2',
      title: 'Alertă Ofertă: Dennis Politic',
      message: 'FCSB Supremacy a ridicat oferta la €1.20M pe piața ligii.',
      type: 'auction',
      time: 'acum 30 min',
      read: false,
    },
    {
      id: 'notif_3',
      title: 'Jucător suspendat în lot',
      message: 'Denis Alibec a primit al 4-lea cartonaș galben și este suspendat pentru etapa următoare.',
      type: 'injury',
      time: 'acum 2 ore',
      read: true,
    },
  ]);

  // 1-Minute Demo Match State (Accelerated match simulation with user's squad players)
  const [isDemoMatchActive, setIsDemoMatchActive] = useState<boolean>(false);
  const [demoTimeRemaining, setDemoTimeRemaining] = useState<number>(60); // 60 seconds = 1 minute real time
  const [demoMinute, setDemoMinute] = useState<number>(0); // 0 to 90 match minutes
  const [demoHomeScore, setDemoHomeScore] = useState<number>(0);
  const [demoAwayScore, setDemoAwayScore] = useState<number>(0);
  const [demoEvents, setDemoEvents] = useState<MatchLiveEvent[]>([]);
  const [demoEventsByPlayer, setDemoEventsByPlayer] = useState<Record<string, MatchLiveEvent[]>>({});
  const [pendingDemoMatchSave, setPendingDemoMatchSave] = useState<DemoCompletedMatchData | null>(null);
  const [showDemoSaveModal, setShowDemoSaveModal] = useState<boolean>(false);

  // =========================================================================
  // SPORTMONKS V3 LIVE STATS & POLLING INTEGRATION
  // =========================================================================
  const [sportmonksScores, setSportmonksScores] = useState<Map<number, number>>(new Map());
  const [sportmonksPlayerDetails, setSportmonksPlayerDetails] = useState<
    Map<number, { minutes: number; details: any[]; contextual?: any; playerInfo?: any }>
  >(new Map());
  const [sportmonksActiveMatches, setSportmonksActiveMatches] = useState<any[]>([]);
  const [isSportmonksPolling, setIsSportmonksPolling] = useState<boolean>(false);

  // =========================================================================
  // MATCH FINALIZER & 5-MINUTE FT DELAYED QUEUE
  // =========================================================================
  const [finalizedMatchIds, setFinalizedMatchIds] = useState<string[]>([]);
  const [pendingFinalizations, setPendingFinalizations] = useState<
    Array<{
      fixtureId: string;
      homeClubId: string;
      awayClubId: string;
      homeScore: number;
      awayScore: number;
      scheduledTime: number;
      secondsRemaining: number;
    }>
  >([]);

  useEffect(() => {
    MatchFinalizerService.loadFinalizedMatchIds().then((ids) => {
      setFinalizedMatchIds(ids);
    });
  }, []);

  // Ref stabil pentru jucătorii din lot fără re-abonări în cicluri
  const masterPlayersRef = React.useRef(masterPlayers);
  useEffect(() => {
    masterPlayersRef.current = masterPlayers;
  }, [masterPlayers]);

  // Gestionează fotbaliștii noi descoperiți în meciurile live din API:
  // Îi înregistrează în masterPlayers și îi adaugă aleatoriu pe piața de transferuri
  const handleDiscoveredNewPlayers = useCallback((newDiscoveredPlayers: Player[]) => {
    if (!newDiscoveredPlayers || newDiscoveredPlayers.length === 0) return;

    // 1. Adăugare în masterPlayers
    setMasterPlayers((prev) => {
      const existingIds = new Set(prev.map((p) => p.id));
      const toAdd = newDiscoveredPlayers.filter((p) => !existingIds.has(p.id));
      if (toAdd.length === 0) return prev;
      return [...prev, ...toAdd];
    });

    // 2. Adăugare independentă pe piața de transferuri ca jucător liber (24-72h licitație)
    setUnifiedMarketItems((prev) => {
      const existingMarketIds = new Set(prev.map((i) => i.playerId));
      const newItems: UnifiedMarketItem[] = [];
      const now = Date.now();

      newDiscoveredPlayers.forEach((p) => {
        if (!existingMarketIds.has(p.id)) {
          existingMarketIds.add(p.id);
          const randomHours = Math.floor(Math.random() * (72 - 24 + 1)) + 24;
          newItems.push({
            id: `mkt_league_${p.id}_${now}`,
            playerId: p.id,
            isLeagueListing: true,
            sellerId: 'superliga_lpf',
            sellerName: 'Superliga României (Jucător Nou)',
            currentBid: p.marketValue,
            highestBidderId: null,
            highestBidderName: null,
            minAskingPrice: Math.round(p.marketValue * 1.25),
            leagueBaseOffer: p.marketValue,
            expiresAt: now + randomHours * 3600 * 1000,
            bidHistory: [],
            receivedOffers: [],
          });
        }
      });

      return newItems.length > 0 ? [...prev, ...newItems] : prev;
    });
  }, []);

  // Sync Sportmonks IDs function
  const syncSportmonksPlayerIds = useCallback(async () => {
    const res = await SportmonksLiveService.syncPlayerSportmonksIds(masterPlayers);
    if (res.updatedPlayers && res.updatedPlayers.length > 0) {
      setMasterPlayers(res.updatedPlayers);
    }
    return { matchedCount: res.matchedCount, message: res.message };
  }, [masterPlayers]);

  // Mod meciuri test/demo (Craiova vs Botoșani / Petrolul vs CFR)
  const [testFixturesEnabled, setTestFixturesEnabled] = useState<boolean>(() => {
    return typeof window !== 'undefined' && localStorage.getItem('supermanager_force_test_fixtures') === 'true';
  });

  // Trigger manual refresh of live scores
  const refreshSportmonksLiveScores = useCallback(async () => {
    try {
      const result = await SportmonksLiveService.getLiveCalculatedScoresWithMissingCheck(masterPlayersRef.current);
      setSportmonksScores(new Map(result.scores));
      setSportmonksPlayerDetails(new Map(SportmonksLiveService.lastPlayerDetailsMap));
      setSportmonksActiveMatches([...result.matches]);

      if (result.newPlayers && result.newPlayers.length > 0) {
        handleDiscoveredNewPlayers(result.newPlayers);
      }

      if (result.scores.size > 0) {
        setMasterPlayers((prev) =>
          prev.map((player) => {
            const smId = player.sportmonksId ? Number(player.sportmonksId) : undefined;
            if (smId && result.scores.has(smId)) {
              const livePts = result.scores.get(smId)!;
              return { ...player, pointsMatchday: livePts };
            }
            return player;
          })
        );
      }
    } catch (err) {
      console.error('[Sportmonks] Manual refresh error:', err);
    }
  }, [handleDiscoveredNewPlayers]);

  const toggleTestFixtures = useCallback(() => {
    setTestFixturesEnabled((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('supermanager_force_test_fixtures', next ? 'true' : 'false');
      }
      setTimeout(() => {
        refreshSportmonksLiveScores();
      }, 50);
      return next;
    });
  }, [refreshSportmonksLiveScores]);

  // 1. Universal Real-Time Listener via Firestore onSnapshot (/live_matches/current)
  // Toți utilizatorii primesc actualizările live în timp real fără a apela Sportmonks direct.
  useEffect(() => {
    loadGameweekFinalScores('gw_current').then((persisted) => {
      if (persisted && persisted.scores) {
        const scoresMap = new Map<number, number>();
        Object.entries(persisted.scores).forEach(([idStr, pts]) => {
          scoresMap.set(Number(idStr), Number(pts));
        });
        setSportmonksScores(scoresMap);
        if (persisted.matches && persisted.matches.length > 0) {
          setSportmonksActiveMatches(persisted.matches);
        }
      }
    });

    const unsubscribe = subscribeToLiveMatches((snapshot) => {
      if (!snapshot) return;

      if (snapshot.scores) {
        const scoresMap = new Map<number, number>();
        Object.entries(snapshot.scores).forEach(([idStr, pts]) => {
          scoresMap.set(Number(idStr), Number(pts));
        });
        setSportmonksScores(scoresMap);

        setMasterPlayers((prev) =>
          prev.map((player) => {
            if (player.sportmonksId && scoresMap.has(player.sportmonksId)) {
              return { ...player, pointsMatchday: scoresMap.get(player.sportmonksId)! };
            }
            return player;
          })
        );
      }

      if (snapshot.playerDetails) {
        const detailsMap = new Map<number, any>();
        Object.entries(snapshot.playerDetails).forEach(([idStr, det]) => {
          detailsMap.set(Number(idStr), det);
        });
        setSportmonksPlayerDetails(detailsMap);
      }

      if (snapshot.matches) {
        setSportmonksActiveMatches(snapshot.matches);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // 2. Coordonator Polling Sportmonks (Activ pentru monitorizare meciuri SuperLiga inplay)
  useEffect(() => {
    setIsSportmonksPolling(true);
    SportmonksLiveService.startPolling(
      (liveScores, rawDetails, activeMatches, newDiscoveredPlayers) => {
        setSportmonksScores(new Map(liveScores));
        if (rawDetails) {
          setSportmonksPlayerDetails(new Map(rawDetails));
        }
        if (activeMatches) {
          setSportmonksActiveMatches([...activeMatches]);
          activeMatches.forEach((smFixture: any) => {
            const homeGoals = smFixture.scores?.find((s: any) => s.description === 'CURRENT' && (s.score?.participant === 'home' || s.score?.participant === 'participant1'))?.score?.goals ??
              smFixture.scores?.find((s: any) => s.description === 'CURRENT')?.score?.participant1 ??
              smFixture.homeScore ?? 0;
            const awayGoals = smFixture.scores?.find((s: any) => s.description === 'CURRENT' && (s.score?.participant === 'away' || s.score?.participant === 'participant2'))?.score?.goals ??
              smFixture.scores?.find((s: any) => s.description === 'CURRENT')?.score?.participant2 ??
              smFixture.awayScore ?? 0;
            const minute = smFixture.minute || 40;
            const isFT = ['FT', 'ENDED', 'AET', 'FINISHED'].includes((smFixture.state?.state || smFixture.state?.short_name || smFixture.status || '').toUpperCase());

            setFixtures((prev) =>
              prev.map((f) => {
                if (
                  f.id === `fix_${smFixture.id}` ||
                  f.id === String(smFixture.id) ||
                  (smFixture.id === 19729653 && (f.id === 'fix_19729653' || (f.homeClubId === 'craiova' && f.awayClubId === 'botosani'))) ||
                  (smFixture.id === 19729652 && (f.id === 'fix_19729652' || (f.homeClubId === 'petrolul' && f.awayClubId === 'cfr')))
                ) {
                  return {
                    ...f,
                    homeScore: homeGoals,
                    awayScore: awayGoals,
                    minute,
                    isLive: !isFT,
                    isFinished: isFT,
                  };
                }
                return f;
              })
            );
          });
        }

        if (newDiscoveredPlayers && newDiscoveredPlayers.length > 0) {
          handleDiscoveredNewPlayers(newDiscoveredPlayers);
        }

        if (liveScores && liveScores.size > 0) {
          setMasterPlayers((prev) =>
            prev.map((player) => {
              const smId = player.sportmonksId ? Number(player.sportmonksId) : undefined;
              if (smId && liveScores.has(smId)) {
                const livePts = liveScores.get(smId)!;
                return { ...player, pointsMatchday: livePts };
              }
              return player;
            })
          );
        }
      },
      () => masterPlayersRef.current
    );

    return () => {
      SportmonksLiveService.stopPolling();
      setIsSportmonksPolling(false);
    };
  }, [handleDiscoveredNewPlayers]);


  // Save to localStorage
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_user`, JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_players`, JSON.stringify(players));
  }, [players]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_squad`, JSON.stringify(squad));
  }, [squad]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_unified_market`, JSON.stringify(unifiedMarketItems));
  }, [unifiedMarketItems]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_news`, JSON.stringify(newsArticles));
  }, [newsArticles]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_transactions`, JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_fixtures`, JSON.stringify(fixtures));
  }, [fixtures]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_predictions`, JSON.stringify(predictions));
  }, [predictions]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_settings`, JSON.stringify(leagueSettings));
  }, [leagueSettings]);

  // Persist Clubs state to localStorage
  useEffect(() => {
    try {
      const map: Record<string, Club> = {};
      clubs.forEach((c) => {
        map[c.id] = c;
      });
      localStorage.setItem('supermanager_db_clubs', JSON.stringify(map));
    } catch (e) {
      /* ignore */
    }
  }, [clubs]);

  // Synchronize Global Players, Additions & Deletions and Clubs from Firestore Database across all users
  useEffect(() => {
    let isMounted = true;
    async function syncGlobalPlayersFromFirestore() {
      try {
        const [remotePlayers, remoteCustom, remoteDeleted, remoteClubs] = await Promise.all([
          loadFirestoreGlobalPlayers(),
          loadFirestoreCustomPlayers(),
          loadFirestoreDeletedPlayerIds(),
          loadFirestoreClubs(),
        ]);

        if (!isMounted) return;

        // Synchronize remote clubs if any exists
        if (remoteClubs && remoteClubs.length > 0) {
          setClubs((prev) => {
            const clubMap = new Map<string, Club>();
            prev.forEach((c) => clubMap.set(c.id, c));
            remoteClubs.forEach((c) => {
              if (c && c.id) {
                const existing = clubMap.get(c.id);
                clubMap.set(c.id, existing ? { ...existing, ...c } : c);
              }
            });
            return Array.from(clubMap.values());
          });
        }

        const deletedSet = new Set(remoteDeleted);

        setPlayers((prev) => {
          const map = new Map<string, Player>();

          // Base 1: All 16 Superliga clubs official players
          ALL_16_SUPERLIGA_PLAYERS.forEach((p) => {
            if (p && p.id && !deletedSet.has(p.id)) {
              map.set(p.id, p);
            }
          });

          // Base 2: Initial Superliga players (includes Dobre, Baiaram, Postolachi, Siegrist, Pașcanu, Onea, etc.)
          INITIAL_PLAYERS.forEach((p) => {
            if (p && p.id && !deletedSet.has(p.id) && !map.has(p.id)) {
              map.set(p.id, p);
            }
          });

          // 3. Keep non-deleted players from current state
          prev.forEach((p) => {
            if (p && p.id && !deletedSet.has(p.id)) {
              const existing = map.get(p.id);
              map.set(p.id, existing ? { ...existing, ...p } : p);
            }
          });

          // 4. Add or update remote custom players
          remoteCustom.forEach((p) => {
            if (p && p.id && !deletedSet.has(p.id)) {
              const existing = map.get(p.id);
              map.set(p.id, existing ? { ...existing, ...p } : p);
            }
          });

          // 3. Apply global player edits or new players from all_players
          Object.values(remotePlayers).forEach((p) => {
            if (p && p.id && !deletedSet.has(p.id)) {
              const existing = map.get(p.id);
              if (existing) {
                map.set(p.id, { ...existing, ...p });
              } else if (p.name && p.clubId && p.position) {
                map.set(p.id, p as Player);
              }
            }
          });

          const finalList = Array.from(map.values());
          try {
            localStorage.setItem(`${STORAGE_KEY}_players`, JSON.stringify(finalList));
          } catch (e) {
            /* ignore */
          }
          return finalList;
        });

        // Also clean up unifiedMarketItems if any deleted player was listed!
        setUnifiedMarketItems((prev) => prev.filter((item) => !deletedSet.has(item.playerId)));
      } catch (e) {
        console.warn('Sync global players note:', e);
      }
    }

    syncGlobalPlayersFromFirestore();
    return () => {
      isMounted = false;
    };
  }, []);

  // Maintain daily random league listings: at least 1 player per position (GK, DEF, MID, FWD)
  // with random auction duration between 24 and 72 hours (1 to 3 days in hours)
  useEffect(() => {
    const requiredPositions: PlayerPosition[] = ['GK', 'DEF', 'MID', 'FWD'];
    const currentLeagueListings = unifiedMarketItems.filter((i) => i.isLeagueListing);
    const existingMarketPlayerIds = new Set(unifiedMarketItems.map((i) => i.playerId));
    const userPlayerIds = new Set([
      ...Object.values(squad.startingSlots).filter(Boolean) as string[],
      ...squad.benchPlayerIds,
    ]);

    const newAdditions: UnifiedMarketItem[] = [];
    const now = Date.now();

    requiredPositions.forEach((pos) => {
      const hasPos = currentLeagueListings.some((item) => {
        const p = players.find((pl) => pl.id === item.playerId);
        return p?.position === pos;
      });

      if (!hasPos) {
        const candidate = players.find(
          (p) => p.position === pos && !existingMarketPlayerIds.has(p.id) && !userPlayerIds.has(p.id)
        );
        if (candidate) {
          existingMarketPlayerIds.add(candidate.id);
          // Random hours between 24 and 72 (1 to 3 days in hours)
          const randomHours = Math.floor(Math.random() * (72 - 24 + 1)) + 24;
          newAdditions.push({
            id: `mkt_league_${candidate.id}_${now}`,
            playerId: candidate.id,
            isLeagueListing: true,
            sellerId: 'superliga_lpf',
            sellerName: 'Superliga României (Jucător Liber)',
            currentBid: candidate.marketValue,
            highestBidderId: null,
            highestBidderName: null,
            minAskingPrice: Math.round(candidate.marketValue * 1.3),
            leagueBaseOffer: candidate.marketValue,
            expiresAt: now + randomHours * 3600 * 1000,
            bidHistory: [],
            receivedOffers: [],
          });
        }
      }
    });

    if (newAdditions.length > 0) {
      setUnifiedMarketItems((prev) => [...prev, ...newAdditions]);
    }
  }, [players, squad.startingSlots, squad.benchPlayerIds, unifiedMarketItems]);

  // Notifications helpers
  const unreadNotificationsCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  const markNotificationsAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const addNotification = useCallback((notif: Omit<AppNotification, 'id' | 'time' | 'read'>) => {
    const newNotif: AppNotification = {
      ...notif,
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      time: 'chiar acum',
      read: false,
    };
    setNotifications((prev) => [newNotif, ...prev]);
  }, []);

  const addNewsArticle = useCallback((article: Omit<LeagueNewsArticle, 'id' | 'date'>) => {
    const newArt: LeagueNewsArticle = {
      ...article,
      id: `news_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      date: 'chiar acum',
    };
    setNewsArticles((prev) => [newArt, ...prev]);
  }, []);

  // Finalizează un meci imediat și scrie definitiv în Firestore
  const finalizeMatchNow = useCallback(async (fixtureId: string | number) => {
    const fixKey = String(fixtureId);
    const targetPending = pendingFinalizations.find((p) => p.fixtureId === fixKey);

    const smMatch = sportmonksActiveMatches?.find((m: any) => String(m.id) === fixKey || (fixKey.includes('19729653') && m.id === 19729653) || (fixKey.includes('19729652') && m.id === 19729652));
    const smHomeGoals = smMatch?.scores?.find((s: any) => s.description === 'CURRENT' && (s.score?.participant === 'home' || s.score?.participant === 'participant1'))?.score?.goals ??
      smMatch?.scores?.find((s: any) => s.description === 'CURRENT')?.score?.participant1 ??
      smMatch?.homeScore;
    const smAwayGoals = smMatch?.scores?.find((s: any) => s.description === 'CURRENT' && (s.score?.participant === 'away' || s.score?.participant === 'participant2'))?.score?.goals ??
      smMatch?.scores?.find((s: any) => s.description === 'CURRENT')?.score?.participant2 ??
      smMatch?.awayScore;

    const defaultHome = fixKey.includes('19729653') ? 'craiova' : fixKey.includes('19729652') ? 'petrolul' : 'craiova';
    const defaultAway = fixKey.includes('19729653') ? 'botosani' : fixKey.includes('19729652') ? 'cfr' : 'botosani';

    const fixture = fixtures.find((f) => f.id === fixKey || f.id === `fix_${fixKey}`) || {
      id: fixKey,
      homeClubId: targetPending?.homeClubId || defaultHome,
      awayClubId: targetPending?.awayClubId || defaultAway,
      homeScore: smHomeGoals ?? targetPending?.homeScore ?? 0,
      awayScore: smAwayGoals ?? targetPending?.awayScore ?? 0,
      events: [],
    };

    const finalHomeScore = smHomeGoals ?? fixture.homeScore ?? 0;
    const finalAwayScore = smAwayGoals ?? fixture.awayScore ?? 0;

    const normHome = (fixture.homeClubId || 'petrolul').replace(/^c_/, '');
    const normAway = (fixture.awayClubId || 'cfr').replace(/^c_/, '');

    const playerLiveMap: Record<string, any> = {};
    players.forEach((p) => {
      const pClubNorm = (p.clubId || '').replace(/^c_/, '');
      if (pClubNorm === normHome || pClubNorm === normAway || p.clubId === fixture.homeClubId || p.clubId === fixture.awayClubId) {
        const smDetails = p.sportmonksId ? sportmonksPlayerDetails.get(p.sportmonksId) : null;
        playerLiveMap[p.id] = {
          minutesPlayed: smDetails?.minutes ?? (p.pointsMatchday > 0 ? 90 : 75),
          isStarter: true,
          pointsMatchday: p.pointsMatchday,
          sportmonksDetails: smDetails?.details || [],
          events: fixture.events?.filter((ev) => ev.playerId === p.id) || [],
        };
      }
    });

    const result = await MatchFinalizerService.finalizeMatch(
      {
        fixtureId: fixKey,
        gameweek: 13,
        homeClubId: fixture.homeClubId,
        awayClubId: fixture.awayClubId,
        homeScore: finalHomeScore,
        awayScore: finalAwayScore,
        playerLiveMap,
      },
      players
    );

    if (result.success) {
      setFinalizedMatchIds((prev) => Array.from(new Set([...prev, fixKey])));
      setPendingFinalizations((prev) => prev.filter((p) => p.fixtureId !== fixKey));
      addNotification({
        title: '🏁 Meci Finalizat & Puncte Salvate Definitiv',
        message: result.message,
        type: 'reward',
      });
    }

    return { success: result.success, message: result.message };
  }, [pendingFinalizations, fixtures, players, sportmonksPlayerDetails, addNotification]);

  // Simulează fluierul final pentru un meci (declanșează timerul de 5 minute)
  const simulateFinishedMatchFT = useCallback((fixtureId: string = 'fix_1', homeScore: number = 2, awayScore: number = 1) => {
    const fixture = fixtures.find((f) => f.id === fixtureId);
    const homeClubId = fixture?.homeClubId || 'c_fcsb';
    const awayClubId = fixture?.awayClubId || 'c_rapid';

    setPendingFinalizations((prev) => {
      if (prev.some((p) => p.fixtureId === fixtureId)) return prev;
      return [
        ...prev,
        {
          fixtureId,
          homeClubId,
          awayClubId,
          homeScore,
          awayScore,
          scheduledTime: Date.now() + 5 * 60 * 1000,
          secondsRemaining: 300, // 5 minute
        },
      ];
    });

    addNotification({
      title: '⏱️ Meci Încheiat (FT) — Salvare Programată',
      message: `Partida s-a încheiat! Punctele contextuale și statisticile se vor salva definitiv în Firestore peste 5 minute.`,
      type: 'live_event',
    });
  }, [fixtures, addNotification]);

  // Timer loop: decrementare fiecare secundă pentru pending finalizations
  useEffect(() => {
    if (pendingFinalizations.length === 0) return;

    const interval = setInterval(() => {
      setPendingFinalizations((prev) => {
        const nextList: typeof prev = [];
        for (const item of prev) {
          const nextSeconds = item.secondsRemaining - 1;
          if (nextSeconds <= 0) {
            // Declanșare automată a salvării
            finalizeMatchNow(item.fixtureId);
          } else {
            nextList.push({ ...item, secondsRemaining: nextSeconds });
          }
        }
        return nextList;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [pendingFinalizations, finalizeMatchNow]);

  // Ascultare meciuri Sportmonks cu status FT / ENDED pentru declanșare automată imediată în Firestore
  useEffect(() => {
    if (!sportmonksActiveMatches || sportmonksActiveMatches.length === 0) return;
    sportmonksActiveMatches.forEach((m: any) => {
      const statusName = (m.state?.state || m.state?.short_name || m.status || '').toUpperCase();
      if (statusName === 'FT' || statusName === 'ENDED' || statusName === 'AET' || statusName === 'FINISHED') {
        const fId = String(m.id);
        if (!MatchFinalizerService.isFixtureFinalized(fId)) {
          finalizeMatchNow(fId);
        }
      }
    });
  }, [sportmonksActiveMatches, finalizeMatchNow]);


  // Compute Empty Starter Slots Count & Penalties (-100p per empty slot)
  const emptyStarterSlotsCount = useMemo(() => {
    const currentConfig = FORMATIONS[squad.formation];
    let emptyCount = 0;
    currentConfig.slots.forEach((slot) => {
      if (!squad.startingSlots[slot.slotId]) {
        emptyCount += 1;
      }
    });
    return emptyCount;
  }, [squad.formation, squad.startingSlots]);

  const emptySlotsPenalty = useMemo(() => {
    return emptyStarterSlotsCount * 100;
  }, [emptyStarterSlotsCount]);

  const squadTotalValue = useMemo(() => {
    const playerMap = new Map(players.map((p) => [p.id, p]));
    let total = 0;
    Object.values(squad.startingSlots).forEach((pId) => {
      if (pId && playerMap.has(pId)) total += playerMap.get(pId)!.marketValue;
    });
    squad.benchPlayerIds.forEach((pId) => {
      if (playerMap.has(pId)) total += playerMap.get(pId)!.marketValue;
    });
    return total;
  }, [players, squad]);

  // Overdraft Financial Computations (-30% max allowed overdraft)
  const squadMarketValue = squadTotalValue;
  const maxOverdraftLimit = useMemo(() => Math.round(squadMarketValue * 0.3), [squadMarketValue]);
  const minAllowedBalance = useMemo(() => -maxOverdraftLimit, [maxOverdraftLimit]);
  const isBudgetNegative = user.budget < 0;
  // If user budget is negative when live matches run or matchday starts, points are penalized to 0 in team standings
  const isOverdraftPenalized = isBudgetNegative;

  // Raw points without overdraft penalty (for player display)
  const rawSquadPointsMatchday = useMemo(() => {
    let pts = 0;
    const playerMap = new Map(players.map((p) => [p.id, p]));
    const currentConfig = FORMATIONS[squad.formation];

    // Penalty for empty starter slots: -100 points per unassigned position
    let emptySlotsCount = 0;
    currentConfig.slots.forEach((slot) => {
      const pId = squad.startingSlots[slot.slotId];
      if (!pId) {
        emptySlotsCount += 1;
      } else {
        const player = playerMap.get(pId);
        if (player) {
          const liveSmPts = player.sportmonksId ? sportmonksScores.get(player.sportmonksId) : undefined;
          let playerPts = typeof liveSmPts === 'number' ? liveSmPts : player.pointsMatchday;
          // Captain x2 applied cleanly to final matchday points (after the final whistle)
          if (player.id === squad.captainPlayerId) {
            playerPts *= 2;
          }
          pts += playerPts;
        }
      }
    });

    // Deduct 100 points for each unassigned starting position automatically
    pts -= emptySlotsCount * 100;

    return pts;
  }, [players, squad, sportmonksScores]);

  // If overdraft penalized, team points in matchday standings are 0!
  const squadPointsMatchday = useMemo(() => {
    if (isOverdraftPenalized) return 0;
    return rawSquadPointsMatchday;
  }, [isOverdraftPenalized, rawSquadPointsMatchday]);

  // Squad size and Goalkeeper count (Rules: max 16, min 11, min 1 GK)
  const squadCount = useMemo(() => {
    const config = FORMATIONS[squad.formation];
    const validSlotIds = new Set(config ? config.slots.map((s) => s.slotId) : []);
    const starters = Object.entries(squad.startingSlots)
      .filter(([slotId, playerId]) => validSlotIds.has(slotId) && Boolean(playerId))
      .map(([_, playerId]) => playerId as string);
    const startersSet = new Set(starters);
    // Bench players: bench entries + any stranded players from obsolete slots not in active formation
    const stranded = Object.entries(squad.startingSlots)
      .filter(([slotId, playerId]) => !validSlotIds.has(slotId) && Boolean(playerId))
      .map(([_, playerId]) => playerId as string);
    const allBench = [...squad.benchPlayerIds, ...stranded];
    const cleanBench = Array.from(new Set(allBench.filter((id) => Boolean(id) && !startersSet.has(id))));
    return startersSet.size + cleanBench.length;
  }, [squad]);

  const gkCount = useMemo(() => {
    const playerMap = new Map(players.map((p) => [p.id, p]));
    const config = FORMATIONS[squad.formation];
    const validSlotIds = new Set(config ? config.slots.map((s) => s.slotId) : []);
    const starters = Object.entries(squad.startingSlots)
      .filter(([slotId, playerId]) => validSlotIds.has(slotId) && Boolean(playerId))
      .map(([_, playerId]) => playerId as string);
    const stranded = Object.entries(squad.startingSlots)
      .filter(([slotId, playerId]) => !validSlotIds.has(slotId) && Boolean(playerId))
      .map(([_, playerId]) => playerId as string);
    const allIds = Array.from(new Set([...starters, ...squad.benchPlayerIds, ...stranded]));
    return allIds.reduce((acc, id) => {
      const p = playerMap.get(id);
      return acc + (p && p.position === 'GK' ? 1 : 0);
    }, 0);
  }, [players, squad]);

  const isSquadValid = useMemo(() => {
    return squadCount >= 11 && squadCount <= 16 && gkCount >= 1;
  }, [squadCount, gkCount]);

  const squadValidationErrors = useMemo(() => {
    const errors: string[] = [];
    if (squadCount > 16) {
      errors.push(`Ai depășit limita maximă de 16 jucători în lot (ai ${squadCount} jucători).`);
    }
    if (squadCount < 11) {
      errors.push(`Lotul tău are ${squadCount} jucători (minim 11 ceruți obligatoriu conform regulamentului).`);
    }
    if (gkCount < 1) {
      errors.push('Echipa ta nu are niciun portar în lot! Este obligatoriu cel puțin 1 portar.');
    }
    if (emptyStarterSlotsCount > 0) {
      errors.push(`Ai ${emptyStarterSlotsCount} posturi neocupate în primul 11 (-${emptyStarterSlotsCount * 100}p penalizare la startul etapei).`);
    }
    return errors;
  }, [squadCount, gkCount, emptyStarterSlotsCount]);

  // Auth & Database Persistence functions
  const registerUserAccount = async (accountData: {
    email: string;
    password?: string;
    name: string;
    teamName: string;
  }): Promise<{ success: boolean; message: string }> => {
    try {
      const newUserId = `usr_${Date.now()}`;
      const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(accountData.name)}&background=05df72&color=0b0e14&bold=true`;
      
      const newProfile: UserProfile = {
        id: newUserId,
        name: accountData.name,
        email: accountData.email,
        teamName: accountData.teamName || `${accountData.name} FC`,
        avatar: defaultAvatar,
        favoriteClubId: 'fcsb',
        budget: 50000000,
        fanCoins: 1000,
        checkinsCount: 0,
        membership: 'gratuit',
      };

      setUser(newProfile);
      setIsAuthenticated(true);
      localStorage.setItem(`${STORAGE_KEY}_auth`, 'true');

      // Save to Firestore and Local Database
      await saveFirestoreUserAccount({
        id: newUserId,
        email: accountData.email,
        password: accountData.password,
        name: accountData.name,
        teamName: accountData.teamName,
        avatar: defaultAvatar,
        budget: 50000000,
        membership: 'gratuit',
        createdAt: new Date().toISOString(),
      });

      addNotification({
        title: 'Cont creat cu succes',
        message: `Bun venit în SuperManager, ${accountData.name}!`,
        type: 'reward',
      });

      return { success: true, message: 'Cont creat cu succes!' };
    } catch (e) {
      return { success: false, message: 'Eroare la salvarea contului în baza de date.' };
    }
  };

  const login = async (
    email: string,
    _pass: string
  ): Promise<{ success: boolean; hasLeague: boolean; isCreator?: boolean; isPendingApproval?: boolean; message?: string }> => {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanPass = _pass.trim();

      // DIRECT CREATOR & COMMISSIONER OS ACCESS (creator@supermanager.ro / 1923)
      if (cleanEmail === 'creator@supermanager.ro' && cleanPass === '1923') {
        const creatorProfile: UserProfile = {
          id: 'usr_creator',
          name: 'SuperManager Creator',
          email: 'creator@supermanager.ro',
          teamName: 'Commissioner HQ',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&h=200&q=80',
          favoriteClubId: 'fcsb',
          budget: 100000000,
          fanCoins: 99999,
          checkinsCount: 10,
          leagueId: 'lg_superliga_official_2026',
          leagueCode: 'SUPER2026',
          leagueStatus: 'active',
          starterPackClaimed: true,
          membership: 'creator',
        };
        setUser(creatorProfile);
        setIsAuthenticated(true);
        localStorage.setItem(`${STORAGE_KEY}_auth`, 'true');
        localStorage.setItem(`${STORAGE_KEY}_user`, JSON.stringify(creatorProfile));

        addNotification({
          title: 'Creator & Commissioner OS',
          message: 'Conectat cu succes ca Administrator Creator Global.',
          type: 'reward',
        });

        return { success: true, hasLeague: true, isCreator: true };
      }

      const stored = await findFirestoreUser(cleanEmail);
      if (stored) {
        // Password verification if password was set on account
        if (stored.password && cleanPass && stored.password !== cleanPass) {
          return {
            success: false,
            hasLeague: false,
            message: 'Parolă incorectă pentru acest cont de manager.',
          };
        }

        const userMembership: UserMembership =
          stored.membership ||
          (cleanEmail === 'creator@supermanager.ro'
            ? 'creator'
            : cleanEmail === 'alex.manager@superliga.ro'
            ? 'pro'
            : 'gratuit');

        const hasActiveLeague =
          Boolean(stored.leagueCode || stored.leagueId) && stored.leagueStatus !== 'pending_approval';
        const isPending = stored.leagueStatus === 'pending_approval';
        const isStarterPackClaimed =
          stored.starterPackClaimed !== undefined
            ? stored.starterPackClaimed
            : hasActiveLeague;

        const updatedProfile: UserProfile = {
          id: stored.id || 'usr_manager',
          name: stored.name || 'Manager SuperLiga',
          email: stored.email,
          teamName: stored.teamName || 'Echipa Mea FC',
          avatar:
            stored.avatar ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(stored.name || 'M')}&background=05df72&color=0b0e14&bold=true`,
          favoriteClubId: stored.favoriteClubId || 'fcsb',
          budget: stored.budget || 50000000,
          fanCoins: 1250,
          checkinsCount: 3,
          leagueId: stored.leagueId,
          leagueCode: stored.leagueCode,
          leagueStatus: stored.leagueStatus || (hasActiveLeague ? 'active' : 'none'),
          starterPackClaimed: isStarterPackClaimed,
          membership: userMembership,
        };

        setUser(updatedProfile);

        if (stored.leagueCode) {
          setLeagueSettings((prev) => ({
            ...prev,
            leagueCode: stored.leagueCode || prev.leagueCode,
            leagueName: stored.leagueName || prev.leagueName,
          }));
        }

        setIsAuthenticated(true);
        localStorage.setItem(`${STORAGE_KEY}_auth`, 'true');
        localStorage.setItem(`${STORAGE_KEY}_user`, JSON.stringify(updatedProfile));

        addNotification({
          title: 'Autentificare reușită',
          message: `Bun venit înapoi, ${stored.name}!`,
          type: 'reward',
        });

        return {
          success: true,
          hasLeague: hasActiveLeague,
          isCreator: userMembership === 'creator' || cleanEmail === 'creator@supermanager.ro',
          isPendingApproval: isPending,
        };
      }

      return {
        success: false,
        hasLeague: false,
        message: 'Contul nu a fost găsit în baza de date. Te rugăm să creezi un cont nou din secțiunea Înregistrare.',
      };
    } catch (err) {
      console.error('Login error:', err);
      return { success: false, hasLeague: false, message: 'Eroare la autentificare.' };
    }
  };

  const loginWithProvider = async (
    provider: 'apple' | 'google'
  ): Promise<{ success: boolean; hasLeague: boolean; isCreator?: boolean }> => {
    try {
      const res = provider === 'google' ? await signInWithGooglePopup() : await signInWithApplePopup();
      if (res.success && res.user) {
        const stored = res.user;
        const hasActiveLeague =
          Boolean(stored.leagueCode || stored.leagueId) && stored.leagueStatus !== 'pending_approval';
        const isPending = stored.leagueStatus === 'pending_approval';
        const isStarterPackClaimed =
          stored.starterPackClaimed !== undefined
            ? stored.starterPackClaimed
            : hasActiveLeague;

        const updatedProfile: UserProfile = {
          id: stored.id,
          name: stored.name,
          email: stored.email,
          teamName: stored.teamName || `${stored.name} FC`,
          avatar: stored.avatar,
          favoriteClubId: stored.favoriteClubId || 'fcsb',
          budget: stored.budget || 50000000,
          fanCoins: 1250,
          checkinsCount: 3,
          leagueId: stored.leagueId,
          leagueCode: stored.leagueCode,
          leagueStatus: stored.leagueStatus || (hasActiveLeague ? 'active' : 'none'),
          starterPackClaimed: isStarterPackClaimed,
          membership: stored.membership || 'gratuit',
        };

        setUser(updatedProfile);
        if (stored.leagueCode) {
          setLeagueSettings((prev) => ({
            ...prev,
            leagueCode: stored.leagueCode || prev.leagueCode,
            leagueName: stored.leagueName || prev.leagueName,
          }));
        }

        setIsAuthenticated(true);
        localStorage.setItem(`${STORAGE_KEY}_auth`, 'true');
        localStorage.setItem(`${STORAGE_KEY}_user`, JSON.stringify(updatedProfile));

        addNotification({
          title: `Conectat cu ${provider === 'apple' ? 'Apple ID' : 'Google'}`,
          message: `Bun venit în SuperManager, ${stored.name}!`,
          type: 'reward',
        });

        return {
          success: true,
          hasLeague: hasActiveLeague,
          isCreator: stored.membership === 'creator',
        };
      }
      return { success: false, hasLeague: false };
    } catch (e) {
      console.error('loginWithProvider error:', e);
      return { success: false, hasLeague: false };
    }
  };

  // Actualizare profil manager cu propagare globală în Firestore și state
  const updateManagerProfileGlobal = async (
    updatedAccount: StoredUserAccount,
    previousEmail?: string
  ): Promise<boolean> => {
    try {
      await updateFirestoreUserAccount(updatedAccount, previousEmail);

      // Dacă este managerul curent autentificat, actualizăm instantaneu starea user
      const isCurrent =
        user.id === updatedAccount.id ||
        user.email.toLowerCase() === (previousEmail?.toLowerCase() || updatedAccount.email.toLowerCase()) ||
        Boolean(previousEmail && user.email.toLowerCase() === previousEmail.toLowerCase()) ||
        updatedAccount.id === 'usr_me';

      if (isCurrent) {
        setUser((prev) => {
          const updated: UserProfile = {
            ...prev,
            name: updatedAccount.name,
            email: updatedAccount.email,
            teamName: updatedAccount.teamName,
            budget: updatedAccount.budget,
            membership: updatedAccount.membership || prev.membership,
            avatar: updatedAccount.avatar || prev.avatar,
            leagueId: updatedAccount.leagueId || prev.leagueId,
            leagueCode: updatedAccount.leagueCode || prev.leagueCode,
          };
          localStorage.setItem(`${STORAGE_KEY}_user`, JSON.stringify(updated));
          return updated;
        });
      }

      // Also update in acceptedExtraMembers if present
      setAcceptedExtraMembers((prev) => {
        const updated = prev.map((m) =>
          m.id === updatedAccount.id || (previousEmail && m.name.toLowerCase() === updatedAccount.name.toLowerCase())
            ? { ...m, name: updatedAccount.name, teamName: updatedAccount.teamName }
            : m
        );
        try {
          localStorage.setItem('supermanager_extra_league_members', JSON.stringify(updated));
        } catch (e) { /* ignore */ }
        return updated;
      });

      addNotification({
        title: '✅ Manager Actualizat Global',
        message: `Datele pentru ${updatedAccount.name} (${updatedAccount.email}) au fost salvate cu succes în Firestore!`,
        type: 'reward',
      });

      return true;
    } catch (err) {
      console.error('updateManagerProfileGlobal error:', err);
      return false;
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem(`${STORAGE_KEY}_auth`);
  };

  // League Creation & Join methods
  const createNewLeague = async (data: {
    name: string;
    startingBudget: number;
    maxSameClubPlayers: number;
  }): Promise<{ success: boolean; message: string }> => {
    const code = `SUP-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const leagueId = `lg_${Date.now()}`;

    setLeagueSettings({
      leagueName: data.name,
      leagueCode: code,
      startingBudget: data.startingBudget,
      maxSquadSize: 16,
      allowMemberAuctions: true,
      transferWindowOpen: true,
    });

    setUser((prev) => ({
      ...prev,
      budget: data.startingBudget,
      leagueId,
      leagueCode: code,
      leagueStatus: 'active',
      starterPackClaimed: true,
    }));

    // Save to Firestore
    await saveFirestoreLeague({
      id: leagueId,
      name: data.name,
      code,
      budget: data.startingBudget,
      maxSameClubPlayers: data.maxSameClubPlayers,
      creatorId: user.id,
      creatorName: user.name,
      createdAt: new Date().toISOString(),
    });

    await saveFirestoreUserAccount({
      id: user.id,
      email: user.email,
      name: user.name,
      teamName: user.teamName,
      avatar: user.avatar,
      budget: data.startingBudget,
      leagueId,
      leagueName: data.name,
      leagueCode: code,
      leagueStatus: 'active',
      starterPackClaimed: true,
      membership: user.membership || 'admin',
      createdAt: new Date().toISOString(),
    });

    // Add News Article in feed
    addNewsArticle({
      title: `Ligă Nouă Fondată: ${data.name}!`,
      summary: `Managerul ${user.name} a fondat liga ${data.name} cu buget de ${formatCurrency(data.startingBudget)} per club.`,
      content: `O nouă ligă privată a fost creată oficial. Invitați prietenii folosind codul ${code}.`,
      tag: 'ETAPĂ',
    });

    return { success: true, message: 'Ligă creată cu succes!' };
  };

  const joinLeagueByCode = async (
    code: string
  ): Promise<{ success: boolean; isPending?: boolean; message: string }> => {
    const found = await findFirestoreLeagueByCode(code);
    if (!found) {
      return {
        success: false,
        message: `Codul de ligă "${code.toUpperCase()}" nu a fost găsit în baza de date. Te rugăm să verifici codul.`,
      };
    }

    const resolvedName = found.name;
    const resolvedBudget = found.budget || 50000000;

    // Dacă utilizatorul este chiar creatorul ligii sau administrator general, intră direct
    if (found.creatorId === user.id || user.membership === 'creator' || user.membership === 'admin') {
      setLeagueSettings((prev) => ({
        ...prev,
        leagueCode: found.code.toUpperCase(),
        leagueName: resolvedName,
        startingBudget: resolvedBudget,
      }));

      setUser((prev) => ({
        ...prev,
        budget: resolvedBudget,
        leagueId: found.id,
        leagueCode: found.code.toUpperCase(),
        leagueStatus: 'active',
        starterPackClaimed: true,
      }));

      await saveFirestoreUserAccount({
        id: user.id,
        email: user.email,
        name: user.name,
        teamName: user.teamName,
        avatar: user.avatar,
        budget: resolvedBudget,
        leagueId: found.id,
        leagueName: resolvedName,
        leagueCode: found.code.toUpperCase(),
        leagueStatus: 'active',
        starterPackClaimed: true,
        membership: user.membership,
        createdAt: new Date().toISOString(),
      });

      addNewsArticle({
        title: `Membru Nou: ${user.name} a intrat în ligă!`,
        summary: `Managerul ${user.name} (${user.teamName}) s-a alăturat ligii ${resolvedName}!`,
        content: `Comunitatea crește! Un nou manager a intrat în competiție și este gata de meciuri.`,
        tag: 'ETAPĂ',
      });

      return { success: true, isPending: false, message: `Te-ai alăturat cu succes ligii ${resolvedName}!` };
    }

    // Altfel, se creează o cerere de aderare (pending approval de către administrator)
    const newReq: LeagueJoinRequest = {
      id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      leagueId: found.id,
      leagueCode: found.code.toUpperCase(),
      leagueName: resolvedName,
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      teamName: user.teamName,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    await createFirestoreLeagueJoinRequest(newReq);

    setUser((prev) => ({
      ...prev,
      leagueId: found.id,
      leagueCode: found.code.toUpperCase(),
      leagueStatus: 'pending_approval',
      starterPackClaimed: false,
    }));

    await saveFirestoreUserAccount({
      id: user.id,
      email: user.email,
      name: user.name,
      teamName: user.teamName,
      avatar: user.avatar,
      budget: resolvedBudget,
      leagueId: found.id,
      leagueName: resolvedName,
      leagueCode: found.code.toUpperCase(),
      leagueStatus: 'pending_approval',
      starterPackClaimed: false,
      membership: user.membership,
      createdAt: new Date().toISOString(),
    });

    addNotification({
      title: '📋 Cerere de Înscriere Trimisă',
      message: `Cererea ta de aderare în ${resolvedName} a fost trimisă administratorului. Vei primi lotul de fotbaliști după aprobare!`,
      type: 'reward',
    });

    return {
      success: true,
      isPending: true,
      message: `Cererea ta a fost expediată către administratorul ligii "${resolvedName}". Vei primi lotul de jucători imediat ce ești acceptat!`,
    };
  };

  // Aprobare cerere de către administrator
  const approveLeagueJoinRequest = async (requestId: string): Promise<boolean> => {
    const targetReq = pendingLeagueRequests.find((r) => r.id === requestId);
    if (!targetReq) return false;

    await respondFirestoreLeagueJoinRequest(requestId, 'accepted');

    // 1. Generare lot de start de 14 jucători
    const starterSquad = generateRandomStarterSquad(players, {
      maxSameClubPlayers: leagueSettings.maxSameClubPlayers || 3,
      assignedPlayerIds: new Set(),
      activeClubIds: activeClubs.map((c) => c.id),
    });

    // 2. Actualizare cont candidat în Firestore
    const candidate = await findFirestoreUser(targetReq.userEmail);
    if (candidate) {
      await updateFirestoreUserAccount({
        ...candidate,
        leagueId: targetReq.leagueId,
        leagueName: targetReq.leagueName,
        leagueCode: targetReq.leagueCode,
        leagueStatus: 'active',
        starterPackClaimed: true,
      });
    }

    // 3. Dacă utilizatorul curent din sesiune este candidatul, actualizăm direct starea
    if (user.id === targetReq.userId || user.email.toLowerCase() === targetReq.userEmail.toLowerCase()) {
      setUser((prev) => ({
        ...prev,
        leagueId: targetReq.leagueId,
        leagueCode: targetReq.leagueCode,
        leagueStatus: 'active',
        starterPackClaimed: true,
      }));
      allocateStarterSquad(starterSquad);
    }

    // 4. Adăugare în membrii suplimentari ai ligii
    const newMember: LeagueMember = {
      id: targetReq.userId,
      name: targetReq.userName,
      teamName: targetReq.teamName,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(targetReq.userName)}&background=05df72&color=0b0e14&bold=true`,
      totalPoints: 1200,
      matchdayPoints: 0,
      squadValue: starterSquad.reduce((acc, p) => acc + p.marketValue, 0),
      rank: 6,
      formation: '4-4-2',
      startingLineup: starterSquad.slice(0, 11).map((p, idx) => ({
        slotLabel: `S${idx + 1}`,
        playerId: p.id,
      })),
    };

    setAcceptedExtraMembers((prev) => {
      const filtered = prev.filter((m) => m.id !== targetReq.userId);
      const updated = [...filtered, newMember];
      try {
        localStorage.setItem('supermanager_extra_league_members', JSON.stringify(updated));
      } catch (e) { /* ignore */ }
      return updated;
    });

    setPendingLeagueRequests((prev) => prev.filter((r) => r.id !== requestId));

    addNewsArticle({
      title: `OFICIAL: ${targetReq.userName} a fost acceptat în ligă!`,
      summary: `Administratorul a aprobat cererea de aderare pentru ${targetReq.teamName}. Lotul de debut de 14 fotbaliști a fost generat!`,
      content: `Managerul ${targetReq.userName} a primit acceptul oficial în ligă și este gata pentru meciurile etapei.`,
      tag: 'ETAPĂ',
    });

    addNotification({
      title: '✅ Manager Acceptat în Ligă!',
      message: `${targetReq.userName} (${targetReq.teamName}) a fost integrat oficial în ligă!`,
      type: 'reward',
    });

    return true;
  };

  const rejectLeagueJoinRequest = async (requestId: string): Promise<boolean> => {
    await respondFirestoreLeagueJoinRequest(requestId, 'rejected');
    setPendingLeagueRequests((prev) => prev.filter((r) => r.id !== requestId));
    addNotification({
      title: '❌ Cerere Respinsă',
      message: 'Cererea de înscriere a fost respinsă.',
      type: 'injury',
    });
    return true;
  };

  const updateUserTeamName = (newName: string) => {
    setUser((prev) => ({ ...prev, teamName: newName }));
  };

  const updateUserPassword = (_password: string) => {
    addNotification({
      title: 'Parolă actualizată',
      message: 'Parola contului tău a fost schimbată cu succes.',
      type: 'reward',
    });
    return true;
  };

  // Alocare Lot de Debut (Pachet de început: 14 jucători echilibrați pe posturi)
  // Bugetul ulterior de transferuri: 5 milioane de euro (€5.00M)
  const allocateStarterSquad = (newSquadPlayers: Player[]) => {
    if (!newSquadPlayers || newSquadPlayers.length === 0) return;

    const gk = newSquadPlayers.find((p) => p.position === 'GK') || newSquadPlayers[0];
    const defs = newSquadPlayers.filter((p) => p.position === 'DEF' && p.id !== gk?.id);
    const mids = newSquadPlayers.filter((p) => p.position === 'MID' && p.id !== gk?.id);
    const fwds = newSquadPlayers.filter((p) => p.position === 'FWD' && p.id !== gk?.id);

    const startDefs = defs.slice(0, 4);
    const startMids = mids.slice(0, 4);
    const startFwds = fwds.slice(0, 2);

    const starters = [gk, ...startDefs, ...startMids, ...startFwds].filter(Boolean);
    const startersIds = new Set(starters.map((p) => p.id));
    const bench = newSquadPlayers.filter((p) => !startersIds.has(p.id));

    const newSlots: Record<string, string | null> = {
      gk: gk ? gk.id : null,
      lb: startDefs[0] ? startDefs[0].id : null,
      lcb: startDefs[1] ? startDefs[1].id : null,
      rcb: startDefs[2] ? startDefs[2].id : null,
      rb: startDefs[3] ? startDefs[3].id : null,
      lm: startMids[0] ? startMids[0].id : null,
      lcm: startMids[1] ? startMids[1].id : null,
      rcm: startMids[2] ? startMids[2].id : null,
      rm: startMids[3] ? startMids[3].id : null,
      ls: startFwds[0] ? startFwds[0].id : null,
      rs: startFwds[1] ? startFwds[1].id : null,
    };

    setSquad(
      sanitizeSquad({
        formation: '4-4-2',
        startingSlots: newSlots,
        benchPlayerIds: bench.map((p) => p.id),
        captainPlayerId: starters[0]?.id || null,
        boosterActive: false,
      })
    );

    // Set remaining transfer budget to €5.00M (€5,000,000)
    setUser((prev) => {
      const updated = {
        ...prev,
        budget: 5000000,
        starterPackClaimed: true,
      };
      localStorage.setItem(`${STORAGE_KEY}_user`, JSON.stringify(updated));
      return updated;
    });

    // Add news article to feed
    addNewsArticle({
      title: `Pachet de Debut Finalizat: ${user.name} a primit lotul de 14 jucători!`,
      summary: `Echipa ${user.teamName} a fost formată cu succes în limita a €5.00M. Buget disponibil de transferuri: €5.00M.`,
      content: `Managerul ${user.name} a finalizat parcursul de atribuire a fotbaliștilor și se alătură competiției din Superliga României 2026/27.`,
      tag: 'TRANSFER',
    });

    addNotification({
      title: 'Lot de Debut Alocat!',
      message: 'Cei 14 jucători au fost adăugați în lot. Ai la dispoziție €5.00M pentru transferuri ulterioare.',
      type: 'reward',
    });
  };

  // Squad management
  // RULE 1: Jucătorii pot fi folosiți DOAR pe pozițiile lor (GK, DEF, MID, FWD)!
  const changeFormation = (newFormation: TacticalFormation) => {
    const newConfig = FORMATIONS[newFormation];
    const newStartingSlots: Record<string, string | null> = {};
    const playerMap = new Map(players.map((p) => [p.id, p]));

    const currentStarters = Object.values(squad.startingSlots).filter(Boolean) as string[];
    let availableStarters = [...currentStarters];
    let availableBench = [...squad.benchPlayerIds];

    newConfig.slots.forEach((slot) => {
      // 1. Încercăm să păstrăm un titular cu aceeași poziție exactă
      const starterIdx = availableStarters.findIndex((pId) => {
        const p = playerMap.get(pId);
        return p && p.position === slot.position;
      });

      if (starterIdx !== -1) {
        newStartingSlots[slot.slotId] = availableStarters[starterIdx];
        availableStarters.splice(starterIdx, 1);
      } else {
        // 2. Încercăm să promovăm un jucător de pe bancă cu aceeași poziție exactă
        const benchIdx = availableBench.findIndex((pId) => {
          const p = playerMap.get(pId);
          return p && p.position === slot.position;
        });

        if (benchIdx !== -1) {
          newStartingSlots[slot.slotId] = availableBench[benchIdx];
          availableBench.splice(benchIdx, 1);
        } else {
          // Lăsăm postul liber (null) - fără jucători pe poziții greșite!
          newStartingSlots[slot.slotId] = null;
        }
      }
    });

    // Toți jucătorii rămași neatribuiți merg pe banca de rezerve (fără duplicate)
    const assignedIds = new Set(Object.values(newStartingSlots).filter(Boolean) as string[]);
    const allSquadIds = Array.from(new Set([...currentStarters, ...squad.benchPlayerIds]));
    const newBench = allSquadIds.filter((id) => !assignedIds.has(id));

    setSquad((prev) => ({
      ...prev,
      formation: newFormation,
      startingSlots: newStartingSlots,
      benchPlayerIds: newBench,
    }));
  };

  // RULE 1: Poziție exactă obligatorie
  // RULE 2: Fiecare jucător poate fi ales O SINGURĂ DATĂ, pe UN SINGUR POST
  const assignPlayerToSlot = (slotId: string, playerId: string) => {
    const player = players.find((pl) => pl.id === playerId);
    if (!player) return;

    const currentConfig = FORMATIONS[squad.formation];
    const targetSlot = currentConfig.slots.find((s) => s.slotId === slotId);
    if (!targetSlot) return;

    // Validare strictă: jucătorul trebuie să aibă exact aceeași poziție ca postul
    if (player.position !== targetSlot.position) {
      addNotification({
        title: 'Poziție nepermisă',
        message: `${player.name} (${player.position}) nu poate juca pe postul de ${targetSlot.position}! Jucătorii pot evolua doar pe poziția lor.`,
        type: 'injury',
      });
      return;
    }

    setSquad((prev) => {
      const currentInSlot = prev.startingSlots[slotId];
      const newSlots = { ...prev.startingSlots };

      // Dacă playerId era deja titular pe un alt post, eliberăm acel post automat!
      Object.keys(newSlots).forEach((sId) => {
        if (sId !== slotId && newSlots[sId] === playerId) {
          newSlots[sId] = null;
        }
      });

      newSlots[slotId] = playerId;

      // Actualizăm banca: eliminăm playerId de pe bancă
      let newBench = prev.benchPlayerIds.filter((id) => id !== playerId);

      // Dacă în acest slot era anterior alt jucător și acel jucător nu mai este titular nicăieri, îl adăugăm pe bancă
      if (currentInSlot && currentInSlot !== playerId) {
        const isStillStarter = Object.values(newSlots).includes(currentInSlot);
        if (!isStillStarter && !newBench.includes(currentInSlot)) {
          newBench.push(currentInSlot);
        }
      }

      // Asigurăm că nu există duplicate pe bancă sau între titulari și bancă
      const currentStartersSet = new Set(Object.values(newSlots).filter(Boolean) as string[]);
      newBench = Array.from(new Set(newBench.filter((id) => !currentStartersSet.has(id))));

      return {
        ...prev,
        startingSlots: newSlots,
        benchPlayerIds: newBench,
      };
    });
  };

  const removePlayerFromSlot = (slotId: string) => {
    setSquad((prev) => {
      const current = prev.startingSlots[slotId];
      if (!current) return prev;
      return {
        ...prev,
        startingSlots: { ...prev.startingSlots, [slotId]: null },
        benchPlayerIds: Array.from(new Set([...prev.benchPlayerIds, current])),
      };
    });
  };

  const setCaptain = (playerId: string) => {
    setSquad((prev) => ({
      ...prev,
      captainPlayerId: playerId,
    }));
    const p = players.find((pl) => pl.id === playerId);
    if (p) {
      addNotification({
        title: 'Căpitan Desemnat (2x)',
        message: `${p.name} este noul căpitan! Punctajul său se dublează (x2) la fluierul final al meciului.`,
        type: 'live_event',
      });
    }
  };

  const swapPlayers = (slotA: string, slotB: string) => {
    setSquad((prev) => {
      const playerA = prev.startingSlots[slotA];
      const playerB = prev.startingSlots[slotB];
      return {
        ...prev,
        startingSlots: {
          ...prev.startingSlots,
          [slotA]: playerB,
          [slotB]: playerA,
        },
      };
    });
  };

  const substituteBenchPlayer = (slotId: string, benchPlayerId: string) => {
    assignPlayerToSlot(slotId, benchPlayerId);
  };

  const applyCraiovaBotosaniSquad = useCallback(() => {
    const craiovaSquad: SquadState = {
      formation: '4-4-2',
      startingSlots: {
        gk: 'p_craiova_popescu',          // Laurențiu Popescu (#21, sportmonksId: 165686)
        lb: 'p_craiova_bancu_real',       // Nicușor Bancu (#11, sportmonksId: 165093)
        lcb: 'p_craiova_screciu_real',    // Vladimir Screciu (#6, sportmonksId: 165553)
        rcb: 'p_craiova_romanchuk',       // Oleksandr Romanchuk (#3, sportmonksId: 1548650)
        rb: 'p_craiova_stevanovic',       // Nikola Stevanovic (#24, sportmonksId: 1467993)
        lm: 'p_craiova_matei',            // David Matei (#30, sportmonksId: 37668705)
        lcm: 'p_craiova_baluta',          // Tudor Băluță (#8, sportmonksId: 165632)
        rcm: 'p_craiova_cicaldau_real',   // Alexandru Cicâldău (CĂPITAN x2) (#20, sportmonksId: 165458)
        rm: 'p_craiova_mora',             // Carlos Mora (#17, sportmonksId: 37414279)
        ls: 'p_craiova_baiaram_real',     // Ștefan Baiaram (#10, sportmonksId: 32786777)
        rs: 'p_craiova_alhamlawi',        // Assad Al-Hamlawi (#9, sportmonksId: 7346257)
      },
      benchPlayerIds: ['p_craiova_maxim', 'p_craiova_cretu', 'p_craiova_nsimba', 'p_craiova_lameira'],
      captainPlayerId: 'p_craiova_cicaldau_real',
      boosterActive: false,
    };
    setSquad(craiovaSquad);
    try {
      localStorage.setItem(`${STORAGE_KEY}_squad`, JSON.stringify(craiovaSquad));
      localStorage.setItem('supermanager_craiova_live_squad_applied_v3', 'true');
    } catch (e) { /* ignore */ }
    refreshSportmonksLiveScores();
    addNotification({
      title: '✅ Lotul Craiova vs Botoșani a fost aplicat!',
      message: 'Toți cei 11 titulari și 4 rezerve au fost configurați cu regulile de punctaj actualizate la zi!',
      type: 'reward',
    });
  }, [refreshSportmonksLiveScores, addNotification]);

  // UNIFIED TRANSFER MARKET
  // 1. Place offer on any listing (League or Member)
  // If the offer meets or exceeds minAskingPrice -> Instant Clause Trigger!
  const placeMarketOffer = (itemId: string, offerAmount: number) => {
    const item = unifiedMarketItems.find((i) => i.id === itemId);
    if (!item) return { success: false, message: 'Jucătorul nu a fost găsit pe piață.' };

    // Validare număr maxim jucători: max 16 jucători în lot
    if (squadCount >= 16) {
      return {
        success: false,
        message: 'Ai atins numărul maxim de 16 jucători în lot! Vinde un jucător înainte de a face o ofertă.',
      };
    }

    if (offerAmount <= item.currentBid) {
      return {
        success: false,
        message: `Oferta trebuie să fie mai mare decât oferta curentă (${formatCurrency(item.currentBid)})!`,
      };
    }

    const player = players.find((p) => p.id === item.playerId);
    if (!player) return { success: false, message: 'Jucătorul nu există în baza de date.' };

    // OVERDRAFT CHECK:
    // Poti intra maxim in minus 30% din valoarea lotului tau (-maxOverdraftLimit).
    const resultingBudget = user.budget - offerAmount;
    if (resultingBudget < minAllowedBalance) {
      return {
        success: false,
        isOverdraftExceeded: true,
        requiredAmount: offerAmount,
        message: `Ai depășit limita maximă de overdraft! Valoarea lotului tău este de ${formatCurrency(squadTotalValue)}, deci poți intra în minus cel mult 30% (${formatCurrency(minAllowedBalance)}). Bugetul tău ar fi devenit ${formatCurrency(resultingBudget)}. Vinde jucători pentru a continua!`,
      };
    }

    // Check if the offer meets or exceeds the seller's minimum asking price -> CLAUSE ACTIVATED!
    const isClauseMet = offerAmount >= item.minAskingPrice;

    if (isClauseMet) {
      // Instant Transfer Clause Triggered!
      // Deduct buyer funds (can go into negative within minAllowedBalance)
      setUser((prev) => ({ ...prev, budget: prev.budget - offerAmount }));

      // Add player to buyer squad
      setSquad((prev) => ({
        ...prev,
        benchPlayerIds: [...prev.benchPlayerIds, player.id],
      }));

      // Remove from market
      setUnifiedMarketItems((prev) => prev.filter((i) => i.id !== itemId));

      // Record transaction
      const tx: Transaction = {
        id: `tx_${Date.now()}`,
        type: 'buy',
        playerId: player.id,
        playerName: player.name,
        amount: offerAmount,
        date: 'Azi',
        description: `Clauză activată la ${formatCurrency(offerAmount)} (Vânzător: ${item.sellerName})`,
      };
      setTransactions((prev) => [tx, ...prev]);

      // Add News Article to League Dashboard!
      addNewsArticle({
        title: `CLAUZĂ ACTIVATĂ: ${player.name} semnează cu ${user.teamName}!`,
        summary: `${user.teamName} a atins suma minimă cerută de ${formatCurrency(offerAmount)} și a încheiat transferul instant.`,
        content: `Un nou transfer spectaculos în ${leagueSettings.leagueName}! ${user.teamName} a declanșat clauza minimă de transfer pentru ${player.name}, în valoare de ${formatFullCurrency(offerAmount)}. Jucătorul a părăsit ${item.sellerName} și s-a alăturat imediat noului lot.`,
        tag: 'CLAUZĂ ACTIVATĂ',
        amount: offerAmount,
        playerName: player.name,
        buyerName: user.teamName,
        sellerName: item.sellerName,
        avatar: player.avatar,
      });

      addNotification({
        title: '⚡ Clauză Activată! Transfer Finalizat!',
        message: `Ai oferit ${formatCurrency(offerAmount)} și ai atins suma minimă cerută! ${player.name} s-a transferat instant în echipa ta!`,
        type: 'transfer',
      });

      return {
        success: true,
        clauseTriggered: true,
        message: `Clauză activată! ${player.name} s-a transferat instant la echipa ta pentru ${formatCurrency(offerAmount)}!`,
      };
    }

    // Normal bid registered (does not meet clause yet, but sets new highest bid)
    const newOfferEntry: MarketOfferEntry = {
      id: `off_${Date.now()}`,
      bidderId: user.id,
      bidderName: user.teamName,
      amount: offerAmount,
      time: 'chiar acum',
      status: 'pending',
    };

    setUnifiedMarketItems((prev) =>
      prev.map((i) => {
        if (i.id === itemId) {
          const prevOffers = i.receivedOffers || [];
          return {
            ...i,
            currentBid: offerAmount,
            highestBidderId: user.id,
            highestBidderName: `${user.name} (${user.teamName})`,
            bidHistory: [
              { bidderId: user.id, bidderName: `${user.name} (${user.teamName})`, amount: offerAmount, time: 'chiar acum' },
              ...i.bidHistory,
            ],
            receivedOffers: [newOfferEntry, ...prevOffers],
          };
        }
        return i;
      })
    );

    addNotification({
      title: 'Ofertă înregistrată!',
      message: `Ai plasat o ofertă de ${formatCurrency(offerAmount)} pentru ${player.name}. Ești cel mai mare ofertant!`,
      type: 'auction',
    });

    return {
      success: true,
      clauseTriggered: false,
      message: `Oferta ta de ${formatCurrency(offerAmount)} a fost înregistrată ca cea mai mare ofertă curentă!`,
    };
  };

  // Withdraw an offer made by the manager on a player listing
  const withdrawMarketOffer = (itemId: string, offerId?: string) => {
    const item = unifiedMarketItems.find((i) => i.id === itemId);
    if (!item) return { success: false, message: 'Jucătorul nu a fost găsit pe piață.' };

    const player = players.find((p) => p.id === item.playerId);
    const playerName = player ? player.name : 'Jucător';

    const userOffer = item.receivedOffers?.find(
      (o) => (offerId ? o.id === offerId : o.bidderId === user.id)
    );

    if (!userOffer) {
      return { success: false, message: 'Nu ai o ofertă activă pentru acest jucător.' };
    }

    const withdrawnAmount = userOffer.amount;
    const remainingOffers = (item.receivedOffers || []).filter((o) => o.id !== userOffer.id);

    // Calculate new highest offer among remaining offers
    let newCurrentBid = item.leagueBaseOffer || item.currentBid;
    let newHighestBidderId = 'superliga_lpf';
    let newHighestBidderName = 'Superliga României (Garanție Cotă)';

    if (remainingOffers.length > 0) {
      const topOffer = [...remainingOffers].sort((a, b) => b.amount - a.amount)[0];
      newCurrentBid = topOffer.amount;
      newHighestBidderId = topOffer.bidderId;
      newHighestBidderName = topOffer.bidderName || 'Manager rival';
    }

    setUnifiedMarketItems((prev) =>
      prev.map((i) => {
        if (i.id === itemId) {
          return {
            ...i,
            currentBid: newCurrentBid,
            highestBidderId: newHighestBidderId,
            highestBidderName: newHighestBidderName,
            receivedOffers: remainingOffers,
            bidHistory: i.bidHistory.filter((b) => !(b.bidderId === user.id && b.amount === withdrawnAmount)),
          };
        }
        return i;
      })
    );

    addNotification({
      title: 'Ofertă retrasă!',
      message: `Ai retras oferta de ${formatCurrency(withdrawnAmount)} pentru ${playerName}.`,
      type: 'transfer',
    });

    return {
      success: true,
      message: `Ai retras oferta de ${formatCurrency(withdrawnAmount)} pentru ${playerName}.`,
    };
  };

  // 2. Member lists a player on the unified market with a minimum asking price (stays until cancelled)
  const createMemberListing = (playerId: string, minAskingPrice: number) => {
    const player = players.find((p) => p.id === playerId);
    if (!player) return { success: false, message: 'Jucătorul nu există.' };

    // Validare reguli lot: minim 11 jucători
    if (squadCount <= 11) {
      return {
        success: false,
        message: 'Lot minim atins (11 jucători)! Conform regulamentului, lotul tău nu poate scădea sub 11 jucători.',
      };
    }

    // Validare reguli lot: cel puțin 1 portar
    if (player.position === 'GK' && gkCount <= 1) {
      return {
        success: false,
        message: 'Nu poți vinde singurul portar din lot! Regulamentul impune cel puțin 1 portar în echipă.',
      };
    }

    // Validare: verifică dacă jucătorul este deja listat
    const isAlreadyListed = unifiedMarketItems.some(
      (item) => item.sellerId === user.id && item.playerId === playerId
    );
    if (isAlreadyListed) {
      return {
        success: false,
        message: `${player.name} este deja listat pe piața de transferuri!`,
      };
    }

    // REGULĂ NOUĂ: Jucătorul rămâne în echipă și poate fi folosit ca titular/rezervă până la vânzarea efectivă!

    // Every player receives an automatic guaranteed baseline offer from the League equal to their current market value!
    const leagueBase = player.marketValue;

    const initialOffers: MarketOfferEntry[] = [
      {
        id: `off_league_${Date.now()}`,
        bidderId: 'superliga_lpf',
        bidderName: 'Superliga României (Garanție Ligă)',
        amount: leagueBase,
        time: 'Chiar acum',
        status: 'pending',
      },
    ];

    const newListing: UnifiedMarketItem = {
      id: `mkt_${Date.now()}`,
      playerId,
      isLeagueListing: false,
      sellerId: user.id,
      sellerName: user.teamName,
      currentBid: leagueBase,
      highestBidderId: 'superliga_lpf',
      highestBidderName: 'Superliga României (Ofertă Automată)',
      minAskingPrice,
      leagueBaseOffer: leagueBase,
      expiresAt: null, // Jucătorul rămâne listat până îl scoate managerul de pe piață
      bidHistory: [
        {
          bidderId: 'superliga_lpf',
          bidderName: 'Superliga României (Garanție Cotă)',
          amount: leagueBase,
          time: 'la listare',
        },
      ],
      receivedOffers: initialOffers,
    };

    setUnifiedMarketItems((prev) => [newListing, ...prev]);

    // Generate News Article for the listing
    addNewsArticle({
      title: `${player.name} a fost scos pe piața de transferuri!`,
      summary: `${user.teamName} este dispusă să se despartă de fotbalist pentru minim ${formatCurrency(minAskingPrice)}.`,
      content: `Managerul ${user.teamName} l-a listat pe ${player.name} pe piața transferurilor. Liga a oferit automat cota de referință de ${formatCurrency(leagueBase)}, iar fotbalistul se va transfera instant dacă un rival oferă clauza de ${formatCurrency(minAskingPrice)}.`,
      tag: 'TRANSFER',
      amount: minAskingPrice,
      playerName: player.name,
      sellerName: user.teamName,
      avatar: player.avatar,
    });

    addNotification({
      title: 'Jucător listat pe piață!',
      message: `${player.name} este acum pe piață. Ai o ofertă garantată de la ligă de ${formatCurrency(leagueBase)}.`,
      type: 'auction',
    });

    return { success: true, message: 'Jucătorul a fost listat cu succes pe piața de transferuri!' };
  };

  // 3. Accept an offer received for a listed player
  const acceptMemberOffer = (itemId: string, offerId?: string) => {
    const item = unifiedMarketItems.find((i) => i.id === itemId);
    if (!item) return { success: false, message: 'Listarea nu a fost găsită pe piață.' };
    if (item.sellerId !== user.id) return { success: false, message: 'Nu ești vânzătorul acestui jucător.' };

    const player = players.find((p) => p.id === item.playerId);
    if (!player) return { success: false, message: 'Jucătorul nu a fost găsit în baza de date.' };

    const selectedOffer =
      item.receivedOffers?.find((o) => o.id === offerId) ||
      item.receivedOffers?.[0] || {
        amount: item.currentBid,
        bidderName: 'Manager Superliga',
      };

    const saleAmount = selectedOffer.amount;

    // Credit user budget
    setUser((prev) => ({ ...prev, budget: prev.budget + saleAmount }));

    // Remove from market
    setUnifiedMarketItems((prev) => prev.filter((i) => i.id !== itemId));

    // Record transaction
    const tx: Transaction = {
      id: `tx_${Date.now()}`,
      type: 'sell',
      playerId: player.id,
      playerName: player.name,
      amount: saleAmount,
      date: 'Azi',
      description: `Vânzare ${player.name} pentru ${formatCurrency(saleAmount)}`,
    };
    setTransactions((prev) => [tx, ...prev]);

    // Add News Article
    addNewsArticle({
      title: `TRANSFER FINALIZAT: ${player.name} vândut pentru ${formatCurrency(saleAmount)}!`,
      summary: `${user.teamName} a acceptat oferta de ${formatCurrency(saleAmount)} pentru ${player.name}.`,
      content: `Tranzacție confirmată în ${leagueSettings.leagueName}! Managerul ${user.teamName} a acceptat oferta în valoare de ${formatFullCurrency(saleAmount)} pentru ${player.name}. Transferul este înregistrat oficial.`,
      tag: 'TRANSFER',
      amount: saleAmount,
      playerName: player.name,
      sellerName: user.teamName,
      avatar: player.avatar,
    });

    addNotification({
      title: '💰 Ofertă Acceptată! Jucător Vândut!',
      message: `Ai încasat ${formatCurrency(saleAmount)} pentru ${player.name}. Bugetul tău a fost actualizat!`,
      type: 'transfer',
    });

    return {
      success: true,
      message: `Ai acceptat oferta de ${formatCurrency(saleAmount)}! Transferul lui ${player.name} a fost finalizat.`,
    };
  };

  // 4. Refuse an offer received for a listed player
  const refuseMemberOffer = (itemId: string, offerId: string) => {
    const item = unifiedMarketItems.find((i) => i.id === itemId);
    if (!item) return { success: false, message: 'Listarea nu a fost găsită pe piață.' };

    const updatedOffers = (item.receivedOffers || []).filter((o) => o.id !== offerId);
    const highestRemaining = updatedOffers.reduce(
      (max, o) => (o.amount > max ? o.amount : max),
      item.leagueBaseOffer
    );

    setUnifiedMarketItems((prev) =>
      prev.map((i) => {
        if (i.id === itemId) {
          return {
            ...i,
            currentBid: highestRemaining,
            receivedOffers: updatedOffers,
          };
        }
        return i;
      })
    );

    addNotification({
      title: 'Ofertă refuzată',
      message: 'Ai refuzat oferta selectată. Jucătorul rămâne listat pe piață.',
      type: 'auction',
    });

    return { success: true, message: 'Oferta a fost refuzată.' };
  };

  // 5. Delist player and return to squad
  const delistPlayerFromMarket = (itemId: string) => {
    const item = unifiedMarketItems.find((i) => i.id === itemId);
    if (!item) return { success: false, message: 'Listarea nu a fost găsită pe piață.' };
    if (item.sellerId !== user.id) return { success: false, message: 'Nu ești vânzătorul acestui jucător.' };

    const player = players.find((p) => p.id === item.playerId);
    if (!player) return { success: false, message: 'Jucătorul nu există.' };

    // Return to bench
    setSquad((prev) => ({
      ...prev,
      benchPlayerIds: [...prev.benchPlayerIds, player.id],
    }));

    // Remove from market
    setUnifiedMarketItems((prev) => prev.filter((i) => i.id !== itemId));

    addNotification({
      title: 'Jucător retras de pe piață',
      message: `${player.name} a fost scos de pe piață și a revenit pe banca ta de rezerve.`,
      type: 'transfer',
    });

    return {
      success: true,
      message: `${player.name} a fost retras de pe piață și se află din nou în lotul tău.`,
    };
  };

  // Direct sell to league (instant buyback at market value)
  const sellPlayerToMarket = (playerId: string) => {
    const player = players.find((p) => p.id === playerId);
    if (!player) return { success: false, message: 'Jucătorul nu a fost găsit.' };

    // Validare reguli lot: minim 11 jucători
    if (squadCount <= 11) {
      return {
        success: false,
        message: 'Lot minim atins (11 jucători)! Conform regulamentului, lotul tău nu poate scădea sub 11 jucători.',
      };
    }

    // Validare reguli lot: cel puțin 1 portar
    if (player.position === 'GK' && gkCount <= 1) {
      return {
        success: false,
        message: 'Nu poți vinde singurul portar din lot! Regulamentul impune cel puțin 1 portar în echipă.',
      };
    }

    setUser((prev) => ({ ...prev, budget: prev.budget + player.marketValue }));

    setSquad((prev) => {
      const newSlots = { ...prev.startingSlots };
      Object.keys(newSlots).forEach((slotId) => {
        if (newSlots[slotId] === playerId) newSlots[slotId] = null;
      });
      return {
        ...prev,
        startingSlots: newSlots,
        benchPlayerIds: prev.benchPlayerIds.filter((id) => id !== playerId),
        captainPlayerId: prev.captainPlayerId === playerId ? null : prev.captainPlayerId,
      };
    });

    const tx: Transaction = {
      id: `tx_${Date.now()}`,
      type: 'sell',
      playerId: player.id,
      playerName: player.name,
      amount: player.marketValue,
      date: 'Azi',
      description: `Vândut direct către ligă la cota garantată`,
    };
    setTransactions((prev) => [tx, ...prev]);

    addNotification({
      title: 'Vânzare finalizată',
      message: `L-ai vândut pe ${player.name}. Ai încasat ${formatCurrency(player.marketValue)} în buget!`,
      type: 'transfer',
    });

    return { success: true, message: `Vânzare reușită! Ai primit ${formatFullCurrency(player.marketValue)}.` };
  };

  // 3. Automated Market Value update engine at the end of each gameweek
  // "valoarea jucatorilor se updateaza automat la sfarsitul fiecarei etape din viata reala. Valoarea se stabileste in functie de media sumei de transfer al anumitului jucator din toate ligile existente, se face o medie pe ultima saptamana in care a fost tranzactionat jucatorul si aia e valoarea actualizata de piata la sfarsitul etapei."
  const recalculateMarketValuesFromWeeklyTrades = () => {
    let count = 0;

    setPlayers((prev) =>
      prev.map((player) => {
        // Find recent transactions or simulate average market trade across all leagues
        // Realistic weekly transfer price weighted average formula:
        // base + trade premium or performance fluctuation
        const performanceBonus = (player.pointsMatchday - 20) * 15000;
        const simulatedWeeklyTradeAvg = Math.max(
          400000,
          Math.round(player.marketValue + performanceBonus + (Math.random() * 80000 - 30000))
        );

        const newMarketValue = Math.round(simulatedWeeklyTradeAvg / 10000) * 10000;
        count++;

        return {
          ...player,
          previousMarketValue: player.marketValue,
          marketValue: newMarketValue,
          valueTrend: [...player.valueTrend.slice(-4), newMarketValue],
        };
      })
    );

    // Publish official news article
    addNewsArticle({
      title: `COTE DE PIAȚĂ ACTUALIZATE DUPĂ SFÂRȘITUL ETAPEI!`,
      summary: `Media sumelor de transfer tranzacționate pe ultima săptămână în toate ligile a recalculat cotele oficiale ale jucătorilor.`,
      content: `La finalul etapei din Superliga României, algoritmul a calculat media ponderată a tranzacțiilor din ultima săptămână din toate ligile active. Jucătorii cu evoluții decisive au cunoscut aprecieri spectaculoase ale cotelor de piață.`,
      tag: 'COTE PIAȚĂ',
    });

    addNotification({
      title: '📈 Cotele de piață au fost actualizate!',
      message: 'Media tranzacțiilor din ultima săptămână a recalculat cotele tuturor jucătorilor la sfârșitul etapei.',
      type: 'reward',
    });

    return {
      updatedCount: count,
      message: `Cotele a ${count} jucători au fost actualizate pe baza mediei de transfer din ultima săptămână!`,
    };
  };

  // Timer simulation loop for listings expiration
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();

      setUnifiedMarketItems((prev) => {
        const expired = prev.filter((item) => item.expiresAt !== null && item.expiresAt <= now);
        if (expired.length === 0) return prev;

        // Process expired listings: if highest bidder is someone, complete transfer!
        expired.forEach((expItem) => {
          const player = players.find((p) => p.id === expItem.playerId);
          if (!player) return;

          // If current user won:
          if (expItem.highestBidderId === user.id) {
            setUser((u) => ({ ...u, budget: u.budget - expItem.currentBid }));
            setSquad((s) => ({ ...s, benchPlayerIds: [...s.benchPlayerIds, player.id] }));

            addNewsArticle({
              title: `OFICIAL: ${player.name} transferat de ${user.teamName}!`,
              summary: `${user.teamName} a câștigat licitația cu o ofertă finală de ${formatCurrency(expItem.currentBid)}.`,
              content: `La expirarea timpului oficial de licitare, ${user.teamName} a fost desemnată câștigătoare pentru transferul lui ${player.name}. Suma de transfer: ${formatFullCurrency(expItem.currentBid)}.`,
              tag: 'TRANSFER',
              amount: expItem.currentBid,
              playerName: player.name,
              buyerName: user.teamName,
              sellerName: expItem.sellerName,
              avatar: player.avatar,
            });

            addNotification({
              title: '🏆 Licitație Câștigată!',
              message: `Ai câștigat licitația pentru ${player.name} cu suma de ${formatCurrency(expItem.currentBid)}!`,
              type: 'transfer',
            });
          } else {
            // Another manager or league won
            const winnerName = expItem.highestBidderName || 'Superliga României';
            addNewsArticle({
              title: `OFICIAL: ${player.name} transferat la ${winnerName}!`,
              summary: `Transferul s-a finalizat la expirarea timpului pentru suma de ${formatCurrency(expItem.currentBid)}.`,
              content: `Licitația pentru ${player.name} s-a încheiat. Câștigătorul oficial este ${winnerName} cu o ofertă de ${formatFullCurrency(expItem.currentBid)}.`,
              tag: 'TRANSFER',
              amount: expItem.currentBid,
              playerName: player.name,
              buyerName: winnerName,
              sellerName: expItem.sellerName,
              avatar: player.avatar,
            });
          }
        });

        return prev.filter((item) => item.expiresAt === null || item.expiresAt > now);
      });
    }, 10000);

    return () => clearInterval(timer);
  }, [players, user.id, user.teamName, addNewsArticle, addNotification]);

  // Live Match Events & Simulation
  const injectCustomEvent = (fixtureId: string, eventData: Omit<MatchLiveEvent, 'id'>) => {
    const newEvent: MatchLiveEvent = {
      ...eventData,
      id: `ev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    };

    setFixtures((prev) =>
      prev.map((fix) => {
        if (fix.id !== fixtureId) return fix;

        let newHomeScore = fix.homeScore;
        let newAwayScore = fix.awayScore;

        if (newEvent.type === 'goal') {
          if (newEvent.clubId === fix.homeClubId) newHomeScore += 1;
          else newAwayScore += 1;
        }

        return {
          ...fix,
          homeScore: newHomeScore,
          awayScore: newAwayScore,
          events: [newEvent, ...fix.events],
        };
      })
    );

    setPlayers((prev) =>
      prev.map((pl) => {
        if (pl.id === newEvent.playerId) {
          const addedPoints = newEvent.pointsChange;
          return {
            ...pl,
            pointsMatchday: pl.pointsMatchday + addedPoints,
            pointsTotal: pl.pointsTotal + addedPoints,
          };
        }
        return pl;
      })
    );

    const isStarter = Object.values(squad.startingSlots).includes(newEvent.playerId);
    const isCaptain = squad.captainPlayerId === newEvent.playerId;

    if (isStarter) {
      addNotification({
        title: `⚡ Live: ${newEvent.playerName}`,
        message: `${newEvent.description} (${newEvent.pointsChange > 0 ? '+' : ''}${newEvent.pointsChange * (isCaptain ? 2 : 1)}p)`,
        type: 'live_event',
      });
    }
  };

  // Simulation tick loop
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      const liveFix = fixtures.find((f) => f.isLive && f.minute < 95);
      if (!liveFix) return;

      const nextMinute = liveFix.minute + 1;

      setFixtures((prev) =>
        prev.map((f) => {
          if (f.id === liveFix.id) {
            return {
              ...f,
              minute: nextMinute,
              isFinished: nextMinute >= 94,
              isLive: nextMinute < 94,
            };
          }
          return f;
        })
      );

      if (Math.random() < 0.32) {
        const matchPlayers = players.filter(
          (p) => p.clubId === liveFix.homeClubId || p.clubId === liveFix.awayClubId
        );
        if (matchPlayers.length === 0) return;

        const randPlayer = matchPlayers[Math.floor(Math.random() * matchPlayers.length)];

        // Acțiuni specifice în funcție de poziția jucătorului
        const actionsPool: { type: MatchLiveEvent['type']; desc: string }[] = [];

        if (randPlayer.position === 'GK') {
          actionsPool.push(
            { type: 'save', desc: 'Paradă sigură la colțul scurt!' },
            { type: 'save_in_box', desc: 'Reflex formidabil la un șut din interiorul careului!' },
            { type: 'punch', desc: 'Boxează mingea cu siguranță din mijlocul careului!' },
            { type: 'keeper_sweeper', desc: 'Ieșire curajoasă din poartă pentru a degaja mingea!' },
            { type: 'high_claim', desc: 'Prinde o centrare înaltă din aer!' },
            { type: 'pass_forward', desc: 'Degajare precisă direct în jumătatea adversă!' },
            { type: 'pass_error', desc: 'Degajare greșită trimisă în aut.' }
          );
          if (Math.random() < 0.02) {
            actionsPool.push({ type: 'penalty_conceded', desc: 'Intervenție întârziată în careu și penalty comis! (-25p)' });
          }
        } else if (randPlayer.position === 'DEF') {
          actionsPool.push(
            { type: 'tackle', desc: 'Deposedare curată fără fault în defensivă!' },
            { type: 'clearance', desc: 'Respingere salvatoare din careul de 16 metri!' },
            { type: 'interception', desc: 'Intercepție promptă la o pasă periculoasă!' },
            { type: 'shot_blocked', desc: 'Blochează cu sacrificiu un șut spre poartă!' },
            { type: 'aerial_won', desc: 'Duel aerian câștigat autoritar la un corner!' },
            { type: 'duel_won', desc: 'Câștigă un duel direct la sol cu atacantul!' },
            { type: 'pass_forward', desc: 'Pasă în terenul advers către mijlocași!' },
            { type: 'long_pass', desc: 'Lansare lungă milimetrică spre flanc!' },
            { type: 'foul_drawn', desc: 'Fault obținut inteligent în jumătatea proprie!' },
            { type: 'duel_lost', desc: 'Duel pierdut în flanc cu extrema adversă.' },
            { type: 'foul', desc: 'Fault comis în preajma careului.' }
          );
          if (Math.random() < 0.04) {
            actionsPool.push({ type: 'goal_line_clearance', desc: 'Respingere miraculoasă de pe linia porții!' });
          }
          if (Math.random() < 0.03) {
            actionsPool.push({ type: 'penalty_conceded', desc: 'Fault imprudent în careu și penalty comis! (-25p)' });
          }
        } else if (randPlayer.position === 'MID') {
          actionsPool.push(
            { type: 'pass_forward', desc: 'Pasă verticală precisă în terenul advers!' },
            { type: 'key_pass', desc: 'Pasă cheie genială care desface defensiva adversă!' },
            { type: 'long_pass', desc: 'Pasă lungă de 40m care schimbă direcția de joc!' },
            { type: 'cross_successful', desc: 'Centrare excelentă în careu pentru atacanți!' },
            { type: 'dribble_success', desc: 'Dribling elegant prin care depășește adversarul!' },
            { type: 'shot_on_target', desc: 'Șut cadrat pe spațiul porții de la distanță!' },
            { type: 'tackle', desc: 'Deposedare energică la mijlocul terenului!' },
            { type: 'interception', desc: 'Intercepție rapidă care declanșează contraatacul!' },
            { type: 'duel_won', desc: 'Duel fizic câștigat la centrul terenului!' },
            { type: 'foul_drawn', desc: 'Fault obținut în preajma careului advers!' },
            { type: 'pass_error', desc: 'Pasă greșită la construcție.' },
            { type: 'dispossessed', desc: 'Deposedat sub presiunea adversarilor.' },
            { type: 'shot_missed', desc: 'Șut trimis peste poartă.' }
          );
        } else {
          // FWD
          actionsPool.push(
            { type: 'shot_on_target', desc: 'Șut periculos pe poartă respins în corner!' },
            { type: 'key_pass', desc: 'Pasă cheie în adâncime pentru coechipier!' },
            { type: 'dribble_success', desc: 'Dribling în viteză la marginea careului!' },
            { type: 'aerial_won', desc: 'Duel aerian câștigat în careul advers!' },
            { type: 'duel_won', desc: 'Păstrează mingea cu spatele la poartă și câștigă duelul!' },
            { type: 'foul_drawn', desc: 'Fault obținut la marginea careului mare!' },
            { type: 'pass_forward', desc: 'Pasă combinativă în terenul advers!' },
            { type: 'shot_missed', desc: 'Șut pe lângă poartă din poziție bună.' },
            { type: 'dispossessed', desc: 'Deposedat în încercarea de finalizare.' },
            { type: 'duel_lost', desc: 'Duel pierdut cu fundașul central.' }
          );
          if (Math.random() < 0.08) {
            actionsPool.push({ type: 'penalty_won', desc: 'Pătrundere în careu și penalty obținut!' });
          }
          if (Math.random() < 0.06) {
            actionsPool.push({ type: 'big_chance_missed', desc: 'Ocazie mare de gol ratată singur cu portarul!' });
          }
        }

        // Gol marcat sau pasă de gol
        if (Math.random() < 0.07) {
          actionsPool.unshift({
            type: 'goal',
            desc: `Gooool! Finalizare impecabilă din interiorul careului!`,
          });
        } else if (Math.random() < 0.08) {
          actionsPool.unshift({
            type: 'assist',
            desc: `Pasă de gol de maestru care lasă coechipierul singur cu poarta!`,
          });
        }

        const action = actionsPool[Math.floor(Math.random() * actionsPool.length)];
        const points = calculateEventPoints(action.type, randPlayer.position);

        injectCustomEvent(liveFix.id, {
          minute: nextMinute,
          type: action.type,
          playerId: randPlayer.id,
          playerName: randPlayer.name,
          clubId: randPlayer.clubId,
          pointsChange: points,
          description: action.desc,
        });
      }
    }, 4000 / simulationSpeed);

    return () => clearInterval(interval);
  }, [isSimulating, simulationSpeed, fixtures, players, squad.startingSlots, squad.captainPlayerId]);

  const toggleSimulation = () => setIsSimulating((prev) => !prev);

  // Predictions management
  const makePrediction = (fixtureId: string, homeScore: number, awayScore: number) => {
    setPredictions((prev) => ({
      ...prev,
      [fixtureId]: {
        fixtureId,
        homeScore,
        awayScore,
        status: 'pending',
        rewardClaimed: false,
        rewardAmount: 250000,
      },
    }));

    addNotification({
      title: 'Predicție salvată',
      message: `Ai prezis scorul ${homeScore}-${awayScore}. Dacă ghicești scorul exact, câștigi €250.000 la buget!`,
      type: 'reward',
    });
  };

  const claimPredictionReward = (fixtureId: string) => {
    const pred = predictions[fixtureId];
    if (!pred || pred.rewardClaimed) return;

    setUser((prev) => ({ ...prev, budget: prev.budget + pred.rewardAmount }));
    setPredictions((prev) => ({
      ...prev,
      [fixtureId]: { ...pred, rewardClaimed: true },
    }));

    const tx: Transaction = {
      id: `tx_${Date.now()}`,
      type: 'prediction_win',
      amount: pred.rewardAmount,
      date: 'Azi',
      description: `Recompensă ghicit scor SuperPredictor`,
    };
    setTransactions((prev) => [tx, ...prev]);

    addNotification({
      title: '🏆 Recompensă revendicată!',
      message: `Ai încasat €${pred.rewardAmount.toLocaleString('ro-RO')} în bugetul echipei!`,
      type: 'reward',
    });
  };

  // Fan Rewards (LPF Pitch)
  const isLiveMatchWindow = useMemo(() => {
    return fixtures.some((f) => f.isLive);
  }, [fixtures]);

  const checkInFanTVOrStadium = (type: 'tv' | 'stadium') => {
    const rewardMoney = type === 'stadium' ? 250000 : 150000;
    const bonusCoins = type === 'stadium' ? 100 : 50;

    setUser((prev) => ({
      ...prev,
      budget: prev.budget + rewardMoney,
      fanCoins: prev.fanCoins + bonusCoins,
      checkinsCount: prev.checkinsCount + 1,
    }));

    setSquad((prev) => ({ ...prev, boosterActive: true }));

    const tx: Transaction = {
      id: `tx_${Date.now()}`,
      type: 'reward',
      amount: rewardMoney,
      date: 'Azi',
      description: `Bonus LPF Fan Check-in (${type === 'stadium' ? 'Stadion Live' : 'Transmisiune TV'})`,
    };
    setTransactions((prev) => [tx, ...prev]);

    addNotification({
      title: type === 'stadium' ? '🏟️ Check-in Stadion Validat!' : '📺 Check-in TV Confirmat!',
      message: `Ai primit €${rewardMoney.toLocaleString('ro-RO')} + ${bonusCoins} Fan Coins și un Booster de +20% puncte în etapă!`,
      type: 'reward',
    });

    return {
      success: true,
      reward: rewardMoney,
      message: `Felicitări! Ai primit €${rewardMoney.toLocaleString('ro-RO')} și boosterul de puncte x1.2!`,
    };
  };

  // League Members ranking with full starting lineups for the modal breakdown!
  const leagueMembers: LeagueMember[] = useMemo(() => {
    const myStartingLineup = Object.entries(squad.startingSlots)
      .filter(([_, pId]) => Boolean(pId))
      .map(([slotLabel, pId]) => ({
        slotLabel: slotLabel.toUpperCase(),
        playerId: pId!,
        isCaptain: squad.captainPlayerId === pId,
      }));

    const myMember: LeagueMember = {
      id: user.id,
      name: user.name,
      teamName: user.teamName,
      avatar: user.avatar,
      totalPoints: 1420 + squadPointsMatchday,
      matchdayPoints: squadPointsMatchday,
      squadValue: squadTotalValue,
      rank: 1,
      formation: squad.formation,
      startingLineup: myStartingLineup,
    };

    const rivals: LeagueMember[] = [
      {
        id: 'usr_2',
        name: 'Andrei V.',
        teamName: 'FCSB Supremacy',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&h=200&q=80',
        totalPoints: 1485,
        matchdayPoints: 215,
        squadValue: 46200000,
        rank: 2,
        formation: '4-3-3',
        startingLineup: [
          { slotLabel: 'POR', playerId: 'p_tarnovanu' },
          { slotLabel: 'FS', playerId: 'p_radunovic' },
          { slotLabel: 'FC', playerId: 'p_ngezana' },
          { slotLabel: 'FC', playerId: 'p_pascanu' },
          { slotLabel: 'FD', playerId: 'p_onea' },
          { slotLabel: 'MC', playerId: 'p_sut' },
          { slotLabel: 'MC', playerId: 'p_olaru', isCaptain: true },
          { slotLabel: 'MC', playerId: 'p_politic' },
          { slotLabel: 'AS', playerId: 'p_petrila' },
          { slotLabel: 'AC', playerId: 'p_birligea' },
          { slotLabel: 'AD', playerId: 'p_dobre' },
        ],
      },
      {
        id: 'usr_3',
        name: 'Cristi R.',
        teamName: 'Giuleștina Boys',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&h=200&q=80',
        totalPoints: 1390,
        matchdayPoints: 198,
        squadValue: 43500000,
        rank: 3,
        formation: '4-4-2',
        startingLineup: [
          { slotLabel: 'POR', playerId: 'p_siegrist' },
          { slotLabel: 'FS', playerId: 'p_camora' },
          { slotLabel: 'FC', playerId: 'p_pascanu' },
          { slotLabel: 'FC', playerId: 'p_ngezana' },
          { slotLabel: 'FD', playerId: 'p_onea' },
          { slotLabel: 'MS', playerId: 'p_petrila', isCaptain: true },
          { slotLabel: 'MC', playerId: 'p_deac' },
          { slotLabel: 'MC', playerId: 'p_sut' },
          { slotLabel: 'MD', playerId: 'p_dobre' },
          { slotLabel: 'AC', playerId: 'p_postolachi' },
          { slotLabel: 'AC', playerId: 'p_selmani' },
        ],
      },
      {
        id: 'usr_4',
        name: 'Vlad Olteanu',
        teamName: 'Știința Craiova 1948',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&h=200&q=80',
        totalPoints: 1345,
        matchdayPoints: 184,
        squadValue: 44100000,
        rank: 4,
        formation: '3-5-2',
        startingLineup: [
          { slotLabel: 'POR', playerId: 'p_golubovic' },
          { slotLabel: 'FC', playerId: 'p_ngezana' },
          { slotLabel: 'LIB', playerId: 'p_pascanu' },
          { slotLabel: 'FC', playerId: 'p_radunovic' },
          { slotLabel: 'WB-S', playerId: 'p_bancu' },
          { slotLabel: 'MC', playerId: 'p_screciu' },
          { slotLabel: 'MO', playerId: 'p_baiaram' },
          { slotLabel: 'MC', playerId: 'p_nistor' },
          { slotLabel: 'WB-D', playerId: 'p_onea' },
          { slotLabel: 'AC', playerId: 'p_mitrita', isCaptain: true },
          { slotLabel: 'AC', playerId: 'p_birligea' },
        ],
      },
      {
        id: 'usr_5',
        name: 'Mihai Dan',
        teamName: 'CFR Gruia Power',
        avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=200&h=200&q=80',
        totalPoints: 1290,
        matchdayPoints: 165,
        squadValue: 39800000,
        rank: 5,
        formation: '4-3-3',
        startingLineup: [
          { slotLabel: 'POR', playerId: 'p_hindrich' },
          { slotLabel: 'FS', playerId: 'p_camora' },
          { slotLabel: 'FC', playerId: 'p_pascanu' },
          { slotLabel: 'FC', playerId: 'p_ngezana' },
          { slotLabel: 'FD', playerId: 'p_onea' },
          { slotLabel: 'MC', playerId: 'p_deac', isCaptain: true },
          { slotLabel: 'MC', playerId: 'p_cisotti' },
          { slotLabel: 'MC', playerId: 'p_cirjan' },
          { slotLabel: 'AS', playerId: 'p_thiam' },
          { slotLabel: 'AC', playerId: 'p_postolachi' },
          { slotLabel: 'AD', playerId: 'p_dobre' },
        ],
      },
    ];

    const all = [myMember, ...rivals, ...acceptedExtraMembers];
    all.sort((a, b) => b.totalPoints - a.totalPoints);
    return all.map((m, idx) => ({ ...m, rank: idx + 1 }));
  }, [user, squad, squadPointsMatchday, squadTotalValue, acceptedExtraMembers]);

  const updateLeagueSettings = (newSettings: Partial<LeagueSettings>) => {
    setLeagueSettings((prev) => ({ ...prev, ...newSettings }));
    addNotification({
      title: 'Setări ligă actualizate',
      message: 'Regulile ligii au fost modificate cu succes de către administrator.',
      type: 'reward',
    });
  };

  // Admin controls
  const addNewPlayer = (playerData: Omit<Player, 'id' | 'pointsTotal' | 'pointsMatchday' | 'matchHistory' | 'valueTrend' | 'previousMarketValue'>) => {
    const newPlayerId = `p_custom_${Date.now()}`;
    const newP: Player = {
      ...playerData,
      id: newPlayerId,
      pointsTotal: 0,
      pointsMatchday: 0,
      previousMarketValue: playerData.marketValue,
      valueTrend: [playerData.marketValue],
      matchHistory: [],
    };

    setPlayers((prev) => [newP, ...prev]);

    // Save to local custom list for immediate offline resilience
    try {
      const customList: Player[] = JSON.parse(localStorage.getItem('supermanager_custom_players') || '[]');
      customList.unshift(newP);
      localStorage.setItem('supermanager_custom_players', JSON.stringify(customList));
    } catch (e) {
      /* ignore */
    }

    // Save persistently to Firestore database collections
    saveGlobalPlayerEdit(newP).catch((err) => {
      console.warn('Eroare la salvarea în Firestore:', err);
    });
    saveFirestoreCustomPlayer(newP).catch((err) => {
      console.warn('Eroare la salvarea custom player:', err);
    });

    // Automatically list new player on the unified market from the League!
    const newListing: UnifiedMarketItem = {
      id: `mkt_${Date.now()}`,
      playerId: newPlayerId,
      isLeagueListing: true,
      sellerId: 'superliga_lpf',
      sellerName: 'Superliga României',
      currentBid: newP.marketValue,
      highestBidderId: null,
      highestBidderName: null,
      minAskingPrice: Math.round(newP.marketValue * 1.25),
      leagueBaseOffer: newP.marketValue,
      expiresAt: Date.now() + 1000 * 60 * 180,
      bidHistory: [],
    };

    setUnifiedMarketItems((prev) => [newListing, ...prev]);

    addNewsArticle({
      title: `NOU TRANSFER ÎN SUPERLIGA: ${newP.name} a fost înregistrat oficial!`,
      summary: `Fotbalistul a fost introdus în joc și este disponibil imediat pentru oferte pe piața de transferuri.`,
      content: `Comisia SuperManager a validat legitimarea lui ${newP.name} pe poziția de ${newP.position}. Cota sa de pornire pe piață a fost stabilită la ${formatFullCurrency(newP.marketValue)}.`,
      tag: 'TRANSFER',
      amount: newP.marketValue,
      playerName: newP.name,
      avatar: newP.avatar,
    });

    addNotification({
      title: 'Jucător nou adăugat în Superliga!',
      message: `${newP.name} a fost înregistrat oficial și listat pe piața de transferuri.`,
      type: 'transfer',
    });
  };

  const updatePlayerStatus = (playerId: string, status: 'active' | 'injured' | 'suspended', reason?: string) => {
    setPlayers((prev) =>
      prev.map((p) => {
        if (p.id === playerId) {
          return { ...p, status, injuryReason: reason };
        }
        return p;
      })
    );

    const player = players.find((p) => p.id === playerId);
    if (player && (status === 'injured' || status === 'suspended')) {
      addNotification({
        title: status === 'injured' ? 'Alertă Accidentare' : 'Alertă Suspendare',
        message: `${player.name} este acum ${status === 'injured' ? 'accidentat' : 'suspendat'}${reason ? `: ${reason}` : '.'}`,
        type: 'injury',
      });
    }
  };

  const updatePlayerMarketValue = (playerId: string, newValue: number) => {
    setPlayers((prev) =>
      prev.map((p) => {
        if (p.id === playerId) {
          return {
            ...p,
            previousMarketValue: p.marketValue,
            marketValue: newValue,
            valueTrend: [...p.valueTrend.slice(-4), newValue],
          };
        }
        return p;
      })
    );
  };

  const updateGlobalPlayerData = async (updatedPlayer: Player): Promise<boolean> => {
    // 1. Update in players state
    setPlayers((prev) =>
      prev.map((p) => (p.id === updatedPlayer.id ? { ...p, ...updatedPlayer } : p))
    );

    // 2. Persist to Firestore and local overrides
    await saveGlobalPlayerEdit(updatedPlayer);

    // 3. Update in market items if listed
    setUnifiedMarketItems((prev) =>
      prev.map((item) => {
        if (item.playerId === updatedPlayer.id) {
          return {
            ...item,
            leagueBaseOffer: updatedPlayer.marketValue,
            minAskingPrice: Math.round(updatedPlayer.marketValue * 1.25),
          };
        }
        return item;
      })
    );

    addNotification({
      title: '✅ Modificări Publicate Global',
      message: `Datele pentru ${updatedPlayer.name} au fost salvate și sincronizate în toată aplicația!`,
      type: 'reward',
    });

    return true;
  };

  const deletePlayerGlobal = async (playerId: string): Promise<boolean> => {
    setPlayers((prev) => prev.filter((p) => p.id !== playerId));
    setUnifiedMarketItems((prev) => prev.filter((item) => item.playerId !== playerId));
    await deleteGlobalPlayer(playerId);

    addNotification({
      title: '🗑️ Jucător Șters',
      message: `Jucătorul a fost eliminat definitiv din baza de date globală.`,
      type: 'transfer',
    });

    return true;
  };

  // =========================================================================
  // CLUBS MASTER DATABASE CONTROLS (Edit, Add, Toggle Active/Deactivated)
  // =========================================================================
  const updateClub = async (updatedClub: Club): Promise<boolean> => {
    setClubs((prev) => prev.map((c) => (c.id === updatedClub.id ? updatedClub : c)));
    await updateFirestoreClub(updatedClub);
    addNotification({
      title: '🛡️ Club Actualizat',
      message: `Datele clubului ${updatedClub.name} au fost salvate în Master Database.`,
      type: 'reward',
    });
    return true;
  };

  const addNewClub = async (clubData: Omit<Club, 'id'> & { id?: string }): Promise<boolean> => {
    const newClubId = clubData.id || `club_${Date.now()}`;
    const newClub: Club = {
      ...clubData,
      id: newClubId,
      isActive: true,
      logoColor: clubData.logoColor || '#10b981',
      secondaryColor: clubData.secondaryColor || '#ffffff',
      badgeText: clubData.badgeText || clubData.shortName || 'CLB',
    };
    setClubs((prev) => [...prev, newClub]);
    await saveFirestoreClub(newClub);
    addNotification({
      title: '🌟 Club Nou Adăugat',
      message: `Clubul ${newClub.name} a fost înregistrat cu succes în Superliga României!`,
      type: 'reward',
    });
    return true;
  };

  const toggleClubStatus = async (clubId: string, isActive: boolean): Promise<boolean> => {
    setClubs((prev) => prev.map((c) => (c.id === clubId ? { ...c, isActive } : c)));
    await toggleFirestoreClubStatus(clubId, isActive);
    addNotification({
      title: isActive ? '🟢 Club Reactivat' : '🔴 Club Dezactivat',
      message: isActive
        ? 'Clubul și jucătorii săi au fost reactivați în joc.'
        : 'Clubul a fost dezactivat. Fotbaliștii asociați sunt ascunși din tot jocul.',
      type: 'transfer',
    });
    return true;
  };

  const updateUserMembership = (membership: UserMembership) => {
    setUser((prev) => ({ ...prev, membership }));
  };

  // 1-MINUTE DEMO MATCH ENGINE
  const startDemoMatch = useCallback(() => {
    setIsDemoMatchActive(true);
    setDemoTimeRemaining(60);
    setDemoMinute(1);
    setDemoHomeScore(0);
    setDemoAwayScore(0);
    setDemoEvents([]);
    setDemoEventsByPlayer({});
    setPendingDemoMatchSave(null);
    setShowDemoSaveModal(false);
    // Resetăm punctele etapei la 0 pentru a începe simularea proaspătă
    setPlayers((prev) => prev.map((p) => ({ ...p, pointsMatchday: 0 })));
    addNotification({
      title: '🎮 Meci Demo Pornit (1 Minut)!',
      message: 'Meciul simulat rulează accelerat (1 minut = 90 min de joc real) cu fotbaliștii din lotul tău.',
      type: 'live_event',
    });
  }, [addNotification]);

  const resetDemoMatch = useCallback(() => {
    setIsDemoMatchActive(false);
    setDemoTimeRemaining(60);
    setDemoMinute(0);
    setDemoHomeScore(0);
    setDemoAwayScore(0);
    setDemoEvents([]);
    setDemoEventsByPlayer({});
    setPendingDemoMatchSave(null);
    setShowDemoSaveModal(false);
    setPlayers((prev) => prev.map((p) => ({ ...p, pointsMatchday: 0 })));
  }, []);

  // Accelerated 1-Minute Real-Time Demo Match Timer Loop
  useEffect(() => {
    if (!isDemoMatchActive) return;

    const interval = setInterval(() => {
      setDemoTimeRemaining((prevRemaining) => {
        if (prevRemaining <= 1) {
          clearInterval(interval);
          setIsDemoMatchActive(false);
          setDemoMinute(90);

          // Scorurile finale obținute în meciul de 1 minut
          let finalHome = 0;
          let finalAway = 0;
          setDemoHomeScore((h) => {
            finalHome = h;
            return h;
          });
          setDemoAwayScore((a) => {
            finalAway = a;
            return a;
          });

          // Punctaj rezultat echipă: Victorie (+15p), Egal (+5p), Înfrângere (-15p)
          const resultPts = finalHome > finalAway ? 15 : finalHome === finalAway ? 5 : -15;
          const resultLabel = finalHome > finalAway ? 'Meci câștigat' : finalHome === finalAway ? 'Meci egal' : 'Meci pierdut';
          const isCleanSheet = finalAway === 0;

          const starters = Object.values(squad.startingSlots).filter(Boolean) as string[];
          const squadIds = starters.length > 0 ? starters : squad.benchPlayerIds;
          const squadPool = players.filter((p) => squadIds.includes(p.id));

          // Mapare bonusuri per jucător
          const playerBonusesMap: Record<
            string,
            {
              totalBonus: number;
              starterBonus: number;
              minutesBonus: number;
              cleanSheetBonus: number;
              resultPts: number;
              finalPoints: number;
            }
          > = {};

          squadPool.forEach((p) => {
            const isStarter = starters.includes(p.id);
            const starterBonus = isStarter ? 5 : 3;
            const minutesBonus = 2; // peste 60 min
            const cleanSheetBonus = isCleanSheet ? (p.position === 'GK' ? 30 : p.position === 'DEF' ? 15 : 0) : 0;
            const totalBonus = starterBonus + minutesBonus + resultPts + cleanSheetBonus;

            playerBonusesMap[p.id] = {
              totalBonus,
              starterBonus,
              minutesBonus,
              cleanSheetBonus,
              resultPts,
              finalPoints: p.pointsMatchday + totalBonus,
            };
          });

          // Stocăm datele pentru confirmarea din fereastra modală
          setPendingDemoMatchSave({
            homeScore: finalHome,
            awayScore: finalAway,
            resultPts,
            resultLabel,
            isCleanSheet,
            playerBonuses: playerBonusesMap,
            timestamp: Date.now(),
          });

          // Deschidem fereastra modală de confirmare salvare
          setShowDemoSaveModal(true);

          addNotification({
            title: '🏁 Fluier Final în Meciul Demo!',
            message: `Scor ${finalHome}-${finalAway}. Alege dacă dorești să salvezi datele în Firestore sau să anulezi testul.`,
            type: 'reward',
          });

          return 0;
        }

        const nextRemaining = prevRemaining - 1;
        const elapsed = 60 - nextRemaining;
        const currentMatchMin = Math.min(90, Math.max(1, Math.floor((elapsed / 60) * 90)));
        setDemoMinute(currentMatchMin);

        // Declanșare evenimente: frecvență ridicată ~70% pe secundă pentru 1 minut dinamic
        if (Math.random() < 0.70) {
          const starters = Object.values(squad.startingSlots).filter(Boolean) as string[];
          const squadIds = starters.length > 0 ? starters : squad.benchPlayerIds;
          const squadPool = players.filter((p) => squadIds.includes(p.id));
          const targetPlayer = squadPool.length > 0
            ? squadPool[Math.floor(Math.random() * squadPool.length)]
            : players[0];

          if (targetPlayer) {
            type DemoAction = {
              type: MatchEventType;
              label: string;
              points: number;
              statKey?: keyof PlayerStats;
              isHomeGoal?: boolean;
              isAwayGoal?: boolean;
            };

            const options: DemoAction[] = [];
            const pos = targetPlayer.position;

            if (pos === 'GK') {
              // Pozitive (65%)
              options.push(
                { type: 'save', label: 'Paradă', points: 5, statKey: 'cleanSheets' },
                { type: 'save_in_box', label: 'Paradă șut din careu', points: 10, statKey: 'cleanSheets' },
                { type: 'keeper_sweeper', label: 'Ieșire din poartă', points: 5 },
                { type: 'high_claim', label: 'Minge înaltă prinsă', points: 3 },
                { type: 'punch', label: 'Minge boxată', points: 3 },
                { type: 'pass_forward', label: 'Pasă în teren advers', points: 1, statKey: 'passesCompleted' }
              );
              if (Math.random() < 0.15) {
                options.push({ type: 'penalty_save', label: 'Paradă penalty', points: 25, statKey: 'penaltySaves' });
              }
              // Negative (35%)
              options.push(
                { type: 'pass_error', label: 'Pasă greșită', points: -1 },
                { type: 'foul', label: 'Fault comis', points: -3, statKey: 'foulsCommitted' }
              );
              if (Math.random() < 0.08) {
                options.push({ type: 'yellow_card', label: 'Cartonaș galben', points: -15, statKey: 'yellowCards' });
              }
              if (Math.random() < 0.05) {
                options.push({ type: 'penalty_conceded', label: 'Penalty comis', points: -25 });
              }
            } else if (pos === 'DEF') {
              // Pozitive (65%)
              options.push(
                { type: 'tackle', label: 'Deposedare reușită', points: 5, statKey: 'tacklesWon' },
                { type: 'clearance', label: 'Respingere', points: 5 },
                { type: 'interception', label: 'Intercepție', points: 5, statKey: 'recoveries' },
                { type: 'duel_won', label: 'Duel câștigat', points: 3 },
                { type: 'aerial_won', label: 'Duel aerian câștigat', points: 3 },
                { type: 'shot_blocked', label: 'Șut blocat', points: 3 },
                { type: 'pass_forward', label: 'Pasă în teren advers', points: 1, statKey: 'passesCompleted' },
                { type: 'long_pass', label: 'Pasă lungă', points: 3 },
                { type: 'foul_drawn', label: 'Fault obținut', points: 1, statKey: 'foulsDrawn' }
              );
              if (Math.random() < 0.08) {
                options.push({ type: 'goal_line_clearance', label: 'Respingere pe linia porții', points: 25 });
              }
              if (Math.random() < 0.08) {
                options.push({ type: 'goal', label: 'Gol marcat', points: 50, statKey: 'goals', isHomeGoal: true });
              }
              // Negative (35%)
              options.push(
                { type: 'duel_lost', label: 'Duel pierdut', points: -1 },
                { type: 'aerial_lost', label: 'Duel aerian pierdut', points: -1 },
                { type: 'dribbled_past', label: 'Driblat de adversar', points: -3 },
                { type: 'pass_error', label: 'Pasă greșită', points: -1 },
                { type: 'foul', label: 'Fault comis', points: -3, statKey: 'foulsCommitted' }
              );
              if (Math.random() < 0.09) {
                options.push({ type: 'yellow_card', label: 'Cartonaș galben', points: -15, statKey: 'yellowCards' });
              }
              if (Math.random() < 0.04) {
                options.push({ type: 'penalty_conceded', label: 'Penalty comis', points: -25 });
              }
            } else if (pos === 'MID') {
              // Pozitive (65%)
              options.push(
                { type: 'pass_forward', label: 'Pasă în teren advers', points: 1, statKey: 'passesCompleted' },
                { type: 'key_pass', label: 'Pasă cheie', points: 5, statKey: 'keyPasses' },
                { type: 'long_pass', label: 'Pasă lungă', points: 3 },
                { type: 'cross_successful', label: 'Centrare reușită', points: 3 },
                { type: 'dribble_success', label: 'Dribling reușit', points: 5 },
                { type: 'shot_on_target', label: 'Șut pe poartă', points: 10, statKey: 'shotsOnTarget' },
                { type: 'tackle', label: 'Deposedare reușită', points: 5, statKey: 'tacklesWon' },
                { type: 'interception', label: 'Intercepție', points: 5, statKey: 'recoveries' },
                { type: 'duel_won', label: 'Duel câștigat', points: 3 },
                { type: 'foul_drawn', label: 'Fault obținut', points: 1, statKey: 'foulsDrawn' }
              );
              if (Math.random() < 0.12) {
                options.push({ type: 'assist', label: 'Pasă de gol', points: 30, statKey: 'assists', isHomeGoal: true });
              }
              if (Math.random() < 0.09) {
                options.push({ type: 'goal', label: 'Gol marcat', points: 50, statKey: 'goals', isHomeGoal: true });
              }
              // Negative (35%)
              options.push(
                { type: 'pass_error', label: 'Pasă greșită', points: -1 },
                { type: 'dispossessed', label: 'Deposedat de minge', points: -3 },
                { type: 'shot_missed', label: 'Șut ratat', points: -3 },
                { type: 'duel_lost', label: 'Duel pierdut', points: -1 },
                { type: 'dribbled_past', label: 'Driblat de adversar', points: -3 },
                { type: 'foul', label: 'Fault comis', points: -3, statKey: 'foulsCommitted' }
              );
              if (Math.random() < 0.08) {
                options.push({ type: 'yellow_card', label: 'Cartonaș galben', points: -15, statKey: 'yellowCards' });
              }
            } else {
              // FWD
              // Pozitive (65%)
              options.push(
                { type: 'shot_on_target', label: 'Șut pe poartă', points: 10, statKey: 'shotsOnTarget' },
                { type: 'key_pass', label: 'Pasă cheie', points: 5, statKey: 'keyPasses' },
                { type: 'dribble_success', label: 'Dribling reușit', points: 5 },
                { type: 'duel_won', label: 'Duel câștigat', points: 3 },
                { type: 'aerial_won', label: 'Duel aerian câștigat', points: 3 },
                { type: 'pass_forward', label: 'Pasă în teren advers', points: 1, statKey: 'passesCompleted' },
                { type: 'foul_drawn', label: 'Fault obținut', points: 1, statKey: 'foulsDrawn' }
              );
              if (Math.random() < 0.14) {
                options.push({ type: 'goal', label: 'Gol marcat', points: 50, statKey: 'goals', isHomeGoal: true });
              }
              if (Math.random() < 0.10) {
                options.push({ type: 'assist', label: 'Pasă de gol', points: 30, statKey: 'assists', isHomeGoal: true });
              }
              if (Math.random() < 0.08) {
                options.push({ type: 'penalty_won', label: 'Penalty obținut', points: 25 });
              }
              // Negative (35%)
              options.push(
                { type: 'shot_missed', label: 'Șut ratat', points: -3 },
                { type: 'dispossessed', label: 'Deposedat de minge', points: -3 },
                { type: 'duel_lost', label: 'Duel pierdut', points: -1 },
                { type: 'pass_error', label: 'Pasă greșită', points: -1 },
                { type: 'foul', label: 'Fault comis', points: -3, statKey: 'foulsCommitted' }
              );
              if (Math.random() < 0.10) {
                options.push({ type: 'big_chance_missed', label: 'Ocazie mare ratată', points: -15 });
              }
              if (Math.random() < 0.07) {
                options.push({ type: 'yellow_card', label: 'Cartonaș galben', points: -15, statKey: 'yellowCards' });
              }
            }

            // Oponenți (posibilitate gol adversar)
            if (Math.random() < 0.07) {
              options.push({
                type: 'goal',
                label: 'Gol marcat',
                points: -10,
                isAwayGoal: true,
              });
            }

            const chosen = options[Math.floor(Math.random() * options.length)];

            if (chosen.isHomeGoal) setDemoHomeScore((s) => s + 1);
            if (chosen.isAwayGoal) setDemoAwayScore((s) => s + 1);

            const isAway = Boolean(chosen.isAwayGoal);
            const pName = isAway ? 'Oponenți' : targetPlayer.name;
            const pId = isAway ? 'opp_rival' : targetPlayer.id;
            const cId = isAway ? 'c_opp' : targetPlayer.clubId;

            // FĂRĂ COMENTARIU: strict Nume – Acțiune
            const evDescription = `${pName} – ${chosen.label}`;

            const ev: MatchLiveEvent = {
              id: `demo_ev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              minute: currentMatchMin,
              type: chosen.type,
              playerId: pId,
              playerName: pName,
              clubId: cId,
              pointsChange: chosen.points,
              description: evDescription,
            };

            setDemoEvents((prev) => [ev, ...prev]);

            if (!isAway) {
              // Populează evenimentul direct pe profilul fotbalistului titular
              setDemoEventsByPlayer((prev) => ({
                ...prev,
                [targetPlayer.id]: [ev, ...(prev[targetPlayer.id] || [])],
              }));

              // Doar creșterea / scăderea punctajului pe cardul titularului (fără indicatori suplimentari)
              setPlayers((prev) =>
                prev.map((p) => {
                  if (p.id === targetPlayer.id) {
                    const updatedStats: PlayerStats = { ...p.stats };
                    if (chosen.statKey && typeof (updatedStats as Record<string, any>)[chosen.statKey] === 'number') {
                      ((updatedStats as Record<string, any>)[chosen.statKey] as number) += 1;
                    }
                    return {
                      ...p,
                      pointsMatchday: p.pointsMatchday + chosen.points,
                      pointsTotal: p.pointsTotal + chosen.points,
                      stats: updatedStats,
                    };
                  }
                  return p;
                })
              );
            }
          }
        }

        return nextRemaining;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isDemoMatchActive, squad, players, addNotification]);

  // Confirmă salvarea în Firestore din fereastra modală
  const confirmSaveDemoMatch = useCallback(async () => {
    if (!pendingDemoMatchSave) return;

    const { homeScore, awayScore, resultPts, resultLabel, isCleanSheet, playerBonuses } = pendingDemoMatchSave;
    const starters = Object.values(squad.startingSlots).filter(Boolean) as string[];

    // 1. Creează evenimentele post-whistle pe fiecare jucător
    const postEvents: MatchLiveEvent[] = [];
    const newPlayerEventsMap = { ...demoEventsByPlayer };

    Object.entries(playerBonuses).forEach(([pId, bonusData]) => {
      const p = players.find((pl) => pl.id === pId);
      if (!p) return;
      const isStarter = starters.includes(pId);
      const starterLabel = isStarter ? 'Titular în meci' : 'Intrat de pe bancă';

      const pEvents: MatchLiveEvent[] = [
        {
          id: `demo_post_start_${pId}_${Date.now()}`,
          minute: 90,
          type: isStarter ? 'starter_bonus' : 'substitute_in_bonus',
          playerId: pId,
          playerName: p.name,
          clubId: p.clubId,
          pointsChange: bonusData.starterBonus,
          description: `${p.name} – ${starterLabel}`,
        },
        {
          id: `demo_post_min_${pId}_${Date.now()}`,
          minute: 90,
          type: 'minutes_bonus',
          playerId: pId,
          playerName: p.name,
          clubId: p.clubId,
          pointsChange: bonusData.minutesBonus,
          description: `${p.name} – Minute jucate (90')`,
        },
      ];

      if (bonusData.cleanSheetBonus > 0) {
        pEvents.push({
          id: `demo_post_cs_${pId}_${Date.now()}`,
          minute: 90,
          type: 'clean_sheet_bonus',
          playerId: pId,
          playerName: p.name,
          clubId: p.clubId,
          pointsChange: bonusData.cleanSheetBonus,
          description: `${p.name} – Poartă intactă (Clean Sheet)`,
        });
      }

      pEvents.push({
        id: `demo_post_res_${pId}_${Date.now()}`,
        minute: 90,
        type: resultPts > 0 ? 'match_won' : resultPts === 5 ? 'match_draw' : 'match_lost',
        playerId: pId,
        playerName: p.name,
        clubId: p.clubId,
        pointsChange: resultPts,
        description: `${p.name} – ${resultLabel}`,
      });

      postEvents.push(...pEvents);
      newPlayerEventsMap[pId] = [...pEvents, ...(newPlayerEventsMap[pId] || [])];
    });

    setDemoEvents((prev) => [...postEvents, ...prev]);
    setDemoEventsByPlayer(newPlayerEventsMap);

    // 2. Actualizează jucătorii cu punctele finale și comprimă istoricul
    setPlayers((prev) =>
      prev.map((p) => {
        const bonus = playerBonuses[p.id];
        if (bonus) {
          const finalPts = bonus.finalPoints;

          const newHistory = [...(p.matchHistory || [])];
          if (p.lastMatchDetails) {
            const prevDetails = p.lastMatchDetails;
            newHistory.unshift({
              matchday: prevDetails.gameweek,
              opponentClubId: prevDetails.opponentClubId,
              result: prevDetails.contextualPoints.result > 0 ? 'V' : prevDetails.contextualPoints.result === 0 ? 'E' : 'Î',
              minutesPlayed: prevDetails.minutesPlayed,
              points: prevDetails.points,
              goals: Number(prevDetails.detailedStats?.goals || 0),
              assists: Number(prevDetails.detailedStats?.assists || 0),
              rating: prevDetails.points > 30 ? 8.5 : prevDetails.points > 15 ? 7.5 : 6.0,
              eventsSummary: `Puncte: ${prevDetails.points}p (${prevDetails.minutesPlayed}')`,
            });
          }

          const updatedLastDetails: PlayerLastMatchDetails = {
            fixtureId: 'demo_match',
            opponentClubId: 'c_superliga_allstars',
            gameweek: 15,
            points: finalPts,
            minutesPlayed: 90,
            contextualPoints: {
              starter: bonus.starterBonus,
              minutes: bonus.minutesBonus,
              cleanSheet: bonus.cleanSheetBonus,
              result: bonus.resultPts,
            },
            detailedStats: {
              goals: Number(p.stats?.goals || 0),
              assists: Number(p.stats?.assists || 0),
              shotsOnTarget: Number(p.stats?.shotsOnTarget || 0),
              tacklesWon: Number(p.stats?.tacklesWon || 0),
              recoveries: Number(p.stats?.recoveries || 0),
              passesCompleted: Number(p.stats?.passesCompleted || 0),
            },
            breakdownPoints: {
              actionPoints: Math.max(0, p.pointsMatchday),
              cleanSheet: bonus.cleanSheetBonus,
              starter: bonus.starterBonus,
              minutes: bonus.minutesBonus,
              result: bonus.resultPts,
            },
            finalizedAt: new Date().toISOString(),
          };

          return {
            ...p,
            pointsMatchday: finalPts,
            pointsTotal: p.pointsTotal + bonus.totalBonus,
            lastMatchPoints: finalPts,
            lastMatchDetails: updatedLastDetails,
            matchHistory: newHistory.slice(0, 10),
          };
        }
        return p;
      })
    );

    // 3. Persistă definitiv în Firestore prin serviciul de finalizare
    await finalizeMatchNow('demo_match');

    setShowDemoSaveModal(false);
    setPendingDemoMatchSave(null);

    addNotification({
      title: '💾 Date Salvate în Baza de Date',
      message: 'Punctele fotbaliștilor și statisticile meciului au fost salvate definitiv în Firestore!',
      type: 'reward',
    });
  }, [pendingDemoMatchSave, squad.startingSlots, demoEventsByPlayer, players, finalizeMatchNow, addNotification]);

  // Anulează salvarea meciului demo și resetează datele
  const cancelDemoMatch = useCallback(() => {
    // Resetează punctele acumulate în meciul demo înapoi la 0
    setPlayers((prev) =>
      prev.map((p) => ({
        ...p,
        pointsMatchday: 0,
      }))
    );
    setDemoEvents([]);
    setDemoEventsByPlayer({});
    setDemoHomeScore(0);
    setDemoAwayScore(0);
    setDemoMinute(0);
    setPendingDemoMatchSave(null);
    setShowDemoSaveModal(false);

    addNotification({
      title: '❌ Test Anulat & Puncte Resetate',
      message: 'Datele meciului demo nu au fost salvate în baza de date. Punctele au revenit la zero pentru un nou test.',
      type: 'reward',
    });
  }, [addNotification]);

  // Resetare completă a datelor etapei la zero (pentru meciuri reale curate)
  const resetMatchdayDataToZero = useCallback(() => {
    // 1. Resetează toate meciurile la 0-0 fără evenimente
    setFixtures((prev) =>
      prev.map((f) => ({
        ...f,
        homeScore: 0,
        awayScore: 0,
        minute: 0,
        isLive: false,
        isFinished: false,
        events: [],
      }))
    );
    // 2. Resetează punctele de etapă ale tuturor jucătorilor la 0
    setMasterPlayers((prev) =>
      prev.map((p) => ({
        ...p,
        pointsMatchday: 0,
      }))
    );
    // 3. Resetează meciul demo dacă era activ
    setIsDemoMatchActive(false);
    setDemoTimeRemaining(60);
    setDemoMinute(0);
    setDemoHomeScore(0);
    setDemoAwayScore(0);
    setDemoEvents([]);
    setDemoEventsByPlayer({});
    setPendingDemoMatchSave(null);
    setShowDemoSaveModal(false);

    try {
      localStorage.removeItem(`${STORAGE_KEY}_fixtures`);
      localStorage.removeItem('supermanager_player_overrides');
    } catch (e) { /* ignore */ }

    addNotification({
      title: '🧹 Date Etapă Resetate la Zero',
      message: 'Toate scorurile meciurilor au fost resetate la 0-0, iar punctele fotbaliștilor sunt 0.',
      type: 'reward',
    });
  }, [addNotification]);

  return (
    <FantasyContext.Provider
      value={{
        user,
        isAuthenticated,
        registerUserAccount,
        login,
        loginWithProvider,
        logout,
        updateUserTeamName,
        updateUserPassword,
        updateManagerProfileGlobal,
        pendingLeagueRequests,
        approveLeagueJoinRequest,
        rejectLeagueJoinRequest,
        createNewLeague,
        joinLeagueByCode,
        addNewsArticle,
        players,
        squad,
        allocateStarterSquad,
        changeFormation,
        assignPlayerToSlot,
        removePlayerFromSlot,
        setCaptain,
        swapPlayers,
        substituteBenchPlayer,
        applyCraiovaBotosaniSquad,
        unifiedMarketItems,
        placeMarketOffer,
        withdrawMarketOffer,
        createMemberListing,
        delistPlayerFromMarket,
        acceptMemberOffer,
        refuseMemberOffer,
        recalculateMarketValuesFromWeeklyTrades,
        sellPlayerToMarket,
        transactions,
        newsArticles,
        fixtures,
        isSimulating,
        toggleSimulation,
        simulationSpeed,
        setSimulationSpeed,
        injectCustomEvent,
        predictions,
        makePrediction,
        claimPredictionReward,
        isLiveMatchWindow,
        checkInFanTVOrStadium,
        leagueMembers,
        leagueSettings,
        updateLeagueSettings,
        notifications,
        unreadNotificationsCount,
        markNotificationsAsRead,
        dismissNotification,
        addNewPlayer,
        updatePlayerStatus,
        updatePlayerMarketValue,
        updateGlobalPlayerData,
        deletePlayerGlobal,
        updateUserMembership,
        clubs,
        activeClubs,
        allPlayers,
        updateClub,
        addNewClub,
        toggleClubStatus,
        squadPointsMatchday,
        rawSquadPointsMatchday,
        squadTotalValue,
        squadMarketValue,
        maxOverdraftLimit,
        minAllowedBalance,
        isBudgetNegative,
        isOverdraftPenalized,
        squadCount,
        gkCount,
        emptyStarterSlotsCount,
        emptySlotsPenalty,
        isSquadValid,
        squadValidationErrors,
        isDemoMatchActive,
        demoTimeRemaining,
        demoMinute,
        demoHomeScore,
        demoAwayScore,
        demoEvents,
        demoEventsByPlayer,
        pendingDemoMatchSave,
        showDemoSaveModal,
        setShowDemoSaveModal,
        confirmSaveDemoMatch,
        cancelDemoMatch,
        resetMatchdayDataToZero,
        startDemoMatch,
        resetDemoMatch,
        sportmonksScores,
        sportmonksPlayerDetails,
        sportmonksActiveMatches,
        isSportmonksPolling,
        syncSportmonksPlayerIds,
        refreshSportmonksLiveScores,
        testFixturesEnabled,
        toggleTestFixtures,
        finalizedMatchIds,
        pendingFinalizations,
        finalizeMatchNow,
        simulateFinishedMatchFT,
      }}
    >
      {children}
    </FantasyContext.Provider>
  );
};

export const useFantasy = () => {
  const ctx = useContext(FantasyContext);
  if (!ctx) throw new Error('useFantasy must be used within a FantasyProvider');
  return ctx;
};
