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
