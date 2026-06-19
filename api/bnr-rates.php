<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo 'Method not allowed';
    exit;
}

$ch = curl_init('https://www.bnr.ro/nbrfxrates.xml');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 10,
    CURLOPT_HTTPHEADER     => ['Accept: application/xml,text/xml'],
    CURLOPT_FOLLOWLOCATION => true,
]);

$body = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($code !== 200 || $body === false) {
    http_response_code(502);
    echo 'BNR feed unavailable';
    exit;
}

header('Content-Type: text/xml; charset=utf-8');
header('Cache-Control: public, max-age=3600');
echo $body;
