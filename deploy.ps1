# ============================================================
# deploy.ps1 - Deploy automatico de tupromocion.es
# ============================================================
# Uso:
#   powershell -ExecutionPolicy Bypass -File deploy.ps1
#   powershell -ExecutionPolicy Bypass -File deploy.ps1 -Force
#   powershell -ExecutionPolicy Bypass -File deploy.ps1 -DryRun
#
# -Force   : sube TODOS los archivos (no solo los cambiados)
# -DryRun  : muestra que subiria sin subir nada
# ============================================================

param(
    [switch]$Force,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

# ── Configuracion ────────────────────────────────────────────
$localRoot   = $PSScriptRoot
$dllPath     = "C:\Program Files (x86)\WinSCP\WinSCPnet.dll"
$remoteRoot  = "/httpdocs"
$versionFile = Join-Path $localRoot ".deploy-version"
$ftpHost     = "tupromocion.es"
$ftpUser     = "tupromo"
$ftpPass     = "1^Mix5q82"

# Directorios completos que se excluyen (cualquier archivo dentro de ellos)
$excludeDirs = @(
    ".git", ".claude", "node_modules",
    "tmp-import-inner", "tmp-import-old",
    "tupromocion.es-deploy", "Z - DOC Interna",
    "deploy-minimo",
    "Versiones", "V19 - V seo",
    "storage"         # el storage del servidor tiene datos reales - no sobreescribir
)

# Patrones de nombre de archivo que NO se suben
$excludePatterns = @(
    "deploy.ps1",
    "*.docx", "*.zip", "*.md", "*.pdf",
    ".deploy-version", ".gitignore", ".gitattributes",
    "*.bat", "docker-compose.yml", "Dockerfile", ".dockerignore", ".env.example",
    "lib-server.php",
    "ACCESOS_*", "DOCUMENTO_*",
    "backup-storage-*"
)

# Archivos raiz que tienen copia "-server" y NO deben subirse directamente
# (se suben via $renameMap con el nombre correcto)
$skipRootFiles = @("app.js", "styles.css", "index.html", "proposal-template.js")

# Archivos locales con nombre diferente al remoto
# Clave = nombre local, Valor = ruta remota relativa
$renameMap = @{
    "app-server.js"               = "app.js"
    "styles-server.css"           = "styles.css"
    "proposal-template-server.js" = "proposal-template.js"
    "index-server.html"           = "index.html"
}

# ── Helpers ──────────────────────────────────────────────────

function Log-Step([string]$msg) { Write-Host ""; Write-Host ">> $msg" -ForegroundColor Cyan }
function Log-Ok([string]$msg)   { Write-Host "   OK  $msg" -ForegroundColor Green }
function Log-Skip([string]$msg) { Write-Host "   --  $msg" -ForegroundColor DarkGray }
function Log-Warn([string]$msg) { Write-Host "   !!  $msg" -ForegroundColor Yellow }

function Get-GitHash {
    try { return (git -C $localRoot rev-parse --short HEAD 2>$null).Trim() }
    catch { return "" }
}

function Get-LastDeployHash {
    if (Test-Path $versionFile) { return (Get-Content $versionFile -Raw).Trim() }
    return ""
}

function Save-DeployHash([string]$hash) {
    Set-Content -Path $versionFile -Value $hash -Encoding utf8
}

function Get-ChangedFiles([string]$sinceHash) {
    try {
        $out = git -C $localRoot diff --name-only $sinceHash HEAD 2>$null
        if ($out) { return @($out) } else { return @() }
    } catch { return $null }
}

function Should-Exclude([string]$relPath) {
    $normalized = $relPath.Replace("\", "/")
    $name = Split-Path $relPath -Leaf

    # Excluir si cualquier segmento del path es un directorio excluido
    $parts = $normalized -split "/"
    foreach ($dir in $excludeDirs) {
        if ($parts -contains $dir) { return $true }
    }

    # Excluir por patron de nombre
    foreach ($pat in $excludePatterns) {
        if ($name -like $pat) { return $true }
    }

    return $false
}

function Update-CacheVersion([string]$hash) {
    $targets = @(
        (Join-Path $localRoot "index-server.html"),
        (Join-Path $localRoot "index.php"),
        (Join-Path $localRoot "propuesta\index.php"),
        (Join-Path $localRoot "promocion\index.php")
    )
    foreach ($f in $targets) {
        if (-not (Test-Path $f)) { continue }
        $content    = Get-Content $f -Raw -Encoding utf8
        $newContent = $content -replace '\?v=[a-zA-Z0-9]+', "?v=$hash"
        if ($newContent -ne $content) {
            Set-Content -Path $f -Value $newContent -Encoding utf8 -NoNewline
            $name = Split-Path $f -Leaf
            Log-Ok "?v=$hash en $name"
        }
    }
}

function Build-UploadList([string[]]$changedFiles) {
    $list = [System.Collections.Generic.List[hashtable]]::new()

    # Archivos renombrados (siempre en lista si cambiaron o -Force)
    foreach ($localName in $renameMap.Keys) {
        $localFull = Join-Path $localRoot $localName
        if (-not (Test-Path $localFull)) { continue }
        if (-not $Force -and $changedFiles -ne $null -and ($changedFiles -notcontains $localName)) { continue }
        $list.Add(@{ Local = $localFull; Remote = "$remoteRoot/$($renameMap[$localName])" })
    }

    # Resto de archivos del proyecto con la misma ruta relativa
    $allFiles = Get-ChildItem -Path $localRoot -Recurse -File
    foreach ($file in $allFiles) {
        $rel     = $file.FullName.Substring($localRoot.Length + 1).Replace("\", "/")
        $relName = Split-Path $rel -Leaf
        $depth   = ($rel -split "/").Count

        # Saltar archivos raiz que se sirven via renameMap
        if ($depth -eq 1 -and ($skipRootFiles -contains $relName)) { continue }

        # Saltar si esta en el mapa de renombrados (ya procesado)
        if ($renameMap.ContainsKey($relName) -and $depth -eq 1) { continue }

        # Saltar si coincide con exclusiones
        if (Should-Exclude $rel) { continue }

        # Saltar si no cambio (a menos que -Force)
        if (-not $Force -and $changedFiles -ne $null -and ($changedFiles -notcontains $rel)) { continue }

        $list.Add(@{ Local = $file.FullName; Remote = "$remoteRoot/$rel" })
    }

    return $list
}

# ── Main ─────────────────────────────────────────────────────

Write-Host ""
Write-Host "==========================================" -ForegroundColor DarkCyan
Write-Host "  Deploy > tupromocion.es" -ForegroundColor White
if ($DryRun) { Write-Host "  [DRY RUN - no se sube nada]" -ForegroundColor Yellow }
Write-Host "==========================================" -ForegroundColor DarkCyan

# 1. Versiones
Log-Step "Comprobando version git..."
$currentHash = Get-GitHash
$lastHash    = Get-LastDeployHash

if (-not $currentHash) {
    Log-Warn "Git no disponible - se usara modo Force."
    $Force = $true
} else {
    Log-Ok "Hash actual  : $currentHash"
    if ($lastHash) { Log-Ok "Ultimo deploy: $lastHash" }
    else           { Log-Warn "Primer deploy - se suben todos los archivos." ; $Force = $true }
}

# 2. Actualizar ?v= en los HTML
if ($currentHash -and -not $DryRun) {
    Log-Step "Actualizando version de cache..."
    Update-CacheVersion $currentHash
}

# 3. Calcular archivos cambiados
$changedFiles = $null
if (-not $Force -and $lastHash -and $currentHash -and $lastHash -ne $currentHash) {
    Log-Step "Calculando archivos cambiados desde $lastHash..."
    $changedFiles = Get-ChangedFiles $lastHash
    if ($changedFiles -ne $null -and $changedFiles.Count -gt 0) {
        Log-Ok "$($changedFiles.Count) archivo(s) modificado(s) en git"
    } else {
        Log-Warn "Sin cambios detectados en git."
        Write-Host ""
        Write-Host "  Nada que subir. El servidor ya esta al dia." -ForegroundColor Green
        exit 0
    }
} elseif ($Force) {
    Log-Warn "Modo Force activado."
}

# 4. Lista de archivos
Log-Step "Construyendo lista de subida..."
$uploads = Build-UploadList $changedFiles

if ($uploads.Count -eq 0) {
    Write-Host ""
    Write-Host "  Nada que subir." -ForegroundColor Green
    exit 0
}

Log-Ok "$($uploads.Count) archivo(s) en cola:"
foreach ($u in $uploads) {
    $rel = $u.Remote.Replace("$remoteRoot/", "")
    Log-Skip $rel
}

if ($DryRun) {
    Write-Host ""
    Write-Host "  DryRun: no se ha subido nada." -ForegroundColor Yellow
    exit 0
}

# 5. Conectar y subir
Log-Step "Conectando al servidor FTPS..."
Add-Type -Path $dllPath

$sessionOptions = New-Object WinSCP.SessionOptions -Property @{
    Protocol              = [WinSCP.Protocol]::Ftp
    FtpSecure             = [WinSCP.FtpSecure]::Explicit
    HostName              = $ftpHost
    PortNumber            = 21
    UserName              = $ftpUser
    Password              = $ftpPass
    GiveUpSecurityAndAcceptAnyTlsHostCertificate = $true
}

$session    = New-Object WinSCP.Session
$errorCount = 0

try {
    $session.Open($sessionOptions)
    Log-Ok "Conectado."

    $xo = New-Object WinSCP.TransferOptions
    $xo.TransferMode = [WinSCP.TransferMode]::Ascii

    Log-Step "Subiendo archivos..."
    foreach ($u in $uploads) {
        $rel = $u.Remote.Replace("$remoteRoot/", "")
        try {
            $r = $session.PutFiles($u.Local, $u.Remote, $false, $xo)
            $r.Check()
            Log-Ok $rel
        } catch {
            Log-Warn "ERROR en $rel - $_"
            $errorCount++
        }
    }
} finally {
    $session.Dispose()
}

# 6. Guardar hash
if ($errorCount -eq 0 -and $currentHash) {
    Save-DeployHash $currentHash
    Log-Ok "Hash guardado: $currentHash"
}

Write-Host ""
if ($errorCount -eq 0) {
    Write-Host "  Deploy completado: $($uploads.Count) archivo(s) subido(s)." -ForegroundColor Green
} else {
    Write-Host "  Deploy completado con $errorCount error(s)." -ForegroundColor Yellow
}
Write-Host ""
