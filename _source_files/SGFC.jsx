import { useState, useRef } from "react";
import {
  LayoutDashboard, Users, FileText, Calendar, Search, Bell, LogOut,
  ChevronRight, ChevronDown, Check, X, Clock, AlertTriangle, PenLine,
  Download, Upload, Eye, Edit, Trash2, Plus, Filter, BarChart2,
  CheckCircle, XCircle, AlertCircle, HelpCircle, FileSignature,
  Lock, Settings, Shield, Menu, ChevronLeft, FileCheck, FilePlus,
  ClipboardList, Folder, FolderOpen, Briefcase, UserPlus, RefreshCw,
  Send, Inbox, Archive, ChevronUp, MoreHorizontal, Home, BookOpen,
  DollarSign, CreditCard, Banknote, Receipt, ClipboardCheck,
  FileStack, Layers, Building2, BookMarked, Activity
} from "lucide-react";

// ─── TOKENS ──────────────────────────────────────────────────────────────────
const C = {
  verde:      "#39A900",
  verdeDark:  "#2D8400",
  verdeLight: "#F0FDF4",
  verdeAlpha: "#39A90018",
  azul:       "#00304D",
  azulMid:    "#004D7A",
  azulLight:  "#EFF6FF",
  morado:     "#71277A",
  moradoLight:"#FAF0FB",
  agua:       "#0891B2",
  aguaLight:  "#CFFAFE",
  amarillo:   "#CA8A04",
  amarilloLight:"#FEF9C3",
  naranja:    "#EA580C",
  naranjaLight:"#FFF7ED",
  rojo:       "#DC2626",
  rojoLight:  "#FEE2E2",
  azulFirma:  "#1D4ED8",
  azulFirmaLight:"#DBEAFE",
  gris0:      "#F8FAFC",
  gris1:      "#F1F5F9",
  gris2:      "#E2E8F0",
  gris3:      "#CBD5E1",
  gris4:      "#94A3B8",
  gris5:      "#64748B",
  gris6:      "#475569",
  gris7:      "#334155",
  gris8:      "#1E293B",
  blanco:     "#FFFFFF",
};

// ─── ESTILOS GLOBALES ─────────────────────────────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Work+Sans:wght@300;400;500;600;700;800;900&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { font-size: 14px; }
  body { font-family: 'Work Sans', 'Calibri', sans-serif; background: ${C.gris0}; color: ${C.gris8}; line-height: 1.5; -webkit-font-smoothing: antialiased; }
  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: ${C.gris3}; border-radius: 10px; }
  ::-webkit-scrollbar-thumb:hover { background: ${C.gris4}; }
  button { font-family: 'Work Sans', 'Calibri', sans-serif; cursor: pointer; }
  input, select, textarea { font-family: 'Work Sans', 'Calibri', sans-serif; }
  a { text-decoration: none; }
  @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
  @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
  @keyframes spin { to { transform: rotate(360deg); } }
  .fade-up { animation: fadeUp 0.3s ease both; }
  .fade-in { animation: fadeIn 0.2s ease both; }
  .page-content { animation: fadeUp 0.25s ease both; }
  @media (max-width: 768px) {
    .hide-mobile { display: none !important; }
    .col-2-resp { grid-template-columns: 1fr !important; }
    .col-3-resp { grid-template-columns: 1fr 1fr !important; }
    .col-4-resp { grid-template-columns: 1fr 1fr !important; }
  }
  @media (max-width: 480px) {
    .col-3-resp { grid-template-columns: 1fr !important; }
    .col-4-resp { grid-template-columns: 1fr 1fr !important; }
  }
`;

// ─── ESTRUCTURA DE EVIDENCIAS ─────────────────────────────────────────────────
const MODULOS = [
  {
    id: "GF", nombre: "Gestión Financiera", color: C.verde, bgColor: C.verdeLight,
    tipos: [
      {
        id: "GF-1", nombre: "Planilla de Pagos", icon: "Banknote",
        evidencias: [
          { id: "EV-GF-01", nombre: "Planilla de pago de honorarios del mes", descripcion: "Documento de pago mensual debidamente diligenciado y firmado. Formato GTH-F-062 V10.", obligatoria: true },
          { id: "EV-GF-02", nombre: "Informe mensual de ejecución contractual", descripcion: "Informe detallado de las actividades realizadas en el periodo.", obligatoria: true },
          { id: "EV-GF-03", nombre: "Formato GTH-F-062 V10", descripcion: "Formato institucional descargado de SofiaPlus correctamente diligenciado.", obligatoria: true },
        ]
      },
      {
        id: "GF-2", nombre: "Seguridad Social", icon: "Shield",
        evidencias: [
          { id: "EV-GF-04", nombre: "Aportes sistema de seguridad social mes anterior", descripcion: "Soporte de pago de salud, pensión y ARL del mes anterior.", obligatoria: true },
          { id: "EV-GF-05", nombre: "Recibo de pago de pensiones", descripcion: "Comprobante de pago al fondo de pensiones.", obligatoria: true },
          { id: "EV-GF-06", nombre: "Recibo de pago de salud", descripcion: "Comprobante de pago a la EPS correspondiente.", obligatoria: false },
        ]
      },
      {
        id: "GF-3", nombre: "Cuenta de Cobro", icon: "Receipt",
        evidencias: [
          { id: "EV-GF-07", nombre: "Cuenta de cobro firmada", descripcion: "Cuenta de cobro del periodo firmada por el contratista.", obligatoria: true },
          { id: "EV-GF-08", nombre: "Soporte de certificación bancaria", descripcion: "Certificado bancario vigente que acredite la cuenta de cobro.", obligatoria: true },
        ]
      },
      {
        id: "GF-4", nombre: "Informe Financiero", icon: "BarChart2",
        evidencias: [
          { id: "EV-GF-09", nombre: "Informe financiero mensual", descripcion: "Reporte consolidado de ingresos y gastos del periodo.", obligatoria: true },
          { id: "EV-GF-10", nombre: "Reporte de actividades con costos", descripcion: "Informe de actividades ejecutadas con discriminación de costos.", obligatoria: false },
        ]
      },
      {
        id: "GF-5", nombre: "Soportes Bancarios", icon: "CreditCard",
        evidencias: [
          { id: "EV-GF-11", nombre: "Certificado bancario actualizado", descripcion: "Certificación bancaria con vigencia no mayor a 30 días.", obligatoria: true },
          { id: "EV-GF-12", nombre: "Extracto bancario del periodo", descripcion: "Extracto de cuenta donde se acreditan los honorarios.", obligatoria: false },
        ]
      },
    ]
  },
  {
    id: "GC", nombre: "Gestión Contractual", color: C.azul, bgColor: C.azulLight,
    tipos: [
      {
        id: "GC-1", nombre: "Acta de Inicio", icon: "FileCheck",
        evidencias: [
          { id: "EV-GC-01", nombre: "Acta de inicio firmada", descripcion: "Acta de inicio del contrato firmada por todas las partes.", obligatoria: true },
          { id: "EV-GC-02", nombre: "Hoja de vida actualizada", descripcion: "Hoja de vida actualizada con soportes de formación académica.", obligatoria: true },
        ]
      },
      {
        id: "GC-2", nombre: "Programa de Formación", icon: "BookOpen",
        evidencias: [
          { id: "EV-GC-03", nombre: "PDF programa descargado de SofiaPlus", descripcion: "Programa de formación descargado directamente de la plataforma SofiaPlus.", obligatoria: true },
          { id: "EV-GC-04", nombre: "Ficha técnica del programa", descripcion: "Ficha técnica oficial del programa de formación.", obligatoria: true },
        ]
      },
      {
        id: "GC-3", nombre: "Control de Asistencia", icon: "ClipboardCheck",
        evidencias: [
          { id: "EV-GC-05", nombre: "Lista de asistencia firmada", descripcion: "Listados de asistencia de aprendices firmados por sesión.", obligatoria: true },
          { id: "EV-GC-06", nombre: "Registro fotográfico de asistencia", descripcion: "Evidencia fotográfica de las sesiones de formación realizadas.", obligatoria: false },
        ]
      },
      {
        id: "GC-4", nombre: "Guías de Aprendizaje", icon: "BookMarked",
        evidencias: [
          { id: "EV-GC-07", nombre: "Guías GFP/F-135 V1 del trimestre", descripcion: "Guías de aprendizaje formato GFP/F-135 V1 del trimestre en curso.", obligatoria: true },
          { id: "EV-GC-08", nombre: "Diseño instruccional", descripcion: "Diseño instruccional del programa de formación.", obligatoria: false },
        ]
      },
      {
        id: "GC-5", nombre: "Informe de Actividades", icon: "ClipboardList",
        evidencias: [
          { id: "EV-GC-09", nombre: "Informe mensual de actividades", descripcion: "Informe detallado de actividades pedagógicas realizadas en el mes.", obligatoria: true },
          { id: "EV-GC-10", nombre: "Cronograma ejecutado", descripcion: "Cronograma de actividades ejecutado vs. planeado.", obligatoria: true },
          { id: "EV-GC-11", nombre: "Reporte de avance de competencias", descripcion: "Reporte del avance de los aprendices en el logro de competencias.", obligatoria: false },
        ]
      },
      {
        id: "GC-6", nombre: "Evidencias de Ejecución FPI", icon: "Layers",
        evidencias: [
          { id: "EV-GC-12", nombre: "Registro fotográfico de ejecución", descripcion: "Fotos o videos de evidencias de la ejecución de la FPI.", obligatoria: true },
          { id: "EV-GC-13", nombre: "Actas de visita empresarial", descripcion: "Actas de las visitas realizadas a empresas por FPI.", obligatoria: false },
          { id: "EV-GC-14", nombre: "Informe de seguimiento FPI", descripcion: "Informe de seguimiento a la Formación Profesional Integral.", obligatoria: true },
        ]
      },
      {
        id: "GC-7", nombre: "Juicios Evaluativos", icon: "CheckCircle",
        evidencias: [
          { id: "EV-GC-15", nombre: "Reporte de juicios evaluativos", descripcion: "Reporte excel descargado de SofiaPlus con juicios evaluativos del trimestre.", obligatoria: true },
          { id: "EV-GC-16", nombre: "Actas de evaluación de aprendices", descripcion: "Actas firmadas de los procesos de evaluación realizados.", obligatoria: true },
        ]
      },
      {
        id: "GC-8", nombre: "Instrumentos de Evaluación", icon: "FileText",
        evidencias: [
          { id: "EV-GC-17", nombre: "Instrumentos de evaluación aplicados", descripcion: "Instrumentos evaluativos aplicados a los aprendices en el periodo.", obligatoria: true },
          { id: "EV-GC-18", nombre: "Rúbricas de evaluación", descripcion: "Rúbricas utilizadas para la valoración de competencias.", obligatoria: false },
        ]
      },
      {
        id: "GC-9", nombre: "Plan de Trabajo", icon: "Calendar",
        evidencias: [
          { id: "EV-GC-19", nombre: "Plan de trabajo concertado", descripcion: "Plan de trabajo del periodo concertado con la coordinación.", obligatoria: true },
          { id: "EV-GC-20", nombre: "Informe de seguimiento al plan", descripcion: "Informe de seguimiento y cumplimiento del plan de trabajo.", obligatoria: true },
        ]
      },
      {
        id: "GC-10", nombre: "Soportes del Contrato", icon: "Briefcase",
        evidencias: [
          { id: "EV-GC-21", nombre: "Póliza de seguro vigente", descripcion: "Póliza de seguro de vida vigente durante el periodo contractual.", obligatoria: true },
          { id: "EV-GC-22", nombre: "RUT actualizado", descripcion: "RUT actualizado del contratista.", obligatoria: true },
          { id: "EV-GC-23", nombre: "Acta de liquidación (si aplica)", descripcion: "Acta de liquidación del contrato si aplica para el periodo.", obligatoria: false },
        ]
      },
    ]
  }
];

// ─── DATOS MOCK ───────────────────────────────────────────────────────────────
const CONTRATOS_DATA = [
  { id:"C-001", numero:"112-2025", contratistaId:1, inicio:"2025-01-01", fin:"2025-12-31", estado:"Activo", objeto:"Servicios de formación profesional integral área Sistemas", valor:"$48.000.000" },
  { id:"C-002", numero:"114-2025", contratistaId:2, inicio:"2025-02-01", fin:"2025-12-31", estado:"Activo", objeto:"Servicios de formación profesional integral área Contabilidad", valor:"$44.000.000" },
  { id:"C-003", numero:"118-2025", contratistaId:3, inicio:"2025-03-01", fin:"2025-12-31", estado:"Activo", objeto:"Servicios de formación profesional área Electricidad Industrial", valor:"$46.000.000" },
  { id:"C-004", numero:"122-2024", contratistaId:4, inicio:"2024-01-01", fin:"2024-12-31", estado:"Finalizado", objeto:"Servicios de formación profesional área Diseño Gráfico", valor:"$42.000.000" },
  { id:"C-005", numero:"125-2025", contratistaId:5, inicio:"2025-01-01", fin:"2025-06-30", estado:"Activo", objeto:"Servicios de formación profesional área Mecánica", valor:"$38.000.000" },
];

const PERIODOS_DATA = [
  { id:"P-01", mes:"Enero 2025",    num:1,  estado:"Firmado",          apertura:"2025-01-01", limite:"2025-01-31", avance:100, firma:"Firmado" },
  { id:"P-02", mes:"Febrero 2025",  num:2,  estado:"Firmado",          apertura:"2025-02-01", limite:"2025-02-28", avance:100, firma:"Firmado" },
  { id:"P-03", mes:"Marzo 2025",    num:3,  estado:"Pendiente firma",  apertura:"2025-03-01", limite:"2025-03-31", avance:95,  firma:"Pendiente" },
  { id:"P-04", mes:"Abril 2025",    num:4,  estado:"En revisión",      apertura:"2025-04-01", limite:"2025-04-30", avance:72,  firma:"—" },
  { id:"P-05", mes:"Mayo 2025",     num:5,  estado:"Activo",           apertura:"2025-05-01", limite:"2025-05-31", avance:35,  firma:"—" },
  { id:"P-06", mes:"Junio 2025",    num:6,  estado:"Bloqueado",        apertura:"—",          limite:"—",          avance:0,   firma:"—" },
  { id:"P-07", mes:"Julio 2025",    num:7,  estado:"Bloqueado",        apertura:"—",          limite:"—",          avance:0,   firma:"—" },
  { id:"P-08", mes:"Agosto 2025",   num:8,  estado:"Bloqueado",        apertura:"—",          limite:"—",          avance:0,   firma:"—" },
  { id:"P-09", mes:"Septiembre 2025",num:9, estado:"Bloqueado",        apertura:"—",          limite:"—",          avance:0,   firma:"—" },
  { id:"P-10", mes:"Octubre 2025",  num:10, estado:"Bloqueado",        apertura:"—",          limite:"—",          avance:0,   firma:"—" },
  { id:"P-11", mes:"Noviembre 2025",num:11, estado:"Bloqueado",        apertura:"—",          limite:"—",          avance:0,   firma:"—" },
  { id:"P-12", mes:"Diciembre 2025",num:12, estado:"Bloqueado",        apertura:"—",          limite:"—",          avance:0,   firma:"—" },
];

const USUARIOS_DATA = [
  { id:1, nombre:"Yuliana Bernal Torres",   doc:"1.094.921.003", correo:"ybernal@sena.edu.co",   rol:"Contratista",   estado:"Activo",   contratoId:"C-001", ultimo:"Hoy 09:15" },
  { id:2, nombre:"Andrés Giraldo Ríos",     doc:"79.854.112",    correo:"agiraldo@sena.edu.co",  rol:"Contratista",   estado:"Activo",   contratoId:"C-002", ultimo:"Hoy 08:42" },
  { id:3, nombre:"Marcela Ospina Duque",    doc:"43.987.654",    correo:"mospina@sena.edu.co",   rol:"Contratista",   estado:"Activo",   contratoId:"C-003", ultimo:"Ayer" },
  { id:4, nombre:"Juan Pablo Reyes",        doc:"80.543.211",    correo:"jpreyes@sena.edu.co",   rol:"Contratista",   estado:"Inactivo", contratoId:"C-004", ultimo:"Hace 15 días" },
  { id:5, nombre:"Sandra Milena Castro",    doc:"39.781.204",    correo:"smcastro@sena.edu.co",  rol:"Contratista",   estado:"Activo",   contratoId:"C-005", ultimo:"Hace 3 días" },
  { id:6, nombre:"Carlos Jiménez Vélez",    doc:"71.204.887",    correo:"cjimenez@sena.edu.co",  rol:"Administrativo",estado:"Activo",   contratoId:null,    ultimo:"Hoy 10:05" },
  { id:7, nombre:"Patricia Loaiza Soto",    doc:"52.371.009",    correo:"ploaiza@sena.edu.co",   rol:"Administrativo",estado:"Activo",   contratoId:null,    ultimo:"Hoy 07:30" },
];

// Estado de evidencias del contratista 1 en periodo Mayo 2025
const EV_MOCK_ESTADO = {
  "EV-GF-01": { estado:"Aprobada",          fecha:"2025-05-02", archivo:"planilla_may25.pdf", comentario:"", version:1 },
  "EV-GF-02": { estado:"Aprobada",          fecha:"2025-05-02", archivo:"informe_may25.pdf", comentario:"", version:1 },
  "EV-GF-03": { estado:"Pendiente revisión",fecha:"2025-05-06", archivo:"formato_gth.pdf", comentario:"", version:1 },
  "EV-GF-04": { estado:"Rechazada",         fecha:"2025-05-04", archivo:"ss_abr25.pdf", comentario:"El documento está borroso. Por favor resubir con mejor resolución.", version:1 },
  "EV-GF-05": { estado:"Pendiente revisión",fecha:"2025-05-05", archivo:"pension_abr25.pdf", comentario:"", version:1 },
  "EV-GF-06": { estado:"Pendiente entrega", fecha:"", archivo:"", comentario:"", version:0 },
  "EV-GF-07": { estado:"Pendiente entrega", fecha:"", archivo:"", comentario:"Recuerde firmar la cuenta de cobro antes del cierre del periodo.", version:0 },
  "EV-GF-08": { estado:"Pendiente entrega", fecha:"", archivo:"", comentario:"", version:0 },
  "EV-GF-09": { estado:"Pendiente entrega", fecha:"", archivo:"", comentario:"", version:0 },
  "EV-GF-10": { estado:"Pendiente entrega", fecha:"", archivo:"", comentario:"", version:0 },
  "EV-GF-11": { estado:"Pendiente entrega", fecha:"", archivo:"", comentario:"", version:0 },
  "EV-GF-12": { estado:"Pendiente entrega", fecha:"", archivo:"", comentario:"", version:0 },
  "EV-GC-01": { estado:"Aprobada",          fecha:"2025-05-01", archivo:"acta_inicio.pdf", comentario:"", version:1 },
  "EV-GC-02": { estado:"Aprobada",          fecha:"2025-05-01", archivo:"hv_actualizada.pdf", comentario:"", version:1 },
  "EV-GC-03": { estado:"Pendiente revisión",fecha:"2025-05-08", archivo:"programa_sofia.pdf", comentario:"", version:1 },
  "EV-GC-04": { estado:"Pendiente entrega", fecha:"", archivo:"", comentario:"", version:0 },
  "EV-GC-05": { estado:"Pendiente revisión",fecha:"2025-05-09", archivo:"asistencia_may.pdf", comentario:"", version:1 },
  "EV-GC-06": { estado:"Pendiente entrega", fecha:"", archivo:"", comentario:"", version:0 },
  "EV-GC-07": { estado:"Pendiente entrega", fecha:"", archivo:"", comentario:"Subir guías del trimestre en curso.", version:0 },
  "EV-GC-08": { estado:"Pendiente entrega", fecha:"", archivo:"", comentario:"", version:0 },
  "EV-GC-09": { estado:"Pendiente entrega", fecha:"", archivo:"", comentario:"", version:0 },
  "EV-GC-10": { estado:"Pendiente entrega", fecha:"", archivo:"", comentario:"", version:0 },
  "EV-GC-11": { estado:"Pendiente entrega", fecha:"", archivo:"", comentario:"", version:0 },
  "EV-GC-12": { estado:"Pendiente entrega", fecha:"", archivo:"", comentario:"", version:0 },
  "EV-GC-13": { estado:"Pendiente entrega", fecha:"", archivo:"", comentario:"", version:0 },
  "EV-GC-14": { estado:"Pendiente entrega", fecha:"", archivo:"", comentario:"", version:0 },
  "EV-GC-15": { estado:"Pendiente entrega", fecha:"", archivo:"", comentario:"", version:0 },
  "EV-GC-16": { estado:"Pendiente entrega", fecha:"", archivo:"", comentario:"", version:0 },
  "EV-GC-17": { estado:"Pendiente entrega", fecha:"", archivo:"", comentario:"", version:0 },
  "EV-GC-18": { estado:"Pendiente entrega", fecha:"", archivo:"", comentario:"", version:0 },
  "EV-GC-19": { estado:"Pendiente entrega", fecha:"", archivo:"", comentario:"", version:0 },
  "EV-GC-20": { estado:"Pendiente entrega", fecha:"", archivo:"", comentario:"", version:0 },
  "EV-GC-21": { estado:"Aprobada",          fecha:"2025-05-01", archivo:"poliza.pdf", comentario:"", version:1 },
  "EV-GC-22": { estado:"Aprobada",          fecha:"2025-05-01", archivo:"rut.pdf", comentario:"", version:1 },
  "EV-GC-23": { estado:"Pendiente entrega", fecha:"", archivo:"", comentario:"", version:0 },
};

const NOTIF_ADMIN = [
  { id:1, tipo:"Evidencia cargada",    contratista:"Yuliana Bernal Torres",  periodo:"Mayo 2025",  evidencia:"Formato GTH-F-062 V10",               fecha:"Hoy 09:15", leida:false },
  { id:2, tipo:"Evidencia corregida",  contratista:"Andrés Giraldo Ríos",    periodo:"Mayo 2025",  evidencia:"Aportes seguridad social",             fecha:"Hoy 08:30", leida:false },
  { id:3, tipo:"PDF para firma",       contratista:"Marcela Ospina Duque",   periodo:"Abril 2025", evidencia:"PDF unificado listo para firma",       fecha:"Ayer 17:45",leida:false },
  { id:4, tipo:"Periodo por vencer",   contratista:"Sandra Milena Castro",   periodo:"Mayo 2025",  evidencia:"3 evidencias faltantes",               fecha:"Ayer 08:00",leida:true  },
  { id:5, tipo:"Evidencia cargada",    contratista:"Andrés Giraldo Ríos",    periodo:"Mayo 2025",  evidencia:"Informe mensual de actividades",       fecha:"2025-05-07",leida:true  },
  { id:6, tipo:"Evidencia cargada",    contratista:"Yuliana Bernal Torres",  periodo:"Mayo 2025",  evidencia:"Planilla de pago de honorarios",       fecha:"2025-05-02",leida:true  },
];

const REVISION_DATA = [
  { id:1, contratista:"Yuliana Bernal Torres",  contrato:"112-2025", periodo:"Mayo 2025",  modulo:"GF", tipo:"Planilla de Pagos",       evidencia:"Formato GTH-F-062 V10",         fecha:"2025-05-06", estado:"Pendiente revisión" },
  { id:2, contratista:"Andrés Giraldo Ríos",    contrato:"114-2025", periodo:"Mayo 2025",  modulo:"GF", tipo:"Seguridad Social",         evidencia:"Aportes seguridad social",      fecha:"2025-05-04", estado:"Pendiente revisión" },
  { id:3, contratista:"Marcela Ospina Duque",   contrato:"118-2025", periodo:"Mayo 2025",  modulo:"GC", tipo:"Informe de Actividades",   evidencia:"Informe mensual de actividades",fecha:"2025-05-08", estado:"Pendiente revisión" },
  { id:4, contratista:"Yuliana Bernal Torres",  contrato:"112-2025", periodo:"Mayo 2025",  modulo:"GC", tipo:"Programa de Formación",    evidencia:"PDF programa de SofiaPlus",     fecha:"2025-05-08", estado:"Pendiente revisión" },
  { id:5, contratista:"Sandra Milena Castro",   contrato:"125-2025", periodo:"Abril 2025", modulo:"GF", tipo:"Cuenta de Cobro",          evidencia:"Cuenta de cobro firmada",       fecha:"2025-04-28", estado:"Rechazada" },
  { id:6, contratista:"Yuliana Bernal Torres",  contrato:"112-2025", periodo:"Abril 2025", modulo:"GF", tipo:"Planilla de Pagos",        evidencia:"Planilla de pago honorarios",   fecha:"2025-04-15", estado:"Aprobada" },
  { id:7, contratista:"Andrés Giraldo Ríos",    contrato:"114-2025", periodo:"Abril 2025", modulo:"GC", tipo:"Acta de Inicio",           evidencia:"Acta de inicio firmada",        fecha:"2025-04-12", estado:"Aprobada" },
  { id:8, contratista:"Marcela Ospina Duque",   contrato:"118-2025", periodo:"Mayo 2025",  modulo:"GC", tipo:"Control de Asistencia",    evidencia:"Lista de asistencia firmada",   fecha:"2025-05-09", estado:"Pendiente revisión" },
];

const PDFS_FIRMA_DATA = [
  { id:1, contratista:"Marcela Ospina Duque",   contrato:"118-2025", periodo:"Abril 2025",   generado:"2025-05-03", firmado:null,       estado:"Pendiente firma" },
  { id:2, contratista:"Andrés Giraldo Ríos",    contrato:"114-2025", periodo:"Marzo 2025",   generado:"2025-04-15", firmado:null,       estado:"Pendiente firma" },
  { id:3, contratista:"Yuliana Bernal Torres",  contrato:"112-2025", periodo:"Marzo 2025",   generado:"2025-04-10", firmado:"2025-04-12", estado:"Firmado" },
  { id:4, contratista:"Yuliana Bernal Torres",  contrato:"112-2025", periodo:"Febrero 2025", generado:"2025-03-05", firmado:"2025-03-07", estado:"Firmado" },
  { id:5, contratista:"Juan Pablo Reyes",       contrato:"122-2024", periodo:"Dic 2024",     generado:"2025-01-10", firmado:"2025-01-13", estado:"Firmado" },
];

// ─── HELPERS VISUALES ─────────────────────────────────────────────────────────
const ESTADO_CFG = {
  "Aprobada":           { bg: C.verdeLight,     text: C.verde,      border: "#BBF7D0", Icon: CheckCircle },
  "Pendiente revisión": { bg: C.amarilloLight,  text: C.amarillo,   border: "#FDE047", Icon: HelpCircle },
  "Pendiente entrega":  { bg: C.naranjaLight,   text: C.naranja,    border: "#FED7AA", Icon: AlertTriangle },
  "Rechazada":          { bg: C.rojoLight,      text: C.rojo,       border: "#FECACA", Icon: XCircle },
  "Firmado":            { bg: C.azulFirmaLight, text: C.azulFirma,  border: "#93C5FD", Icon: FileSignature },
  "Pendiente firma":    { bg: C.aguaLight,      text: C.agua,       border: "#A5F3FC", Icon: Clock },
  "Activo":             { bg: C.verdeLight,     text: C.verde,      border: "#BBF7D0", Icon: CheckCircle },
  "Inactivo":           { bg: C.gris1,          text: C.gris5,      border: C.gris2,   Icon: X },
  "Finalizado":         { bg: C.azulFirmaLight, text: C.azulFirma,  border: "#93C5FD", Icon: FileCheck },
  "Bloqueado":          { bg: C.gris1,          text: C.gris4,      border: C.gris2,   Icon: Lock },
  "En revisión":        { bg: C.amarilloLight,  text: C.amarillo,   border: "#FDE047", Icon: HelpCircle },
};

const Badge = ({ estado, small }) => {
  const cfg = ESTADO_CFG[estado] || { bg: C.gris1, text: C.gris5, border: C.gris2, Icon: AlertCircle };
  const { Icon } = cfg;
  return (
    <span style={{
      display:"inline-flex", alignItems:"center", gap:4,
      background: cfg.bg, color: cfg.text,
      border: `1px solid ${cfg.border}`,
      borderRadius:20, padding: small?"2px 8px":"3px 10px",
      fontSize: small?11:12, fontWeight:600, whiteSpace:"nowrap"
    }}>
      <Icon size={small?10:11} strokeWidth={2.5}/>
      {estado}
    </span>
  );
};

const Avatar = ({ nombre, size=32 }) => {
  const initials = (nombre||"").split(" ").slice(0,2).map(n=>n[0]?.toUpperCase()||"").join("");
  const palette = [C.verde, C.azul, C.morado, C.agua, C.naranja];
  const bg = palette[(nombre||"").length % palette.length];
  return (
    <div style={{ width:size, height:size, borderRadius:"50%", background:bg, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:Math.round(size*0.36), fontWeight:700, flexShrink:0, letterSpacing:"-0.5px" }}>
      {initials}
    </div>
  );
};

const ProgressBar = ({ val, color=C.verde, height=6 }) => (
  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
    <div style={{ flex:1, height, background:C.gris2, borderRadius:height/2, overflow:"hidden" }}>
      <div style={{ height:"100%", width:`${val}%`, background: val>=80?C.verde:val>=50?C.amarillo:C.naranja, borderRadius:height/2, transition:"width 0.6s ease" }}/>
    </div>
    <span style={{ fontSize:11, fontWeight:700, color:C.gris5, width:28, textAlign:"right" }}>{val}%</span>
  </div>
);

// ─── COMPONENTES BASE ─────────────────────────────────────────────────────────
const s = {
  card: { background:"#fff", borderRadius:12, border:`1px solid ${C.gris2}`, boxShadow:"0 1px 3px rgba(0,0,0,0.06)" },
  btnPrimary: { background:C.verde, color:"#fff", border:"none", borderRadius:8, padding:"8px 16px", fontFamily:"'Work Sans',sans-serif", fontSize:13, fontWeight:600, cursor:"pointer", display:"inline-flex", alignItems:"center", gap:6, transition:"all 0.15s", whiteSpace:"nowrap" },
  btnSec: { background:"transparent", color:C.azul, border:`1.5px solid ${C.azul}`, borderRadius:8, padding:"7px 14px", fontFamily:"'Work Sans',sans-serif", fontSize:13, fontWeight:600, cursor:"pointer", display:"inline-flex", alignItems:"center", gap:6, transition:"all 0.15s", whiteSpace:"nowrap" },
  btnGhost: { background:"transparent", color:C.gris5, border:`1px solid ${C.gris2}`, borderRadius:7, padding:"6px 12px", fontFamily:"'Work Sans',sans-serif", fontSize:12, fontWeight:500, cursor:"pointer", display:"inline-flex", alignItems:"center", gap:5, transition:"all 0.15s", whiteSpace:"nowrap" },
  btnDanger: { background:C.rojoLight, color:C.rojo, border:`1px solid #FECACA`, borderRadius:7, padding:"6px 12px", fontFamily:"'Work Sans',sans-serif", fontSize:12, fontWeight:600, cursor:"pointer", display:"inline-flex", alignItems:"center", gap:5, transition:"all 0.15s" },
  input: { width:"100%", padding:"9px 13px", border:`1.5px solid ${C.gris2}`, borderRadius:8, fontFamily:"'Work Sans',sans-serif", fontSize:13, outline:"none", color:C.gris8, background:"#fff", transition:"border-color 0.15s" },
  label: { fontSize:12, fontWeight:600, color:C.gris6, display:"block", marginBottom:5, letterSpacing:"0.2px" },
  th: { background:C.gris0, color:C.gris5, fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.6px", padding:"9px 14px", textAlign:"left", whiteSpace:"nowrap", borderBottom:`1px solid ${C.gris2}` },
  td: { padding:"11px 14px", fontSize:13, borderBottom:`1px solid ${C.gris1}`, color:C.gris7, verticalAlign:"middle" },
};

const Btn = ({ variant="primary", icon:Icon, children, onClick, disabled, small }) => {
  const base = variant==="primary" ? s.btnPrimary : variant==="sec" ? s.btnSec : variant==="ghost" ? s.btnGhost : s.btnDanger;
  const p = small ? { ...base, padding:"5px 11px", fontSize:12 } : base;
  return (
    <button style={{ ...p, opacity:disabled?0.5:1 }} onClick={onClick} disabled={disabled}>
      {Icon && <Icon size={small?12:14} strokeWidth={2.5}/>}
      {children}
    </button>
  );
};

const Input = ({ label, ...props }) => (
  <div>
    {label && <label style={s.label}>{label}</label>}
    <input style={s.input} {...props}
      onFocus={e=>e.target.style.borderColor=C.verde}
      onBlur={e=>e.target.style.borderColor=C.gris2}
    />
  </div>
);

const Select = ({ label, children, value, onChange, style }) => (
  <div style={style}>
    {label && <label style={s.label}>{label}</label>}
    <select value={value} onChange={onChange} style={{ ...s.input, cursor:"pointer", appearance:"none", backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat:"no-repeat", backgroundPosition:"right 10px center", paddingRight:32 }}>
      {children}
    </select>
  </div>
);

const Modal = ({ title, onClose, children, width=520 }) => (
  <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 }} onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
    <div style={{ ...s.card, width:"100%", maxWidth:width, maxHeight:"90vh", overflow:"auto", padding:28 }} className="fade-up">
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <h3 style={{ fontSize:17, fontWeight:700, color:C.azul }}>{title}</h3>
        <button onClick={onClose} style={{ background:"none", border:"none", color:C.gris4, cursor:"pointer", padding:4, borderRadius:6, display:"flex" }}><X size={20}/></button>
      </div>
      {children}
    </div>
  </div>
);

const KpiCard = ({ label, value, Icon, color, sub }) => (
  <div style={{ ...s.card, padding:"16px 18px", display:"flex", gap:12, alignItems:"center" }}>
    <div style={{ width:44, height:44, borderRadius:10, background:`${color}15`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
      <Icon size={20} color={color} strokeWidth={2}/>
    </div>
    <div>
      <div style={{ fontSize:24, fontWeight:800, color:C.gris8, lineHeight:1 }}>{value}</div>
      <div style={{ fontSize:12, color:C.gris5, marginTop:3, fontWeight:500 }}>{label}</div>
      {sub && <div style={{ fontSize:11, color, marginTop:2, fontWeight:600 }}>{sub}</div>}
    </div>
  </div>
);

const SectionTitle = ({ title, subtitle, right }) => (
  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20, gap:12, flexWrap:"wrap" }}>
    <div>
      <h2 style={{ fontSize:20, fontWeight:800, color:C.azul, letterSpacing:"-0.3px" }}>{title}</h2>
      {subtitle && <p style={{ fontSize:13, color:C.gris5, marginTop:3 }}>{subtitle}</p>}
    </div>
    {right && <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>{right}</div>}
  </div>
);

// ─── LOGO ─────────────────────────────────────────────────────────────────────
const LogoSGFC = ({ dark=false, size="md" }) => {
  const compact = size==="sm";
  const textCol = dark ? "#fff" : C.azul;
  const subCol = dark ? "rgba(255,255,255,0.6)" : C.gris5;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:compact?8:10 }}>
      <div style={{ width:compact?32:38, height:compact?32:38, borderRadius:9, background:dark?"rgba(255,255,255,0.15)":C.verde, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, position:"relative" }}>
        <Building2 size={compact?17:21} color="#fff" strokeWidth={2}/>
        <div style={{ position:"absolute", bottom:4, right:4, width:8, height:8, borderRadius:2, background: dark?"rgba(255,255,255,0.8)":"#fff", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ width:4, height:4, borderRadius:1, background:C.verde }}/>
        </div>
      </div>
      {!compact && (
        <>
          <div style={{ width:1, height:32, background: dark?"rgba(255,255,255,0.2)":C.gris2 }}/>
          <div>
            <div style={{ display:"flex", alignItems:"baseline", gap:5 }}>
              <span style={{ fontSize:18, fontWeight:900, color:dark?"#fff":C.verde, letterSpacing:"-1px" }}>SGFC</span>
              <span style={{ fontSize:10, fontWeight:700, color:dark?"rgba(255,255,255,0.5)":C.gris4, letterSpacing:"0.5px" }}>SENA</span>
            </div>
            <div style={{ fontSize:9.5, color:subCol, fontWeight:500, letterSpacing:"0.2px", lineHeight:1 }}>Sist. Gestión Financiera y Contractual</div>
          </div>
        </>
      )}
    </div>
  );
};

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
const MENU_MAP = {
  Administrativo: [
    { id:"admin-dashboard",       label:"Dashboard",         Icon:LayoutDashboard },
    { id:"admin-usuarios",        label:"Usuarios",          Icon:Users },
    { id:"admin-evidencias",      label:"Tipos de Evidencias",Icon:Folder },
    { id:"admin-contratos",       label:"Contratos y Periodos",Icon:FileText },
    { id:"admin-revision",        label:"Revisión",          Icon:Search, badge:4 },
    { id:"admin-firmas",          label:"Firmas",            Icon:PenLine },
    { id:"admin-notificaciones",  label:"Notificaciones",    Icon:Bell, badge:3 },
  ],
  Contratista: [
    { id:"cont-cargar",           label:"Cargar Evidencias", Icon:Upload },
    { id:"cont-firmados",         label:"PDFs Firmados",     Icon:FileSignature },
    { id:"cont-historial",        label:"Historial",         Icon:Archive },
    { id:"cont-notificaciones",   label:"Notificaciones",    Icon:Bell, badge:2 },
  ],
  "Super Admin": [
    { id:"super-dashboard",       label:"Dashboard",         Icon:LayoutDashboard },
    { id:"super-usuarios",        label:"Usuarios",          Icon:Users },
    { id:"super-contratos",       label:"Contratos",         Icon:FileText },
    { id:"super-evidencias",      label:"Evidencias",        Icon:ClipboardList },
    { id:"super-config",          label:"Configuración",     Icon:Settings },
  ],
};

const Sidebar = ({ user, view, onNav, collapsed, onToggle }) => {
  const menu = MENU_MAP[user.rol] || [];
  return (
    <aside style={{ width:collapsed?60:240, background:C.azul, height:"100vh", position:"sticky", top:0, display:"flex", flexDirection:"column", transition:"width 0.22s ease", flexShrink:0, zIndex:50, overflow:"hidden" }}>
      {/* Logo area */}
      <div style={{ padding:collapsed?"14px 10px":"16px 14px", borderBottom:"1px solid rgba(255,255,255,0.08)", display:"flex", alignItems:"center", justifyContent:collapsed?"center":"flex-start" }}>
        {collapsed ? <Building2 size={22} color={C.verde} strokeWidth={2}/> : <LogoSGFC dark/>}
      </div>
      {/* Menu */}
      <nav style={{ flex:1, overflowY:"auto", overflowX:"hidden", padding:"10px 8px" }}>
        {menu.map(item => {
          const active = view===item.id;
          const { Icon } = item;
          return (
            <button key={item.id} onClick={()=>onNav(item.id)} title={collapsed?item.label:""} style={{
              width:"100%", display:"flex", alignItems:"center", gap:9,
              padding:collapsed?"9px 10px":"9px 11px",
              borderRadius:8, border:"none",
              background: active?"rgba(57,169,0,0.2)":"transparent",
              color: active?"#fff":"rgba(255,255,255,0.55)",
              cursor:"pointer", marginBottom:1,
              fontFamily:"'Work Sans',sans-serif", fontSize:13, fontWeight:active?600:400,
              textAlign:"left", transition:"all 0.12s", position:"relative",
              justifyContent:collapsed?"center":"flex-start"
            }}>
              {active && <div style={{ position:"absolute", left:0, top:"15%", height:"70%", width:3, background:C.verde, borderRadius:"0 2px 2px 0" }}/>}
              <Icon size={16} strokeWidth={active?2.5:2} style={{ flexShrink:0 }}/>
              {!collapsed && <span style={{ flex:1, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{item.label}</span>}
              {!collapsed && item.badge && <span style={{ background:C.rojo, color:"#fff", borderRadius:10, fontSize:10, fontWeight:700, padding:"0px 5px", minWidth:16, textAlign:"center", lineHeight:"16px" }}>{item.badge}</span>}
            </button>
          );
        })}
      </nav>
      {/* User + toggle */}
      <div style={{ padding:"10px 8px 12px", borderTop:"1px solid rgba(255,255,255,0.08)" }}>
        {!collapsed && (
          <div style={{ display:"flex", alignItems:"center", gap:9, padding:"8px 8px", borderRadius:8, marginBottom:6 }}>
            <Avatar nombre={user.nombre} size={30}/>
            <div style={{ overflow:"hidden" }}>
              <div style={{ fontSize:12, fontWeight:600, color:"#fff", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{user.nombre.split(" ").slice(0,2).join(" ")}</div>
              <div style={{ fontSize:10, color:"rgba(255,255,255,0.45)", fontWeight:500 }}>{user.rol}</div>
            </div>
          </div>
        )}
        <button onClick={onToggle} style={{ width:"100%", background:"rgba(255,255,255,0.06)", border:"none", color:"rgba(255,255,255,0.35)", padding:"6px", borderRadius:7, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
          {collapsed ? <ChevronRight size={14}/> : <><ChevronLeft size={14}/><span style={{ fontSize:11, marginLeft:4 }}>Colapsar</span></>}
        </button>
      </div>
    </aside>
  );
};

// ─── NAVBAR ───────────────────────────────────────────────────────────────────
const BREADCRUMB_MAP = {
  "admin-dashboard":["Dashboard"],"admin-usuarios":["Usuarios"],"admin-evidencias":["Tipos de Evidencias"],
  "admin-contratos":["Contratos y Periodos"],"admin-revision":["Revisión de Evidencias"],
  "admin-firmas":["Firmas"],"admin-notificaciones":["Notificaciones"],
  "cont-cargar":["Cargar Evidencias"],"cont-firmados":["PDFs Firmados"],
  "cont-historial":["Historial"],"cont-notificaciones":["Notificaciones"],
  "super-dashboard":["Dashboard"],"super-usuarios":["Usuarios"],"super-contratos":["Contratos"],
  "super-evidencias":["Evidencias"],"super-config":["Configuración"],
};

const Navbar = ({ user, view, onLogout, onNav, onMenuToggle }) => {
  const [nOpen, setNOpen] = useState(false);
  const [pOpen, setPOpen] = useState(false);
  const crumbs = BREADCRUMB_MAP[view] || [];
  const roleLabel = { Administrativo:"Admin.", Contratista:"Contratista", "Super Admin":"Super Admin" };
  const noLeidas = NOTIF_ADMIN.filter(n=>!n.leida).length;

  return (
    <header style={{ background:"#fff", borderBottom:`1px solid ${C.gris2}`, height:56, display:"flex", alignItems:"center", padding:"0 20px", gap:12, position:"sticky", top:0, zIndex:40 }}>
      {/* Mobile menu btn */}
      <button onClick={onMenuToggle} className="hide-desktop" style={{ background:"none", border:"none", color:C.gris5, cursor:"pointer", display:"flex", padding:4 }}>
        <Menu size={20}/>
      </button>
      {/* Breadcrumb */}
      <div style={{ flex:1, display:"flex", alignItems:"center", gap:5, fontSize:13, overflow:"hidden" }}>
        <span style={{ color:C.verde, fontWeight:700, fontSize:13, whiteSpace:"nowrap" }}>SGFC</span>
        <ChevronRight size={13} color={C.gris3} strokeWidth={2}/>
        <span style={{ color:C.gris5, fontWeight:500, fontSize:13, whiteSpace:"nowrap" }}>{roleLabel[user.rol]}</span>
        {crumbs.map((c,i)=>(
          <span key={i} style={{ display:"flex", alignItems:"center", gap:5 }}>
            <ChevronRight size={13} color={C.gris3} strokeWidth={2}/>
            <span style={{ color: i===crumbs.length-1?C.gris8:C.gris5, fontWeight: i===crumbs.length-1?600:400, whiteSpace:"nowrap" }}>{c}</span>
          </span>
        ))}
      </div>
      {/* Notif */}
      <div style={{ position:"relative" }}>
        <button onClick={()=>{ setNOpen(!nOpen); setPOpen(false); }} style={{ position:"relative", background:nOpen?C.gris1:"none", border:"none", borderRadius:8, padding:7, cursor:"pointer", display:"flex", color:C.gris6 }}>
          <Bell size={18} strokeWidth={2}/>
          {noLeidas>0 && <span style={{ position:"absolute", top:5, right:5, width:7, height:7, background:C.rojo, borderRadius:"50%", border:"1.5px solid #fff" }}/>}
        </button>
        {nOpen && (
          <div style={{ position:"absolute", right:0, top:"calc(100%+6px)", width:330, ...s.card, zIndex:100, overflow:"hidden" }} className="fade-up">
            <div style={{ padding:"12px 16px", borderBottom:`1px solid ${C.gris1}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontWeight:700, fontSize:14, color:C.azul }}>Notificaciones</span>
              <span style={{ fontSize:11, color:C.verde, fontWeight:600, cursor:"pointer" }}>Marcar leídas</span>
            </div>
            {NOTIF_ADMIN.slice(0,4).map(n=>(
              <div key={n.id} style={{ padding:"11px 16px", borderBottom:`1px solid ${C.gris1}`, display:"flex", gap:10, background:n.leida?"#fff":C.verdeLight, cursor:"pointer" }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:n.leida?C.gris3:C.verde, marginTop:4, flexShrink:0 }}/>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:12, fontWeight:600 }}>{n.contratista}</div>
                  <div style={{ fontSize:11, color:C.gris5 }}>{n.tipo} — {n.evidencia}</div>
                  <div style={{ fontSize:11, color:C.gris4, marginTop:1 }}>{n.fecha}</div>
                </div>
              </div>
            ))}
            <div style={{ padding:"10px 16px", textAlign:"center" }}>
              <span onClick={()=>{ onNav("admin-notificaciones"); setNOpen(false); }} style={{ fontSize:12, color:C.verde, fontWeight:600, cursor:"pointer" }}>Ver todas</span>
            </div>
          </div>
        )}
      </div>
      {/* Profile */}
      <div style={{ position:"relative" }}>
        <div onClick={()=>{ setPOpen(!pOpen); setNOpen(false); }} style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", padding:"5px 9px", borderRadius:8, background:pOpen?C.gris1:"transparent" }}>
          <Avatar nombre={user.nombre} size={30}/>
          <div className="hide-mobile">
            <div style={{ fontSize:12, fontWeight:600, color:C.gris8, lineHeight:1.3 }}>{user.nombre.split(" ")[0]}</div>
            <div style={{ fontSize:10, color:C.gris5 }}>{user.rol}</div>
          </div>
          <ChevronDown size={13} color={C.gris4}/>
        </div>
        {pOpen && (
          <div style={{ position:"absolute", right:0, top:"calc(100%+6px)", width:195, ...s.card, overflow:"hidden", zIndex:100 }} className="fade-up">
            <div style={{ padding:"13px 15px", borderBottom:`1px solid ${C.gris1}` }}>
              <div style={{ fontSize:13, fontWeight:700, color:C.gris8 }}>{user.nombre}</div>
              <div style={{ fontSize:11, color:C.gris5, marginTop:1 }}>{user.correo}</div>
            </div>
            {[["Mi perfil",Users,null],["Cambiar contraseña",Lock,null]].map(([l,I])=>(
              <button key={l} style={{ width:"100%", padding:"10px 15px", background:"none", border:"none", cursor:"pointer", fontSize:13, color:C.gris7, textAlign:"left", display:"flex", gap:9, alignItems:"center" }}>
                <I size={14} color={C.gris5} strokeWidth={2}/>{l}
              </button>
            ))}
            <button onClick={onLogout} style={{ width:"100%", padding:"10px 15px", background:"none", border:"none", cursor:"pointer", fontSize:13, fontWeight:600, color:C.rojo, textAlign:"left", display:"flex", gap:9, alignItems:"center", borderTop:`1px solid ${C.gris1}` }}>
              <LogOut size={14} color={C.rojo} strokeWidth={2}/>Cerrar sesión
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

// ─── VISTA LOGIN ──────────────────────────────────────────────────────────────
const LoginView = ({ onLogin }) => {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [captcha, setCaptcha] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const CREDS = [
    { user:"admin@sena.edu.co",       pass:"admin123",  rol:"Administrativo", nombre:"Carlos Jiménez Vélez",  correo:"cjimenez@sena.edu.co" },
    { user:"contratista@sena.edu.co", pass:"cont123",   rol:"Contratista",    nombre:"Yuliana Bernal Torres", correo:"ybernal@sena.edu.co" },
    { user:"super@sena.edu.co",       pass:"super123",  rol:"Super Admin",    nombre:"Patricia Loaiza Soto",  correo:"ploaiza@sena.edu.co" },
  ];

  const submit = () => {
    if (!captcha) { setError("Complete la verificación de seguridad"); return; }
    const match = CREDS.find(c=>c.user===user && c.pass===pass);
    if (!match) { setError("Credenciales incorrectas. Verifique usuario y contraseña."); return; }
    setLoading(true);
    setTimeout(()=>onLogin(match), 900);
  };

  return (
    <div style={{ minHeight:"100vh", display:"grid", gridTemplateColumns:"1fr 1fr", background:"#fff" }}>
      {/* Panel izquierdo */}
      <div style={{ background:`linear-gradient(160deg, ${C.azul} 0%, ${C.azulMid} 60%, ${C.verde} 130%)`, padding:"40px 48px", display:"flex", flexDirection:"column", justifyContent:"space-between", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", inset:0, opacity:0.04 }}>
          {[200,300,420,550,680].map((r,i)=>(
            <div key={i} style={{ position:"absolute", width:r, height:r, borderRadius:"50%", border:"1.5px solid #fff", top:`${40-i*8}%`, left:`${-10+i*5}%` }}/>
          ))}
        </div>
        <div style={{ position:"relative" }}>
          <LogoSGFC dark/>
          <h1 style={{ fontSize:28, fontWeight:900, color:"#fff", marginTop:40, lineHeight:1.15, letterSpacing:"-0.5px" }}>
            Sistema de Gestión<br/>Financiera y<br/>Contractual
          </h1>
          <p style={{ color:"rgba(255,255,255,0.65)", marginTop:14, lineHeight:1.65, fontSize:13, maxWidth:340 }}>
            Plataforma institucional para la gestión, validación y seguimiento documental de contratistas del SENA Regional Caldas.
          </p>
          <div style={{ marginTop:28, display:"flex", flexDirection:"column", gap:10 }}>
            {[
              [CheckCircle,"Carga centralizada de evidencias por periodo"],
              [FileCheck,"Validación estructurada por módulos GF y GC"],
              [PenLine,"Firma digital de documentos unificados"],
              [BarChart2,"Seguimiento y reportes en tiempo real"],
            ].map(([Icon,t])=>(
              <div key={t} style={{ display:"flex", alignItems:"center", gap:10 }}>
                <Icon size={14} color={C.verde} strokeWidth={2.5}/>
                <span style={{ fontSize:13, color:"rgba(255,255,255,0.75)" }}>{t}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ position:"relative", fontSize:11, color:"rgba(255,255,255,0.3)" }}>
          SENA Regional Caldas — Centro Industrial y del Desarrollo Tecnológico
        </div>
      </div>
      {/* Panel derecho */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:"40px 24px" }}>
        <div style={{ width:"100%", maxWidth:400 }} className="fade-up">
          <div style={{ marginBottom:28 }}>
            <h2 style={{ fontSize:22, fontWeight:800, color:C.azul, letterSpacing:"-0.3px" }}>Iniciar sesión</h2>
            <p style={{ fontSize:13, color:C.gris5, marginTop:4 }}>Ingresa tus credenciales institucionales SENA</p>
          </div>
          {error && (
            <div style={{ background:C.rojoLight, border:`1px solid #FECACA`, borderRadius:8, padding:"10px 14px", display:"flex", gap:8, alignItems:"center", marginBottom:16 }}>
              <AlertCircle size={15} color={C.rojo} strokeWidth={2}/>
              <span style={{ fontSize:13, color:C.rojo, fontWeight:500 }}>{error}</span>
            </div>
          )}
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <Input label="Usuario institucional" type="email" placeholder="correo@sena.edu.co" value={user} onChange={e=>{setUser(e.target.value);setError("")}}/>
            <div>
              <label style={s.label}>Contraseña</label>
              <div style={{ position:"relative" }}>
                <input style={{ ...s.input, paddingRight:40 }} type={showPass?"text":"password"} placeholder="••••••••" value={pass} onChange={e=>{setPass(e.target.value);setError("")}} onKeyDown={e=>e.key==="Enter"&&submit()}
                  onFocus={e=>e.target.style.borderColor=C.verde} onBlur={e=>e.target.style.borderColor=C.gris2}/>
                <button onClick={()=>setShowPass(!showPass)} style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:C.gris4, display:"flex" }}>
                  {showPass ? <Eye size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>
            {/* Captcha simulado */}
            <label style={{ display:"flex", alignItems:"center", gap:10, background:C.gris0, border:`1px solid ${C.gris2}`, borderRadius:8, padding:"11px 14px", cursor:"pointer" }}>
              <input type="checkbox" checked={captcha} onChange={e=>setCaptcha(e.target.checked)} style={{ width:16, height:16, accentColor:C.verde, cursor:"pointer" }}/>
              <span style={{ fontSize:13, fontWeight:500, color:C.gris7, flex:1 }}>No soy un robot</span>
              <Shield size={22} color={C.gris3}/>
            </label>
            <button style={{ ...s.btnPrimary, width:"100%", justifyContent:"center", padding:"11px", fontSize:14, opacity:loading?0.7:1 }} onClick={submit} disabled={loading}>
              {loading ? <><RefreshCw size={14} style={{ animation:"spin 1s linear infinite" }}/> Autenticando...</> : <><ChevronRight size={14}/>Ingresar al sistema</>}
            </button>
            <div style={{ textAlign:"center" }}>
              <span style={{ fontSize:13, color:C.verde, fontWeight:600, cursor:"pointer" }}>¿Olvidaste tu contraseña?</span>
            </div>
          </div>
          {/* Credenciales demo */}
          <div style={{ marginTop:28, padding:"14px 16px", background:C.gris0, borderRadius:10, border:`1px solid ${C.gris2}` }}>
            <p style={{ fontSize:11, fontWeight:700, color:C.gris5, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:8 }}>Accesos de demostración</p>
            {[["Administrativo","admin@sena.edu.co","admin123"],["Contratista","contratista@sena.edu.co","cont123"],["Super Admin","super@sena.edu.co","super123"]].map(([r,u,p])=>(
              <div key={r} onClick={()=>{ setUser(u); setPass(p); }} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:`1px solid ${C.gris2}`, cursor:"pointer", fontSize:12 }}>
                <span style={{ fontWeight:600, color:C.azul }}>{r}</span>
                <span style={{ color:C.gris5 }}>{u}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── VISTAS ADMINISTRATIVO ────────────────────────────────────────────────────
const V_AdminDashboard = () => {
  const excelRows = [
    { c:"Yuliana Bernal",  GF:[true,true,"rev",null,null],  GC:[true,true,"rev",null,"rev",null,null,null,null,null], firma:"Firmado" },
    { c:"Andrés Giraldo",  GF:[true,null,true,null,null],   GC:[true,true,null,null,null,null,null,null,null,null], firma:"—" },
    { c:"Marcela Ospina",  GF:[true,true,true,null,null],   GC:[true,true,"rev",null,"rev","rev",null,null,null,null], firma:"Pendiente firma" },
    { c:"Sandra Castro",   GF:[null,null,null,null,null],   GC:[true,null,null,null,null,null,null,null,null,null], firma:"—" },
  ];

  const CeldaE = ({ v }) => {
    if (v===true)   return <div style={{ display:"flex", justifyContent:"center" }}><Check size={14} color={C.verde} strokeWidth={3}/></div>;
    if (v===false)  return <div style={{ display:"flex", justifyContent:"center" }}><X size={14} color={C.rojo} strokeWidth={3}/></div>;
    if (v==="rev")  return <div style={{ display:"flex", justifyContent:"center" }}><HelpCircle size={14} color={C.amarillo} strokeWidth={2.5}/></div>;
    return <div style={{ display:"flex", justifyContent:"center" }}><AlertTriangle size={12} color={C.naranja} strokeWidth={2}/></div>;
  };

  return (
    <div className="page-content">
      <SectionTitle title="Dashboard" subtitle="Seguimiento general — Mayo 2025"
        right={<>
          <Select style={{ width:150 }}><option>Mayo 2025</option><option>Abril 2025</option></Select>
          <Btn variant="ghost" icon={Download}>Exportar Excel</Btn>
        </>}
      />
      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(155px,1fr))", gap:12, marginBottom:20 }} className="col-4-resp">
        <KpiCard label="Contratistas activos"      value={4}  Icon={Users}           color={C.azul}/>
        <KpiCard label="Evidencias aprobadas"       value={18} Icon={CheckCircle}     color={C.verde}/>
        <KpiCard label="Pendiente revisión"         value={6}  Icon={HelpCircle}      color={C.amarillo}/>
        <KpiCard label="Pendiente entrega"          value={11} Icon={AlertTriangle}   color={C.naranja}/>
        <KpiCard label="Rechazadas"                 value={3}  Icon={XCircle}         color={C.rojo}/>
        <KpiCard label="Periodos firmados"          value={2}  Icon={FileSignature}   color={C.azulFirma}/>
        <KpiCard label="Pendiente firma"            value={1}  Icon={Clock}           color={C.agua}/>
      </div>
      {/* Charts row */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:20 }} className="col-2-resp">
        {/* Avance por contratista */}
        <div style={{ ...s.card, padding:18 }}>
          <h4 style={{ fontSize:14, fontWeight:700, color:C.azul, marginBottom:14 }}>Avance por contratista — Mayo 2025</h4>
          {CONTRATOS_DATA.filter(c=>c.estado==="Activo").map((c,i)=>{
            const u = USUARIOS_DATA.find(u=>u.id===c.contratistaId);
            const pct = [35,28,72,15,8][i]||30;
            return (
              <div key={c.id} style={{ marginBottom:12 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4, fontSize:12 }}>
                  <span style={{ fontWeight:500 }}>{u?.nombre.split(" ").slice(0,2).join(" ")}</span>
                  <span style={{ fontWeight:700, color: pct>=60?C.verde:pct>=40?C.amarillo:C.naranja }}>{pct}%</span>
                </div>
                <ProgressBar val={pct}/>
              </div>
            );
          })}
        </div>
        {/* Estado por módulo */}
        <div style={{ ...s.card, padding:18 }}>
          <h4 style={{ fontSize:14, fontWeight:700, color:C.azul, marginBottom:14 }}>Estado de evidencias por módulo</h4>
          {[
            { label:"GF — Gestión Financiera (5 tipos, 12 evid.)", apr:7, pend:3, rech:2, total:12, color:C.verde },
            { label:"GC — Gestión Contractual (10 tipos, 23 evid.)", apr:11, pend:8, rech:1, total:23, color:C.azul },
          ].map(m=>(
            <div key={m.label} style={{ marginBottom:16 }}>
              <div style={{ fontSize:12, fontWeight:600, marginBottom:6 }}>{m.label}</div>
              <div style={{ display:"flex", height:14, borderRadius:7, overflow:"hidden", gap:1 }}>
                <div style={{ flex:m.apr, background:C.verde }}/>
                <div style={{ flex:m.pend, background:C.amarillo }}/>
                <div style={{ flex:m.rech, background:C.rojo }}/>
                <div style={{ flex:m.total-m.apr-m.pend-m.rech, background:C.gris2 }}/>
              </div>
              <div style={{ display:"flex", gap:14, marginTop:5, fontSize:11 }}>
                <span style={{ color:C.verde, fontWeight:600 }}>{m.apr} aprobadas</span>
                <span style={{ color:C.amarillo, fontWeight:600 }}>{m.pend} pendientes</span>
                <span style={{ color:C.rojo, fontWeight:600 }}>{m.rech} rechazadas</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Tabla tipo Excel */}
      <div style={{ ...s.card, overflow:"hidden" }}>
        <div style={{ padding:"14px 18px", borderBottom:`1px solid ${C.gris2}`, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8 }}>
          <div>
            <h4 style={{ fontSize:14, fontWeight:700, color:C.azul }}>Lista de Chequeo — Evidencias por Contratista</h4>
            <p style={{ fontSize:11, color:C.gris5, marginTop:1 }}>Periodo: Mayo 2025 · Centro Industrial y del Desarrollo Tecnológico</p>
          </div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {[[CheckCircle,"Aprobada",C.verde],[HelpCircle,"Revisión",C.amarillo],[AlertTriangle,"Pendiente",C.naranja],[X,"Rechazada",C.rojo]].map(([I,l,c])=>(
              <span key={l} style={{ display:"flex", alignItems:"center", gap:4, fontSize:11, color:c, fontWeight:600 }}><I size={12}/>{l}</span>
            ))}
          </div>
        </div>
        <div style={{ overflowX:"auto" }}>
          <table style={{ borderCollapse:"collapse", width:"100%", minWidth:800, fontSize:12 }}>
            <thead>
              <tr>
                <th style={{ ...s.th, minWidth:170 }} rowSpan={2}>CONTRATISTA</th>
                <th style={{ ...s.th, background:"#F0FDF4", color:C.verde, textAlign:"center", borderBottom:"none" }} colSpan={5}>GF — GESTIÓN FINANCIERA</th>
                <th style={{ ...s.th, background:C.azulLight, color:C.azul, textAlign:"center", borderBottom:"none" }} colSpan={10}>GC — GESTIÓN CONTRACTUAL</th>
                <th style={{ ...s.th, textAlign:"center" }} rowSpan={2}>FIRMA</th>
              </tr>
              <tr>
                {["Planilla","Seg. Soc.","Cta. Cobro","Inf. Fin.","Bancarios"].map(h=>(
                  <th key={h} style={{ ...s.th, background:"#F0FDF4", fontSize:10, textAlign:"center", fontWeight:600 }}>{h}</th>
                ))}
                {["Acta Ini.","Prog. Form.","Ctrl. Asis.","Guías Ap.","Inf. Act.","Ejec. FPI","Juicios","Instr. Ev.","Plan Trab.","Sop. Cont."].map(h=>(
                  <th key={h} style={{ ...s.th, background:C.azulLight, fontSize:10, textAlign:"center", fontWeight:600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {excelRows.map((row,i)=>(
                <tr key={i} style={{ background: i%2===0?"#fff":C.gris0 }}>
                  <td style={{ ...s.td, fontWeight:600 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <Avatar nombre={row.c} size={24}/>
                      <span style={{ whiteSpace:"nowrap" }}>{row.c}</span>
                    </div>
                  </td>
                  {row.GF.map((v,j)=><td key={j} style={{ ...s.td, textAlign:"center" }}><CeldaE v={v}/></td>)}
                  {row.GC.map((v,j)=><td key={j} style={{ ...s.td, textAlign:"center" }}><CeldaE v={v}/></td>)}
                  <td style={{ ...s.td, textAlign:"center" }}>
                    {row.firma==="Firmado" ? <Badge estado="Firmado" small/> : row.firma==="Pendiente firma" ? <Badge estado="Pendiente firma" small/> : <span style={{ color:C.gris3, fontSize:11 }}>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const V_AdminUsuarios = () => {
  const [search, setSearch] = useState("");
  const [rolF, setRolF] = useState("Todos");
  const [estF, setEstF] = useState("Todos");
  const [modal, setModal] = useState(false);
  const items = USUARIOS_DATA.filter(u=>
    (rolF==="Todos"||u.rol===rolF) &&
    (estF==="Todos"||u.estado===estF) &&
    (u.nombre.toLowerCase().includes(search.toLowerCase())||u.correo.toLowerCase().includes(search.toLowerCase()))
  );
  return (
    <div className="page-content">
      <SectionTitle title="Gestión de Usuarios" subtitle="Administración de contratistas y administrativos" right={<Btn icon={UserPlus} onClick={()=>setModal(true)}>Nuevo Usuario</Btn>}/>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:18 }} className="col-4-resp">
        <KpiCard label="Total usuarios"  value={USUARIOS_DATA.length} Icon={Users} color={C.azul}/>
        <KpiCard label="Contratistas"    value={USUARIOS_DATA.filter(u=>u.rol==="Contratista").length} Icon={Briefcase} color={C.verde}/>
        <KpiCard label="Administrativos" value={USUARIOS_DATA.filter(u=>u.rol==="Administrativo").length} Icon={Shield} color={C.morado}/>
        <KpiCard label="Inactivos"       value={USUARIOS_DATA.filter(u=>u.estado==="Inactivo").length} Icon={Lock} color={C.gris5}/>
      </div>
      <div style={{ ...s.card, padding:"12px 16px", marginBottom:14, display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>
        <div style={{ flex:1, minWidth:180, position:"relative" }}>
          <Search size={14} color={C.gris4} style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)" }}/>
          <input style={{ ...s.input, paddingLeft:32 }} placeholder="Buscar por nombre o correo..." value={search} onChange={e=>setSearch(e.target.value)}
            onFocus={e=>e.target.style.borderColor=C.verde} onBlur={e=>e.target.style.borderColor=C.gris2}/>
        </div>
        <Select style={{ width:155 }} value={rolF} onChange={e=>setRolF(e.target.value)}>
          <option>Todos</option><option>Contratista</option><option>Administrativo</option>
        </Select>
        <Select style={{ width:130 }} value={estF} onChange={e=>setEstF(e.target.value)}>
          <option>Todos</option><option>Activo</option><option>Inactivo</option>
        </Select>
      </div>
      <div style={{ ...s.card, overflow:"hidden" }}>
        <div style={{ overflowX:"auto" }}>
          <table style={{ borderCollapse:"collapse", width:"100%" }}>
            <thead><tr>
              {["Usuario","Documento","Correo","Rol","Contrato","Estado","Último acceso","Acciones"].map(h=>
                <th key={h} style={s.th}>{h}</th>
              )}
            </tr></thead>
            <tbody>
              {items.map(u=>{
                const ct = CONTRATOS_DATA.find(c=>c.id===u.contratoId);
                return (
                  <tr key={u.id} style={{ background:"#fff" }} onMouseEnter={e=>e.currentTarget.style.background=C.gris0} onMouseLeave={e=>e.currentTarget.style.background="#fff"}>
                    <td style={s.td}><div style={{ display:"flex", alignItems:"center", gap:9 }}><Avatar nombre={u.nombre} size={30}/><span style={{ fontWeight:600 }}>{u.nombre}</span></div></td>
                    <td style={{ ...s.td, color:C.gris5 }}>{u.doc}</td>
                    <td style={{ ...s.td, color:C.azul, fontWeight:500 }}>{u.correo}</td>
                    <td style={s.td}>
                      <span style={{ padding:"2px 9px", borderRadius:20, fontSize:11, fontWeight:700, background: u.rol==="Contratista"?C.azulLight:C.moradoLight, color: u.rol==="Contratista"?C.azul:C.morado }}>
                        {u.rol}
                      </span>
                    </td>
                    <td style={{ ...s.td, fontSize:12, fontWeight:500, color:C.azul }}>{ct?`#${ct.numero}`:"—"}</td>
                    <td style={s.td}><Badge estado={u.estado} small/></td>
                    <td style={{ ...s.td, fontSize:12, color:C.gris5 }}>{u.ultimo}</td>
                    <td style={s.td}>
                      <div style={{ display:"flex", gap:5 }}>
                        <Btn variant="ghost" icon={Eye} small>Ver</Btn>
                        <Btn variant="ghost" icon={Edit} small>Editar</Btn>
                        <Btn variant={u.estado==="Activo"?"danger":"ghost"} icon={u.estado==="Activo"?Lock:Check} small>{u.estado==="Activo"?"Inactivar":"Activar"}</Btn>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {modal && (
        <Modal title="Crear nuevo usuario" onClose={()=>setModal(false)}>
          <div style={{ display:"flex", flexDirection:"column", gap:13 }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <Input label="Nombres"/>
              <Input label="Apellidos"/>
            </div>
            <Input label="Número de documento"/>
            <Input label="Correo institucional" type="email" placeholder="correo@sena.edu.co"/>
            <Select label="Rol">
              <option>Contratista</option><option>Administrativo</option>
            </Select>
            <Select label="Contrato activo (si aplica)">
              <option value="">— Sin contrato —</option>
              {CONTRATOS_DATA.map(c=><option key={c.id}>{c.numero}</option>)}
            </Select>
            <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:4 }}>
              <Btn variant="sec" onClick={()=>setModal(false)}>Cancelar</Btn>
              <Btn icon={Check} onClick={()=>setModal(false)}>Crear usuario</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

const V_AdminEvidencias = () => {
  const [selMod, setSelMod] = useState("GF");
  const [selTipo, setSelTipo] = useState(null);
  const [modal, setModal] = useState(null);
  const mod = MODULOS.find(m=>m.id===selMod);

  return (
    <div className="page-content">
      <SectionTitle title="Tipos de Evidencias" subtitle="Configuración jerárquica: Módulo → Tipo → Evidencias" right={<><Btn variant="sec" icon={Plus}>Nuevo Tipo</Btn><Btn icon={Plus} onClick={()=>setModal("ev")}>Nueva Evidencia</Btn></>}/>
      <div style={{ display:"grid", gridTemplateColumns:"260px 1fr", gap:14 }} className="col-2-resp">
        {/* Árbol */}
        <div style={{ ...s.card, padding:14, height:"fit-content" }}>
          <p style={{ fontSize:11, fontWeight:700, color:C.gris5, textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:10 }}>Estructura jerárquica</p>
          {MODULOS.map(m=>(
            <div key={m.id}>
              <button onClick={()=>{ setSelMod(m.id); setSelTipo(null); }} style={{ width:"100%", display:"flex", alignItems:"center", gap:8, padding:"8px 10px", borderRadius:8, border:"none", background: selMod===m.id?m.bgColor:"transparent", cursor:"pointer", textAlign:"left", marginBottom:1 }}>
                <div style={{ width:6, height:6, borderRadius:2, background:m.color, flexShrink:0 }}/>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:m.color }}>{m.id}</div>
                  <div style={{ fontSize:11, color:C.gris5 }}>{m.nombre}</div>
                </div>
                {selMod===m.id ? <ChevronDown size={13} color={C.gris4}/> : <ChevronRight size={13} color={C.gris4}/>}
              </button>
              {selMod===m.id && m.tipos.map(t=>(
                <div key={t.id} style={{ paddingLeft:16, marginBottom:1 }}>
                  <button onClick={()=>setSelTipo(selTipo===t.id?null:t.id)} style={{ width:"100%", display:"flex", alignItems:"center", gap:7, padding:"6px 10px", borderRadius:7, border:"none", background: selTipo===t.id?m.bgColor:"transparent", cursor:"pointer", textAlign:"left" }}>
                    <ChevronRight size={11} color={selTipo===t.id?m.color:C.gris4} style={{ transform:selTipo===t.id?"rotate(90deg)":"none", transition:"transform 0.2s" }}/>
                    <span style={{ fontSize:12, fontWeight: selTipo===t.id?600:400, color: selTipo===t.id?C.gris8:C.gris6, flex:1 }}>{t.nombre}</span>
                    <span style={{ fontSize:10, color:C.gris4, background:C.gris1, padding:"0 5px", borderRadius:10 }}>{t.evidencias.length}</span>
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>
        {/* Tabla */}
        <div>
          <div style={{ marginBottom:10, padding:"10px 14px", background:mod?.bgColor, borderRadius:10, border:`1px solid ${mod?.color}30`, display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:8, height:8, borderRadius:2, background:mod?.color }}/>
            <span style={{ fontSize:13, fontWeight:700, color:mod?.color }}>Módulo {selMod} — {mod?.nombre}</span>
            {selTipo && <><ChevronRight size={12} color={C.gris4}/><span style={{ fontSize:12, color:C.gris6, fontWeight:500 }}>{mod?.tipos.find(t=>t.id===selTipo)?.nombre}</span></>}
          </div>
          <div style={{ ...s.card, overflow:"hidden" }}>
            <div style={{ overflowX:"auto" }}>
              <table style={{ borderCollapse:"collapse", width:"100%" }}>
                <thead><tr>
                  {["Evidencia","Tipo","Obligatoria","Estado","Acciones"].map(h=><th key={h} style={s.th}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {mod?.tipos.filter(t=>!selTipo||t.id===selTipo).flatMap(t=>
                    t.evidencias.map(ev=>(
                      <tr key={ev.id} style={{ background:"#fff" }} onMouseEnter={e=>e.currentTarget.style.background=C.gris0} onMouseLeave={e=>e.currentTarget.style.background="#fff"}>
                        <td style={s.td}>
                          <div style={{ fontWeight:600, fontSize:13 }}>{ev.nombre}</div>
                          <div style={{ fontSize:11, color:C.gris5, marginTop:1 }}>{t.nombre} · {ev.id}</div>
                        </td>
                        <td style={s.td}><span style={{ background:C.azulLight, color:C.azul, padding:"2px 8px", borderRadius:20, fontSize:11, fontWeight:600 }}>PDF</span></td>
                        <td style={s.td}>{ev.obligatoria ? <span style={{ background:C.verdeLight, color:C.verde, padding:"2px 9px", borderRadius:20, fontSize:11, fontWeight:700 }}>Obligatoria</span> : <span style={{ background:C.gris1, color:C.gris5, padding:"2px 9px", borderRadius:20, fontSize:11 }}>Opcional</span>}</td>
                        <td style={s.td}><Badge estado="Activo" small/></td>
                        <td style={s.td}><div style={{ display:"flex", gap:5 }}><Btn variant="ghost" icon={Edit} small>Editar</Btn><Btn variant="danger" icon={Trash2} small/></div></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      {modal==="ev" && (
        <Modal title="Nueva Evidencia" onClose={()=>setModal(null)}>
          <div style={{ display:"flex", flexDirection:"column", gap:13 }}>
            <Input label="Nombre de la evidencia" placeholder="Ej: Planilla de pago de honorarios del mes"/>
            <div>
              <label style={s.label}>Descripción</label>
              <textarea style={{ ...s.input, resize:"vertical" }} rows={2} placeholder="¿Qué debe subir el contratista?"/>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <Select label="Módulo"><option>GF — Gestión Financiera</option><option>GC — Gestión Contractual</option></Select>
              <Select label="Tipo">{MODULOS.find(m=>m.id==="GF")?.tipos.map(t=><option key={t.id}>{t.nombre}</option>)}</Select>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <Select label="Tipo de archivo"><option>PDF</option><option>PDF, JPG</option></Select>
              <Select label="Obligatoriedad"><option>Obligatoria</option><option>Opcional</option></Select>
            </div>
            <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
              <Btn variant="sec" onClick={()=>setModal(null)}>Cancelar</Btn>
              <Btn icon={Check} onClick={()=>setModal(null)}>Crear evidencia</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

const V_AdminContratos = () => {
  const [selC, setSelC] = useState(null);
  const [selP, setSelP] = useState(null);
  const ct = selC ? CONTRATOS_DATA.find(c=>c.id===selC) : null;
  const ctUser = ct ? USUARIOS_DATA.find(u=>u.id===ct.contratistaId) : null;

  return (
    <div className="page-content">
      {!selC ? (
        <>
          <SectionTitle title="Contratos y Periodos" subtitle="Visualización de contratos. Configuración de periodos disponible."/>
          <div style={{ display:"flex", alignItems:"center", gap:8, padding:"9px 14px", background:C.amarilloLight, border:`1px solid #FDE047`, borderRadius:8, marginBottom:16, fontSize:13, color:C.amarillo }}>
            <AlertCircle size={14} strokeWidth={2}/>
            <span>Los contratos son <strong>creados y editados exclusivamente por el Super Admin</strong>. El administrativo puede consultar y configurar periodos.</span>
          </div>
          <div style={{ ...s.card, overflow:"hidden" }}>
            <div style={{ overflowX:"auto" }}>
              <table style={{ borderCollapse:"collapse", width:"100%" }}>
                <thead><tr>{["Contrato","Contratista","Vigencia","Estado","Períodos","Acciones"].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {CONTRATOS_DATA.map(c=>{
                    const u=USUARIOS_DATA.find(x=>x.id===c.contratistaId);
                    return (
                      <tr key={c.id} style={{ background:"#fff" }} onMouseEnter={e=>e.currentTarget.style.background=C.gris0} onMouseLeave={e=>e.currentTarget.style.background="#fff"}>
                        <td style={s.td}><span style={{ fontWeight:800, color:C.azul }}>#{c.numero}</span></td>
                        <td style={s.td}><div style={{ display:"flex", alignItems:"center", gap:8 }}><Avatar nombre={u?.nombre||""} size={28}/><div><div style={{ fontWeight:600, fontSize:13 }}>{u?.nombre}</div><div style={{ fontSize:11, color:C.gris5 }}>{u?.correo}</div></div></div></td>
                        <td style={{ ...s.td, fontSize:12, color:C.gris5 }}>{c.inicio} — {c.fin}</td>
                        <td style={s.td}><Badge estado={c.estado} small/></td>
                        <td style={{ ...s.td, textAlign:"center", fontWeight:700 }}>12</td>
                        <td style={s.td}><Btn variant="sec" icon={ChevronRight} small onClick={()=>setSelC(c.id)}>Ver periodos</Btn></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <>
          <button onClick={()=>{ setSelC(null); setSelP(null); }} style={{ display:"inline-flex", alignItems:"center", gap:6, background:"none", border:"none", color:C.verde, fontWeight:600, fontSize:13, cursor:"pointer", marginBottom:14 }}>
            <ChevronLeft size={14}/>Volver a contratos
          </button>
          <div style={{ ...s.card, padding:"16px 20px", marginBottom:16, display:"flex", gap:20, flexWrap:"wrap" }}>
            {[["Contrato",`#${ct.numero}`],["Contratista",ctUser?.nombre],["Vigencia",`${ct.inicio} — ${ct.fin}`],["Estado",null]].map(([k,v])=>(
              <div key={k}>
                <div style={{ fontSize:10, fontWeight:700, color:C.gris4, textTransform:"uppercase", letterSpacing:"0.6px" }}>{k}</div>
                {k==="Estado" ? <Badge estado={ct.estado}/> : <div style={{ fontSize:14, fontWeight:700, color:C.gris8, marginTop:2 }}>{v}</div>}
              </div>
            ))}
          </div>
          <h4 style={{ fontSize:14, fontWeight:700, color:C.azul, marginBottom:12 }}>Periodos del contrato</h4>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(185px,1fr))", gap:10, marginBottom:16 }}>
            {PERIODOS_DATA.map(p=>{
              const bloq = p.estado==="Bloqueado";
              const act = selP===p.id;
              return (
                <div key={p.id} onClick={()=>!bloq&&setSelP(act?null:p.id)} style={{ ...s.card, padding:14, opacity:bloq?0.5:1, cursor:bloq?"not-allowed":"pointer", border:act?`2px solid ${C.verde}`:`1px solid ${C.gris2}`, transition:"all 0.15s" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                    <span style={{ fontSize:13, fontWeight:700 }}>{p.mes}</span>
                    {bloq && <Lock size={13} color={C.gris4}/>}
                  </div>
                  <Badge estado={p.estado} small/>
                  {!bloq && <div style={{ marginTop:10 }}><ProgressBar val={p.avance}/></div>}
                  {!bloq && p.limite!=="—" && <div style={{ fontSize:10, color:C.gris5, marginTop:5 }}>Límite: {p.limite}</div>}
                </div>
              );
            })}
          </div>
          {selP && (() => {
            const p = PERIODOS_DATA.find(x=>x.id===selP);
            return (
              <div style={{ ...s.card, padding:20 }} className="fade-up">
                <h4 style={{ fontSize:14, fontWeight:700, color:C.azul, marginBottom:16 }}>Configurar período — {p.mes}</h4>
                <div style={{ marginBottom:16 }}>
                  <label style={s.label}>Fecha límite de entrega</label>
                  <input type="date" style={{ ...s.input, width:200 }} defaultValue={p.limite==="—"?"":p.limite}
                    onFocus={e=>e.target.style.borderColor=C.verde} onBlur={e=>e.target.style.borderColor=C.gris2}/>
                </div>
                <h5 style={{ fontSize:13, fontWeight:700, color:C.gris7, marginBottom:10 }}>Evidencias requeridas en este periodo:</h5>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }} className="col-2-resp">
                  {MODULOS.flatMap(m=>m.tipos.flatMap(t=>t.evidencias.filter(e=>e.obligatoria))).slice(0,8).map(ev=>(
                    <label key={ev.id} style={{ display:"flex", alignItems:"flex-start", gap:9, padding:"9px 12px", border:`1px solid ${C.gris2}`, borderRadius:8, cursor:"pointer", fontSize:12 }}>
                      <input type="checkbox" defaultChecked style={{ width:14, height:14, accentColor:C.verde, cursor:"pointer", marginTop:1 }}/>
                      <span style={{ fontWeight:500, color:C.gris7 }}>{ev.nombre}</span>
                    </label>
                  ))}
                </div>
                <div style={{ marginTop:14 }}><Btn icon={Check}>Guardar configuración del periodo</Btn></div>
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
};

const V_AdminNotificaciones = () => {
  const [filt, setFilt] = useState("Todas");
  const tipos = ["Todas","No leídas","Evidencia cargada","Evidencia corregida","PDF para firma","Periodo por vencer"];
  const visible = filt==="Todas" ? NOTIF_ADMIN : filt==="No leídas" ? NOTIF_ADMIN.filter(n=>!n.leida) : NOTIF_ADMIN.filter(n=>n.tipo===filt);
  const iconMap = { "Evidencia cargada":FileText,"Evidencia corregida":RefreshCw,"PDF para firma":FileSignature,"Periodo por vencer":AlertTriangle };
  const colorMap = { "Evidencia cargada":C.verde,"Evidencia corregida":C.azul,"PDF para firma":C.azulFirma,"Periodo por vencer":C.naranja };

  return (
    <div className="page-content">
      <SectionTitle title="Centro de Notificaciones" subtitle={`${NOTIF_ADMIN.filter(n=>!n.leida).length} sin leer`} right={<Btn variant="ghost" icon={Check}>Marcar todas leídas</Btn>}/>
      <div style={{ display:"flex", gap:6, marginBottom:18, flexWrap:"wrap" }}>
        {tipos.map(t=>(
          <button key={t} onClick={()=>setFilt(t)} style={{ padding:"5px 13px", borderRadius:20, border:`1.5px solid ${filt===t?C.verde:C.gris2}`, background:filt===t?C.verde:"#fff", color:filt===t?"#fff":C.gris6, fontSize:12, fontWeight:500, cursor:"pointer", transition:"all 0.15s" }}>{t}</button>
        ))}
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {visible.map(n=>{
          const NIcon = iconMap[n.tipo]||Bell;
          const color = colorMap[n.tipo]||C.verde;
          return (
            <div key={n.id} style={{ ...s.card, padding:"14px 18px", display:"flex", gap:12, alignItems:"center", background:n.leida?"#fff":C.verdeLight, borderLeft:`3px solid ${n.leida?C.gris2:color}` }}>
              <div style={{ width:36, height:36, borderRadius:9, background:`${color}15`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <NIcon size={16} color={color} strokeWidth={2}/>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
                  <span style={{ fontSize:13, fontWeight:700 }}>{n.contratista}</span>
                  <span style={{ fontSize:11, background:`${color}15`, color, padding:"1px 8px", borderRadius:20, fontWeight:600 }}>{n.tipo}</span>
                  {!n.leida && <span style={{ fontSize:10, background:C.rojo, color:"#fff", padding:"1px 6px", borderRadius:20, fontWeight:700 }}>NUEVA</span>}
                </div>
                <div style={{ fontSize:12, color:C.gris5, marginTop:3 }}>
                  <span style={{ fontWeight:500 }}>{n.evidencia}</span> · {n.periodo} · {n.fecha}
                </div>
              </div>
              <Btn variant="sec" icon={ChevronRight} small>Ir a revisión</Btn>
            </div>
          );
        })}
        {visible.length===0 && <div style={{ textAlign:"center", padding:40, color:C.gris4 }}><Inbox size={32} strokeWidth={1.5} style={{ margin:"0 auto 12px", display:"block" }}/><p style={{ fontSize:14, fontWeight:500 }}>Sin notificaciones en este filtro</p></div>}
      </div>
    </div>
  );
};

const V_AdminRevision = () => {
  const [tab, setTab] = useState("Pendiente revisión");
  const [sel, setSel] = useState(null);
  const [rejectModal, setRejectModal] = useState(false);
  const [comment, setComment] = useState("");
  const tabs = [
    { k:"Pendiente revisión", label:"Pendiente revisión" },
    { k:"Rechazada",          label:"Rechazadas" },
    { k:"Aprobada",           label:"Aprobadas" },
  ];
  const list = REVISION_DATA.filter(e=>e.estado===tab);

  return (
    <div className="page-content">
      <SectionTitle title="Revisión de Evidencias" subtitle="Aprobación y rechazo de documentos por contratista"/>
      <div style={{ borderBottom:`1px solid ${C.gris2}`, marginBottom:16, display:"flex", gap:0 }}>
        {tabs.map(t=>{
          const cnt = REVISION_DATA.filter(e=>e.estado===t.k).length;
          return (
            <button key={t.k} onClick={()=>{ setTab(t.k); setSel(null); }} style={{ padding:"9px 18px", border:"none", borderBottom:`2px solid ${tab===t.k?C.verde:"transparent"}`, background:"transparent", color:tab===t.k?C.verde:C.gris5, fontFamily:"'Work Sans',sans-serif", fontSize:13, fontWeight:tab===t.k?700:500, cursor:"pointer", display:"flex", gap:6, alignItems:"center" }}>
              {t.label}{cnt>0&&<span style={{ background:tab===t.k?C.verde:C.gris2, color:tab===t.k?"#fff":C.gris5, borderRadius:20, fontSize:10, padding:"0 6px", lineHeight:"16px" }}>{cnt}</span>}
            </button>
          );
        })}
      </div>
      {/* Filtros */}
      <div style={{ display:"flex", gap:10, marginBottom:14, flexWrap:"wrap" }}>
        <Select style={{ width:180 }}><option>Todos los contratos</option>{CONTRATOS_DATA.map(c=><option key={c.id}>{c.numero}</option>)}</Select>
        <Select style={{ width:200 }}><option>Todos los contratistas</option>{USUARIOS_DATA.filter(u=>u.rol==="Contratista").map(u=><option key={u.id}>{u.nombre}</option>)}</Select>
        <Select style={{ width:150 }}><option>Todos los módulos</option><option>GF</option><option>GC</option></Select>
      </div>
      {sel ? (
        <div style={{ ...s.card, overflow:"hidden" }} className="fade-up">
          <div style={{ padding:"12px 18px", borderBottom:`1px solid ${C.gris2}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <button onClick={()=>setSel(null)} style={{ display:"inline-flex", alignItems:"center", gap:5, background:"none", border:"none", color:C.verde, fontWeight:600, fontSize:13, cursor:"pointer" }}><ChevronLeft size={14}/>Volver a lista</button>
            {sel.estado==="Pendiente revisión" && (
              <div style={{ display:"flex", gap:8 }}>
                <Btn icon={CheckCircle} onClick={()=>{ alert("Evidencia aprobada"); setSel(null); }}>Aprobar</Btn>
                <Btn variant="danger" icon={XCircle} onClick={()=>setRejectModal(true)}>Rechazar</Btn>
              </div>
            )}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 300px" }} className="col-2-resp">
            {/* PDF viewer simulado */}
            <div style={{ padding:20, borderRight:`1px solid ${C.gris2}`, minHeight:420, display:"flex", flexDirection:"column", gap:0 }}>
              <div style={{ background:C.gris0, border:`1px solid ${C.gris2}`, borderRadius:10, flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:12, padding:32 }}>
                <div style={{ width:56, height:72, background:C.rojoLight, borderRadius:8, border:`1px solid #FECACA`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <FileText size={28} color={C.rojo} strokeWidth={1.5}/>
                </div>
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontSize:14, fontWeight:700, color:C.azul }}>{sel.evidencia}</div>
                  <div style={{ fontSize:12, color:C.gris5, marginTop:3 }}>Archivo PDF · 2.3 MB</div>
                </div>
                <div style={{ padding:"14px 24px", background:"#fff", borderRadius:8, border:`1px solid ${C.gris2}`, textAlign:"center", width:"100%", maxWidth:300 }}>
                  <p style={{ fontSize:11, color:C.gris4, marginBottom:8 }}>Visor de documento embebido</p>
                  <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                    {[1,2,3].map(n=><div key={n} style={{ height:10, background:C.gris1, borderRadius:4 }}/>)}
                  </div>
                </div>
                <Btn variant="ghost" icon={Download}>Descargar PDF</Btn>
              </div>
            </div>
            {/* Panel info */}
            <div style={{ padding:20 }}>
              <h5 style={{ fontSize:13, fontWeight:700, color:C.azul, marginBottom:14 }}>Información</h5>
              {[["Contratista",sel.contratista],["Contrato",`#${sel.contrato}`],["Período",sel.periodo],["Módulo",sel.modulo],["Tipo",sel.tipo],["Evidencia",sel.evidencia],["Fecha carga",sel.fecha]].map(([k,v])=>(
                <div key={k} style={{ marginBottom:10, paddingBottom:10, borderBottom:`1px solid ${C.gris1}` }}>
                  <div style={{ fontSize:10, fontWeight:700, color:C.gris4, textTransform:"uppercase", letterSpacing:"0.5px" }}>{k}</div>
                  <div style={{ fontSize:13, fontWeight:500, marginTop:2 }}>{v}</div>
                </div>
              ))}
              <Badge estado={sel.estado}/>
              <div style={{ marginTop:16 }}>
                <h6 style={{ fontSize:12, fontWeight:700, color:C.gris7, marginBottom:8 }}>Historial de acciones</h6>
                {[["Cargada por contratista",sel.fecha,C.verde],["En revisión",sel.fecha,C.amarillo]].map(([a,f,c])=>(
                  <div key={a} style={{ display:"flex", gap:8, marginBottom:8, fontSize:12 }}>
                    <div style={{ width:7, height:7, borderRadius:"50%", background:c, marginTop:4, flexShrink:0 }}/>
                    <div><div style={{ fontWeight:500 }}>{a}</div><div style={{ color:C.gris4, fontSize:11 }}>{f}</div></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ ...s.card, overflow:"hidden" }}>
          <div style={{ overflowX:"auto" }}>
            <table style={{ borderCollapse:"collapse", width:"100%" }}>
              <thead><tr>{["Contratista","Contrato","Período","Módulo","Tipo","Evidencia","Fecha","Estado","Acciones"].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
              <tbody>
                {list.length===0 ? (
                  <tr><td colSpan={9} style={{ textAlign:"center", padding:32, color:C.gris4, fontSize:13 }}>Sin evidencias en este estado</td></tr>
                ) : list.map(e=>(
                  <tr key={e.id} style={{ background:"#fff" }} onMouseEnter={ev=>ev.currentTarget.style.background=C.gris0} onMouseLeave={ev=>ev.currentTarget.style.background="#fff"}>
                    <td style={s.td}><div style={{ display:"flex", alignItems:"center", gap:7 }}><Avatar nombre={e.contratista} size={26}/><span style={{ fontWeight:600, fontSize:12 }}>{e.contratista.split(" ").slice(0,2).join(" ")}</span></div></td>
                    <td style={{ ...s.td, fontWeight:700, color:C.azul, fontSize:12 }}>#{e.contrato}</td>
                    <td style={{ ...s.td, fontSize:12 }}>{e.periodo}</td>
                    <td style={s.td}><span style={{ padding:"1px 7px", borderRadius:20, fontSize:11, fontWeight:700, background:e.modulo==="GF"?C.verdeLight:C.azulLight, color:e.modulo==="GF"?C.verde:C.azul }}>{e.modulo}</span></td>
                    <td style={{ ...s.td, fontSize:12, maxWidth:130 }}><span style={{ display:"block", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{e.tipo}</span></td>
                    <td style={{ ...s.td, fontSize:12, maxWidth:180 }}><span style={{ display:"block", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{e.evidencia}</span></td>
                    <td style={{ ...s.td, fontSize:11, color:C.gris5 }}>{e.fecha}</td>
                    <td style={s.td}><Badge estado={e.estado} small/></td>
                    <td style={s.td}>
                      <div style={{ display:"flex", gap:4 }}>
                        <Btn variant="ghost" icon={Eye} small onClick={()=>setSel(e)}>Ver</Btn>
                        {e.estado==="Pendiente revisión" && <><Btn icon={Check} small onClick={()=>alert("Aprobada")}>✓</Btn><Btn variant="danger" icon={X} small onClick={()=>{ setSel(e); setRejectModal(true); }}/></>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {rejectModal && (
        <Modal title="Rechazar evidencia" onClose={()=>setRejectModal(false)}>
          <div style={{ background:C.rojoLight, border:`1px solid #FECACA`, borderRadius:8, padding:"10px 14px", marginBottom:14, display:"flex", gap:8, fontSize:12, color:C.rojo }}>
            <AlertCircle size={14} strokeWidth={2}/> Debe ingresar un comentario para el contratista explicando el motivo del rechazo.
          </div>
          <label style={s.label}>Motivo del rechazo *</label>
          <textarea style={{ ...s.input, resize:"vertical" }} rows={4} value={comment} onChange={e=>setComment(e.target.value)} placeholder="Ej: El documento está incompleto, falta la firma del responsable. Por favor adjunte el documento con las firmas correspondientes..."/>
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:14 }}>
            <Btn variant="sec" onClick={()=>{ setRejectModal(false); setComment(""); }}>Cancelar</Btn>
            <Btn variant="danger" icon={XCircle} onClick={()=>{ alert("Evidencia rechazada"); setRejectModal(false); setSel(null); setComment(""); }} disabled={!comment.trim()}>Confirmar rechazo</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};

const V_AdminFirmas = () => {
  const [tab, setTab] = useState("Pendientes");
  const [firmaModal, setFirmaModal] = useState(null);
  const pend = PDFS_FIRMA_DATA.filter(p=>p.estado==="Pendiente firma");
  const signed = PDFS_FIRMA_DATA.filter(p=>p.estado==="Firmado");

  return (
    <div className="page-content">
      <SectionTitle title="Firma de Documentos" subtitle="Revisión y firma de PDFs unificados por periodo"/>
      <div style={{ borderBottom:`1px solid ${C.gris2}`, marginBottom:18, display:"flex", gap:0 }}>
        {[["Pendientes",pend.length],["Firmados",signed.length]].map(([l,cnt])=>(
          <button key={l} onClick={()=>setTab(l)} style={{ padding:"9px 18px", border:"none", borderBottom:`2px solid ${tab===l?C.verde:"transparent"}`, background:"transparent", color:tab===l?C.verde:C.gris5, fontFamily:"'Work Sans',sans-serif", fontSize:13, fontWeight:tab===l?700:500, cursor:"pointer", display:"flex", gap:6, alignItems:"center" }}>
            {l}<span style={{ background:tab===l?C.verde:C.gris2, color:tab===l?"#fff":C.gris5, borderRadius:20, fontSize:10, padding:"0 6px", lineHeight:"16px" }}>{cnt}</span>
          </button>
        ))}
      </div>
      {tab==="Pendientes" ? (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {pend.map(p=>(
            <div key={p.id} style={{ ...s.card, padding:"16px 20px", display:"flex", gap:14, alignItems:"center", borderLeft:`3px solid ${C.agua}` }}>
              <div style={{ width:42, height:42, borderRadius:10, background:C.aguaLight, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <FileStack size={20} color={C.agua} strokeWidth={1.5}/>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:700 }}>{p.contratista}</div>
                <div style={{ fontSize:12, color:C.gris5, marginTop:1 }}>Contrato #{p.contrato} · Período: {p.periodo} · Generado: {p.generado}</div>
                <Badge estado="Pendiente firma" small/>
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <Btn variant="ghost" icon={Eye}>Ver PDF</Btn>
                <Btn icon={PenLine} onClick={()=>setFirmaModal(p)}>Firmar</Btn>
              </div>
            </div>
          ))}
          {pend.length===0 && <div style={{ textAlign:"center", padding:40, color:C.gris4 }}><CheckCircle size={32} strokeWidth={1.5} style={{ margin:"0 auto 12px", display:"block" }}/><p style={{ fontSize:14, fontWeight:500 }}>Sin documentos pendientes por firmar</p></div>}
        </div>
      ) : (
        <div style={{ ...s.card, overflow:"hidden" }}>
          <div style={{ overflowX:"auto" }}>
            <table style={{ borderCollapse:"collapse", width:"100%" }}>
              <thead><tr>{["Contratista","Contrato","Período","Fecha firma","Estado","Acciones"].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
              <tbody>
                {signed.map(p=>(
                  <tr key={p.id} style={{ background:"#fff" }} onMouseEnter={e=>e.currentTarget.style.background=C.gris0} onMouseLeave={e=>e.currentTarget.style.background="#fff"}>
                    <td style={s.td}><div style={{ display:"flex", alignItems:"center", gap:8 }}><Avatar nombre={p.contratista} size={28}/><span style={{ fontWeight:600, fontSize:13 }}>{p.contratista}</span></div></td>
                    <td style={{ ...s.td, fontWeight:700, color:C.azul }}>#{p.contrato}</td>
                    <td style={s.td}>{p.periodo}</td>
                    <td style={{ ...s.td, fontSize:12, color:C.gris5 }}>{p.firmado}</td>
                    <td style={s.td}><Badge estado="Firmado" small/></td>
                    <td style={s.td}><div style={{ display:"flex", gap:6 }}><Btn variant="ghost" icon={Eye} small>Ver</Btn><Btn icon={Download} small>Descargar</Btn><Btn variant="sec" icon={Send} small>Reenviar</Btn></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {firmaModal && (
        <Modal title={`Firmar documento — ${firmaModal.contratista}`} onClose={()=>setFirmaModal(null)} width={500}>
          <div style={{ background:C.gris0, borderRadius:10, border:`1px solid ${C.gris2}`, padding:20, textAlign:"center", marginBottom:18 }}>
            <FileStack size={36} color={C.azulFirma} strokeWidth={1.5} style={{ margin:"0 auto 10px", display:"block" }}/>
            <div style={{ fontSize:14, fontWeight:700 }}>PDF Unificado — {firmaModal.periodo}</div>
            <div style={{ fontSize:12, color:C.gris5, marginTop:3 }}>Contratista: {firmaModal.contratista} · #{firmaModal.contrato}</div>
            <div style={{ fontSize:11, color:C.gris4, marginTop:2 }}>Todas las evidencias del periodo consolidadas</div>
          </div>
          <div style={{ background:C.azulFirmaLight, border:`1px solid #BFDBFE`, borderRadius:8, padding:14, marginBottom:18 }}>
            <div style={{ fontSize:13, fontWeight:700, color:C.azulFirma, marginBottom:3, display:"flex", gap:6, alignItems:"center" }}><PenLine size={14}/>Firma digital</div>
            <div style={{ fontSize:12, color:C.gris6 }}>Al confirmar, su firma digital quedará registrada con fecha, hora y usuario autenticado en el sistema.</div>
          </div>
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
            <Btn variant="sec" onClick={()=>setFirmaModal(null)}>Cancelar</Btn>
            <Btn icon={PenLine} onClick={()=>{ alert("PDF firmado. El contratista recibirá una notificación."); setFirmaModal(null); }}>Confirmar firma</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ─── VISTAS CONTRATISTA ───────────────────────────────────────────────────────
const V_ContratistaCargar = () => {
  const [uploads, setUploads] = useState({});
  const [openTipos, setOpenTipos] = useState({ "GF-1":true, "GC-1":true });
  const [openModulos, setOpenModulos] = useState({ GF:true, GC:true });
  const [dragOver, setDragOver] = useState(null);

  const allEvids = MODULOS.flatMap(m=>m.tipos.flatMap(t=>t.evidencias));
  const aprobadas = allEvids.filter(e=>EV_MOCK_ESTADO[e.id]?.estado==="Aprobada").length;
  const total = allEvids.length;
  const allApproved = aprobadas >= total;

  const handleUpload = (evId) => {
    setUploads(u=>({...u,[evId]:"loading"}));
    setTimeout(()=>setUploads(u=>({...u,[evId]:"done"})),1400);
  };

  const getEvState = (evId) => {
    if (uploads[evId]==="done") return "Pendiente revisión";
    return EV_MOCK_ESTADO[evId]?.estado || "Pendiente entrega";
  };

  const conteo = allEvids.reduce((acc,e)=>{ const est = getEvState(e.id); acc[est]=(acc[est]||0)+1; return acc; }, {});

  const [unificarModal, setUnificarModal] = useState(false);

  return (
    <div className="page-content">
      {/* Header contrato */}
      <div style={{ ...s.card, marginBottom:18, overflow:"hidden", background:C.azul }}>
        <div style={{ padding:"16px 20px", display:"flex", gap:24, flexWrap:"wrap", alignItems:"center" }}>
          <div><div style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,0.5)", textTransform:"uppercase", letterSpacing:"0.6px" }}>Contrato activo</div><div style={{ fontSize:18, fontWeight:900, color:"#fff" }}>#112-2025</div></div>
          <div><div style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,0.5)", textTransform:"uppercase", letterSpacing:"0.6px" }}>Período actual</div><div style={{ fontSize:15, fontWeight:700, color:"#fff" }}>Mayo 2025</div></div>
          <div><div style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,0.5)", textTransform:"uppercase", letterSpacing:"0.6px" }}>Fecha límite</div><div style={{ fontSize:15, fontWeight:700, color:"#fff" }}>31 de mayo 2025</div></div>
          <div style={{ flex:1, minWidth:180 }}>
            <div style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,0.5)", textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:6 }}>Progreso general</div>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ flex:1, height:8, background:"rgba(255,255,255,0.15)", borderRadius:4 }}>
                <div style={{ height:"100%", width:`${Math.round((aprobadas/total)*100)}%`, background:C.verde, borderRadius:4, transition:"width 0.5s" }}/>
              </div>
              <span style={{ fontSize:13, fontWeight:800, color:"#fff" }}>{aprobadas}/{total}</span>
            </div>
          </div>
        </div>
      </div>
      {/* Estado resumen */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:18 }} className="col-4-resp">
        {[[CheckCircle,"Aprobadas",conteo["Aprobada"]||0,C.verde],[HelpCircle,"Pend. revisión",conteo["Pendiente revisión"]||0,C.amarillo],[AlertTriangle,"Pend. entrega",conteo["Pendiente entrega"]||0,C.naranja],[XCircle,"Rechazadas",conteo["Rechazada"]||0,C.rojo]].map(([I,l,v,color])=>(
          <div key={l} style={{ ...s.card, padding:"12px 14px", borderTop:`3px solid ${color}`, display:"flex", alignItems:"center", gap:10 }}>
            <I size={18} color={color} strokeWidth={2}/>
            <div><div style={{ fontSize:20, fontWeight:800 }}>{v}</div><div style={{ fontSize:11, color:C.gris5, fontWeight:500 }}>{l}</div></div>
          </div>
        ))}
      </div>
      {/* Evidencias por módulo */}
      {MODULOS.map(modulo=>(
        <div key={modulo.id} style={{ ...s.card, marginBottom:14, overflow:"hidden" }}>
          {/* Header módulo */}
          <button onClick={()=>setOpenModulos(o=>({...o,[modulo.id]:!o[modulo.id]}))} style={{ width:"100%", display:"flex", alignItems:"center", gap:12, padding:"14px 18px", background:modulo.bgColor, border:"none", cursor:"pointer", textAlign:"left" }}>
            <div style={{ width:6, height:32, borderRadius:3, background:modulo.color, flexShrink:0 }}/>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:15, fontWeight:800, color:modulo.color }}>{modulo.id} — {modulo.nombre}</div>
              <div style={{ fontSize:11, color:C.gris5 }}>{modulo.tipos.length} tipos de evidencias · {modulo.tipos.reduce((a,t)=>a+t.evidencias.length,0)} evidencias totales</div>
            </div>
            {openModulos[modulo.id] ? <ChevronUp size={16} color={modulo.color}/> : <ChevronDown size={16} color={modulo.color}/>}
          </button>
          {openModulos[modulo.id] && modulo.tipos.map((tipo,ti)=>{
            const isOpen = openTipos[tipo.id];
            const tipoEvids = tipo.evidencias;
            const aprobTipo = tipoEvids.filter(e=>getEvState(e.id)==="Aprobada").length;
            const allDone = aprobTipo===tipoEvids.length;

            return (
              <div key={tipo.id} style={{ borderTop:`1px solid ${C.gris2}` }}>
                {/* Header tipo */}
                <button onClick={()=>setOpenTipos(o=>({...o,[tipo.id]:!o[tipo.id]}))} style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"11px 18px 11px 26px", background:isOpen?"#fff":C.gris0, border:"none", cursor:"pointer", textAlign:"left" }}>
                  <div style={{ width:28, height:28, borderRadius:7, background:`${modulo.color}12`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <Folder size={14} color={modulo.color} strokeWidth={2}/>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:C.gris8 }}>{tipo.nombre}</div>
                    <div style={{ fontSize:11, color:C.gris5 }}>{tipoEvids.length} evidencias · {aprobTipo} aprobadas</div>
                  </div>
                  {allDone && <CheckCircle size={14} color={C.verde} strokeWidth={2.5}/>}
                  <div style={{ display:"flex", alignItems:"center", gap:4, marginLeft:4 }}>
                    <div style={{ display:"flex", gap:2 }}>
                      {tipoEvids.map(e=>{
                        const est = getEvState(e.id);
                        const col = est==="Aprobada"?C.verde:est==="Rechazada"?C.rojo:est==="Pendiente revisión"?C.amarillo:C.gris3;
                        return <div key={e.id} style={{ width:6, height:6, borderRadius:"50%", background:col }}/>;
                      })}
                    </div>
                    {isOpen ? <ChevronUp size={14} color={C.gris4}/> : <ChevronDown size={14} color={C.gris4}/>}
                  </div>
                </button>
                {/* Evidencias del tipo */}
                {isOpen && tipoEvids.map((ev,ei)=>{
                  const estado = getEvState(ev.id);
                  const mock = EV_MOCK_ESTADO[ev.id];
                  const uploading = uploads[ev.id]==="loading";
                  const uploaded = uploads[ev.id]==="done";
                  const cfg = ESTADO_CFG[estado]||{};
                  const { Icon: EIcon } = cfg;

                  return (
                    <div key={ev.id} style={{ padding:"14px 18px 14px 44px", borderTop:`1px solid ${C.gris1}`, background: estado==="Aprobada"?"#FAFFF9":"#fff" }}>
                      <div style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
                        {/* Estado icon */}
                        <div style={{ width:32, height:32, borderRadius:8, background:`${cfg.text||C.gris4}12`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:1 }}>
                          {EIcon && <EIcon size={15} color={cfg.text} strokeWidth={2.5}/>}
                        </div>
                        <div style={{ flex:1 }}>
                          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:10, flexWrap:"wrap" }}>
                            <div>
                              <div style={{ fontSize:13, fontWeight:700, color:C.gris8 }}>{ev.nombre}</div>
                              <div style={{ fontSize:11, color:C.gris5, marginTop:1 }}>{ev.descripcion}</div>
                              <div style={{ display:"flex", gap:6, marginTop:5, flexWrap:"wrap" }}>
                                <Badge estado={estado} small/>
                                {ev.obligatoria ? <span style={{ fontSize:10, fontWeight:700, background:`${modulo.color}12`, color:modulo.color, padding:"1px 7px", borderRadius:20 }}>Obligatoria</span> : <span style={{ fontSize:10, color:C.gris4, background:C.gris1, padding:"1px 7px", borderRadius:20 }}>Opcional</span>}
                                {mock?.archivo && <span style={{ fontSize:10, color:C.azul, background:C.azulLight, padding:"1px 7px", borderRadius:20, display:"flex", alignItems:"center", gap:3 }}><FileText size={9}/>{mock.archivo}</span>}
                              </div>
                            </div>
                          </div>
                          {/* Comentario/Rechazo */}
                          {mock?.comentario && estado!=="Aprobada" && (
                            <div style={{ marginTop:8, background: estado==="Rechazada"?C.rojoLight:C.amarilloLight, border:`1px solid ${estado==="Rechazada"?"#FECACA":"#FDE047"}`, borderRadius:7, padding:"8px 12px", fontSize:12, color: estado==="Rechazada"?C.rojo:C.amarillo, display:"flex", gap:7 }}>
                              <AlertCircle size={13} strokeWidth={2} style={{ flexShrink:0, marginTop:1 }}/>
                              <span><strong>{estado==="Rechazada"?"Rechazo:":"Recomendación:"}</strong> {mock.comentario}</span>
                            </div>
                          )}
                          {/* Upload area */}
                          {estado!=="Aprobada" && !uploading && !uploaded && (
                            <div
                              onDragOver={e=>{ e.preventDefault(); setDragOver(ev.id); }}
                              onDragLeave={()=>setDragOver(null)}
                              onDrop={e=>{ e.preventDefault(); setDragOver(null); handleUpload(ev.id); }}
                              style={{ marginTop:10, border:`2px dashed ${dragOver===ev.id?modulo.color:C.gris2}`, borderRadius:8, padding:"10px 16px", display:"flex", gap:10, alignItems:"center", background:dragOver===ev.id?modulo.bgColor:"transparent", transition:"all 0.15s", cursor:"pointer" }}
                              onClick={()=>handleUpload(ev.id)}
                            >
                              <Upload size={15} color={dragOver===ev.id?modulo.color:C.gris4} strokeWidth={2}/>
                              <div style={{ flex:1 }}>
                                <span style={{ fontSize:12, color:C.gris5 }}>Arrastra el PDF aquí o </span>
                                <span style={{ fontSize:12, color:modulo.color, fontWeight:600 }}>selecciona un archivo</span>
                                <div style={{ fontSize:10, color:C.gris4, marginTop:1 }}>Solo PDF · Máx. 10 MB</div>
                              </div>
                              <Btn icon={Upload} small onClick={e=>{ e.stopPropagation(); handleUpload(ev.id); }}>Subir</Btn>
                            </div>
                          )}
                          {uploading && (
                            <div style={{ marginTop:10, display:"flex", alignItems:"center", gap:8, padding:"10px 14px", background:C.gris0, borderRadius:8, fontSize:12, color:C.gris5 }}>
                              <RefreshCw size={13} color={modulo.color} style={{ animation:"spin 1s linear infinite" }}/>
                              Subiendo archivo...
                            </div>
                          )}
                          {uploaded && (
                            <div style={{ marginTop:10, display:"flex", alignItems:"center", gap:8, padding:"10px 14px", background:C.verdeLight, border:`1px solid #BBF7D0`, borderRadius:8, fontSize:12, color:C.verde, fontWeight:600 }}>
                              <Check size={13} strokeWidth={3}/>
                              Archivo cargado — pendiente de revisión por el administrativo
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      ))}
      {/* Botón unificar */}
      <div style={{ ...s.card, padding:24, textAlign:"center", border: allApproved?`2px solid ${C.verde}`:`2px dashed ${C.gris2}`, background:allApproved?C.verdeLight:"#fff" }}>
        {allApproved ? (
          <>
            <CheckCircle size={32} color={C.verde} strokeWidth={1.5} style={{ margin:"0 auto 10px", display:"block" }}/>
            <div style={{ fontSize:15, fontWeight:800, color:C.verde }}>Todas las evidencias aprobadas</div>
            <div style={{ fontSize:13, color:C.gris5, margin:"6px auto 16px", maxWidth:400 }}>Puedes generar el PDF unificado y enviarlo al administrativo para su firma digital.</div>
            <Btn icon={FileStack} onClick={()=>setUnificarModal(true)}>Unificar evidencias en PDF</Btn>
          </>
        ) : (
          <>
            <FileStack size={32} color={C.gris3} strokeWidth={1.5} style={{ margin:"0 auto 10px", display:"block" }}/>
            <div style={{ fontSize:14, fontWeight:600, color:C.gris5 }}>Unificar evidencias en PDF</div>
            <div style={{ fontSize:12, color:C.gris4, marginTop:4 }}>Disponible cuando todas las evidencias sean aprobadas · {total-aprobadas} pendiente{total-aprobadas!==1?"s":""}</div>
          </>
        )}
      </div>
      {unificarModal && (
        <Modal title="Generar PDF Unificado" onClose={()=>setUnificarModal(false)}>
          <div style={{ marginBottom:14 }}>
            <p style={{ fontSize:13, fontWeight:600, color:C.azul, marginBottom:10 }}>Evidencias que se incluirán en el PDF:</p>
            {allEvids.filter(e=>EV_MOCK_ESTADO[e.id]?.estado==="Aprobada").slice(0,6).map((e,i)=>(
              <div key={e.id} style={{ display:"flex", gap:9, padding:"7px 10px", background:i%2===0?C.gris0:"#fff", borderRadius:6, fontSize:12, marginBottom:2, alignItems:"center" }}>
                <CheckCircle size={12} color={C.verde} strokeWidth={2.5}/>
                <span style={{ fontWeight:500 }}>{e.nombre}</span>
              </div>
            ))}
          </div>
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
            <Btn variant="sec" onClick={()=>setUnificarModal(false)}>Cancelar</Btn>
            <Btn icon={Send} onClick={()=>{ alert("PDF unificado enviado al administrativo para su firma."); setUnificarModal(false); }}>Enviar al administrativo</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};

const V_ContratistaNotificaciones = () => {
  const notifs = [
    { id:1, tipo:"Aprobada",       msg:"Tu evidencia 'Planilla de pago de honorarios' fue aprobada por el administrativo.", fecha:"Hoy 10:30", accion:"Ver evidencia",    color:C.verde,      Icon:CheckCircle },
    { id:2, tipo:"Rechazada",      msg:"Tu evidencia 'Aportes seguridad social' fue rechazada. Revisa el comentario adjunto.", fecha:"Hoy 09:00", accion:"Corregir",     color:C.rojo,       Icon:XCircle },
    { id:3, tipo:"Nueva evidencia",msg:"Se asignó una nueva evidencia para el período Mayo 2025: 'Informe de actividades del período'.", fecha:"Ayer 15:00", accion:"Cargar", color:C.azul, Icon:FilePlus },
    { id:4, tipo:"Vencimiento",    msg:"El período Mayo 2025 vence en 6 días. Tienes 3 evidencias pendientes de entrega.", fecha:"Ayer 08:00", accion:"Ver pendientes",  color:C.naranja,    Icon:AlertTriangle },
    { id:5, tipo:"PDF firmado",    msg:"El PDF unificado del período Marzo 2025 fue firmado y está disponible para descarga.", fecha:"12/04/2025", accion:"Descargar PDF",color:C.azulFirma, Icon:FileSignature },
  ];
  return (
    <div className="page-content">
      <SectionTitle title="Mis Notificaciones" subtitle="Alertas y novedades sobre tus evidencias y contratos"/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {notifs.map(n=>(
          <div key={n.id} style={{ ...s.card, padding:"14px 18px", display:"flex", gap:12, alignItems:"center", borderLeft:`3px solid ${n.color}` }}>
            <div style={{ width:36, height:36, borderRadius:9, background:`${n.color}12`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <n.Icon size={17} color={n.color} strokeWidth={2}/>
            </div>
            <div style={{ flex:1 }}>
              <span style={{ fontSize:10, fontWeight:800, color:n.color, textTransform:"uppercase", letterSpacing:"0.5px" }}>{n.tipo}</span>
              <div style={{ fontSize:13, fontWeight:500, color:C.gris7, marginTop:2, lineHeight:1.4 }}>{n.msg}</div>
              <div style={{ fontSize:11, color:C.gris4, marginTop:3 }}>{n.fecha}</div>
            </div>
            <Btn variant="ghost" icon={ChevronRight} small>{n.accion}</Btn>
          </div>
        ))}
      </div>
    </div>
  );
};

const V_ContratistaFirmados = () => (
  <div className="page-content">
    <SectionTitle title="PDFs Firmados" subtitle="Documentos del período actual firmados por el administrativo"/>
    <div style={{ ...s.card, padding:"14px 18px", marginBottom:16, background:C.gris0, display:"flex", gap:20, flexWrap:"wrap" }}>
      {[["Contrato activo","#112-2025"],["Período actual","Mayo 2025"],["Contratista","Yuliana Bernal Torres"]].map(([k,v])=>(
        <div key={k}><div style={{ fontSize:10, fontWeight:700, color:C.gris4, textTransform:"uppercase", letterSpacing:"0.6px" }}>{k}</div><div style={{ fontSize:13, fontWeight:700, color:C.azul, marginTop:2 }}>{v}</div></div>
      ))}
    </div>
    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
      {[
        { periodo:"Marzo 2025",   env:"10/04/2025", firm:"12/04/2025", estado:"Firmado" },
        { periodo:"Febrero 2025", env:"05/03/2025", firm:"07/03/2025", estado:"Firmado" },
        { periodo:"Mayo 2025",    env:"—",          firm:"—",          estado:"Pendiente firma" },
      ].map(p=>(
        <div key={p.periodo} style={{ ...s.card, padding:"16px 20px", display:"flex", gap:14, alignItems:"center", borderLeft:`3px solid ${p.estado==="Firmado"?C.azulFirma:C.agua}` }}>
          <div style={{ width:40, height:40, borderRadius:10, background:p.estado==="Firmado"?C.azulFirmaLight:C.aguaLight, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <FileSignature size={18} color={p.estado==="Firmado"?C.azulFirma:C.agua} strokeWidth={1.5}/>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:14, fontWeight:700 }}>PDF Unificado — {p.periodo}</div>
            <div style={{ fontSize:12, color:C.gris5, marginTop:2 }}>Enviado: {p.env} · Firmado: {p.firm}</div>
            <Badge estado={p.estado} small/>
          </div>
          {p.estado==="Firmado" ? (
            <div style={{ display:"flex", gap:6 }}>
              <Btn variant="ghost" icon={Eye} small>Ver</Btn>
              <Btn icon={Download} small>Descargar</Btn>
            </div>
          ) : <span style={{ fontSize:12, color:C.agua, fontWeight:600 }}>En espera de firma</span>}
        </div>
      ))}
    </div>
  </div>
);

const V_ContratistaHistorial = () => {
  const [exp, setExp] = useState("C-001");
  return (
    <div className="page-content">
      <SectionTitle title="Historial de Contratos" subtitle="Contratos y períodos históricos"/>
      <div style={{ display:"flex", gap:8, marginBottom:18, flexWrap:"wrap" }}>
        <Select style={{ width:140 }}><option>Todos los años</option><option>2025</option><option>2024</option></Select>
        <Select style={{ width:160 }}><option>Todos los estados</option><option>Firmado</option><option>En revisión</option></Select>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {CONTRATOS_DATA.filter(c=>c.contratistaId===1||c.id==="C-004").map(c=>(
          <div key={c.id} style={{ ...s.card, overflow:"hidden" }}>
            <button onClick={()=>setExp(exp===c.id?null:c.id)} style={{ width:"100%", display:"flex", gap:12, alignItems:"center", padding:"14px 18px", background:exp===c.id?C.verdeLight:"#fff", border:"none", cursor:"pointer", textAlign:"left" }}>
              <div style={{ width:36, height:36, borderRadius:9, background:exp===c.id?C.verde:C.gris2, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <Briefcase size={16} color={exp===c.id?"#fff":C.gris5} strokeWidth={2}/>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:700, color:C.azul }}>Contrato #{c.numero}</div>
                <div style={{ fontSize:12, color:C.gris5, marginTop:1 }}>{c.inicio} — {c.fin} · {c.objeto.slice(0,50)}...</div>
              </div>
              <Badge estado={c.estado} small/>
              {exp===c.id ? <ChevronUp size={16} color={C.gris4}/> : <ChevronDown size={16} color={C.gris4}/>}
            </button>
            {exp===c.id && (
              <div style={{ borderTop:`1px solid ${C.gris2}`, overflowX:"auto" }}>
                <table style={{ borderCollapse:"collapse", width:"100%" }}>
                  <thead><tr>{["Período","Estado","Avance","Firma","Acción"].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {PERIODOS_DATA.slice(0,5).map(p=>(
                      <tr key={p.id} style={{ background:"#fff" }} onMouseEnter={e=>e.currentTarget.style.background=C.gris0} onMouseLeave={e=>e.currentTarget.style.background="#fff"}>
                        <td style={{ ...s.td, fontWeight:600 }}>{p.mes}</td>
                        <td style={s.td}><Badge estado={p.estado} small/></td>
                        <td style={{ ...s.td, minWidth:130 }}><ProgressBar val={p.avance}/></td>
                        <td style={s.td}>{p.firma==="Firmado"?<Badge estado="Firmado" small/>:p.firma==="Pendiente"?<Badge estado="Pendiente firma" small/>:<span style={{ color:C.gris3 }}>—</span>}</td>
                        <td style={s.td}>{p.firma==="Firmado"&&<Btn icon={Download} small>PDF</Btn>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── SUPER ADMIN ──────────────────────────────────────────────────────────────
const V_SuperDashboard = () => (
  <div className="page-content">
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20, flexWrap:"wrap", gap:12 }}>
      <div>
        <h2 style={{ fontSize:20, fontWeight:800, color:C.azul }}>Panel Super Administrador</h2>
        <p style={{ fontSize:13, color:C.gris5, marginTop:3 }}>Vista global del sistema SGFC</p>
      </div>
      <span style={{ background:C.moradoLight, color:C.morado, padding:"4px 12px", borderRadius:20, fontSize:11, fontWeight:800, display:"inline-flex", alignItems:"center", gap:5 }}><Shield size={11}/>ACCESO TOTAL</span>
    </div>
    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(155px,1fr))", gap:12, marginBottom:20 }} className="col-4-resp">
      <KpiCard label="Total usuarios"    value={8}  Icon={Users}         color={C.azul}/>
      <KpiCard label="Contratos activos" value={4}  Icon={FileText}      color={C.verde}/>
      <KpiCard label="Total periodos"    value={32} Icon={Calendar}      color={C.morado}/>
      <KpiCard label="Tipos de evidencia"value={15} Icon={Folder}        color={C.amarillo}/>
      <KpiCard label="Evidencias totales"value={35} Icon={ClipboardList} color={C.naranja}/>
      <KpiCard label="PDFs firmados"     value={5}  Icon={FileSignature} color={C.azulFirma}/>
    </div>
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }} className="col-2-resp">
      <div style={{ ...s.card, padding:18 }}>
        <h4 style={{ fontSize:14, fontWeight:700, color:C.azul, marginBottom:14 }}>Actividad reciente del sistema</h4>
        {[
          [FileText,"Yuliana Bernal cargó evidencia",C.verde,"Hace 30 min"],
          [UserPlus,"Patricia Loaiza creó nuevo usuario",C.azul,"Hace 1h"],
          [XCircle,"Evidencia rechazada — Andrés Giraldo",C.rojo,"Hace 2h"],
          [FileSignature,"PDF enviado para firma — Marcela Ospina",C.azulFirma,"Hace 3h"],
          [Settings,"Nuevo periodo habilitado — Junio 2025",C.morado,"Ayer"],
        ].map(([I,msg,c,t])=>(
          <div key={msg} style={{ display:"flex", gap:10, alignItems:"center", padding:"9px 0", borderBottom:`1px solid ${C.gris1}` }}>
            <div style={{ width:30, height:30, borderRadius:7, background:`${c}15`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><I size={14} color={c} strokeWidth={2}/></div>
            <div style={{ flex:1 }}><div style={{ fontSize:12, fontWeight:500 }}>{msg}</div><div style={{ fontSize:11, color:C.gris4 }}>{t}</div></div>
          </div>
        ))}
      </div>
      <div style={{ ...s.card, padding:18 }}>
        <h4 style={{ fontSize:14, fontWeight:700, color:C.azul, marginBottom:14 }}>Estado global de evidencias</h4>
        {[[CheckCircle,"Aprobadas",18,C.verde,"#166534"],[HelpCircle,"Pendiente revisión",6,C.amarillo,C.amarillo],[AlertTriangle,"Pendiente entrega",11,C.naranja,C.naranja],[XCircle,"Rechazadas",3,C.rojo,C.rojo]].map(([I,l,v,c,tc])=>(
          <div key={l} style={{ marginBottom:12 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4, fontSize:12 }}>
              <span style={{ display:"flex", gap:5, alignItems:"center" }}><I size={11} color={c} strokeWidth={2}/>{l}</span>
              <span style={{ fontWeight:700, color:tc }}>{v}</span>
            </div>
            <ProgressBar val={Math.round((v/38)*100)} color={c}/>
          </div>
        ))}
        <div style={{ marginTop:14, padding:"10px 12px", background:C.moradoLight, borderRadius:8, border:`1px solid ${C.morado}20`, display:"flex", gap:7, alignItems:"center", fontSize:12, color:C.morado, fontWeight:600 }}>
          <Shield size={13}/>Auditoría y configuración completa disponible
        </div>
      </div>
    </div>
  </div>
);

const V_SuperUsuarios = () => (
  <div className="page-content">
    <SectionTitle title="Gestión Completa de Usuarios" subtitle="Crear, editar y eliminar todos los usuarios del sistema" right={<Btn icon={UserPlus}>Nuevo Usuario</Btn>}/>
    <div style={{ ...s.card, overflow:"hidden" }}>
      <div style={{ overflowX:"auto" }}>
        <table style={{ borderCollapse:"collapse", width:"100%" }}>
          <thead><tr>{["Usuario","Documento","Rol","Contrato","Estado","Último acceso","Acciones"].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
          <tbody>
            {[...USUARIOS_DATA, { id:8, nombre:"Patricia Loaiza Soto", doc:"52.371.009", correo:"ploaiza@sena.edu.co", rol:"Super Admin", estado:"Activo", contratoId:null, ultimo:"Hoy 10:05" }].map(u=>{
              const ct = CONTRATOS_DATA.find(c=>c.id===u.contratoId);
              return (
                <tr key={u.id} style={{ background:"#fff" }} onMouseEnter={e=>e.currentTarget.style.background=C.gris0} onMouseLeave={e=>e.currentTarget.style.background="#fff"}>
                  <td style={s.td}><div style={{ display:"flex", alignItems:"center", gap:9 }}><Avatar nombre={u.nombre} size={30}/><div><div style={{ fontWeight:600, fontSize:13 }}>{u.nombre}</div><div style={{ fontSize:11, color:C.gris5 }}>{u.correo}</div></div></div></td>
                  <td style={{ ...s.td, color:C.gris5, fontSize:12 }}>{u.doc}</td>
                  <td style={s.td}>
                    <span style={{ padding:"2px 8px", borderRadius:20, fontSize:11, fontWeight:700, background: u.rol==="Super Admin"?C.moradoLight:u.rol==="Contratista"?C.azulLight:C.verdeLight, color: u.rol==="Super Admin"?C.morado:u.rol==="Contratista"?C.azul:C.verde }}>
                      {u.rol}
                    </span>
                  </td>
                  <td style={{ ...s.td, fontWeight:600, color:C.azul, fontSize:12 }}>{ct?`#${ct.numero}`:"—"}</td>
                  <td style={s.td}><Badge estado={u.estado} small/></td>
                  <td style={{ ...s.td, fontSize:11, color:C.gris5 }}>{u.ultimo}</td>
                  <td style={s.td}><div style={{ display:"flex", gap:4 }}><Btn variant="ghost" icon={Eye} small/><Btn variant="ghost" icon={Edit} small/>{u.rol!=="Super Admin"&&<Btn variant="danger" icon={Trash2} small/>}</div></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

const V_SuperContratos = () => {
  const [modal, setModal] = useState(false);
  return (
    <div className="page-content">
      <SectionTitle title="Gestión de Contratos" subtitle="Exclusivo Super Admin: crear, editar y eliminar contratos" right={<Btn icon={FilePlus} onClick={()=>setModal(true)}>Nuevo Contrato</Btn>}/>
      <div style={{ display:"flex", alignItems:"center", gap:8, padding:"9px 14px", background:C.moradoLight, border:`1px solid ${C.morado}30`, borderRadius:8, marginBottom:16, fontSize:12, color:C.morado, fontWeight:600 }}>
        <Shield size={13}/>Solo el Super Admin puede crear, editar y eliminar contratos.
      </div>
      <div style={{ ...s.card, overflow:"hidden" }}>
        <div style={{ overflowX:"auto" }}>
          <table style={{ borderCollapse:"collapse", width:"100%" }}>
            <thead><tr>{["Contrato","Contratista","Vigencia","Objeto","Estado","Acciones"].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
            <tbody>
              {CONTRATOS_DATA.map(c=>{
                const u=USUARIOS_DATA.find(x=>x.id===c.contratistaId);
                return (
                  <tr key={c.id} style={{ background:"#fff" }} onMouseEnter={e=>e.currentTarget.style.background=C.gris0} onMouseLeave={e=>e.currentTarget.style.background="#fff"}>
                    <td style={{ ...s.td, fontWeight:800, color:C.azul }}>#{c.numero}</td>
                    <td style={s.td}><div style={{ display:"flex", alignItems:"center", gap:7 }}><Avatar nombre={u?.nombre||""} size={26}/><span style={{ fontWeight:600, fontSize:12 }}>{u?.nombre}</span></div></td>
                    <td style={{ ...s.td, fontSize:11, color:C.gris5, whiteSpace:"nowrap" }}>{c.inicio}<br/>{c.fin}</td>
                    <td style={{ ...s.td, fontSize:12, maxWidth:220 }}><span style={{ display:"block", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.objeto}</span></td>
                    <td style={s.td}><Badge estado={c.estado} small/></td>
                    <td style={s.td}><div style={{ display:"flex", gap:4 }}><Btn variant="ghost" icon={Eye} small/><Btn variant="ghost" icon={Edit} small>Editar</Btn><Btn variant="danger" icon={Trash2} small/></div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {modal && (
        <Modal title="Nuevo Contrato" onClose={()=>setModal(false)}>
          <div style={{ display:"flex", flexDirection:"column", gap:13 }}>
            <Input label="Número de contrato" placeholder="Ej: 130-2025"/>
            <Select label="Contratista">{USUARIOS_DATA.filter(u=>u.rol==="Contratista").map(u=><option key={u.id}>{u.nombre}</option>)}</Select>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <Input label="Fecha inicio" type="date"/>
              <Input label="Fecha fin" type="date"/>
            </div>
            <div>
              <label style={s.label}>Objeto del contrato</label>
              <textarea style={{ ...s.input, resize:"vertical" }} rows={3} placeholder="Descripción del objeto contractual..."/>
            </div>
            <Input label="Valor del contrato" placeholder="Ej: $48.000.000"/>
            <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
              <Btn variant="sec" onClick={()=>setModal(false)}>Cancelar</Btn>
              <Btn icon={Check} onClick={()=>setModal(false)}>Crear contrato</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

const V_SuperConfig = () => (
  <div className="page-content">
    <SectionTitle title="Configuración del Sistema" subtitle="Parámetros globales del SGFC"/>
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }} className="col-2-resp">
      {[
        [Building2,"Información institucional","Nombre del centro, regional, código SENA",C.azul],
        [Bell,"Notificaciones automáticas","SMTP, plantillas de correo, alertas",C.verde],
        [Lock,"Seguridad y accesos","Políticas de contraseñas, sesiones activas",C.rojo],
        [Folder,"Módulos del sistema","Activar/desactivar módulos GF y GC",C.amarillo],
        [Calendar,"Calendario institucional","Fechas especiales, días hábiles",C.morado],
        [Activity,"Auditoría y reportes","Logs de acceso, exportaciones, historial",C.agua],
      ].map(([I,t,d,c])=>(
        <div key={t} style={{ ...s.card, padding:18, cursor:"pointer", transition:"all 0.15s", display:"flex", gap:14, alignItems:"center" }}>
          <div style={{ width:42, height:42, borderRadius:10, background:`${c}12`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <I size={19} color={c} strokeWidth={1.5}/>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:700, color:C.azul }}>{t}</div>
            <div style={{ fontSize:12, color:C.gris5, marginTop:2 }}>{d}</div>
          </div>
          <ChevronRight size={15} color={C.gris4}/>
        </div>
      ))}
    </div>
  </div>
);

// ─── VIEW ROUTER ─────────────────────────────────────────────────────────────
const VIEWS = {
  "admin-dashboard":     V_AdminDashboard,
  "admin-usuarios":      V_AdminUsuarios,
  "admin-evidencias":    V_AdminEvidencias,
  "admin-contratos":     V_AdminContratos,
  "admin-revision":      V_AdminRevision,
  "admin-firmas":        V_AdminFirmas,
  "admin-notificaciones":V_AdminNotificaciones,
  "cont-cargar":         V_ContratistaCargar,
  "cont-firmados":       V_ContratistaFirmados,
  "cont-historial":      V_ContratistaHistorial,
  "cont-notificaciones": V_ContratistaNotificaciones,
  "super-dashboard":     V_SuperDashboard,
  "super-usuarios":      V_SuperUsuarios,
  "super-contratos":     V_SuperContratos,
  "super-evidencias":    V_AdminEvidencias,
  "super-config":        V_SuperConfig,
};

const DEFAULT_VIEW = { Administrativo:"admin-dashboard", Contratista:"cont-cargar", "Super Admin":"super-dashboard" };

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState("admin-dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const login = (u) => { setUser(u); setView(DEFAULT_VIEW[u.rol]); };
  const logout = () => { setUser(null); setView("admin-dashboard"); };

  const View = VIEWS[view] || V_AdminDashboard;

  return (
    <>
      <style>{GLOBAL_CSS}</style>
      {!user ? (
        <LoginView onLogin={login}/>
      ) : (
        <div style={{ display:"flex", height:"100vh", overflow:"hidden", position:"relative" }}>
          {/* Sidebar móvil overlay */}
          {mobileOpen && (
            <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:49 }} onClick={()=>setMobileOpen(false)}/>
          )}
          {/* Sidebar */}
          <div style={{ position: mobileOpen?"fixed":"relative", left:mobileOpen?"0":undefined, top:0, height:"100vh", zIndex:50 }}>
            <Sidebar user={user} view={view} onNav={v=>{ setView(v); setMobileOpen(false); }} collapsed={collapsed} onToggle={()=>setCollapsed(!collapsed)}/>
          </div>
          {/* Main */}
          <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", minWidth:0 }}>
            <Navbar user={user} view={view} onLogout={logout} onNav={setView} onMenuToggle={()=>setMobileOpen(!mobileOpen)}/>
            <main style={{ flex:1, overflowY:"auto", padding:"20px" }}>
              <View/>
            </main>
          </div>
        </div>
      )}
    </>
  );
}
