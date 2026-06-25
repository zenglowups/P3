<?php
header('Content-Type: text/plain; charset=utf-8');
echo "=== ZEN Mail Diagnostic ===\n\n";

echo "PHP Version: " . PHP_VERSION . "\n";
echo "Server API: " . php_sapi_name() . "\n";
echo "OS: " . PHP_OS . "\n\n";

echo "--- mail() ---\n";
echo "Exists: " . (function_exists('mail') ? 'YES' : 'NO') . "\n";

$disabled = ini_get('disable_functions');
$mailDisabled = stripos($disabled, 'mail') !== false;
echo "In disable_functions: " . ($mailDisabled ? 'YES ← PROBLEMA E AICI' : 'NO') . "\n";
echo "disable_functions: " . ($disabled ?: '(none)') . "\n";
echo "sendmail_path: " . (ini_get('sendmail_path') ?: '(empty)') . "\n";
echo "SMTP: " . (ini_get('SMTP') ?: '(empty)') . "\n";
echo "smtp_port: " . (ini_get('smtp_port') ?: '(empty)') . "\n\n";

echo "--- error settings ---\n";
echo "display_errors: " . ini_get('display_errors') . "\n";
echo "error_reporting: " . ini_get('error_reporting') . "\n";
echo "log_errors: " . ini_get('log_errors') . "\n";
echo "error_log: " . (ini_get('error_log') ?: '(default)') . "\n\n";

echo "--- test send ---\n";
if (!function_exists('mail') || $mailDisabled) {
    echo "SKIP: mail() nu e disponibil.\n";
} else {
    $to = 'office@zenclinics.ro';
    $subj = 'ZEN test ' . date('H:i:s');
    $body = 'Test diagnostic din mailtest.php';
    $hdrs = "From: office@zenclinics.ro\r\nContent-Type: text/plain; charset=UTF-8";

    $prev = error_reporting(E_ALL);
    ini_set('display_errors', '1');
    ob_start();
    $ok = mail($to, $subj, $body, $hdrs);
    $output = ob_get_clean();
    error_reporting($prev);

    echo "mail() returned: " . ($ok ? 'TRUE (trimis)' : 'FALSE (esuat)') . "\n";
    if ($output) {
        echo "Output/warnings: " . $output . "\n";
    }
    echo "\nDaca mail() a returnat TRUE, verifica inbox/spam la office@zenclinics.ro.\n";
}

echo "\n--- Catchable Throwable support ---\n";
echo "Throwable: " . (interface_exists('Throwable') ? 'YES' : 'NO (PHP < 7.0)') . "\n";

echo "\n=== DONE ===\n";
