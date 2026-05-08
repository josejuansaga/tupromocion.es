<?php
declare(strict_types=1);
require __DIR__ . '/_lib.php';

webinmo_ensure_storage();
$input = webinmo_json_input();
$username = trim((string) ($input['username'] ?? ''));
$password = (string) ($input['password'] ?? '');

if ($username === '' || $password === '') {
    webinmo_respond(['ok' => false, 'authenticated' => false, 'error' => 'Introduce usuario y contraseña.'], 422);
}

if (!webinmo_login($username, $password)) {
    webinmo_respond(['ok' => false, 'authenticated' => false, 'error' => 'Usuario o contraseña incorrectos.'], 401);
}

webinmo_respond([
    'ok' => true,
    'authenticated' => true,
    'data' => webinmo_bootstrap_payload(),
]);
