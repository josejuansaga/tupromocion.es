<?php
declare(strict_types=1);

session_start();
header('Content-Type: application/json; charset=utf-8');

const WEBINMO_STORAGE_ROOT = __DIR__ . '/../storage';
const WEBINMO_PROJECTS_DIR = WEBINMO_STORAGE_ROOT . '/projects';
const WEBINMO_ASSETS_DIR = WEBINMO_STORAGE_ROOT . '/assets';
const WEBINMO_VERSIONS_DIR = WEBINMO_STORAGE_ROOT . '/versions';
const WEBINMO_BACKUPS_DIR = WEBINMO_STORAGE_ROOT . '/backups';
const WEBINMO_PROJECT_BACKUPS_DIR = WEBINMO_BACKUPS_DIR . '/projects';
const WEBINMO_USER_BACKUPS_DIR = WEBINMO_BACKUPS_DIR . '/users';
const WEBINMO_STORAGE_BACKUPS_DIR = WEBINMO_BACKUPS_DIR . '/storage';
const WEBINMO_USERS_FILE = WEBINMO_STORAGE_ROOT . '/users.json';
const WEBINMO_CLIENTS_FILE = WEBINMO_STORAGE_ROOT . '/clients.json';
const WEBINMO_PROJECT_INDEX_FILE = WEBINMO_STORAGE_ROOT . '/project-index.json';
const WEBINMO_PROPOSALS_FILE = WEBINMO_STORAGE_ROOT . '/proposals.json';
const WEBINMO_PROPOSAL_LEADS_FILE = WEBINMO_STORAGE_ROOT . '/proposal-leads.json';
const WEBINMO_PROPOSAL_LINE_PRESETS_FILE = WEBINMO_STORAGE_ROOT . '/proposal-line-presets.json';
const WEBINMO_ESTIMATOR_CATALOG_FILE = WEBINMO_STORAGE_ROOT . '/estimator-catalog.json';
const WEBINMO_ANALYTICS_FILE = WEBINMO_STORAGE_ROOT . '/analytics.json';
const WEBINMO_LEADS_FILE = WEBINMO_STORAGE_ROOT . '/leads.json';
const WEBINMO_BACKUP_SETTINGS_FILE = WEBINMO_STORAGE_ROOT . '/backup-settings.json';
const WEBINMO_SESSION_KEY = 'webinmo_user';
const WEBINMO_ESTIMATOR_SESSION_KEY = 'webinmo_estimator_until';

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
    if (!is_dir(WEBINMO_BACKUPS_DIR)) {
        mkdir(WEBINMO_BACKUPS_DIR, 0777, true);
    }
    if (!is_dir(WEBINMO_PROJECT_BACKUPS_DIR)) {
        mkdir(WEBINMO_PROJECT_BACKUPS_DIR, 0777, true);
    }
    if (!is_dir(WEBINMO_USER_BACKUPS_DIR)) {
        mkdir(WEBINMO_USER_BACKUPS_DIR, 0777, true);
    }
    if (!is_dir(WEBINMO_STORAGE_BACKUPS_DIR)) {
        mkdir(WEBINMO_STORAGE_BACKUPS_DIR, 0777, true);
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
    if (!file_exists(WEBINMO_PROPOSALS_FILE)) {
        webinmo_write_json(WEBINMO_PROPOSALS_FILE, []);
    }
    if (!file_exists(WEBINMO_PROPOSAL_LEADS_FILE)) {
        webinmo_write_json(WEBINMO_PROPOSAL_LEADS_FILE, []);
    }
    if (!file_exists(WEBINMO_PROPOSAL_LINE_PRESETS_FILE)) {
        webinmo_write_json(WEBINMO_PROPOSAL_LINE_PRESETS_FILE, []);
    }
    if (!file_exists(WEBINMO_ESTIMATOR_CATALOG_FILE)) {
        webinmo_write_json(WEBINMO_ESTIMATOR_CATALOG_FILE, webinmo_default_estimator_catalog());
    }
    if (!file_exists(WEBINMO_ANALYTICS_FILE)) {
        webinmo_write_json(WEBINMO_ANALYTICS_FILE, []);
    }
    if (!file_exists(WEBINMO_LEADS_FILE)) {
        webinmo_write_json(WEBINMO_LEADS_FILE, []);
    }
    if (!file_exists(WEBINMO_BACKUP_SETTINGS_FILE)) {
        webinmo_write_json(WEBINMO_BACKUP_SETTINGS_FILE, webinmo_default_backup_settings());
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
    if ($json === false) {
        return false;
    }

    $dir = dirname($path);
    if (!is_dir($dir) && !mkdir($dir, 0777, true) && !is_dir($dir)) {
        return false;
    }

    $tempPath = $path . '.tmp';
    if (file_put_contents($tempPath, $json, LOCK_EX) === false) {
        return false;
    }

    return @rename($tempPath, $path);
}

function webinmo_project_path(string $projectId): string {
    return WEBINMO_PROJECTS_DIR . '/' . preg_replace('/[^a-zA-Z0-9_-]/', '', $projectId) . '.json';
}

function webinmo_project_assets_dir(string $projectId): string {
    return WEBINMO_ASSETS_DIR . '/' . preg_replace('/[^a-zA-Z0-9_-]/', '', $projectId);
}

function webinmo_default_estimator_catalog(): array {
    return [
        [
            'id' => 'estancias-interiores',
            'name' => 'Estancias interiores',
            'sub' => 'Tarifa base por imagen interior',
            'color' => 'green',
            'products' => [
                ['id' => 'salon-comedor-cocina', 'name' => 'Salón - comedor - cocina', 'price' => 220, 'unit' => 'imagen', 'desc' => 'Vista conjunta de la zona principal. Precio + IVA - IRPF. 1ª mod. incluida.', 'image' => '', 'technicalPdf' => '', 'technicalPdfThumbnail' => ''],
                ['id' => 'cocina', 'name' => 'Cocina', 'price' => 120, 'unit' => 'imagen', 'desc' => 'Imagen individual de cocina. Precio + IVA - IRPF. 1ª mod. incluida.', 'image' => '', 'technicalPdf' => '', 'technicalPdfThumbnail' => ''],
                ['id' => 'dormitorio', 'name' => 'Dormitorio', 'price' => 120, 'unit' => 'imagen', 'desc' => 'Imagen individual de dormitorio. Precio + IVA - IRPF. 1ª mod. incluida.', 'image' => '', 'technicalPdf' => '', 'technicalPdfThumbnail' => ''],
                ['id' => 'bano', 'name' => 'Baño', 'price' => 90, 'unit' => 'imagen', 'desc' => 'Imagen individual de baño. Precio + IVA - IRPF. 1ª mod. incluida.', 'image' => '', 'technicalPdf' => '', 'technicalPdfThumbnail' => ''],
            ],
        ],
        [
            'id' => 'packs-base',
            'name' => 'Packs y escenas base',
            'sub' => 'Soluciones rápidas para interiorismo y arquitectura',
            'color' => 'orange',
            'products' => [
                ['id' => 'pack-interiorista', 'name' => 'Pack interiorista', 'price' => 420, 'unit' => 'pack', 'desc' => 'Salón comedor cocina + dormitorio principal + baño. Precio + IVA - IRPF. 1ª mod. incluida.', 'image' => '', 'technicalPdf' => '', 'technicalPdfThumbnail' => ''],
                ['id' => 'exterior-vivienda-unifamiliar', 'name' => 'Exterior - vivienda unifamiliar', 'price' => 420, 'unit' => 'imagen', 'desc' => 'A partir de 420 €. Fachada exterior o vista principal.', 'image' => '', 'technicalPdf' => '', 'technicalPdfThumbnail' => ''],
                ['id' => 'restaurante-local-fachada', 'name' => 'Restaurante / local comercial con fachada', 'price' => 420, 'unit' => 'imagen', 'desc' => 'A partir de 420 €. Escena comercial con fachada o acceso principal.', 'image' => '', 'technicalPdf' => '', 'technicalPdfThumbnail' => ''],
            ],
        ],
        [
            'id' => 'servicios-complementarios',
            'name' => 'Servicios complementarios',
            'sub' => 'Servicios del dossier comercial y presentación',
            'color' => 'blue',
            'products' => [
                ['id' => 'tour-virtual-extra', 'name' => 'Tour virtual', 'price' => 0, 'unit' => 'extra', 'desc' => 'Suplemento orientativo: +50 % sobre el presupuesto base.', 'image' => '', 'technicalPdf' => '', 'technicalPdfThumbnail' => ''],
                ['id' => 'tour-vr', 'name' => 'Tour virtual + experiencia inmersiva VR', 'price' => 0, 'unit' => 'proyecto', 'desc' => 'Precio a medida según alcance y dispositivo.', 'image' => '', 'technicalPdf' => '', 'technicalPdfThumbnail' => ''],
                ['id' => 'video-animaciones', 'name' => 'Vídeo y animaciones', 'price' => 0, 'unit' => 'proyecto', 'desc' => 'Servicio audiovisual bajo presupuesto personalizado.', 'image' => '', 'technicalPdf' => '', 'technicalPdfThumbnail' => ''],
                ['id' => 'integraciones-imagen', 'name' => 'Integraciones en imagen', 'price' => 0, 'unit' => 'imagen', 'desc' => 'Inserciones y composiciones especiales bajo presupuesto personalizado.', 'image' => '', 'technicalPdf' => '', 'technicalPdfThumbnail' => ''],
                ['id' => 'ficha-digital-microsite', 'name' => 'Ficha digital / microsite', 'price' => 290, 'unit' => 'proyecto', 'desc' => 'Presentación online compartible del proyecto o promoción.', 'image' => '', 'technicalPdf' => '', 'technicalPdfThumbnail' => ''],
            ],
        ],
    ];
}

function webinmo_slugify(string $value): string {
    $value = trim($value);
    if ($value === '') {
        return '';
    }
    $normalized = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value);
    if (!is_string($normalized) || $normalized === '') {
        $normalized = $value;
    }
    $slug = strtolower($normalized);
    $slug = preg_replace('/[^a-z0-9]+/', '-', $slug);
    $slug = trim((string) $slug, '-');
    return substr($slug, 0, 120);
}

function webinmo_project_versions_path(string $projectId): string {
    return WEBINMO_VERSIONS_DIR . '/' . preg_replace('/[^a-zA-Z0-9_-]/', '', $projectId) . '.json';
}

function webinmo_project_backups_path(string $projectId): string {
    return WEBINMO_PROJECT_BACKUPS_DIR . '/' . preg_replace('/[^a-zA-Z0-9_-]/', '', $projectId) . '.json';
}

function webinmo_user_backups_path(string $userId): string {
    return WEBINMO_USER_BACKUPS_DIR . '/' . preg_replace('/[^a-zA-Z0-9_-]/', '', $userId) . '.json';
}

function webinmo_default_backup_settings(): array {
    return [
        'projects' => [
            'enabled' => true,
            'keep' => 30,
        ],
        'users' => [
            'enabled' => true,
            'keep' => 20,
        ],
        'storage' => [
            'enabled' => true,
            'keep' => 14,
            'frequencyHours' => 24,
            'lastRunAt' => '',
            'lastStatus' => '',
            'lastFile' => '',
            'token' => bin2hex(random_bytes(16)),
        ],
    ];
}

function webinmo_normalize_backup_settings(array $settings): array {
    $defaults = webinmo_default_backup_settings();
    $projectKeep = (int) ($settings['projects']['keep'] ?? $defaults['projects']['keep']);
    $userKeep = (int) ($settings['users']['keep'] ?? $defaults['users']['keep']);
    $storageKeep = (int) ($settings['storage']['keep'] ?? $defaults['storage']['keep']);
    $frequencyHours = (int) ($settings['storage']['frequencyHours'] ?? $defaults['storage']['frequencyHours']);
    $token = trim((string) ($settings['storage']['token'] ?? ''));
    if ($token === '') {
        $token = $defaults['storage']['token'];
    }

    return [
        'projects' => [
            'enabled' => (bool) ($settings['projects']['enabled'] ?? $defaults['projects']['enabled']),
            'keep' => min(200, max(1, $projectKeep)),
        ],
        'users' => [
            'enabled' => (bool) ($settings['users']['enabled'] ?? $defaults['users']['enabled']),
            'keep' => min(200, max(1, $userKeep)),
        ],
        'storage' => [
            'enabled' => (bool) ($settings['storage']['enabled'] ?? $defaults['storage']['enabled']),
            'keep' => min(90, max(1, $storageKeep)),
            'frequencyHours' => min(168, max(1, $frequencyHours)),
            'lastRunAt' => (string) ($settings['storage']['lastRunAt'] ?? ''),
            'lastStatus' => (string) ($settings['storage']['lastStatus'] ?? ''),
            'lastFile' => (string) ($settings['storage']['lastFile'] ?? ''),
            'token' => $token,
        ],
    ];
}

function webinmo_load_backup_settings(): array {
    webinmo_ensure_storage();
    $settings = webinmo_read_json(WEBINMO_BACKUP_SETTINGS_FILE, webinmo_default_backup_settings());
    return webinmo_normalize_backup_settings(is_array($settings) ? $settings : []);
}

function webinmo_save_backup_settings(array $settings): bool {
    return webinmo_write_json(WEBINMO_BACKUP_SETTINGS_FILE, webinmo_normalize_backup_settings($settings));
}

function webinmo_load_project_backups(string $projectId): array {
    $backups = webinmo_read_json(webinmo_project_backups_path($projectId), []);
    return is_array($backups) ? $backups : [];
}

function webinmo_save_project_backups(string $projectId, array $backups): bool {
    return webinmo_write_json(webinmo_project_backups_path($projectId), array_values($backups));
}

function webinmo_load_user_backups(string $userId): array {
    $backups = webinmo_read_json(webinmo_user_backups_path($userId), []);
    return is_array($backups) ? $backups : [];
}

function webinmo_save_user_backups(string $userId, array $backups): bool {
    return webinmo_write_json(webinmo_user_backups_path($userId), array_values($backups));
}

function webinmo_record_project_backup(array $project, string $reason = 'save'): void {
    $projectId = (string) ($project['id'] ?? '');
    if ($projectId === '') {
        return;
    }
    $settings = webinmo_load_backup_settings();
    if (empty($settings['projects']['enabled'])) {
        return;
    }

    $backups = webinmo_load_project_backups($projectId);
    array_unshift($backups, [
        'id' => uniqid('pbk_', true),
        'projectId' => $projectId,
        'name' => (string) ($project['name'] ?? 'Proyecto sin titulo'),
        'status' => (string) ($project['status'] ?? 'draft'),
        'savedAt' => (string) ($project['updatedAt'] ?? date(DATE_ATOM)),
        'reason' => $reason,
        'data' => $project,
    ]);
    $backups = array_slice($backups, 0, (int) $settings['projects']['keep']);
    webinmo_save_project_backups($projectId, $backups);
}

function webinmo_record_user_backup(array $user, string $reason = 'save'): void {
    $userId = (string) ($user['id'] ?? '');
    if ($userId === '') {
        return;
    }
    $settings = webinmo_load_backup_settings();
    if (empty($settings['users']['enabled'])) {
        return;
    }

    $backups = webinmo_load_user_backups($userId);
    array_unshift($backups, [
        'id' => uniqid('ubk_', true),
        'userId' => $userId,
        'name' => (string) ($user['name'] ?? ($user['username'] ?? 'Usuario')),
        'username' => (string) ($user['username'] ?? ''),
        'role' => (string) ($user['role'] ?? 'promoter'),
        'savedAt' => (string) ($user['updatedAt'] ?? date(DATE_ATOM)),
        'reason' => $reason,
        'data' => $user,
    ]);
    $backups = array_slice($backups, 0, (int) $settings['users']['keep']);
    webinmo_save_user_backups($userId, $backups);
}

function webinmo_project_backup_summaries(string $projectId): array {
    return array_map(static function (array $backup): array {
        return [
            'id' => (string) ($backup['id'] ?? ''),
            'projectId' => (string) ($backup['projectId'] ?? ''),
            'name' => (string) ($backup['name'] ?? ''),
            'status' => (string) ($backup['status'] ?? 'draft'),
            'savedAt' => (string) ($backup['savedAt'] ?? ''),
            'reason' => (string) ($backup['reason'] ?? 'save'),
        ];
    }, webinmo_load_project_backups($projectId));
}

function webinmo_user_backup_summaries(string $userId): array {
    return array_map(static function (array $backup): array {
        return [
            'id' => (string) ($backup['id'] ?? ''),
            'userId' => (string) ($backup['userId'] ?? ''),
            'name' => (string) ($backup['name'] ?? ''),
            'username' => (string) ($backup['username'] ?? ''),
            'role' => (string) ($backup['role'] ?? 'promoter'),
            'savedAt' => (string) ($backup['savedAt'] ?? ''),
            'reason' => (string) ($backup['reason'] ?? 'save'),
        ];
    }, webinmo_load_user_backups($userId));
}

function webinmo_find_project_backup(string $projectId, string $backupId): ?array {
    foreach (webinmo_load_project_backups($projectId) as $backup) {
        if ((string) ($backup['id'] ?? '') === $backupId) {
            return is_array($backup) ? $backup : null;
        }
    }
    return null;
}

function webinmo_find_user_backup(string $userId, string $backupId): ?array {
    foreach (webinmo_load_user_backups($userId) as $backup) {
        if ((string) ($backup['id'] ?? '') === $backupId) {
            return is_array($backup) ? $backup : null;
        }
    }
    return null;
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

function webinmo_backup_storage_zip(): array {
    webinmo_ensure_storage();
    if (!class_exists('ZipArchive')) {
        return ['ok' => false, 'error' => 'ZipArchive no esta disponible en el servidor.'];
    }

    $filename = 'storage-' . date('Ymd-His') . '.zip';
    $target = WEBINMO_STORAGE_BACKUPS_DIR . '/' . $filename;
    $zip = new ZipArchive();
    if ($zip->open($target, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
        return ['ok' => false, 'error' => 'No se ha podido crear el ZIP de backup.'];
    }

    $root = realpath(WEBINMO_STORAGE_ROOT);
    $backupRoot = realpath(WEBINMO_BACKUPS_DIR);
    if (!$root) {
        $zip->close();
        return ['ok' => false, 'error' => 'No se ha encontrado la carpeta storage.'];
    }

    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($root, FilesystemIterator::SKIP_DOTS),
        RecursiveIteratorIterator::SELF_FIRST
    );

    foreach ($iterator as $item) {
        $path = $item->getPathname();
        $realPath = realpath($path);
        if (!$realPath) {
            continue;
        }
        if ($backupRoot && str_starts_with($realPath, $backupRoot)) {
            continue;
        }
        if (str_ends_with($realPath, '.tmp')) {
            continue;
        }
        $localName = 'storage/' . ltrim(str_replace('\\', '/', substr($realPath, strlen($root))), '/');
        if ($item->isDir()) {
            $zip->addEmptyDir($localName);
            continue;
        }
        $zip->addFile($realPath, $localName);
    }

    $zip->close();
    clearstatcache(true, $target);

    return [
        'ok' => true,
        'file' => './storage/backups/storage/' . $filename,
        'filename' => $filename,
        'bytes' => file_exists($target) ? filesize($target) : 0,
        'createdAt' => date(DATE_ATOM),
    ];
}

function webinmo_prune_storage_backups(int $keep): void {
    if (!is_dir(WEBINMO_STORAGE_BACKUPS_DIR)) {
        return;
    }
    $files = glob(WEBINMO_STORAGE_BACKUPS_DIR . '/storage-*.zip') ?: [];
    usort($files, static function (string $a, string $b): int {
        return filemtime($b) <=> filemtime($a);
    });
    foreach (array_slice($files, max(1, $keep)) as $file) {
        @unlink($file);
    }
}

function webinmo_run_storage_backup(string $reason = 'scheduled'): array {
    $settings = webinmo_load_backup_settings();
    if (empty($settings['storage']['enabled'])) {
        return ['ok' => false, 'error' => 'El backup de storage esta desactivado.'];
    }

    $result = webinmo_backup_storage_zip();
    $settings['storage']['lastRunAt'] = date(DATE_ATOM);
    $settings['storage']['lastStatus'] = ($result['ok'] ?? false) ? ('ok:' . $reason) : ('error:' . ($result['error'] ?? 'backup'));
    if (!empty($result['file'])) {
        $settings['storage']['lastFile'] = (string) $result['file'];
    }
    webinmo_save_backup_settings($settings);
    if ($result['ok'] ?? false) {
        webinmo_prune_storage_backups((int) ($settings['storage']['keep'] ?? 14));
    }
    return $result;
}

function webinmo_maybe_run_scheduled_storage_backup(): void {
    if (!webinmo_is_admin()) {
        return;
    }
    $settings = webinmo_load_backup_settings();
    if (empty($settings['storage']['enabled'])) {
        return;
    }
    $lastRunAt = (string) ($settings['storage']['lastRunAt'] ?? '');
    $lastRun = $lastRunAt !== '' ? strtotime($lastRunAt) : false;
    $frequency = max(1, (int) ($settings['storage']['frequencyHours'] ?? 24)) * 3600;
    if ($lastRun !== false && (time() - $lastRun) < $frequency) {
        return;
    }
    webinmo_run_storage_backup('auto');
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

function webinmo_load_proposals(): array {
    webinmo_ensure_storage();
    $proposals = webinmo_read_json(WEBINMO_PROPOSALS_FILE, []);
    return is_array($proposals) ? array_values(array_filter($proposals, 'is_array')) : [];
}

function webinmo_save_proposals(array $proposals): bool {
    return webinmo_write_json(WEBINMO_PROPOSALS_FILE, array_values($proposals));
}

function webinmo_load_proposal_leads(): array {
    webinmo_ensure_storage();
    $leads = webinmo_read_json(WEBINMO_PROPOSAL_LEADS_FILE, []);
    return is_array($leads) ? array_values(array_filter($leads, 'is_array')) : [];
}

function webinmo_save_proposal_leads(array $leads): bool {
    return webinmo_write_json(WEBINMO_PROPOSAL_LEADS_FILE, array_values($leads));
}

function webinmo_visible_proposal_leads(): array {
    $leads = webinmo_load_proposal_leads();
    if (webinmo_is_admin()) {
        usort($leads, static function (array $a, array $b): int {
            return strcmp((string) ($b['updatedAt'] ?? ''), (string) ($a['updatedAt'] ?? ''));
        });
        return $leads;
    }
    $clientId = webinmo_current_client_id();
    $visible = array_values(array_filter($leads, static function (array $lead) use ($clientId): bool {
        return (string) ($lead['clientId'] ?? '') === $clientId;
    }));
    usort($visible, static function (array $a, array $b): int {
        return strcmp((string) ($b['updatedAt'] ?? ''), (string) ($a['updatedAt'] ?? ''));
    });
    return $visible;
}

function webinmo_can_access_proposal_lead(array $lead): bool {
    return webinmo_is_admin() || (string) ($lead['clientId'] ?? '') === webinmo_current_client_id();
}

function webinmo_load_proposal_line_presets(): array {
    webinmo_ensure_storage();
    $presets = webinmo_read_json(WEBINMO_PROPOSAL_LINE_PRESETS_FILE, []);
    return is_array($presets) ? array_values(array_filter($presets, 'is_array')) : [];
}

function webinmo_save_proposal_line_presets(array $presets): bool {
    return webinmo_write_json(WEBINMO_PROPOSAL_LINE_PRESETS_FILE, array_values($presets));
}

function webinmo_load_estimator_catalog(): array {
    webinmo_ensure_storage();
    $catalog = webinmo_read_json(WEBINMO_ESTIMATOR_CATALOG_FILE, webinmo_default_estimator_catalog());
    return is_array($catalog) ? array_values(array_filter($catalog, 'is_array')) : webinmo_default_estimator_catalog();
}

function webinmo_save_estimator_catalog(array $catalog): bool {
    return webinmo_write_json(WEBINMO_ESTIMATOR_CATALOG_FILE, array_values($catalog));
}

function webinmo_visible_proposal_line_presets(): array {
    $presets = webinmo_load_proposal_line_presets();
    if (webinmo_is_admin()) {
        usort($presets, static function (array $a, array $b): int {
            return strcmp((string) ($a['title'] ?? ''), (string) ($b['title'] ?? ''));
        });
        return $presets;
    }
    $clientId = webinmo_current_client_id();
    $visible = array_values(array_filter($presets, static function (array $preset) use ($clientId): bool {
        $owner = (string) ($preset['clientId'] ?? '');
        return $owner === '' || $owner === $clientId;
    }));
    usort($visible, static function (array $a, array $b): int {
        return strcmp((string) ($a['title'] ?? ''), (string) ($b['title'] ?? ''));
    });
    return $visible;
}

function webinmo_can_access_proposal_line_preset(array $preset): bool {
    return webinmo_is_admin() || (string) ($preset['clientId'] ?? '') === '' || (string) ($preset['clientId'] ?? '') === webinmo_current_client_id();
}

function webinmo_can_access_proposal(array $proposal): bool {
    return webinmo_is_admin() || (string) ($proposal['clientId'] ?? '') === webinmo_current_client_id();
}

function webinmo_visible_proposals(): array {
    $proposals = webinmo_load_proposals();
    if (webinmo_is_admin()) {
        usort($proposals, static function (array $a, array $b): int {
            return strcmp((string) ($b['updatedAt'] ?? ''), (string) ($a['updatedAt'] ?? ''));
        });
        return $proposals;
    }
    $clientId = webinmo_current_client_id();
    $visible = array_values(array_filter($proposals, static function (array $proposal) use ($clientId): bool {
        return (string) ($proposal['clientId'] ?? '') === $clientId;
    }));
    usort($visible, static function (array $a, array $b): int {
        return strcmp((string) ($b['updatedAt'] ?? ''), (string) ($a['updatedAt'] ?? ''));
    });
    return $visible;
}

function webinmo_find_public_proposal(string $slug): ?array {
    $slug = trim($slug);
    if ($slug === '') {
        return null;
    }
    foreach (webinmo_load_proposals() as $proposal) {
        if ((string) ($proposal['slug'] ?? '') === $slug) {
            return $proposal;
        }
    }
    return null;
}

function webinmo_record_proposal_view(string $slug): ?array {
    $slug = trim($slug);
    if ($slug === '') {
        return null;
    }
    $proposals = webinmo_load_proposals();
    $updatedProposal = null;
    foreach ($proposals as $index => $proposal) {
        if ((string) ($proposal['slug'] ?? '') !== $slug) {
            continue;
        }
        $now = date(DATE_ATOM);
        $proposal['viewCount'] = (int) ($proposal['viewCount'] ?? 0) + 1;
        $proposal['firstViewedAt'] = (string) ($proposal['firstViewedAt'] ?? $now);
        $proposal['lastViewedAt'] = $now;
        $recentViews = isset($proposal['recentViews']) && is_array($proposal['recentViews']) ? $proposal['recentViews'] : [];
        array_unshift($recentViews, [
            'at' => $now,
            'ipHash' => substr(sha1((string) ($_SERVER['REMOTE_ADDR'] ?? '')), 0, 12),
            'userAgent' => substr((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 180),
            'referer' => substr((string) ($_SERVER['HTTP_REFERER'] ?? ''), 0, 240),
        ]);
        $proposal['recentViews'] = array_slice($recentViews, 0, 20);
        $proposals[$index] = $proposal;
        $updatedProposal = $proposal;
        break;
    }
    if ($updatedProposal && webinmo_save_proposals($proposals)) {
        return $updatedProposal;
    }
    return $updatedProposal;
}

function webinmo_send_proposal_response_notification(array $proposal, string $action, string $message = ''): bool {
    $statusText = $action === 'accepted' ? 'aceptada' : 'rechazada';
    $projectName = (string) ($proposal['projectName'] ?? 'Presupuesto');
    $clientName = (string) ($proposal['clientName'] ?? 'Cliente');
    $slug = (string) ($proposal['slug'] ?? '');
    $adminUrl = 'https://tupromocion.es/estimator/form.html?id=' . rawurlencode((string) ($proposal['id'] ?? ''));
    $publicUrl = 'https://tupromocion.es/propuesta/' . rawurlencode($slug);
    $subject = "Propuesta {$statusText}: {$projectName}";
    $body = "La propuesta ha sido {$statusText}.\n\nCliente: {$clientName}\nProyecto: {$projectName}\nEnlace publico: {$publicUrl}\nEditar en Estimator: {$adminUrl}";
    if ($message !== '') {
        $body .= "\n\nMensaje del cliente:\n{$message}";
    }

    $recipients = array_values(array_unique(array_filter([
        'info@tucasaen3d.es',
        (string) ($proposal['preparedByEmail'] ?? ''),
        (string) ($proposal['ctaEmail'] ?? ''),
    ], static function (string $email): bool {
        return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
    })));

    if (!$recipients || !function_exists('mail')) {
        return false;
    }

    $headers = "From: TuPromocion.es <info@tucasaen3d.es>\r\n";
    $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
    return @mail(implode(',', $recipients), $subject, $body, $headers);
}

function webinmo_respond_to_public_proposal(string $slug, string $action, string $message = ''): array {
    $slug = preg_replace('/[^a-zA-Z0-9_-]/', '', trim($slug));
    if ($slug === '') {
        return ['ok' => false, 'error' => 'Slug requerido.'];
    }
    if (!in_array($action, ['accepted', 'rejected'], true)) {
        return ['ok' => false, 'error' => 'Accion no valida.'];
    }

    $proposals = webinmo_load_proposals();
    foreach ($proposals as $index => $proposal) {
        if (!is_array($proposal) || (string) ($proposal['slug'] ?? '') !== $slug) {
            continue;
        }
        $currentStatus = (string) ($proposal['status'] ?? '');
        if (in_array($currentStatus, ['accepted', 'rejected'], true)) {
            return [
                'ok' => true,
                'alreadyResponded' => true,
                'status' => $currentStatus,
                'respondedAt' => $proposal['respondedAt'] ?? null,
            ];
        }
        $now = date(DATE_ATOM);
        $proposal['status'] = $action;
        $proposal['respondedAt'] = $now;
        $proposal['updatedAt'] = $now;
        $proposal['adminNotificationUnread'] = true;
        $proposal['adminNotificationText'] = $action === 'accepted' ? 'Propuesta aceptada por el cliente.' : 'Propuesta rechazada por el cliente.';
        if ($message !== '') {
            $proposal['respondedMessage'] = $message;
        }
        $proposal['adminNotificationEmailSent'] = webinmo_send_proposal_response_notification($proposal, $action, $message);
        $proposals[$index] = $proposal;
        if (!webinmo_save_proposals($proposals)) {
            return ['ok' => false, 'error' => 'No se ha podido guardar la respuesta.'];
        }
        return ['ok' => true, 'action' => $action, 'proposal' => $proposal];
    }

    return ['ok' => false, 'error' => 'Presupuesto no encontrado.'];
}

function webinmo_update_proposal_status(string $proposalId, string $status): array {
    $proposalId = trim($proposalId);
    $status = trim($status);
    if ($proposalId === '' || !in_array($status, ['draft', 'sent', 'accepted', 'rejected', 'expired'], true)) {
        return ['ok' => false, 'error' => 'Estado no valido.'];
    }
    $proposals = webinmo_load_proposals();
    foreach ($proposals as $index => $proposal) {
        if ((string) ($proposal['id'] ?? '') !== $proposalId) {
            continue;
        }
        if (!webinmo_can_access_proposal($proposal)) {
            return ['ok' => false, 'error' => 'No tienes permisos para cambiar este presupuesto.'];
        }
        $proposal['status'] = $status;
        $proposal['updatedAt'] = date(DATE_ATOM);
        if ($status === 'sent') {
            $proposal['sentAt'] = (string) ($proposal['sentAt'] ?? $proposal['updatedAt']);
        }
        $proposals[$index] = $proposal;
        if (!webinmo_save_proposals($proposals)) {
            return ['ok' => false, 'error' => 'No se ha podido cambiar el estado.'];
        }
        return ['ok' => true];
    }
    return ['ok' => false, 'error' => 'Presupuesto no encontrado.'];
}

function webinmo_load_project(string $projectId): ?array {
    $project = webinmo_read_json(webinmo_project_path($projectId), null);
    return is_array($project) ? $project : null;
}

function webinmo_find_public_project_by_slug(string $slug): ?array {
    $slug = webinmo_slugify($slug);
    if ($slug === '') {
        return null;
    }
    foreach (webinmo_load_project_index() as $meta) {
        $project = webinmo_load_project((string) ($meta['id'] ?? ''));
        if (!$project || (string) ($project['status'] ?? 'draft') !== 'published') {
            continue;
        }
        $slugCandidates = array_filter([
            (string) ($meta['slug'] ?? ''),
            (string) ($project['slug'] ?? ''),
            (string) ($project['state']['publicSlug'] ?? ''),
            webinmo_project_preferred_slug($project),
        ], static function ($value): bool {
            return trim((string) $value) !== '';
        });
        foreach ($slugCandidates as $candidate) {
            if (webinmo_slugify((string) $candidate) === $slug) {
                return $project;
            }
        }
    }
    return null;
}

function webinmo_is_generic_project_name(string $value): bool {
    $slug = webinmo_slugify($value);
    return $slug === ''
        || $slug === 'nueva-promocion'
        || $slug === 'promocion-sin-nombre'
        || $slug === 'proyecto-sin-titulo'
        || $slug === 'viviendas-de-obra-nueva-pensadas-para-vivir-mejor';
}

function webinmo_project_preferred_slug(array $project): string {
    $slug = webinmo_slugify(webinmo_build_project_slug_source($project));
    if ($slug !== '') {
        return $slug;
    }
    $state = isset($project['state']) && is_array($project['state']) ? $project['state'] : [];
    return webinmo_slugify((string) ($project['slug'] ?? ($state['publicSlug'] ?? '')));
}

function webinmo_unique_public_slug(array $project, array $projects): string {
    $base = webinmo_project_preferred_slug($project);
    if ($base === '') {
        $base = webinmo_slugify((string) ($project['id'] ?? 'promocion'));
    }
    $projectId = (string) ($project['id'] ?? '');
    foreach ($projects as $otherProject) {
        if ((string) ($otherProject['id'] ?? '') === $projectId) {
            continue;
        }
        if (webinmo_project_preferred_slug($otherProject) === $base) {
            return $base . '-' . substr($projectId, 0, 6);
        }
    }
    return $base;
}

function webinmo_build_project_slug_source(array $project): string {
    $state = isset($project['state']) && is_array($project['state']) ? $project['state'] : [];
    $candidates = [
        trim((string) ($state['seoTitle'] ?? '')),
        trim((string) ($state['projectName'] ?? '')),
        trim((string) ($project['name'] ?? '')),
        trim((string) ($state['headline'] ?? '')),
        trim((string) ($state['companyName'] ?? '')),
    ];
    $projectName = '';
    foreach ($candidates as $candidate) {
        if ($candidate !== '' && !webinmo_is_generic_project_name($candidate)) {
            $projectName = $candidate;
            break;
        }
    }
    if ($projectName === '') {
        foreach ($candidates as $candidate) {
            if ($candidate !== '') {
                $projectName = $candidate;
                break;
            }
        }
    }
    $province = trim((string) ($state['province'] ?? ''));
    $city = trim((string) ($state['city'] ?? ''));
    return trim(implode(' ', array_filter([$projectName, $province, $city], static function ($value): bool {
        return (string) $value !== '';
    })));
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

function webinmo_grant_estimator_access(): void {
    $_SESSION[WEBINMO_ESTIMATOR_SESSION_KEY] = time() + 4 * 60 * 60;
}

function webinmo_has_estimator_access(): bool {
    return webinmo_is_authenticated()
        && webinmo_is_admin()
        && (int) ($_SESSION[WEBINMO_ESTIMATOR_SESSION_KEY] ?? 0) > time();
}

function webinmo_require_estimator_access(): void {
    webinmo_require_auth();
    if (!webinmo_has_estimator_access()) {
        webinmo_respond([
            'ok' => false,
            'authenticated' => true,
            'estimatorAllowed' => false,
            'error' => 'Acceso al estimator bloqueado. Entra desde el panel de administracion.',
        ], 403);
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

    return array_map(static function (array $project) use ($clientsById, $projects): array {
        $clientId = (string) ($project['clientId'] ?? '');
        $client = $clientsById[$clientId] ?? [];
        $state = is_array($project['state'] ?? null) ? $project['state'] : [];
        $publicSlug = webinmo_unique_public_slug($project, $projects);

        return [
            'id' => (string) ($project['id'] ?? ''),
            'name' => (string) ($project['name'] ?? 'Promocion sin nombre'),
            'slug' => $publicSlug,
            'status' => 'published',
            'updatedAt' => (string) ($project['updatedAt'] ?? ''),
            'createdAt' => (string) ($project['createdAt'] ?? ''),
            'clientId' => $clientId,
            'clientName' => (string) ($client['name'] ?? ($state['companyName'] ?? '')),
            'state' => [
                'projectName' => (string) ($state['projectName'] ?? ($project['name'] ?? '')),
                'companyName' => (string) ($state['companyName'] ?? ''),
                'headline' => (string) ($state['headline'] ?? ''),
                'introText' => (string) ($state['introText'] ?? ''),
                'cardLabel' => (string) ($state['cardLabel'] ?? ''),
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
    webinmo_maybe_run_scheduled_storage_backup();

    return [
        'clients' => webinmo_visible_clients(),
        'users' => webinmo_is_admin() ? webinmo_public_users() : [],
        'projects' => webinmo_visible_projects(),
        'proposals' => webinmo_visible_proposals(),
        'proposalLeads' => webinmo_visible_proposal_leads(),
        'proposalLinePresets' => webinmo_visible_proposal_line_presets(),
        'analytics' => webinmo_visible_analytics(),
        'leads' => webinmo_visible_leads(),
        'currentUser' => webinmo_current_user_public(),
        'backupSettings' => webinmo_is_admin() ? webinmo_load_backup_settings() : [],
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

function webinmo_visible_leads(): array {
    $leads = webinmo_load_leads();
    if (webinmo_is_admin()) {
        return $leads;
    }

    $visibleProjects = array_map(static function (array $project): string {
        return (string) ($project['id'] ?? '');
    }, webinmo_visible_projects());

    return array_values(array_filter($leads, static function (array $lead) use ($visibleProjects): bool {
        return in_array((string) ($lead['projectId'] ?? ''), $visibleProjects, true);
    }));
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
    $settings = webinmo_load_backup_settings();
    $versions = array_slice($versions, 0, (int) max(5, ($settings['projects']['keep'] ?? 20)));
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

function webinmo_upsert_project(array $project, string $saveMode = 'manual'): array {
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
    $slugBase = webinmo_build_project_slug_source($project);
    $slug = webinmo_slugify($slugBase);
    if ($slug === '') {
        $slug = 'promocion-' . substr($projectId, 0, 8);
    }
    foreach (webinmo_load_project_index() as $entry) {
        if ((string) ($entry['id'] ?? '') === $projectId) {
            continue;
        }
        if ((string) ($entry['slug'] ?? '') === $slug) {
            $slug .= '-' . substr($projectId, 0, 6);
            break;
        }
    }
    $project['slug'] = $slug;
    if (!isset($project['state']) || !is_array($project['state'])) {
        $project['state'] = [];
    }
    $project['state']['publicSlug'] = $slug;
    $path = webinmo_project_path($projectId);
    if (!webinmo_write_json($path, $project)) {
        return ['ok' => false, 'error' => 'No se ha podido guardar el archivo de la promocion.'];
    }
    if ($saveMode !== 'autosave') {
        webinmo_record_project_version($project);
        webinmo_record_project_backup($project);
    }

    $index = webinmo_load_project_index();
    $meta = [
        'id' => $projectId,
        'clientId' => (string) ($project['clientId'] ?? ''),
        'name' => (string) ($project['name'] ?? 'Promocion sin nombre'),
        'slug' => $slug,
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
    webinmo_record_project_backup($existing, 'delete');

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
    return ['ok' => true, 'project' => $project];
}

function webinmo_upsert_proposal(array $proposal): array {
    $proposalId = (string) ($proposal['id'] ?? '');
    if ($proposalId === '') {
        return ['ok' => false, 'error' => 'El presupuesto no tiene identificador.'];
    }
    $slug = trim((string) ($proposal['slug'] ?? ''));
    if ($slug === '') {
        return ['ok' => false, 'error' => 'El presupuesto necesita un enlace o slug.'];
    }
    if (!preg_match('/^[a-z0-9-]+$/', $slug)) {
        return ['ok' => false, 'error' => 'El slug solo puede contener letras, números y guiones.'];
    }
    if (!webinmo_is_admin()) {
        $proposal['clientId'] = webinmo_current_client_id();
    }
    if (!webinmo_can_access_proposal($proposal)) {
        return ['ok' => false, 'error' => 'No tienes permisos para guardar este presupuesto.'];
    }

    $proposals = webinmo_load_proposals();
    foreach ($proposals as $entry) {
        if ((string) ($entry['slug'] ?? '') === $slug && (string) ($entry['id'] ?? '') !== $proposalId) {
            return ['ok' => false, 'error' => 'Ya existe otro presupuesto con ese enlace.'];
        }
    }

    $now = date(DATE_ATOM);
    $proposal['createdAt'] = (string) ($proposal['createdAt'] ?? $now);
    $proposal['updatedAt'] = $now;

    $updated = false;
    foreach ($proposals as $index => $entry) {
        if ((string) ($entry['id'] ?? '') !== $proposalId) {
            continue;
        }
        $proposals[$index] = array_merge($entry, $proposal);
        $updated = true;
        break;
    }
    if (!$updated) {
        array_unshift($proposals, $proposal);
    }

    if (!webinmo_save_proposals($proposals)) {
        return ['ok' => false, 'error' => 'No se ha podido guardar el presupuesto.'];
    }
    return ['ok' => true];
}

function webinmo_delete_proposal(string $proposalId): array {
    $proposalId = trim($proposalId);
    if ($proposalId === '') {
        return ['ok' => false, 'error' => 'Presupuesto no válido.'];
    }
    $proposals = webinmo_load_proposals();
    $target = null;
    foreach ($proposals as $proposal) {
        if ((string) ($proposal['id'] ?? '') === $proposalId) {
            $target = $proposal;
            break;
        }
    }
    if (!$target) {
        return ['ok' => false, 'error' => 'Presupuesto no encontrado.'];
    }
    if (!webinmo_can_access_proposal($target)) {
        return ['ok' => false, 'error' => 'No tienes permisos para borrar este presupuesto.'];
    }
    $proposals = array_values(array_filter($proposals, static function (array $proposal) use ($proposalId): bool {
        return (string) ($proposal['id'] ?? '') !== $proposalId;
    }));
    if (!webinmo_save_proposals($proposals)) {
        return ['ok' => false, 'error' => 'No se ha podido borrar el presupuesto.'];
    }
    return ['ok' => true];
}

function webinmo_upsert_proposal_lead(array $lead): array {
    $leadId = trim((string) ($lead['id'] ?? ''));
    if ($leadId === '') {
        return ['ok' => false, 'error' => 'El lead no tiene identificador.'];
    }
    $lead['name'] = trim((string) ($lead['name'] ?? ''));
    if ($lead['name'] === '') {
        return ['ok' => false, 'error' => 'El lead necesita al menos un nombre.'];
    }
    if (!webinmo_is_admin()) {
        $lead['clientId'] = webinmo_current_client_id();
    }
    if (!webinmo_can_access_proposal_lead($lead)) {
        return ['ok' => false, 'error' => 'No tienes permisos para guardar este lead.'];
    }
    $now = date(DATE_ATOM);
    $lead['clientId'] = (string) ($lead['clientId'] ?? '');
    $lead['createdAt'] = (string) ($lead['createdAt'] ?? $now);
    $lead['updatedAt'] = $now;
    $leads = webinmo_load_proposal_leads();
    $updated = false;
    foreach ($leads as $index => $entry) {
        if ((string) ($entry['id'] ?? '') !== $leadId) {
            continue;
        }
        $leads[$index] = array_merge($entry, $lead);
        $updated = true;
        break;
    }
    if (!$updated) {
        array_unshift($leads, $lead);
    }
    if (!webinmo_save_proposal_leads($leads)) {
        return ['ok' => false, 'error' => 'No se ha podido guardar el lead.'];
    }
    return ['ok' => true];
}

function webinmo_delete_proposal_lead(string $leadId): array {
    $leadId = trim($leadId);
    if ($leadId === '') {
        return ['ok' => false, 'error' => 'Lead no válido.'];
    }
    $leads = webinmo_load_proposal_leads();
    $target = null;
    foreach ($leads as $lead) {
        if ((string) ($lead['id'] ?? '') === $leadId) {
            $target = $lead;
            break;
        }
    }
    if (!$target) {
        return ['ok' => false, 'error' => 'Lead no encontrado.'];
    }
    if (!webinmo_can_access_proposal_lead($target)) {
        return ['ok' => false, 'error' => 'No tienes permisos para borrar este lead.'];
    }
    $leads = array_values(array_filter($leads, static function (array $lead) use ($leadId): bool {
        return (string) ($lead['id'] ?? '') !== $leadId;
    }));
    if (!webinmo_save_proposal_leads($leads)) {
        return ['ok' => false, 'error' => 'No se ha podido borrar el lead.'];
    }
    return ['ok' => true];
}

function webinmo_upsert_proposal_line_preset(array $preset): array {
    $presetId = trim((string) ($preset['id'] ?? ''));
    if ($presetId === '') {
        return ['ok' => false, 'error' => 'La línea no tiene identificador.'];
    }
    $preset['title'] = trim((string) ($preset['title'] ?? ''));
    if ($preset['title'] === '') {
        return ['ok' => false, 'error' => 'La línea necesita un título.'];
    }
    if (!webinmo_is_admin() && !empty($preset['clientId']) && (string) $preset['clientId'] !== webinmo_current_client_id()) {
        return ['ok' => false, 'error' => 'No puedes asignar esta línea a otro cliente.'];
    }
    if (!webinmo_can_access_proposal_line_preset($preset)) {
        return ['ok' => false, 'error' => 'No tienes permisos para guardar esta línea.'];
    }
    $now = date(DATE_ATOM);
    if (!webinmo_is_admin()) {
        $preset['clientId'] = webinmo_current_client_id();
    }
    $preset['clientId'] = (string) ($preset['clientId'] ?? '');
    $preset['createdAt'] = (string) ($preset['createdAt'] ?? $now);
    $preset['updatedAt'] = $now;
    $presets = webinmo_load_proposal_line_presets();
    $updated = false;
    foreach ($presets as $index => $entry) {
        if ((string) ($entry['id'] ?? '') !== $presetId) {
            continue;
        }
        $presets[$index] = array_merge($entry, $preset);
        $updated = true;
        break;
    }
    if (!$updated) {
        array_unshift($presets, $preset);
    }
    if (!webinmo_save_proposal_line_presets($presets)) {
        return ['ok' => false, 'error' => 'No se ha podido guardar la línea.'];
    }
    return ['ok' => true];
}

function webinmo_delete_proposal_line_preset(string $presetId): array {
    $presetId = trim($presetId);
    if ($presetId === '') {
        return ['ok' => false, 'error' => 'Línea no válida.'];
    }
    $presets = webinmo_load_proposal_line_presets();
    $target = null;
    foreach ($presets as $preset) {
        if ((string) ($preset['id'] ?? '') === $presetId) {
            $target = $preset;
            break;
        }
    }
    if (!$target) {
        return ['ok' => false, 'error' => 'Línea no encontrada.'];
    }
    if (!webinmo_can_access_proposal_line_preset($target)) {
        return ['ok' => false, 'error' => 'No tienes permisos para borrar esta línea.'];
    }
    $presets = array_values(array_filter($presets, static function (array $preset) use ($presetId): bool {
        return (string) ($preset['id'] ?? '') !== $presetId;
    }));
    if (!webinmo_save_proposal_line_presets($presets)) {
        return ['ok' => false, 'error' => 'No se ha podido borrar la línea.'];
    }
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
    webinmo_record_user_backup($payload);
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
    webinmo_record_user_backup($target, 'delete');
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

    $safeProjectId = preg_replace('/[^a-zA-Z0-9_-]/', '', $projectId);
    $relPath = './storage/assets/' . $safeProjectId . '/' . $filename;

    if (in_array($ext, ['jpg', 'png', 'webp'], true)) {
        webinmo_optimize_image($path, $mime, 2200, 2200);
        if (webinmo_should_watermark_asset($projectId, $hint, $mime)) {
            webinmo_apply_watermark($path, $mime);
        }
    }

    // Generar miniatura para imágenes (no PDF ni SVG)
    if (in_array($ext, ['jpg', 'png', 'webp'], true) && function_exists('imagecreatefromjpeg')) {
        $thumbFilename = $safeHint . '-' . $hash . '-thumb.jpg';
        $thumbPath = $dir . '/' . $thumbFilename;
        webinmo_generate_thumb($path, $thumbPath, $mime, 480);
    }

    return ['ok' => true, 'path' => $relPath];
}

function webinmo_store_uploaded_asset(string $projectId, string $hint, array $file): array {
    $tmpPath = (string) ($file['tmp_name'] ?? '');
    if ($tmpPath === '' || !is_uploaded_file($tmpPath)) {
        return ['ok' => false, 'error' => 'Archivo no valido.'];
    }

    $mime = strtolower((string) (@mime_content_type($tmpPath) ?: ''));
    $ext = match ($mime) {
        'image/jpeg', 'image/jpg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
        'image/svg+xml', 'text/plain' => 'svg',
        'application/pdf' => 'pdf',
        default => '',
    };

    if ($ext === '') {
        $originalName = strtolower((string) ($file['name'] ?? ''));
        if (str_ends_with($originalName, '.svg')) {
            $ext = 'svg';
            $mime = 'image/svg+xml';
        }
    }

    if ($ext === '') {
        return ['ok' => false, 'error' => 'Tipo de archivo no soportado.'];
    }

    $bytes = @file_get_contents($tmpPath);
    if ($bytes === false || $bytes === '') {
        return ['ok' => false, 'error' => 'No se ha podido leer el archivo.'];
    }

    $dir = webinmo_project_assets_dir($projectId);
    if (!is_dir($dir) && !mkdir($dir, 0777, true) && !is_dir($dir)) {
        return ['ok' => false, 'error' => 'No se ha podido crear la carpeta de archivos.'];
    }

    $safeHint = preg_replace('/[^a-zA-Z0-9_-]/', '-', strtolower($hint)) ?: 'asset';
    $hash = substr(sha1($bytes), 0, 16);
    $filename = $safeHint . '-' . $hash . '.' . $ext;
    $path = $dir . '/' . $filename;

    if (!@move_uploaded_file($tmpPath, $path)) {
        if (file_put_contents($path, $bytes, LOCK_EX) === false) {
            return ['ok' => false, 'error' => 'No se ha podido guardar el archivo.'];
        }
    }

    $safeProjectId = preg_replace('/[^a-zA-Z0-9_-]/', '', $projectId);
    $relPath = './storage/assets/' . $safeProjectId . '/' . $filename;

    if (in_array($ext, ['jpg', 'png', 'webp'], true)) {
        webinmo_optimize_image($path, $mime, 2200, 2200);
        if (webinmo_should_watermark_asset($projectId, $hint, $mime)) {
            webinmo_apply_watermark($path, $mime);
        }
    }

    if (in_array($ext, ['jpg', 'png', 'webp'], true) && function_exists('imagecreatefromjpeg')) {
        $thumbFilename = $safeHint . '-' . $hash . '-thumb.jpg';
        $thumbPath = $dir . '/' . $thumbFilename;
        webinmo_generate_thumb($path, $thumbPath, $mime, 480);
    }

    return ['ok' => true, 'path' => $relPath];
}

function webinmo_load_image_resource(string $path, string $mime) {
    return match ($mime) {
        'image/jpeg', 'image/jpg' => function_exists('imagecreatefromjpeg') ? @imagecreatefromjpeg($path) : false,
        'image/png' => function_exists('imagecreatefrompng') ? @imagecreatefrompng($path) : false,
        'image/webp' => function_exists('imagecreatefromwebp') ? @imagecreatefromwebp($path) : false,
        default => false,
    };
}

function webinmo_save_image_resource($image, string $path, string $mime): bool {
    return match ($mime) {
        'image/jpeg', 'image/jpg' => function_exists('imagejpeg') ? @imagejpeg($image, $path, 82) : false,
        'image/png' => function_exists('imagepng') ? @imagepng($image, $path, 7) : false,
        'image/webp' => function_exists('imagewebp') ? @imagewebp($image, $path, 80) : false,
        default => false,
    };
}

function webinmo_prepare_canvas(int $width, int $height, string $mime) {
    if (!function_exists('imagecreatetruecolor')) {
        return false;
    }
    $canvas = imagecreatetruecolor($width, $height);
    if (!$canvas) {
        return false;
    }
    if (in_array($mime, ['image/png', 'image/webp'], true)) {
        imagealphablending($canvas, false);
        imagesavealpha($canvas, true);
        $transparent = imagecolorallocatealpha($canvas, 0, 0, 0, 127);
        imagefill($canvas, 0, 0, $transparent);
        return $canvas;
    }
    imagefill($canvas, 0, 0, imagecolorallocate($canvas, 255, 255, 255));
    return $canvas;
}

function webinmo_optimize_image(string $path, string $mime, int $maxW, int $maxH): void {
    $img = webinmo_load_image_resource($path, $mime);
    if (!$img) {
        return;
    }

    $w = imagesx($img);
    $h = imagesy($img);
    if ($w <= 0 || $h <= 0) {
        imagedestroy($img);
        return;
    }

    $ratio = min($maxW / $w, $maxH / $h, 1);
    $nw = max(1, (int) round($w * $ratio));
    $nh = max(1, (int) round($h * $ratio));

    if ($ratio >= 1) {
        webinmo_save_image_resource($img, $path, $mime);
        imagedestroy($img);
        return;
    }

    $optimized = webinmo_prepare_canvas($nw, $nh, $mime);
    if (!$optimized) {
        imagedestroy($img);
        return;
    }

    imagecopyresampled($optimized, $img, 0, 0, 0, 0, $nw, $nh, $w, $h);
    webinmo_save_image_resource($optimized, $path, $mime);
    imagedestroy($img);
    imagedestroy($optimized);
}

function webinmo_should_watermark_asset(string $projectId, string $hint, string $mime): bool {
    if (!in_array($mime, ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'], true)) {
        return false;
    }
    if ($projectId === 'estimator-catalog') {
        return false;
    }
    $hint = strtolower(trim($hint));
    if ($hint === '' || str_contains($hint, 'logo') || str_contains($hint, 'plan') || str_contains($hint, 'dossier') || str_contains($hint, 'pdf')) {
        return false;
    }
    return str_contains($hint, 'render')
        || str_contains($hint, 'cover')
        || str_contains($hint, 'social')
        || str_contains($hint, 'tour');
}

function webinmo_apply_watermark(string $path, string $mime): void {
    $base = webinmo_load_image_resource($path, $mime);
    if (!$base) {
        return;
    }

    $watermarkPath = __DIR__ . '/../img/tupromocion-icon.png';
    if (!file_exists($watermarkPath) || !function_exists('imagecreatefrompng')) {
        imagedestroy($base);
        return;
    }

    $watermark = @imagecreatefrompng($watermarkPath);
    if (!$watermark) {
        imagedestroy($base);
        return;
    }

    $baseW = imagesx($base);
    $baseH = imagesy($base);
    $wmW = imagesx($watermark);
    $wmH = imagesy($watermark);
    if ($baseW <= 0 || $baseH <= 0 || $wmW <= 0 || $wmH <= 0) {
        imagedestroy($watermark);
        imagedestroy($base);
        return;
    }

    $targetW = max(120, min(260, (int) round($baseW * 0.14)));
    $ratio = $targetW / $wmW;
    $targetH = max(40, (int) round($wmH * $ratio));
    $overlay = webinmo_prepare_canvas($targetW, $targetH, 'image/png');
    if (!$overlay) {
        imagedestroy($watermark);
        imagedestroy($base);
        return;
    }

    imagecopyresampled($overlay, $watermark, 0, 0, 0, 0, $targetW, $targetH, $wmW, $wmH);
    $margin = max(18, (int) round(min($baseW, $baseH) * 0.025));
    $destX = max(0, $baseW - $targetW - $margin);
    $destY = max(0, $baseH - $targetH - $margin);
    imagealphablending($base, true);
    imagecopy($base, $overlay, $destX, $destY, 0, 0, $targetW, $targetH);
    webinmo_save_image_resource($base, $path, $mime);

    imagedestroy($overlay);
    imagedestroy($watermark);
    imagedestroy($base);
}

function webinmo_generate_thumb(string $src, string $dst, string $mime, int $maxW): void {
    if (file_exists($dst)) return;
    $img = webinmo_load_image_resource($src, $mime);
    if (!$img) return;
    $w = imagesx($img);
    $h = imagesy($img);
    if ($w <= $maxW) { imagejpeg($img, $dst, 78); imagedestroy($img); return; }
    $ratio = $maxW / $w;
    $nw = $maxW;
    $nh = (int) round($h * $ratio);
    $thumb = webinmo_prepare_canvas($nw, $nh, 'image/jpeg');
    if (!$thumb) {
        imagedestroy($img);
        return;
    }
    imagefill($thumb, 0, 0, imagecolorallocate($thumb, 255, 255, 255));
    imagecopyresampled($thumb, $img, 0, 0, 0, 0, $nw, $nh, $w, $h);
    imagejpeg($thumb, $dst, 78);
    imagedestroy($img);
    imagedestroy($thumb);
}
