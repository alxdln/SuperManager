import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { Player } from '../types/football';
import { SUPERLIGA_CLUBS } from '../data/superligaData';
import { ALL_16_SUPERLIGA_PLAYERS } from '../data/superligaAll16ClubsPlayers';

// Workspace scope for Google Sheets
export const SPREADSHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';

// Configure Google Auth Provider with Sheets Scope
const sheetsAuthProvider = new GoogleAuthProvider();
sheetsAuthProvider.addScope(SPREADSHEETS_SCOPE);
sheetsAuthProvider.setCustomParameters({
  prompt: 'select_account',
});

// In-memory token cache (never stored in localStorage/sessionStorage)
let inMemoryAccessToken: string | null = null;
let isSigningIn = false;

// Clear token on auth state change
onAuthStateChanged(auth, (user: User | null) => {
  if (!user) {
    inMemoryAccessToken = null;
  }
});

/**
 * Solicită sau returnează token-ul de acces OAuth Google pentru Google Sheets
 */
export async function getGoogleSheetsAccessToken(): Promise<{ user: User; accessToken: string }> {
  if (inMemoryAccessToken && auth.currentUser) {
    return { user: auth.currentUser, accessToken: inMemoryAccessToken };
  }

  if (isSigningIn) {
    throw new Error('Autentificarea Google este deja în curs.');
  }

  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, sheetsAuthProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);

    if (!credential?.accessToken) {
      throw new Error('Nu s-a putut obține token-ul de acces Google pentru Sheets.');
    }

    inMemoryAccessToken = credential.accessToken;
    return { user: result.user, accessToken: inMemoryAccessToken };
  } finally {
    isSigningIn = false;
  }
}

export function hasCachedGoogleToken(): boolean {
  return inMemoryAccessToken !== null;
}

export function clearGoogleToken(): void {
  inMemoryAccessToken = null;
}

export interface ScoringRow {
  category: string;
  eventName: string;
  points: string;
  sportmonksTypeId: string;
  description: string;
}

export const OFFICIAL_SCORING_ROWS: ScoringRow[] = [
  // 1. Pase & Atac
  {
    category: 'Pase & Atac',
    eventName: 'Gol marcat',
    points: '+50p',
    sportmonksTypeId: '52',
    description: 'Gol marcat din acțiune sau fază fixă',
  },
  {
    category: 'Pase & Atac',
    eventName: 'Pasă de gol (Assist)',
    points: '+30p',
    sportmonksTypeId: '79',
    description: 'Ultima pasă directă înainte de marcarea unui gol',
  },
  {
    category: 'Pase & Atac',
    eventName: 'Penalty obținut',
    points: '+25p',
    sportmonksTypeId: '85',
    description: 'Jucătorul faultat în suprafața de pedeapsă',
  },
  {
    category: 'Pase & Atac',
    eventName: 'Șut pe poartă',
    points: '+10p',
    sportmonksTypeId: '87',
    description: 'Șut cadrat parat de portar sau respins pe linie',
  },
  {
    category: 'Pase & Atac',
    eventName: 'Pasă cheie (Key pass)',
    points: '+5p',
    sportmonksTypeId: '94',
    description: 'Pasă care creează direct o oportunitate de finalizare',
  },
  {
    category: 'Pase & Atac',
    eventName: 'Dribling reușit',
    points: '+5p',
    sportmonksTypeId: '117',
    description: 'Trecere individuală 1 la 1 cu menținerea posesiei',
  },
  {
    category: 'Pase & Atac',
    eventName: 'Centrare reușită',
    points: '+3p',
    sportmonksTypeId: '99',
    description: 'Centrare din bandă recepționată de un coechipier',
  },
  {
    category: 'Pase & Atac',
    eventName: 'Pasă lungă',
    points: '+3p',
    sportmonksTypeId: 'Adaptat / 116',
    description: 'Pasă lungă precisă în profunzime sau schimbare de direcție',
  },
  {
    category: 'Pase & Atac',
    eventName: 'Pasă în terenul advers',
    points: '+1p',
    sportmonksTypeId: '116',
    description: 'Pasă reușită în jumătatea adversă',
  },
  {
    category: 'Pase & Atac',
    eventName: 'Pasă greșită',
    points: '-1p',
    sportmonksTypeId: '81',
    description: 'Pasă interceptată de adversar sau ieșită în aut',
  },
  {
    category: 'Pase & Atac',
    eventName: 'Șut ratat',
    points: '-3p',
    sportmonksTypeId: '88',
    description: 'Șut expediat în afara cadrului porții',
  },
  {
    category: 'Pase & Atac',
    eventName: 'Deposedat de minge (Turnover)',
    points: '-3p',
    sportmonksTypeId: '121',
    description: 'Pierderea posesiei balonului în duel sau din preluare greșită',
  },
  {
    category: 'Pase & Atac',
    eventName: 'Ocazie mare ratată',
    points: '-15p',
    sportmonksTypeId: '118',
    description: 'Ratare din poziție iminentă de gol (singur cu portarul, poartă goală)',
  },
  {
    category: 'Pase & Atac',
    eventName: 'Penalty ratat',
    points: '-30p',
    sportmonksTypeId: '91',
    description: 'Penalty executat și ratat (parat de portar sau pe lângă poartă)',
  },

  // 2. Dueluri & Apărare
  {
    category: 'Dueluri & Apărare',
    eventName: 'Respingere pe linia porții',
    points: '+25p',
    sportmonksTypeId: '104',
    description: 'Intervenție salvatoare ce previne golul ca ultim apărător pe linie',
  },
  {
    category: 'Dueluri & Apărare',
    eventName: 'Deposedare reușită (Tackle/Interception)',
    points: '+5p',
    sportmonksTypeId: '100',
    description: 'Deposedare prin tackling sau intercepție a pasei adverse',
  },
  {
    category: 'Dueluri & Apărare',
    eventName: 'Respingere minge (Clearance)',
    points: '+5p',
    sportmonksTypeId: '101',
    description: 'Degajarea balonului din zona de pericol a careului',
  },
  {
    category: 'Dueluri & Apărare',
    eventName: 'Șut blocat de fundaș',
    points: '+3p',
    sportmonksTypeId: '102',
    description: 'Blocarea traiectoriei unui șut advers îndreptat spre poartă',
  },
  {
    category: 'Dueluri & Apărare',
    eventName: 'Duel terestru câștigat',
    points: '+3p',
    sportmonksTypeId: '106',
    description: 'Orice duel 1 la 1 la sol câștigat pentru posesie',
  },
  {
    category: 'Dueluri & Apărare',
    eventName: 'Duel aerian câștigat',
    points: '+3p',
    sportmonksTypeId: '107',
    description: 'Duel aerian la cap câștigat în fața oponentului',
  },
  {
    category: 'Dueluri & Apărare',
    eventName: 'Duel terestru pierdut',
    points: '-1p',
    sportmonksTypeId: '108',
    description: 'Duel 1 la 1 la sol pierdut',
  },
  {
    category: 'Dueluri & Apărare',
    eventName: 'Duel aerian pierdut',
    points: '-1p',
    sportmonksTypeId: '110',
    description: 'Duel aerian la cap pierdut',
  },
  {
    category: 'Dueluri & Apărare',
    eventName: 'Driblat de adversar (Dribbled past)',
    points: '-3p',
    sportmonksTypeId: '109',
    description: 'Jucător defensiv depășit prin dribling de atacant',
  },
  {
    category: 'Dueluri & Apărare',
    eventName: 'Greșeală la gol',
    points: '-25p',
    sportmonksTypeId: '120',
    description: 'Eroare individuală directă soldată imediat cu gol primit',
  },

  // 3. Disciplină & Faulturi
  {
    category: 'Disciplină & Faulturi',
    eventName: 'Fault obținut',
    points: '+1p',
    sportmonksTypeId: '90',
    description: 'Acțiunea este oprită prin fault comis de adversar',
  },
  {
    category: 'Disciplină & Faulturi',
    eventName: 'Fault comis',
    points: '-3p',
    sportmonksTypeId: '89',
    description: 'Infracțiune comisă și sancționată de arbitru',
  },
  {
    category: 'Disciplină & Faulturi',
    eventName: 'Penalty comis',
    points: '-25p',
    sportmonksTypeId: '82',
    description: 'Fault sau henț în propriul careu care duce la acordarea de penalty',
  },
  {
    category: 'Disciplină & Faulturi',
    eventName: 'Cartonaș galben',
    points: '-15p',
    sportmonksTypeId: '84',
    description: 'Avertisment primit',
  },
  {
    category: 'Disciplină & Faulturi',
    eventName: 'Cartonaș roșu',
    points: '-50p',
    sportmonksTypeId: '83',
    description: 'Eliminare directă sau cumul de două cartonașe galbene',
  },

  // 4. Portari
  {
    category: 'Portari',
    eventName: 'Penalty apărat',
    points: '+25p',
    sportmonksTypeId: '126',
    description: 'Paradă salvatoare la lovitura de la 11 metri',
  },
  {
    category: 'Portari',
    eventName: 'Paradă din interiorul careului',
    points: '+10p',
    sportmonksTypeId: '125',
    description: 'Intervenție dificilă la șut expediat din careul de 16m',
  },
  {
    category: 'Portari',
    eventName: 'Paradă normală',
    points: '+5p',
    sportmonksTypeId: '86',
    description: 'Paradă la șut expediat din afara careului',
  },
  {
    category: 'Portari',
    eventName: 'Ieșire curajoasă (Sweeper keeper)',
    points: '+5p',
    sportmonksTypeId: '86 / event sweeper',
    description: 'Părăsirea porții pentru interceptarea unei mingi în adâncime',
  },
  {
    category: 'Portari',
    eventName: 'Minge înaltă prinsă (High claim)',
    points: '+3p',
    sportmonksTypeId: 'lineups claims',
    description: 'Prinderea sigură a unei centrări sau a unei mingi înalte',
  },
  {
    category: 'Portari',
    eventName: 'Minge boxată (Punch)',
    points: '+3p',
    sportmonksTypeId: 'lineups punches',
    description: 'Respingerea pericolului prin boxare',
  },

  // 5. Prezență & Meci (Contextual)
  {
    category: 'Prezență & Meci',
    eventName: 'Clean Sheet Portar (Poartă intactă)',
    points: '+30p',
    sportmonksTypeId: 'scores + minutes (Contextual)',
    description: 'Portar (GK), minim 60 de minute jucate pe teren, 0 goluri primite',
  },
  {
    category: 'Prezență & Meci',
    eventName: 'Clean Sheet Fundaș (Poartă intactă)',
    points: '+15p',
    sportmonksTypeId: 'scores + minutes (Contextual)',
    description: 'Fundaș (DEF), minim 60 de minute jucate pe teren, 0 goluri primite',
  },
  {
    category: 'Prezență & Meci',
    eventName: 'Rezultat: Victorie Echipă',
    points: '+15p',
    sportmonksTypeId: 'scores (Contextual)',
    description: 'Echipa jucătorului câștigă partida (dacă a bifat minute)',
  },
  {
    category: 'Prezență & Meci',
    eventName: 'Rezultat: Egalitate Echipă',
    points: '+5p',
    sportmonksTypeId: 'scores (Contextual)',
    description: 'Meci încheiat la egalitate (dacă a bifat minute)',
  },
  {
    category: 'Prezență & Meci',
    eventName: 'Rezultat: Înfrângere Echipă',
    points: '-15p',
    sportmonksTypeId: 'scores (Contextual)',
    description: 'Echipa jucătorului pierde meciul (dacă a bifat minute)',
  },
  {
    category: 'Prezență & Meci',
    eventName: 'Titular în meci',
    points: '+5p',
    sportmonksTypeId: 'formation_position > 0',
    description: 'Jucătorul începe meciul în primul 11',
  },
  {
    category: 'Prezență & Meci',
    eventName: 'Intrat de pe bancă (Rezervă)',
    points: '+3p',
    sportmonksTypeId: 'formation_position == null',
    description: 'Rezervă introdusă pe parcursul meciului',
  },
  {
    category: 'Prezență & Meci',
    eventName: 'Minute jucate (+1p la fiecare 10 min)',
    points: '+1p / 10 min',
    sportmonksTypeId: 'type_id: 119',
    description: 'Math.floor(minutes / 10) — ex: 90 min = +9p',
  },
  {
    category: 'Prezență & Meci',
    eventName: 'Căpitan de Echipă (Multiplier)',
    points: 'x2',
    sportmonksTypeId: 'Regulă Fantasy',
    description: 'Dublează totalul punctelor acumulate de căpitan în etapă',
  },
];

/**
 * Creează un document Google Sheets și exportă regulile de punctaj și loturile de jucători
 */
export async function createAndPopulateGoogleSheet(
  accessToken: string,
  players: Player[] = ALL_16_SUPERLIGA_PLAYERS
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const dateStr = new Date().toLocaleDateString('ro-RO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  // 1. Creează foaia de calcul prin API v4
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: `SuperManager SuperLiga - Grilă Scoring & Sportmonks API (${dateStr})`,
      },
      sheets: [
        {
          properties: {
            sheetId: 0,
            title: 'Grilă Live Scoring',
            gridProperties: {
              frozenRowCount: 1,
            },
          },
        },
        {
          properties: {
            sheetId: 1,
            title: 'Jucători & ID Sportmonks',
            gridProperties: {
              frozenRowCount: 1,
            },
          },
        },
      ],
    }),
  });

  if (!createRes.ok) {
    const errorText = await createRes.text();
    throw new Error(`Eroare la crearea documentului Google Sheets: ${createRes.status} ${errorText}`);
  }

  const createdData = await createRes.json();
  const spreadsheetId = createdData.spreadsheetId;
  const spreadsheetUrl = createdData.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // 2. Pregătește datele pentru Sheet 1: Grilă Live Scoring
  const scoringHeader = [
    'Categorie',
    'Eveniment / Acțiune',
    'Punctaj SuperManager',
    'Sportmonks API v3 type_id',
    'Descriere & Condiție de acordare',
  ];

  const scoringDataRows = OFFICIAL_SCORING_ROWS.map((r) => [
    r.category,
    r.eventName,
    r.points,
    r.sportmonksTypeId,
    r.description,
  ]);

  const scoringValues = [scoringHeader, ...scoringDataRows];

  // 3. Pregătește datele pentru Sheet 2: Jucători & ID Sportmonks
  const clubsMap = new Map(SUPERLIGA_CLUBS.map((c) => [c.id, c.name]));
  const playersHeader = [
    'ID Intern SuperManager',
    'Sportmonks Player ID',
    'Nume Fotbalist',
    'Club SuperLiga',
    'Poziție',
    'Cotă Transfermarkt (€)',
    'Puncte Totale',
    'Stare',
  ];

  const playersDataRows = players.map((p) => [
    p.id,
    p.sportmonksId ? String(p.sportmonksId) : 'Nesincronizat',
    p.name,
    clubsMap.get(p.clubId) || p.clubId,
    p.position,
    p.marketValue,
    p.pointsTotal || 0,
    p.status === 'injured' ? 'Accidentat' : p.status === 'suspended' ? 'Suspendat' : 'Activ',
  ]);

  const playersValues = [playersHeader, ...playersDataRows];

  // 4. Salvează datele în Sheet 1 și Sheet 2 folosind spreadsheets.values.batchUpdate
  const populateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: [
          {
            range: "'Grilă Live Scoring'!A1",
            values: scoringValues,
          },
          {
            range: "'Jucători & ID Sportmonks'!A1",
            values: playersValues,
          },
        ],
      }),
    }
  );

  if (!populateRes.ok) {
    const errorText = await populateRes.text();
    console.warn('Eroare populare valori Sheets:', errorText);
  }

  // 5. Opțional: Stilizează antetele cu fundal verde închis / text alb bold
  try {
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          // Sheet 1 Header Format
          {
            repeatCell: {
              range: {
                sheetId: 0,
                startRowIndex: 0,
                endRowIndex: 1,
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.05, green: 0.15, blue: 0.12 },
                  textFormat: {
                    foregroundColor: { red: 0.2, green: 0.9, blue: 0.5 },
                    bold: true,
                    fontSize: 11,
                  },
                },
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat)',
            },
          },
          // Sheet 2 Header Format
          {
            repeatCell: {
              range: {
                sheetId: 1,
                startRowIndex: 0,
                endRowIndex: 1,
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.08, green: 0.12, blue: 0.2 },
                  textFormat: {
                    foregroundColor: { red: 0.38, green: 0.7, blue: 0.98 },
                    bold: true,
                    fontSize: 11,
                  },
                },
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat)',
            },
          },
          // Auto-resize columns for Sheet 1
          {
            autoResizeDimensions: {
              dimensions: {
                sheetId: 0,
                dimension: 'COLUMNS',
                startIndex: 0,
                endIndex: 5,
              },
            },
          },
        ],
      }),
    });
  } catch (styleErr) {
    // Stilurile suplimentare nu blochează succesul exportului
    console.warn('Notă stilizare Sheets:', styleErr);
  }

  return { spreadsheetId, spreadsheetUrl };
}
