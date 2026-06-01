<?php
/**
 * Autoloader PSR-4 simple para SGFC (sin Composer).
 *
 *  - App\Controllers\X → app/Controllers/X.php
 *  - App\Models\X      → app/Models/X.php
 *  - etc.
 *
 * Adicionalmente carga el autoloader de FPDI y FPDF si están en vendor/.
 */

spl_autoload_register(function ($class) {
    $prefix   = 'App\\';
    $baseDir  = dirname(__DIR__) . DIRECTORY_SEPARATOR;
    $len      = strlen($prefix);
    if (strncmp($prefix, $class, $len) !== 0) {
        return;
    }
    $relative = substr($class, $len);
    $file = $baseDir . str_replace('\\', DIRECTORY_SEPARATOR, $relative) . '.php';
    if (is_file($file)) {
        require_once $file;
    }
});

// FPDF debe cargarse ANTES que cualquier clase FPDI (Fpdi extiende FPDF).
$fpdfPath = dirname(__DIR__, 2) . '/vendor/setasign/fpdf/fpdf.php';
if (is_file($fpdfPath)) {
    require_once $fpdfPath;
}

// FPDI autoloader (vendor/setasign/fpdi/src/autoload.php)
$fpdiAutoload = dirname(__DIR__, 2) . '/vendor/setasign/fpdi/src/autoload.php';
if (is_file($fpdiAutoload)) {
    require_once $fpdiAutoload;
}
