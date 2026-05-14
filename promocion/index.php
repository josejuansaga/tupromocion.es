<?php
/**
 * promocion/index.php — Ficha pública de una promoción individual
 *
 * Sirve el HTML de la SPA con OG tags específicos del proyecto para que
 * WhatsApp, Telegram y Google lean el título, descripción e imagen reales.
 * El JS detecta el slug en el pathname (/promocion/{slug}) y carga la ficha.
 */
declare(strict_types=1);

// ---------------------------------------------------------------------------
// 1. Leer el slug
// ---------------------------------------------------------------------------

$slug = preg_replace('/[^a-zA-Z0-9_-]/', '', trim((string) ($_GET['slug'] ?? '')));

if ($slug === '') {
    header('Location: /');
    exit;
}

// ---------------------------------------------------------------------------
// 2. Intentar cargar datos del proyecto para OG tags
// ---------------------------------------------------------------------------

$storageRoot  = __DIR__ . '/../storage';
$indexFile    = $storageRoot . '/project-index.json';
$projectsDir  = $storageRoot . '/projects';

function pc_read_json(string $path): ?array {
    if (!file_exists($path)) return null;
    $raw = @file_get_contents($path);
    if ($raw === false || $raw === '') return null;
    $data = json_decode($raw, true);
    return is_array($data) ? $data : null;
}

function pc_esc(string $s): string {
    return htmlspecialchars($s, ENT_QUOTES | ENT_HTML5, 'UTF-8');
}

// Buscar el proyecto en el índice por publicSlug
$projectMeta = null;
$projectData = null;
$index = pc_read_json($indexFile) ?? [];

foreach ($index as $meta) {
    if (!is_array($meta) || empty($meta['id'])) continue;

    $safeId   = preg_replace('/[^a-zA-Z0-9_-]/', '', (string) $meta['id']);
    $fullData = pc_read_json($projectsDir . '/' . $safeId . '.json');
    if (!$fullData) continue;

    $state      = is_array($fullData['state'] ?? null) ? $fullData['state'] : [];
    $storedSlug = preg_replace('/[^a-zA-Z0-9_-]/', '',
        trim((string) ($state['publicSlug'] ?? ($fullData['slug'] ?? ($meta['slug'] ?? '')))));

    if ($storedSlug === $slug) {
        $projectMeta = $meta;
        $projectData = array_merge($meta, $fullData);
        break;
    }
}

// Valores para OG tags
$ogTitle       = 'TuPromoción.es — Fichas digitales y servicios 3D';
$ogDescription = 'Renders, planos y ficha digital para vender mejor tu promoción.';
$ogImage       = 'https://tupromocion.es/img/tupromocion-logo.png';
$pageTitle     = 'TuPromoción.es — Ficha de promoción';

if ($projectData) {
    $state       = is_array($projectData['state'] ?? null) ? $projectData['state'] : [];
    $projectName = trim((string) ($state['projectName'] ?? ($projectData['name'] ?? '')));
    $headline    = trim((string) ($state['headline'] ?? ''));
    $city        = trim((string) ($state['city'] ?? ''));
    $company     = trim((string) ($projectData['clientName'] ?? ($state['companyName'] ?? '')));
    $cover       = trim((string) ($state['cover'] ?? ($state['logo'] ?? '')));

    if ($projectName) {
        $location  = implode(', ', array_filter([$city]));
        $titleBits = array_filter([$projectName, $location]);
        $pageTitle = implode(' — ', $titleBits) . ' · TuPromoción.es';
        $ogTitle   = implode(' en ', array_filter([$projectName, $location]));
    }
    if ($headline) {
        $ogDescription = $headline;
    } elseif ($company) {
        $ogDescription = "Ficha digital de {$company}. Renders, planos y material comercial.";
    }
    if ($cover && str_starts_with($cover, 'http')) {
        $ogImage = $cover;
    } elseif ($cover) {
        $ogImage = 'https://tupromocion.es/' . ltrim($cover, '/');
    }
}

$canonical = 'https://tupromocion.es/promocion/' . $slug;

// ---------------------------------------------------------------------------
// 3. Cargar index.html y aplicar los OG tags del proyecto
// ---------------------------------------------------------------------------

$htmlFile = __DIR__ . '/../index.html';
$html     = @file_get_contents($htmlFile);

if ($html === false) {
    http_response_code(500);
    echo '<!DOCTYPE html><html><body>Error cargando la página.</body></html>';
    exit;
}

// Reemplazar title
$html = preg_replace(
    '/<title>[^<]*<\/title>/',
    '<title>' . pc_esc($pageTitle) . '</title>',
    $html,
    1
);

// Reemplazar og:title
$html = preg_replace(
    '/(<meta\s+property=["\']og:title["\'][^>]*content=["\'])[^"\']*(["\'])/',
    '${1}' . pc_esc($ogTitle) . '${2}',
    $html,
    1
);

// Reemplazar og:description
$html = preg_replace(
    '/(<meta\s+property=["\']og:description["\'][^>]*content=["\'])[^"\']*(["\'])/',
    '${1}' . pc_esc($ogDescription) . '${2}',
    $html,
    1
);

// Reemplazar og:image
$html = preg_replace(
    '/(<meta\s+property=["\']og:image["\'][^>]*content=["\'])[^"\']*(["\'])/',
    '${1}' . pc_esc($ogImage) . '${2}',
    $html,
    1
);

// Inyectar og:url y canonical (antes de </head>)
$extraMeta = '
    <meta property="og:url" content="' . pc_esc($canonical) . '" />
    <meta property="og:type" content="website" />
    <link rel="canonical" href="' . pc_esc($canonical) . '" />';
$html = str_replace('</head>', $extraMeta . "\n  </head>", $html);

// Mostrar publicWorkspace sin hidden para que el JS arranque
$html = str_replace(
    '<section id="publicWorkspace" class="public-shell" hidden>',
    '<section id="publicWorkspace" class="public-shell">',
    $html
);

// ---------------------------------------------------------------------------
// 4. Responder
// ---------------------------------------------------------------------------

header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: public, max-age=300, stale-while-revalidate=600');
echo $html;
