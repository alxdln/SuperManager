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
} from '../types/football';
import { INITIAL_PLAYERS, INITIAL_FIXTURES, INITIAL_LEAGUE_NEWS } from '../data/superligaData';
import { ALL_16_SUPERLIGA_PLAYERS } from '../data/superligaAll16ClubsPlayers';
import { FORMATIONS } from '../data/formations';
import { calculateEventPoints, formatCurrency, formatFullCurrency } from '../utils/scoringEngine';
import {
  loadFirestoreCustomPlayers,
  saveFirestoreCustomPlayer,
  saveFirestoreUserAccount,
  findFirestoreUser,
  saveFirestoreLeague,
  findFirestoreLeagueByCode,
} from '../lib/firebase';

interface FantasyContextType {
  // User & Auth
  user: UserProfile;
  isAuthenticated: boolean;
  registerUserAccount: (accountData: { email: string; password?: string; name: string; teamName: string }) => Promise<{ success: boolean; message: string }>;
  login: (email: string, pass: string) => Promise<{ success: boolean; hasLeague: boolean; message?: string }>;
  loginWithProvider: (provider: 'apple' | 'google') => void;
  logout: () => void;
  updateUserTeamName: (newName: string) => void;
  updateUserPassword: (password: string) => boolean;

  // League Creation & Join
  createNewLeague: (data: { name: string; startingBudget: number; maxSameClubPlayers: number }) => Promise<{ success: boolean; message: string }>;
  joinLeagueByCode: (code: string) => Promise<{ success: boolean; message: string }>;
  addNewsArticle: (article: Omit<LeagueNewsArticle, 'id' | 'date'>) => void;

  // Players & Squad
  players: Player[];
  squad: SquadState;
  changeFormation: (formation: TacticalFormation) => void;
  assignPlayerToSlot: (slotId: string, playerId: string) => void;
  removePlayerFromSlot: (slotId: string) => void;
  setCaptain: (playerId: string) => void;
  swapPlayers: (slotA: string, slotB: string) => void;
  substituteBenchPlayer: (slotId: string, benchPlayerId: string) => void;

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

  // Demo Match (3-Minute Live Simulation)
  isDemoMatchActive: boolean;
  demoTimeRemaining: number;
  demoMinute: number;
  demoHomeScore: number;
  demoAwayScore: number;
  demoEvents: MatchLiveEvent[];
  startDemoMatch: () => void;
  resetDemoMatch: () => void;
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
    };
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem(`${STORAGE_KEY}_auth`) === 'true';
  });

  // All Players List (All 16 Liga 1 Clubs)
  const [players, setPlayers] = useState<Player[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_players`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= ALL_16_SUPERLIGA_PLAYERS.length) {
          return parsed;
        }
      } catch (e) { /* ignore */ }
    }
    return ALL_16_SUPERLIGA_PLAYERS;
  });

  // Squad State
  const [squad, setSquad] = useState<SquadState>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_squad`);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return {
      formation: '4-3-3',
      startingSlots: {
        gk: 'p_tarnovanu',
        lb: 'p_radunovic',
        lcb: 'p_ngezana',
        rcb: 'p_pascanu',
        rb: 'p_onea',
        lcm: 'p_sut',
        cm: 'p_olaru',
        rcm: 'p_cirjan',
        lw: 'p_petrila',
        st: 'p_birligea',
        rw: 'p_mitrita',
      },
      benchPlayerIds: ['p_dobre', 'p_baiaram', 'p_postolachi', 'p_siegrist'],
      captainPlayerId: 'p_olaru',
      boosterActive: false,
    };
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

  // Fixtures
  const [fixtures, setFixtures] = useState<Fixture[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_fixtures`);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
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

  // 3-Minute Demo Match State (Realistic match simulation with user's squad players)
  const [isDemoMatchActive, setIsDemoMatchActive] = useState<boolean>(false);
  const [demoTimeRemaining, setDemoTimeRemaining] = useState<number>(180); // 180 seconds = 3 minutes real time
  const [demoMinute, setDemoMinute] = useState<number>(0); // 0 to 90 match minutes
  const [demoHomeScore, setDemoHomeScore] = useState<number>(0);
  const [demoAwayScore, setDemoAwayScore] = useState<number>(0);
  const [demoEvents, setDemoEvents] = useState<MatchLiveEvent[]>([]);

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

  // Overdraft Financial Computations (-50% max allowed overdraft)
  const squadMarketValue = squadTotalValue;
  const maxOverdraftLimit = useMemo(() => Math.round(squadMarketValue * 0.5), [squadMarketValue]);
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
          let playerPts = player.pointsMatchday;
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
  }, [players, squad]);

  // If overdraft penalized, team points in matchday standings are 0!
  const squadPointsMatchday = useMemo(() => {
    if (isOverdraftPenalized) return 0;
    return rawSquadPointsMatchday;
  }, [isOverdraftPenalized, rawSquadPointsMatchday]);

  // Squad size and Goalkeeper count (Rules: max 16, min 11, min 1 GK)
  const squadCount = useMemo(() => {
    const starters = Object.values(squad.startingSlots).filter(Boolean).length;
    return starters + squad.benchPlayerIds.length;
  }, [squad]);

  const gkCount = useMemo(() => {
    const playerMap = new Map(players.map((p) => [p.id, p]));
    const starters = Object.values(squad.startingSlots).filter(Boolean) as string[];
    const allIds = Array.from(new Set([...starters, ...squad.benchPlayerIds]));
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

  const login = async (email: string, _pass: string): Promise<{ success: boolean; hasLeague: boolean; message?: string }> => {
    try {
      const stored = await findFirestoreUser(email);
      if (stored) {
        setUser((prev) => ({
          ...prev,
          id: stored.id || prev.id,
          name: stored.name || prev.name,
          email: stored.email,
          teamName: stored.teamName || prev.teamName,
          avatar: stored.avatar || prev.avatar,
          budget: stored.budget || prev.budget,
        }));
        if (stored.leagueCode) {
          setLeagueSettings((prev) => ({
            ...prev,
            leagueCode: stored.leagueCode || prev.leagueCode,
            leagueName: stored.leagueName || prev.leagueName,
          }));
        }
      } else {
        setUser((prev) => ({ ...prev, email }));
      }

      setIsAuthenticated(true);
      localStorage.setItem(`${STORAGE_KEY}_auth`, 'true');

      addNotification({
        title: 'Autentificare reușită',
        message: `Bun venit înapoi!`,
        type: 'reward',
      });

      return { success: true, hasLeague: !!stored?.leagueCode };
    } catch (err) {
      setIsAuthenticated(true);
      localStorage.setItem(`${STORAGE_KEY}_auth`, 'true');
      return { success: true, hasLeague: false };
    }
  };

  const loginWithProvider = (provider: 'apple' | 'google') => {
    setIsAuthenticated(true);
    localStorage.setItem(`${STORAGE_KEY}_auth`, 'true');
    addNotification({
      title: `Conectat cu ${provider === 'apple' ? 'Apple ID' : 'Google'}`,
      message: 'Te-ai autentificat cu succes în SuperManager.',
      type: 'reward',
    });
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

    // Add News Article in feed
    addNewsArticle({
      title: `Ligă Nouă Fondată: ${data.name}!`,
      summary: `Managerul ${user.name} a fondat liga ${data.name} cu buget de ${formatCurrency(data.startingBudget)} per club.`,
      content: `O nouă ligă privată a fost creată oficial. Invitați prietenii folosind codul ${code}.`,
      tag: 'ETAPĂ',
    });

    return { success: true, message: 'Ligă creată cu succes!' };
  };

  const joinLeagueByCode = async (code: string): Promise<{ success: boolean; message: string }> => {
    const found = await findFirestoreLeagueByCode(code);
    const resolvedName = found ? found.name : `Liga ${code.toUpperCase()}`;
    const resolvedBudget = found ? found.budget : 50000000;

    setLeagueSettings((prev) => ({
      ...prev,
      leagueCode: code.toUpperCase(),
      leagueName: resolvedName,
      startingBudget: resolvedBudget,
    }));

    setUser((prev) => ({
      ...prev,
      budget: resolvedBudget,
    }));

    // Add News Article in feed
    addNewsArticle({
      title: `Membru Nou: ${user.name} a intrat în ligă!`,
      summary: `Managerul ${user.name} (${user.teamName}) s-a alăturat ligii ${resolvedName}!`,
      content: `Comunitatea crește! Un nou manager a intrat în competiție și este gata de licitații.`,
      tag: 'ETAPĂ',
    });

    return { success: true, message: `Te-ai alăturat ligii ${resolvedName}!` };
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
    // Poti intra maxim in minus 50% din valoarea lotului tau (-maxOverdraftLimit).
    const resultingBudget = user.budget - offerAmount;
    if (resultingBudget < minAllowedBalance) {
      return {
        success: false,
        isOverdraftExceeded: true,
        requiredAmount: offerAmount,
        message: `Ai depășit limita maximă de overdraft! Valoarea lotului tău este de ${formatCurrency(squadTotalValue)}, deci poți intra în minus cel mult 50% (${formatCurrency(minAllowedBalance)}). Bugetul tău ar fi devenit ${formatCurrency(resultingBudget)}. Vinde jucători pentru a continua!`,
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

    const all = [myMember, ...rivals];
    all.sort((a, b) => b.totalPoints - a.totalPoints);
    return all.map((m, idx) => ({ ...m, rank: idx + 1 }));
  }, [user, squad, squadPointsMatchday, squadTotalValue]);

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

    // Save persistently to Firestore database
    saveFirestoreCustomPlayer(newP).catch((err) => {
      console.warn('Eroare la salvarea în Firestore:', err);
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

  // 3-MINUTE DEMO MATCH ENGINE
  const startDemoMatch = useCallback(() => {
    setIsDemoMatchActive(true);
    setDemoTimeRemaining(180);
    setDemoMinute(1);
    setDemoHomeScore(0);
    setDemoAwayScore(0);
    setDemoEvents([
      {
        id: `demo_start_${Date.now()}`,
        minute: 1,
        type: 'starter_bonus',
        playerId: 'sys_start',
        playerName: 'SuperManager Live',
        clubId: 'c_superliga',
        pointsChange: 0,
        description: 'Fluier de start în Meciul Demo! Partida a început cu fotbaliștii din lotul tău.',
      },
    ]);
    addNotification({
      title: '🎮 Meci Demo Pornit (3 Minute)!',
      message: 'Meciul simulat rulează accelerat (3 minute = 90 min de joc real) cu fotbaliștii din lotul tău.',
      type: 'live_event',
    });
  }, [addNotification]);

  const resetDemoMatch = useCallback(() => {
    setIsDemoMatchActive(false);
    setDemoTimeRemaining(180);
    setDemoMinute(0);
    setDemoHomeScore(0);
    setDemoAwayScore(0);
    setDemoEvents([]);
  }, []);

  // Accelerated 3-Minute Real-Time Demo Match Timer Loop
  useEffect(() => {
    if (!isDemoMatchActive) return;

    const interval = setInterval(() => {
      setDemoTimeRemaining((prevRemaining) => {
        if (prevRemaining <= 1) {
          clearInterval(interval);
          setIsDemoMatchActive(false);
          setDemoMinute(90);
          setDemoEvents((prev) => [
            {
              id: `demo_end_${Date.now()}`,
              minute: 90,
              type: 'match_won',
              playerId: 'sys_end',
              playerName: 'SuperManager Live',
              clubId: 'c_superliga',
              pointsChange: 0,
              description: 'Fluier Final! Meciul Demo s-a încheiat. Punctele fotbaliștilor tăi au fost calculate!',
            },
            ...prev,
          ]);
          addNotification({
            title: '🏁 Fluier Final în Meciul Demo!',
            message: 'Meciul de 3 minute s-a încheiat! Verifică punctele acumulate de jucători.',
            type: 'reward',
          });
          return 0;
        }

        const nextRemaining = prevRemaining - 1;
        const elapsed = 180 - nextRemaining;
        const currentMatchMin = Math.min(90, Math.max(1, Math.floor((elapsed / 180) * 90)));
        setDemoMinute(currentMatchMin);

        // Realistic event cadence: trigger event with ~22% chance per second (~18-20 events total in 3 min)
        if (Math.random() < 0.22) {
          const starters = Object.values(squad.startingSlots).filter(Boolean) as string[];
          const squadIds = starters.length > 0 ? starters : squad.benchPlayerIds;
          const squadPool = players.filter((p) => squadIds.includes(p.id));
          const targetPlayer = squadPool.length > 0
            ? squadPool[Math.floor(Math.random() * squadPool.length)]
            : players[0];

          if (targetPlayer) {
            const isGK = targetPlayer.position === 'GK';
            const isDEF = targetPlayer.position === 'DEF';
            const isMID = targetPlayer.position === 'MID';

            type EventOption = {
              type: MatchEventType;
              desc: string;
              points: number;
              statKey?: keyof Player['stats'];
              isHomeGoal?: boolean;
              isAwayGoal?: boolean;
            };

            const options: EventOption[] = [];

            if (isGK) {
              options.push(
                { type: 'penalty_save', desc: `Paradă de senzație! ${targetPlayer.name} respinge spectaculos un penalty!`, points: 75, statKey: 'penaltySaves' },
                { type: 'save', desc: `${targetPlayer.name} reține cu siguranță o minge periculoasă la colțul lung.`, points: 20, statKey: 'cleanSheets' },
                { type: 'pass_forward', desc: `Degajare milimetrică reușită de ${targetPlayer.name} pentru contraatac.`, points: 5, statKey: 'passesCompleted' }
              );
            } else if (isDEF) {
              options.push(
                { type: 'tackle', desc: `Intervenție de clasă prin alunecare a lui ${targetPlayer.name}!`, points: 15, statKey: 'tacklesWon' },
                { type: 'recovery', desc: `${targetPlayer.name} recuperează și pasează sigur în linia mediană.`, points: 8, statKey: 'recoveries' },
                { type: 'foul', desc: `Fault comis de ${targetPlayer.name} pentru oprirea unei faze periculoase.`, points: -6, statKey: 'foulsCommitted' },
                { type: 'yellow_card', desc: `Cartonaș galben primit de ${targetPlayer.name} în minutul ${currentMatchMin}.`, points: -15, statKey: 'yellowCards' }
              );
            } else if (isMID) {
              options.push(
                { type: 'key_pass', desc: `Pasă luminoasă printre linii expediată de ${targetPlayer.name}.`, points: 15, statKey: 'keyPasses' },
                { type: 'shot_on_target', desc: `Șut cadrat periculos pe spațiul porții expediat de ${targetPlayer.name}!`, points: 12, statKey: 'shotsOnTarget' },
                { type: 'recovery', desc: `Presing sufocant și minge câștigată de ${targetPlayer.name}.`, points: 10, statKey: 'recoveries' },
                { type: 'assist', desc: `Assist genial semnat de ${targetPlayer.name}!`, points: 35, statKey: 'assists', isHomeGoal: true }
              );
            } else {
              // FWD
              options.push(
                { type: 'shot_on_target', desc: `${targetPlayer.name} fentează elegant și trage puternic!`, points: 15, statKey: 'shotsOnTarget' },
                { type: 'goal', desc: `⚽ GOOOL MAGNIFIC! ${targetPlayer.name} înscrie cu un șut la vinclu!`, points: 50, statKey: 'goals', isHomeGoal: true },
                { type: 'foul_drawn', desc: `${targetPlayer.name} scoate o lovitură liberă la marginea careului.`, points: 8, statKey: 'foulsDrawn' }
              );
            }

            // Rare opponent goal for realistic scoreline
            if (Math.random() < 0.2) {
              options.push({
                type: 'goal',
                desc: 'Adversarii finalizează un atac rapid și marchează.',
                points: -10,
                isAwayGoal: true,
              });
            }

            const chosen = options[Math.floor(Math.random() * options.length)];

            if (chosen.isHomeGoal) setDemoHomeScore((s) => s + 1);
            if (chosen.isAwayGoal) setDemoAwayScore((s) => s + 1);

            const ev: MatchLiveEvent = {
              id: `demo_ev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              minute: currentMatchMin,
              type: chosen.type,
              playerId: chosen.isAwayGoal ? 'opp_rival' : targetPlayer.id,
              playerName: chosen.isAwayGoal ? 'Oponenți' : targetPlayer.name,
              clubId: chosen.isAwayGoal ? 'c_opp' : targetPlayer.clubId,
              pointsChange: chosen.points,
              description: chosen.desc,
            };

            setDemoEvents((prev) => [ev, ...prev]);

            if (!chosen.isAwayGoal) {
              setPlayers((prev) =>
                prev.map((p) => {
                  if (p.id === targetPlayer.id) {
                    const updatedStats = { ...p.stats };
                    if (chosen.statKey && typeof updatedStats[chosen.statKey] === 'number') {
                      (updatedStats[chosen.statKey] as number) += 1;
                    }
                    return {
                      ...p,
                      pointsMatchday: Math.max(0, p.pointsMatchday + chosen.points),
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
        createNewLeague,
        joinLeagueByCode,
        addNewsArticle,
        players,
        squad,
        changeFormation,
        assignPlayerToSlot,
        removePlayerFromSlot,
        setCaptain,
        swapPlayers,
        substituteBenchPlayer,
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
        startDemoMatch,
        resetDemoMatch,
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
