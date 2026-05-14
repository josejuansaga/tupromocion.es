<?php
/**
 * propuesta/index.php — Página pública de propuesta comercial
 *
 * Sirve la ficha de presupuesto con:
 *  - noindex/nofollow (no queremos que Google indexe propuestas privadas)
 *  - OG tags dinámicos para previsualización en WhatsApp y email
 *  - El JS de renderizado (proposal-template.js) que hidrata #proposal-root
 */
declare(strict_types=1);

// ---------------------------------------------------------------------------
// 1. Leer el slug
// ---------------------------------------------------------------------------

$slug = trim((string) ($_GET['slug'] ?? ''));

// Sanear: solo alfanuméricos, guiones y guiones bajos
$safeSlug = preg_replace('/[^a-zA-Z0-9_-]/', '', $slug);

if ($safeSlug === '') {
    http_response_code(404);
    echo '<!DOCTYPE html><html lang="es"><body><p>Propuesta no encontrada.</p></body></html>';
    exit;
}

// ---------------------------------------------------------------------------
// 2. Intentar leer datos de la propuesta para los OG tags
// ---------------------------------------------------------------------------

$proposalTitle       = 'Propuesta comercial — TuPromoción.es';
$proposalDescription = 'Revisa los detalles de tu propuesta personalizada.';
$proposalImage       = 'https://tupromocion.es/img/tupromocion-logo.png';
$proposalClientName  = '';
$proposalProject     = '';

// Rutas posibles donde se guardan las propuestas en el servidor
$storageCandidates = [
    __DIR__ . '/../storage/proposals/' . $safeSlug . '.json',
    __DIR__ . '/../storage/presupuestos/' . $safeSlug . '.json',
];

$proposalData = null;
foreach ($storageCandidates as $candidatePath) {
    if (file_exists($candidatePath)) {
        $raw = file_get_contents($candidatePath);
        if ($raw !== false) {
            $decoded = json_decode($raw, true);
            if (is_array($decoded)) {
                $proposalData = $decoded;
                break;
            }
        }
    }
}

if (is_array($proposalData)) {
    // La propuesta puede estar anidada bajo 'proposal' (respuesta de API)
    $p = $proposalData['proposal'] ?? $proposalData['data']['proposal'] ?? $proposalData;

    $projectName   = trim((string) ($p['projectName'] ?? ''));
    $clientName    = trim((string) ($p['clientName'] ?? ''));
    $companyName   = trim((string) ($p['companyName'] ?? ''));
    $headline      = trim((string) ($p['headline'] ?? ''));
    $coverLogo     = trim((string) ($p['logoUrl'] ?? $p['logo'] ?? ''));

    if ($projectName) {
        $proposalTitle = "Propuesta para {$projectName} — TuPromoción.es";
    }
    if ($headline) {
        $proposalDescription = $headline;
    } elseif ($clientName) {
        $proposalDescription = "Propuesta personalizada para {$clientName}.";
    }
    if ($coverLogo) {
        $proposalImage = $coverLogo;
    }
    $proposalClientName = $clientName ?: $companyName;
    $proposalProject    = $projectName;
}

// ---------------------------------------------------------------------------
// 3. Escapar para HTML
// ---------------------------------------------------------------------------

function pe(string $str): string {
    return htmlspecialchars($str, ENT_QUOTES | ENT_HTML5, 'UTF-8');
}

$eTitle       = pe($proposalTitle);
$eDescription = pe($proposalDescription);
$eImage       = pe($proposalImage);
$eSlug        = pe($safeSlug);
$eCanonical   = pe('https://tupromocion.es/propuesta/' . $safeSlug);

// ---------------------------------------------------------------------------
// 4. Enviar cabeceras y HTML
// ---------------------------------------------------------------------------

header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-store, no-cache');  // propuestas son privadas
?>
<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" type="image/x-icon" href="/favicon.ico?v=20260514d" />

    <title><?= $eTitle ?></title>
    <meta name="description" content="<?= $eDescription ?>" />

    <!-- Sin indexación: las propuestas son documentos privados -->
    <meta name="robots" content="noindex, nofollow" />

    <!-- OG / WhatsApp preview -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content="<?= $eCanonical ?>" />
    <meta property="og:title" content="<?= $eTitle ?>" />
    <meta property="og:description" content="<?= $eDescription ?>" />
    <meta property="og:image" content="<?= $eImage ?>" />
    <meta property="og:site_name" content="TuPromoción.es" />

    <!-- Twitter card (también usa OG, pero por si acaso) -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="<?= $eTitle ?>" />
    <meta name="twitter:description" content="<?= $eDescription ?>" />
    <meta name="twitter:image" content="<?= $eImage ?>" />

    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap"
      rel="stylesheet"
    />
    <link rel="stylesheet" href="/styles.css?v=20260514k" />
  </head>
  <body>
    <!-- El slug se expone al JS para que cargue los datos vía /api/public_proposal.php -->
    <script>window.PROPOSAL_PUBLIC_SLUG = <?= json_encode($safeSlug) ?>;</script>

    <!-- El JS hidrata este nodo con todo el HTML de la propuesta -->
    <div id="proposal-root">
      <!-- Cargando propuesta... -->
      <main class="proposal-page">
        <section class="proposal-section">
          <div class="proposal-section__inner">
            <div class="proposal-card" style="text-align:center;padding:3rem 1.5rem;">
              <p style="color:#888;font-size:.9rem;">Cargando propuesta…</p>
            </div>
          </div>
        </section>
      </main>
    </div>

    <script src="/proposal-template.js?v=20260514k"></script>
  </body>
</html>
