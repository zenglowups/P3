<?php
// Proxy BNR pentru cursul valutar oficial.
// Incearca pe rand: cURL, apoi file_get_contents (in caz ca una e dezactivata pe server).

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

$url = 'https://www.bnr.ro/nbrfxrates.xml';
$body = false;

// Metoda 1: cURL
if (function_exists('curl_init')) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 10,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_USERAGENT      => 'ZenClinics/1.0',
        CURLOPT_HTTPHEADER     => ['Accept: application/xml,text/xml'],
    ]);
    $result = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($result !== false && $code === 200) {
        $body = $result;
    }
}

// Metoda 2: file_get_contents (daca allow_url_fopen e activ)
if ($body === false && ini_get('allow_url_fopen')) {
    $context = stream_context_create([
        'http' => [
            'timeout' => 10,
            'header'  => "Accept: application/xml,text/xml\r\nUser-Agent: ZenClinics/1.0\r\n",
        ],
        'ssl' => [
            'verify_peer'      => true,
            'verify_peer_name' => true,
        ],
    ]);
    $result = @file_get_contents($url, false, $context);
    if ($result !== false) {
        $body = $result;
    }
}

if ($body === false || strpos($body, '<Rate') === false) {
    http_response_code(502);
    echo 'BNR feed unavailable';
    exit;
}

header('Content-Type: text/xml; charset=utf-8');
header('Cache-Control: public, max-age=3600');
echo $body;
