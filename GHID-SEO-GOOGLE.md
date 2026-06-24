# Ghid lansare SEO — Google Search Console (zenclinics.ro)

Tot ce ține de cod este deja pregătit pentru domeniul **https://zenclinics.ro**:
canonical, Open Graph/Twitter, date structurate (MedicalClinic + geo, MedicalProcedure,
FAQ, breadcrumb), `sitemap.xml` (65 pagini) și `robots.txt`. Mai jos, pașii pentru ziua 1.

## 0. Înainte de toate
- Mută domeniul **zenclinics.ro** pe proiectul Vercel și setează-l ca **Primary Domain**
  (Vercel → Project → Settings → Domains). Astfel `zenclinics.vercel.app` face automat
  **redirect 301** către `.ro` și nu apar pagini duplicate în Google.

## 1. Verificarea proprietății în Search Console (partea „grea")
Două metode — alege una:

**A) DNS TXT (recomandat — acoperă tot domeniul, e cea mai stabilă)**
1. GSC → *Add property* → **Domain** → scrie `zenclinics.ro`.
2. Google îți dă un rând `TXT` (ex. `google-site-verification=xxxx`).
3. Îl adaugi la registrarul unde ai DNS-ul pentru `zenclinics.ro` (înregistrare TXT pe `@`).
4. Aștepți propagarea (de obicei minute, uneori până la 24–48h) → *Verify*.

**B) Etichetă HTML (instant dacă site-ul e deja live pe .ro)**
1. GSC → *Add property* → **URL prefix** → `https://zenclinics.ro`.
2. Copiezi codul din `<meta name="google-site-verification" content="...">`.
3. În `index.html` (în `<head>`) este pregătit un loc comentat — decomentează linia și
   lipește codul, apoi redeploy pe Vercel.
4. GSC → *Verify* (e instant după ce s-a propagat deploy-ul).

## 2. Trimite site-ul spre indexare
1. GSC → **Sitemaps** → adaugă `sitemap.xml` (URL complet: `https://zenclinics.ro/sitemap.xml`).
2. GSC → bara **URL Inspection** → caută `https://zenclinics.ro/` → **Request indexing**.
   Repetă pentru paginile importante (chirurgie-estetica, medicina-estetica, contact, prețuri,
   + 3–5 proceduri-cheie). Restul le ia Google din sitemap.

## 3. Recomandat în prima săptămână
- **Google Business Profile** pentru „ZEN Clinics București" (cel mai mare impact pe căutările
  locale / hartă). Aceeași adresă/telefon ca pe site.
- Cere **recenzii** pe Google — apoi putem adăuga `aggregateRating` (stele în rezultate).
- Bing Webmaster Tools (opțional) — poți importa direct din GSC.

## Note
- Nu trimite spre indexare versiunea `*.vercel.app` — canonical-ele indică `.ro`, deci Google
  va indexa corect doar domeniul final.
- După ce ai **programul de lucru** și **recenziile**, spune-ne și le adăugăm în schema clinicii.
