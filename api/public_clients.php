<?php
declare(strict_types=1);
require __DIR__ . '/_lib.php';

$clients = webinmo_load_clients();

$public = [];
foreach ($clients as $c) {
    if (($c['id'] ?? '') === 'client-seed') {
        continue;
    }
    $public[] = [
        'id'      => (string) ($c['id'] ?? ''),
        'name'    => (string) ($c['name'] ?? ''),
        'logo'    => ($c['logo'] ?? null) ? (string) $c['logo'] : null,
        'website' => (string) ($c['companyWebsite'] ?? ''),
        'location'=> (string) ($c['companyLocation'] ?? ''),
    ];
}

webinmo_respond(['ok' => true, 'data' => $public]);
