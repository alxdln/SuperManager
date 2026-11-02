# Plan de Implementare: Sistem Autentificare Modern, Sincronizare Firestore & Aprobare Membri Ligă

Plan complet pentru modernizarea autentificării (Google, Apple, Email/Parolă cu Firebase & Firestore), editarea profilului de manager din Creator OS cu persistență globală, redirecționarea automată în liga activă și fluxul de aprobare a cererilor de aderare de către administrator.

---

## Decizii Confirmate & Preferințe Utilizator

> [!IMPORTANT]
> Conform răspunsurilor din faza de clarificare:
> - **Autentificare Google & Apple**: Integrare directă prin Firebase Auth (`signInWithPopup` cu `GoogleAuthProvider` și `OAuthProvider('apple.com')`), cu fallback securizat și salvare automată a profilului în colecția centrală `users/{uid}`.
> - **Panou Aprobare Admin**: Notificare în joc și panou dedicat de aprobare integrat în secțiunea Ligii (Leaderboard / League Hub), unde administratorul poate accepta sau respinge cererile înainte de generarea lotului de jucători.

---

## 1. Prezentare Generală & Obiective

Acest modul rezolvă cele 5 cerințe cheie semnalate:
1. **Autentificare Google & Apple Funcțională**: Conectare reală prin Firebase Authentication SDK cu sincronizare instantanee a contului în Firestore.
2. **Logare Securizată cu Email & Parolă**: Repararea formularului de login, validare modernă cu Firestore `users`, persistență sigură a sesiunii și tratare clară a erorilor în limba română.
3. **Editare Manager din Creator OS**: Repararea salvării contului `alex.manager@superliga.ro` și a oricărui manager; propagare imediată în `users/{id}` și actualizarea stării profilului curent în fundal.
4. **Auto-Încărcare Ligă Activă la Login**: La autentificare, dacă managerul este deja înscris într-o ligă activă, jocul intră direct în interfața principală. Dacă managerul nu are nicio ligă, se afișează pașii inițiali (creare ligă sau intrare cu cod).
5. **Sistem de Aprobare Admin pentru Intrarea în Ligă**: Când un utilizator introduce codul unei ligi, se creează o cerere în așteptare (`pending`). Adminul primește notificare și poate apăsa **Acceptă** sau **Respinge**. Doar la aprobarea adminului se alocă lotul de 14 fotbaliști și se debitează bugetul.

---

## 2. Experiență Utilizator & Fluxuri Vizuale

### Fluxul 1: Conectare (Email, Google, Apple)
```
[Ecran Autentificare]
  ├── Buton "Conectare cu Google" (Popup Firebase Auth -> profil generat în Firestore)
  ├── Buton "Conectare cu Apple" (Popup Apple OAuth -> profil generat în Firestore)
  └── Formular Email & Parolă
        ├── Verificare existență cont în Firestore / Auth
        ├── Dacă are ligă activă -> Redirecționare directă în joc (Club / Teren)
        └── Dacă nu are ligă -> Pasul 2: Creare Ligă sau Alăturare cu Cod
```

### Fluxul 2: Cerere de Aderare la Ligă & Aprobare Admin
```
[Manager Nou]
  └── Introduce Codul Ligii (ex: "SUPER2026")
        └── Status: "Cerere Trimisă - În Așteptarea Aprobării de către Administrator"
              └── (NU primește încă fotbaliști; ecran de așteptare prietenos)

[Administratorul Ligii]
  ├── Notificare în joc: "🔔 Cerere nouă de aderare: [Nume Manager] ([Nume Echipă])"
  └── În tab-ul "Clasament / Liga Mea" apare secțiunea:
        ┌─────────────────────────────────────────────────────────────┐
        │ 📋 Cereri de Aderare în Așteptare (1)                       │
        │ • Alex D. (Tricolorii Giulești) · cerut acum 5 min         │
        │   [✓ Acceptă în Ligă]     [✗ Respinge]                     │
        └─────────────────────────────────────────────────────────────┘
  └── La click pe [Acceptă]:
        ├── Managerul este adăugat oficial în membrii ligii
        ├── I se generează pachetul de start de 14 jucători unici
        └── Se trimite notificare de bun venit și articol în știrile ligii
```

### Fluxul 3: Salvare Date Manager în Creator OS
```
[Creator OS -> Navigator Bază de Date -> Tab Manageri]
  └── Click "Editează" pe alex.manager@superliga.ro
        ├── Modificare email / nume / echipă / buget / rol
        ├── Click "Salvează Manager"
        ├── Scriere directă în Firestore (users/{id}) și actualizare localStorage
        ├── Dacă managerul editat este cel conectat, actualizează starea `user` din context
        └── Notificare verde: "Datele managerului au fost salvate cu succes în baza de date!"
```

---

## 3. Arhitectură Tehnică & Diagramă de Date

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                            FRONTEND INTERACTION                              │
│                                                                              │
│  GameAuthAndOnboardingFlow       AuthAndSettingsModal      Creator OS Modal  │
│  (Google/Apple/Email login)      (Profil, Setări, Switch)  (Editare Manager) │
└──────────────────────┬───────────────────────┬───────────────────────┬───────┘
                       │                       │                       │
                       ▼                       ▼                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                               FANTASY CONTEXT                                │
│                                                                              │
│  • login(email, pass) -> interogare Firestore, detectare ligă activă         │
│  • loginWithProvider(provider) -> Firebase Auth signInWithPopup              │
│  • requestJoinLeague(code) -> creare cerere pending în Firestore             │
│  • approveLeagueJoinRequest(reqId) -> activare membru + alocare 14 jucători  │
│  • rejectLeagueJoinRequest(reqId) -> respingere cerere                       │
│  • updateManagerGlobalProfile(account) -> sincronizare Firestore + state     │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       │
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                           FIRESTORE DATABASE ENGINE                          │
│                                                                              │
│  collections:                                                                │
│  ├── /users/{userId}           (id, email, name, teamName, budget, leagueId) │
│  ├── /leagues/{leagueId}       (id, name, code, creatorId, members)          │
│  └── /league_requests/{reqId}  (leagueId, userId, teamName, status: pending) │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Etape de Execuție

1. **Servicii Firebase Auth & Firestore (`src/lib/firebase.ts`)**:
   - Adăugare `signInWithGooglePopup()` și `signInWithApplePopup()` folosind Firebase Auth SDK.
   - Adăugare structură `LeagueJoinRequest` și funcții Firestore:
     - `createFirestoreLeagueJoinRequest(req)`
     - `getFirestoreLeagueJoinRequests(leagueId)`
     - `respondFirestoreLeagueJoinRequest(requestId, status, leagueId, userId)`
   - Rafinare `updateFirestoreUserAccount`: rezolvare migrare cheie email când emailul este schimbat.

2. **Logica în `src/context/FantasyContext.tsx`**:
   - **`login`**: Căutare profil în Firestore `users`, sincronizare date, setare `isAuthenticated = true`, verificare `leagueId` / `leagueCode`. Returnare `{ success, hasLeague, isCreator, isPendingApproval }`.
   - **`loginWithProvider`**: Executare popup Google/Apple, creare profil dacă e prima logare, redirecționare corespunzătoare.
   - **`requestJoinLeague`**: Trimitere cerere cu status `pending` dacă liga are administrator; afișare mesaj clar în loc de alocare directă.
   - **`approveLeagueJoinRequest` & `rejectLeagueJoinRequest`**: Aprobarea cererii de către admin, generarea lotului de 14 fotbaliști pentru utilizator și adăugarea în clasamentul ligii.
   - **`updateManagerGlobalProfile`**: Sincronizare directă când se editează din Creator OS sau profil.

3. **Interfețe Vizuale**:
   - **`GameAuthAndOnboardingFlow.tsx`**:
     - Tratare completă a erorilor și a stărilor de loading la login/register.
     - Suport pentru starea de "Cerere în așteptare aprobare admin" cu buton de reîmprospătare stare.
     - Butoane Google și Apple legate la autentificarea reală.
   - **`DatabaseNavigatorView.tsx` (Creator OS)**:
     - Reparare buton "Salvează Manager" astfel încât să apeleze `updateManagerGlobalProfile` și să actualizeze instantaneu starea aplicației fără blocaje.
   - **`LeaderboardView.tsx` / `ClubDashboardView.tsx`**:
     - Panou dedicat pentru Administratorul Ligii: lista cererilor de aderare în așteptare cu butoanele "Acceptă" și "Respinge".

4. **Verificare & Validare**:
   - Rulare `compile_applet` și `lint_applet` pentru a garanta 0 erori TypeScript.
   - Verificare flux de logare cu `alex.manager@superliga.ro` și `creator@supermanager.ro`.
