# Plan de Implementare: Curățare Date Mock, Fereastră Modală Confirmare Salvare & Evenimente Live per Titular

## User Review & Critical Decisions

> [!IMPORTANT]
> Conform răspunsurilor tale din faza de clarificare:
> - **Confirmare Post-Meci Demo**: Se va afișa o fereastră modală la fluierul final (minutul 90) care te întreabă explicit dacă dorești să salvezi datele și punctele în Firestore sau să anulezi/resetezi testul.
> - **Curățare Date Mock Secțiunea Meci**: Se vor reseta punctele de etapă ale tuturor jucătorilor la 0, scorurile tuturor meciurilor din etapă la 0-0, iar lista de evenimente simulate (`events: []`) va fi golită pentru a permite testarea exclusivă cu date reale sau meci demo curat.
> - **Afișare Evenimente Demo**: Se elimină containerul global de livescore din header-ul meciului demo. Evenimentele generate în timpul meciului se acumulează direct pe fiecare titular din echipă; pe cardul titularului se actualizează exclusiv punctajul în timp real (fără badge-uri sau elemente vizuale încărcate), iar accesul la evenimente se face prin click pe fotbalist (deschidere modal dedicat).

---

## 1. Overview & Core Concept

Această actualizare transformă secțiunea **Meci** dintr-o interfață populată cu date demonstrative hardcodate într-un mediu de producție curat, pregătit pentru partide reale Sportmonks și pentru cicluri controlate de testare demo:
1. **Punct de Pornire Impecabil (Zero Mock Data)**: Toate meciurile au scorul inițial 0-0, fără evenimente prefabricate; toți fotbaliștii încep etapa cu `pointsMatchday = 0`.
2. **Ciclu de Testare Flexibil (Test Loops)**: La finalul fiecărui meci demo, managerul decide dacă rezultatul este validat și salvat definitiv în baza de date Firestore sau dacă este anulat pentru a rula o nouă rundă de teste fără a polua clasamentele sau istoricul.
3. **UX Curat & Orientat pe Lotul Propriu**: În loc de un feed aglomerat cu toate fazele la grămadă, experiența live este descentralizată: managerul își urmărește titularii, vede punctele crescând pe rândul fiecăruia, iar printr-un simplu tap/click consultă desfășurătorul complet de acțiuni al fotbalistului respectiv.

---

## 2. User Experience & Visual Design

### A. Secțiunea Meci Curată (Zero State)
- **Scoruri inițiale**: Toate meciurile afișează `0 - 0` cu minutele de programare sau starea de așteptare.
- **Titularii tăi**: Fiecare titular are punctajul live la `0 pts` la start.
- **Fără alerte sau notificări mock reziduale**: Se elimină notificările vechi hardcodate generate la inițializare.

### B. Meci Demo Fără Feed Global Livescore
- Header-ul meciului demo păstrează doar **tabela de scor** (`Echipa Ta` vs. `Oponenți Superliga`), cronometrul de **1 minut** (`01:00` $\rightarrow$ `00:00`) și **minutul de meci** (`1'` $\rightarrow$ `90'`).
- Containerul cu lista globală de evenimente derulabile este **eliminat complet**.
- Pe lista de titulari din partea de jos, la fiecare acțiune a unui fotbalist din lotul tău, punctajul acelui fotbalist crește sau scade live (`+12 pts`, `+25 pts`, `-3 pts`), fără a adăuga etichete sau indicatori vizuali suplimentari.
- La click pe rândul titularului se deschide modalul `PlayerLiveStreamModal`, unde sunt afișate exact acțiunile fotbalistului respectiv generate în timpul meciului.

### C. Modalul de Confirmare Post-Meci (`DemoMatchSaveModal`)
La secunda 60 (Minutul 90 / FT):
- Se declanșează o fereastră modală centrată, elegantă, cu fundal blurat:
  - **Titlu**: `Fluier Final în Meciul Demo!`
  - **Rezumat**: Scorul final (ex: `2 - 1`), punctele de victorie/egal/înfrângere, clean sheet-ul (dacă e cazul) și totalul de puncte acumulat de titulari.
  - **Opțiunea 1 (Primară - Verde Smarald)**: `💾 Salvează în Baza de Date (Firestore)` $\rightarrow$ declanșează salvarea definitivă (`finalizeMatchNow`), scrie în colecțiile Firestore `/all_players`, `/gameweek_results` și `/finalized_matches`, și actualizează istoricul jucătorilor.
  - **Opțiunea 2 (Secundară - Gri/Roșu subtil)**: `❌ Anulează / Resetează Testul` $\rightarrow$ resetează punctele acumulate în meciul demo la starea inițială (0 pts) și permite reluarea testului oricând fără scrieri în Firestore.

---

## 3. Key Product Decisions & Trade-Offs

- **Oprire Salvare Automată Necondiționată în Demo**: În loc să forțăm salvarea automată după 5 minute pentru orice meci demo, decizia este transferată utilizatorului prin modal. Astfel, poți rula oricâte meciuri demo dorești pentru verificare fără teama că vei altera datele reale.
- **Stocarea Evenimentelor per Fotbalist**: Evenimentele generate în timpul meciului demo sunt stocate într-o hartă de evenimente per jucător (`demoEventsByPlayer: Record<string, MatchLiveEvent[]>`), astfel încât modalul fotbalistului să le citească instantaneu.
- **Curățarea `localStorage` Cache**: Fixturile și jucătorii salvați în `localStorage` care aveau scoruri/puncte vechi vor fi resetate automat la prima încărcare dacă au valori mock reziduale.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────┐
│                   MECI DEMO CONTROLLER                 │
│  - Cronometru: 60 secunde (1 minut)                    │
│  - Tabela: demoHomeScore vs demoAwayScore              │
│  - Dispatch acțiuni Kickbase (fără comentariu)         │
└──────────────────────────┬─────────────────────────────┘
                           │ generează acțiuni
                           ▼
┌────────────────────────────────────────────────────────┐
│            STARE JUCĂTORI (FANTASY CONTEXT)            │
│  - players[i].pointsMatchday (crește/scade live)       │
│  - demoEventsByPlayer[playerId] (istoric acțiuni live) │
│  - Fără feed global în header                          │
└──────────────────────────┬─────────────────────────────┘
                           │ click pe titular
                           ▼
┌────────────────────────────────────────────────────────┐
│              PLAYER LIVE STREAM MODAL                  │
│  - Afișează strict evenimentele fotbalistului selectat │
│  - Punctaj defalcat per acțiune Kickbase               │
└────────────────────────────────────────────────────────┘
                           │ la secunda 60 (Fluier Final FT)
                           ▼
┌────────────────────────────────────────────────────────┐
│            DEMO MATCH SAVE MODAL (CONFIRMARE)          │
│                                                        │
│  [💾 Salvează în Bază]           [❌ Anulează Test]     │
│          │                               │             │
│          ▼                               ▼             │
│  WriteBatch în Firestore          Resetare puncte      │
│  (/all_players, /gameweek)        la 0 (curățare)      │
└────────────────────────────────────────────────────────┘
```

### Componente și Module Implicate:
1. **`src/data/superligaData.ts`**:
   - Resetare `INITIAL_FIXTURES`: toate meciurile au `homeScore: 0`, `awayScore: 0`, `events: []`, `minute: 0`, `isLive: false`, `isFinished: false`.
   - Resetare `INITIAL_PLAYERS`: toți jucătorii au `pointsMatchday: 0`.
2. **`src/context/FantasyContext.tsx`**:
   - Curățare chei `localStorage` la inițializare pentru fixturi și scoruri vechi mock.
   - Adăugare stare `demoEventsByPlayer: Record<string, MatchLiveEvent[]>`.
   - Adăugare stare `showDemoSaveModal: boolean` și date meci finalizat pentru confirmare.
   - Funcție `confirmSaveDemoMatch()`: persistă în Firestore și finalizează.
   - Funcție `cancelDemoMatch()`: anulează punctele acumulate și resetează lotul la zero.
3. **`src/components/live/LiveMatchdayView.tsx`**:
   - Eliminare container listă globală de evenimente din cardul demo.
   - Păstrare doar tabelă scor și cronometre.
   - Integrare `DemoMatchSaveModal` la finalul meciului.
4. **`src/components/live/PlayerLiveStreamModal.tsx`**:
   - Citire evenimente specifice jucătorului din `demoEventsByPlayer[player.id]`.
