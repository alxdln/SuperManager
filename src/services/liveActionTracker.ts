/**
 * LiveActionMinuteTracker
 * Sistem inteligent de urmărire și alocare a minutelor exacte pentru acțiuni statistice:
 * 1. Delta Polling Live: înregistrează minutul exact din meci când un contor crește în timpul transmisiunii live.
 * 2. Corelare Istorică: leagă acțiunile critice (erori la gol, penalty-uri) de protocolul oficial al meciului.
 * 3. Stabilitate Persistentă: stochează minutele alocate în memorie și sessionStorage, garantând că un minut alocat nu fluctuează.
 */

class LiveActionMinuteTrackerService {
  private static STORAGE_KEY = 'supermanager_tracked_action_minutes';
  private static actionMinuteMap: Map<string, number> = new Map();
  private static lastKnownCounts: Map<string, number> = new Map();
  private static initialized = false;

  private static init() {
    if (this.initialized) return;
    this.initialized = true;
    if (typeof window !== 'undefined' && window.sessionStorage) {
      try {
        const raw = window.sessionStorage.getItem(this.STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (typeof parsed === 'object' && parsed !== null) {
            Object.entries(parsed).forEach(([k, v]) => {
              if (typeof v === 'number') {
                this.actionMinuteMap.set(k, v);
              }
            });
          }
        }
      } catch (err) {
        console.warn('[LiveActionTracker] Eroare citire sessionStorage:', err);
      }
    }
  }

  private static persist() {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      try {
        const obj: Record<string, number> = {};
        this.actionMinuteMap.forEach((v, k) => {
          obj[k] = v;
        });
        window.sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(obj));
      } catch {
        /* ignore */
      }
    }
  }

  /**
   * Monitorizează datele noi la fiecare poll și înregistrează creșterile la minutul curent al meciului
   */
  public static processLiveDetailsUpdate(
    fixtureId: number | string,
    currentMatchMinute: number,
    playerId: number | string,
    details: Array<{ type_id: number; value?: any; data?: any }>
  ) {
    this.init();
    const safeMatchMinute = Math.max(1, Math.min(100, currentMatchMinute || 1));

    for (const d of details) {
      if (d.type_id === 119 || d.type_id === 117172) continue;
      const count = this.extractValue(d);
      if (count <= 0) continue;

      const countKey = `${fixtureId}_${playerId}_${d.type_id}`;
      const lastCount = this.lastKnownCounts.get(countKey);

      if (lastCount !== undefined && count > lastCount) {
        // Au apărut acțiuni noi chiar în acest minut de joc!
        for (let i = lastCount + 1; i <= count; i++) {
          const itemKey = `${fixtureId}_${playerId}_${d.type_id}_occ_${i}`;
          if (!this.actionMinuteMap.has(itemKey)) {
            this.actionMinuteMap.set(itemKey, safeMatchMinute);
          }
        }
        this.persist();
      }

      this.lastKnownCounts.set(countKey, count);
    }
  }

  /**
   * Returnează sau calculează minutul exact pentru o apariție a unei acțiuni
   */
  public static getActionMinute(params: {
    fixtureId?: number | string;
    playerId: number | string;
    typeId: number;
    occurrenceIndex: number;
    totalCount: number;
    playedMinutes: number;
    subInMin?: number | null;
    subOutMin?: number;
    playerTeamId?: number;
    realEventsFromApi?: any[];
    playerName?: string;
  }): number {
    this.init();
    const {
      fixtureId = 'active',
      playerId,
      typeId,
      occurrenceIndex,
      totalCount,
      playedMinutes,
      subInMin = 1,
      subOutMin = 999,
      playerTeamId,
      realEventsFromApi = [],
      playerName = '',
    } = params;

    const itemKey = `${fixtureId}_${playerId}_${typeId}_occ_${occurrenceIndex}`;

    const effectiveStartMin = Math.max(1, subInMin ?? 1);

    // Corectare critică a limitei superioare pentru jucătorii intrați de pe bancă:
    // Dacă subInMin > 1 (rezervă intrată), durata prezenței este de la subInMin până la subInMin + playedMinutes (sau subOutMin).
    // Dacă subInMin === 1 (titular), prezența este de la 1 până la playedMinutes (sau subOutMin dacă a fost schimbat).
    let computedEndMin: number;
    if (subInMin && subInMin > 1) {
      computedEndMin = Math.min(subOutMin, Math.min(95, effectiveStartMin + Math.max(1, playedMinutes)));
    } else {
      computedEndMin = Math.min(subOutMin, Math.min(95, Math.max(effectiveStartMin + 1, playedMinutes)));
    }
    const effectiveEndMin = Math.max(effectiveStartMin, computedEndMin);

    // 1. Dacă minutul a fost deja înregistrat live sau calculat anterior, verificăm că se încadrează în intervalul valid pe teren
    if (this.actionMinuteMap.has(itemKey)) {
      const stored = this.actionMinuteMap.get(itemKey)!;
      if (stored >= effectiveStartMin && stored <= effectiveEndMin) {
        return stored;
      }
    }

    let calculatedMinute: number;

    // 2. Corelare inteligentă cu evenimentele de protocol oficial STRICT din perioada cât fotbalistul a fost pe teren
    if (typeId === 571) {
      // Greșeală la gol: legată de minutul golului primit de echipă CÂND jucătorul era pe teren
      const concededGoals = realEventsFromApi.filter((e: any) => {
        const code = (e.type?.code || e.type_code || e.type?.name || '').toLowerCase();
        const isGoal = e.type_id === 14 || e.type_id === 15 || e.type_id === 16 || code.includes('goal');
        const isOwnGoal = e.type_id === 15 || code.includes('own');
        const scoredByMyTeam = e.participant_id === playerTeamId;
        const gMin = Number(e.minute) || 0;
        return isGoal && ((!scoredByMyTeam && !isOwnGoal) || (scoredByMyTeam && isOwnGoal)) && gMin >= effectiveStartMin && gMin <= effectiveEndMin;
      });
      const idx = occurrenceIndex - 1;
      calculatedMinute = concededGoals[idx]?.minute
        ? Number(concededGoals[idx].minute)
        : (concededGoals[0]?.minute ? Number(concededGoals[0].minute) : Math.round(effectiveStartMin + (effectiveEndMin - effectiveStartMin) * 0.7));
      calculatedMinute = Math.max(effectiveStartMin, Math.min(effectiveEndMin, calculatedMinute));
    } else if (typeId === 82) {
      // Penalty comis: legat de penalty-ul acordat adversarilor când fotbalistul era pe teren
      const penEv = realEventsFromApi.find((e: any) => {
        const code = (e.type?.code || e.type_code || e.type?.name || '').toLowerCase();
        const pMin = Number(e.minute) || 0;
        return (e.type_id === 16 || code.includes('pen')) && e.participant_id !== playerTeamId && pMin >= effectiveStartMin && pMin <= effectiveEndMin;
      });
      calculatedMinute = penEv?.minute ? Number(penEv.minute) : Math.round(effectiveStartMin + (effectiveEndMin - effectiveStartMin) * 0.6);
      calculatedMinute = Math.max(effectiveStartMin, Math.min(effectiveEndMin, calculatedMinute));
    } else if (typeId === 85) {
      // Penalty obținut: legat de penalty-ul acordat echipei proprii când fotbalistul era pe teren
      const penEv = realEventsFromApi.find((e: any) => {
        const code = (e.type?.code || e.type_code || e.type?.name || '').toLowerCase();
        const pMin = Number(e.minute) || 0;
        return (e.type_id === 16 || code.includes('pen')) && e.participant_id === playerTeamId && pMin >= effectiveStartMin && pMin <= effectiveEndMin;
      });
      calculatedMinute = penEv?.minute ? Number(penEv.minute) : Math.round(effectiveStartMin + (effectiveEndMin - effectiveStartMin) * 0.4);
      calculatedMinute = Math.max(effectiveStartMin, Math.min(effectiveEndMin, calculatedMinute));
    } else if (typeId === 126 || typeId === 113) {
      // Penalty apărat: legat de penalty-ul ratat al adversarilor când fotbalistul era pe teren
      const missedPen = realEventsFromApi.find((e: any) => {
        const code = (e.type?.code || e.type_code || e.type?.name || '').toLowerCase();
        const pMin = Number(e.minute) || 0;
        return (e.type_id === 17 || code.includes('miss')) && e.participant_id !== playerTeamId && pMin >= effectiveStartMin && pMin <= effectiveEndMin;
      });
      calculatedMinute = missedPen?.minute ? Number(missedPen.minute) : Math.round(effectiveStartMin + (effectiveEndMin - effectiveStartMin) * 0.5);
      calculatedMinute = Math.max(effectiveStartMin, Math.min(effectiveEndMin, calculatedMinute));
    } else {
      // 3. Distribuție realistă, uniformă și distinctă pentru acțiuni statistice în intervalul [effectiveStartMin, effectiveEndMin]
      const count = Math.max(1, totalCount);
      const span = effectiveEndMin - effectiveStartMin;

      if (span <= 0) {
        calculatedMinute = effectiveStartMin;
      } else {
        // Offset determinist dependent de typeId pentru a evita coliziunea între acțiuni diferite (ex: tackle vs pass error)
        const typeOffset = ((typeId * 17 + (playerName.charCodeAt(0) || 5)) % Math.max(1, Math.min(5, span))) - Math.floor(Math.min(5, span) / 2);

        let targetMinute: number;
        if (count === 1) {
          // O singură acțiune: plasată la mijlocul intervalului activ + offset fin
          targetMinute = Math.round(effectiveStartMin + span * 0.5 + typeOffset * 0.25);
        } else {
          // Acțiuni multiple: distribuite uniform și crescător de-a lungul intervalului jucat
          const step = span / count;
          const occMin = effectiveStartMin + (occurrenceIndex - 0.5) * step + (typeOffset * 0.15);
          targetMinute = Math.round(occMin);
        }
        calculatedMinute = Math.max(effectiveStartMin, Math.min(effectiveEndMin, targetMinute));
      }
    }

    // Salvăm în memorie și sesiune pentru consistență totală
    this.actionMinuteMap.set(itemKey, calculatedMinute);
    this.persist();

    return calculatedMinute;
  }

  private static extractValue(item: any): number {
    if (!item) return 0;
    if (typeof item.data?.value === 'number') return item.data.value;
    if (typeof item.value === 'number') return item.value;
    if (typeof item.data?.value?.total === 'number') return item.data.value.total;
    if (typeof item.value?.total === 'number') return item.value.total;
    return 0;
  }
}

export const LiveActionMinuteTracker = LiveActionMinuteTrackerService;
