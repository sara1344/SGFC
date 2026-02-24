$(document).ready(function() {
    console.log('🚀 Iniciando presentación de investigación');
    
    // ===== VARIABLES GLOBALES =====
    let integrantes = [];
    let cumpleHoy = [];
    let proximos = [];
    
    // ===== ELEMENTOS DEL DOM =====
    const $navBtns = $('.nav-btn');
    const $sections = $('.section');
    
    // ===== NAVEGACIÓN ENTRE SECCIONES =====
    $navBtns.click(function() {
        // Remover active de todos
        $navBtns.removeClass('active');
        $sections.removeClass('active');
        
        // Agregar active al actual
        $(this).addClass('active');
        const sectionId = 'section-' + $(this).data('section');
        $('#' + sectionId).addClass('active');
        
        // Scroll suave al inicio
        $('html, body').animate({
            scrollTop: 300
        }, 500);
        
        // Actualizar URL hash (opcional)
        window.location.hash = $(this).data('section');
    });
    
    // ===== ACTIVAR SECCIÓN POR HASH =====
    function activarSeccionPorHash() {
        const hash = window.location.hash.substring(1);
        if (hash) {
            const $btn = $(`.nav-btn[data-section="${hash}"]`);
            if ($btn.length) {
                $btn.click();
            }
        }
    }
    
    // Llamar al cargar la página
    activarSeccionPorHash();
    
    // ===== EFECTOS DE SCROLL =====
    $(window).scroll(function() {
        const scrollPos = $(this).scrollTop();
        
        // Mostrar/ocultar nav-container al hacer scroll
        if (scrollPos > 200) {
            $('.nav-container').css({
                'top': '10px',
                'transition': 'all 0.3s ease'
            });
        } else {
            $('.nav-container').css({
                'top': '20px'
            });
        }
    });
    
    // ===== CARGAR DATOS DEL JSON (ejemplo) =====
    function cargarDatosEjemplo() {
        // Simular datos para la presentación
        integrantes = [
            { id: 1, nombre: "Leonardo Aguirre", fecha_nacimiento: "25/10", foto: "https://api.dicebear.com/7.x/avataaars/svg?seed=Leonardo" },
            { id: 2, nombre: "Felipe Suarez", fecha_nacimiento: "30/10", foto: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felipe" },
            { id: 3, nombre: "Julian Bentacur", fecha_nacimiento: "19/06", foto: "https://api.dicebear.com/7.x/avataaars/svg?seed=Julian" },
            { id: 4, nombre: "Juanes Cano", fecha_nacimiento: "26/03", foto: "https://api.dicebear.com/7.x/avataaars/svg?seed=Juanes" },
            { id: 5, nombre: "Luisa Vallejo", fecha_nacimiento: "20/08", foto: "https://api.dicebear.com/7.x/avataaars/svg?seed=Luisa" }
        ];
        
        procesarCumpleaneros();
    }
    
    // ===== FUNCIONES DE FECHAS =====
    function convertirFecha(fechaStr) {
        if (!fechaStr || fechaStr === '') return null;
        
        const partes = fechaStr.split('/');
        if (partes.length !== 2) return null;
        
        return {
            dia: parseInt(partes[0]),
            mes: parseInt(partes[1]) - 1
        };
    }
    
    function esCumpleHoy(fechaStr) {
        if (!fechaStr || fechaStr === '') return false;
        
        const hoy = new Date();
        const fecha = convertirFecha(fechaStr);
        
        if (!fecha) return false;
        
        return hoy.getDate() === fecha.dia && hoy.getMonth() === fecha.mes;
    }
    
    function obtenerDiasHastaCumple(fechaStr) {
        if (!fechaStr || fechaStr === '') return null;
        
        const hoy = new Date();
        const fecha = convertirFecha(fechaStr);
        
        if (!fecha) return null;
        
        const cumpleEsteAno = new Date(hoy.getFullYear(), fecha.mes, fecha.dia);
        
        if (hoy > cumpleEsteAno) {
            cumpleEsteAno.setFullYear(hoy.getFullYear() + 1);
        }
        
        const diffTime = cumpleEsteAno - hoy;
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    
    function estaEnProximos(fechaStr) {
        const dias = obtenerDiasHastaCumple(fechaStr);
        return dias !== null && dias >= 0 && dias <= 15;
    }
    
    function formatearFecha(fechaStr) {
        if (!fechaStr || fechaStr === '') return 'Fecha no disponible';
        
        const partes = fechaStr.split('/');
        if (partes.length !== 2) return fechaStr;
        
        const meses = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];
        
        return `${partes[0]} de ${meses[parseInt(partes[1]) - 1]}`;
    }
    
    function procesarCumpleaneros() {
        cumpleHoy = [];
        proximos = [];
        
        integrantes.forEach(persona => {
            if (esCumpleHoy(persona.fecha_nacimiento)) {
                cumpleHoy.push(persona);
            } else if (estaEnProximos(persona.fecha_nacimiento)) {
                proximos.push(persona);
            }
        });
        
        // Ordenar próximos
        proximos.sort((a, b) => {
            return obtenerDiasHastaCumple(a.fecha_nacimiento) - 
                   obtenerDiasHastaCumple(b.fecha_nacimiento);
        });
        
        console.log('📊 Cumpleaños HOY:', cumpleHoy.length);
        console.log('📊 Próximos:', proximos.length);
    }
    
    // ===== FUNCIONES PARA MOSTRAR EJEMPLOS =====
    function mostrarEjemploJSON() {
        const ejemplo = {
            "integrantes": [
                {
                    "id": 1,
                    "nombre": "Leonardo Aguirre",
                    "fecha_nacimiento": "25/10",
                    "foto": "https://api.dicebear.com/...",
                    "color_favorito": "#FF6B6B"
                }
            ]
        };
        
        console.log('📁 Ejemplo JSON:', ejemplo);
    }
    
    function mostrarEjemploGetJSON() {
        console.log('📡 Ejemplo $.getJSON:');
        console.log(`
            $.getJSON('integrantes.json', function(data) {
                console.log('✅ Datos cargados:', data);
                // Procesar los datos
            }).fail(function() {
                console.log('❌ Error al cargar');
            });
        `);
    }
    
    function mostrarEjemploFechas() {
        const fechaEjemplo = "23/02";
        console.log('📅 Ejemplo fechas:');
        console.log('¿Es hoy?', esCumpleHoy(fechaEjemplo));
        console.log('Días hasta cumple:', obtenerDiasHastaCumple(fechaEjemplo));
    }
    
    // ===== INICIALIZAR =====
    cargarDatosEjemplo();
    mostrarEjemploJSON();
    mostrarEjemploGetJSON();
    mostrarEjemploFechas();
    
    // ===== EFECTOS ADICIONALES =====
    // Hover en tarjetas
    $('.card').hover(
        function() {
            $(this).find('i').css('transform', 'scale(1.2)');
        },
        function() {
            $(this).find('i').css('transform', 'scale(1)');
        }
    );
    
    // Tooltips para badges (opcional)
    $('.badge').each(function() {
        const texto = $(this).text();
        $(this).attr('title', `Concepto: ${texto}`);
    });
    
    // Animación al hacer click en código
    $('.code-block').click(function() {
        $(this).css('transform', 'scale(1.02)');
        setTimeout(() => {
            $(this).css('transform', 'scale(1)');
        }, 200);
    });
    
    // Añadir año actual al footer
    $('.footer-year').text(new Date().getFullYear());
    
    // Mensaje de bienvenida en consola
    console.log('%c📚 Documento de Investigación ADSO', 'color: #39A900; font-size: 16px; font-weight: bold');
    console.log('%c✅ CSS y JS cargados correctamente', 'color: #2D8600; font-size: 14px');
    
    // Contador de visitas (simulado)
    let visitas = localStorage.getItem('investigacion_visitas') || 0;
    visitas = parseInt(visitas) + 1;
    localStorage.setItem('investigacion_visitas', visitas);
    console.log(`👁️ Esta investigación ha sido vista ${visitas} veces`);
});

// ===== FUNCIONES GLOBALES PARA LA PÁGINA =====
window.mostrarNotificacion = function(mensaje, tipo = 'info') {
    // Crear elemento de notificación
    const notificacion = $(`
        <div class="notificacion" style="
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: ${tipo === 'success' ? 'var(--verde-sena)' : 'var(--gris-800)'};
            color: white;
            padding: 1rem 2rem;
            border-radius: 10px;
            box-shadow: var(--sombra-fuerte);
            z-index: 1000;
            animation: slideInRight 0.3s ease;
        ">
            <i class="fas ${tipo === 'success' ? 'fa-check-circle' : 'fa-info-circle'}"></i>
            ${mensaje}
        </div>
    `);
    
    $('body').append(notificacion);
    
    setTimeout(() => {
        notificacion.fadeOut(300, function() {
            $(this).remove();
        });
    }, 3000);
};

// ===== EJEMPLO DE USO DE LAS FUNCIONES DE FECHAS =====
window.probarFecha = function(fecha) {
    if (!fecha) fecha = prompt('Ingresa una fecha (DD/MM):', '25/10');
    
    if (fecha) {
        if (esCumpleHoy(fecha)) {
            alert('🎉 ¡Esta persona cumple HOY!');
        } else if (estaEnProximos(fecha)) {
            alert(`📅 Esta persona cumple en ${obtenerDiasHastaCumple(fecha)} días`);
        } else {
            alert('👤 Cumple más adelante');
        }
    }
};

// ===== EXPORTAR FUNCIONES PARA USO EN CONSOLA =====
console.log('📝 Funciones disponibles en consola:');
console.log('   - probarFecha("DD/MM"): Probar una fecha');
console.log('   - esCumpleHoy("DD/MM"): Verificar si es hoy');
console.log('   - obtenerDiasHastaCumple("DD/MM"): Calcular días restantes');