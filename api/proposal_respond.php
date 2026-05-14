<?php
/**
 * api/proposal_respond.php — Endpoint público: aceptar o rechazar una propuesta
 *
 * POST /api/proposal_respond.php
 * Body JSON: { "slug": "presupuesto-xxxx", "action": "accepted"|"rejected", "message": "..." }
 *
 * No requiere autenticación (el slug actúa como token de acceso).
 * Actualiza el archivo storage/proposals.json con el nuevo estado.
 */
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pr_respond(array $data, int $status = 200): never {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function pr_read_json(string $path): ?array {
    if (!file_exists($path)) return null;
    $content = @file_get_contents($path);
    if ($content === false || $content === '') return null;
    $decoded = json_decode($content, true);
    return is_array($decoded) ? $decoded : null;
}

function pr_write_json(string $path, array $data): bool {
    $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($json === false) return false;
    $tmp = $path . '.tmp.' . getmypid();
    if (@file_put_contents($tmp, $json, LOCK_EX) === false) return false;
    return @rename($tmp, $path);
}

// ---------------------------------------------------------------------------
// Validación de la petición
// ---------------------------------------------------------------------------

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    pr_respond(['ok' => false, 'error' => 'Método no permitido.'], 405);
}

$raw   = (string) @file_get_contents('php://input');
$input = json_decode($raw ?: '{}', true);

if (!is_array($input)) {
    pr_respond(['ok' => false, 'error' => 'JSON inválido.'], 400);
}

$slug    = preg_replace('/[^a-zA-Z0-9_-]/', '', trim((string) ($input['slug'] ?? '')));
$action  = trim((string) ($input['action'] ?? ''));
$message = trim((string) ($input['message'] ?? ''));

if ($slug === '') {
    pr_respond(['ok' => false, 'error' => 'Slug requerido.'], 400);
}

if (!in_array($action, ['accepted', 'rejected'], true)) {
    pr_respond(['ok' => false, 'error' => 'Acción no válida. Usa accepted o rejected.'], 400);
}

// ---------------------------------------------------------------------------
// Localizar y actualizar la propuesta
// ---------------------------------------------------------------------------

$storageRoot   = __DIR__ . '/../storage';
$proposalsFile = $storageRoot . '/proposals.json';

$proposals = pr_read_json($proposalsFile);
if (!is_array($proposals)) {
    pr_respond(['ok' => false, 'error' => 'No se pueden leer los presupuestos.'], 500);
}

$found = false;
foreach ($proposals as &$proposal) {
    if (!is_array($proposal)) continue;
    if (($proposal['slug'] ?? '') !== $slug) continue;

    // Si ya tiene respuesta, devolver el estado actual sin modificar
    $currentStatus = (string) ($proposal['status'] ?? '');
    if (in_array($currentStatus, ['accepted', 'rejected'], true)) {
        pr_respond([
            'ok'              => true,
            'alreadyResponded' => true,
            'status'          => $currentStatus,
            'respondedAt'     => $proposal['respondedAt'] ?? null,
        ]);
    }

    $now = date(DATE_ATOM);
    $proposal['status']      = $action;
    $proposal['respondedAt'] = $now;
    $proposal['updatedAt']   = $now;
    if ($message !== '') {
        $proposal['respondedMessage'] = $message;
    }
    $found = true;
    break;
}
unset($proposal);

if (!$found) {
    pr_respond(['ok' => false, 'error' => 'Presupuesto no encontrado.'], 404);
}

if (!pr_write_json($proposalsFile, $proposals)) {
    pr_respond(['ok' => false, 'error' => 'Error al guardar el estado.'], 500);
}

pr_respond(['ok' => true, 'action' => $action]);
