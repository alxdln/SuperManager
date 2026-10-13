# SuperManager România - Plan de Actualizare Arhitectură & Joc

Acest plan detaliază modificările solicitate pentru separarea panoului de Commissioner & Creator într-o experiență dedicată, îmbunătățirea statisticilor managerilor pe etape, optimizarea regulilor financiare ale Predictorului și curățarea elementelor redundante din interfață.

## Decizii Confirmate cu Utilizatorul

> [!IMPORTANT]
> - **Acces Panou Creator**: Mod separat de Creator & Commissioner securizat cu tastatură numerică PIN în setările aplicației (izolat complet de jocul utilizatorilor obișnuiți).
> - **Statistici Clasament General**: La click pe un manager din clasamentul general, se afișează un grafic de evoluție pe etape și lista detaliată a punctajelor obținute etapă cu etapă (nu primul 11).
> - **Recompense Predictor**: Exclusiv fonduri financiare în bugetul de transferuri: **€250k** (scor corect), **€100k** (diferență goluri), **€50k** (echipă câștigătoare), fără puncte fantasy.
> - **Curățare UI**: Eliminare număr tricou, vârstă, funcția Boost Fan LPF, butonul manual de actualizare cote din piață (trecut în background) și butonul "Vinde la ligă" din ecranul Echipă.
> - **Cote Jucători**: Cotele inițiale sunt calibrate conform datelor oficiale Transfermarkt Superliga.

---

## 1. Arhitectură & Fluxuri Utilizator

```
┌────────────────────────────────────────────────────────────────────────┐
│                   SUPERMANAGER ROMÂNIA (JOC UTILIZATOR)                │
├────────────────────────────────┬───────────────────────────────────────┤
│ Antet: Setări & Profil         │ - Setări Cont                         │
│                                │ - Administrare Setări Ligă (Mutat sus)│
│                                │ - Acces Securizat PIN -> Creator Hub  │
├────────────────────────────────┼───────────────────────────────────────┤
│ Tab 1: ECHIPĂ                  │ - Fără buton "Vinde la ligă"          │
│                                │ - Fără Boost Fan LPF                  │
│                                │ - Fără vârstă / număr tricou          │
├────────────────────────────────┼───────────────────────────────────────┤
│ Tab 2: PIAȚĂ DE TRANSFERURI    │ - Fără buton manual de cote           │
│                                │ - Cota de referință Transfermarkt     │
├────────────────────────────────┼───────────────────────────────────────┤
│ Tab 3: CLASAMENTE              │ - Clasament Etapă -> Primul 11        │
│                                │ - Clasament General -> Modal Etape:   │
│                                │   Grafic + Punctaj Etapă cu Etapă     │
├────────────────────────────────┼───────────────────────────────────────┤
│ Tab 4: SUPERPREDICTOR          │ - Recompense: 250k / 100k / 50k €     │
└────────────────────────────────┴───────────────────────────────────────┘
                                   │
                           [PIN 1923 Securizat]
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│             APLICAȚIE SEPARATĂ: CREATOR & COMMISSIONER HUB             │
├────────────────────────────────────────────────────────────────────────┤
│ • Panou de Control Global Creator (Comisariat Oficial)                 │
│ • Adăugare Fotbaliști Noi (Transfermarkt API / cote inițiale)          │
│ • Management Stare Jucători (Activ, Accidentat, Suspendat)             │
│ • Motor Background de Recalculare Cote de Piață Săptămânale            │
│ • Buton Revenire Rapidă în Jocul Fantasy                              │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Detalierea Componentelor & Modificărilor

### A. Clasament General -> Statistica pe Etape a Managerilor
- În `src/components/leaderboard/LeaderboardView.tsx`:
  - În tabul **Clasament General**, click-ul pe orice manager deschide `ManagerSeasonStatsModal.tsx`.
  - În tabul **Clasament Etapă Live**, click-ul pe manager continuă să deschidă `ManagerSquadModal.tsx` (cu primul 11 și căpitanul).
- În `ManagerSeasonStatsModal.tsx`:
  - Afișează istoricul performanței managerului pentru toate etapele jucate (Etapa 1 - Etapa 9).
  - Grafic vizual SVG / bară de evoluție a punctelor per etapă.
  - Tabel detaliat cu: Etapa, Puncte obținute, Poziția în etapă, Cel mai bun jucător al etapei.
  - Statistici cheie: Punctaj mediu/etapă, Etapa record, Total puncte.

### B. Panou Commissioner & Creator Separata (Creator Hub)
- Izolare completă din jocul standard:
  - Nu mai există iconiță de commissioner în antetul utilizatorului obișnuit.
  - În modalul de profil/setări există o opțiune securizată: *"Panou Creator & Commissioner"*.
  - Solicită introducerea unui cod PIN (implicit `1923` sau configurat de utilizator) printr-un ecran de securitate iOS numeric.
- În modul Creator:
  - Antet dedicat de culoare distinctă (Dark Slate cu accente de aur/indigo `SuperManager Admin OS`).
  - Posibilitatea de a adăuga jucători noi în Superliga cu date Transfermarkt (Nume, Club, Poziție, Cotă piață inițială Transfermarkt, Foto).
  - Listă completă de fotbaliști cu filtre rapide și comutator de status (Activ / Accidentat / Suspendat).
  - Buton de forțare a actualizării cotelor de piață bazate pe media săptămânală din ligi.
  - Buton de ieșire și revenire în modul jucător.

### C. Mutare Setări Admin Ligă în Antetul de Setări
- În `AuthAndSettingsModal.tsx`:
  - Adăugare secțiune dedicată "Setări Ligă (Admin)":
    - Nume Ligă, Cod de Invitație prieteni, Buget inițial alocat, Număr maxim de jucători per lot (16), Fereastră de transferuri deschisă/închisă, Permitere licitații între membri.

### D. Reguli Noi SuperPredictor (Fără Puncte, Doar Buget)
- În `SuperPredictorAndRewardsView.tsx` și `FantasyContext.tsx`:
  - **Scor Exact Ghicit**: **+€250,000** transferuri (0 puncte).
  - **Diferență de Goluri Ghicită**: **+€100,000** transferuri (0 puncte).
  - **Rezultat 1X2 Ghicit**: **+€50,000** transferuri (0 puncte).
  - Actualizare ghid de reguli și etichete vizuale în interfața de predicții.

### E. Eliminare Elemente Redundante
- **Vârstă & Număr Tricou**: Eliminate din `PlayerDetailModal.tsx`, liste și formulare.
- **Boost Fan LPF**: Eliminat din `TacticalPitchView.tsx`, `LiveMatchdayView.tsx` și din calculul `squadPointsMatchday`.
- **Buton "Vinde la Ligă" din Echipa Mea**: Eliminat din `PlayerDetailModal.tsx` când jucătorul este privit din perspectiva echipei. Transferurile se fac prin listare pe piață (unde liga oferă automat cota garantată) sau vânzare din interfața pieței.
- **Buton Manual Actualizare Cote din Piață**: Eliminat din `TransferMarketView.tsx`; actualizarea se execută automat în background la finalul simulării fiecărei etape sau manual din Creator Hub.

### F. Cote Inițiale Calibrate conform Transfermarkt
- Ajustarea bazei de date `superligaData.ts` cu valorile de piață autentice Transfermarkt:
  - FCSB: Olaru €7.0M, Târnovanu €3.0M, Șut €2.5M, Bîrligea €3.0M, Ngezana €2.0M, Radunovic €1.5M.
  - Rapid: Mitriță / Petrila €2.0M, Cîrjan €1.2M, Dobre €1.0M.
  - CFR Cluj: Tachtsidis €800k, Deac €400k, Postolachi €700k.
  - Universitatea Craiova: Mitriță €4.0M, Bancu €1.5M, Baiaram €1.2M.
  - Dinamo: Politic €1.2M, Selmani €900k, Cîrjan €800k.
  - U Cluj: Thiam €1.0M, Nistor €600k, Chipciu €500k.

---

## 3. Verificare & Plan de Testare
1. Verificare clasament general: click pe un manager -> deschidere istoric complet pe etape (grafic + puncte etapa 1..9).
2. Verificare clasament etapă: click pe un manager -> deschidere primul 11 din etapa respectivă.
3. Verificare comutare în modul Creator prin PIN `1923` din meniul de setări.
4. Verificare SuperPredictor: revendicarea premiilor oferă exact 250k / 100k / 50k € în buget și 0 puncte.
5. Verificare lipsă vârstă, număr tricou, boost fan LPF și buton "Vinde la ligă" din lot.
6. Rulare `compile_applet` și `lint_applet` pentru asigurarea stabilității 100%.
