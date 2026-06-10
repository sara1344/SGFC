<?php
/**
 * Subida de imágenes — Manual Contratista
 * Guarda archivos en manual_contratista/imagenes/
 */

header('Content-Type: application/json; charset=utf-8');

$imagesDir = __DIR__ . '/imagenes';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Método no permitido.']);
    exit;
}

if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'No se recibió ninguna imagen válida.']);
    exit;
}

$filename = basename($_POST['filename'] ?? '');
if ($filename === '' || !preg_match('/^[a-z0-9\-_]+\.(png|jpe?g|webp)$/i', $filename)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Nombre de archivo no válido.']);
    exit;
}

$tmp  = $_FILES['image']['tmp_name'];
$mime = mime_content_type($tmp);
$allowed = ['image/png', 'image/jpeg', 'image/webp'];

if (!in_array($mime, $allowed, true)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Tipo de imagen no permitido.']);
    exit;
}

if (!is_dir($imagesDir) && !mkdir($imagesDir, 0755, true)) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'No se pudo crear la carpeta de imágenes.']);
    exit;
}

$dest = $imagesDir . '/' . $filename;

if (!move_uploaded_file($tmp, $dest)) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'No se pudo guardar la imagen.']);
    exit;
}

echo json_encode(['ok' => true, 'filename' => $filename, 'path' => 'imagenes/' . $filename]);
