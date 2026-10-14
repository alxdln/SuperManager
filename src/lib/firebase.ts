import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, setDoc, doc, deleteDoc } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Player } from '../types/football';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

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
    return result;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'custom_players');
    return [];
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

