<?php
// app/Controllers/LoginController.php
require_once '../Config/bbdd.php';

$user_input = $_POST['user'];
$pass_input = $_POST['password'];

$conexion = conectarDB($user_input, $pass_input);

if ($conexion) {
    session_start();
    $_SESSION['user'] = $user_input;
    $_SESSION['password'] = $pass_input;
    header("Location: ../../views/dashboard.php");
} else {
    echo "Usuario o contraseña de base de datos incorrectos.";
}
