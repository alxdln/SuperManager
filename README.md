# SuperManager România - Fantasy Superliga

Aplicație web Fantasy Football pentru Superliga României (stil Kickbase), cu tactici de joc, piață de transferuri live, meciuri și statistici în timp real.

## 🚀 Rulare locală (Development)

Pentru a rula proiectul pe propriul calculator:

```bash
# 1. Instalează dependențele
npm install

# 2. Pornește serverul de dezvoltare
npm run dev
```

Deschide în browser adresa afișată (de regulă `http://localhost:3000`).

---

## 🌐 Publicare pe GitHub Pages (Cum să funcționeze pe GitHub)

Proiectul este configurat cu **Vite** și căi relative (`base: './'`), plus un fișier de automatizare inclus în `.github/workflows/deploy.yml`.

### Activare automată din GitHub:
1. Urcă fișierele pe GitHub (`git push origin main` sau `master`).
2. Pe pagina repository-ului tău de GitHub, mergi la **Settings** -> **Pages** (meniul din stânga).
3. La secțiunea **Build and deployment** -> **Source**:
   - Alege **GitHub Actions** (în loc de *Deploy from a branch*).
4. GitHub va rula automat workflow-ul din `.github/workflows/deploy.yml` și va publica jocul pe link-ul tău `https://<utilizator>.github.io/<repo>/`!

---

## 🛠️ Build pentru producție manual

Dacă dorești să construiești manual fișierele statice:

```bash
npm run build
```

Fișierele gata optimizate se vor genera în folderul `dist/`.
