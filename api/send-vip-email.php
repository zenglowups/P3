<?php
/**
 * ZEN Clinics — trimite email VIP Card prin SMTP direct (fsockopen).
 * mail() e dezactivat pe acest hosting, asa ca vorbim direct cu Exim pe localhost:25.
 */

const MAIL_FROM      = 'office@zenclinics.ro';
const MAIL_FROM_NAME = 'ZEN Clinics';
const SEND_CLIENT_CONFIRMATION = true;
const NOTIFY_ENABLED = true;
const NOTIFY_TO      = 'office@zenclinics.ro';
const RATE_MAX       = 20;
const RATE_WINDOW    = 3600;

$ALLOWED_ORIGINS = ['https://zenclinics.ro', 'https://www.zenclinics.ro'];

error_reporting(0);
ini_set('display_errors', '0');

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

// ---- Payload ----
$raw  = file_get_contents('php://input');
$data = json_decode($raw, true);
if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Invalid payload']);
    exit;
}

$email = isset($data['email']) ? trim((string) $data['email']) : '';
$name  = isset($data['full_name']) ? trim((string) $data['full_name']) : '';

if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 254) {
    http_response_code(422);
    echo json_encode(['ok' => false, 'error' => 'Email invalid']);
    exit;
}
$name = preg_replace('/[\r\n]+/', ' ', $name);
$name = trim(strip_tags($name));
if (strlen($name) > 80) {
    $name = substr($name, 0, 80);
}
$displayName = $name !== '' ? $name : 'client ZEN';

// ---- Rate limiting ----
$ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
if (!empty($_SERVER['HTTP_CF_CONNECTING_IP'])) {
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

// ---- SMTP direct prin fsockopen ----
function smtp_read($socket) {
    $response = '';
    stream_set_timeout($socket, 5);
    while (true) {
        $line = @fgets($socket, 512);
        if ($line === false || $line === '') break;
        $response .= $line;
        if (preg_match('/^\d{3} /', $line)) break;
    }
    return $response;
}

function smtp_send($to, $subject, $htmlBody, $fromEmail, $fromName) {
    $socket = @fsockopen('localhost', 25, $errno, $errstr, 5);
    if (!$socket) {
        return 'SMTP connect failed: ' . $errstr;
    }
    stream_set_timeout($socket, 10);

    $greeting = smtp_read($socket);
    if (strpos($greeting, '220') !== 0) {
        @fclose($socket);
        return 'SMTP greeting error: ' . trim($greeting);
    }

    $hostname = gethostname() ?: 'zenclinics.ro';

    @fwrite($socket, "EHLO $hostname\r\n");
    $reply = smtp_read($socket);
    $code = (int) substr($reply, 0, 3);
    if ($code !== 250) {
        @fwrite($socket, "QUIT\r\n"); @fclose($socket);
        return 'EHLO failed: ' . trim($reply);
    }

    @fwrite($socket, "MAIL FROM:<$fromEmail>\r\n");
    $reply = smtp_read($socket);
    $code = (int) substr($reply, 0, 3);
    if ($code !== 250) {
        @fwrite($socket, "QUIT\r\n"); @fclose($socket);
        return 'MAIL FROM failed: ' . trim($reply);
    }

    @fwrite($socket, "RCPT TO:<$to>\r\n");
    $reply = smtp_read($socket);
    $code = (int) substr($reply, 0, 3);
    if ($code !== 250) {
        @fwrite($socket, "QUIT\r\n"); @fclose($socket);
        return 'RCPT TO failed: ' . trim($reply);
    }

    @fwrite($socket, "DATA\r\n");
    $reply = smtp_read($socket);
    $code = (int) substr($reply, 0, 3);
    if ($code !== 354) {
        @fwrite($socket, "QUIT\r\n"); @fclose($socket);
        return 'DATA failed: ' . trim($reply);
    }

    $encodedName = '=?UTF-8?B?' . base64_encode($fromName) . '?=';
    $encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';

    $message = "From: $encodedName <$fromEmail>\r\n"
        . "To: $to\r\n"
        . "Subject: $encodedSubject\r\n"
        . "MIME-Version: 1.0\r\n"
        . "Content-Type: text/html; charset=UTF-8\r\n"
        . "Content-Transfer-Encoding: base64\r\n"
        . "X-Mailer: ZenClinics\r\n"
        . "\r\n"
        . chunk_split(base64_encode($htmlBody), 76, "\r\n")
        . ".\r\n";

    @fwrite($socket, $message);

    $reply = smtp_read($socket);
    $code = (int) substr($reply, 0, 3);

    @fwrite($socket, "QUIT\r\n");
    @fclose($socket);

    if ($code !== 250) {
        return 'Send failed: ' . trim($reply);
    }

    return true;
}

// ---- Trimitere ----
$safeName  = htmlspecialchars($displayName, ENT_QUOTES, 'UTF-8');
$safeEmail = htmlspecialchars($email, ENT_QUOTES, 'UTF-8');
$errors    = [];

try {
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

        $result = smtp_send($email, 'Confirmare solicitare Card VIP — ZEN Clinics', $clientHtml, MAIL_FROM, MAIL_FROM_NAME);
        if ($result !== true) { $errors[] = 'client: ' . $result; }
    }

    if (NOTIFY_ENABLED) {
        $notifyHtml = '<!doctype html><html lang="ro"><body style="font-family:Arial,Helvetica,sans-serif;color:#1a1408;">'
            . '<h2 style="color:#a07c2f;">Înscriere nouă Card VIP</h2>'
            . '<p>Un client nou a solicitat Cardul VIP:</p>'
            . '<table cellpadding="6" style="border-collapse:collapse;font-size:14px;">'
            . '<tr><td style="color:#6b6257;">Nume:</td><td><strong>' . $safeName . '</strong></td></tr>'
            . '<tr><td style="color:#6b6257;">Email:</td><td><a href="mailto:' . $safeEmail . '">' . $safeEmail . '</a></td></tr>'
            . '<tr><td style="color:#6b6257;">Data:</td><td>' . date('d.m.Y H:i') . '</td></tr>'
            . '</table></body></html>';

        $result = smtp_send(NOTIFY_TO, 'Card VIP — înscriere nouă: ' . $displayName, $notifyHtml, MAIL_FROM, MAIL_FROM_NAME);
        if ($result !== true) { $errors[] = 'notify: ' . $result; }
    }
} catch (\Throwable $e) {
    $errors[] = $e->getMessage();
}

http_response_code(200);
echo json_encode(['ok' => empty($errors), 'errors' => $errors ?: null]);
