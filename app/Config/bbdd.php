<?php
// app/Config/bbdd.php

function conectarDB($usuario_form, $password_form)
{
    $host = 'localhost';
    $db   = 'SGFC';
    $charset = 'utf8mb4';

    $dsn = "mysql:host=$host;dbname=$db;charset=$charset";

    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];

    try {
        // Intentamos conectar con los datos que el usuario puso en el Login
        $pdo = new PDO($dsn, $usuario_form, $password_form, $options);
        return $pdo;
    } catch (\PDOException $e) {
        // Si las credenciales de MySQL son incorrectas, fallará aquí
        return null;
    }
}
