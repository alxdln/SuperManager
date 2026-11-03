# Indicatori Vizuali Universali de Încărcare la Salvare și Ștergere Bază de Date

Sistem unitar de feedback vizual pentru toate acțiunile de modificare a bazei de date (adăugare, editare, salvare, ștergere) în Creator OS, Panou Admin și Setări: butonul afișează un spinner rotativ animat lângă textul curent, se dezactivează pentru a preveni dubla trimitere, iar fereastra modală/dialogul se închide automat după finalizarea operațiunii.

## Decizii Confirmate & Preferințe Utilizator

> [!IMPORTANT]
> Conform răspunsurilor oferite în etapa de clarificare:
> - **Stil indicator**: Spinner rotativ animat (`RefreshCw` / `Loader2` cu clasa `animate-spin`) poziționat direct lângă textul existent al butonului, păstrând eticheta intactă.
> - **Flux după finalizare**: Închiderea imediată a dialogului/modalului, fără notificări de tip toast suplimentare.
> - **Protecție dublă-acțiune**: Butoanele sunt dezactivate (`disabled`) pe durata încărcării pentru a preveni trimiteri multiple concurente în baza de date.

---

## 1. Prezentare Generală & Obiective

În Creator OS și în modulele de administrare, operațiunile de scriere/ștergere în baza de date (jucători, manageri, ligi, cluburi, cereri de aderare) trebuie să ofere același comportament intuitiv pe care utilizatorul l-a apreciat la editarea managerilor:
1. La click pe butonul de acțiune, starea `isSubmitting`/`isLoading` devine activă.
2. Butonul devine semi-opac (`disabled`), iar un spinner rotativ animat apare lângă textul butonului.
3. Operațiunea asincronă de salvare sau ștergere în Firestore și memoria locală se execută în siguranță.
4. Fereastra modală/dialog box-ul se închide automat, iar lista sau vizualizarea din spate reflectă imediat modificarea.

---

## 2. Puncte de Interacțiune Vizate în Aplicație

### A. Creator OS – Database Navigator (`DatabaseNavigatorView.tsx`)
1. **Adăugare Jucător Nou (`handleCreateNewPlayer`)**:
   - Buton: `Salvează & Publică Global`
   - Stare adăugată: `isCreatingPlayer`
   - Efect: spinner rotativ lângă text + închidere modal `isAddPlayerModalOpen`.
2. **Editare Jucător (`handleConfirmGlobalPublish`)**:
   - Buton: `Confirmă & Publică Global`
   - Stare adăugată: `isPublishingPlayer`
   - Efect: spinner rotativ lângă text + închidere modal `confirmPublishModalOpen` și `editingPlayer`.
3. **Ștergere Jucător (`handleDeletePlayer`)**:
   - Buton: `Confirmă Ștergerea`
   - Stare adăugată: `isDeletingPlayer`
   - Efect: spinner rotativ lângă text + închidere modal `deletePlayerConfirmId`.
4. **Editare Manager (`handleSaveManager`)**:
   - Buton: `Salvează Manager`
   - Stare existentă: `isSavingManager` (menținută și aliniată la cerința fără toast).
5. **Ștergere Manager (`handleDeleteManager`)**:
   - Buton: `Confirmă Ștergerea`
   - Stare adăugată: `isDeletingManager`
   - Efect: spinner rotativ lângă text + închidere modal `deleteManagerConfirm`.
6. **Resetare Parolă Manager (`handleSendPasswordReset`)**:
   - Buton: `Trimite Link Resetare`
   - Stare adăugată: `isSendingReset`
   - Efect: spinner rotativ lângă text + închidere modal `passwordResetManager`.
7. **Editare Reguli Ligă (`handleSaveLeague`)**:
   - Buton: `Salvează Modificările Ligii`
   - Stare adăugată: `isSavingLeague`
   - Efect: spinner rotativ lângă text + închidere modal `editingLeague`.
8. **Ștergere Ligă (`handleDeleteLeague`)**:
   - Buton: `Confirmă Ștergerea Ligii`
   - Stare adăugată: `isDeletingLeague`
   - Efect: spinner rotativ lângă text + închidere modal `deleteLeagueConfirm`.
9. **Adăugare Club Nou (`handleAddClub`)**:
   - Buton: `Salvează Clubul în Baza de Date`
   - Stare adăugată: `isAddingClub`
   - Efect: spinner rotativ lângă text + închidere modal `isAddClubModalOpen`.
10. **Editare Club Superliga (`handleSaveClub`)**:
    - Buton: `Salvează Modificările`
    - Stare adăugată: `isSavingClub`
    - Efect: spinner rotativ lângă text + închidere modal `editingClub`.

### B. Panou Aprobare Cereri Ligă (`LeaderboardView.tsx`)
1. **Aprobare Cerere Aderare (`approveLeagueJoinRequest`)**:
   - Buton: `Acceptă & Acordă Lot`
   - Stare adăugată: `processingRequestId` (reține id-ul cererii curente).
   - Efect: spinner rotativ animat pe butonul cererii respective, prevenind click-uri multiple.
2. **Respingere Cerere Aderare (`rejectLeagueJoinRequest`)**:
   - Buton: `Respinge`
   - Stare adăugată: spinner rotativ lângă text pe durata apelului.

### C. Panou Administrator & Setări (`AdminDashboardModal.tsx` & `AuthAndSettingsModal.tsx`)
1. **Adăugare Jucător în Panoul Admin**:
   - Buton: `Înregistrează & Listează pe Piață`
   - Stare: `isSaving` + închidere dialog după finalizare.
2. **Salvare Setări Ligă**:
   - Buton: `Salvează Modificările Ligii`
   - Stare: `isSavingLeague` + închidere dialog după finalizare.
3. **Actualizare Nume Echipă / Profil Manager**:
   - Buton: `Salvează Nume Echipă`
   - Stare: `isUpdatingProfile` + închidere modal.

---

## 3. Arhitectură Tehnică & Șablon Vizual

### Șablon Vizual Buton cu Încărcare
```tsx
<button
  type="submit"
  disabled={isLoading}
  className="... flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
>
  {isLoading && <RefreshCw className="w-4 h-4 animate-spin text-current" />}
  <span>{buttonText}</span>
</button>
```

```
┌─────────────────────────────────────────────────────────┐
│ Dialog / Modal Acțiune Bază de Date                     │
├─────────────────────────────────────────────────────────┤
│ [Inputuri / Mesaj Confirmare]                           │
│                                                         │
│ Acțiune Utilizator: Click [Salvează / Confirmă]         │
│   │                                                     │
│   ▼                                                     │
│ [State: isLoading = true, disabled = true]              │
│   │                                                     │
│   ▼ (Buton afișează spinner rotativ lângă text)         │
│ [Așteptare salvare Firestore & localStorage]            │
│   │                                                     │
│   ▼                                                     │
│ [Închidere Automată Fereastră Modală (closeModal)]      │
│ [Reîmprospătare Listă Date în Fundal]                   │
└─────────────────────────────────────────────────────────┘
```

---

## 4. Etape de Execuție & Verificare

1. **Implementare stări în `DatabaseNavigatorView.tsx`**:
   - Adăugarea variabilelor de stare pentru fiecare dialog (jucători, manageri, ligi, cluburi).
   - Actualizarea funcțiilor handler asincrone (`try/finally`) pentru resetarea stării și închiderea modalului.
   - Integrarea spinner-ului rotativ lângă textul butonului pe toate butoanele de submit și confirmare.
2. **Implementare în `LeaderboardView.tsx`**:
   - Adăugare `processingRequestId` pentru acțiunile `approveLeagueJoinRequest` și `rejectLeagueJoinRequest`.
3. **Implementare în `AdminDashboardModal.tsx` & `AuthAndSettingsModal.tsx`**:
   - Integrare feedback de încărcare și închidere automată după finalizarea salvării.
4. **Validare & Testare Build**:
   - Rulare `lint_applet` și `compile_applet` pentru a asigura un cod robust și fără erori de sintaxă sau tipuri.
