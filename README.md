# SGFC — Sistema Gestión Financiera y Contractual (SENA)

Plataforma web institucional para gestionar la recepción, validación, unificación y firma documental de evidencias contractuales de contratistas del SENA.

## 1. Stack

| Capa            | Tecnología                                            |
| --------------- | ----------------------------------------------------- |
| Frontend        | HTML5, CSS3, JavaScript modular (ES Modules)          |
| Backend         | PHP 8+ con arquitectura MVC y PDO (MySQL)             |
| Base de datos   | MySQL 8 / MariaDB 10+                                 |
| PDF             | FPDF + FPDI (incluidas manualmente en `backend/vendor`) |
| Autenticación   | Sesiones PHP con cookies HttpOnly y bcrypt            |
| Servidor local  | XAMPP / WAMP (Apache 2.4)                             |

## 2. Estructura del proyecto

```
/sgfc
├── frontend/
│   ├── css/            (variables.css, styles.css, responsive.css)
│   ├── js/
│   │   ├── api.js, auth.js, components.js, app.js, router.js, utils.js
│   │   └── views/      (16 módulos, uno por vista)
│   ├── views/          (17 HTML, login + 16 vistas funcionales)
│   ├── assets/         (img, icons, fonts)
│   └── index.html      (redirige a login)
└── backend/
    ├── app/
    │   ├── Config/         (Env, Database, App)
    │   ├── Controllers/    (Auth, User, Contract, Period, Evidence, Upload, Review, Pdf, Notification, Dashboard, SuperAdmin)
    │   ├── Helpers/        (Autoloader)
    │   ├── Middlewares/    (Cors, Auth, Role, Rls)
    │   ├── Models/         (User, Role, Contract, Period, Evidence, EvidenceAssignment, EvidenceUpload, Review, Notification, Signature, UnifiedPdf, AuditLog, Module, Subgroup)
    │   └── Services/       (Auth, FileUpload, PdfMerge, Notification, Permission, Audit)
    ├── database/
    │   ├── sgfc.sql        (base original)
    │   └── migrations/     (001_sgfc_extended_schema.sql, 002_seed_data.sql)
    ├── public/             (index.php, .htaccess — front controller)
    ├── routes/             (api.php — router REST minimalista)
    ├── storage/            (evidencias, pdf_unificados, pdf_firmados, temp, logs)
    ├── vendor/setasign/    (fpdf, fpdi — manuales, sin Composer)
    ├── .env, .env.example
    └── composer.json       (solo para PSR-4, no obligatorio)
```

## 3. Requisitos

* XAMPP / WAMP con Apache 2.4 + PHP 8.1+ + MySQL 8 (o MariaDB 10.4+).
* Módulo `mod_rewrite` de Apache habilitado.
* Extensiones PHP: `pdo_mysql`, `mbstring`, `fileinfo`, `gd` (opcional, para QR).
* Puerto 80 y 3306 libres.

## 4. Instalación paso a paso

### 4.1 Clonar el proyecto

Copia toda la carpeta `SGFC` en `C:\xampp\htdocs\SGFC` (Windows) o `/opt/lampp/htdocs/SGFC` (Linux).

### 4.2 Crear la base de datos

Desde phpMyAdmin o consola:

```sql
CREATE DATABASE sgfc DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 4.3 Importar esquema y datos

Ejecutar **en este orden** desde phpMyAdmin o `mysql`:

```bash
mysql -u root sgfc < backend/database/sgfc.sql
mysql -u root sgfc < backend/database/migrations/001_sgfc_extended_schema.sql
mysql -u root sgfc < backend/database/migrations/002_seed_data.sql
```

> El paso 3 también **re-hashea las contraseñas existentes** con bcrypt e inserta los 3 usuarios demo.

### 4.4 Configurar `.env`

Copia el archivo de ejemplo y ajusta según tu servidor:

```bash
copy backend\.env.example backend\.env
```

Edita `backend/.env`:

```
APP_URL=http://localhost/SGFC
FRONTEND_URL=http://localhost/SGFC/frontend
DB_DATABASE=sgfc
DB_USERNAME=root
DB_PASSWORD=
CORS_ALLOWED_ORIGIN=http://localhost/SGFC/frontend
```

### 4.5 Permisos de carpetas (Linux/Mac)

```bash
chmod -R 775 backend/storage
chown -R www-data:www-data backend/storage
```

En Windows con XAMPP, normalmente no es necesario.

### 4.6 Acceder

* Frontend: `http://localhost/SGFC/frontend/`
* API:      `http://localhost/SGFC/backend/public/api/ping`

## 5. Usuarios demo

| Rol             | Usuario / Correo                | Contraseña     |
| --------------- | ------------------------------- | -------------- |
| Super Admin     | `plsuper`  / `super@sena.edu.co`        | `super123`     |
| Administrativo  | `cjadmin`  / `admin@sena.edu.co`        | `admin123`     |
| Contratista     | `ybcontratista` / `contratista@sena.edu.co` | `contratista123` |

> Los usuarios originales del dump (`saramol`, `andicasanchez`, `nicolm`) conservan sus contraseñas: `sara123`, `andica123`, `nicol123`.

## 6. Roles y permisos (RLS lógico)

| Acción                                | Contratista | Administrativo | Super Admin |
| ------------------------------------- | :---------: | :------------: | :---------: |
| Ver sus propios contratos             |      ✓      |       ✓        |      ✓      |
| Ver contratos de terceros             |             |       ✓        |      ✓      |
| Crear / editar / eliminar contratos   |             |                |      ✓      |
| Subir evidencias                      |      ✓      |                |             |
| Revisar / aprobar / rechazar evidencias|            |       ✓        |      ✓      |
| Firmar PDFs unificados (1ª firma)     |             |       ✓        |      ✓      |
| Firmar PDFs unificados (2ª firma)     |      ✓      |                |             |
| Configurar evidencias master          |             |       ✓        |      ✓      |
| Ver auditoría                         |             |                |      ✓      |

## 7. Flujo funcional

1. **Super Admin** crea contratos a contratistas (con periodos auto-generados).
2. **Administrativo** configura cada periodo: define fecha límite y asigna evidencias requeridas.
3. **Contratista** sube los PDF de las evidencias asignadas a su periodo activo.
4. **Administrativo** recibe notificación y revisa cada PDF embebido: aprueba o rechaza con comentario.
5. Cuando **todas las evidencias del periodo están aprobadas**, el contratista habilita el botón **"Unificar evidencias en PDF"**.
6. El sistema fusiona los PDFs con FPDI en el orden definido, los guarda en `storage/pdf_unificados/` y notifica al administrativo.
7. El **administrativo firma** visualmente el PDF (sello con datos y fecha).
8. El **contratista firma** el PDF en su vista de Firmados.
9. El PDF final se almacena en `storage/pdf_firmados/` y queda disponible para descarga.

## 8. Endpoints REST (resumen)

Base: `http://localhost/SGFC/backend/public/api`

| Método | Ruta                              | Descripción                          |
| ------ | --------------------------------- | ------------------------------------ |
| POST   | `/auth/login`                     | Iniciar sesión (usuario o correo)    |
| POST   | `/auth/logout`                    | Cerrar sesión                        |
| GET    | `/auth/me`                        | Datos del usuario en sesión          |
| GET    | `/users`, `POST`, `PUT`, `DELETE` | CRUD usuarios                        |
| GET    | `/contracts` …                    | CRUD contratos (Super Admin)         |
| GET    | `/periods?contrato=ID`            | Periodos de un contrato              |
| POST   | `/periods/{id}/assign`            | Asignar evidencias a un periodo      |
| GET    | `/evidences/tree`                 | Árbol Módulo→Subgrupo→Evidencia      |
| POST   | `/uploads/evidence`               | Subir PDF (multipart)                |
| GET    | `/uploads/evidence/{id}/view`     | Visor inline del PDF                 |
| POST   | `/reviews/{id}/approve` / `/reject` | Acción de revisión                |
| POST   | `/pdf/merge`                      | Unificar evidencias del periodo      |
| POST   | `/pdf/admin-sign` / `/contractor-sign` | Firmas                          |
| GET    | `/pdf/final/{id}/download`        | Descargar PDF final                  |
| GET    | `/dashboard/admin` / `/contractor` / `/superadmin` | KPIs y checklist |
| GET    | `/dashboard/export`               | Exportar CSV del dashboard           |
| GET    | `/notifications`                  | Listado del usuario                  |
| PUT    | `/notifications/read-all`         | Marcar todas como leídas             |

## 9. Seguridad implementada

* PDO + prepared statements en todos los modelos.
* `password_hash` (bcrypt) + `password_verify` + `password_needs_rehash`.
* Sesiones PHP con cookies `HttpOnly`, `SameSite=Lax`, expiración configurable.
* CORS restringido al `FRONTEND_URL` definido en `.env`.
* Validación de archivos por extensión, MIME type, magic bytes y tamaño máximo.
* Headers de seguridad: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`.
* RLS lógico vía `RlsMiddleware` y `PermissionService`.
* Auditoría de acciones críticas en tabla `audit_logs`.
* Errores técnicos solo en logs (`backend/storage/logs/`), nunca al cliente.

## 10. Adaptación del unificador de PDF (UnirPDF)

El script Python original (`UnirPDF-main`) usaba `PyPDF2` para fusionar todos los PDF de una carpeta y los exportaba como un solo archivo, ordenados por nombre.

En SGFC esta lógica se trasladó a PHP en `App\Services\PdfMergeService::mergeForPeriod()`:

1. Valida que el periodo pertenezca al contratista autenticado.
2. Recupera **todas** las evidencias aprobadas del periodo, ordenadas por módulo → subgrupo → orden.
3. Verifica que ninguna esté pendiente, rechazada o sin cargar (regla obligatoria).
4. Itera y agrega cada PDF página por página usando **FPDF + FPDI** (`importPage` / `useTemplate`).
5. Guarda el archivo final en `storage/pdf_unificados/` con nombre seguro.
6. Inserta registro en `pdfs_unificados` con estado `Enviado a administrativo` y crea notificación.

## 11. Solución de problemas

* **`Endpoint no encontrado`**: revisa que `mod_rewrite` esté activo y que `backend/public/.htaccess` se respete.
* **`SQLSTATE…`**: verifica credenciales en `.env`, base de datos creada y migraciones ejecutadas.
* **`Acceso CORS bloqueado`**: ajusta `CORS_ALLOWED_ORIGIN` y `FRONTEND_URL` en `.env`.
* **PDFs no se unifican**: confirma que `backend/vendor/setasign/fpdf/` y `backend/vendor/setasign/fpdi/src/` existan.

## 12. Próximos pasos (opcionales)

* Firma digital real con certificado (Open SSL + TCPDF/SetaPDF).
* reCAPTCHA v2 en login: configurar `RECAPTCHA_SITE_KEY` y `RECAPTCHA_SECRET_KEY` en `backend/.env` (consola Google). Sin secret configurado, el login no exige captcha (solo desarrollo).
* Notificaciones por correo (SMTP/PHPMailer).
* Exportación a XLSX nativo (PhpSpreadsheet).
* Tests unitarios (PHPUnit) y de frontend (Playwright).

---

© SENA — Sistema Gestión Financiera y Contractual (SGFC).
