<?php
/**
 * ZEN Clinics — trimite email automat la inscrierea unui Card VIP.
 * Foloseste serverul de mail al cPanel (NAV) prin functia mail() din PHP.
 * Nu necesita niciun serviciu extern (Resend/Brevo etc.).
 */

/* ============================================================
   SETARI — singura zona pe care o modifici dupa nevoie
   ============================================================ */

// Adresa "From" de la care pleaca emailurile.
const MAIL_FROM      = 'office@zenclinics.ro';
const MAIL_FROM_NAME = 'ZEN Clinics';

// Trimite email de confirmare catre CLIENT?
const SEND_CLIENT_CONFIRMATION = true;

// Trimite notificare catre ECHIPA cand cineva nou se inscrie?
//   -> pune false daca nu vrei sa primesti email la fiecare inscriere.
const NOTIFY_ENABLED = true;

// Cine primeste notificarile de inscriere (poti schimba ORICAND).
//   -> poti pune mai multe adrese separate prin virgula: 'office@zenclinics.ro, marketing@zenclinics.ro'
const NOTIFY_TO = 'office@zenclinics.ro';

// Limita anti-abuz: cate emailuri se pot trimite de la acelasi IP intr-un interval.
const RATE_MAX    = 20;    // numar maxim de trimiteri...
const RATE_WINDOW = 3600;  // ...intr-un interval (secunde). 3600 = 1 ora.

// Domeniile permise sa apeleze acest endpoint.
$ALLOWED_ORIGINS = ['https://zenclinics.ro', 'https://www.zenclinics.ro'];

/* ============================================================
   De aici in jos nu trebuie sa modifici nimic.
   ============================================================ */

// ---- CORS ----
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
if (in_array($origin, $ALLOWED_ORIGINS, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
}
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Method not allowed']);
    exit;
}

// ---- Citire payload ----
$raw  = file_get_contents('php://input');
$data = json_decode($raw, true);
if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Invalid payload']);
    exit;
}

$email = isset($data['email']) ? trim((string) $data['email']) : '';
$name  = isset($data['full_name']) ? trim((string) $data['full_name']) : '';

// ---- Validari ----
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 254) {
    http_response_code(422);
    echo json_encode(['ok' => false, 'error' => 'Email invalid']);
    exit;
}
$name = preg_replace('/[\r\n]+/', ' ', $name);   // fara linii noi (anti header-injection)
$name = trim(strip_tags($name));                  // fara taguri HTML
if (strlen($name) > 80) {
    $name = substr($name, 0, 80);
}
$displayName = $name !== '' ? $name : 'client ZEN';

// ---- Rate limiting per IP (fisier temporar) ----
$ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
if (!empty($_SERVER['HTTP_CF_CONNECTING_IP'])) {   // IP-ul real cand traficul vine prin Cloudflare
    $ip = $_SERVER['HTTP_CF_CONNECTING_IP'];
}
$bucket = sys_get_temp_dir() . '/zenvip_' . md5($ip) . '.json';
$now    = time();
$hits   = [];
if (is_file($bucket)) {
    $stored = json_decode((string) file_get_contents($bucket), true);
    if (is_array($stored)) {
        foreach ($stored as $ts) {
            if (($now - (int) $ts) < RATE_WINDOW) {
                $hits[] = (int) $ts;
            }
        }
    }
}
if (count($hits) >= RATE_MAX) {
    http_response_code(429);
    echo json_encode(['ok' => false, 'error' => 'Prea multe cereri. Incearca mai tarziu.']);
    exit;
}
$hits[] = $now;
@file_put_contents($bucket, json_encode($hits), LOCK_EX);

// ---- Trimitere emailuri ----
error_reporting(0);
ini_set('display_errors', '0');

$fromHeader = sprintf('=?UTF-8?B?%s?= <%s>', base64_encode(MAIL_FROM_NAME), MAIL_FROM);
$safeName = htmlspecialchars($displayName, ENT_QUOTES, 'UTF-8');
$errors = [];

try {
    if (!function_exists('mail')) {
        $errors[] = 'mail() not available';
    } else {
        $clientOk = false;
        $notifyOk = false;

        if (SEND_CLIENT_CONFIRMATION) {
            $clientHtml = '<!doctype html><html lang="ro"><body style="margin:0;background:#0d0b09;font-family:Arial,Helvetica,sans-serif;color:#1a1408;">'
                . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0d0b09;padding:32px 0;"><tr><td align="center">'
                . '<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#fbf7ef;border-radius:18px;overflow:hidden;box-shadow:0 18px 60px rgba(0,0,0,.4);">'
                . '<tr><td style="background:linear-gradient(135deg,#c8a45d,#a07c2f);padding:30px 36px;text-align:center;">'
                . '<div style="font-size:13px;letter-spacing:3px;text-transform:uppercase;color:#1a1408;font-weight:700;">ZEN Clinics</div>'
                . '<div style="font-size:24px;color:#1a1408;margin-top:6px;font-weight:700;">Card VIP</div></td></tr>'
                . '<tr><td style="padding:34px 36px;color:#2a241c;font-size:15px;line-height:1.7;">'
                . '<p style="margin:0 0 14px;">Bună, <strong>' . $safeName . '</strong>,</p>'
                . '<p style="margin:0 0 14px;">Îți mulțumim pentru solicitarea <strong>Cardului VIP ZEN Clinics</strong>! Am primit cererea ta cu succes.</p>'
                . '<p style="margin:0 0 14px;">Echipa noastră îți va pregăti cardul și te va contacta în scurt timp cu toate detaliile despre beneficii, reduceri și serviciile exclusive rezervate membrilor VIP.</p>'
                . '<p style="margin:0 0 22px;">Până atunci, te așteptăm cu drag.</p>'
                . '<div style="border-top:1px solid #e6dcc6;padding-top:18px;font-size:13px;color:#6b6257;">'
                . 'Cu drag,<br><strong style="color:#a07c2f;">Echipa ZEN Clinics</strong><br>'
                . '<a href="https://zenclinics.ro" style="color:#a07c2f;text-decoration:none;">zenclinics.ro</a></div>'
                . '</td></tr></table></td></tr></table></body></html>';

            $headers = "MIME-Version: 1.0\r\nContent-Type: text/html; charset=UTF-8\r\nFrom: " . $fromHeader . "\r\nReply-To: " . MAIL_FROM;
            $clientOk = @mail($email, '=?UTF-8?B?' . base64_encode('Confirmare solicitare Card VIP — ZEN Clinics') . '?=', $clientHtml, $headers);
            if (!$clientOk) { $errors[] = 'client mail failed'; }
        }

        if (NOTIFY_ENABLED) {
            $safeEmail  = htmlspecialchars($email, ENT_QUOTES, 'UTF-8');
            $notifyHtml = '<!doctype html><html lang="ro"><body style="font-family:Arial,Helvetica,sans-serif;color:#1a1408;">'
                . '<h2 style="color:#a07c2f;">Înscriere nouă Card VIP</h2>'
                . '<p>Un client nou a solicitat Cardul VIP:</p>'
                . '<table cellpadding="6" style="border-collapse:collapse;font-size:14px;">'
                . '<tr><td style="color:#6b6257;">Nume:</td><td><strong>' . $safeName . '</strong></td></tr>'
                . '<tr><td style="color:#6b6257;">Email:</td><td><a href="mailto:' . $safeEmail . '">' . $safeEmail . '</a></td></tr>'
                . '<tr><td style="color:#6b6257;">Data:</td><td>' . date('d.m.Y H:i') . '</td></tr>'
                . '</table></body></html>';

            $headers = "MIME-Version: 1.0\r\nContent-Type: text/html; charset=UTF-8\r\nFrom: " . $fromHeader . "\r\nReply-To: " . MAIL_FROM;
            $notifyOk = @mail(NOTIFY_TO, '=?UTF-8?B?' . base64_encode('Card VIP — înscriere nouă: ' . $displayName) . '?=', $notifyHtml, $headers);
            if (!$notifyOk) { $errors[] = 'notify mail failed'; }
        }
    }
} catch (Throwable $e) {
    $errors[] = $e->getMessage();
}

http_response_code(200);
header('Content-Type: application/json; charset=utf-8');
echo json_encode([
    'ok' => empty($errors),
    'email_to' => $email,
    'errors' => $errors ?: null
]);
