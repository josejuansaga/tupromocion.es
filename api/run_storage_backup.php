<?php
declare(strict_types=1);
require __DIR__ . '/_lib.php';

$settings = webinmo_load_backup_settings();
$token = trim((string) ($_GET['token'] ?? ($_POST['token'] ?? '')));
$expected = (string) ($settings['storage']['token'] ?? '');
$hasCronToken = $token !== '' && $expected !== '' && hash_equals($expected, $token);

if (!$hasCronToken) {
    webinmo_require_admin();
}

$result = webinmo_run_storage_backup($hasCronToken ? 'cron' : 'manual');
webinmo_respond([
    'ok' => $result['ok'] ?? false,
    'authenticated' => !$hasCronToken,
    'error' => $result['error'] ?? '',
    'data' => [
        'backup' => $result,
        'settings' => webinmo_load_backup_settings(),
    ],
], ($result['ok'] ?? false) ? 200 : 422);
