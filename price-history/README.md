# Istoric prețuri ZEN Clinics

Acest folder este **plasa de siguranță versionată** pentru prețuri. Tot ce e aici
e în Git, deci nu se mai poate pierde niciodată (e off-server, cu istoric complet).

## Cele 4 straturi de protecție împotriva pierderii prețurilor

1. **Server — `api/data/live-prices.json`**
   Prețurile live, scrise atomic (tmp + rename, fără corupere).

2. **Server — `api/data/backups/prices-AAAALLZZ-HHMMSS.json`**
   La FIECARE „Publică pe site", backend-ul (`api/prices.php`) salvează automat
   o copie a versiunii precedente. Păstrează ultimele 30.

3. **Calculatorul tău — descărcare automată**
   La fiecare „Publică pe site", panoul `login-owner.html` descarcă automat un
   fișier `zen-preturi-AAAALLZZ-HHMM.json` în Downloads și ține un istoric local
   al ultimelor 25 de variante (buton „Descarcă istoricul").

4. **Git — acest folder (`price-history/`)**
   Snapshot-uri datate, versionate. Imun la orice s-ar întâmpla cu serverul.

## Cum recuperez prețurile dacă pe site apar greșite / default

1. Deschide în browser: `https://zenclinics.ro/api/prices.php`
   - Dacă vezi `"source":"live"` → prețurile live sunt OK.
   - Dacă vezi `"source":"seed"` → serverul a pierdut `live-prices.json` și
     afișează lista implicită. Trebuie restaurat.
2. Pentru restaurare, urcă fișierul dorit (ex. `live-prices-2026-06-24.json`)
   în `public_html/api/data/` și redenumește-l `live-prices.json`.
3. Reîncarcă `https://zenclinics.ro/api/prices.php` — trebuie să apară `"source":"live"`.

## Cum adaug un snapshot nou în istoric

Ori de câte ori publici prețuri importante, ia fișierul descărcat automat
(`zen-preturi-*.json`) și pune-l aici, apoi commit. Așa rămâne pentru totdeauna.
