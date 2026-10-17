# Sistem Master Database, Autentificare Creator OS, Niveluri Membership & Gestiune Cluburi

Plan complet de implementare pentru extinderea ecosistemului SuperManager România cu flux complet de autentificare, securizare Creator OS, diferențiere Gratuit vs Pro, alocare conformă a lotului inițial și administrare dinamică a cluburilor din Superliga.

---

## Decizii Confirmate de Utilizator (Faza 1)

> [!IMPORTANT]
> Următoarele decizii cheie au fost confirmate prin dialogul din Faza 1 și guvernează arhitectura implementării:
>
> 1. **Splash Screen Animat (2 secunde)**: La deschiderea jocului va rula un splash screen elegant de 2 secunde cu logo-ul SuperManager și animație fină de puls/glow, urmat de tranziția lină către ecranul de autentificare.
> 2. **Autentificare Creator Dedicată**: Conectarea cu contul `creator@supermanager.ro` și parola `1923` redirecționează utilizatorul direct în **Creator & Commissioner OS**, fără a forța parcurgerea procesului de creare a ligii sau revendicarea pachetului de start.
> 3. **Cluburi Dezactivate**: Atunci când un club este dezactivat din Master Database, fotbaliștii acelui club sunt ascunși complet din întregul joc (teren tactic, piață de transferuri, căutări și clasamente).
> 4. **Vizibilitate Nivel Membership**: Nivelurile de membership (*Gratuit, Pro, Admin, Creator*) nu au insigne publice în clasamentele ligilor, fiind vizibile și gestionabile exclusiv în Profil, Setări și Panoul de Administrare/Creator.

---

## 1. Prezentare Generală & Concepte Cheie

Sistemul SuperManager România evoluează către o platformă unificată în care **Master Database (Firestore)** reprezintă unica sursă de adevăr pentru toate ligile, cluburile, jucătorii și conturile de manageri.

* **Splash Screen & Gateway Auth**: O experiență nativă de aplicație mobilă/web cu brand identity puternic la pornire, urmată de separarea clară între jucătorii obișnuiți și Administratorul Creator.
* **Algoritm Inteligent de Pachet de Start**: Când un manager nou se alătură unei ligi, cei 14 fotbaliști de start (€5.00M valoare totală) sunt selectați respectând strict:
  * Niciun fotbalist nu poate fi duplicat în ligă (fiecare fotbalist este unic atribuit).
  * Limita maximă de fotbaliști de la același club definită în setările ligii (ex: max 3 de la FCSB, CFR etc.) este garantată.
* **Model Ierarhic de Membership (4 Tiers)**:
  * `gratuit`: Jucătorii sunt afișați cu avatare neutre gri (siluetă/placeholder stilizat). În timpul meciurilor live, utilizatorul vede doar scorul total al echipei; detalierea pe acțiuni și punctele individuale per jucător sunt afișate doar după fluierul final.
  * `pro`: Acces la pozele reale ale tuturor fotbaliștilor, evenimente în timp real per fotbalist în modul LIVE Matchday și clasament live al managerilor actualizat secundă cu secundă.
  * `admin`: Administrator dedicat al propriei ligi (poate ajusta setările financiare/regulile ligii sale și poate exclude/aproba manageri).
  * `creator`: Acces deplin la Creator & Commissioner OS pentru modificarea globală a bazei de date (jucători, cluburi, conturi, resetare parole, ștergere ireversibilă).
* **Management Dinamic al Cluburilor Superliga**:
  * Editare nume complet, nume scurt, oraș, stadion și **link către emblema oficială**.
  * Comutator Activ/Inactiv (cluburile retrogradate pot fi dezactivate, ascunzând automat fotbaliștii asociați).
  * Buton de adăugare club nou pentru sezoanele viitoare (promovări din Liga 2).

---

## 2. Experiența Utilizatorului & Arhitectura Vizuală

### Fluxuri Principale de Navigare

```
┌─────────────────────────────────────────────────────────────┐
│                 Pornire Aplicație (Index)                   │
└──────────────────────────────┬──────────────────────────────┘
                               │
                [Splash Screen Animat: 2 secunde]
                               │
                               ▼
                Utilizator autentificat anterior?
                 /                          \
              [DA]                          [NU]
               │                             │
               ▼                             ▼
       Ce rol deține?              Ecran Login / Înregistrare
       /            \                        │
   [Creator]    [Manager]                    │
      │             │                        │
      ▼             ▼                        ▼
 [Creator OS] [Teren Tactic]   creator@supermanager.ro / 1923?
                                     /             \
                                  [DA]             [NU]
                                   │                │
                                   ▼                ▼
                             [Creator OS]     [Onboarding / Joc]
```

### Paletă de Culori & Tipografie Conformă cu Ghidul de Design
* **Pânză Principală (60%)**: Dark Slate profund (`#0a0d14` / `#0f172a`), oferind contrast excelent pentru culorile oficiale de club.
* **Suprafețe Structurale (30%)**: Panouri slate rotunjite cu margini discrete `border-slate-800` și separatoare fine `1px solid rgba(255,255,255,0.08)`.
* **Accente de Interacțiune (10%)**: Verde SuperManager (`#05df72`) pentru acțiuni primare, Indigo Electric (`#6366f1`) pentru uneltele Creator OS și Auriu (`#f59e0b`) pentru funcționalitățile PRO.
* **Tipografie**: Fonturi sans-serif moderne, cu cifre tabulare (`tabular-nums font-mono`) pentru cote de piață, punctaje și minute de joc.

---

## 3. Decizii Cheie de Produs & Compromisuri Tehnice

### Decizia 1: Alocarea Jucătorilor Fără Duplicate & Respectarea Limitei pe Club
* **Abordare**: Funcția `generateRandomStarterSquad` va primi parametrii `maxSameClubPlayers` (extras din `leagueSettings.maxSameClubPlayers`) și `assignedPlayerIds` (setul de ID-uri al fotbaliștilor deja deținuți de membrii din liga respectivă).
* **Mecanism**: Generatorul filtrează inițial fotbaliștii disponibili (nealocați), apoi grupează candidații pe poziții (1 GK, 5 DEF, 5 MID, 3 FWD) și menține un contor strict de fotbaliști per `clubId`. Dacă cota pe un club atinge limita, fotbaliștii acelui club sunt ocrotiți și excluși din extragerile următoare pentru acel manager.

### Decizia 2: Izolarea Vizuală și Funcțională pentru Conturile Gratuite
* **Avatar Placeholder**: În loc de imagini rupte sau avatare colorate aleatorii, utilizatorii cu statut `gratuit` vor vedea siluete neutre elegante în nuanțe de gri (`#334155` / `#64748b`) cu inițialele stilizate sau icon de fotbalist.
* **Meci Live**: În `LiveMatchdayView`, scorul total al echipei rămâne live pentru a păstra suspansul, însă rândurile jucătorilor afișează o casetă prietenoasă de tip teaser („Deblochează scorurile live per fotbalist cu SuperManager PRO”).

### Decizia 3: Gestiunea Dinamică a Cluburilor în Firestore
* **Colecție `clubs`**: În Firestore, vom persista colecția `clubs/{clubId}`. La pornire, dacă colecția este proaspătă, se injectează cele 16 cluburi oficiale actuale. Creatorul poate adăuga oricând cluburi noi sau le poate dezactiva pe cele retrogradate.
* **Filtrare Cascade**: Când un club are `isActive: false`, orice interogare de jucători (piață, teren, selecție) exclude automat jucătorii care au `clubId`-ul respectiv.

---

## 4. Arhitectură Tehnică & Structura Componentelor

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FantasyContext (Central State)                  │
├────────────────────────────────────────────────────────────────────────┤
│ • user { id, email, membership: 'gratuit'|'pro'|'admin'|'creator' }    │
│ • players: Player[] (sincronizați din Master Firestore)                │
│ • clubs: Club[] (sincronizate din Master Firestore, cu flag isActive)  │
│ • leagueSettings { maxSameClubPlayers: 3, budget: 50M, ... }           │
│ • starterSquadGenerator(leagueId, maxClubLimit)                        │
└──────────────────┬─────────────────────────────────┬───────────────────┘
                   │                                 │
                   ▼                                 ▼
┌──────────────────────────────────────┐  ┌──────────────────────────────┐
│       MobileShell & App Gateway      │  │   Creator & Commissioner OS  │
├──────────────────────────────────────┤  ├──────────────────────────────┤
│ 1. SplashScreen (2 secunde animat)   │  │ 1. DatabaseNavigatorView     │
│ 2. GameAuthAndOnboardingFlow         │  │    • Jucători (6 atribute)   │
│    • Direct Login: creator@...       │  │    • Manageri (Tier Selector)│
│ 3. Views (Pitch, Market, Live)       │  │    • Ligi (Config & Ștergere)│
│    • Filtrare imagini pt 'gratuit'   │  │    • Cluburi (Editare/Add/   │
│    • Ascundere cluburi inactive      │  │      Dezactivare + Embleme)  │
└──────────────────────────────────────┘  └──────────────────────────────┘
```

---

## Etape de Execuție (după Aprobare)

1. **Modelare Tipuri & Date**:
   * Actualizare interfață `Club` cu `isActive?: boolean` și `badgeUrl: string`.
   * Actualizare tip `User` și `StoredUserAccount` cu `membership: 'gratuit' | 'pro' | 'admin' | 'creator'`.
2. **SplashScreen & Auth Special**:
   * Creare componentă `SplashScreen` cu logo-ul jocului și temporizator de 2 secunde.
   * Integrare verificare directă pentru `creator@supermanager.ro` / `1923` cu comutare directă în `CreatorDashboardView`.
3. **Generator Pachet de Start Fără Duplicate & Limită pe Club**:
   * Refactorizare `generateRandomStarterSquad` în `superligaAll16ClubsPlayers.ts` pentru a respecta `maxSameClubPlayers` și a preveni duplicatele la nivel de ligă.
4. **Implementare Restricții Membership**:
   * Logica de afișare avatare placeholder gri pentru conturile `gratuit`.
   * Limitarea ecranului LIVE pentru utilizatorii `gratuit` și deblocarea completă pentru `pro`.
5. **Panou Gestiune Cluburi în Master Database**:
   * Adăugare sub-tab complet funcțional pentru Cluburi în `DatabaseNavigatorView`: editare nume, emblemă, comutator activ/inactiv și formular de adăugare club nou.
   * Salvare persistentă a cluburilor în colecția Firestore `clubs`.
6. **Verificare Finală**:
   * Rulare `compile_applet` și `lint_applet` pentru validare completă.
