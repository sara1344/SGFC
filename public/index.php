<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Portal de Gestión Financiera y Contractual</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            color: #333;
        }
        
        h1 {
            color: #2c3e50;
            text-align: center;
            margin-bottom: 30px;
        }
        
        .login-section, .continue-section, .download-section {
            margin-bottom: 30px;
            padding: 20px;
            border: 1px solid #ddd;
            border-radius: 5px;
            background-color: #f9f9f9;
        }
        
        .form-group {
            margin-bottom: 15px;
        }
        
        label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
        }
        
        input[type="text"], input[type="password"] {
            width: 100%;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            box-sizing: border-box;
        }
        
        .forgot-password {
            text-align: right;
            margin-top: -10px;
            margin-bottom: 15px;
        }
        
        .forgot-password a {
            color: #3498db;
            text-decoration: none;
            font-size: 0.9em;
        }
        
        .btn {
            background-color: #3498db;
            color: white;
            border: none;
            padding: 10px 15px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 1em;
        }
        
        .btn:hover {
            background-color: #2980b9;
        }
        
        .download-options {
            display: flex;
            gap: 15px;
            margin-top: 15px;
        }
        
        .download-option {
            padding: 10px 15px;
            background-color: #2ecc71;
            color: white;
            border-radius: 4px;
            text-decoration: none;
        }
        
        .download-option:hover {
            background-color: #27ae60;
        }
    </style>
</head>
<body>
    <h1>Bienvenidos al portal de gestión financiera y contractual</h1>
    
    <div class="login-section">
        <h2>Usuario</h2>
        <div class="form-group">
            <label for="username">Usuario</label>
            <input type="text" id="username" name="username">
        </div>
        <div class="form-group">
            <label for="password">Contraseña</label>
            <input type="password" id="password" name="password">
        </div>
        <div class="forgot-password">
            <a href="#">¿Olvidaste tu contraseña?</a>
        </div>
        <a href="roles.html" class="btn">Iniciar sesión</a>
    </div>
    
   
    
    <div class="download-section">
        <h2>Descargar aplicación</h2>
        <div class="download-options">
            <a href="#" class="download-option">Windows</a>
            <a href="#" class="download-option">Android</a>
        </div>
    </div>
</body>
</html>