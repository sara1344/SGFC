/**
 * SGFC — Manual Administrativo Centro
 */
document.addEventListener('DOMContentLoaded', () => {
  ManualCore.init({
    role: 'Administrativo Centro',
    roleIcon: '🏢',
    title: 'Manual del Administrativo de Centro',
    subtitle: 'Manual Administrativo Centro',
    description: 'Guía para gestionar periodos, revisar evidencias, aprobar documentos y realizar seguimiento contractual en tu centro.',
    accent: '#00304D',
    accentLight: '#EFF6FF',
    prefix: 'admin',
    uploadUrl: 'upload.php',
    imagesPath: 'imagenes/',
    backUrl: '../index.html',
    sections: [
      {
        title: 'Inicio de sesión',
        description: 'Accede al SGFC con tu usuario de centro y completa la verificación reCAPTCHA.',
        steps: [
          'Ingresa a la página de login del SGFC.',
          'Escribe usuario y contraseña.',
          'Marca la casilla reCAPTCHA en Verificación de seguridad.',
          'Haz clic en Ingresar al sistema.',
          'Serás dirigido al dashboard de seguimiento.'
        ],
        image: 'admin-01-login.png'
      },
      {
        title: 'Dashboard de seguimiento',
        description: 'Vista central con indicadores de contratos, evidencias y tareas del centro.',
        steps: [
          'Revisa las tarjetas de resumen del centro.',
          'Consulta evidencias pendientes de revisión.',
          'Usa accesos rápidos del panel.'
        ],
        image: 'admin-02-dashboard.png'
      },
      {
        title: 'Gestión de usuarios',
        description: 'Administra contratistas y administrativos de tu centro: buscar, filtrar, crear y editar.',
        steps: [
          'Ingresa al menú Usuarios.',
          'Busca por nombre, usuario, cédula, correo, regional o centro…',
          'Filtra por rol con el selector Todos los roles.',
          'Crea un usuario con + Nuevo usuario.',
          'Modifica un registro con el botón Editar en la tabla.'
        ],
        image: 'admin-03-usuarios.png'
      },
      {
        title: 'Tipos de evidencias',
        description: 'Consulta y configura el catálogo de evidencias del centro: Módulo → Subgrupo → Evidencias.',
        steps: [
          'Ingresa al menú Tipos de Evidencias.',
          'Busca por nombre, código, descripción o subgrupo…',
          'Filtra por módulo, formato, obligatoria y firma.',
          'Crea una evidencia con + Nueva Evidencia.',
          'Revisa la tabla con todas las evidencias y usa Editar para modificar.'
        ],
        image: 'admin-04-tipos-evidencias.png'
      },
      {
        title: 'Contratos y periodos',
        description: 'Gestiona los contratos de tu centro y accede a los periodos de cada contratista.',
        steps: [
          'Ingresa al menú Contratos y Periodos.',
          'Busca por Nº contrato, contratista, correo, objeto o tipo…',
          'Filtra por estado: Activo, Finalizado o Suspendido.',
          'Crea un contrato con + Nuevo contrato.',
          'Haz clic en Ver periodos para consultar los periodos del contratista.'
        ],
        image: 'admin-05-contratos-periodos.png'
      },
      {
        title: 'Crear nuevo contrato',
        description: 'Registra un contrato para un contratista activo de tu centro.',
        steps: [
          'Haz clic en + Nuevo contrato.',
          'Selecciona el contratista activo.',
          'Define la fecha inicio y la fecha fin.',
          'Elige el tipo de contrato (normalmente Prestación de Servicios).',
          'Escribe el objeto o área de aplicación.',
          'Haz clic en Crear contrato.'
        ],
        image: 'admin-06-nuevo-contrato.png'
      },
      {
        title: 'Ver periodos del contratista',
        description: 'Consulta los periodos mensuales generados para un contrato.',
        steps: [
          'En la tabla, haz clic en Ver periodos del contrato.',
          'Revisa el resumen: contrato, contratista, vigencia y estado.',
          'Consulta las tarjetas de cada periodo (activo o bloqueado).',
          'Verifica la fecha límite y el avance de cada mes.'
        ],
        image: 'admin-07-ver-periodos.png'
      },
      {
        title: 'Visualización de archivos cargados',
        description: 'Abre y revisa el contenido de cada archivo entregado.',
        steps: [
          'Haz clic en la evidencia a revisar.',
          'Usa el visor integrado del sistema.',
          'Descarga el archivo si necesitas revisarlo offline.',
          'Registra hallazgos antes de decidir.'
        ],
        image: 'admin-08-visualizar.png'
      },
      {
        title: 'Aprobación de evidencias',
        description: 'Confirma que un documento cumple con los requisitos establecidos.',
        steps: [
          'Abre la evidencia revisada.',
          'Verifica formato, contenido y vigencia.',
          'Haz clic en Aprobar.',
          'El contratista verá el cambio de estado.'
        ],
        image: 'admin-09-aprobar.png'
      },
      {
        title: 'Rechazo de evidencias con comentario',
        description: 'Devuelve un documento indicando las correcciones necesarias.',
        steps: [
          'Abre la evidencia con inconsistencias.',
          'Haz clic en Rechazar.',
          'Escribe un comentario claro y específico.',
          'Confirma el rechazo para notificar al contratista.'
        ],
        image: 'admin-10-rechazar.png'
      },
      {
        title: 'Firma de documentos',
        description: 'Revisa y firma los PDF unificados (GF) pendientes de los contratistas de tu centro.',
        steps: [
          'Ingresa al menú Firmas.',
          'Consulta las pestañas Pendientes GF, Firmados GF y Paquetes GC.',
          'Revisa el PDF pendiente: contratista, contrato, periodo y fecha de generación.',
          'Haz clic en Ver PDF para revisar el documento antes de firmar.',
          'Haz clic en Firmar para aplicar tu firma institucional.'
        ],
        image: 'admin-11-firmas.png'
      },
      {
        title: 'Centro de notificaciones',
        description: 'Consulta alertas agrupadas por contratista sobre cargas, correcciones y firmas.',
        steps: [
          'Ingresa al menú Notificaciones.',
          'Revisa el contador de alertas sin leer.',
          'Filtra por tipo: Todas, No leídas, Actualización contratista, Evidencia cargada, etc.',
          'Abre el detalle con Ver actualizaciones.',
          'Marca como leídas con Marcar todas leídas cuando hayas gestionado las alertas.'
        ],
        image: 'admin-12-notificaciones.png'
      },
      {
        title: 'Cierre de sesión',
        description: 'Cierra tu sesión desde la barra superior del sistema.',
        steps: [
          'En la esquina superior derecha, haz clic en Cerrar sesión.',
          'El sistema te redirige de inmediato a la pantalla de login.'
        ],
        image: 'admin-15-logout.png'
      }
    ]
  });
});
