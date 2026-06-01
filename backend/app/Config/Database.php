<?php
namespace App\Config;

use PDO;
use PDOException;

/**
 * Conexión PDO segura a MySQL/MariaDB.
 *
 *  - Singleton: única instancia por request.
 *  - utf8mb4 + emulación desactivada + ERRMODE_EXCEPTION.
 *  - Errores técnicos NO se envían al cliente (se loguean).
 */
final class Database
{
    private static ?PDO $pdo = null;

    public static function connection(): PDO
    {
        if (self::$pdo instanceof PDO) {
            return self::$pdo;
        }

        $host = Env::get('DB_HOST', 'localhost');
        $port = Env::get('DB_PORT', '3306');
        $db   = Env::get('DB_DATABASE', 'sgfc');
        $user = Env::get('DB_USERNAME', 'root');
        $pass = Env::get('DB_PASSWORD', '');
        $char = Env::get('DB_CHARSET', 'utf8mb4');

        $dsn = "mysql:host={$host};port={$port};dbname={$db};charset={$char}";

        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
            PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES {$char} COLLATE {$char}_general_ci",
        ];

        try {
            self::$pdo = new PDO($dsn, $user, $pass, $options);
        } catch (PDOException $e) {
            App::logError('DB_CONNECTION_FAILED', $e->getMessage());
            http_response_code(500);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode([
                'success' => false,
                'message' => 'No fue posible conectar con la base de datos.',
            ]);
            exit;
        }

        return self::$pdo;
    }
}
