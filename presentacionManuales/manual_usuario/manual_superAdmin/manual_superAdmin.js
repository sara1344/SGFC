/**
 * SGFC — Manual Super Admin
 */
document.addEventListener('DOMContentLoaded', () => {
  ManualCore.init({
    role: 'Super Admin',
    roleIcon: '🛡️',
    title: 'Manual del Super Admin',
    subtitle: 'Manual Super Admin',
    description: 'Administrador global del SGFC. Gestiona la estructura base del sistema, usuarios, contratos y configuración institucional.',
    accent: '#71277A',
    accentLight: '#FAF0FB',
    prefix: 'super',
    uploadUrl: 'upload.php',
    imagesPath: 'imagenes/',
    backUrl: '../index.html',
    sections: [
      {
        title: 'Inicio de sesión',
        description: 'Accede con tus credenciales institucionales y completa la verificación de seguridad reCAPTCHA.',
        steps: [
          'Abre la página de inicio del SGFC.',
          'Ingresa tu usuario y contraseña.',
          'Marca la casilla reCAPTCHA en Verificación de seguridad.',
          'Haz clic en Ingresar al sistema.',
          'El sistema te redirige al panel principal.'
        ],
        image: 'super-01-login.png'
      },
      {
        title: 'Panel principal',
        description: 'Pantalla de inicio con vista global del sistema.',
        steps: [
          'Al ingresar, se abre el Panel Super Administrador.',
          'A la izquierda: actividad reciente (filtros por fecha, acción y nombre).',
          'A la derecha: avance de evidencias por regional (clic para ver centros).',
          'Usa el menú lateral para ir a los demás módulos.'
        ],
        image: 'super-02-panel-principal.png'
      },
      {
        title: 'Gestión de usuarios',
        description: 'Consulta y administra todas las personas registradas en el sistema.',
        steps: [
          'Ingresa al menú Usuarios.',
          'Filtra por rol, centro o estado.',
          'Busca por nombre o documento.',
          'Selecciona un usuario para ver su detalle.'
        ],
        image: 'super-03-usuarios.png'
      },
      {
        title: 'Creación de usuarios',
        description: 'Permite registrar una nueva persona en el sistema y asignarle un rol.',
        steps: [
          'Ingresa al menú Usuarios.',
          'Haz clic en Crear usuario.',
          'Diligencia los datos básicos.',
          'Selecciona el rol correspondiente.',
          'Guarda los cambios.'
        ],
        image: 'super-04-crear-usuario.png'
      },
      {
        title: 'Asignación de roles',
        description: 'Define el perfil de acceso de cada usuario: Super Admin, Administrativo o Contratista.',
        steps: [
          'Abre el formulario de edición del usuario.',
          'Selecciona el rol en el campo correspondiente.',
          'Asigna el centro si aplica.',
          'Confirma y guarda la actualización.'
        ],
        image: 'super-05-roles.png'
      },
      {
        title: 'Gestión de contratos',
        description: 'Consulta y administra todos los contratos registrados en la plataforma.',
        steps: [
          'Accede al módulo Contratos.',
          'Busca por Nº contrato, contratista, correo, objeto o tipo…',
          'Filtra por estado: Activo, Finalizado o Suspendido.',
          'Desde el listado puedes editar o eliminar un contrato.'
        ],
        image: 'super-06-contratos.png'
      },
      {
        title: 'Creación de contratos',
        description: 'Registra un nuevo contrato y genera automáticamente sus periodos de entrega.',
        steps: [
          'Haz clic en Nuevo contrato.',
          'Selecciona contratista y centro.',
          'Define fechas, valor y cantidad de periodos.',
          'Revisa el resumen y confirma la creación.'
        ],
        image: 'super-07-crear-contrato.png'
      },
      {
        title: 'Gestión de evidencias',
        description: 'Administra el catálogo de tipos de evidencias disponibles en el sistema.',
        steps: [
          'Ingresa al módulo Evidencias.',
          'Consulta el catálogo global.',
          'Crea o edita tipos de evidencia.',
          'Define formatos y requisitos de cada una.'
        ],
        image: 'super-09-evidencias.png'
      },
      {
        title: 'Configuración general',
        description: 'Ajusta parámetros globales del sistema: seguridad, notificaciones y auditoría.',
        steps: [
          'Ingresa a Configuración.',
          'Revisa cada sección de parámetros.',
          'Modifica solo lo necesario.',
          'Guarda y verifica los cambios aplicados.'
        ],
        image: 'super-13-config.png'
      },
      {
        title: 'Cierre de sesión',
        description: 'Cierra tu sesión desde la barra superior del sistema.',
        steps: [
          'En la esquina superior derecha, haz clic en Cerrar sesión.',
          'El sistema te redirige de inmediato a la pantalla de login.'
        ],
        image: 'super-10-logout.png'
      }
    ]
  });
});
