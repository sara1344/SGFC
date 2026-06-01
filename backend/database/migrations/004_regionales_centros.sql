-- SGFC — Migración 004: regionales, centros y vínculo en personas
-- Ejecutar en MySQL:  USE sgfc;  luego pegar este script.

USE sgfc;

SET NAMES utf8mb4;

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE `centros`;
TRUNCATE TABLE `regionales`;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE IF NOT EXISTS `regionales` (
  `id_regional` INT(11)      NOT NULL AUTO_INCREMENT,
  `nombre`      VARCHAR(120) NOT NULL,
  `activo`      TINYINT(1)   NOT NULL DEFAULT 1,
  PRIMARY KEY (`id_regional`),
  UNIQUE KEY `uq_regionales_nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `centros` (
  `id_centro`   INT(11)      NOT NULL AUTO_INCREMENT,
  `id_regional` INT(11)      NOT NULL,
  `nombre`      VARCHAR(200) NOT NULL,
  `activo`      TINYINT(1)   NOT NULL DEFAULT 1,
  PRIMARY KEY (`id_centro`),
  KEY `fk_centro_regional` (`id_regional`),
  UNIQUE KEY `uq_centro_regional_nombre` (`id_regional`, `nombre`),
  CONSTRAINT `fk_centro_regional` FOREIGN KEY (`id_regional`) REFERENCES `regionales` (`id_regional`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `regionales` (`id_regional`, `nombre`) VALUES
(1, 'Regional Amazonas'),
(2, 'Regional Antioquia'),
(3, 'Regional Arauca'),
(4, 'Regional Atlántico'),
(5, 'Regional Bolívar'),
(6, 'Regional Boyacá'),
(7, 'Regional Caldas'),
(8, 'Regional Caquetá'),
(9, 'Regional Casanare'),
(10, 'Regional Cauca'),
(11, 'Regional Cesar'),
(12, 'Regional Chocó'),
(13, 'Regional Córdoba'),
(14, 'Regional Cundinamarca'),
(15, 'Regional Distrito Capital'),
(16, 'Regional Guainía'),
(17, 'Regional Guaviare'),
(18, 'Regional Huila'),
(19, 'Regional La Guajira'),
(20, 'Regional Magdalena'),
(21, 'Regional Meta'),
(22, 'Regional Nariño'),
(23, 'Regional Norte de Santander'),
(24, 'Regional Putumayo'),
(25, 'Regional Quindío'),
(26, 'Regional Risaralda'),
(27, 'Regional San Andrés, Providencia y Santa Catalina'),
(28, 'Regional Santander'),
(29, 'Regional Sucre'),
(30, 'Regional Tolima'),
(31, 'Regional Valle del Cauca'),
(32, 'Regional Vaupés'),
(33, 'Regional Vichada')
ON DUPLICATE KEY UPDATE `nombre` = VALUES(`nombre`);

INSERT INTO `centros` (`id_centro`, `id_regional`, `nombre`) VALUES
(1, 1, 'Centro para la Biodiversidad y el Turismo del Amazonas'),
(2, 2, 'Centro de los Recursos Naturales Renovables La Salada'),
(3, 2, 'Centro de Formación Profesional Minero Ambiental'),
(4, 2, 'Centro del Diseño y Manufactura del Cuero'),
(5, 2, 'Centro de Formación en Diseño, Confección y Moda'),
(6, 2, 'Centro para el Desarrollo del Hábitat y Construcción'),
(7, 2, 'Centro de Tecnología de la Manufactura Avanzada'),
(8, 2, 'Centro Tecnológico del Mobiliario'),
(9, 2, 'Centro Textil y de Gestión Industrial'),
(10, 2, 'Centro de Comercio'),
(11, 2, 'Complejo Tecnológico para la Gestión Agroempresarial'),
(12, 2, 'Complejo Tecnológico Minero Agroempresarial'),
(13, 2, 'Centro de la Innovación, la Agroindustria y la Aviación'),
(14, 2, 'Complejo Tecnológico Agroindustrial, Pecuario y Turístico'),
(15, 2, 'Centro de Servicios de Salud'),
(16, 2, 'Centro de Servicios y Gestión Empresarial'),
(17, 2, 'Complejo Tecnológico Turístico y Agroindustrial del Occidente Antioqueño'),
(18, 3, 'Centro de Gestión y Desarrollo Agroindustrial de Arauca'),
(19, 4, 'Centro de Comercio y Servicios'),
(20, 4, 'Centro Nacional Colombo Alemán'),
(21, 4, 'Centro Industrial y de Aviación'),
(22, 4, 'Centro para el Desarrollo Agroecológico y Agroindustrial'),
(23, 5, 'Centro de Comercio y Servicios'),
(24, 5, 'Centro para la Industria Petroquímica'),
(25, 5, 'Centro Agroempresarial y Minero'),
(26, 5, 'Centro Internacional Náutico, Fluvial y Portuario'),
(27, 6, 'Centro de Desarrollo Agropecuario y Agroindustrial'),
(28, 6, 'Centro Minero'),
(29, 6, 'Centro de Gestión Administrativa y Fortalecimiento Empresarial'),
(30, 6, 'Centro Industrial de Mantenimiento y Manufactura'),
(31, 6, 'Centro de la Innovación Agroindustrial y de Servicios'),
(32, 7, 'Centro Pecuario Agroempresarial'),
(33, 7, 'Centro de Comercio y Servicios'),
(34, 7, 'Centro para la Formación Cafetera'),
(35, 7, 'Centro de Automatización Industrial'),
(36, 7, 'Centro de Procesos Industriales'),
(37, 8, 'Centro Tecnológico de la Amazonía'),
(38, 9, 'Centro Agroindustrial y Fortalecimiento Empresarial de Casanare'),
(39, 10, 'Centro de Comercio y Servicios'),
(40, 10, 'Centro Industrial'),
(41, 10, 'Centro Agropecuario'),
(42, 11, 'Centro Biotecnológico del Caribe'),
(43, 11, 'Centro Agroempresarial'),
(44, 11, 'Centro de Innovación y de Gestión Empresarial y Cultural'),
(45, 12, 'Centro de Recursos Naturales, Industria y Biodiversidad'),
(46, 13, 'Centro de Comercio, Industria y Turismo de Córdoba'),
(47, 13, 'Centro Agropecuario y de Biotecnología El Porvenir'),
(48, 14, 'Centro Industrial y Desarrollo Empresarial'),
(49, 14, 'Centro de Desarrollo Agroindustrial y Empresarial'),
(50, 14, 'Centro Agroecológico y Empresarial'),
(51, 14, 'Centro de la Tecnología del Diseño y la Productividad Empresarial'),
(52, 14, 'Centro de Biotecnología Agropecuaria'),
(53, 14, 'Centro de Desarrollo Agroempresarial'),
(54, 15, 'Centro de Tecnologías para la Construcción y la Madera'),
(55, 15, 'Centro de Electricidad, Electrónica y Telecomunicaciones'),
(56, 15, 'Centro de Gestión Industrial'),
(57, 15, 'Centro de Manufactura en Textiles y Cuero'),
(58, 15, 'Centro de Tecnologías del Transporte'),
(59, 15, 'Centro Metalmecánico'),
(60, 15, 'Centro de Materiales y Ensayos'),
(61, 15, 'Centro de Diseño, Metrología y Calidad'),
(62, 15, 'Centro para la Industria de la Comunicación Gráfica'),
(63, 15, 'Centro de Gestión de Mercados, Logística y Tecnologías de la Información'),
(64, 15, 'Centro de Formación en Actividad Física y Cultura'),
(65, 15, 'Centro de Formación de Talento Humano en Salud'),
(66, 15, 'Centro de Gestión Administrativa'),
(67, 15, 'Centro de Servicios Financieros'),
(68, 15, 'Centro Nacional de Hotelería, Turismo y Alimentos'),
(69, 16, 'Centro Ambiental y Ecoturístico del Nororiente Amazónico'),
(70, 17, 'Centro de Desarrollo Agroindustrial, Turístico y Tecnológico del Guaviare'),
(71, 18, 'Centro de Formación Agroindustrial'),
(72, 18, 'Centro Agroempresarial y Desarrollo Pecuario del Huila'),
(73, 18, 'Centro de Desarrollo Agroempresarial y Turístico del Huila'),
(74, 18, 'Centro de la Industria, la Empresa y los Servicios'),
(75, 18, 'Centro de Gestión y Desarrollo Sostenible Surcolombiano'),
(76, 19, 'Centro Industrial y de Energías Alternativas'),
(77, 19, 'Centro Agroempresarial y Acuícola'),
(78, 20, 'Centro Acuícola y Agroindustrial de Gaira'),
(79, 20, 'Centro de Logística y Promoción Ecoturística del Magdalena'),
(80, 21, 'Centro de Industria y Servicios del Meta'),
(81, 21, 'Centro Agroindustrial del Meta'),
(82, 22, 'Centro Sur Colombiano de Logística Internacional'),
(83, 22, 'Centro Agroindustrial y Pesquero de la Costa Pacífica'),
(84, 22, 'Centro Internacional de Producción Limpia - Lope'),
(85, 23, 'Centro de la Industria, la Empresa y los Servicios'),
(86, 23, 'Centro de Formación para el Desarrollo Rural y Minero'),
(87, 24, 'Centro Agroforestal y Acuícola Arapaima'),
(88, 25, 'Centro Agroindustrial'),
(89, 25, 'Centro para el Desarrollo Tecnológico de la Construcción'),
(90, 25, 'Centro de Comercio y Turismo'),
(91, 26, 'Centro de Comercio y Servicios'),
(92, 26, 'Centro de Atención Sector Agropecuario'),
(93, 26, 'Centro de Diseño e Innovación Tecnológica Industrial'),
(94, 27, 'Centro de Formación Turística, Gente de Mar y de Servicios'),
(95, 28, 'Centro Industrial de Mantenimiento Integral'),
(96, 28, 'Centro Industrial del Diseño y la Manufactura'),
(97, 28, 'Centro de Atención al Sector Agropecuario'),
(98, 28, 'Centro de Servicios Empresariales y Turísticos'),
(99, 28, 'Centro Industrial y del Desarrollo Tecnológico'),
(100, 28, 'Centro Agroturístico'),
(101, 28, 'Centro Agroempresarial y Turístico de los Andes'),
(102, 28, 'Centro de Gestión Agroempresarial del Oriente'),
(103, 29, 'Centro de la Innovación, la Tecnología y los Servicios'),
(104, 30, 'Centro de Comercio y Servicios'),
(105, 30, 'Centro Agropecuario La Granja'),
(106, 30, 'Centro de Industria y Construcción'),
(107, 31, 'Centro de Electricidad y Automatización Industrial'),
(108, 31, 'Centro de la Construcción'),
(109, 31, 'Centro de Diseño Tecnológico Industrial'),
(110, 31, 'Centro Nacional de Asistencia Técnica a la Industria - ASTIN'),
(111, 31, 'Centro Agropecuario de Buga'),
(112, 31, 'Centro Latinoamericano de Especies Menores'),
(113, 31, 'Centro Náutico Pesquero'),
(114, 31, 'Centro de Gestión Tecnológica de Servicios'),
(115, 31, 'Centro de Tecnologías Agroindustriales'),
(116, 31, 'Centro de Biotecnología Industrial'),
(117, 32, 'Centro Agropecuario y de Servicios Ambientales “Jirijirimo”'),
(118, 33, 'Centro de Producción y Transformación Agroindustrial de la Orinoquía')
ON DUPLICATE KEY UPDATE `nombre` = VALUES(`nombre`), `id_regional` = VALUES(`id_regional`);

-- Agregar columna id_centro a personas (si aún no existe)
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'personas' AND COLUMN_NAME = 'id_centro'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE `personas`
     ADD COLUMN `id_centro` INT(11) DEFAULT NULL AFTER `id_perfil`,
     ADD KEY `fk_persona_centro` (`id_centro`),
     ADD CONSTRAINT `fk_persona_centro` FOREIGN KEY (`id_centro`) REFERENCES `centros` (`id_centro`)
       ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;