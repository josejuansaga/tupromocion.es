<?php
declare(strict_types=1);

session_start();
header('Content-Type: application/json; charset=utf-8');

const WEBINMO_STORAGE_ROOT = __DIR__ . '/../storage';
const WEBINMO_PROJECTS_DIR = WEBINMO_STORAGE_ROOT . '/projects';
const WEBINMO_ASSETS_DIR = WEBINMO_STORAGE_ROOT . '/assets';
const WEBINMO_VERSIONS_DIR = WEBINMO_STORAGE_ROOT . '/versions';
const WEBINMO_USERS_FILE = WEBINMO_STORAGE_ROOT . '/users.json';
const WEBINMO_CLIENTS_FILE = WEBINMO_STORAGE_ROOT . '/clients.json';
const WEBINMO_PROJECT_INDEX_FILE = WEBINMO_STORAGE_ROOT . '/project-index.json';
const WEBINMO_ANALYTICS_FILE = WEBINMO_STORAGE_ROOT . '/analytics.json';
const WEBINMO_LEADS_FILE = WEBINMO_STORAGE_ROOT . '/leads.json';
const WEBINMO_SESSION_KEY = 'webinmo_user';

function webinmo_respond(array $payload, int $status = 200): void {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function webinmo_json_input(): array {
    $raw = file_get_contents('php://input');
    if (!$raw) {
        return [];
    }

    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function webinmo_ensure_storage(): void {
    if (!is_dir(WEBINMO_STORAGE_ROOT)) {
        mkdir(WEBINMO_STORAGE_ROOT, 0777, true);
    }
    if (!is_dir(WEBINMO_PROJECTS_DIR)) {
        mkdir(WEBINMO_PROJECTS_DIR, 0777, true);
    }
    if (!is_dir(WEBINMO_ASSETS_DIR)) {
        mkdir(WEBINMO_ASSETS_DIR, 0777, true);
    }
    if (!is_dir(WEBINMO_VERSIONS_DIR)) {
        mkdir(WEBINMO_VERSIONS_DIR, 0777, true);
    }
    if (!file_exists(WEBINMO_USERS_FILE)) {
        webinmo_write_json(WEBINMO_USERS_FILE, [[
            'id' => 'user-admin',
            'username' => 'admin',
            'password' => 'admin123',
            'role' => 'admin',
            'createdAt' => date(DATE_ATOM),
            'updatedAt' => date(DATE_ATOM),
        ]]);
    }
    if (!file_exists(WEBINMO_CLIENTS_FILE)) {
        webinmo_write_json(WEBINMO_CLIENTS_FILE, []);
    }
    if (!file_exists(WEBINMO_PROJECT_INDEX_FILE)) {
        webinmo_write_json(WEBINMO_PROJECT_INDEX_FILE, []);
    }
    if (!file_exists(WEBINMO_ANALYTICS_FILE)) {
        webinmo_write_json(WEBINMO_ANALYTICS_FILE, []);
    }
    if (!file_exists(WEBINMO_LEADS_FILE)) {
        webinmo_write_json(WEBINMO_LEADS_FILE, []);
    }
}

function webinmo_read_json(string $path, $fallback) {
    if (!file_exists($path)) {
        return $fallback;
    }
    $contents = file_get_contents($path);
    if ($contents === false || $contents === '') {
        return $fallback;
    }
    $decoded = json_decode($contents, true);
    return $decoded === null ? $fallback : $decoded;
}

function webinmo_write_json(string $path, $data): bool {
    $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    return file_put_contents($path, $json, LOCK_EX) !== false;
}

function webinmo_project_path(string $projectId): string {
    return WEBINMO_PROJECTS_DIR . '/' . preg_replace('/[^a-zA-Z0-9_-]/', '', $projectId) . '.json';
}

function webinmo_project_assets_dir(string $projectId): string {
    return WEBINMO_ASSETS_DIR . '/' . preg_replace('/[^a-zA-Z0-9_-]/', '', $projectId);
}

function webinmo_project_versions_path(string $projectId): string {
    return WEBINMO_VERSIONS_DIR . '/' . preg_replace('/[^a-zA-Z0-9_-]/', '', $projectId) . '.json';
}

function webinmo_rrmdir(string $path): void {
    if (!is_dir($path)) {
        return;
    }
    $items = scandir($path);
    if (!is_array($items)) {
        return;
    }
    foreach ($items as $item) {
        if ($item === '.' || $item === '..') {
            continue;
        }
        $itemPath = $path . '/' . $item;
        if (is_dir($itemPath)) {
            webinmo_rrmdir($itemPath);
            continue;
        }
        @unlink($itemPath);
    }
    @rmdir($path);
}

function webinmo_load_users(): array {
    webinmo_ensure_storage();
    $users = webinmo_read_json(WEBINMO_USERS_FILE, []);
    $users = is_array($users) ? $users : [];
    return array_values(array_map(static function (array $user): array {
        return [
            'id' => (string) ($user['id'] ?? ''),
            'name' => (string) ($user['name'] ?? ($user['username'] ?? '')),
            'username' => (string) ($user['username'] ?? ''),
            'password' => (string) ($user['password'] ?? ''),
            'role' => (string) ($user['role'] ?? 'admin'),
            'clientId' => (string) ($user['clientId'] ?? ''),
            'createdAt' => (string) ($user['createdAt'] ?? date(DATE_ATOM)),
            'updatedAt' => (string) ($user['updatedAt'] ?? date(DATE_ATOM)),
        ];
    }, array_filter($users, 'is_array')));
}

function webinmo_load_clients(): array {
    webinmo_ensure_storage();
    $clients = webinmo_read_json(WEBINMO_CLIENTS_FILE, []);
    $clients = is_array($clients) ? $clients : [];
    if (!$clients) {
        $clients = [[
            'id' => 'client-seed',
            'name' => 'Residencial Atlas',
            'logo' => null,
            'companyLocation' => '',
            'companyWebsite' => '',
            'contactPhone' => '',
            'contactEmail' => '',
            'contactWhatsapp' => '',
            'socialInstagram' => '',
            'socialFacebook' => '',
            'socialTwitter' => '',
            'createdAt' => date(DATE_ATOM),
            'updatedAt' => date(DATE_ATOM),
        ]];
        webinmo_save_clients($clients);
    }
    return $clients;
}

function webinmo_save_clients(array $clients): bool {
    return webinmo_write_json(WEBINMO_CLIENTS_FILE, array_values($clients));
}

function webinmo_load_project_index(): array {
    webinmo_ensure_storage();
    $index = webinmo_read_json(WEBINMO_PROJECT_INDEX_FILE, []);
    return is_array($index) ? $index : [];
}

function webinmo_save_project_index(array $index): bool {
    return webinmo_write_json(WEBINMO_PROJECT_INDEX_FILE, array_values($index));
}

function webinmo_load_project(string $projectId): ?array {
    $project = webinmo_read_json(webinmo_project_path($projectId), null);
    return is_array($project) ? $project : null;
}

function webinmo_load_all_projects(): array {
    $index = webinmo_load_project_index();
    $projects = [];
    foreach ($index as $meta) {
        if (!is_array($meta) || empty($meta['id'])) {
            continue;
        }
        $full = webinmo_load_project((string) $meta['id']);
        if (!$full) {
            continue;
        }
        $projects[] = array_merge($meta, $full);
    }
    usort($projects, static function (array $a, array $b): int {
        return strcmp((string) ($b['updatedAt'] ?? ''), (string) ($a['updatedAt'] ?? ''));
    });
    return $projects;
}

function webinmo_public_users(): array {
    return array_map(static function (array $user): array {
        return [
            'id' => (string) ($user['id'] ?? ''),
            'name' => (string) ($user['name'] ?? ''),
            'username' => (string) ($user['username'] ?? ''),
            'role' => (string) ($user['role'] ?? 'admin'),
            'clientId' => (string) ($user['clientId'] ?? ''),
            'createdAt' => (string) ($user['createdAt'] ?? ''),
            'updatedAt' => (string) ($user['updatedAt'] ?? ''),
        ];
    }, webinmo_load_users());
}

function webinmo_is_authenticated(): bool {
    return !empty($_SESSION[WEBINMO_SESSION_KEY]);
}

function webinmo_require_auth(): void {
    if (!webinmo_is_authenticated()) {
        webinmo_respond(['ok' => false, 'authenticated' => false, 'error' => 'Sesion no valida.'], 401);
    }
}

function webinmo_current_user(): ?array {
    $sessionUser = $_SESSION[WEBINMO_SESSION_KEY] ?? null;
    if (!is_array($sessionUser) || empty($sessionUser['id'])) {
        return null;
    }
    foreach (webinmo_load_users() as $user) {
        if ((string) ($user['id'] ?? '') === (string) $sessionUser['id']) {
            return $user;
        }
    }
    return null;
}

function webinmo_current_user_public(): array {
    $user = webinmo_current_user();
    if (!$user) {
        return [];
    }
    return [
        'id' => (string) ($user['id'] ?? ''),
        'name' => (string) ($user['name'] ?? ''),
        'username' => (string) ($user['username'] ?? ''),
        'role' => (string) ($user['role'] ?? 'admin'),
        'clientId' => (string) ($user['clientId'] ?? ''),
    ];
}

function webinmo_is_admin(): bool {
    $user = webinmo_current_user();
    return (string) ($user['role'] ?? '') === 'admin';
}

function webinmo_require_admin(): void {
    webinmo_require_auth();
    if (!webinmo_is_admin()) {
        webinmo_respond(['ok' => false, 'authenticated' => true, 'error' => 'No tienes permisos para esta accion.'], 403);
    }
}

function webinmo_current_client_id(): string {
    $user = webinmo_current_user();
    return (string) ($user['clientId'] ?? '');
}

function webinmo_can_access_client(string $clientId): bool {
    return webinmo_is_admin() || $clientId === webinmo_current_client_id();
}

function webinmo_can_access_project(array $project): bool {
    return webinmo_is_admin() || (string) ($project['clientId'] ?? '') === webinmo_current_client_id();
}

function webinmo_visible_clients(): array {
    $clients = webinmo_load_clients();
    if (webinmo_is_admin()) {
        return $clients;
    }
    $clientId = webinmo_current_client_id();
    return array_values(array_filter($clients, static function (array $client) use ($clientId): bool {
        return (string) ($client['id'] ?? '') === $clientId;
    }));
}

function webinmo_visible_projects(): array {
    $projects = webinmo_load_all_projects();
    if (webinmo_is_admin()) {
        return $projects;
    }
    $clientId = webinmo_current_client_id();
    return array_values(array_filter($projects, static function (array $project) use ($clientId): bool {
        return (string) ($project['clientId'] ?? '') === $clientId;
    }));
}

function webinmo_public_projects(): array {
    $clientsById = [];
    foreach (webinmo_load_clients() as $client) {
        $clientId = (string) ($client['id'] ?? '');
        if ($clientId !== '') {
            $clientsById[$clientId] = $client;
        }
    }

    $projects = array_values(array_filter(webinmo_load_all_projects(), static function (array $project): bool {
        return (string) ($project['status'] ?? 'draft') === 'published';
    }));

    return array_map(static function (array $project) use ($clientsById): array {
        $clientId = (string) ($project['clientId'] ?? '');
        $client = $clientsById[$clientId] ?? [];
        $state = is_array($project['state'] ?? null) ? $project['state'] : [];

        return [
            'id' => (string) ($project['id'] ?? ''),
            'name' => (string) ($project['name'] ?? 'Promocion sin nombre'),
            'status' => 'published',
            'updatedAt' => (string) ($project['updatedAt'] ?? ''),
            'createdAt' => (string) ($project['createdAt'] ?? ''),
            'clientId' => $clientId,
            'clientName' => (string) ($client['name'] ?? ($state['companyName'] ?? '')),
            'state' => [
                'projectName' => (string) ($state['projectName'] ?? ($project['name'] ?? '')),
                'companyName' => (string) ($state['companyName'] ?? ''),
                'headline' => (string) ($state['headline'] ?? ''),
                'priceFrom' => (string) ($state['priceFrom'] ?? ''),
                'locationName' => (string) ($state['locationName'] ?? ''),
                'province' => (string) ($state['province'] ?? ''),
                'city' => (string) ($state['city'] ?? ''),
                'cover' => (string) ($state['cover'] ?? ''),
                'logo' => (string) ($state['logo'] ?? ''),
            ],
        ];
    }, $projects);
}

function webinmo_bootstrap_payload(): array {
    return [
        'clients' => webinmo_visible_clients(),
        'users' => webinmo_is_admin() ? webinmo_public_users() : [],
        'projects' => webinmo_visible_projects(),
        'analytics' => webinmo_visible_analytics(),
        'currentUser' => webinmo_current_user_public(),
    ];
}

function webinmo_load_analytics(): array {
    webinmo_ensure_storage();
    $analytics = webinmo_read_json(WEBINMO_ANALYTICS_FILE, []);
    return is_array($analytics) ? $analytics : [];
}

function webinmo_save_analytics(array $analytics): bool {
    return webinmo_write_json(WEBINMO_ANALYTICS_FILE, $analytics);
}

function webinmo_visible_analytics(): array {
    $analytics = webinmo_load_analytics();
    if (webinmo_is_admin()) {
        return $analytics;
    }
    $visible = [];
    foreach (webinmo_visible_projects() as $project) {
        $projectId = (string) ($project['id'] ?? '');
        if ($projectId !== '' && isset($analytics[$projectId]) && is_array($analytics[$projectId])) {
            $visible[$projectId] = $analytics[$projectId];
        }
    }
    return $visible;
}

function webinmo_track_event(string $projectId, string $type): array {
    $allowed = ['pageview', 'whatsapp', 'phone', 'email', 'tour', 'pdf', 'youtube', 'contactForm'];
    if ($projectId === '' || !in_array($type, $allowed, true)) {
        return ['ok' => false, 'error' => 'Evento no valido.'];
    }
    $project = webinmo_load_project($projectId);
    if (!$project) {
        return ['ok' => false, 'error' => 'Promocion no encontrada.'];
    }
    $analytics = webinmo_load_analytics();
    $entry = $analytics[$projectId] ?? [];
    $entry[$type] = (int) ($entry[$type] ?? 0) + 1;
    $entry['updatedAt'] = date(DATE_ATOM);
    $analytics[$projectId] = $entry;
    if (!webinmo_save_analytics($analytics)) {
        return ['ok' => false, 'error' => 'No se ha podido guardar la analitica.'];
    }
    return ['ok' => true, 'data' => $entry];
}

function webinmo_load_leads(): array {
    webinmo_ensure_storage();
    $leads = webinmo_read_json(WEBINMO_LEADS_FILE, []);
    return is_array($leads) ? $leads : [];
}

function webinmo_save_leads(array $leads): bool {
    return webinmo_write_json(WEBINMO_LEADS_FILE, array_values($leads));
}

function webinmo_submit_lead(array $payload): array {
    $projectId = trim((string) ($payload['projectId'] ?? ''));
    $name = trim((string) ($payload['name'] ?? ''));
    $email = trim((string) ($payload['email'] ?? ''));
    $phone = trim((string) ($payload['phone'] ?? ''));
    $message = trim((string) ($payload['message'] ?? ''));

    if ($projectId === '' || $name === '' || $message === '') {
        return ['ok' => false, 'error' => 'Faltan datos del formulario.'];
    }

    $project = webinmo_load_project($projectId);
    if (!$project || !is_array($project)) {
        return ['ok' => false, 'error' => 'Promocion no encontrada.'];
    }

    $leads = webinmo_load_leads();
    $lead = [
        'id' => uniqid('lead_', true),
        'projectId' => $projectId,
        'projectName' => (string) ($project['name'] ?? ''),
        'name' => $name,
        'email' => $email,
        'phone' => $phone,
        'message' => $message,
        'createdAt' => date(DATE_ATOM),
    ];
    array_unshift($leads, $lead);
    if (!webinmo_save_leads($leads)) {
        return ['ok' => false, 'error' => 'No se ha podido guardar el contacto.'];
    }

    webinmo_track_event($projectId, 'contactForm');

    $contactEmail = (string) (($project['state']['contactEmail'] ?? '') ?: '');
    if ($contactEmail !== '') {
        $subject = 'Nuevo contacto desde la promocion';
        $body = "Proyecto: " . ($project['name'] ?? '') . "\nNombre: {$name}\nEmail: {$email}\nTelefono: {$phone}\n\n{$message}";
        @mail($contactEmail, $subject, $body);
    }

    return ['ok' => true, 'data' => $lead];
}

function webinmo_load_project_versions(string $projectId): array {
    $versions = webinmo_read_json(webinmo_project_versions_path($projectId), []);
    return is_array($versions) ? $versions : [];
}

function webinmo_save_project_versions(string $projectId, array $versions): bool {
    return webinmo_write_json(webinmo_project_versions_path($projectId), array_values($versions));
}

function webinmo_record_project_version(array $project): void {
    $projectId = (string) ($project['id'] ?? '');
    if ($projectId === '') {
        return;
    }
    $versions = webinmo_load_project_versions($projectId);
    array_unshift($versions, [
        'id' => uniqid('ver_', true),
        'projectId' => $projectId,
        'name' => (string) ($project['name'] ?? 'Proyecto sin titulo'),
        'savedAt' => (string) ($project['updatedAt'] ?? date(DATE_ATOM)),
        'status' => (string) ($project['status'] ?? 'draft'),
        'state' => $project['state'] ?? [],
    ]);
    $versions = array_slice($versions, 0, 20);
    webinmo_save_project_versions($projectId, $versions);
}

function webinmo_project_version_summaries(string $projectId): array {
    return array_map(static function (array $version): array {
        return [
            'id' => (string) ($version['id'] ?? ''),
            'projectId' => (string) ($version['projectId'] ?? ''),
            'name' => (string) ($version['name'] ?? ''),
            'savedAt' => (string) ($version['savedAt'] ?? ''),
            'status' => (string) ($version['status'] ?? 'draft'),
        ];
    }, webinmo_load_project_versions($projectId));
}

function webinmo_login(string $username, string $password): bool {
    foreach (webinmo_load_users() as $user) {
        if (($user['username'] ?? '') === $username && ($user['password'] ?? '') === $password) {
            $_SESSION[WEBINMO_SESSION_KEY] = [
                'id' => (string) ($user['id'] ?? ''),
                'username' => $username,
                'role' => (string) ($user['role'] ?? 'admin'),
                'clientId' => (string) ($user['clientId'] ?? ''),
            ];
            return true;
        }
    }
    return false;
}

function webinmo_logout(): void {
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
    }
    session_destroy();
}

function webinmo_upsert_client(array $client): bool {
    $clientId = (string) ($client['id'] ?? '');
    if ($clientId === '' || !webinmo_can_access_client($clientId)) {
        return false;
    }
    $clients = webinmo_load_clients();
    $now = date(DATE_ATOM);
    $client['createdAt'] = (string) ($client['createdAt'] ?? $now);
    $client['updatedAt'] = $now;

    $updated = false;
    foreach ($clients as $index => $entry) {
        if (($entry['id'] ?? '') !== $clientId) {
            continue;
        }
        $clients[$index] = array_merge($entry, $client);
        $updated = true;
        break;
    }
    if (!$updated) {
        array_unshift($clients, $client);
    }
    if (!webinmo_save_clients($clients)) {
        return false;
    }

    $projectIndex = webinmo_load_project_index();
    foreach ($projectIndex as $meta) {
        if (($meta['clientId'] ?? '') !== $clientId) {
            continue;
        }
        $project = webinmo_load_project((string) $meta['id']);
        if (!$project || !isset($project['state']) || !is_array($project['state'])) {
            continue;
        }
        $project['state']['companyName'] = (string) ($client['name'] ?? '');
        $project['state']['logo'] = $client['logo'] ?? null;
        $project['state']['companyLocation'] = (string) ($client['companyLocation'] ?? '');
        $project['state']['companyWebsite'] = (string) ($client['companyWebsite'] ?? '');
        $project['state']['contactPhone'] = (string) ($client['contactPhone'] ?? '');
        $project['state']['contactEmail'] = (string) ($client['contactEmail'] ?? '');
        $project['state']['contactWhatsapp'] = (string) ($client['contactWhatsapp'] ?? '');
        $project['state']['socialInstagram'] = (string) ($client['socialInstagram'] ?? '');
        $project['state']['socialFacebook'] = (string) ($client['socialFacebook'] ?? '');
        $project['state']['socialTwitter'] = (string) ($client['socialTwitter'] ?? '');
        webinmo_write_json(webinmo_project_path((string) $meta['id']), $project);
    }

    return true;
}

function webinmo_delete_client(string $clientId): array {
    if (!webinmo_is_admin()) {
        return ['ok' => false, 'error' => 'No tienes permisos para borrar clientes.'];
    }
    $projects = webinmo_load_project_index();
    foreach ($projects as $project) {
        if (($project['clientId'] ?? '') === $clientId) {
            return ['ok' => false, 'error' => 'No puedes borrar este cliente porque tiene promociones asociadas.'];
        }
    }
    $clients = array_values(array_filter(webinmo_load_clients(), static function (array $client) use ($clientId): bool {
        return ($client['id'] ?? '') !== $clientId;
    }));
    if (!webinmo_save_clients($clients)) {
        return ['ok' => false, 'error' => 'No se ha podido guardar la lista de clientes.'];
    }
    return ['ok' => true];
}

function webinmo_upsert_project(array $project): array {
    $projectId = (string) ($project['id'] ?? '');
    if ($projectId === '') {
      return ['ok' => false, 'error' => 'La promocion no tiene identificador.'];
    }
    if (!webinmo_is_admin()) {
        $project['clientId'] = webinmo_current_client_id();
    }
    $existing = webinmo_load_project($projectId);
    if ($existing && !webinmo_can_access_project($existing)) {
        return ['ok' => false, 'error' => 'No tienes permisos para modificar esta promocion.'];
    }
    if (!webinmo_can_access_project($project)) {
        return ['ok' => false, 'error' => 'No tienes permisos para guardar esta promocion.'];
    }
    $path = webinmo_project_path($projectId);
    if (!webinmo_write_json($path, $project)) {
        return ['ok' => false, 'error' => 'No se ha podido guardar el archivo de la promocion.'];
    }
    webinmo_record_project_version($project);

    $index = webinmo_load_project_index();
    $meta = [
        'id' => $projectId,
        'clientId' => (string) ($project['clientId'] ?? ''),
        'name' => (string) ($project['name'] ?? 'Promocion sin nombre'),
        'status' => (string) ($project['status'] ?? 'draft'),
        'updatedAt' => (string) ($project['updatedAt'] ?? date(DATE_ATOM)),
        'createdAt' => (string) ($project['createdAt'] ?? date(DATE_ATOM)),
    ];

    $updated = false;
    foreach ($index as $i => $entry) {
        if (($entry['id'] ?? '') !== $projectId) {
            continue;
        }
        $index[$i] = $meta;
        $updated = true;
        break;
    }
    if (!$updated) {
        array_unshift($index, $meta);
    }
    if (!webinmo_save_project_index($index)) {
        return ['ok' => false, 'error' => 'No se ha podido guardar el indice de promociones.'];
    }

    return ['ok' => true];
}

function webinmo_delete_project(string $projectId): array {
    $projectId = preg_replace('/[^a-zA-Z0-9_-]/', '', $projectId);
    if ($projectId === '') {
        return ['ok' => false, 'error' => 'Promocion no valida.'];
    }

    $existing = webinmo_load_project($projectId);
    if (!$existing) {
        return ['ok' => false, 'error' => 'Promocion no encontrada.'];
    }
    if (!webinmo_can_access_project($existing)) {
        return ['ok' => false, 'error' => 'No tienes permisos para borrar esta promocion.'];
    }

    $index = array_values(array_filter(webinmo_load_project_index(), static function (array $entry) use ($projectId): bool {
        return (string) ($entry['id'] ?? '') !== $projectId;
    }));

    if (!webinmo_save_project_index($index)) {
        return ['ok' => false, 'error' => 'No se ha podido actualizar el indice de promociones.'];
    }

    $projectPath = webinmo_project_path($projectId);
    if (file_exists($projectPath) && !@unlink($projectPath)) {
        return ['ok' => false, 'error' => 'No se ha podido borrar el archivo de la promocion.'];
    }

    webinmo_rrmdir(webinmo_project_assets_dir($projectId));
    return ['ok' => true];
}

function webinmo_save_users(array $users): bool {
    return webinmo_write_json(WEBINMO_USERS_FILE, array_values($users));
}

function webinmo_upsert_user(array $user): array {
    if (!webinmo_is_admin()) {
        return ['ok' => false, 'error' => 'No tienes permisos para gestionar usuarios.'];
    }
    $userId = (string) ($user['id'] ?? '');
    $username = trim((string) ($user['username'] ?? ''));
    $password = (string) ($user['password'] ?? '');
    $role = (string) ($user['role'] ?? 'promoter');
    $clientId = (string) ($user['clientId'] ?? '');
    if ($userId === '' || $username === '' || $password === '') {
        return ['ok' => false, 'error' => 'Faltan datos del usuario.'];
    }
    if (!in_array($role, ['admin', 'promoter'], true)) {
        return ['ok' => false, 'error' => 'Rol no valido.'];
    }
    if ($role === 'promoter' && $clientId === '') {
        return ['ok' => false, 'error' => 'El promotor debe estar vinculado a un cliente.'];
    }
    $users = webinmo_load_users();
    foreach ($users as $entry) {
        if ((string) ($entry['username'] ?? '') === $username && (string) ($entry['id'] ?? '') !== $userId) {
            return ['ok' => false, 'error' => 'Ese usuario ya existe.'];
        }
    }
    $now = date(DATE_ATOM);
    $payload = [
        'id' => $userId,
        'name' => (string) ($user['name'] ?? $username),
        'username' => $username,
        'password' => $password,
        'role' => $role,
        'clientId' => $role === 'admin' ? '' : $clientId,
        'createdAt' => (string) ($user['createdAt'] ?? $now),
        'updatedAt' => $now,
    ];
    $updated = false;
    foreach ($users as $index => $entry) {
        if ((string) ($entry['id'] ?? '') !== $userId) {
            continue;
        }
        $users[$index] = array_merge($entry, $payload);
        $updated = true;
        break;
    }
    if (!$updated) {
        array_unshift($users, $payload);
    }
    if (!webinmo_save_users($users)) {
        return ['ok' => false, 'error' => 'No se ha podido guardar el usuario.'];
    }
    return ['ok' => true];
}

function webinmo_delete_user(string $userId): array {
    if (!webinmo_is_admin()) {
        return ['ok' => false, 'error' => 'No tienes permisos para gestionar usuarios.'];
    }
    $current = webinmo_current_user();
    if ((string) ($current['id'] ?? '') === $userId) {
        return ['ok' => false, 'error' => 'No puedes borrar tu propio usuario.'];
    }
    $users = webinmo_load_users();
    $admins = array_values(array_filter($users, static function (array $user): bool {
        return (string) ($user['role'] ?? '') === 'admin';
    }));
    $target = null;
    foreach ($users as $user) {
        if ((string) ($user['id'] ?? '') === $userId) {
            $target = $user;
            break;
        }
    }
    if (!$target) {
        return ['ok' => false, 'error' => 'Usuario no encontrado.'];
    }
    if ((string) ($target['role'] ?? '') === 'admin' && count($admins) <= 1) {
        return ['ok' => false, 'error' => 'Debe quedar al menos un administrador.'];
    }
    $users = array_values(array_filter($users, static function (array $user) use ($userId): bool {
        return (string) ($user['id'] ?? '') !== $userId;
    }));
    if (!webinmo_save_users($users)) {
        return ['ok' => false, 'error' => 'No se ha podido borrar el usuario.'];
    }
    return ['ok' => true];
}

function webinmo_store_asset(string $projectId, string $hint, string $dataUrl): array {
    if (!preg_match('/^data:([^;]+);base64,(.+)$/', $dataUrl, $matches)) {
        return ['ok' => false, 'error' => 'Formato de archivo no valido.'];
    }

    $mime = strtolower(trim($matches[1]));
    $bytes = base64_decode($matches[2], true);
    if ($bytes === false) {
        return ['ok' => false, 'error' => 'No se ha podido decodificar el archivo.'];
    }

    $ext = match ($mime) {
        'image/jpeg', 'image/jpg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
        'image/svg+xml' => 'svg',
        'application/pdf' => 'pdf',
        default => '',
    };

    if ($ext === '') {
        return ['ok' => false, 'error' => 'Tipo de archivo no soportado.'];
    }

    $dir = webinmo_project_assets_dir($projectId);
    if (!is_dir($dir) && !mkdir($dir, 0777, true) && !is_dir($dir)) {
        return ['ok' => false, 'error' => 'No se ha podido crear la carpeta de archivos.'];
    }

    $safeHint = preg_replace('/[^a-zA-Z0-9_-]/', '-', strtolower($hint)) ?: 'asset';
    $hash = substr(sha1($bytes), 0, 16);
    $filename = $safeHint . '-' . $hash . '.' . $ext;
    $path = $dir . '/' . $filename;

    if (file_put_contents($path, $bytes, LOCK_EX) === false) {
        return ['ok' => false, 'error' => 'No se ha podido guardar el archivo.'];
    }

    return [
        'ok' => true,
        'path' => './storage/assets/' . preg_replace('/[^a-zA-Z0-9_-]/', '', $projectId) . '/' . $filename,
    ];
}
