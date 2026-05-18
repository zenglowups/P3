# ZEN Clinics Security Setup

## Ce este deja pregătit în repo

- `zen-config.js` ține doar setări publice: URL-ul Supabase Edge Functions și cheia publică Cloudflare Turnstile.
- Formularele trimit către `submit-contact` și `submit-loyalty` când `supabaseFunctionsUrl` este setat.
- Cloudflare Turnstile este randat automat pe formulare când `turnstileSiteKey` este setat.
- Supabase Edge Functions validează tokenul Turnstile pe server, salvează cererile în Supabase și trimit email prin Gmail API.
- `tools/build-static.mjs` construiește un `dist/` minificat pentru deploy. Minificarea reduce lizibilitatea, dar nu poate ascunde complet codul livrat browserului.

## Supabase

1. Creează proiectul Supabase.
2. Rulează SQL-ul din `supabase/schema.sql`.
3. Setează secretele din `supabase/.env.example` în Supabase Dashboard sau cu CLI.
4. Deploy pentru funcții publice:

```bash
supabase functions deploy submit-contact --no-verify-jwt
supabase functions deploy submit-loyalty --no-verify-jwt
supabase functions deploy price-search --no-verify-jwt
```

5. Completează în `zen-config.js`:

```js
window.ZEN_CONFIG = {
  supabaseFunctionsUrl: "https://PROJECT_REF.functions.supabase.co",
  turnstileSiteKey: "0x4AAAA..."
};
```

## Cloudflare

1. Mută DNS-ul domeniului `zenclinics.ro` în Cloudflare și activează proxy pe domeniu.
2. Activează SSL/TLS în modul `Full (strict)` după ce hostingul are certificat valid.
3. Creează un widget Cloudflare Turnstile pentru domeniul `zenclinics.ro`.
4. Pune cheia publică în `zen-config.js` și cheia secretă în `TURNSTILE_SECRET_KEY` în Supabase.
5. Adaugă reguli WAF/rate limiting pentru:
   - `/functions/v1/submit-contact`
   - `/functions/v1/submit-loyalty`
   - `/functions/v1/price-search`
   - `/login-owner*`

## Gmail API

1. Creează OAuth Client în Google Cloud pentru contul de trimitere.
2. Activează Gmail API.
3. Obține refresh token cu scope de trimitere email.
4. Setează `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`, `GMAIL_USER`, `GMAIL_FROM` în Supabase secrets.

Funcția `submit-loyalty` trimite email intern clinicii și email automatizat clientului nou înscris.

## Build minificat

Rulează:

```bash
node tools/build-static.mjs
```

Deploy se face din folderul `dist/`.

Important: codul frontend livrat browserului rămâne inspectabil în DevTools. Securitatea reală stă în server-side validation, secrete ținute în Supabase/Cloudflare, WAF, rate limiting și RLS, nu în ascunderea HTML/CSS/JS.
