<?php
declare(strict_types=1);

$configPath = __DIR__ . '/price-config.php';
$config = is_file($configPath) ? require $configPath : [];

$ownerToken = (string)($config['owner_price_token'] ?? '');
if ($ownerToken === '') {
    $envToken = getenv('OWNER_PRICE_TOKEN');
    $ownerToken = $envToken === false ? '' : (string)$envToken;
}
if ($ownerToken === '') {
    $envToken = getenv('PRICE_ADMIN_TOKEN');
    $ownerToken = $envToken === false ? '' : (string)$envToken;
}
$storageFile = (string)($config['storage_file'] ?? (__DIR__ . '/data/live-prices.json'));
$seedFile = (string)($config['seed_file'] ?? (__DIR__ . '/data/prices.json'));
$maxPayloadBytes = 1024 * 1024;
$maxBackups = 30;

function send_json(int $status, array $payload): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('Pragma: no-cache');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function is_list_array(array $value): bool
{
    if ($value === []) {
        return true;
    }

    return array_keys($value) === range(0, count($value) - 1);
}

function get_bearer_token(): string
{
    $authorization = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';

    if (preg_match('/^Bearer\s+(.+)$/i', $authorization, $matches)) {
        return trim($matches[1]);
    }

    return trim((string)($_SERVER['HTTP_X_OWNER_TOKEN'] ?? ''));
}

function assert_owner_token(string $expected): void
{
    if ($expected === '') {
        send_json(503, [
            'ok' => false,
            'error' => 'OWNER_PRICE_TOKEN is not configured',
        ]);
    }

    if (!hash_equals($expected, get_bearer_token())) {
        send_json(401, [
            'ok' => false,
            'error' => 'Unauthorized',
        ]);
    }
}

function normalize_prices($payload): array
{
    if (is_array($payload) && isset($payload['prices'])) {
        return normalize_prices($payload['prices']);
    }

    if (is_array($payload) && isset($payload['categories'])) {
        return normalize_prices($payload['categories']);
    }

    if (!is_array($payload) || !is_list_array($payload)) {
        throw new RuntimeException('Invalid price payload');
    }

    foreach ($payload as $category) {
        if (!is_array($category) || !isset($category['items']) || !is_array($category['items'])) {
            throw new RuntimeException('Invalid price category');
        }

        foreach ($category['items'] as $entry) {
            if (!is_array($entry) || count($entry) < 2 || !is_string($entry[0]) || !is_string($entry[1])) {
                throw new RuntimeException('Invalid price item');
            }
        }
    }

    return $payload;
}

function ensure_storage_dir(string $storageFile): void
{
    $dir = dirname($storageFile);

    if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
        throw new RuntimeException('Cannot create storage directory');
    }
}

function backup_existing_prices(string $storageFile, int $maxBackups): void
{
    if (!is_file($storageFile)) {
        return;
    }

    $backupDir = dirname($storageFile) . '/backups';
    if (!is_dir($backupDir) && !mkdir($backupDir, 0755, true) && !is_dir($backupDir)) {
        throw new RuntimeException('Cannot create backup directory');
    }

    $backupFile = $backupDir . '/prices-' . gmdate('Ymd-His') . '.json';
    if (!copy($storageFile, $backupFile)) {
        throw new RuntimeException('Cannot create price backup');
    }

    $backups = glob($backupDir . '/prices-*.json') ?: [];
    rsort($backups, SORT_STRING);

    foreach (array_slice($backups, $maxBackups) as $oldBackup) {
        @unlink($oldBackup);
    }
}

function read_prices_file(string $storageFile): ?array
{
    if (!is_file($storageFile)) {
        return null;
    }

    $text = file_get_contents($storageFile);
    if ($text === false || trim($text) === '') {
        return null;
    }

    $prices = json_decode($text, true);
    if (!is_array($prices)) {
        throw new RuntimeException('Stored price data is invalid');
    }

    return $prices;
}

function read_active_prices(string $storageFile, string $seedFile): array
{
    $prices = read_prices_file($storageFile);

    if ($prices) {
        return [
            'source' => 'live',
            'file' => $storageFile,
            'prices' => $prices,
            'updatedAt' => gmdate('c', filemtime($storageFile) ?: time()),
        ];
    }

    $prices = read_prices_file($seedFile);

    if ($prices) {
        return [
            'source' => 'seed',
            'file' => $seedFile,
            'prices' => $prices,
            'updatedAt' => gmdate('c', filemtime($seedFile) ?: time()),
        ];
    }

    return [
        'source' => 'none',
        'file' => null,
        'prices' => null,
        'updatedAt' => null,
    ];
}

function price_stats(?array $prices): array
{
    $categories = is_array($prices) ? count($prices) : 0;
    $items = 0;

    if (is_array($prices)) {
        foreach ($prices as $category) {
            if (is_array($category) && isset($category['items']) && is_array($category['items'])) {
                $items += count($category['items']);
            }
        }
    }

    return [
        'categories' => $categories,
        'items' => $items,
    ];
}

function write_prices_file(string $storageFile, array $prices, int $maxBackups): void
{
    ensure_storage_dir($storageFile);
    backup_existing_prices($storageFile, $maxBackups);

    $json = json_encode($prices, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($json === false) {
        throw new RuntimeException('Cannot encode prices');
    }

    $tmp = $storageFile . '.tmp';
    if (file_put_contents($tmp, $json, LOCK_EX) === false) {
        throw new RuntimeException('Cannot write price storage');
    }

    if (!rename($tmp, $storageFile)) {
        @unlink($tmp);
        throw new RuntimeException('Cannot replace price storage');
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');
    header('Access-Control-Allow-Headers: Authorization, Content-Type, X-Owner-Token');
    http_response_code(204);
    exit;
}

try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $active = read_active_prices($storageFile, $seedFile);
        $prices = $active['prices'];

        if (isset($_GET['health'])) {
            $storageDir = dirname($storageFile);
            $backupDir = $storageDir . '/backups';
            send_json(200, [
                'ok' => true,
                'source' => $active['source'],
                'storageExists' => is_file($storageFile),
                'seedExists' => is_file($seedFile),
                'storageWritable' => is_dir($storageDir) && is_writable($storageDir),
                'backupDirExists' => is_dir($backupDir),
                'backupCount' => count(glob($backupDir . '/prices-*.json') ?: []),
                'updatedAt' => $active['updatedAt'],
                'stats' => price_stats($prices),
            ]);
        }

        if (!$prices) {
            send_json(404, [
                'ok' => false,
                'source' => $active['source'],
                'prices' => null,
            ]);
        }

        send_json(200, [
            'ok' => true,
            'source' => $active['source'],
            'updatedAt' => $active['updatedAt'],
            'prices' => $prices,
        ]);
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST' || $_SERVER['REQUEST_METHOD'] === 'PUT') {
        assert_owner_token($ownerToken);

        $rawBody = file_get_contents('php://input') ?: '';
        if (strlen($rawBody) > $maxPayloadBytes) {
            send_json(413, [
                'ok' => false,
                'error' => 'Price payload is too large',
            ]);
        }

        $payload = json_decode($rawBody, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new RuntimeException('Invalid JSON body');
        }

        $prices = normalize_prices($payload);
        if (!is_file($storageFile) && is_file($seedFile)) {
            ensure_storage_dir($storageFile);
            if (!copy($seedFile, $storageFile)) {
                throw new RuntimeException('Cannot initialize live price storage');
            }
        }
        write_prices_file($storageFile, $prices, $maxBackups);

        send_json(200, [
            'ok' => true,
            'source' => 'live',
            'updatedAt' => gmdate('c'),
            'items' => count($prices),
        ]);
    }

    header('Allow: GET, POST, PUT, OPTIONS');
    send_json(405, [
        'ok' => false,
        'error' => 'Method not allowed',
    ]);
} catch (Throwable $error) {
    send_json(400, [
        'ok' => false,
        'error' => $error->getMessage() ?: 'Request failed',
    ]);
}
