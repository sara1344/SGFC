/**
 * SGFC — Manual Contratista
 */
document.addEventListener('DOMContentLoaded', () => {
  ManualCore.init({
    role: 'Contratista',
    roleIcon: '📄',
    title: 'Manual del Contratista',
    subtitle: 'Manual Contratista',
    description: 'Guía para cargar evidencias, consultar estados, corregir observaciones y gestionar documentos firmados.',
    accent: '#39A900',
    accentLight: '#F0FDF4',
    prefix: 'cont',
    uploadUrl: 'upload.php',
    imagesPath: 'imagenes/',
    backUrl: '../index.html',
    sections: [
      {
        title: 'Inicio de sesión',
        description: 'Ingresa con las credenciales del centro y completa la verificación reCAPTCHA.',
        steps: [
          'Abre la URL del sistema SGFC.',
          'Escribe tu usuario y contraseña.',
          'Marca la casilla reCAPTCHA en Verificación de seguridad.',
          'Haz clic en Ingresar al sistema.',
          'Accede a tu vista principal de contratista.'
        ],
        image: 'cont-01-login.png'
      },
      {
        title: 'Vista principal',
        description: 'Panel de inicio con resumen de tu contrato, periodo activo y evidencias pendientes.',
        steps: [
          'Revisa el estado general de tu contrato.',
          'Consulta alertas o tareas pendientes.',
          'Consulta las evidencias asignadas al periodo actual en el listado.',
          'Usa el menú lateral para navegar.',
          'Verifica la fecha límite del periodo actual.'
        ],
        image: 'cont-02-vista.png'
      },
      {
        title: 'Carga de evidencias',
        description: 'Sube los documentos requeridos para cada evidencia del periodo.',
        steps: [
          'Selecciona la evidencia a cargar.',
          'Haz clic en Subir archivo.',
          'Elige el documento desde tu equipo.',
          'Confirma la carga y espera la validación.'
        ],
        image: 'cont-06-carga.png'
      },
      {
        title: 'Corrección de evidencias rechazadas',
        description: 'Corrige y vuelve a cargar los documentos que fueron devueltos.',
        steps: [
          'Localiza evidencias con estado Rechazado.',
          'Lee el comentario del administrativo.',
          'Ajusta el documento según la observación.',
          'Vuelve a subir el archivo corregido.'
        ],
        image: 'cont-09-correccion.png'
      },
      {
        title: 'Generación o envío del PDF unificado',
        description: 'Unifica las evidencias aprobadas en un solo documento para firma.',
        steps: [
          'Verifica que todas las evidencias estén aprobadas.',
          'Haz clic en Generar PDF unificado.',
          'Revisa la vista previa del documento.',
          'Envía el PDF para el proceso de firma.'
        ],
        image: 'cont-11-pdf-unificado.png'
      },
      {
        title: 'PDFs firmados',
        description: 'Consulta y descarga el PDF unificado firmado del periodo.',
        steps: [
          'Ingresa al menú PDFs Firmados.',
          'Haz clic en Ver.',
          'Descarga el PDF.'
        ],
        image: 'cont-12-pdf-firmado.png'
      },
      {
        title: 'Cierre de sesión',
        description: 'Cierra tu sesión desde la barra superior del sistema.',
        steps: [
          'En la esquina superior derecha, haz clic en Cerrar sesión.',
          'El sistema te redirige de inmediato a la pantalla de login.'
        ],
        image: 'cont-15-logout.png'
      }
    ]
  });
});
