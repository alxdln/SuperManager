# SuperManager România — Arhitectură Cloud Firestore, Conexiuni Sofascore/Opta & Noul Modul "Club"

Plan complet de modernizare și sincronizare a jocului SuperManager România cu baza de date Firebase Firestore, eliminarea duplicărilor de date din interfață, integrarea fluxului de autentificare/onboarding și conectarea exclusivă a API-urilor Sofascore și Opta la motorul de scoring.

---

## Decizii Confirmate de Utilizator

> [!IMPORTANT]
> - **Canal unic de administrare**: Se elimină butoanele rapide din Header și din Setări. Accesul la Panoul de Bază de Date & API-uri se face **exclusiv prin Metoda 3: Creator & Commissioner OS** securizat cu PIN (`1923`).
> - **API-uri Live**: Se păstrează strict **Sofascore** și **Opta (API-Football)** (versiunile gratuite). **Flashscore este eliminat complet**. Toate evenimentele preluate din aceste două API-uri sunt mapate pe **Scoring Engine-ul nostru existent** (nu se alterează regulamentul de punctaj al jocului).
> - **Bază de date Jucători Liga 1**: Se populează baza de date Firestore cu toate cele 16 cluburi din Superliga României (FCSB, CFR Cluj, Rapid, Universitatea Craiova, Dinamo, Farul, Oțelul, Sepsi, U Cluj, Petrolul, Hermannstadt, UTA Arad, Poli Iași, Botoșani, Buzău, Slobozia), fiecare fotbalist având ID unic intern ascuns, nume, prenume, club, poziție, poză și stemă oficială.
> - **Autentificare obligatorie pe dispozitiv nou**: Dacă utilizatorul deschide jocul pe un dispozitiv neautentificat, este întâmpinat obligatoriu de ecranul de Login / Register (Email/Parolă, Google, Apple), datele salvându-se direct în Firestore (`users` collection).
> - **Onboarding & Creare Ligă**: După înregistrare, utilizatorul trece printr-un ghid dedicat: Creare Ligă Privată (buget echipă, limită fotbaliști per club, nume ligă) sau Alăturare via Cod / Link de invitație.
> - **Noul Tab "Club" în Footer (Landing Page)**: 
>   - Antet sus: Nume club, Poza profil manager, Valoare totală lot, Număr jucători în lot.
>   - Conținut principal: News feed minimalist (transferuri recente, intrări/ieșiri membri în ligă).
> - **Optimizare Tab "Echipa"**: Se elimină duplicările de date (valoarea lotului și punctele de etapă se mută exclusiv la „Club”; la „Echipa” rămân doar contorul mărimii lotului, selectorul de formație tactică și terenul interactiv).

---

## 1. Roadmap & Flux Utilizator (De la primul start la Dashboard)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. PORNIRE APLICAȚIE PE DISPOZITIV NOU                                       │
│    Verificare sesiune activă Firestore Auth / Local Storage Tokens         │
│    └─► Neautentificat? ──► ECRAN AUTENTIFICARE & ÎNREGISTRARE OBLIGATORIE   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 2. FLUX ONBOARDING: LIGĂ PRIVATĂ SAU PUBLICĂ                                │
│    Utilizatorul alege:                                                      │
│    ├─ A) Creează o Ligă nouă (Nume virtual, Buget inițial, Max jucători/club)│
│    └─ B) Introdu Cod de Invitație / Deschide Link (ex: SUPER-RAPID-2025)   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 3. INVITAȚIE PRIETENI (SHARE MODAL)                                         │
│    Generare link direct de alăturare și cod alfanumeric copiat cu 1-click   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 4. LANDING PAGE PE DASHBOARD: TABUL "CLUB"                                   │
│    ┌──────────────────────────────────────────────────────────────────┐     │
│    │ Antet Club: Nume Echipă │ Poză Profil │ Valoare Lot │ Nr. Jucători│     │
│    ├──────────────────────────────────────────────────────────────────┤     │
│    │ News Feed Minimalist:                                            │     │
│    │  • Transferuri confirmate în ligă                                │     │
│    │  • Notificări noi membri / părăsire ligă                         │     │
│    │  • Anunțuri de commissioner                                      │     │
│    └──────────────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Arhitectura de Date & Colecții Firestore

### Structură Firestore (`ai-studio-supermanagerromn-01d29af6-a169-4d70-bc4f-80623db89e6d`)

1. **`users/{userId}`**:
   - `id`: string (Firebase Auth UID)
   - `email`: string
   - `name`: string
   - `teamName`: string (Numele clubului virtual)
   - `avatar`: string URL
   - `budget`: number (€)
   - `leagueId`: string
   - `squad`: array cu IDs jucători și formație
   - `createdAt`: timestamp

2. **`leagues/{leagueId}`**:
   - `id`: string (ex: `liga-bucuresti-2025`)
   - `name`: string
   - `creatorUserId`: string
   - `inviteCode`: string (6 caractere alfanumerice unice)
   - `startingBudget`: number (€)
   - `maxClubPlayers`: number (ex: max 3 de la FCSB per lot)
   - `members`: array cu user IDs
   - `activityFeed`: array de evenimente (transferuri, alăturări)

3. **`players/{playerId}`**:
   - `id`: string UUID intern (nevizibil în frontend)
   - `firstName`: string (ex: "Alexandru")
   - `lastName`: string (ex: "Mitriță")
   - `clubId`: string (ex: "ucraiova")
   - `clubName`: string ("Universitatea Craiova")
   - `clubBadge`: string URL
   - `position`: "GK" | "DEF" | "MID" | "FWD"
   - `marketValue`: number
   - `photo`: string URL
   - `status`: "active" | "injured" | "suspended"

---

## 3. Conexiune Live Sofascore & Opta (API-Football) cu Scoring Engine

Flashscore se elimină complet din documentație, teste și cod. Se configurează cele 2 surse oficiale gratuite:

```
┌─────────────────────────────────┐       ┌─────────────────────────────────┐
│         SOFASCORE API           │       │       OPTA / API-FOOTBALL       │
│  • Preluare incidents live      │       │  • Superliga Fixtures (ID 283)  │
│  • Note oficiale (1.0 - 10.0)   │       │  • Meciuri viitoare programate  │
│  • Intervenții portari, șuturi  │       │  • Cartonașe, goluri, pase      │
└────────────────┬────────────────┘       └────────────────┬────────────────┘
                 │                                         │
                 └────────────────────┬────────────────────┘
                                      ▼
             ┌─────────────────────────────────────────────────┐
             │       ADAPTOR TRANSPUNERE EVENIMENTE            │
             │   Transformă evenimentele brute externe în      │
             │   codurile noastre: 'goal', 'assist', 'save',   │
             │   'shot_on_target', 'yellow_card', 'clean_sheet'│
             └────────────────────────┬────────────────────────┘
                                      ▼
             ┌─────────────────────────────────────────────────┐
             │         SCORING ENGINE SUPERMANAGER             │
             │  Calculează punctajul oficial al fotbalistului  │
             │  conform grilei noastre stabilite!              │
             └─────────────────────────────────────────────────┘
```

---

## 4. Modificări de Interfață & Componente

1. **Curățare Header & MobileShell**:
   - Se elimină butonul `ADMIN / DB` din Header.
   - În modalul de Setări se elimină cardul/tabul direct de Bază de Date.
   - Accesul la Panoul de Bază de Date și API-uri rămâne exclusiv în **Creator OS Dashboard** (securizat cu PIN 1923).
2. **Navigație Footer Actualizată**:
   - Tab 1: **Club** (Landing page cu profil manager, valoare lot, nr. jucători, news feed transferuri).
   - Tab 2: **Echipa** (Tactical pitch, selectare 11 de start, selector formație; se elimină valoarea lotului și punctele de etapă care sunt deja la Club).
   - Tab 3: **Meci** (Live match tracker cu simulare demo și evenimente).
   - Tab 4: **Transferuri** (Piața transferurilor cu regulă de overdraft -50%).
   - Tab 5: **Clasament** / **Predicții**.
3. **Ecran Autentificare & Onboarding Ligă**:
   - Modal/Ecran complet la pornire când utilizatorul nu este logat.
   - Ecran pas-cu-pas pentru crearea sau introducerea codului de ligă.
   - Buton de copiere link / cod invitație pentru prieteni.
4. **Populare Bază de Date**:
   - Generator complet pentru toate cele 16 cluburi din Liga 1 (FCSB, CFR Cluj, Rapid, Univ. Craiova, Farul, Dinamo, Oțelul Galați, U Cluj, Sepsi OSK, Petrolul, Hermannstadt, UTA Arad, Poli Iași, FC Botoșani, Gloria Buzău, Unirea Slobozia).

---

## 5. Etape de Verificare

- [ ] Verificare pornire aplicație în stare neautentificată (afișare ecran Login/Register).
- [ ] Testare înregistrare utilizator nou și salvare profil în Firestore.
- [ ] Testare creare ligă cu parametri personalizați și alăturare via cod de invitație.
- [ ] Verificare tab „Club” ca pagină principală cu valoare lot, număr jucători și news feed transferuri.
- [ ] Verificare ecran „Echipa” (absența duplicatelor de puncte/valoare, prezența selectorului de formație și mărimii lotului).
- [ ] Verificare acces Admin & Bază de Date: accesibil **strict** prin Creator OS (PIN 1923), absent din header.
- [ ] Verificare test API Sofascore & Opta cu transpunere directă în puncte conform Scoring Engine.
- [ ] Rulare `npm run lint` și `compile_applet`.
