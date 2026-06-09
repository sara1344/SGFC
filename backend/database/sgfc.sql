  -- =============================================================================
  -- SGFC — Base de datos COMPLETA (un solo archivo)
  -- =============================================================================
  -- Roles del sistema (campo `id_perfil` en `personas`):
  --    1 = contratista           (tipo_perfil = 3)
  --    2 = administrador         (tipo_perfil = 1)   ← Super Admin
  --    4 = administrativo_centro (tipo_perfil = 4)   ← Administrativo de Centro
  --
  -- Login del sistema: SOLO por `usuario` + `contrasena`.
  --   El `usuario` se genera por el procedimiento `sp_insertar_persona`:
  --     LOWER(LEFT(nombres,1) + LEFT(apellidos,1) + RIGHT(cedula,5))
  --
  -- Para importar:
  --   - phpMyAdmin: pestaña "Importar" → seleccionar este archivo.
  --   - CLI:        mysql -u root < backend/database/sgfc.sql
  -- =============================================================================

  CREATE DATABASE IF NOT EXISTS `sgfc`
    DEFAULT CHARACTER SET utf8mb4
    COLLATE utf8mb4_general_ci;
  USE `sgfc`;

  SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
  SET time_zone = "-05:00";
  SET FOREIGN_KEY_CHECKS = 0;
  SET NAMES utf8mb4;

  -- =============================================================================
  -- 0. Limpiar versión anterior (idempotente)
  -- =============================================================================
  DROP PROCEDURE IF EXISTS `sp_helper_crear_rol_mysql`;
  DROP PROCEDURE IF EXISTS `sp_helper_crear_usuario_mysql`;
  DROP PROCEDURE IF EXISTS `sp_insertar_perfil`;
  DROP PROCEDURE IF EXISTS `sp_insertar_persona`;
  DROP PROCEDURE IF EXISTS `sp_sincronizar_seguridad_post_import`;

  DROP TABLE IF EXISTS `firmas`;
  DROP TABLE IF EXISTS `pdfs_unificados`;
  DROP TABLE IF EXISTS `revisiones`;
  DROP TABLE IF EXISTS `evidencias_uploads`;
  DROP TABLE IF EXISTS `evidencias_asignadas`;
  DROP TABLE IF EXISTS `periodos`;
  DROP TABLE IF EXISTS `evidencias_master`;
  DROP TABLE IF EXISTS `subgrupos`;
  DROP TABLE IF EXISTS `modulos`;
  DROP TABLE IF EXISTS `notificacion_detalles`;
  DROP TABLE IF EXISTS `notificaciones`;
  DROP TABLE IF EXISTS `log_accesos`;
  DROP TABLE IF EXISTS `evidencias`;
  DROP TABLE IF EXISTS `historiales`;
  DROP TABLE IF EXISTS `contratos`;
  DROP TABLE IF EXISTS `personas`;
  DROP TABLE IF EXISTS `tipos_contrato`;
  DROP TABLE IF EXISTS `mes`;
  DROP TABLE IF EXISTS `estados_historial`;
  DROP TABLE IF EXISTS `estados_evidencia`;
  DROP TABLE IF EXISTS `genero`;
  DROP TABLE IF EXISTS `perfil`;


  -- =============================================================================
  -- 1. PROCEDIMIENTOS (helpers + alta de personas)
  -- =============================================================================
  DELIMITER $$

  CREATE PROCEDURE `sp_helper_crear_rol_mysql` (IN `p_nom_rol` VARCHAR(45), IN `p_jerarquia` INT)
  BEGIN
      SET @sql_role = CONCAT('CREATE ROLE IF NOT EXISTS ', QUOTE(p_nom_rol));
      PREPARE stmt1 FROM @sql_role; EXECUTE stmt1;
      IF p_jerarquia = 1 THEN
          SET @sql_grant = CONCAT('GRANT ALL PRIVILEGES ON sgfc.* TO ', QUOTE(p_nom_rol));
      ELSE
          SET @sql_grant = CONCAT('GRANT SELECT ON sgfc.* TO ', QUOTE(p_nom_rol));
      END IF;
      PREPARE stmt2 FROM @sql_grant; EXECUTE stmt2;
      DEALLOCATE PREPARE stmt1; DEALLOCATE PREPARE stmt2;
      FLUSH PRIVILEGES;
  END$$

  CREATE PROCEDURE `sp_helper_crear_usuario_mysql` (IN `p_user` VARCHAR(100), IN `p_pass` VARCHAR(255), IN `p_rol` VARCHAR(45))
  BEGIN
      SET @sql_u = CONCAT('CREATE USER IF NOT EXISTS ', QUOTE(p_user), '@\'localhost\' IDENTIFIED BY ', QUOTE(p_pass));
      PREPARE stmt1 FROM @sql_u; EXECUTE stmt1;
      SET @sql_g = CONCAT('GRANT ', QUOTE(p_rol), ' TO ', QUOTE(p_user), '@\'localhost\'');
      PREPARE stmt2 FROM @sql_g; EXECUTE stmt2;
      SET @sql_d = CONCAT('SET DEFAULT ROLE ', QUOTE(p_rol), ' FOR ', QUOTE(p_user), '@\'localhost\'');
      PREPARE stmt3 FROM @sql_d; EXECUTE stmt3;
      DEALLOCATE PREPARE stmt1; DEALLOCATE PREPARE stmt2; DEALLOCATE PREPARE stmt3;
  END$$

  CREATE PROCEDURE `sp_insertar_perfil` (IN `p_nombre` VARCHAR(45), IN `p_tipo` INT, IN `p_descripcion` VARCHAR(255))
  BEGIN
      INSERT INTO Perfil (nombre_perfil, tipo_perfil, descripcion) VALUES (p_nombre, p_tipo, p_descripcion);
      CALL sp_helper_crear_rol_mysql(p_nombre, p_tipo);
  END$$

  CREATE PROCEDURE `sp_insertar_persona` (IN `p_cedula` VARCHAR(45), IN `p_nombres` VARCHAR(100), IN `p_apellidos` VARCHAR(100), IN `p_correo` VARCHAR(100), IN `p_contrasena` VARCHAR(255), IN `p_id_genero` INT, IN `p_id_perfil` INT)
  BEGIN
      SET @usuario_final = LOWER(CONCAT(LEFT(p_nombres, 1), LEFT(p_apellidos, 1), RIGHT(p_cedula, 5)));
      INSERT INTO Personas (cedula, nombres, Apellidos, correo, usuario, contrasena, id_genero, id_perfil)
      VALUES (p_cedula, p_nombres, p_apellidos, p_correo, @usuario_final, p_contrasena, p_id_genero, p_id_perfil);
      SELECT nombre_perfil INTO @v_rol FROM Perfil WHERE id_Perfil = p_id_perfil;
      CALL sp_helper_crear_usuario_mysql(@usuario_final, p_contrasena, @v_rol);
  END$$

  CREATE PROCEDURE `sp_sincronizar_seguridad_post_import` ()
  BEGIN
      DECLARE done INT DEFAULT FALSE;
      DECLARE v_nombre VARCHAR(100);
      DECLARE v_pass VARCHAR(255);
      DECLARE v_rol VARCHAR(45);
      DECLARE v_tipo INT;
      DECLARE cur_perfil CURSOR FOR SELECT nombre_perfil, tipo_perfil FROM Perfil;
      DECLARE cur_persona CURSOR FOR
          SELECT p.usuario, p.contrasena, perf.nombre_perfil
          FROM Personas p JOIN Perfil perf ON p.id_perfil = perf.id_Perfil;
      DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
      OPEN cur_perfil;
      read_perfil: LOOP
          FETCH cur_perfil INTO v_nombre, v_tipo;
          IF done THEN LEAVE read_perfil; END IF;
          CALL sp_helper_crear_rol_mysql(v_nombre, v_tipo);
      END LOOP;
      CLOSE cur_perfil;
      SET done = FALSE;
      OPEN cur_persona;
      read_persona: LOOP
          FETCH cur_persona INTO v_nombre, v_pass, v_rol;
          IF done THEN LEAVE read_persona; END IF;
          CALL sp_helper_crear_usuario_mysql(v_nombre, v_pass, v_rol);
      END LOOP;
      CLOSE cur_persona;
      FLUSH PRIVILEGES;
  END$$

  DELIMITER ;


  -- =============================================================================
  -- 2. CATÁLOGOS BASE
  -- =============================================================================

  CREATE TABLE `perfil` (
    `id_Perfil`     INT(11)      NOT NULL AUTO_INCREMENT,
    `nombre_perfil` VARCHAR(45)  NOT NULL,
    `tipo_perfil`   INT(11)      NOT NULL,
    `descripcion`   VARCHAR(255) DEFAULT NULL,
    PRIMARY KEY (`id_Perfil`),
    UNIQUE KEY `nombre_perfil_UNIQUE` (`nombre_perfil`),
    UNIQUE KEY `tipo_perfil_UNIQUE`  (`tipo_perfil`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

  INSERT INTO `perfil` (`id_Perfil`,`nombre_perfil`,`tipo_perfil`,`descripcion`) VALUES
    (1,'contratista',         3,'Perfil para contratistas que cargan evidencias'),
    (2,'administrador',       1,'DBA / Super Admin - Gestión completa del sistema'),
    (4,'administrativo_centro',4,'Administrativo de un centro de formación');

  CREATE TABLE `genero` (
    `id_genero`   INT(11)      NOT NULL AUTO_INCREMENT,
    `Nombre`      VARCHAR(45)  NOT NULL,
    `Descripcion` VARCHAR(255) DEFAULT NULL,
    PRIMARY KEY (`id_genero`),
    UNIQUE KEY `Nombre_UNIQUE` (`Nombre`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

  INSERT INTO `genero` (`id_genero`,`Nombre`,`Descripcion`) VALUES
    (1,'Femenino', 'Género femenino'),
    (2,'Masculino','Género masculino'),
    (3,'Otro',     'Otro género');

  CREATE TABLE `estados_evidencia` (
    `id_estado`     INT(11)      NOT NULL AUTO_INCREMENT,
    `nombre_estado` VARCHAR(50)  NOT NULL,
    `descripcion`   VARCHAR(255) DEFAULT NULL,
    `color`         VARCHAR(20)  DEFAULT 'gray',
    PRIMARY KEY (`id_estado`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

  INSERT INTO `estados_evidencia` (`id_estado`,`nombre_estado`,`descripcion`,`color`) VALUES
    (1,'pendiente',  'Evidencia cargada, pendiente de revisión',  'yellow'),
    (2,'aprobada',   'Evidencia aprobada por el administrativo',  'green'),
    (3,'rechazada',  'Evidencia rechazada, requiere corrección',  'red'),
    (4,'en_revision','Evidencia en proceso de revisión',          'blue');

  CREATE TABLE `estados_historial` (
    `idestados_historial` INT(11)      NOT NULL AUTO_INCREMENT,
    `estado`              VARCHAR(50)  NOT NULL,
    `descripcion`         VARCHAR(255) DEFAULT NULL,
    `color_semaforo`      VARCHAR(20)  DEFAULT 'gray',
    PRIMARY KEY (`idestados_historial`),
    UNIQUE KEY `estado_UNIQUE` (`estado`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

  INSERT INTO `estados_historial` (`idestados_historial`,`estado`,`descripcion`,`color_semaforo`) VALUES
    (1,'pendiente',  'Evidencias pendientes de carga',      'gray'),
    (2,'en_revision','Evidencias en proceso de revisión',   'yellow'),
    (3,'aprobado',   'Todas las evidencias aprobadas',      'green'),
    (4,'rechazado',  'Evidencias con observaciones',        'red'),
    (5,'pagado',     'Pago procesado y completado',         'blue');

  CREATE TABLE `mes` (
    `id_mes`     INT(11)     NOT NULL AUTO_INCREMENT,
    `nombre_mes` VARCHAR(45) NOT NULL,
    PRIMARY KEY (`id_mes`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

  INSERT INTO `mes` (`id_mes`,`nombre_mes`) VALUES
    (1,'Enero'),(2,'Febrero'),(3,'Marzo'),(4,'Abril'),(5,'Mayo'),(6,'Junio'),
    (7,'Julio'),(8,'Agosto'),(9,'Septiembre'),(10,'Octubre'),(11,'Noviembre'),(12,'Diciembre');

  CREATE TABLE `tipos_contrato` (
    `id_tipo_contrato` INT(11)      NOT NULL AUTO_INCREMENT,
    `nombre_contrato`  VARCHAR(100) DEFAULT NULL,
    `descripcion`      VARCHAR(255) DEFAULT NULL,
    PRIMARY KEY (`id_tipo_contrato`),
    UNIQUE KEY `nombre_contrato_UNIQUE` (`nombre_contrato`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

  INSERT INTO `tipos_contrato` (`id_tipo_contrato`,`nombre_contrato`,`descripcion`) VALUES
    (1,'Contratista',                'Contrato por prestación de servicios profesionales'),
    (2,'Servicios Personales',       'Contrato para servicios personales especializados'),
    (3,'Convenio Interadministrativo','Convenio entre entidades públicas');


  -- =============================================================================
  -- 3. PERSONAS Y CONTRATOS
  -- =============================================================================

  CREATE TABLE `personas` (
    `id_persona`     INT(11)      NOT NULL AUTO_INCREMENT,
    `cedula`         VARCHAR(45)  NOT NULL,
    `nombres`        VARCHAR(100) NOT NULL,
    `Apellidos`      VARCHAR(100) NOT NULL,
    `correo`         VARCHAR(100) NOT NULL,
    `usuario`        VARCHAR(100) NOT NULL,
    `contrasena`     VARCHAR(255) NOT NULL,
    `id_genero`      INT(11)      NOT NULL,
    `id_perfil`      INT(11)      NOT NULL,
    `activo`         TINYINT(1)   DEFAULT 1,
    `firma_imagen_b64` LONGTEXT   DEFAULT NULL,
    `fecha_registro` DATETIME     DEFAULT current_timestamp(),
    PRIMARY KEY (`id_persona`),
    UNIQUE KEY `cedula_UNIQUE`  (`cedula`),
    UNIQUE KEY `correo_UNIQUE`  (`correo`),
    UNIQUE KEY `usuario_UNIQUE` (`usuario`),
    KEY `fk_persona_genero` (`id_genero`),
    KEY `fk_persona_perfil` (`id_perfil`),
    CONSTRAINT `fk_persona_genero` FOREIGN KEY (`id_genero`) REFERENCES `genero` (`id_genero`),
    CONSTRAINT `fk_persona_perfil` FOREIGN KEY (`id_perfil`) REFERENCES `perfil` (`id_Perfil`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

  CREATE TABLE `contratos` (
    `id_contrato`     INT(11)        NOT NULL AUTO_INCREMENT,
    `id_persona`      INT(11)        DEFAULT NULL,
    `fecha_inicio`    DATE           DEFAULT NULL,
    `fecha_fin`       DATE           DEFAULT NULL,
    `tipo_contrato`   INT(11)        NOT NULL,
    `estado`          VARCHAR(45)    DEFAULT 'activo',
    `area_aplicacion` VARCHAR(255)   DEFAULT NULL,
    `valor_contrato`  DECIMAL(15,2)  DEFAULT 0.00,
    `objeto_contrato` TEXT           DEFAULT NULL,
    `fecha_creacion`  DATETIME       DEFAULT current_timestamp(),
    PRIMARY KEY (`id_contrato`),
    KEY `fk_contrato_tipo`    (`tipo_contrato`),
    KEY `fk_contrato_persona` (`id_persona`),
    CONSTRAINT `fk_contrato_persona` FOREIGN KEY (`id_persona`)    REFERENCES `personas` (`id_persona`),
    CONSTRAINT `fk_contrato_tipo`    FOREIGN KEY (`tipo_contrato`) REFERENCES `tipos_contrato` (`id_tipo_contrato`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

  CREATE TABLE `historiales` (
    `id_historial`        INT(11)      NOT NULL AUTO_INCREMENT,
    `id_contrato`         INT(11)      NOT NULL,
    `mes`                 INT(11)      NOT NULL,
    `anio`                INT(11)      NOT NULL DEFAULT year(curdate()),
    `estado`              INT(11)      DEFAULT 1,
    `Observacion`         VARCHAR(255) DEFAULT NULL,
    `fecha_creacion`      DATETIME     DEFAULT current_timestamp(),
    `fecha_actualizacion` DATETIME     DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (`id_historial`),
    KEY `fk_historial_contrato` (`id_contrato`),
    KEY `fk_historial_mes`      (`mes`),
    KEY `fk_historial_estado`   (`estado`),
    CONSTRAINT `fk_historial_contrato` FOREIGN KEY (`id_contrato`) REFERENCES `contratos` (`id_contrato`),
    CONSTRAINT `fk_historial_estado`   FOREIGN KEY (`estado`)      REFERENCES `estados_historial` (`idestados_historial`),
    CONSTRAINT `fk_historial_mes`      FOREIGN KEY (`mes`)         REFERENCES `mes` (`id_mes`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

  CREATE TABLE `evidencias` (
    `id_evidencia`        INT(11)      NOT NULL AUTO_INCREMENT,
    `nombre_evidencia`    VARCHAR(100) NOT NULL,
    `descripcion`         VARCHAR(255) DEFAULT NULL,
    `estado_evidencia`    INT(11)      DEFAULT 1,
    `Observacion`         TEXT         DEFAULT NULL,
    `ruta_archivo`        VARCHAR(500) DEFAULT NULL,
    `nombre_archivo`      VARCHAR(255) DEFAULT NULL,
    `fecha_creacion`      DATETIME     DEFAULT current_timestamp(),
    `fecha_actualizacion` DATETIME     DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    `id_historial`        INT(11)      DEFAULT NULL,
    `mes`                 INT(11)      DEFAULT NULL,
    PRIMARY KEY (`id_evidencia`),
    KEY `fk_evidencia_estado_ev` (`estado_evidencia`),
    KEY `fk_evidencia_historial` (`id_historial`),
    CONSTRAINT `fk_evidencia_estado_ev` FOREIGN KEY (`estado_evidencia`) REFERENCES `estados_evidencia` (`id_estado`),
    CONSTRAINT `fk_evidencia_historial` FOREIGN KEY (`id_historial`)     REFERENCES `historiales` (`id_historial`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


  -- =============================================================================
  -- 4. LOGS Y NOTIFICACIONES
  -- =============================================================================

  CREATE TABLE `log_accesos` (
    `id_log`     INT(11)      NOT NULL AUTO_INCREMENT,
    `id_persona` INT(11)      DEFAULT NULL,
    `usuario`    VARCHAR(100) DEFAULT NULL,
    `accion`     VARCHAR(100) DEFAULT NULL,
    `entidad`    VARCHAR(60)  DEFAULT NULL,
    `entidad_id` VARCHAR(60)  DEFAULT NULL,
    `detalles`   TEXT         DEFAULT NULL,
    `ip`         VARCHAR(45)  DEFAULT NULL,
    `user_agent` VARCHAR(255) DEFAULT NULL,
    `fecha`      DATETIME     DEFAULT current_timestamp(),
    PRIMARY KEY (`id_log`),
    KEY `idx_log_persona` (`id_persona`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

  CREATE TABLE `notificaciones` (
    `id_notificacion` INT(11)      NOT NULL AUTO_INCREMENT,
    `id_persona`      INT(11)      NOT NULL,
    `titulo`          VARCHAR(180) NOT NULL,
    `mensaje`         TEXT         NOT NULL,
    `link`            VARCHAR(255) DEFAULT NULL,
    `leida`           TINYINT(1)   DEFAULT 0,
    `tipo`            VARCHAR(50)  DEFAULT 'info',
    `fecha_creacion`  DATETIME     DEFAULT current_timestamp(),
    PRIMARY KEY (`id_notificacion`),
    KEY `fk_notif_persona` (`id_persona`),
    CONSTRAINT `fk_notif_persona` FOREIGN KEY (`id_persona`) REFERENCES `personas` (`id_persona`) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


  -- =============================================================================
  -- 5. ESQUEMA EXTENDIDO SGFC (módulos, periodos, uploads, firmas)
  -- =============================================================================

  CREATE TABLE `modulos` (
    `id_modulo` INT          NOT NULL AUTO_INCREMENT,
    `codigo`    VARCHAR(8)   NOT NULL UNIQUE,
    `nombre`    VARCHAR(120) NOT NULL,
    `color_hex` VARCHAR(9)   DEFAULT '#39A900',
    `activo`    TINYINT(1)   NOT NULL DEFAULT 1,
    `orden`     INT          NOT NULL DEFAULT 0,
    PRIMARY KEY (`id_modulo`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

  INSERT INTO `modulos` (`id_modulo`,`codigo`,`nombre`,`color_hex`,`orden`) VALUES
    (1,'GF','Gestión Financiera', '#39A900',1),
    (2,'GC','Gestión Contractual','#00304D',2);

  CREATE TABLE `subgrupos` (
    `id_subgrupo` INT          NOT NULL AUTO_INCREMENT,
    `id_modulo`   INT          NOT NULL,
    `codigo`      VARCHAR(16)  NOT NULL,
    `nombre`      VARCHAR(120) NOT NULL,
    `icono`       VARCHAR(60)  DEFAULT NULL,
    `orden`       INT          NOT NULL DEFAULT 0,
    `activo`      TINYINT(1)   NOT NULL DEFAULT 1,
    PRIMARY KEY (`id_subgrupo`),
    UNIQUE KEY `uk_subgrupo_codigo` (`codigo`),
    KEY `fk_subgrupo_modulo` (`id_modulo`),
    CONSTRAINT `fk_subgrupo_modulo` FOREIGN KEY (`id_modulo`) REFERENCES `modulos` (`id_modulo`) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

  INSERT INTO `subgrupos` (`id_subgrupo`,`id_modulo`,`codigo`,`nombre`,`icono`,`orden`) VALUES
    (1, 1,'GF-1','Planilla de Pagos',          'Banknote',      1),
    (2, 1,'GF-2','Seguridad Social',           'Shield',        2),
    (3, 1,'GF-3','Cuenta de Cobro',            'Receipt',       3),
    (4, 1,'GF-4','Informe Financiero',         'BarChart2',     4),
    (5, 1,'GF-5','Soportes Bancarios',         'CreditCard',    5),
    (6, 2,'GC-1','Acta de Inicio',             'FileCheck',     1),
    (7, 2,'GC-2','Programa de Formación',      'BookOpen',      2),
    (8, 2,'GC-3','Control de Asistencia',      'ClipboardCheck',3),
    (9, 2,'GC-4','Guías de Aprendizaje',       'BookMarked',    4),
    (10,2,'GC-5','Informe de Actividades',     'ClipboardList', 5),
    (11,2,'GC-6','Evidencias de Ejecución FPI','Layers',        6),
    (12,2,'GC-7','Juicios Evaluativos',        'CheckCircle',   7),
    (13,2,'GC-8','Instrumentos de Evaluación', 'FileText',      8),
    (14,2,'GC-9','Plan de Trabajo',            'Calendar',      9),
    (15,2,'GC-10','Soportes del Contrato',     'Briefcase',    10);

  CREATE TABLE `evidencias_master` (
    `id_evidencia_master` INT          NOT NULL AUTO_INCREMENT,
    `id_subgrupo`         INT          NOT NULL,
    `codigo`              VARCHAR(20)  NOT NULL,
    `nombre`              VARCHAR(180) NOT NULL,
    `descripcion`         TEXT,
    `obligatoria`         TINYINT(1)   NOT NULL DEFAULT 1,
    `requiere_firma`      TINYINT(1)   NOT NULL DEFAULT 0,
    `orden`               INT          NOT NULL DEFAULT 0,
    `activo`              TINYINT(1)   NOT NULL DEFAULT 1,
    `tipo_archivo`        VARCHAR(40)  NOT NULL DEFAULT 'pdf',
    `tamano_max_mb`       INT          NOT NULL DEFAULT 10,
    PRIMARY KEY (`id_evidencia_master`),
    UNIQUE KEY `uk_evid_master_codigo` (`codigo`),
    KEY `fk_evidm_subgrupo` (`id_subgrupo`),
    CONSTRAINT `fk_evidm_subgrupo` FOREIGN KEY (`id_subgrupo`) REFERENCES `subgrupos` (`id_subgrupo`) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

  INSERT INTO `evidencias_master` (`id_subgrupo`,`codigo`,`nombre`,`descripcion`,`obligatoria`,`orden`) VALUES
    (1,'EV-GF-01','Planilla de pago de honorarios del mes',     'Documento de pago mensual debidamente diligenciado y firmado. Formato GTH-F-062 V10.',1,1),
    (1,'EV-GF-02','Informe mensual de ejecución contractual',   'Informe detallado de las actividades realizadas en el periodo.',                    1,2),
    (1,'EV-GF-03','Formato GTH-F-062 V10',                      'Formato institucional descargado de SofiaPlus correctamente diligenciado.',          1,3),
    (2,'EV-GF-04','Aportes seguridad social mes anterior',      'Soporte de pago de salud, pensión y ARL del mes anterior.',                          1,1),
    (2,'EV-GF-05','Recibo de pago de pensiones',                'Comprobante de pago al fondo de pensiones.',                                         1,2),
    (2,'EV-GF-06','Recibo de pago de salud',                    'Comprobante de pago a la EPS correspondiente.',                                      0,3),
    (3,'EV-GF-07','Cuenta de cobro firmada',                    'Cuenta de cobro del periodo firmada por el contratista.',                            1,1),
    (3,'EV-GF-08','Soporte de certificación bancaria',          'Certificado bancario vigente que acredite la cuenta de cobro.',                      1,2),
    (4,'EV-GF-09','Informe financiero mensual',                 'Reporte consolidado de ingresos y gastos del periodo.',                              1,1),
    (4,'EV-GF-10','Reporte de actividades con costos',          'Informe de actividades ejecutadas con discriminación de costos.',                    0,2),
    (5,'EV-GF-11','Certificado bancario actualizado',           'Certificación bancaria con vigencia no mayor a 30 días.',                            1,1),
    (5,'EV-GF-12','Extracto bancario del periodo',              'Extracto de cuenta donde se acreditan los honorarios.',                              0,2),
    (6, 'EV-GC-01','Acta de inicio firmada',              'Acta de inicio del contrato firmada por todas las partes.',                     1,1),
    (6, 'EV-GC-02','Hoja de vida actualizada',            'Hoja de vida actualizada con soportes de formación académica.',                 1,2),
    (7, 'EV-GC-03','PDF programa descargado de SofiaPlus','Programa de formación descargado directamente de la plataforma SofiaPlus.',     1,1),
    (7, 'EV-GC-04','Ficha técnica del programa',          'Ficha técnica oficial del programa de formación.',                              1,2),
    (8, 'EV-GC-05','Lista de asistencia firmada',         'Listados de asistencia de aprendices firmados por sesión.',                     1,1),
    (8, 'EV-GC-06','Registro fotográfico de asistencia',  'Evidencia fotográfica de las sesiones de formación realizadas.',                0,2),
    (9, 'EV-GC-07','Guías GFP/F-135 V1 del trimestre',    'Guías de aprendizaje formato GFP/F-135 V1 del trimestre en curso.',             1,1),
    (9, 'EV-GC-08','Diseño instruccional',                'Diseño instruccional del programa de formación.',                               0,2),
    (10,'EV-GC-09','Informe mensual de actividades',      'Informe detallado de actividades pedagógicas realizadas en el mes.',            1,1),
    (10,'EV-GC-10','Cronograma ejecutado',                'Cronograma de actividades ejecutado vs. planeado.',                             1,2),
    (10,'EV-GC-11','Reporte de avance de competencias',   'Reporte del avance de los aprendices en el logro de competencias.',             0,3),
    (11,'EV-GC-12','Registro fotográfico de ejecución',   'Fotos o videos de evidencias de la ejecución de la FPI.',                       1,1),
    (11,'EV-GC-13','Actas de visita empresarial',         'Actas de las visitas realizadas a empresas por FPI.',                           0,2),
    (11,'EV-GC-14','Informe de seguimiento FPI',          'Informe de seguimiento a la Formación Profesional Integral.',                   1,3),
    (12,'EV-GC-15','Reporte de juicios evaluativos',      'Reporte excel descargado de SofiaPlus con juicios evaluativos del trimestre.', 1,1),
    (12,'EV-GC-16','Actas de evaluación de aprendices',   'Actas firmadas de los procesos de evaluación realizados.',                      1,2),
    (13,'EV-GC-17','Instrumentos de evaluación aplicados','Instrumentos evaluativos aplicados a los aprendices en el periodo.',            1,1),
    (13,'EV-GC-18','Rúbricas de evaluación',              'Rúbricas utilizadas para la valoración de competencias.',                       0,2),
    (14,'EV-GC-19','Plan de trabajo concertado',          'Plan de trabajo del periodo concertado con la coordinación.',                   1,1),
    (14,'EV-GC-20','Informe de seguimiento al plan',      'Informe de seguimiento y cumplimiento del plan de trabajo.',                    1,2),
    (15,'EV-GC-21','Póliza de seguro vigente',            'Póliza de seguro de vida vigente durante el periodo contractual.',              1,1),
    (15,'EV-GC-22','RUT actualizado',                     'RUT actualizado del contratista.',                                              1,2),
    (15,'EV-GC-23','Acta de liquidación (si aplica)',     'Acta de liquidación del contrato si aplica para el periodo.',                   0,3);

  CREATE TABLE `periodos` (
    `id_periodo`     INT          NOT NULL AUTO_INCREMENT,
    `id_contrato`    INT          NOT NULL,
    `mes`            INT          NOT NULL,
    `anio`           INT          NOT NULL,
    `nombre_periodo` VARCHAR(60)  NOT NULL,
    `fecha_apertura` DATE         DEFAULT NULL,
    `fecha_limite`   DATE         DEFAULT NULL,
    `estado`         ENUM('Bloqueado','Activo','En revisión','Pendiente firma','Firmado','Vencido') NOT NULL DEFAULT 'Bloqueado',
    `avance`         INT          NOT NULL DEFAULT 0,
    `observacion`    VARCHAR(255) DEFAULT NULL,
    `creado_en`      DATETIME     NOT NULL DEFAULT current_timestamp(),
    PRIMARY KEY (`id_periodo`),
    UNIQUE KEY `uk_periodo_contrato_mes` (`id_contrato`,`mes`,`anio`),
    KEY `fk_periodo_contrato` (`id_contrato`),
    CONSTRAINT `fk_periodo_contrato` FOREIGN KEY (`id_contrato`) REFERENCES `contratos` (`id_contrato`) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

  CREATE TABLE `evidencias_asignadas` (
    `id_asignacion`       INT        NOT NULL AUTO_INCREMENT,
    `id_periodo`          INT        NOT NULL,
    `id_evidencia_master` INT        NOT NULL,
    `obligatoria`         TINYINT(1) NOT NULL DEFAULT 1,
    `orden`               INT        NOT NULL DEFAULT 0,
    `creado_en`           DATETIME   NOT NULL DEFAULT current_timestamp(),
    PRIMARY KEY (`id_asignacion`),
    UNIQUE KEY `uk_asig_periodo_evid` (`id_periodo`,`id_evidencia_master`),
    KEY `fk_asig_periodo` (`id_periodo`),
    KEY `fk_asig_evidm`   (`id_evidencia_master`),
    CONSTRAINT `fk_asig_periodo` FOREIGN KEY (`id_periodo`)          REFERENCES `periodos`          (`id_periodo`)          ON DELETE CASCADE,
    CONSTRAINT `fk_asig_evidm`   FOREIGN KEY (`id_evidencia_master`) REFERENCES `evidencias_master` (`id_evidencia_master`) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

  CREATE TABLE `evidencias_uploads` (
    `id_upload`         INT          NOT NULL AUTO_INCREMENT,
    `id_asignacion`     INT          NOT NULL,
    `id_persona`        INT          NOT NULL,
    `nombre_original`   VARCHAR(255) NOT NULL,
    `nombre_almacenado` VARCHAR(255) NOT NULL,
    `ruta_relativa`     VARCHAR(400) NOT NULL,
    `mime_type`         VARCHAR(80)  NOT NULL,
    `tamano_bytes`      BIGINT       NOT NULL,
    `version`           INT          NOT NULL DEFAULT 1,
    `estado`            ENUM('Pendiente revisión','Aprobada','Rechazada','Pendiente entrega') NOT NULL DEFAULT 'Pendiente revisión',
    `firmado_contratista` TINYINT(1) NOT NULL DEFAULT 0,
    `firma_pagina`      INT UNSIGNED DEFAULT NULL,
    `firma_x_pct`       DECIMAL(7,4) DEFAULT NULL,
    `firma_y_pct`       DECIMAL(7,4) DEFAULT NULL,
    `firma_w_pct`       DECIMAL(7,4) DEFAULT NULL,
    `firma_h_pct`       DECIMAL(7,4) DEFAULT NULL,
    `fecha_firma_contratista` DATETIME DEFAULT NULL,
    `creado_en`         DATETIME     NOT NULL DEFAULT current_timestamp(),
    PRIMARY KEY (`id_upload`),
    KEY `fk_upload_asignacion` (`id_asignacion`),
    KEY `fk_upload_persona`    (`id_persona`),
    CONSTRAINT `fk_upload_asignacion` FOREIGN KEY (`id_asignacion`) REFERENCES `evidencias_asignadas` (`id_asignacion`) ON DELETE CASCADE,
    CONSTRAINT `fk_upload_persona`    FOREIGN KEY (`id_persona`)    REFERENCES `personas`              (`id_persona`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

  CREATE TABLE `revisiones` (
    `id_revision` INT      NOT NULL AUTO_INCREMENT,
    `id_upload`   INT      NOT NULL,
    `id_revisor`  INT      NOT NULL,
    `accion`      ENUM('Aprobada','Rechazada') NOT NULL,
    `comentario`  TEXT,
    `creado_en`   DATETIME NOT NULL DEFAULT current_timestamp(),
    PRIMARY KEY (`id_revision`),
    KEY `fk_rev_upload`  (`id_upload`),
    KEY `fk_rev_revisor` (`id_revisor`),
    CONSTRAINT `fk_rev_upload`  FOREIGN KEY (`id_upload`)  REFERENCES `evidencias_uploads` (`id_upload`) ON DELETE CASCADE,
    CONSTRAINT `fk_rev_revisor` FOREIGN KEY (`id_revisor`) REFERENCES `personas`           (`id_persona`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

  CREATE TABLE `pdfs_unificados` (
    `id_pdf`                  INT          NOT NULL AUTO_INCREMENT,
    `id_periodo`              INT          NOT NULL,
    `id_persona`              INT          NOT NULL,
    `ruta_unificado`          VARCHAR(400) DEFAULT NULL,
    `ruta_firmado_admin`      VARCHAR(400) DEFAULT NULL,
    `ruta_firmado_final`      VARCHAR(400) DEFAULT NULL,
    `estado`                  ENUM('Borrador','Enviado a administrativo','Firmado por administrativo','Enviado a contratista','Firmado por contratista','Finalizado') NOT NULL DEFAULT 'Borrador',
    `id_firmante_admin`       INT          DEFAULT NULL,
    `fecha_generado`          DATETIME     DEFAULT NULL,
    `fecha_firma_admin`       DATETIME     DEFAULT NULL,
    `fecha_firma_contratista` DATETIME     DEFAULT NULL,
    `creado_en`               DATETIME     NOT NULL DEFAULT current_timestamp(),
    PRIMARY KEY (`id_pdf`),
    UNIQUE KEY `uk_pdf_periodo_persona` (`id_periodo`,`id_persona`),
    KEY `fk_pdfu_periodo`  (`id_periodo`),
    KEY `fk_pdfu_persona`  (`id_persona`),
    KEY `fk_pdfu_firmante` (`id_firmante_admin`),
    CONSTRAINT `fk_pdfu_periodo`  FOREIGN KEY (`id_periodo`)        REFERENCES `periodos` (`id_periodo`) ON DELETE CASCADE,
    CONSTRAINT `fk_pdfu_persona`  FOREIGN KEY (`id_persona`)        REFERENCES `personas` (`id_persona`),
    CONSTRAINT `fk_pdfu_firmante` FOREIGN KEY (`id_firmante_admin`) REFERENCES `personas` (`id_persona`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

  CREATE TABLE `firmas` (
    `id_firma`   INT          NOT NULL AUTO_INCREMENT,
    `id_pdf`     INT          NOT NULL,
    `id_persona` INT          NOT NULL,
    `rol_firma`  ENUM('Administrativo','Contratista') NOT NULL,
    `imagen_b64` LONGTEXT,
    `hash`       VARCHAR(128),
    `ip`         VARCHAR(45),
    `user_agent` VARCHAR(255),
    `creado_en`  DATETIME     NOT NULL DEFAULT current_timestamp(),
    PRIMARY KEY (`id_firma`),
    KEY `fk_firma_pdf`     (`id_pdf`),
    KEY `fk_firma_persona` (`id_persona`),
    CONSTRAINT `fk_firma_pdf`     FOREIGN KEY (`id_pdf`)     REFERENCES `pdfs_unificados` (`id_pdf`) ON DELETE CASCADE,
    CONSTRAINT `fk_firma_persona` FOREIGN KEY (`id_persona`) REFERENCES `personas`        (`id_persona`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


  -- =============================================================================
  -- 6. PERSONAS DEMO
  -- =============================================================================
  -- Login: usuario + contraseña (NO correo).
  -- El campo `usuario` se calcula con la fórmula del SP `sp_insertar_persona`:
  --     LOWER( LEFT(nombres,1) + LEFT(apellidos,1) + RIGHT(cedula,5) )
  --
  -- Credenciales:
  --   sb62870 / sara123        → administrador (Super Admin)
  --   ca33124 / andica123      → administrador (Super Admin)
  --   np24023 / nicol123       → administrador (Super Admin)
  --   cs60860 / 10053660860    → administrativo de centro (Cesar Augusto Sanchez Duque)
  --   cb22222 / cont123        → contratista
  -- =============================================================================

  INSERT INTO `personas` (`id_persona`,`cedula`,`nombres`,`Apellidos`,`correo`,`usuario`,`contrasena`,`id_genero`,`id_perfil`,`activo`) VALUES
    (3,  '1054862870','Sara',         'Betancur Marquez','marquezsara1811@gmail.com','sb62870','$2y$10$GldCN3C71NCoXuihWZf83eRx3JvNX1DVyviRAB1CEM2AcV3KJQkcC',1,2,1),
    (4,  '1053833124','Carlos Andres','Andica Gomez',    'andica001@gmail.com',     'ca33124','$2y$10$qTrVUlVKCKTGQ3RwGaLECe5EthsE9PQT4zh.mg1V7lNpCeaXSpVc2',2,2,1),
    (5,  '1056124023','Nicol Dayana', 'Puerta Puerta',   'nicoldp.07@gmail.com',    'np24023','$2y$10$Jkq.EdN8WtJbjSKkcJltluk0qv7h2mSCIjf/Q3zIfwf/s/Nw4QFce',1,2,1),
    (101,'10053660860','Cesar Augusto','Sanchez Duque','cesar.sanchez@sena.edu.co','cs60860','$2y$10$sEdJHczemuOZH7hDWe1CvesSyAQFAu3XCKp/7n7qOmb.EkMfNrIC6',2,4,1),
    (102,'1099922222','Camila',       'Bernal Rojas',    'camila.bernal@sena.edu.co','cb22222','$2y$10$DGGUHvdO4jMahYr8ew2j/.77oXmDmveVKC3Q26JIsKkL8TqXK2O8m',1,1,1);


  -- =============================================================================
  -- 7. CONTRATO DEMO + PERIODOS + EVIDENCIAS ASIGNADAS
  -- =============================================================================

  INSERT INTO `contratos` (`id_contrato`,`id_persona`,`fecha_inicio`,`fecha_fin`,`tipo_contrato`,`estado`,`area_aplicacion`,`valor_contrato`,`objeto_contrato`) VALUES
    (1, 102, '2026-01-01', '2026-12-31', 1, 'Activo', 'Sistemas — Formación Profesional Integral', 36000000.00, 'Servicios profesionales de formación en programas de tecnología en análisis y desarrollo de software');

  INSERT INTO `periodos` (`id_contrato`,`mes`,`anio`,`nombre_periodo`,`fecha_apertura`,`fecha_limite`,`estado`,`avance`) VALUES
    (1, 1,2026,'Enero 2026',    '2026-01-01','2026-01-31','Firmado',         100),
    (1, 2,2026,'Febrero 2026',  '2026-02-01','2026-02-28','Firmado',         100),
    (1, 3,2026,'Marzo 2026',    '2026-03-01','2026-03-31','Pendiente firma',  95),
    (1, 4,2026,'Abril 2026',    '2026-04-01','2026-04-30','En revisión',      72),
    (1, 5,2026,'Mayo 2026',     '2026-05-01','2026-05-31','Activo',           35),
    (1, 6,2026,'Junio 2026',     NULL,        NULL,        'Bloqueado',        0),
    (1, 7,2026,'Julio 2026',     NULL,        NULL,        'Bloqueado',        0),
    (1, 8,2026,'Agosto 2026',    NULL,        NULL,        'Bloqueado',        0),
    (1, 9,2026,'Septiembre 2026',NULL,        NULL,        'Bloqueado',        0),
    (1,10,2026,'Octubre 2026',   NULL,        NULL,        'Bloqueado',        0),
    (1,11,2026,'Noviembre 2026', NULL,        NULL,        'Bloqueado',        0),
    (1,12,2026,'Diciembre 2026', NULL,        NULL,        'Bloqueado',        0);

  INSERT INTO `evidencias_asignadas` (`id_periodo`,`id_evidencia_master`,`obligatoria`,`orden`)
  SELECT p.`id_periodo`, em.`id_evidencia_master`, em.`obligatoria`, em.`orden`
  FROM `periodos` p
  CROSS JOIN `evidencias_master` em
  WHERE p.`id_contrato` = 1 AND p.`mes` = 5 AND p.`anio` = 2026 AND em.`activo` = 1;


  -- =============================================================================
  -- Fin
  -- =============================================================================
  SET FOREIGN_KEY_CHECKS = 1;
  COMMIT;
