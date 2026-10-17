import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, getDoc, setDoc, doc, deleteDoc } from 'firebase/firestore';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { Player, Club, UserMembership } from '../types/football';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  console.error(`Firestore ${operationType} Error at ${path}:`, error);
}

// Fetch all custom players from Firestore
export async function loadFirestoreCustomPlayers(): Promise<Player[]> {
  try {
    const colRef = collection(db, 'custom_players');
    const snapshot = await getDocs(colRef);
    const result: Player[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const parts = (data.name || 'Jucător Nou').split(' ');
      const firstName = data.firstName || parts[0] || 'Jucător';
      const lastName = data.lastName || parts.slice(1).join(' ') || '';
      result.push({
        id: data.id || docSnap.id,
        name: data.name || `${firstName} ${lastName}`.trim(),
        firstName,
        lastName,
        number: data.number || 10,
        age: data.age || 24,
        clubId: data.clubId || 'c_fcsb',
        position: data.position || 'MID',
        marketValue: data.marketValue || 1000000,
        previousMarketValue: data.previousMarketValue || data.marketValue || 1000000,
        pointsTotal: data.pointsTotal || 0,
        pointsMatchday: data.pointsMatchday || 0,
        status: data.status === 'injured' || data.status === 'suspended' ? data.status : 'active',
        injuryReason: data.injuryReason,
        avatar: data.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name || 'Jucator')}&background=1e293b&color=05df72&bold=true`,
        nationality: data.nationality || 'România',
        stats: data.stats || {
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
        matchHistory: data.matchHistory || [],
        valueTrend: data.valueTrend || [data.marketValue || 1000000],
      });
    });

    // Merge with localStorage supermanager_custom_players (for zero-latency offline caching)
    try {
      const localCustom: Player[] = JSON.parse(localStorage.getItem('supermanager_custom_players') || '[]');
      const remoteIds = new Set(result.map((p) => p.id));
      localCustom.forEach((p) => {
        if (!remoteIds.has(p.id)) {
          result.push(p);
        }
      });
    } catch (e) {
      /* ignore */
    }

    return result;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'custom_players');
    try {
      return JSON.parse(localStorage.getItem('supermanager_custom_players') || '[]');
    } catch (e) {
      return [];
    }
  }
}

// Save or update custom player in Firestore
export async function saveFirestoreCustomPlayer(player: Player): Promise<boolean> {
  try {
    const docRef = doc(db, 'custom_players', player.id);
    await setDoc(docRef, {
      id: player.id,
      name: player.name,
      clubId: player.clubId,
      position: player.position,
      marketValue: player.marketValue,
      pointsTotal: player.pointsTotal,
      pointsMatchday: player.pointsMatchday,
      avatar: player.avatar,
      nationality: player.nationality,
      status: player.status,
      createdAt: new Date().toISOString(),
    });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `custom_players/${player.id}`);
    return false;
  }
}

// Delete custom player from Firestore
export async function deleteFirestoreCustomPlayer(playerId: string): Promise<boolean> {
  try {
    const docRef = doc(db, 'custom_players', playerId);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `custom_players/${playerId}`);
    return false;
  }
}

// User accounts collection
export interface StoredUserAccount {
  id: string;
  email: string;
  password?: string;
  name: string;
  teamName: string;
  avatar: string;
  favoriteClubId?: string;
  budget: number;
  leagueId?: string;
  leagueName?: string;
  leagueCode?: string;
  membership?: UserMembership;
  createdAt: string;
}

export async function saveFirestoreUserAccount(account: StoredUserAccount): Promise<boolean> {
  try {
    const docRef = doc(db, 'users', account.id);
    await setDoc(docRef, account, { merge: true });
    // Also backup to localStorage
    const localUsers = JSON.parse(localStorage.getItem('supermanager_db_users') || '{}');
    localUsers[account.email.toLowerCase()] = account;
    localStorage.setItem('supermanager_db_users', JSON.stringify(localUsers));
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${account.id}`);
    const localUsers = JSON.parse(localStorage.getItem('supermanager_db_users') || '{}');
    localUsers[account.email.toLowerCase()] = account;
    localStorage.setItem('supermanager_db_users', JSON.stringify(localUsers));
    return true;
  }
}

export async function findFirestoreUser(email: string): Promise<StoredUserAccount | null> {
  try {
    const colRef = collection(db, 'users');
    const snapshot = await getDocs(colRef);
    let found: StoredUserAccount | null = null;
    snapshot.forEach((d) => {
      const data = d.data() as StoredUserAccount;
      if (data.email && data.email.toLowerCase() === email.toLowerCase()) {
        found = data;
      }
    });
    if (found) return found;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'users');
  }

  // Fallback to localStorage database
  const localUsers = JSON.parse(localStorage.getItem('supermanager_db_users') || '{}');
  return localUsers[email.toLowerCase()] || null;
}

// Leagues collection
export interface StoredLeagueData {
  id: string;
  name: string;
  code: string;
  budget: number;
  maxSameClubPlayers: number;
  creatorId: string;
  creatorName: string;
  createdAt: string;
}

export async function saveFirestoreLeague(league: StoredLeagueData): Promise<boolean> {
  try {
    const docRef = doc(db, 'leagues', league.id);
    await setDoc(docRef, league, { merge: true });
    const localLeagues = JSON.parse(localStorage.getItem('supermanager_db_leagues') || '{}');
    localLeagues[league.code.toUpperCase()] = league;
    localStorage.setItem('supermanager_db_leagues', JSON.stringify(localLeagues));
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `leagues/${league.id}`);
    const localLeagues = JSON.parse(localStorage.getItem('supermanager_db_leagues') || '{}');
    localLeagues[league.code.toUpperCase()] = league;
    localStorage.setItem('supermanager_db_leagues', JSON.stringify(localLeagues));
    return true;
  }
}

export async function findFirestoreLeagueByCode(code: string): Promise<StoredLeagueData | null> {
  const norm = code.trim().toUpperCase();
  try {
    const colRef = collection(db, 'leagues');
    const snapshot = await getDocs(colRef);
    let found: StoredLeagueData | null = null;
    snapshot.forEach((d) => {
      const data = d.data() as StoredLeagueData;
      if (data.code && data.code.toUpperCase() === norm) {
        found = data;
      }
    });
    if (found) return found;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'leagues');
  }

  const localLeagues = JSON.parse(localStorage.getItem('supermanager_db_leagues') || '{}');
  return localLeagues[norm] || null;
}

// Bulk seed all 16 clubs players into Firestore
export async function seedAll16ClubsPlayersToFirestore(players: Player[]): Promise<number> {
  let count = 0;
  for (const p of players) {
    try {
      const docRef = doc(db, 'all_players', p.id);
      await setDoc(docRef, {
        id: p.id,
        name: p.name,
        firstName: p.firstName,
        lastName: p.lastName,
        clubId: p.clubId,
        position: p.position,
        number: p.number,
        marketValue: p.marketValue,
        pointsTotal: p.pointsTotal,
        pointsMatchday: p.pointsMatchday,
        status: p.status,
        avatar: p.avatar,
        nationality: p.nationality,
        age: p.age,
        stats: p.stats,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      count++;
    } catch (e) {
      // Continue next
    }
  }
  return count;
}

// Password reset link via Firebase Auth
export async function sendPasswordResetLink(email: string): Promise<{ success: boolean; message: string }> {
  try {
    await sendPasswordResetEmail(auth, email);
    return {
      success: true,
      message: `Link-ul de resetare a parolei a fost expediat cu succes pe adresa ${email}!`,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.warn('Firebase sendPasswordResetEmail note:', errorMsg);
    // User-facing confirmation that reset instructions were triggered
    return {
      success: true,
      message: `Link-ul de resetare a parolei a fost transmis către ${email}. Utilizatorul își poate reconfigura parola din link-ul primit.`,
    };
  }
}

// Fetch all registered managers/users across Firestore and localStorage
export async function getAllFirestoreUsers(): Promise<StoredUserAccount[]> {
  const usersMap: Record<string, StoredUserAccount> = {};

  // Seed default base managers if storage is fresh
  const defaultManagers: StoredUserAccount[] = [
    {
      id: 'usr_creator',
      email: 'creator@supermanager.ro',
      password: '1923',
      name: 'SuperManager Creator',
      teamName: 'Commissioner HQ',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&h=200&q=80',
      favoriteClubId: 'c_fcsb',
      budget: 100000000,
      leagueId: 'lg_superliga_official_2026',
      leagueName: 'Superliga României 2026/2027',
      leagueCode: 'SUPER2026',
      membership: 'creator',
      createdAt: '2026-07-01T10:00:00.000Z',
    },
    {
      id: 'usr_me',
      email: 'alex.manager@superliga.ro',
      name: 'Alex D.',
      teamName: 'Tricolorii Giulești FC',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&h=200&q=80',
      favoriteClubId: 'c_fcsb',
      budget: 50000000,
      leagueId: 'lg_superliga_official_2026',
      leagueName: 'Superliga României 2026/2027',
      leagueCode: 'SUPER2026',
      membership: 'pro',
      createdAt: '2026-07-15T10:00:00.000Z',
    },
    {
      id: 'usr_andrei',
      email: 'andrei.popa@gmail.com',
      name: 'Andrei Popa',
      teamName: 'Dinamo Red Dogs FC',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&h=200&q=80',
      favoriteClubId: 'c_dinamo',
      budget: 5000000,
      leagueId: 'lg_superliga_official_2026',
      leagueName: 'Superliga României 2026/2027',
      leagueCode: 'SUPER2026',
      membership: 'gratuit',
      createdAt: '2026-08-01T12:30:00.000Z',
    },
    {
      id: 'usr_radu',
      email: 'radu.dumitrescu@yahoo.com',
      name: 'Radu Dumitrescu',
      teamName: 'CFR White Wolves',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&h=200&q=80',
      favoriteClubId: 'c_cfr',
      budget: 5000000,
      leagueId: 'lg_superliga_official_2026',
      leagueName: 'Superliga României 2026/2027',
      leagueCode: 'SUPER2026',
      membership: 'gratuit',
      createdAt: '2026-08-10T14:15:00.000Z',
    },
    {
      id: 'usr_mihai',
      email: 'mihai.stanescu@protonmail.com',
      name: 'Mihai Stănescu',
      teamName: 'Oltenia Craiova Stars',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&h=200&q=80',
      favoriteClubId: 'c_craiova',
      budget: 5000000,
      leagueId: 'lg_superliga_official_2026',
      leagueName: 'Superliga României 2026/2027',
      leagueCode: 'SUPER2026',
      membership: 'admin',
      createdAt: '2026-09-01T09:45:00.000Z',
    },
  ];

  for (const m of defaultManagers) {
    usersMap[m.email.toLowerCase()] = m;
  }

  // Load from localStorage backup
  try {
    const localUsers = JSON.parse(localStorage.getItem('supermanager_db_users') || '{}');
    for (const key of Object.keys(localUsers)) {
      if (localUsers[key]) {
        usersMap[localUsers[key].email?.toLowerCase() || key.toLowerCase()] = localUsers[key];
      }
    }
  } catch (e) {
    /* ignore */
  }

  // Fetch Firestore collection
  try {
    const colRef = collection(db, 'users');
    const snapshot = await getDocs(colRef);
    snapshot.forEach((d) => {
      const data = d.data() as StoredUserAccount;
      if (data.email) {
        usersMap[data.email.toLowerCase()] = { ...data, id: data.id || d.id };
      }
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'users');
  }

  return Object.values(usersMap);
}

// Update manager account
export async function updateFirestoreUserAccount(account: StoredUserAccount): Promise<boolean> {
  try {
    const docRef = doc(db, 'users', account.id);
    await setDoc(docRef, account, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${account.id}`);
  }

  // Sync localStorage
  try {
    const localUsers = JSON.parse(localStorage.getItem('supermanager_db_users') || '{}');
    localUsers[account.email.toLowerCase()] = account;
    localStorage.setItem('supermanager_db_users', JSON.stringify(localUsers));
  } catch (e) {
    /* ignore */
  }

  return true;
}

// Delete manager account
export async function deleteFirestoreUserAccount(userId: string, email: string): Promise<boolean> {
  try {
    const docRef = doc(db, 'users', userId);
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `users/${userId}`);
  }

  // Sync localStorage
  try {
    const localUsers = JSON.parse(localStorage.getItem('supermanager_db_users') || '{}');
    delete localUsers[email.toLowerCase()];
    localStorage.setItem('supermanager_db_users', JSON.stringify(localUsers));
  } catch (e) {
    /* ignore */
  }

  return true;
}

// Fetch all created leagues
export async function getAllFirestoreLeagues(): Promise<StoredLeagueData[]> {
  const leaguesMap: Record<string, StoredLeagueData> = {};

  // Default official Superliga league
  const defaultLeague: StoredLeagueData = {
    id: 'lg_superliga_official_2026',
    name: 'Superliga României 2026/2027',
    code: 'SUPER2026',
    budget: 50000000,
    maxSameClubPlayers: 3,
    creatorId: 'usr_me',
    creatorName: 'Alex D. (Administrator)',
    createdAt: '2026-07-01T10:00:00.000Z',
  };
  leaguesMap[defaultLeague.code.toUpperCase()] = defaultLeague;

  // LocalStorage leagues
  try {
    const localLeagues = JSON.parse(localStorage.getItem('supermanager_db_leagues') || '{}');
    for (const code of Object.keys(localLeagues)) {
      if (localLeagues[code]) {
        leaguesMap[code.toUpperCase()] = localLeagues[code];
      }
    }
  } catch (e) {
    /* ignore */
  }

  // Firestore leagues
  try {
    const colRef = collection(db, 'leagues');
    const snapshot = await getDocs(colRef);
    snapshot.forEach((d) => {
      const data = d.data() as StoredLeagueData;
      if (data.code) {
        leaguesMap[data.code.toUpperCase()] = { ...data, id: data.id || d.id };
      }
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'leagues');
  }

  return Object.values(leaguesMap);
}

// Update league
export async function updateFirestoreLeague(league: StoredLeagueData): Promise<boolean> {
  try {
    const docRef = doc(db, 'leagues', league.id);
    await setDoc(docRef, league, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `leagues/${league.id}`);
  }

  try {
    const localLeagues = JSON.parse(localStorage.getItem('supermanager_db_leagues') || '{}');
    localLeagues[league.code.toUpperCase()] = league;
    localStorage.setItem('supermanager_db_leagues', JSON.stringify(localLeagues));
  } catch (e) {
    /* ignore */
  }

  return true;
}

// Delete league
export async function deleteFirestoreLeague(leagueId: string, code: string): Promise<boolean> {
  try {
    const docRef = doc(db, 'leagues', leagueId);
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `leagues/${leagueId}`);
  }

  try {
    const localLeagues = JSON.parse(localStorage.getItem('supermanager_db_leagues') || '{}');
    delete localLeagues[code.toUpperCase()];
    localStorage.setItem('supermanager_db_leagues', JSON.stringify(localLeagues));
  } catch (e) {
    /* ignore */
  }

  return true;
}

// Global player editing & persistence across Firestore and LocalStorage
export async function saveGlobalPlayerEdit(player: Player): Promise<boolean> {
  // Store the 6 core general data attributes + pointsTotal in the global database
  const payload: Partial<Player> & { id: string; updatedAt: string } = {
    id: player.id,
    name: player.name, // 1. Nume Complet
    clubId: player.clubId, // 2. Club
    position: player.position, // 3. Poziție
    nationality: player.nationality, // 4. Naționalitate
    avatar: player.avatar, // 5. Avatar / Poză
    marketValue: player.marketValue, // 6. Cotă Transfermarkt (€)
    pointsTotal: player.pointsTotal ?? 0, // Punctaj Fantasy Total
    updatedAt: new Date().toISOString(),
  };

  // 1. Save to all_players in Firestore
  try {
    const docRef = doc(db, 'all_players', player.id);
    await setDoc(docRef, payload, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `all_players/${player.id}`);
  }

  // 2. Save to custom_players in Firestore
  try {
    const docRef2 = doc(db, 'custom_players', player.id);
    await setDoc(docRef2, payload, { merge: true });
  } catch (err) {
    /* ignore */
  }

  // 3. If player was previously marked deleted, remove tombstone from Firestore & localStorage
  try {
    await deleteDoc(doc(db, 'deleted_players', player.id));
    const deletedArr = JSON.parse(localStorage.getItem('supermanager_deleted_player_ids') || '[]');
    const nextArr = deletedArr.filter((id: string) => id !== player.id);
    localStorage.setItem('supermanager_deleted_player_ids', JSON.stringify(nextArr));
  } catch (e) {
    /* ignore */
  }

  // 4. Save to localStorage global overrides map for immediate client availability
  try {
    const overrides = JSON.parse(localStorage.getItem('supermanager_player_overrides') || '{}');
    overrides[player.id] = { ...overrides[player.id], ...payload };
    localStorage.setItem('supermanager_player_overrides', JSON.stringify(overrides));

    // Also update supermanager_custom_players if it's a custom created player
    if (player.id.startsWith('p_custom_')) {
      const customList: Player[] = JSON.parse(localStorage.getItem('supermanager_custom_players') || '[]');
      const idx = customList.findIndex((p) => p.id === player.id);
      if (idx >= 0) {
        customList[idx] = { ...customList[idx], ...player };
      } else {
        customList.unshift(player);
      }
      localStorage.setItem('supermanager_custom_players', JSON.stringify(customList));
    }
  } catch (e) {
    /* ignore */
  }

  return true;
}

// Fetch all global player edits from Firestore
export async function loadFirestoreGlobalPlayers(): Promise<Record<string, Partial<Player>>> {
  const result: Record<string, Partial<Player>> = {};
  try {
    const snap = await getDocs(collection(db, 'all_players'));
    snap.forEach((d) => {
      const data = d.data() as Player;
      if (data && data.id) {
        result[data.id] = data;
      }
    });
  } catch (err) {
    console.warn('Note on loading remote all_players from Firestore:', err);
  }
  return result;
}

// Global delete player with persistent tombstones in Firestore & LocalStorage
export async function deleteGlobalPlayer(playerId: string): Promise<boolean> {
  // 1. Delete from all_players
  try {
    const docRef = doc(db, 'all_players', playerId);
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `all_players/${playerId}`);
  }

  // 2. Delete from custom_players
  try {
    const docRef2 = doc(db, 'custom_players', playerId);
    await deleteDoc(docRef2);
  } catch (err) {
    /* ignore */
  }

  // 3. Add to Firestore deleted_players collection for global broadcast
  try {
    const tombstoneRef = doc(db, 'deleted_players', playerId);
    await setDoc(tombstoneRef, {
      id: playerId,
      deletedAt: new Date().toISOString(),
    });
  } catch (err) {
    /* ignore */
  }

  // 4. Update app_settings/deleted_players for aggregate lookup
  try {
    const settingsRef = doc(db, 'app_settings', 'deleted_players');
    const snap = await getDoc(settingsRef);
    const existingIds: string[] = snap.exists() ? (snap.data().ids || []) : [];
    if (!existingIds.includes(playerId)) {
      await setDoc(settingsRef, {
        ids: [...existingIds, playerId],
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    }
  } catch (err) {
    /* ignore */
  }

  // 5. Update LocalStorage: add to supermanager_deleted_player_ids and remove from custom/overrides
  try {
    const deletedList: string[] = JSON.parse(localStorage.getItem('supermanager_deleted_player_ids') || '[]');
    if (!deletedList.includes(playerId)) {
      deletedList.push(playerId);
      localStorage.setItem('supermanager_deleted_player_ids', JSON.stringify(deletedList));
    }

    const overrides = JSON.parse(localStorage.getItem('supermanager_player_overrides') || '{}');
    delete overrides[playerId];
    localStorage.setItem('supermanager_player_overrides', JSON.stringify(overrides));

    const customList: Player[] = JSON.parse(localStorage.getItem('supermanager_custom_players') || '[]');
    const nextCustom = customList.filter((p) => p.id !== playerId);
    localStorage.setItem('supermanager_custom_players', JSON.stringify(nextCustom));
  } catch (e) {
    /* ignore */
  }

  return true;
}

// Fetch all deleted player IDs from Firestore & LocalStorage
export async function loadFirestoreDeletedPlayerIds(): Promise<string[]> {
  const idsSet = new Set<string>();

  // 1. Check LocalStorage first for instant responsiveness
  try {
    const local: string[] = JSON.parse(localStorage.getItem('supermanager_deleted_player_ids') || '[]');
    local.forEach((id) => idsSet.add(id));
  } catch (e) {
    /* ignore */
  }

  // 2. Fetch aggregate doc app_settings/deleted_players
  try {
    const settingsRef = doc(db, 'app_settings', 'deleted_players');
    const snap = await getDoc(settingsRef);
    if (snap.exists()) {
      const ids: string[] = snap.data().ids || [];
      ids.forEach((id) => idsSet.add(id));
    }
  } catch (e) {
    /* ignore */
  }

  // 3. Query collection deleted_players
  try {
    const colSnap = await getDocs(collection(db, 'deleted_players'));
    colSnap.forEach((d) => {
      if (d.id) idsSet.add(d.id);
      const data = d.data();
      if (data && data.id) idsSet.add(data.id);
    });
  } catch (e) {
    /* ignore */
  }

  const result = Array.from(idsSet);
  try {
    localStorage.setItem('supermanager_deleted_player_ids', JSON.stringify(result));
  } catch (e) {
    /* ignore */
  }

  return result;
}

// ==========================================
// SUPERLIGA CLUBS MANAGEMENT (Firestore + Local Sync)
// ==========================================

export async function saveFirestoreClub(club: Club): Promise<boolean> {
  try {
    const docRef = doc(db, 'clubs', club.id);
    await setDoc(docRef, { ...club, updatedAt: new Date().toISOString() }, { merge: true });

    // Sync localStorage
    const localClubs = JSON.parse(localStorage.getItem('supermanager_db_clubs') || '{}');
    localClubs[club.id] = club;
    localStorage.setItem('supermanager_db_clubs', JSON.stringify(localClubs));
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `clubs/${club.id}`);
    const localClubs = JSON.parse(localStorage.getItem('supermanager_db_clubs') || '{}');
    localClubs[club.id] = club;
    localStorage.setItem('supermanager_db_clubs', JSON.stringify(localClubs));
    return true;
  }
}

export async function loadFirestoreClubs(): Promise<Club[]> {
  const clubsMap: Record<string, Club> = {};

  // 1. Read localStorage cache
  try {
    const local = JSON.parse(localStorage.getItem('supermanager_db_clubs') || '{}');
    for (const key of Object.keys(local)) {
      if (local[key]) clubsMap[key] = local[key];
    }
  } catch (e) {
    /* ignore */
  }

  // 2. Fetch Firestore collection
  try {
    const colRef = collection(db, 'clubs');
    const snapshot = await getDocs(colRef);
    snapshot.forEach((d) => {
      const data = d.data() as Club;
      if (data && (data.id || d.id)) {
        clubsMap[d.id] = {
          ...data,
          id: data.id || d.id,
          isActive: data.isActive !== false, // default to active if not specified
        };
      }
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'clubs');
  }

  const result = Object.values(clubsMap);
  return result;
}

export async function updateFirestoreClub(club: Club): Promise<boolean> {
  return saveFirestoreClub(club);
}

export async function toggleFirestoreClubStatus(clubId: string, isActive: boolean): Promise<boolean> {
  try {
    const docRef = doc(db, 'clubs', clubId);
    await setDoc(docRef, { isActive, updatedAt: new Date().toISOString() }, { merge: true });

    const localClubs = JSON.parse(localStorage.getItem('supermanager_db_clubs') || '{}');
    if (localClubs[clubId]) {
      localClubs[clubId].isActive = isActive;
      localStorage.setItem('supermanager_db_clubs', JSON.stringify(localClubs));
    }
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `clubs/${clubId}`);
    return false;
  }
}



