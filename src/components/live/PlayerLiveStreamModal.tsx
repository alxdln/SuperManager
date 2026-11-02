import React, { useState, useMemo } from 'react';
import { Player, Fixture, MatchLiveEvent, MatchEventType, PlayerPosition } from '../../types/football';
import { SUPERLIGA_CLUBS } from '../../data/superligaData';
import {
  formatCurrency,
  LIVE_SCORING_CATEGORIES,
  SPORTMONKS_ACTION_POINTS,
  SPORTMONKS_ACTION_LABELS,
  extractDetailValue,
} from '../../utils/scoringEngine';
import { useFantasy } from '../../context/FantasyContext';
import { LiveActionMinuteTracker } from '../../services/liveActionTracker';
import { X, Activity, Flame, Shield, Award, AlertCircle, Clock, CheckCircle2, ChevronRight, BookOpen, Zap, FileSpreadsheet } from 'lucide-react';
import { GoogleSheetsExportModal } from '../common/GoogleSheetsExportModal';
import { AnimatedScoreBadge, getPointsTierColor } from '../common/AnimatedScoreBadge';

interface PlayerLiveStreamModalProps {
  player: Player;
  fixture?: Fixture;
  isCaptain: boolean;
  isStarter: boolean;
  onClose: () => void;
}

const fullPosMap: Record<PlayerPosition, string> = {
  GK: 'PORTAR',
  DEF: 'FUNDAȘ',
  MID: 'MIJLOCAȘ',
  FWD: 'ATACANT',
};

const posColorMap: Record<PlayerPosition, { bg: string; text: string }> = {
  GK: { bg: 'bg-amber-500/20 border-amber-500/40', text: 'text-amber-400' },
  DEF: { bg: 'bg-blue-500/20 border-blue-500/40', text: 'text-blue-400' },
  MID: { bg: 'bg-emerald-500/20 border-emerald-500/40', text: 'text-emerald-400' },
  FWD: { bg: 'bg-rose-500/20 border-rose-500/40', text: 'text-rose-400' },
};

const actionLabelMap: Record<string, { label: string; icon: string; defaultPts: number }> = {
  pass_forward: { label: 'Pase în teren advers', icon: '↗️', defaultPts: 1 },
  key_pass: { label: 'Pase cheie (Key passes)', icon: '✨', defaultPts: 5 },
  long_pass: { label: 'Pase lungi', icon: '📡', defaultPts: 3 },
  assist: { label: 'Pase de gol (Assists)', icon: '🎯', defaultPts: 30 },
  cross_successful: { label: 'Centrări reușite', icon: '💫', defaultPts: 3 },
  shot_on_target: { label: 'Șuturi pe poartă', icon: '🔥', defaultPts: 10 },
  goal: { label: 'Goluri marcate', icon: '⚽', defaultPts: 50 },
  dribble_success: { label: 'Driblinguri reușite', icon: '🕺', defaultPts: 5 },
  dispossessed: { label: 'Mingi pierdute / Deposedat', icon: '⚠️', defaultPts: -3 },
  pass_error: { label: 'Pase greșite', icon: '', defaultPts: -1 },
  shot_missed: { label: 'Șuturi ratate / pe lângă', icon: '💨', defaultPts: -3 },
  big_chance_missed: { label: 'Ocazii mari ratate', icon: '😱', defaultPts: -15 },
  penalty_won: { label: 'Penalty obținut', icon: '🌟', defaultPts: 25 },
  penalty_missed: { label: 'Penalty ratat', icon: '🤦', defaultPts: -30 },
  tackle: { label: 'Deposedări / Tackles', icon: '🛡️', defaultPts: 5 },
  clearance: { label: 'Degajări din careu', icon: '🥊', defaultPts: 5 },
  shot_blocked: { label: 'Șuturi blocate', icon: '🛑', defaultPts: 3 },
  duel_won: { label: 'Dueluri câștigate', icon: '💪', defaultPts: 3 },
  duel_lost: { label: 'Dueluri pierdute', icon: '📉', defaultPts: -1 },
  interception: { label: 'Intercepții', icon: '🧱', defaultPts: 5 },
  recovery: { label: 'Mingi recuperate', icon: '🧱', defaultPts: 3 },
  aerial_won: { label: 'Dueluri aeriene câștigate', icon: '🦘', defaultPts: 3 },
  aerial_lost: { label: 'Dueluri aeriene pierdute', icon: '⬇️', defaultPts: -1 },
  goal_line_clearance: { label: 'Salvare de pe linia porții', icon: '🏰', defaultPts: 25 },
  dribbled_past: { label: 'Driblat de adversar', icon: '🔄', defaultPts: -3 },
  error_lead_to_goal: { label: 'Eroare gravă ce a dus la gol', icon: '💥', defaultPts: -25 },
  foul: { label: 'Faulturi comise', icon: '🚷', defaultPts: -3 },
  foul_drawn: { label: 'Faulturi obținute', icon: '🤕', defaultPts: 1 },
  penalty_conceded: { label: 'Penalty comis', icon: '⛔', defaultPts: -25 },
  yellow_card: { label: 'Cartonaș galben', icon: '🟨', defaultPts: -15 },
  red_card: { label: 'Cartonaș roșu', icon: '🟥', defaultPts: -50 },
  save: { label: 'Parade portar', icon: '🧤', defaultPts: 5 },
  save_in_box: { label: 'Parade din interiorul careului', icon: '🧱', defaultPts: 10 },
  punch: { label: 'Boxări portar', icon: '👊', defaultPts: 3 },
  keeper_sweeper: { label: 'Ieșiri din poartă (Sweeper)', icon: '🏃', defaultPts: 5 },
  high_claim: { label: 'Mingi aeriene prinse', icon: '👐', defaultPts: 3 },
  clean_sheet_bonus: { label: 'Poartă intactă (Clean Sheet)', icon: '🏰', defaultPts: 30 },
  starter_bonus: { label: 'Prezență titular', icon: '⭐', defaultPts: 5 },
  substitute_in_bonus: { label: 'Intrat de pe bancă', icon: '🔄', defaultPts: 3 },
  minutes_bonus: { label: 'Minute jucate', icon: '⏱️', defaultPts: 9 },
  match_won: { label: 'Rezultat meci (Victorie)', icon: '🏆', defaultPts: 15 },
  match_draw: { label: 'Rezultat meci (Egal)', icon: '🤝', defaultPts: 5 },
  match_lost: { label: 'Rezultat meci (Înfrângere)', icon: '💔', defaultPts: -15 },
  team_goal_scored: { label: 'Goluri marcate de echipă', icon: '⚽', defaultPts: 5 },
  team_goal_conceded: { label: 'Goluri primite de echipă', icon: '💔', defaultPts: -5 },
};

// Titluri 100% în limba română pentru fiecare tip de eveniment (fără termeni în engleză)
const RO_EVENT_TITLES: Record<string, string> = {
  goal: 'Gol Marcat',
  assist: 'Pasă de Gol (Assist)',
  shot_on_target: 'Șut pe Poartă',
  shot_missed: 'Șut Ratat / pe Lângă',
  key_pass: 'Pasă Cheie (Key Pass)',
  pass_forward: 'Pasă Precisă Înainte',
  pass_error: 'Pasă Greșită',
  long_pass: 'Pasă Lungă Câștigată',
  cross_successful: 'Centrare Reușită',
  dribble_success: 'Dribling Reușit',
  dispossessed: 'Deposedat / Minge Pierdută',
  big_chance_missed: 'Ocazie Mare Ratată',
  penalty_won: 'Penalty Obținut',
  penalty_missed: 'Penalty Ratat',
  tackle: 'Deposedare Reușită',
  clearance: 'Respingere / Degajare',
  interception: 'Intercepție Reușită',
  recovery: 'Recuperare Balon',
  shot_blocked: 'Șut Blocat',
  duel_won: 'Duel Câștigat',
  duel_lost: 'Duel Pierdut',
  aerial_won: 'Duel Aerian Câștigat',
  aerial_lost: 'Duel Aerian Pierdut',
  goal_line_clearance: 'Salvare de pe Linia Porții',
  dribbled_past: 'Driblat de Adversar',
  error_lead_to_goal: 'Greșeală Directă la Gol',
  foul: 'Fault Comis',
  foul_drawn: 'Fault Obținut',
  penalty_conceded: 'Penalty Comis',
  yellow_card: 'Cartonaș Galben',
  red_card: 'Cartonaș Roșu',
  save: 'Paradă Portar',
  save_in_box: 'Paradă din Careu',
  punch: 'Minge Boxată',
  keeper_sweeper: 'Ieșire din Careu (Sweeper)',
  high_claim: 'Centrare Reținută',
  clean_sheet_bonus: 'Poartă Intactă (Clean Sheet)',
  starter_bonus: 'Prezență Titular',
  substitute_in_bonus: 'Intrat de pe Bancă',
  minutes_bonus: 'Timp pe Teren (Minute Jucate)',
  match_won: 'Rezultat Pozitiv (Victorie)',
  match_draw: 'Rezultat Pozitiv (Egal)',
  match_lost: 'Rezultat Negativ (Înfrângere)',
  team_goal_scored: 'Gol Marcat de Echipă',
  team_goal_conceded: 'Gol Primit de Echipă',
};

export const PlayerLiveStreamModal: React.FC<PlayerLiveStreamModalProps> = ({
  player,
  fixture,
  isCaptain,
  isStarter,
  onClose,
}) => {
  const { sportmonksScores, sportmonksPlayerDetails, sportmonksActiveMatches, fixtures, demoEvents, demoEventsByPlayer } = useFantasy();
  // Tabul implicit este 'player' (Evenimente Live cronologice ale fotbalistului)
  const [activeTab, setActiveTab] = useState<'player' | 'stats' | 'match' | 'rules'>('player');
  const [selectedRuleCategory, setSelectedRuleCategory] = useState<string>('Pase & Atac');
  const [showSheetsModal, setShowSheetsModal] = useState<boolean>(false);

  // Determinare meci și scor în timp real din Sportmonks sau fixture
  const matchFixture = fixture || fixtures.find(
    (f) => f.homeClubId === player.clubId || f.awayClubId === player.clubId || (player.clubId === 'craiova' ? f.id === 'fix_19729653' : f.id === 'fix_19729652')
  );

  const activeSmMatch = sportmonksActiveMatches?.find((m) => {
    if (player.clubId === 'craiova' || player.clubId === 'botosani') {
      return (
        m.id === 19729653 ||
        m.participants?.some(
          (p: any) =>
            p.name?.toLowerCase().includes('craiova') ||
            p.name?.toLowerCase().includes('botoşani') ||
            p.name?.toLowerCase().includes('botosani')
        )
      );
    }
    return (
      m.id === 19729652 ||
      m.homeTeamId === player.clubId ||
      m.awayTeamId === player.clubId ||
      (player.clubId === 'petrolul' || player.clubId === 'cfr')
    );
  }) || sportmonksActiveMatches?.find((m) => m.id === 19729653 || m.id === 19729652);

  const homeClubId = matchFixture?.homeClubId || (player.clubId === 'craiova' ? 'craiova' : 'petrolul');
  const awayClubId = matchFixture?.awayClubId || (player.clubId === 'craiova' ? 'botosani' : 'cfr');

  const homeClub =
    SUPERLIGA_CLUBS.find((c) => c.id === homeClubId) ||
    SUPERLIGA_CLUBS.find((c) => c.id === 'craiova') ||
    SUPERLIGA_CLUBS.find((c) => c.id === 'petrolul');

  const awayClub =
    SUPERLIGA_CLUBS.find((c) => c.id === awayClubId) ||
    SUPERLIGA_CLUBS.find((c) => c.id === 'botosani') ||
    SUPERLIGA_CLUBS.find((c) => c.id === 'cfr');

  const playerClub = SUPERLIGA_CLUBS.find((c) => c.id === player.clubId);

  const smState = (activeSmMatch?.state?.state || activeSmMatch?.state?.short_name || activeSmMatch?.status || '').toUpperCase();
  const isMatchFinished = Boolean(
    smState === 'FT' ||
    smState === 'FINISHED' ||
    smState === 'ENDED' ||
    smState === 'AET' ||
    matchFixture?.isFinished
  );
  const isMatchLive = !isMatchFinished && Boolean(activeSmMatch?.isLive ?? matchFixture?.isLive ?? true);

  const smHomeGoals = activeSmMatch?.scores?.find((s: any) => s.description === 'CURRENT' && (s.score?.participant === 'home' || s.score?.participant === 'participant1'))?.score?.goals ??
    activeSmMatch?.scores?.find((s: any) => s.description === 'CURRENT')?.score?.participant1 ??
    activeSmMatch?.homeScore;
  const smAwayGoals = activeSmMatch?.scores?.find((s: any) => s.description === 'CURRENT' && (s.score?.participant === 'away' || s.score?.participant === 'participant2'))?.score?.goals ??
    activeSmMatch?.scores?.find((s: any) => s.description === 'CURRENT')?.score?.participant2 ??
    activeSmMatch?.awayScore;

  const liveMinute = activeSmMatch?.minute ?? matchFixture?.minute ?? 40;
  const liveHomeScore = smHomeGoals ?? matchFixture?.homeScore ?? 0;
  const liveAwayScore = smAwayGoals ?? matchFixture?.awayScore ?? 0;

  const posFullName = fullPosMap[player.position];
  const posStyle = posColorMap[player.position];

  const smId = player.sportmonksId ? Number(player.sportmonksId) : undefined;
  const smData = smId ? sportmonksPlayerDetails.get(smId) : undefined;
  const smLiveScore = smId ? sportmonksScores.get(smId) : undefined;

  // Evenimentele live reale ale acestui jucător
  const playerFixtureEvents = matchFixture?.events?.filter((ev) => ev.playerId === player.id) || [];
  const playerDemoEvents = demoEventsByPlayer?.[player.id] || demoEvents?.filter((ev) => ev.playerId === player.id) || [];

  // Mapare oficială a codurilor de detalii Sportmonks în tipuri de evenimente SuperManager
  const SPORTMONKS_TYPE_TO_EVENT_TYPE: Record<number, MatchEventType> = {
    52: 'goal',
    79: 'assist',
    86: 'shot_on_target',
    41: 'shot_missed',
    581: 'big_chance_missed',
    117: 'key_pass',
    99: 'cross_successful',
    109: 'dribble_success',
    123: 'long_pass',
    85: 'penalty_won',
    91: 'penalty_missed',
    116: 'pass_forward',
    114: 'pass_error',
    94: 'dispossessed',
    100: 'interception',
    101: 'clearance',
    27267: 'tackle',
    78: 'tackle',
    106: 'duel_won',
    107: 'aerial_won',
    1491: 'duel_lost',
    27266: 'aerial_lost',
    110: 'dribbled_past',
    58: 'shot_blocked',
    102: 'shot_blocked',
    104: 'save_in_box',
    56: 'foul',
    89: 'foul',
    96: 'foul_drawn',
    84: 'yellow_card',
    83: 'red_card',
    82: 'penalty_conceded',
    57: 'save',
    126: 'penalty_save',
    113: 'penalty_save',
    103: 'punch',
    76: 'keeper_sweeper',
    584: 'high_claim',
    582: 'goal_line_clearance',
    571: 'error_lead_to_goal',
    27264: 'long_pass',
    62: 'long_pass',
    66: 'interception',
    97: 'shot_blocked',
    27269: 'pass_forward',
    583: 'tackle',
  };

  // Determinare statut real în meci (Titular vs Rezervă intrată de pe bancă)
  const { isMatchStarter, subInMin, subOutMin, playerTeamId } = useMemo(() => {
    const realEventsFromApi = activeSmMatch?.events || matchFixture?.events || [];
    const playerLineupEntry = activeSmMatch?.lineups?.find((l: any) =>
      (smId && l.player_id === smId) ||
      (l.player_name && player.name && l.player_name.toLowerCase().includes(player.name.toLowerCase()))
    );

    let teamId = playerLineupEntry?.team_id;
    if (!teamId && activeSmMatch?.participants) {
      const isHome = player.clubId === matchFixture?.homeClubId;
      teamId = isHome ? activeSmMatch.participants[0]?.id : activeSmMatch.participants[1]?.id;
    }

    let detectedSubInMin: number | null = null;
    let detectedSubOutMin = 999;

    realEventsFromApi.forEach((e: any) => {
      const evCode = (e.type?.code || e.type_code || e.type?.name || '').toLowerCase();
      const isSub = e.type_id === 18 || evCode.includes('sub');
      if (isSub) {
        const isPlayerEntering =
          (smId && e.player_id === smId) ||
          (player.lastName && e.player_name && e.player_name.toLowerCase().includes(player.lastName.toLowerCase())) ||
          (player.name && e.player_name && player.name.toLowerCase().includes(e.player_name.toLowerCase()));
        const isPlayerLeaving =
          (smId && e.related_player_id === smId) ||
          (player.lastName && e.related_player_name && e.related_player_name.toLowerCase().includes(player.lastName.toLowerCase())) ||
          (player.name && e.related_player_name && player.name.toLowerCase().includes(e.related_player_name.toLowerCase()));

        if (isPlayerEntering) {
          detectedSubInMin = Number(e.minute) || 1;
        }
        if (isPlayerLeaving) {
          detectedSubOutMin = Number(e.minute) || 90;
        }
      }
    });

    let realStarter = true;
    if (playerLineupEntry) {
      if (playerLineupEntry.formation_position !== undefined && playerLineupEntry.formation_position !== null) {
        realStarter = Number(playerLineupEntry.formation_position) > 0;
      } else if (playerLineupEntry.type_id === 12 || playerLineupEntry.lineup_type_id === 12) {
        realStarter = false;
      }
    }
    if (detectedSubInMin !== null) {
      realStarter = false;
    }
    if (smData?.contextual?.starterBonus === 3) {
      realStarter = false;
    }

    const matchCurrentMinute = Math.max(1, Math.min(100, activeSmMatch?.minute || liveMinute || 90));
    let effectiveSubIn: number;
    if (realStarter) {
      effectiveSubIn = 1;
    } else {
      if (detectedSubInMin !== null) {
        effectiveSubIn = detectedSubInMin;
      } else if (smData?.minutes && smData.minutes > 0) {
        effectiveSubIn = Math.max(1, matchCurrentMinute - smData.minutes);
      } else {
        effectiveSubIn = 46;
      }
    }

    return {
      isMatchStarter: realStarter,
      subInMin: effectiveSubIn,
      subOutMin: detectedSubOutMin,
      playerTeamId: teamId,
    };
  }, [activeSmMatch, matchFixture, smId, player.name, player.lastName, player.clubId, smData?.contextual?.starterBonus, smData?.minutes, liveMinute]);

  // Generare cronologică acțiuni individuale din Sportmonks details pentru tabul "Evenimente Live"
  const smGeneratedEvents: MatchLiveEvent[] = useMemo(() => {
    if (!smData?.details || smData.details.length === 0) return [];
    const evs: MatchLiveEvent[] = [];
    const playedMinutes = Math.max(1, Math.min(smData.minutes || (liveMinute || 90), 95));

    // 0. Preluare evenimente oficiale cu MINUTUL EXACT din API-ul Sportmonks (activeSmMatch.events)
    // Asigură că Golurile, Pasele de Gol și Cartonașele au minutul real oficial
    const realEventsFromApi = activeSmMatch?.events || matchFixture?.events || [];
    let officialGoalsCount = 0;
    let officialAssistsCount = 0;
    let officialYellowCardsCount = 0;
    let officialRedCardsCount = 0;

    let hasDirectGoalEvents = false;

    realEventsFromApi.forEach((e: any) => {
      const lastName = player.lastName || '';
      const isDirectPlayer =
        (smId && e.player_id === smId) ||
        (e.player_name && player.name && ((lastName && e.player_name.toLowerCase().includes(lastName.toLowerCase())) || player.name.toLowerCase().includes(e.player_name.toLowerCase())));
      const isAssistingPlayer =
        (smId && e.related_player_id === smId) ||
        (e.related_player_name && player.name && ((lastName && e.related_player_name.toLowerCase().includes(lastName.toLowerCase())) || player.name.toLowerCase().includes(e.related_player_name.toLowerCase())));
      const evCode = (e.type?.code || e.type_code || e.type?.name || '').toLowerCase();
      const evName = (e.type?.name || '').toLowerCase();
      const min = Number(e.minute) || 1;

      // A. Gol marcat direct de acest fotbalist (minutul exact oficial din API!)
      if (isDirectPlayer && (evCode.includes('goal') || evName.includes('goal') || e.type_id === 14 || e.type_id === 15)) {
        officialGoalsCount += 1;
        evs.push({
          id: `sm_real_goal_${player.id}_${e.id || min}`,
          minute: min,
          type: 'goal',
          playerId: player.id,
          playerName: player.name,
          clubId: player.clubId,
          pointsChange: 50,
          description: `Gol Marcat (+50p)`,
        });
      }

      // B. Pasă de gol (Assist) oferită de acest fotbalist (minutul exact oficial din API!)
      if (isAssistingPlayer && (evCode.includes('goal') || evName.includes('goal') || e.type_id === 14 || e.type_id === 15)) {
        officialAssistsCount += 1;
        evs.push({
          id: `sm_real_assist_${player.id}_${e.id || min}`,
          minute: min,
          type: 'assist',
          playerId: player.id,
          playerName: player.name,
          clubId: player.clubId,
          pointsChange: 25,
          description: `Pasă de Gol (Assist) (+25p)`,
        });
      }

      // Verificăm dacă evenimentul este o schimbare (Substitution) - NICIODATĂ cartonaș!
      const isSubEvent = e.type_id === 18 || evCode.includes('sub') || evName.includes('sub');

      // Verificăm dacă este cartonaș roșu direct sau al doilea galben (Yellow-Red / eliminare)
      const isRedOrYellowRed =
        !isSubEvent &&
        (e.type_id === 20 ||
          e.type_id === 21 ||
          evCode === 'redcard' ||
          evCode === 'yellowred' ||
          evCode.includes('yellow-red') ||
          evCode.includes('yellowred') ||
          evName.includes('yellow/red') ||
          evName.includes('second yellow') ||
          (evCode.includes('red') && !evCode.includes('yellow') && !evName.includes('yellow')));

      // Verificăm dacă este cartonaș galben simplu (exclusiv dacă nu e schimbare și nu e eliminare/roșu)
      const isYellowCard =
        !isSubEvent &&
        !isRedOrYellowRed &&
        (e.type_id === 19 ||
          evCode === 'yellowcard' ||
          (evCode.includes('yellow') && !evCode.includes('red') && !evName.includes('red')));

      // C. Cartonaș galben (minutul exact oficial din API)
      if (isDirectPlayer && isYellowCard) {
        officialYellowCardsCount += 1;
        evs.push({
          id: `sm_real_yellow_${player.id}_${e.id || min}`,
          minute: min,
          type: 'yellow_card',
          playerId: player.id,
          playerName: player.name,
          clubId: player.clubId,
          pointsChange: -15,
          description: `Cartonaș Galben (-15p)`,
        });
      }

      // D. Cartonaș roșu direct sau eliminare galben-roșu (decizie utilizator: doar cartonaș roșu cu -50p)
      if (isDirectPlayer && isRedOrYellowRed) {
        officialRedCardsCount += 1;
        evs.push({
          id: `sm_real_red_${player.id}_${e.id || min}`,
          minute: min,
          type: 'red_card',
          playerId: player.id,
          playerName: player.name,
          clubId: player.clubId,
          pointsChange: -50,
          description: `Cartonaș Roșu (-50p)`,
        });
      }

      // E. Gol marcat sau primit de echipa fotbalistului (calculat live, strict dacă fotbalistul a fost pe teren)
      const isGoalEvent =
        e.type_id === 14 ||
        e.type_id === 15 ||
        e.type_id === 16 ||
        evCode.includes('goal');

      if (isGoalEvent) {
        hasDirectGoalEvents = true;
        const goalMin = min;
        const wasOnPitch = subInMin !== null && subInMin <= goalMin && subOutMin >= goalMin;
        if (wasOnPitch && playerTeamId) {
          const isOwnGoal = e.type_id === 15 || evCode.includes('own');
          const scoredByMyTeam = e.participant_id === playerTeamId;
          if ((scoredByMyTeam && !isOwnGoal) || (!scoredByMyTeam && isOwnGoal)) {
            evs.push({
              id: `sm_team_goal_scored_${player.id}_${e.id || goalMin}`,
              minute: goalMin,
              type: 'team_goal_scored',
              playerId: player.id,
              playerName: player.name,
              clubId: player.clubId,
              pointsChange: 5,
              description: 'Gol marcat de echipă (+5p)',
            });
          } else {
            evs.push({
              id: `sm_team_goal_conceded_${player.id}_${e.id || goalMin}`,
              minute: goalMin,
              type: 'team_goal_conceded',
              playerId: player.id,
              playerName: player.name,
              clubId: player.clubId,
              pointsChange: -5,
              description: 'Gol primit de echipă (-5p)',
            });
          }
        }
      }
    });

    // Fallback pentru afișare evenimente gol echipă dacă API-ul nu a transmis evenimente individuale de gol
    if (!hasDirectGoalEvents && smData.contextual) {
      const activeStart = subInMin;
      const activeEnd = Math.min(
        subOutMin,
        isMatchStarter ? Math.max(activeStart + 1, playedMinutes) : activeStart + Math.max(1, smData.minutes || playedMinutes)
      );
      const span = Math.max(1, activeEnd - activeStart);

      if (smData.contextual.teamScoredCount > 0) {
        for (let i = 0; i < smData.contextual.teamScoredCount; i++) {
          const fakeMin = Math.round(activeStart + ((i + 1) * span) / (smData.contextual.teamScoredCount + 1));
          evs.push({
            id: `sm_team_goal_scored_${player.id}_fallback_${i + 1}`,
            minute: fakeMin,
            type: 'team_goal_scored',
            playerId: player.id,
            playerName: player.name,
            clubId: player.clubId,
            pointsChange: 5,
            description: 'Gol marcat de echipă (+5p)',
          });
        }
      }
      if (smData.contextual.teamConcededCount > 0) {
        for (let i = 0; i < smData.contextual.teamConcededCount; i++) {
          const fakeMin = Math.round(activeStart + ((i + 1) * span) / (smData.contextual.teamConcededCount + 1));
          evs.push({
            id: `sm_team_goal_conceded_${player.id}_fallback_${i + 1}`,
            minute: fakeMin,
            type: 'team_goal_conceded',
            playerId: player.id,
            playerName: player.name,
            clubId: player.clubId,
            pointsChange: -5,
            description: 'Gol primit de echipă (-5p)',
          });
        }
      }
    }

    // 1. Acțiuni pure de joc (afișate fiecare separat / extra, nu grupate, cu anti-duplicare pentru cele preluate deja din events)
    let explicitPassErrorsCount = 0;
    for (const d of smData.details) {
      if (d.type_id === 119 || d.type_id === 117172) continue;
      const rawCount = extractDetailValue(d);

      // Cartonașele sunt validate și afișate exclusiv din evenimentele oficiale de protocol API (realEventsFromApi)
      if (d.type_id === 84 || d.type_id === 83) {
        if (realEventsFromApi.length > 0) {
          continue;
        }
      }

      // Eliminăm dublarea golurilor și paselor de gol deja extrase din events oficial
      let count = rawCount;
      if (d.type_id === 52) count = Math.max(0, rawCount - officialGoalsCount);
      if (d.type_id === 79) count = Math.max(0, rawCount - officialAssistsCount);
      if (d.type_id === 84) count = Math.max(0, rawCount - officialYellowCardsCount);
      if (d.type_id === 83) count = Math.max(0, rawCount - officialRedCardsCount);

      const rule = SPORTMONKS_ACTION_LABELS[d.type_id];
      const pts = SPORTMONKS_ACTION_POINTS[d.type_id];
      const evType = SPORTMONKS_TYPE_TO_EVENT_TYPE[d.type_id] || (d.type_id === 114 ? 'pass_error' : 'pass_forward');

      if (d.type_id === 114) {
        explicitPassErrorsCount += rawCount;
      }

      if (rule && pts !== undefined && count > 0) {
        for (let i = 0; i < count; i++) {
          const eventMin = LiveActionMinuteTracker.getActionMinute({
            fixtureId: activeSmMatch?.id || matchFixture?.id || 'active',
            playerId: player.id,
            typeId: d.type_id,
            occurrenceIndex: i + 1,
            totalCount: count,
            playedMinutes,
            subInMin,
            subOutMin,
            playerTeamId,
            realEventsFromApi,
            playerName: player.name,
          });

          evs.push({
            id: `sm_ev_${player.id}_${d.type_id}_occ_${i + 1}`,
            minute: eventMin,
            type: evType,
            playerId: player.id,
            playerName: player.name,
            clubId: player.clubId,
            pointsChange: pts,
            description: `${rule.label} (${pts >= 0 ? '+' : ''}${pts}p)`,
          });
        }
      }
    }

    // 2. Asigurăm că pasele greșite apar întotdeauna (-1p per pasă greșită):
    // Dacă API-ul nu a transmis direct type 114, calculăm diferența: total pase (80) - pase reușite (116)
    if (explicitPassErrorsCount === 0) {
      const totPDetail = smData.details.find((d) => d.type_id === 80);
      const accPDetail = smData.details.find((d) => d.type_id === 116 || d.type_id === 115);
      if (totPDetail && accPDetail) {
        const totP = extractDetailValue(totPDetail);
        const accP = extractDetailValue(accPDetail);
        const passErrors = Math.max(0, totP - accP);
        for (let i = 0; i < passErrors; i++) {
          const eventMin = LiveActionMinuteTracker.getActionMinute({
            fixtureId: activeSmMatch?.id || matchFixture?.id || 'active',
            playerId: player.id,
            typeId: 114,
            occurrenceIndex: i + 1,
            totalCount: passErrors,
            playedMinutes,
            subInMin,
            subOutMin,
            playerTeamId,
            realEventsFromApi,
            playerName: player.name,
          });

          evs.push({
            id: `sm_ev_${player.id}_pass_error_${i + 1}`,
            minute: eventMin,
            type: 'pass_error',
            playerId: player.id,
            playerName: player.name,
            clubId: player.clubId,
            pointsChange: -1,
            description: 'Pasă Greșită (-1p)',
          });
        }
      }
    }

    // 3. Bonus de prezență (Titular vs Intrat de pe bancă)
    if (smData.contextual) {
      const ctx = smData.contextual;
      if (ctx.starterBonus > 0) {
        if (isMatchStarter) {
          evs.push({
            id: `sm_ev_ctx_starter_${player.id}`,
            minute: 1,
            type: 'starter_bonus',
            playerId: player.id,
            playerName: player.name,
            clubId: player.clubId,
            pointsChange: ctx.starterBonus,
            description: `Prezență Titular (+${ctx.starterBonus}p)`,
          });
        } else {
          evs.push({
            id: `sm_ev_ctx_sub_${player.id}`,
            minute: subInMin,
            type: 'substitute_in_bonus',
            playerId: player.id,
            playerName: player.name,
            clubId: player.clubId,
            pointsChange: ctx.starterBonus,
            description: `Intrat de pe Bancă (+${ctx.starterBonus}p)`,
          });
        }
      }

      // 4. Bonusuri de FINAL de meci (minute jucate, victorie/înfrângere, clean sheet)
      // Conform cerinței: se afișează DOAR după terminarea meciului (FT / isMatchFinished) și sunt poziționate SUS DE TOT (minut 999)!
      if (isMatchFinished) {
        if (ctx.cleanSheetPoints > 0) {
          evs.push({
            id: `sm_ev_ctx_cs_${player.id}`,
            minute: 999, // Minut prioritar maxim pentru a apărea sus de tot
            type: 'clean_sheet_bonus',
            playerId: player.id,
            playerName: player.name,
            clubId: player.clubId,
            pointsChange: ctx.cleanSheetPoints,
            description: `Poartă Intactă (Clean Sheet Final) (+${ctx.cleanSheetPoints}p)`,
          });
        }
        if (ctx.matchResultBonus && ctx.matchResultBonus !== 0) {
          evs.push({
            id: `sm_ev_ctx_res_${player.id}`,
            minute: 999, // Minut prioritar maxim pentru a apărea sus de tot
            type: ctx.matchResultBonus > 0 ? 'match_won' : 'match_lost',
            playerId: player.id,
            playerName: player.name,
            clubId: player.clubId,
            pointsChange: ctx.matchResultBonus,
            description: ctx.matchResultBonus > 0 ? `Rezultat Final: Victorie Echipă (+${ctx.matchResultBonus}p)` : `Rezultat Final: Înfrângere Echipă (${ctx.matchResultBonus}p)`,
          });
        }
        if (ctx.minutesBonus > 0) {
          evs.push({
            id: `sm_ev_ctx_min_${player.id}`,
            minute: 999, // Minut prioritar maxim pentru a apărea sus de tot
            type: 'minutes_bonus',
            playerId: player.id,
            playerName: player.name,
            clubId: player.clubId,
            pointsChange: ctx.minutesBonus,
            description: `Timp pe Teren Final (${smData.minutes}') (+${ctx.minutesBonus}p)`,
          });
        }
      }
    }

    return evs;
  }, [smData, player.id, player.name, player.lastName, player.clubId, isMatchStarter, subInMin, subOutMin, playerTeamId, liveMinute, isMatchFinished, activeSmMatch?.events, matchFixture?.events, smId]);

  const rawPlayerEvents = useMemo(() => {
    if (playerDemoEvents.length > 0) {
      return [...playerDemoEvents, ...playerFixtureEvents];
    }
    if (smGeneratedEvents.length > 0) {
      return [...playerFixtureEvents, ...smGeneratedEvents];
    }
    return playerFixtureEvents;
  }, [playerDemoEvents, playerFixtureEvents, smGeneratedEvents]);

  // Sortează ca cele mai recente evenimente să fie afișate sus, mergând cronologic în jos
  const playerEvents = useMemo(() => {
    return [...rawPlayerEvents].sort((a, b) => {
      if (b.minute !== a.minute) return b.minute - a.minute;
      return b.id.localeCompare(a.id);
    });
  }, [rawPlayerEvents]);

  // Calcul matematic exact dinamic din evenimentele reale ale meciului
  const eventsSum = useMemo(() => {
    return playerEvents.reduce((acc, ev) => acc + (ev.pointsChange || 0), 0);
  }, [playerEvents]);

  // Punctajul de bază: calculat direct din Sportmonks live sau din evenimentele reale
  const basePoints = typeof smLiveScore === 'number'
    ? smLiveScore
    : playerEvents.length > 0
    ? eventsSum
    : player.pointsMatchday;
  const multiplier = isCaptain ? 2 : 1;
  const totalEarned = basePoints * multiplier;

  // Agregare dinamică a acțiunilor produse în teren
  const actionCounts = useMemo(() => {
    // 1. Dacă fotbalistul are statistici directe din Sportmonks lineups.details
    if (smData?.details && smData.details.length > 0) {
      const list: Array<{ type: string; count: number; totalPoints: number; ptsPer: number; label: string; icon: string }> = [];
      for (const d of smData.details) {
        if (d.type_id === 119 || d.type_id === 117172) continue;
        const count = extractDetailValue(d);
        const rule = SPORTMONKS_ACTION_LABELS[d.type_id];
        const pts = SPORTMONKS_ACTION_POINTS[d.type_id];
        if (rule && pts !== undefined && count > 0) {
          list.push({
            type: `sm_${d.type_id}`,
            count,
            totalPoints: count * pts,
            ptsPer: pts,
            label: rule.label,
            icon: rule.icon,
          });
        }
      }

      // Adăugare pase greșite deduse (80 - 116) dacă nu au fost furnizate direct de API
      const hasExplicitPassErrors = smData.details.some((d) => d.type_id === 114);
      if (!hasExplicitPassErrors) {
        const totPDetail = smData.details.find((d) => d.type_id === 80);
        const accPDetail = smData.details.find((d) => d.type_id === 116 || d.type_id === 115);
        if (totPDetail && accPDetail) {
          const totP = extractDetailValue(totPDetail);
          const accP = extractDetailValue(accPDetail);
          const passErrors = Math.max(0, totP - accP);
          if (passErrors > 0) {
            list.push({
              type: 'sm_114',
              count: passErrors,
              totalPoints: passErrors * -1,
              ptsPer: -1,
              label: 'Pasă Greșită',
              icon: '',
            });
          }
        }
      }

      // Adăugare bonusuri contextuale
      if (smData.contextual) {
        const ctx = smData.contextual;
        if (ctx.starterBonus > 0) {
          list.push({
            type: 'ctx_starter',
            count: 1,
            totalPoints: ctx.starterBonus,
            ptsPer: ctx.starterBonus,
            label: isMatchStarter ? 'Prezență Titular' : 'Intrat de pe Bancă',
            icon: isMatchStarter ? '⭐' : '🔄',
          });
        }
        if (ctx.teamScoredCount && ctx.teamScoredCount > 0) {
          list.push({
            type: 'team_goal_scored',
            count: ctx.teamScoredCount,
            totalPoints: ctx.teamScoredPoints,
            ptsPer: 5,
            label: 'Gol marcat de echipă',
            icon: '⚽',
          });
        }
        if (ctx.teamConcededCount && ctx.teamConcededCount > 0) {
          list.push({
            type: 'team_goal_conceded',
            count: ctx.teamConcededCount,
            totalPoints: ctx.teamConcededPoints,
            ptsPer: -5,
            label: 'Gol primit de echipă',
            icon: '💔',
          });
        }
        if (ctx.minutesBonus > 0) {
          list.push({
            type: 'ctx_minutes',
            count: 1,
            totalPoints: ctx.minutesBonus,
            ptsPer: ctx.minutesBonus,
            label: `Minute jucate (${smData.minutes}')`,
            icon: '⏱️',
          });
        }
        if (ctx.cleanSheetPoints > 0) {
          list.push({
            type: 'ctx_cleansheet',
            count: 1,
            totalPoints: ctx.cleanSheetPoints,
            ptsPer: ctx.cleanSheetPoints,
            label: 'Poartă Intactă (Clean Sheet)',
            icon: '🏰',
          });
        }
        if (ctx.matchResultBonus && ctx.matchResultBonus !== 0) {
          list.push({
            type: 'ctx_result',
            count: 1,
            totalPoints: ctx.matchResultBonus,
            ptsPer: ctx.matchResultBonus,
            label: ctx.matchResultBonus > 0 ? 'Rezultat Pozitiv Echipă' : 'Rezultat Negativ Echipă',
            icon: '🏆',
          });
        }
      }

      return list;
    }

    // 2. Fallback pe playerEvents (meci demo sau simulare)
    const map = new Map<string, { count: number; totalPoints: number; ptsPer: number; label: string; icon: string }>();

    playerEvents.forEach((ev) => {
      const type = ev.type || 'unknown';
      const meta = actionLabelMap[type] || {
        label: ev.description?.split('–')?.[1]?.trim() || type.replace(/_/g, ' '),
        icon: '⚡',
        defaultPts: ev.pointsChange,
      };

      const existing = map.get(type);
      if (existing) {
        existing.count += 1;
        existing.totalPoints += ev.pointsChange;
      } else {
        map.set(type, {
          count: 1,
          totalPoints: ev.pointsChange,
          ptsPer: ev.pointsChange,
          label: meta.label,
          icon: meta.icon,
        });
      }
    });

    return Array.from(map.entries()).map(([type, data]) => ({
      type,
      ...data,
    }));
  }, [playerEvents, smData, isMatchStarter]);

  const getEventIcon = (type: MatchLiveEvent['type']) => {
    switch (type) {
      // Pase & Atac
      case 'goal': return '⚽';
      case 'assist': return '🎯';
      case 'shot_on_target': return '🔥';
      case 'shot_missed': return '💨';
      case 'key_pass': return '✨';
      case 'pass_forward': return '↗️';
      case 'long_pass': return '📡';
      case 'cross_successful': return '💫';
      case 'dribble_success': return '🕺';
      case 'dispossessed': return '⚠️';
      case 'pass_error': return '';
      case 'big_chance_missed': return '😱';
      case 'penalty_won': return '🌟';
      case 'penalty_missed': return '🤦';

      // Dueluri & Apărare
      case 'tackle': return '🛡️';
      case 'clearance': return '🥊';
      case 'interception':
      case 'recovery': return '🧱';
      case 'shot_blocked': return '🛑';
      case 'duel_won': return '💪';
      case 'duel_lost': return '📉';
      case 'aerial_won': return '🦘';
      case 'aerial_lost': return '⬇️';
      case 'goal_line_clearance': return '🏰';
      case 'dribbled_past': return '🔄';
      case 'error_lead_to_goal': return '💥';

      // Disciplină
      case 'foul': return '🚷';
      case 'foul_drawn': return '🤕';
      case 'penalty_conceded': return '⛔';
      case 'yellow_card': return '🟨';
      case 'red_card': return '🟥';

      // Portar
      case 'save':
      case 'save_in_box': return '🧤';
      case 'punch': return '👊';
      case 'keeper_sweeper': return '🏃';
      case 'high_claim': return '👐';
      case 'clean_sheet_bonus': return '🏰';

      // Meci
      case 'match_won': return '🏆';
      case 'match_draw': return '🤝';
      case 'match_lost': return '💔';
      case 'team_goal_scored': return '⚽';
      case 'team_goal_conceded': return '💔';
      case 'starter_bonus': return '⭐';
      case 'substitute_in_bonus': return '🔄';
      case 'minutes_bonus': return '⏱️';

      default: return '⚡';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg max-h-[90vh] bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Mobile handle */}
        <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto my-2 sm:hidden" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <span>Flux Evenimente Live &amp; Puncte</span>
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Player Header Banner */}
        <div className="p-4 bg-gradient-to-b from-slate-800/80 to-slate-900/60 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img
                  src={player.avatar}
                  alt={player.name}
                  className="w-14 h-14 rounded-2xl object-cover border-2 border-slate-700 shadow-md"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=0f172a&color=05df72&bold=true`;
                  }}
                />
                {isCaptain && (
                  <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-slate-950 font-black text-[9px] px-1.5 py-0.2 rounded-full shadow-lg border border-amber-300">
                    👑 C
                  </span>
                )}
              </div>

              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`inline-flex items-center text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg border ${posStyle.bg} ${posStyle.text}`}>
                    {posFullName}
                  </span>
                  <h3 className="text-base font-black uppercase tracking-tight text-white">{player.name}</h3>
                </div>

                <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                  <span className="font-semibold text-slate-300">{playerClub?.name}</span>
                  <span>·</span>
                  <span className={isMatchStarter ? 'text-emerald-400 font-bold' : 'text-slate-400 font-semibold'}>
                    {isMatchStarter ? 'Titular' : `Rezervă (Intrat ${subInMin}')`}
                  </span>
                  {isCaptain && (
                    <>
                      <span>·</span>
                      <span className="text-amber-400 font-bold">Căpitan (x2)</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Matchday Points KPI Badge */}
            <div className="text-right bg-slate-950/70 border border-slate-800 p-2.5 rounded-2xl">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block mb-0.5">
                Puncte Etapă
              </span>
              <AnimatedScoreBadge score={totalEarned} prefixPlus={true} suffix="pts" size="lg" />
              {isCaptain && (
                <span className="text-[9px] text-amber-300 font-mono block mt-0.5">
                  ({basePoints}p x 2 Căpitan)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Match Scoreboard Strip */}
        <div className="px-4 py-3 bg-slate-950/70 border-b border-slate-800/80">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="truncate max-w-[200px] font-medium text-slate-300">
              {homeClub?.stadium || 'Stadion Ilie Oană, Ploiești'}
            </span>
            {isMatchLive && !isMatchFinished ? (
              <span className="flex items-center gap-1.5 text-rose-400 font-mono font-black text-xs bg-rose-950/90 border border-rose-800 px-2.5 py-0.5 rounded-full shadow-sm">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                Minutul {liveMinute}&apos; (LIVE)
              </span>
            ) : isMatchFinished ? (
              <span className="text-slate-200 font-mono font-bold text-xs bg-slate-800 border border-slate-700 px-2.5 py-0.5 rounded-full">
                Meci Încheiat (Final FT)
              </span>
            ) : (
              <span className="text-emerald-400 font-mono text-xs bg-slate-800 px-2.5 py-0.5 rounded-full">
                Programat {matchFixture?.scheduledTime || 'Live'}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between bg-slate-900/90 p-3 rounded-2xl border border-slate-800 shadow-md">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs text-white shrink-0 shadow"
                style={{ backgroundColor: homeClub?.logoColor || '#eab308' }}
              >
                {homeClub?.badgeText || 'P52'}
              </div>
              <div className="min-w-0">
                <span className="text-xs font-black text-white truncate block">
                  {homeClub?.name || 'Petrolul Ploiești'}
                </span>
                <span className="text-[10px] text-slate-400 font-semibold">Gazde</span>
              </div>
            </div>

            <div className="font-mono font-black text-2xl text-white px-4 tracking-wider shrink-0 bg-slate-950/80 border border-slate-800 rounded-xl py-1 shadow-inner">
              {liveHomeScore} - {liveAwayScore}
            </div>

            <div className="flex items-center gap-2.5 min-w-0 flex-1 justify-end text-right">
              <div className="min-w-0">
                <span className="text-xs font-black text-white truncate block">
                  {awayClub?.name || 'CFR 1907 Cluj'}
                </span>
                <span className="text-[10px] text-slate-400 font-semibold">Oaspeți</span>
              </div>
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs text-white shrink-0 shadow"
                style={{ backgroundColor: awayClub?.logoColor || '#800000' }}
              >
                {awayClub?.badgeText || 'CFR'}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Inner Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-900/50 px-4 pt-2 gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('player')}
            className={`py-2 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'player'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" /> Evenimente Live ({playerEvents.length})
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`py-2 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'stats'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" /> Defalcare Acțiuni &amp; Impact ({actionCounts.length})
          </button>
          <button
            onClick={() => setActiveTab('match')}
            className={`py-2 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'match'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5" /> Cronologie Meci ({fixture?.events?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`py-2 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'rules'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" /> Grilă Puncte
          </button>
        </div>

        {/* Scrollable Events Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {activeTab === 'stats' && (
            <div className="space-y-3">
              {/* Sportmonks Connection Badge */}
              <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-white block">
                      Sportmonks v3 Lineup Stats
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Calcul direct puncte Kickbase per acțiune statistică
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono text-slate-400">ID:</span>
                  <span className="text-xs font-mono font-bold text-amber-400 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800">
                    #{player.sportmonksId || '374921'}
                  </span>
                </div>
              </div>

              {/* Contextual Match Bonuses (Clean Sheet, Starter, Result, Minutes) */}
              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                    Bonusuri Contextuale Meci (Kickbase)
                  </span>
                  <span className="text-[9px] text-amber-400 font-mono">
                    Acordate la final (FT)
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px]">
                  <div className="p-1.5 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-400">Prezență:</span>
                    <span className="font-bold text-emerald-400">{isMatchStarter ? 'Titular +5p' : 'Intrat de pe bancă +3p'}</span>
                  </div>
                  <div className="p-1.5 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-400">Clean Sheet:</span>
                    <span className={`font-bold ${player.position === 'GK' || player.position === 'DEF' ? 'text-blue-400' : 'text-slate-500'}`}>
                      {player.position === 'GK' ? '+30p GK' : player.position === 'DEF' ? '+15p DEF' : 'N/A'}
                    </span>
                  </div>
                  <div className="p-1.5 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-400">Rezultat:</span>
                    <span className="font-bold text-amber-400">W +15p | D +5p</span>
                  </div>
                  <div className="p-1.5 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-400">Timp Joc:</span>
                    <span className="font-bold text-emerald-400">+1p / 10m</span>
                  </div>
                </div>
              </div>

              {/* Dynamic Breakdown Grid of Specific Actions (Calculat dinamic din evenimentele reale) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Defalcare Acțiuni &amp; Impact Punctaj ({posFullName})
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold">
                    {actionCounts.length} tipuri de acțiuni
                  </span>
                </div>

                {actionCounts.length > 0 ? (
                  <div className="grid grid-cols-1 gap-1.5">
                    {actionCounts.map((act) => {
                      const captainImpact = act.totalPoints * multiplier;
                      return (
                        <div
                          key={act.type}
                          className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {Boolean(act.icon) && <span className="text-sm shrink-0">{act.icon}</span>}
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-white block truncate">{act.label}</span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {act.count} acțiuni × {act.ptsPer >= 0 ? `+${act.ptsPer}` : act.ptsPer}p
                              </span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span
                              className={`font-mono text-xs font-bold px-2 py-0.5 rounded-lg inline-block ${
                                captainImpact >= 0
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              }`}
                            >
                              {captainImpact >= 0 ? `+${captainImpact}` : captainImpact} pts
                            </span>
                            {isCaptain && <span className="text-[8px] text-amber-300 font-mono block">x2 (C)</span>}
                          </div>
                        </div>
                      );
                    })}

                    {/* Total Summary Row */}
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between mt-2">
                      <span className="text-xs font-bold text-slate-300">Total Acțiuni Meci:</span>
                      <div className="text-right">
                        <AnimatedScoreBadge score={totalEarned} prefixPlus={true} suffix="pts" size="md" />
                        {isCaptain && (
                          <span className="text-[9px] text-amber-300 font-mono block mt-0.5">
                            ({basePoints}p x 2 Căpitan)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl bg-slate-950/60 border border-dashed border-slate-800 text-center space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-slate-800/80 flex items-center justify-center mx-auto text-slate-400">
                      <Zap className="w-5 h-5 text-amber-400" />
                    </div>
                    <h4 className="text-xs font-bold text-white">Nicio acțiune înregistrată încă în meci</h4>
                    <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                      Fotbalistul are în acest moment <b>0 puncte</b>. Pe măsură ce meciul avansează, fiecare pasă, șut, duel sau deposedare va apărea aici contorizată în timp real.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'player' && (
            <>
              {playerEvents.length > 0 ? (
                <div className="space-y-2.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                    Acțiuni Înregistrate în Timp Real
                  </span>
                  {playerEvents.map((ev) => {
                    const eventPoints = ev.pointsChange * multiplier;
                    return (
                      <div
                        key={ev.id}
                        className={`p-3 rounded-2xl border flex items-start justify-between gap-3 shadow-sm transition-all ${
                          ev.minute >= 900
                            ? 'bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border-amber-500/50 shadow-md ring-1 ring-amber-500/20'
                            : 'bg-slate-800/60 border-slate-700/70 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <span
                            className={`font-mono text-xs font-black px-2 py-0.5 rounded-lg shrink-0 mt-0.5 shadow-sm border ${
                              ev.minute >= 900
                                ? 'bg-amber-500 text-slate-950 border-amber-400 font-extrabold'
                                : 'bg-slate-950 text-amber-400 border-slate-800'
                            }`}
                          >
                            {ev.minute >= 900 ? 'FINAL' : `${ev.minute}'`}
                          </span>

                          <div className="min-w-0">
                            <h4 className="text-sm sm:text-base font-black text-white tracking-tight leading-snug">
                              {RO_EVENT_TITLES[ev.type] || ev.description || 'Acțiune de Joc'}
                            </h4>
                            <p className="text-xs text-slate-300 mt-0.5 leading-snug font-medium">
                              {ev.description}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span
                            className={`font-mono text-xs sm:text-sm font-black px-2.5 py-1 rounded-xl block ${
                              eventPoints >= 0
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {eventPoints >= 0 ? `+${eventPoints}` : eventPoints} pts
                          </span>
                          {isCaptain && (
                            <span className="text-[9px] text-amber-300 font-mono block mt-0.5 font-bold">
                              x2 (C)
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-5 rounded-2xl bg-slate-800/30 border border-dashed border-slate-700 text-center space-y-2">
                  <Activity className="w-7 h-7 text-emerald-400 mx-auto animate-pulse" />
                  <h4 className="text-xs font-bold text-white">Jucător activ pe teren</h4>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                    {fixture?.isLive
                      ? `Meciul este în desfășurare (minutul ${fixture.minute}'). Toate acțiunile fotbalistului (pase cheie, șuturi, deposedări, goluri) vor genera puncte în timp real.`
                      : fixture?.isFinished
                      ? 'Meciul s-a încheiat. Punctajul oficial obținut este calculat în clasamentul etapei.'
                      : `Meciul este programat la ${fixture?.scheduledTime || 'această etapă'}. Punctajul va porni automat la fluierul de start.`}
                  </p>
                </div>
              )}

              {/* Quick Preview Scoring Matrix for Position */}
              <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Puncte Cheie Poziție ({posFullName})
                  </span>
                  <button
                    onClick={() => setActiveTab('rules')}
                    className="text-[10px] text-emerald-400 hover:underline font-bold"
                  >
                    Vezi toate regulile →
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                  <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-900 border border-slate-800/80">
                    <span>⚽ Gol marcat</span>
                    <span className="font-mono text-emerald-400 font-bold">+50p</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-900 border border-slate-800/80">
                    <span>🎯 Pasă de gol</span>
                    <span className="font-mono text-emerald-400 font-bold">+30p</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-900 border border-slate-800/80">
                    <span>🔥 Șut pe poartă</span>
                    <span className="font-mono text-emerald-400 font-bold">+10p</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-900 border border-slate-800/80">
                    <span>🛡️ Deposedare / Int.</span>
                    <span className="font-mono text-emerald-400 font-bold">+5p</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'match' && (
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                Cronologia Meciului
              </span>
              {fixture?.events && fixture.events.length > 0 ? (
                [...fixture.events]
                  .sort((a, b) => b.minute - a.minute)
                  .map((ev) => {
                  const isThisPlayer = ev.playerId === player.id;
                  return (
                    <div
                      key={ev.id}
                      className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                        isThisPlayer
                          ? 'bg-emerald-950/40 border-emerald-500/60 text-white font-semibold'
                          : 'bg-slate-800/40 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-xs font-bold text-amber-400 bg-slate-950 px-1.5 py-0.2 rounded border border-slate-800">
                          {ev.minute}&apos;
                        </span>
                        <span className="truncate">{ev.description}</span>
                      </div>
                      <span className="font-mono font-bold text-emerald-400 ml-2 shrink-0">
                        {ev.pointsChange >= 0 ? `+${ev.pointsChange}` : ev.pointsChange}p
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-6 text-xs text-slate-400">
                  Nu sunt acțiuni înregistrate încă pentru acest meci.
                </div>
              )}
            </div>
          )}

          {activeTab === 'rules' && (
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {LIVE_SCORING_CATEGORIES.map((cat) => (
                  <button
                    key={cat.category}
                    onClick={() => setSelectedRuleCategory(cat.category)}
                    className={`py-1 px-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                      selectedRuleCategory === cat.category
                        ? 'bg-emerald-500 text-slate-950 shadow-md'
                        : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.category}</span>
                  </button>
                ))}
              </div>

              {/* Rules List for Selected Category */}
              {(() => {
                const cur = LIVE_SCORING_CATEGORIES.find((c) => c.category === selectedRuleCategory);
                if (!cur) return null;
                return (
                  <div className="space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                      {cur.icon} {cur.category} — Puncte per Acțiune
                    </span>
                    <div className="space-y-1">
                      {cur.rules.map((r, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 rounded-xl bg-slate-850 border border-slate-800 text-xs"
                        >
                          <span className="text-slate-200 font-medium">{r.label}</span>
                          <span
                            className={`font-mono font-bold px-2 py-0.5 rounded-lg ${
                              r.type === 'pos'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : r.type === 'neg'
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : 'bg-slate-700 text-slate-300'
                            }`}
                          >
                            {r.points}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Google Sheets Quick Export Banner */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => setShowSheetsModal(true)}
                        className="w-full py-2.5 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        <span>Exportă Toată Grila &amp; Sportmonks în Google Sheets ↗</span>
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-900 flex justify-end">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors"
          >
            Închide
          </button>
        </div>
      </div>

      {showSheetsModal && (
        <GoogleSheetsExportModal onClose={() => setShowSheetsModal(false)} />
      )}
    </div>
  );
};
