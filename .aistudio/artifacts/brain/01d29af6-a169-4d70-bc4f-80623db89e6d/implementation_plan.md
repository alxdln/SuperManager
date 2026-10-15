# Simplificare Bază de Date Jucători & Sincronizare Globală în Timp Real

Plan de optimizare a modelului de date pentru fotbaliști și asigurare a persistenței globale a modificărilor din Creator Hub în baza de date Firestore a jocului.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> Confirmările primite de la utilizator au stabilit clar direcția:
> - **Date esențiale păstrate**: Nume Complet, Club, Poziție, Naționalitate, Avatar/Poză, Cotă Transfermarkt (Transfermarkt €), plus punctajul fantasy total calculat automat la etape.
> - **Câmpuri eliminate**: Statisticile secundare redundante (șuturi pe poartă, pase cheie, recuperări, deposedări, driblinguri, faulturi etc.) și formularele supraîncărcate sunt eliminate din baza de date și interfață.
> - **Stil interfață Creator Hub**: Se păstrează designul actual și ergonomia existentă, eliminând strict câmpurile nenecesare din formularul de editare și din vizualizatorul de jucători.
> - **Sincronizare Globală**: Orice modificare salvată în Creator Commissioner se publică instant în Firestore (`global_players`) și se propagă în timp real pentru toți managerii (echipe, piață de transferuri, ligi).

---

### 1. Overview & Core Concept

- **Obiectiv**: Reducerea zgomotului de date și simplificarea radicală a entității `Player` la cele 6 atribute esențiale cerute:
  1. **Nume Complet** (`name`)
  2. **Club Superliga** (`clubId`)
  3. **Poziție Oficială** (`position`: GK, DEF, MID, FWD)
  4. **Naționalitate** (`nationality`)
  5. **Avatar / Poză Oficială** (`avatar`)
  6. **Cotă Transfermarkt** (`marketValue` în Euro)
  *(Punctajul total `pointsTotal` rămâne atașat pentru calculul clasamentelor fantasy din joc)*
- **Valoare Adăugată**: Formular de editare clar, rapid și fără rubrici inutile; baza de date devine compactă, performantă și sincronizată global pentru toți managerii care accesează aplicația.

---

### 2. User Experience & Visual Design

- **Formular de Editare Compact în Creator Hub**:
  - Modalul de editare din Creator Hub va conține strict cele 6 câmpuri cerute, organizate intuitiv într-un grid aerisit.
  - Eliminarea secțiunilor voluminoase de statistici detaliate care îngreunau navigarea.
  - Butonul de **Publicare Globală** cu confirmare prealabilă va salva datele în Firestore și va notifica creatorul prin feedback vizual imediat (toast de succes & animație subtilă).
- **Lista de Jucători din Navigator**:
  - Afișează curat avatarul, numele, clubul, poziția cu badge de culoare distinctiv, naționalitatea cu drapel/text și cota Transfermarkt în format tabular (`tabular-nums`).
  - Căutare instantanee și filtre rapide după club și poziție.
- **Propagare în Joc**:
  - Managerii văd imediat noile cote, poziții sau nume pe Piața de Transferuri și în lotul propriu fără a fi nevoie de refresh manual.

---

### 3. Key Product Decisions & Trade-Offs

- **Model de date unificat (Zero Bloat)**:
  - *Abordare*: Eliminarea din `types/football.ts` și din `superligaAll16ClubsPlayers.ts` a zecilor de parametri secundari care nu mai sunt necesari.
  - *Motiv*: Păstrează codul ușor de întreținut și reduce dramatic volumul de transfer în rețea și stocare Firestore.
- **Sincronizare Hibridă Firestore + Cache Local**:
  - *Abordare*: La salvarea unui jucător în Creator Hub, modificarea se scrie direct în colecția Firestore `global_players` și se actualizează `supermanager_player_overrides` în `localStorage`.
  - *Motiv*: Garantează persistența la nivel de server pentru toți utilizatorii, asigurând în același timp afișare instantanee la nivel local chiar și la porniri offline.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────┐
│             Creator & Commissioner Hub                 │
│  [Editare 6 Atribute] ──> [Confirmare Publicare]        │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
              ┌───────────────────────────┐
              │   saveGlobalPlayerEdit    │
              └─────────────┬─────────────┘
                            │
             ┌──────────────┴──────────────┐
             ▼                             ▼
┌─────────────────────────┐   ┌──────────────────────────┐
│   Firestore Database    │   │      FantasyContext      │
│  Collection:            │   │  - State-ul players      │
│  `global_players`       │   │  - Piata transferuri     │
│  (Sincronizare Globala) │   │  - Loturile managerilor  │
└─────────────────────────┘   └──────────────────────────┘
```

#### Etape de Implementare:
1. **Curățare Tipuri de Date (`src/types/football.ts`)**:
   - Păstrarea câmpurilor esențiale (`id`, `name`, `clubId`, `position`, `nationality`, `avatar`, `marketValue`, `pointsTotal`).
   - Eliminarea structurilor complexe de sub-statistici manuale.
2. **Optimizare Roster Bază de Date (`src/data/superligaAll16ClubsPlayers.ts`)**:
   - Streamline la loturile celor 16 cluburi oficiale pe structura curată.
3. **Adaptare Formular & Navigator (`src/components/creator/DatabaseNavigatorView.tsx`)**:
   - Eliminarea din formular a câmpurilor inutile (statistici de meci, motive medicale etc.).
   - Menținerea stilului de interfață apreciat de utilizator, focusat pe cele 6 elemente esențiale.
4. **Verificare Sincronizare Firestore (`src/lib/firebase.ts` & `src/context/FantasyContext.tsx`)**:
   - Asigurarea că `saveGlobalPlayerEdit` persistă fidel cele 6 atribute în documentul Firestore și le injectează în state-ul global al tuturor utilizatorilor.
5. **Validare & Compilare**:
   - Rularea `compile_applet` și `lint_applet` pentru integritate totală TypeScript.
