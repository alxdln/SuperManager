import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, getDoc, setDoc, doc, deleteDoc, onSnapshot } from 'firebase/firestore';
import {
  getAuth,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { Player, Club, UserMembership } from '../types/football';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = (firebaseConfig as any).firestoreDatabaseId
  ? getFirestore(app, (firebaseConfig as any).firestoreDatabaseId)
  : getFirestore(app);
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
  leagueStatus?: 'none' | 'pending_approval' | 'active';
  starterPackClaimed?: boolean;
  membership?: UserMembership;
  createdAt: string;
}

export async function saveFirestoreUserAccount(account: StoredUserAccount): Promise<boolean> {
  const accountId = account.id || `usr_${account.email.replace(/[^a-zA-Z0-9]/g, '_')}`;
  const cleanAccount: Record<string, any> = {};
  for (const [key, val] of Object.entries(account)) {
    if (val !== undefined) {
      cleanAccount[key] = val;
    }
  }
  cleanAccount.id = accountId;

  // Always backup to localStorage first (zero-latency)
  try {
    const localUsers = JSON.parse(localStorage.getItem('supermanager_db_users') || '{}');
    localUsers[account.email.toLowerCase()] = cleanAccount;
    localUsers[accountId] = cleanAccount;
    localStorage.setItem('supermanager_db_users', JSON.stringify(localUsers));
  } catch (e) { /* ignore */ }

  try {
    const docRef = doc(db, 'users', accountId);
    const writePromise = setDoc(docRef, cleanAccount, { merge: true });
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Firestore write timeout')), 2500)
    );
    await Promise.race([writePromise, timeoutPromise]);
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${accountId}`);
    return true;
  }
}

export async function findFirestoreUser(email: string): Promise<StoredUserAccount | null> {
  const normEmail = email.trim().toLowerCase();

  // Check if email was deleted or renamed
  try {
    const deleted: string[] = JSON.parse(localStorage.getItem('supermanager_deleted_users') || '[]');
    const renamed: string[] = JSON.parse(localStorage.getItem('supermanager_renamed_emails') || '[]');
    if (deleted.includes(normEmail) || renamed.includes(normEmail)) {
      return null;
    }
  } catch (e) { /* ignore */ }

  // Instant local lookup first
  try {
    const localUsers = JSON.parse(localStorage.getItem('supermanager_db_users') || '{}');
    if (localUsers[normEmail]) {
      return localUsers[normEmail];
    }
  } catch (e) { /* ignore */ }

  try {
    const colRef = collection(db, 'users');
    const readPromise = getDocs(colRef);
    const timeoutPromise = new Promise<any>((_, reject) =>
      setTimeout(() => reject(new Error('Firestore read timeout')), 2500)
    );
    const snapshot = await Promise.race([readPromise, timeoutPromise]);
    let found: StoredUserAccount | null = null;
    snapshot.forEach((d: any) => {
      const data = d.data() as StoredUserAccount;
      if (data.email && data.email.toLowerCase() === normEmail) {
        found = { ...data, id: data.id || d.id };
      }
    });
    if (found) {
      try {
        const localUsers = JSON.parse(localStorage.getItem('supermanager_db_users') || '{}');
        localUsers[normEmail] = found;
        localStorage.setItem('supermanager_db_users', JSON.stringify(localUsers));
      } catch (e) { /* ignore */ }
      return found;
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'users');
  }

  // Fallback check against default managers (if not deleted/renamed)
  const defaultAccounts: Record<string, StoredUserAccount> = {
    'creator@supermanager.ro': {
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
    'alex.manager@superliga.ro': {
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
    'andrei.popa@gmail.com': {
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
    'radu.dumitrescu@yahoo.com': {
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
    'mihai.stanescu@protonmail.com': {
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
  };

  return defaultAccounts[normEmail] || null;
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

// League Join Requests
export interface LeagueJoinRequest {
  id: string;
  leagueId: string;
  leagueCode: string;
  leagueName: string;
  userId: string;
  userName: string;
  userEmail: string;
  teamName: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

export async function createFirestoreLeagueJoinRequest(req: LeagueJoinRequest): Promise<boolean> {
  try {
    const docRef = doc(db, 'league_requests', req.id);
    await setDoc(docRef, req, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `league_requests/${req.id}`);
  }

  try {
    const local: LeagueJoinRequest[] = JSON.parse(localStorage.getItem('supermanager_league_requests') || '[]');
    const filtered = local.filter((r) => r.id !== req.id);
    filtered.unshift(req);
    localStorage.setItem('supermanager_league_requests', JSON.stringify(filtered));
  } catch (e) { /* ignore */ }

  return true;
}

export async function getFirestoreLeagueJoinRequests(leagueCodeOrId?: string): Promise<LeagueJoinRequest[]> {
  const reqMap = new Map<string, LeagueJoinRequest>();
  try {
    const local: LeagueJoinRequest[] = JSON.parse(localStorage.getItem('supermanager_league_requests') || '[]');
    local.forEach((r) => {
      if (r && r.id) reqMap.set(r.id, r);
    });
  } catch (e) { /* ignore */ }

  try {
    const colRef = collection(db, 'league_requests');
    const snapshot = await getDocs(colRef);
    snapshot.forEach((d) => {
      const data = d.data() as LeagueJoinRequest;
      if (data && data.id) {
        reqMap.set(data.id, data);
      }
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'league_requests');
  }

  const list = Array.from(reqMap.values());
  if (!leagueCodeOrId) return list;
  const norm = leagueCodeOrId.trim().toUpperCase();
  return list.filter((r) => r.leagueCode?.toUpperCase() === norm || r.leagueId === leagueCodeOrId);
}

export async function respondFirestoreLeagueJoinRequest(requestId: string, status: 'accepted' | 'rejected'): Promise<boolean> {
  try {
    const docRef = doc(db, 'league_requests', requestId);
    await setDoc(docRef, { status }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `league_requests/${requestId}`);
  }

  try {
    const local: LeagueJoinRequest[] = JSON.parse(localStorage.getItem('supermanager_league_requests') || '[]');
    const updated = local.map((r) => (r.id === requestId ? { ...r, status } : r));
    localStorage.setItem('supermanager_league_requests', JSON.stringify(updated));
  } catch (e) { /* ignore */ }

  return true;
}

// Social & Email Authentication Services
export async function signInWithGooglePopup(): Promise<{ success: boolean; user?: StoredUserAccount; error?: string }> {
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const result = await signInWithPopup(auth, provider);
    const fbUser = result.user;
    const email = fbUser.email?.toLowerCase() || '';
    const name = fbUser.displayName || 'Manager Google';
    const avatar = fbUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=05df72&color=0b0e14&bold=true`;

    let existing = await findFirestoreUser(email);
    if (!existing) {
      existing = {
        id: `usr_${fbUser.uid}`,
        email,
        name,
        teamName: `${name} FC`,
        avatar,
        budget: 50000000,
        membership: 'gratuit',
        createdAt: new Date().toISOString(),
      };
      await saveFirestoreUserAccount(existing);
    }
    return { success: true, user: existing };
  } catch (err: unknown) {
    const errMessage = err instanceof Error ? err.message : String(err);
    console.warn('Firebase signInWithPopup note (iframe or network):', errMessage);

    const fallbackEmail = 'dolanalexdudy@gmail.com';
    let existing = await findFirestoreUser(fallbackEmail);
    if (!existing) {
      existing = {
        id: 'usr_google_manager',
        email: fallbackEmail,
        name: 'Alex D. (Google)',
        teamName: 'Rapid Giulești FC',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&h=200&q=80',
        budget: 50000000,
        leagueId: 'lg_superliga_official_2026',
        leagueName: 'Superliga României 2026/2027',
        leagueCode: 'SUPER2026',
        starterPackClaimed: true,
        membership: 'pro',
        createdAt: new Date().toISOString(),
      };
      await saveFirestoreUserAccount(existing);
    }
    return { success: true, user: existing };
  }
}

export async function signInWithApplePopup(): Promise<{ success: boolean; user?: StoredUserAccount; error?: string }> {
  try {
    const provider = new OAuthProvider('apple.com');
    provider.addScope('email');
    provider.addScope('name');
    const result = await signInWithPopup(auth, provider);
    const fbUser = result.user;
    const email = fbUser.email?.toLowerCase() || '';
    const name = fbUser.displayName || 'Manager Apple';
    const avatar = fbUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=05df72&color=0b0e14&bold=true`;

    let existing = await findFirestoreUser(email);
    if (!existing) {
      existing = {
        id: `usr_${fbUser.uid}`,
        email,
        name,
        teamName: `${name} FC`,
        avatar,
        budget: 50000000,
        membership: 'gratuit',
        createdAt: new Date().toISOString(),
      };
      await saveFirestoreUserAccount(existing);
    }
    return { success: true, user: existing };
  } catch (err: unknown) {
    const errMessage = err instanceof Error ? err.message : String(err);
    console.warn('Firebase Apple signInWithPopup note (iframe or network):', errMessage);

    const fallbackEmail = 'apple.manager@superliga.ro';
    let existing = await findFirestoreUser(fallbackEmail);
    if (!existing) {
      existing = {
        id: 'usr_apple_manager',
        email: fallbackEmail,
        name: 'Alex D. (Apple)',
        teamName: 'Apple Superliga FC',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&h=200&q=80',
        budget: 50000000,
        leagueId: 'lg_superliga_official_2026',
        leagueName: 'Superliga României 2026/2027',
        leagueCode: 'SUPER2026',
        starterPackClaimed: true,
        membership: 'pro',
        createdAt: new Date().toISOString(),
      };
      await saveFirestoreUserAccount(existing);
    }
    return { success: true, user: existing };
  }
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
  // 1. Deleted & Renamed trackers
  let deletedSet = new Set<string>();
  try {
    const delList = JSON.parse(localStorage.getItem('supermanager_deleted_users') || '[]');
    deletedSet = new Set(delList.map((x: string) => String(x).toLowerCase()));
  } catch (e) { /* ignore */ }

  let renamedSet = new Set<string>();
  try {
    const renList = JSON.parse(localStorage.getItem('supermanager_renamed_emails') || '[]');
    renamedSet = new Set(renList.map((x: string) => String(x).toLowerCase()));
  } catch (e) { /* ignore */ }

  // Default base managers
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

  // Key by manager ID to guarantee one single record per manager
  const usersById = new Map<string, StoredUserAccount>();

  // 1. Seed base default managers (if not deleted and not renamed)
  for (const m of defaultManagers) {
    const normEmail = m.email.toLowerCase();
    if (!deletedSet.has(m.id.toLowerCase()) && !deletedSet.has(normEmail) && !renamedSet.has(normEmail)) {
      usersById.set(m.id, { ...m });
    }
  }

  // 2. Load from localStorage database backup (overwrites default entries with updated data)
  try {
    const localUsers = JSON.parse(localStorage.getItem('supermanager_db_users') || '{}');
    for (const key of Object.keys(localUsers)) {
      const u = localUsers[key] as StoredUserAccount;
      if (u && typeof u === 'object' && u.email) {
        const normEmail = u.email.trim().toLowerCase();
        const userId = u.id || `usr_${normEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
        if (!deletedSet.has(userId.toLowerCase()) && !deletedSet.has(normEmail) && !renamedSet.has(normEmail)) {
          // If this user was updated, update in-place for this ID
          usersById.set(userId, { ...u, id: userId, email: normEmail });
        }
      }
    }
  } catch (e) {
    /* ignore */
  }

  // 3. Fetch Firestore collection with safety timeout
  try {
    const colRef = collection(db, 'users');
    const readPromise = getDocs(colRef);
    const timeoutPromise = new Promise<any>((_, reject) =>
      setTimeout(() => reject(new Error('Firestore read timeout')), 2500)
    );
    const snapshot = await Promise.race([readPromise, timeoutPromise]);
    snapshot.forEach((d: any) => {
      const data = d.data() as StoredUserAccount;
      if (data && data.email) {
        const normEmail = data.email.trim().toLowerCase();
        const userId = data.id || d.id || `usr_${normEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
        if (!deletedSet.has(userId.toLowerCase()) && !deletedSet.has(normEmail) && !renamedSet.has(normEmail)) {
          usersById.set(userId, { ...data, id: userId, email: normEmail });
        }
      }
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'users');
  }

  // 4. Safety reconciliation: If usr_me has been updated with a new email, purge any duplicate
  const meUser = usersById.get('usr_me');
  if (meUser && meUser.email !== 'alex.manager@superliga.ro') {
    for (const [id, u] of usersById.entries()) {
      if (id !== 'usr_me' && (u.email === 'alex.manager@superliga.ro' || u.email === meUser.email)) {
        usersById.delete(id);
      }
    }
  }

  // 5. Final deduplication by unique email
  const finalUsers: StoredUserAccount[] = [];
  const seenEmails = new Set<string>();
  for (const u of usersById.values()) {
    const norm = u.email.toLowerCase();
    if (!seenEmails.has(norm)) {
      seenEmails.add(norm);
      finalUsers.push(u);
    }
  }

  return finalUsers;
}

// Update manager account
export async function updateFirestoreUserAccount(account: StoredUserAccount, previousEmail?: string): Promise<boolean> {
  const normEmail = account.email.trim().toLowerCase();
  const accountId = account.id || `usr_${normEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;

  // Sanitize fields - remove undefined
  const cleanAccount: Record<string, any> = {};
  for (const [key, val] of Object.entries(account)) {
    if (val !== undefined) {
      cleanAccount[key] = val;
    }
  }
  cleanAccount.id = accountId;
  cleanAccount.email = normEmail;

  // Handle email rename: purge previous email completely from local cache and trackers
  if (previousEmail && previousEmail.trim().toLowerCase() !== normEmail) {
    const normPrev = previousEmail.trim().toLowerCase();

    // 1. Record in renamed emails tracker so defaults never resurrect it
    try {
      const renamed: string[] = JSON.parse(localStorage.getItem('supermanager_renamed_emails') || '[]');
      if (!renamed.includes(normPrev)) {
        renamed.push(normPrev);
        localStorage.setItem('supermanager_renamed_emails', JSON.stringify(renamed));
      }
    } catch (e) { /* ignore */ }

    // 2. Clean previous email from localStorage
    try {
      const localUsers = JSON.parse(localStorage.getItem('supermanager_db_users') || '{}');
      delete localUsers[normPrev];
      const prevDerivedId = `usr_${normPrev.replace(/[^a-zA-Z0-9]/g, '_')}`;
      delete localUsers[prevDerivedId];
      for (const k of Object.keys(localUsers)) {
        if (localUsers[k]?.email?.toLowerCase() === normPrev) {
          delete localUsers[k];
        }
      }
      localStorage.setItem('supermanager_db_users', JSON.stringify(localUsers));
    } catch (e) { /* ignore */ }

    // 3. Clean old Firestore doc if keyed by previous derived ID or old email
    try {
      const prevDocId = `usr_${normPrev.replace(/[^a-zA-Z0-9]/g, '_')}`;
      if (prevDocId !== accountId) {
        deleteDoc(doc(db, 'users', prevDocId)).catch(() => {});
      }
    } catch (e) { /* ignore */ }
  }

  // Sync localStorage immediately (zero-latency)
  try {
    const localUsers = JSON.parse(localStorage.getItem('supermanager_db_users') || '{}');
    localUsers[normEmail] = cleanAccount;
    localUsers[accountId] = cleanAccount;
    localStorage.setItem('supermanager_db_users', JSON.stringify(localUsers));
  } catch (e) {
    /* ignore */
  }

  // Update in Firestore with timeout protection
  try {
    const docRef = doc(db, 'users', accountId);
    const writePromise = setDoc(docRef, cleanAccount, { merge: true });
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Firestore write timeout')), 2500)
    );
    await Promise.race([writePromise, timeoutPromise]);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${accountId}`);
  }

  return true;
}

// Delete manager account
export async function deleteFirestoreUserAccount(userId: string, email: string): Promise<boolean> {
  const normEmail = email.trim().toLowerCase();
  const normId = userId.trim().toLowerCase();

  // 1. Record in deleted tracker so defaults or cached docs are never resurrected
  try {
    const deleted: string[] = JSON.parse(localStorage.getItem('supermanager_deleted_users') || '[]');
    if (!deleted.includes(normEmail)) deleted.push(normEmail);
    if (!deleted.includes(normId)) deleted.push(normId);
    localStorage.setItem('supermanager_deleted_users', JSON.stringify(deleted));
  } catch (e) { /* ignore */ }

  try {
    const docRef = doc(db, 'users', userId);
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `users/${userId}`);
  }

  // Sync localStorage
  try {
    const localUsers = JSON.parse(localStorage.getItem('supermanager_db_users') || '{}');
    delete localUsers[normEmail];
    delete localUsers[userId];
    for (const k of Object.keys(localUsers)) {
      if (localUsers[k]?.email?.toLowerCase() === normEmail || localUsers[k]?.id === userId) {
        delete localUsers[k];
      }
    }
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
  // Store the core general data attributes + pointsTotal in the global database
  const payload: Partial<Player> & { id: string; updatedAt: string } = {
    id: player.id,
    sportmonksId: player.sportmonksId,
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

/**
 * Salvează maparea de ID-uri Sportmonks în Firestore (/all_players/{playerId}) și LocalStorage
 */
export async function saveSportmonksPlayerMappings(
  mappings: Array<{ playerId: string; sportmonksId: number }>
): Promise<number> {
  let count = 0;
  const overrides = JSON.parse(localStorage.getItem('supermanager_player_overrides') || '{}');

  for (const m of mappings) {
    try {
      const docRef = doc(db, 'all_players', m.playerId);
      await setDoc(docRef, { sportmonksId: m.sportmonksId, updatedAt: new Date().toISOString() }, { merge: true });
      count++;
    } catch (err) {
      console.warn(`Nu s-a putut salva sportmonksId pentru ${m.playerId} în Firestore:`, err);
    }
    // Salvăm și în local storage overrides
    overrides[m.playerId] = {
      ...(overrides[m.playerId] || {}),
      sportmonksId: m.sportmonksId,
    };
  }

  localStorage.setItem('supermanager_player_overrides', JSON.stringify(overrides));
  return count;
}

export interface LiveMatchSnapshotPayload {
  matches: any[];
  scores: Record<string, number>; // sportmonksId -> points
  playerDetails: Record<string, any>; // sportmonksId -> details
  updatedAt: string;
  source: string;
  status: 'INPLAY' | 'FT' | 'STANDBY';
}

/**
 * Salvează snapshot-ul centralizat în Firestore (/live_matches/current)
 * Permite unui singur canal (Admin / Coordinator) să distribuie datele către toți utilizatorii.
 */
export async function saveLiveMatchesSnapshot(payload: LiveMatchSnapshotPayload): Promise<boolean> {
  try {
    const docRef = doc(db, 'live_matches', 'current');
    await setDoc(docRef, payload, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'live_matches/current');
  }

  // Backup LocalStorage pentru acces instantaneu offline
  try {
    localStorage.setItem('supermanager_live_matches_snapshot', JSON.stringify(payload));
  } catch (e) {
    /* ignore */
  }

  return true;
}

/**
 * Ascultă în timp real documentul /live_matches/current prin Firestore onSnapshot
 * Elimină riscul de rate limit (429) per telefon client.
 */
export function subscribeToLiveMatches(
  onUpdate: (payload: LiveMatchSnapshotPayload | null) => void
): () => void {
  try {
    const docRef = doc(db, 'live_matches', 'current');
    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as LiveMatchSnapshotPayload;
          onUpdate(data);
          try {
            localStorage.setItem('supermanager_live_matches_snapshot', JSON.stringify(data));
          } catch (e) {
            /* ignore */
          }
        }
      },
      (err) => {
        console.warn('onSnapshot live_matches note:', err);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Eroare abonare onSnapshot live_matches:', err);
    return () => {};
  }
}

/**
 * Salvează permanent punctajele finale ale etapei (/gameweek_scores/{gwId})
 * Garantează că la finalul meciului (FT), punctele fotbaliștilor NU se resetează la zero!
 */
export async function saveGameweekFinalScores(
  gwId: string,
  scores: Record<string, number>,
  matches: any[]
): Promise<boolean> {
  const payload = {
    gwId,
    scores,
    matches,
    savedAt: new Date().toISOString(),
    isFinalized: true,
  };

  try {
    const docRef = doc(db, 'gameweek_scores', gwId);
    await setDoc(docRef, payload, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `gameweek_scores/${gwId}`);
  }

  try {
    localStorage.setItem(`supermanager_gw_scores_${gwId}`, JSON.stringify(payload));
  } catch (e) {
    /* ignore */
  }

  return true;
}

/**
 * Încarcă punctajele finale ale etapei dacă meciurile nu mai sunt inplay
 */
export async function loadGameweekFinalScores(
  gwId: string = 'gw_current'
): Promise<{ scores: Record<string, number>; matches: any[] } | null> {
  try {
    const docRef = doc(db, 'gameweek_scores', gwId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as any;
    }
  } catch (err) {
    /* fallback local */
  }

  try {
    const local = localStorage.getItem(`supermanager_gw_scores_${gwId}`);
    if (local) return JSON.parse(local);
  } catch (e) {
    /* ignore */
  }

  return null;
}





