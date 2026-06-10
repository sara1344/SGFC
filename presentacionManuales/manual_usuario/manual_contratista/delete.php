<?php
/**
 * Eliminación de imágenes — Manual Contratista
 */

header('Content-Type: application/json; charset=utf-8');

$imagesDir = __DIR__ . '/imagenes';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Método no permitido.']);
    exit;
}

$filename = basename($_POST['filename'] ?? '');
if ($filename === '' || !preg_match('/^[a-z0-9\-_]+\.(png|jpe?g|webp)$/i', $filename)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Nombre de archivo no válido.']);
    exit;
}

$path = $imagesDir . '/' . $filename;

if (!file_exists($path)) {
    echo json_encode(['ok' => true, 'filename' => $filename, 'removed' => false]);
    exit;
}

if (!unlink($path)) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'No se pudo eliminar la imagen.']);
    exit;
}

echo json_encode(['ok' => true, 'filename' => $filename, 'removed' => true]);
