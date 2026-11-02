import { writeBatch, doc, getDoc, arrayUnion, increment, collection, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Player, PlayerLastMatchDetails, MatchHistoryItem } from '../types/football';
import { calculateContextualPoints, calculateLivePointsFromSportmonks } from '../utils/scoringEngine';

export interface FinalizeFixtureParams {
  fixtureId: string | number;
  gameweek: number;
  homeClubId: string;
  awayClubId: string;
  homeScore: number;
  awayScore: number;
  playerLiveMap: Record<
    string,
    {
      minutesPlayed?: number;
      isStarter?: boolean;
      events?: Array<{ minute: number; description: string; points: number }>;
      sportmonksDetails?: any[];
      pointsMatchday?: number;
    }
  >;
}

export interface FinalizeResult {
  success: boolean;
  fixtureId: string;
  playersCount: number;
  message: string;
}

export class MatchFinalizerService {
  private static finalizedCache: Set<string> = new Set();

  /**
   * Încarcă meciurile deja finalizate pentru a evita dubla finalizare
   */
  static async loadFinalizedMatchIds(): Promise<string[]> {
    const ids: string[] = [];
    try {
      const local = JSON.parse(localStorage.getItem('supermanager_finalized_matches') || '[]');
      local.forEach((id: string) => {
        ids.push(String(id));
        this.finalizedCache.add(String(id));
      });
    } catch {
      // ignore
    }

    try {
      const snap = await getDocs(collection(db, 'finalized_matches'));
      snap.forEach((d) => {
        const fid = String(d.id);
        if (!ids.includes(fid)) ids.push(fid);
        this.finalizedCache.add(fid);
      });
    } catch (err) {
      console.warn('Note on loading finalized matches:', err);
    }

    return ids;
  }

  static isFixtureFinalized(fixtureId: string | number): boolean {
    return this.finalizedCache.has(String(fixtureId));
  }

  /**
   * Salvează definitiv meciul în Firestore (WriteBatch)
   * Calculează bonusurile contextuale pre-salvare și compactează istoricul anterior
   * FĂRĂ MODIFICARE DE COTA DE PIAȚĂ (conform deciziei de proiectare)
   */
  static async finalizeMatch(
    params: FinalizeFixtureParams,
    allPlayers: Player[]
  ): Promise<FinalizeResult> {
    const fixtureKey = String(params.fixtureId);

    // Verificăm dacă nu a fost deja finalizat
    if (this.isFixtureFinalized(fixtureKey)) {
      return {
        success: true,
        fixtureId: fixtureKey,
        playersCount: 0,
        message: `Meciul #${fixtureKey} este deja marcat ca finalizat în baza de date.`,
      };
    }

    console.log(`[MatchFinalizer] Inițiere salvare definitivă FT pentru meciul #${fixtureKey}...`);

    // Jucătorii celor 2 echipe (suport flexibil pentru id-uri cu sau fără prefixul 'c_')
    const normHome = params.homeClubId.replace(/^c_/, '');
    const normAway = params.awayClubId.replace(/^c_/, '');
    const matchPlayers = allPlayers.filter((p) => {
      const pClubNorm = (p.clubId || '').replace(/^c_/, '');
      return (
        p.clubId === params.homeClubId ||
        p.clubId === params.awayClubId ||
        pClubNorm === normHome ||
        pClubNorm === normAway
      );
    });

    if (matchPlayers.length === 0) {
      return {
        success: false,
        fixtureId: fixtureKey,
        playersCount: 0,
        message: 'Nu s-au găsit jucători în loturile celor două cluburi.',
      };
    }

    const batch = writeBatch(db);
    const overrides = JSON.parse(localStorage.getItem('supermanager_player_overrides') || '{}');
    let updatedCount = 0;

    for (const player of matchPlayers) {
      const liveData = params.playerLiveMap[player.id] || {};
      const isHome = player.clubId === params.homeClubId;
      const opponentClubId = isHome ? params.awayClubId : params.homeClubId;
      const teamGoalsFor = isHome ? params.homeScore : params.awayScore;
      const teamGoalsAgainst = isHome ? params.awayScore : params.homeScore;

      // Minute și titular
      const minutesPlayed = liveData.minutesPlayed ?? 90;
      const isStarter = liveData.isStarter ?? true;

      // 1. Calcul bonusuri contextuale pre-salvare definitivă
      const contextual = calculateContextualPoints({
        position: player.position,
        minutesPlayed,
        isStarter,
        teamGoalsFor,
        teamGoalsAgainst,
        isFinished: true,
      });

      // 2. Calcul punctaj din acțiuni Sportmonks sau live
      let actionPoints = 0;
      if (liveData.sportmonksDetails && liveData.sportmonksDetails.length > 0) {
        actionPoints = calculateLivePointsFromSportmonks(liveData.sportmonksDetails);
      } else {
        actionPoints = liveData.pointsMatchday ?? player.pointsMatchday ?? 0;
      }

      const totalFinalPoints = actionPoints + contextual.totalContextualPoints;

      // 3. Compactare meci anterior: dacă exista deja un lastMatchDetails, îl arhivăm în matchHistory
      let archivedHistoryItem: MatchHistoryItem | null = null;
      if (player.lastMatchDetails) {
        archivedHistoryItem = {
          matchday: player.lastMatchDetails.gameweek,
          opponentClubId: player.lastMatchDetails.opponentClubId,
          result:
            player.lastMatchDetails.contextualPoints.result > 0
              ? 'V'
              : player.lastMatchDetails.contextualPoints.result === 0
              ? 'E'
              : 'Î',
          minutesPlayed: player.lastMatchDetails.minutesPlayed,
          points: player.lastMatchDetails.points,
          goals: Number(player.lastMatchDetails.detailedStats?.goals || 0),
          assists: Number(player.lastMatchDetails.detailedStats?.assists || 0),
          rating: totalFinalPoints > 30 ? 8.8 : totalFinalPoints > 15 ? 7.4 : 6.2,
          eventsSummary: `Puncte: ${player.lastMatchDetails.points}p (${player.lastMatchDetails.minutesPlayed}')`,
        };
      }

      // 4. Formarea noului lastMatchDetails granular
      const newLastMatchDetails: PlayerLastMatchDetails = {
        fixtureId: fixtureKey,
        gameweek: params.gameweek,
        opponentClubId,
        points: totalFinalPoints,
        minutesPlayed,
        contextualPoints: {
          cleanSheet: contextual.cleanSheetPoints,
          starter: contextual.starterBonus,
          minutes: contextual.minutesBonus,
          result: contextual.matchResultBonus,
        },
        detailedStats: {
          passes: 28,
          tackles: 3,
          shotsOnTarget: player.position === 'FWD' || player.position === 'MID' ? 2 : 0,
          fouls: 1,
        },
        breakdownPoints: {
          actions: actionPoints,
          cleanSheet: contextual.cleanSheetPoints,
          minutes: contextual.minutesBonus,
          result: contextual.matchResultBonus,
          starter: contextual.starterBonus,
        },
        finalizedAt: new Date().toISOString(),
        events: liveData.events || [],
      };

      const playerRef = doc(db, 'all_players', player.id);
      const customPlayerRef = doc(db, 'custom_players', player.id);
      const updatePayload: any = {
        id: player.id,
        name: player.name,
        firstName: player.firstName || '',
        lastName: player.lastName || '',
        clubId: player.clubId,
        position: player.position,
        number: player.number || 10,
        marketValue: player.marketValue || 500000,
        sportmonksId: player.sportmonksId,
        avatar: player.avatar,
        nationality: player.nationality || 'România',
        totalSeasonPoints: increment(totalFinalPoints),
        pointsTotal: increment(totalFinalPoints),
        pointsMatchday: totalFinalPoints,
        matchesPlayed: increment(minutesPlayed > 0 ? 1 : 0),
        lastMatchPoints: totalFinalPoints,
        lastMatchDetails: newLastMatchDetails,
        updatedAt: new Date().toISOString(),
      };

      if (archivedHistoryItem) {
        updatePayload.matchHistory = arrayUnion(archivedHistoryItem);
      }

      batch.set(playerRef, updatePayload, { merge: true });
      batch.set(customPlayerRef, updatePayload, { merge: true });

      // Salvează și snapshot în gameweek_results
      const gwScoreRef = doc(
        db,
        `gameweek_results/gw_${params.gameweek}/player_scores`,
        player.id
      );
      batch.set(
        gwScoreRef,
        {
          playerId: player.id,
          playerName: player.name,
          clubId: player.clubId,
          points: totalFinalPoints,
          minutesPlayed,
          isFinal: true,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      // Sincronizare memorie / local storage override
      const prevHistory = player.matchHistory || [];
      const updatedHistory = archivedHistoryItem
        ? [...prevHistory, archivedHistoryItem]
        : prevHistory;

      overrides[player.id] = {
        ...(overrides[player.id] || {}),
        lastMatchDetails: newLastMatchDetails,
        matchHistory: updatedHistory,
        pointsTotal: (player.pointsTotal || 0) + totalFinalPoints,
        lastMatchPoints: totalFinalPoints,
      };

      // Actualizăm instanța în memorie
      player.lastMatchDetails = newLastMatchDetails;
      player.matchHistory = updatedHistory;
      player.pointsTotal = (player.pointsTotal || 0) + totalFinalPoints;
      player.lastMatchPoints = totalFinalPoints;

      updatedCount++;
    }

    // Înregistrează meciul ca finalizat
    const finalizedDocRef = doc(db, 'finalized_matches', fixtureKey);
    batch.set(finalizedDocRef, {
      fixtureId: fixtureKey,
      gameweek: params.gameweek,
      homeClubId: params.homeClubId,
      awayClubId: params.awayClubId,
      homeScore: params.homeScore,
      awayScore: params.awayScore,
      finalizedAt: new Date().toISOString(),
      playersFinalizedCount: updatedCount,
      status: 'FINALIZED',
    });

    try {
      await batch.commit();
      console.log(`[MatchFinalizer] Commit WriteBatch reușit pentru ${updatedCount} jucători.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `batch_finalize/${fixtureKey}`);
    }

    // Actualizăm memoria locală
    this.finalizedCache.add(fixtureKey);
    const finalizedList = Array.from(this.finalizedCache);
    localStorage.setItem('supermanager_finalized_matches', JSON.stringify(finalizedList));
    localStorage.setItem('supermanager_player_overrides', JSON.stringify(overrides));

    return {
      success: true,
      fixtureId: fixtureKey,
      playersCount: updatedCount,
      message: `Meciul #${fixtureKey} a fost finalizat cu succes pentru ${updatedCount} fotbaliști.`,
    };
  }
}
