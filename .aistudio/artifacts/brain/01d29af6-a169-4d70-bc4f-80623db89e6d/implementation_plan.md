# SuperManager: Engine Demo Live, Reguli Financiare Overdraft & Integrare Cloud

Plan de implementare pentru actualizarea modului LIVE cu meci demonstrativ de 3 minute, sistem financiar de overdraft limitat la -50% din valoarea lotului, optimizări ergonomice de layout cu imagini generoase de 50%, redenumire navigație footer și strategie de date persistente și API-uri sportive externe.

## User Review & Critical Decisions

> [!IMPORTANT]
> Deciziile confirmate de utilizator în etapa de clarificare:
> - **Backend & Bază de date:** Integrare Firebase Firestore cu sincronizare cloud pentru salvarea jucătorilor noi și testare.
> - **Mod Meci Demo (LIVE):** Cronometru accelerat de 3 minute (180s) cu generare continuă de evenimente live în timp real cu jucătorii din lotul echipei.
> - **Regulă Penalizare Buget Negativ:** Dacă echipa are balanță negativă la debutul etapei, fotbaliștii afișează punctele și fazele individual în mod normal, însă punctajul total al echipei în clasamentul live și general devine 0.

---

## 1. Overview & Core Concept

1. **Flexibilitate Layout & Zero Truncating:**
   - Eliminarea claselor rigide `overflow-hidden` din carduri, pastile și containere de conținut.
   - Utilizarea claselor `flex-wrap items-center justify-center` pentru alinierea perfectă a elementelor atât vertical cât și orizontal atunci când ecranul este compact.
2. **Showcase Avatare 50% în Previzualizări:**
   - Atât în cardurile de pe bancă/listă din ecranul Echipă, cât și în cardurile de pe Piața de Transferuri, avatarul jucătorului va ocupa 50% din lățimea containerului preview, creând un impact vizual superior de cartonaș colecționabil.
3. **Footer Navigație Actualizat:**
   - Tab-ul `Piață` devine oficial `TRANSFERURI`.
   - Tab-ul `Predictor` devine oficial `PREDICȚII`.
4. **Mecanism Financiar Avansat de Overdraft (Credit de Transferuri):**
   - Managerul poate intra în minus cu bugetul până la o limită strictă de **-50% din valoarea totală a lotului său** (ex: la un lot de 10.000.000 €, bugetul minim permis este -5.000.000 €).
   - La încercarea de plasare a unei oferte peste această limită sau când fondurile disponibile sunt depășite, se declanșează un pop-up de avertizare (*Warning Pop-up*), explicând marja permisă.
   - **Regulă de Etapă:** Dacă la startul meciurilor managerul este pe minus, în profilul jucătorilor acțiunile și punctele se văd normal, dar punctajul total al echipei în clasamentul general este blocat la 0 puncte.
5. **Mod „Meci Demo” în secțiunea LIVE (3 minute):**
   - Buton dedicat permanent: **„MECI DEMO (3 MIN)”** cu posibilitate de restart oricând.
   - Simulare fluidă de 180 secunde (3 minute reale = 90 minute de meci).
   - Folosește jucătorii titulari din echipa ta, generând faze diverse, realiste, cu scor strâns (1-3 goluri max) și actualizare în timp real a punctajelor.
6. **Strategie Bază de Date & Evaluare API Fotbal:**
   - Conectare Firestore pentru salvarea jucătorilor personalizați și configurărilor de test.
   - Raport detaliat asupra API-urilor Sofascore, Flashscore, OPTA și opțiunilor gratuite (API-Football / API-Sports, FootballData.io).

---

## 2. User Experience & Visual Design

### 2.1. Preview Card-uri Jucători cu Avatar 50% & Flex-Wrap
- Cardul de previzualizare afișează poza fotbalistului centrată, ocupând 50% din lățimea cardului (`w-1/2 aspect-square mx-auto rounded-2xl object-cover shadow-lg border-2 border-slate-700`).
- Textul și pastilele de informații (poziție completă, club, cotă) se așază dedesubt cu `flex-wrap items-center justify-center text-center`, fără să fie tăiate de `overflow: hidden`.

```
┌──────────────────────────────────────────────┐
│  👤 Listat de: Superliga                     │
├──────────────────────────────────────────────┤
│                                              │
│             ┌──────────────────┐             │
│             │                  │             │
│             │   POZĂ JUCĂTOR   │  <- 50% W   │
│             │     (AVATAR)     │             │
│             │                  │             │
│             └──────────────────┘             │
│                                              │
│          [ FUNDAȘ ]  ·  FCSB                 │
│          DARIUS OLARU (CĂPITAN)              │
│        Cotă: 6.500.000 € · 84 pts            │
│                                              │
│   ┌────────────────────┐  ┌──────────────┐   │
│   │ € 1.500.000        │  │ FĂ O OFERTĂ  │   │
│   └────────────────────┘  └──────────────┘   │
└──────────────────────────────────────────────┘
```

### 2.2. Modal Pop-up Avertizare Buget / Overdraft
- Titlu: **„Limită Fonduri Depășită”**
- Conținut:
  - Buget curent și valoarea lotului.
  - Limita maximă permisă de descoperire de cont (-50% din valoarea lotului).
  - Suma necesară pentru a putea finaliza transferul.
  - Avertisment clar: *„Trebuie să revii pe plus înainte de startul etapei pentru a acumula puncte în clasament!”*
  - Buton de confirmare: `AM ÎNȚELES`.

### 2.3. Interfața Meciului Demo (LIVE)
- Banner superior în tab-ul LIVE:
  - Buton verde neon: `▶ PORNEȘTE MECI DEMO (3 MIN)` / `🔄 REPORNEȘTE MECI DEMO`.
  - Cronometru dublu: Timp meci (`0' -> 90'`) și Cronometru invers real (`03:00 -> 00:00`).
  - Bară de progres live și feed de evenimente în timp real generat pentru jucătorii din echipa utilizatorului.

---

## 3. Key Product Decisions & Trade-Offs

### 3.1. Calculul Overdraft-ului Financiar
- **Formula:** `valoareLot = suma(cotaPiata(jucator))` pentru toți cei 11+ jucători din lot.
- **Limita de credit:** `bugetMinim = -0.5 * valoareLot`.
- **Exemplu:** Dacă lotul valorează 12.000.000 €, bugetul poate scădea până la -6.000.000 €.
- **Stare la salvare / debut etapă:** Dacă `buget < 0`, se marchează starea `isOverdraftPenalized = true`. Jucătorii își primesc punctele de meci în mod normal pe ecranele lor, dar scorul total al echipei pe etapă din clasamente este setat la `0`.

### 3.2. Evaluare API-uri Fotbal: Sofascore, Flashscore, OPTA vs Opțiuni Gratuite

| Furnizor | Tip Acces | Date în Timp Real / Evenimente | Costuri & Limite | Compatibilitate Superliga |
| :--- | :--- | :--- | :--- | :--- |
| **Sofascore** | Neoficial (RapidAPI / Scraper) | Evenimente live detaliate (pase, șuturi, ratings, heatmaps) | Plan Free limitat (~50 req/lună), plătit între $15-$90/lună | Excelentă (acoperă Superliga României meci de meci) |
| **Flashscore** | Neoficial (Scraping / Parse.bot) | Scoruri live, cronologie goluri/cartonașe | Fără API oficial deschis; riscuri de blocare IP la scraping | Bună pentru scoruri; lipsesc evenimentele granulare (recuperări, dueluri) |
| **OPTA (Stats Perform)** | Oficial Enterprise B2B | Cele mai precise date xG, evenimente pe secunde, date calitative | Foarte scump (de la €250-€1500+/lună prin contract) | Standardul industriei, dar nefezabil pentru prototip gratuit |
| **API-Football (API-Sports)** | Oficial Freemium | Scoruri live, statistici meci, evenimente la 15 secunde | **Gratuit: 100 request-uri/zi**, toate endpoint-urile deschise | **Recomandat:** Acoperă Superliga României complet cu ID ligă și evenimente live |
| **Football-Data.org** | Oficial Freemium | Rezultate, clasamente, loturi | Gratuit: 10 req/min | Nu acoperă acțiuni granulare din Superliga României în planul free |

**Recomandare arhitecturală:**
- Pentru integrarea în viitor a datelor reale din Superliga, **API-Football (API-Sports)** este cea mai stabilă opțiune gratuită ce oferă cheie API fără card de credit și actualizări la 15 secunde pentru evenimente live.

---

## 4. Technical Architecture & Component Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│                          SUPERMANAGER CLIENT                           │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌────────────────────┐    ┌────────────────────────────────────────┐  │
│  │   TacticalPitch    │    │           TransferMarketView           │  │
│  │ (Avatare mari 50%) │    │ (Avatare 50%, Wrap, Overdraft Pop-up)  │  │
│  └─────────┬──────────┘    └───────────────────┬────────────────────┘  │
│            │                                   │                       │
│            ▼                                   ▼                       │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                      FantasyContext Engine                       │  │
│  │  - Overdraft limit check: budget >= -(squadValue * 0.5)          │  │
│  │  - Overdraft Warning Modal State                                 │  │
│  │  - Matchday Negative Balance Penalty (Team pts = 0 in standings) │  │
│  │  - Demo Match 3-min state (interval, events, live ticks)         │  │
│  │  - Firebase Firestore Sync for custom players & testing          │  │
│  └─────────────────────────────────┬────────────────────────────────┘  │
│                                    │                                   │
│            ┌───────────────────────┴───────────────────────┐           │
│            ▼                                               ▼           │
│  ┌───────────────────────────────┐     ┌────────────────────────────┐  │
│  │        LiveMatchdayView       │     │    Bottom Navigation Bar   │  │
│  │ - Buton "Meci Demo (3 Min)"   │     │ - ECHIPA                   │  │
│  │ - 180s live real-time engine  │     │ - MECI                     │  │
│  │ - Diverse realistic actions   │     │ - TRANSFERURI              │  │
│  └───────────────────────────────┘     │ - CLASAMENT                │  │
│                                        │ - PREDICȚII                │  │
│                                        └────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Implementation Steps

1. **Stilizare Globală & Eliminare `overflow-hidden`:**
   - Înlocuirea `overflow-hidden` din cardurile de jucător și containerele de conținut cu `flex-wrap items-center justify-center`.
   - Asigurarea centrării orizontale și verticale în toate cazurile de wrap pe ecrane compacte.
2. **Design Avatare 50%:**
   - În `TacticalPitchView` (secțiunea jucătorilor de rezervă) și în `TransferMarketView` (cardurile de vânzare/cumpărare), imaginea jucătorului va fi mărită la 50% din lățimea cardului cu formatare proeminentă.
3. **Redenumire Tab-uri Footer:**
   - Schimbat în `MobileShell.tsx`:
     - `Piață` -> `TRANSFERURI`
     - `Predictor` -> `PREDICȚII`
4. **Logică Financiară Overdraft (-50% din valoarea lotului):**
   - Calcul dinamic: `squadMarketValue` și `maxAllowedOverdraft = squadMarketValue * 0.5`.
   - Modal Pop-up `OverdraftWarningModal` declanșat la încercarea de achiziție când fondurile depășesc limita.
   - Punctaj individual vizibil normal în meci, dar penalizare aplicată scorului echipei în clasament dacă balanța este negativă la startul etapei.
5. **Modul „Meci Demo” de 3 minute:**
   - State de simulare în `FantasyContext`: durată 180 secunde, pas de 2 secunde per minut de joc.
   - Folosește jucătorii din primul 11 al utilizatorului și distribuie evenimente variate (pase, deposedări, șuturi, parade, faulturi, 1-2 goluri).
   - Buton dedicat în `LiveMatchdayView` cu status live și posibilitate de reinițializare oricând.
6. **Integrare Firebase Firestore & Panou Date:**
   - Inițializare Firebase Firestore conform cerințelor din `firebase-integration-rpc`.
   - Adăugare formular de adăugare/editare jucători de test salvate direct în colecția Firestore `custom_players`.
