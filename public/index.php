<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login Profesional</title>
    <link rel="stylesheet" href="css/style.css">
</head>

<body>
    <div class="logo-container">
    <img src="assets/images/logoSena.png" alt="Logo" class="login-logo">
    </div>
    <div class="login-container">
        <form action="../app/Controllers/LoginController.php" method="POST">
            <div class="input-transparente">
                <h2>Bienvenido al sistema de gestión financiera y contractual</h2>
            </div>
            <div class="input-group">
                <label for="email">Usuario</label>
                <input type="text" id="user" name="user" required>
            </div>
            <div class="input-group">
                <label for="password">Contraseña</label>
                <input type="password" id="password" name="password" required>
            </div>
            <a href="#" class="forgot-password">¿Olvidaste tu contraseña?</a>
            <div class="input-submit">
                <button type="submit" class="btn-login">Continuar</button>
            </div>
        </form>
    </div>
</body>

</html>