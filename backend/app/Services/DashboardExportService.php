<?php
namespace App\Services;

use App\Config\App;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Drawing;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

final class DashboardExportService
{
    private const C_VERDE      = 'FF39A900';
    private const C_VERDE_LT   = 'FFF0FDF4';
    private const C_AZUL       = 'FF00304D';
    private const C_AZUL_LT    = 'FFEFF6FF';
    private const C_BLANCO     = 'FFFFFFFF';
    private const C_GRIS0      = 'FFF8FAFC';
    private const C_GRIS2      = 'FFE2E8F0';
    private const C_AMARILLO_LT= 'FFFEF9C3';
    private const C_NARANJA_LT = 'FFFFF7ED';
    private const C_ROJO_LT    = 'FFFEE2E2';

    /** @param array<int,array<string,mixed>> $rows */
    public static function download(array $rows, array $kpis, array $user): void
    {
        $spreadsheet = self::createWorkbook($rows, $kpis, $user);

        $filename = 'SGFC_listado_' . date('Ymd_His') . '.xlsx';
        header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Cache-Control: max-age=0');

        $writer = new Xlsx($spreadsheet);
        $writer->save('php://output');
        $spreadsheet->disconnectWorksheets();
        exit;
    }

    /** @param array<int,array<string,mixed>> $rows */
    public static function createWorkbook(array $rows, array $kpis, array $user): Spreadsheet
    {
        $inst = InstitutionalConfigService::get();
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Evidencias');

        $lastCol = 'J';
        $sheet->getColumnDimension('A')->setWidth(14);
        $sheet->getColumnDimension('B')->setWidth(28);
        $sheet->getColumnDimension('C')->setWidth(10);
        $sheet->getColumnDimension('D')->setWidth(8);
        $sheet->getColumnDimension('E')->setWidth(22);
        $sheet->getColumnDimension('F')->setWidth(36);
        $sheet->getColumnDimension('G')->setWidth(18);
        $sheet->getColumnDimension('H')->setWidth(18);
        $sheet->getColumnDimension('I')->setWidth(18);
        $sheet->getColumnDimension('J')->setWidth(40);

        // Encabezado institucional (filas 1–3)
        $sheet->mergeCells('A1:B3');
        $sheet->mergeCells('C1:J1');
        $sheet->mergeCells('C2:J2');
        $sheet->mergeCells('C3:J3');
        $sheet->getStyle('A1:J3')->applyFromArray([
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => self::C_AZUL]],
            'font' => ['bold' => true, 'color' => ['argb' => self::C_BLANCO], 'size' => 14, 'name' => 'Calibri'],
            'alignment' => ['vertical' => Alignment::VERTICAL_CENTER],
        ]);
        $sheet->getRowDimension(1)->setRowHeight(28);
        $sheet->getRowDimension(2)->setRowHeight(22);
        $sheet->getRowDimension(3)->setRowHeight(18);

        self::addLogo($sheet);

        $regional = trim((string) ($inst['nombre_regional'] ?? 'Regional Caldas'));
        $centro   = trim((string) ($inst['nombre_centro'] ?? 'Centro de Formación'));
        $exportBy = trim((string) ($user['nombre'] ?? 'Administrativo'));

        $sheet->setCellValue('C1', 'SGFC — Sistema de Gestión Financiera y Contractual');
        $sheet->setCellValue('C2', "SENA {$regional} · {$centro}");
        $sheet->setCellValue('C3', 'Listado de evidencias por contratista · Generado: ' . date('d/m/Y H:i') . " · {$exportBy}");
        $sheet->getStyle('C1:C3')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_LEFT);
        $sheet->getStyle('C1')->getFont()->setSize(16);
        $sheet->getStyle('C2')->getFont()->setSize(11)->setBold(false);
        $sheet->getStyle('C3')->getFont()->setSize(10)->setBold(false)->getColor()->setARGB('FFCBD5E1');

        // KPIs (fila 5)
        $kpiLabels = [
            ['Contratistas activos', (int) ($kpis['contratistas_activos'] ?? 0), self::C_AZUL_LT, self::C_AZUL],
            ['Aprobadas', (int) ($kpis['aprobadas'] ?? 0), self::C_VERDE_LT, self::C_VERDE],
            ['Pend. revisión', (int) ($kpis['pendiente_revision'] ?? 0), self::C_AMARILLO_LT, 'FFCA8A04'],
            ['Pend. entrega', (int) ($kpis['pendiente_entrega'] ?? 0), self::C_NARANJA_LT, 'FFEA580C'],
            ['Rechazadas', (int) ($kpis['rechazadas'] ?? 0), self::C_ROJO_LT, 'FFDC2626'],
        ];
        $kpiRanges = ['A5:B5', 'C5:D5', 'E5:F5', 'G5:H5', 'I5:J5'];
        foreach ($kpiLabels as $i => [$label, $val, $bg, $fg]) {
            if (!isset($kpiRanges[$i])) {
                break;
            }
            $range = $kpiRanges[$i];
            $col = explode(':', $range)[0];
            $sheet->mergeCells($range);
            $sheet->setCellValue($col, "{$label}\n{$val}");
            $sheet->getStyle($range)->applyFromArray([
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => $bg]],
                'font' => ['bold' => true, 'color' => ['argb' => $fg], 'size' => 11, 'name' => 'Calibri'],
                'alignment' => [
                    'horizontal' => Alignment::HORIZONTAL_CENTER,
                    'vertical'   => Alignment::VERTICAL_CENTER,
                    'wrapText'   => true,
                ],
                'borders' => ['outline' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => self::C_GRIS2]]],
            ]);
        }
        $sheet->getRowDimension(5)->setRowHeight(42);

        // Encabezados tabla (fila 7)
        $headers = ['Periodo', 'Contratista', 'Contrato', 'Módulo', 'Subgrupo', 'Evidencia', 'Estado', 'Fecha carga', 'Fecha revisión', 'Observaciones'];
        $headerRow = 7;
        foreach ($headers as $i => $h) {
            $col = chr(ord('A') + $i);
            $sheet->setCellValue("{$col}{$headerRow}", $h);
        }
        $sheet->getStyle("A{$headerRow}:{$lastCol}{$headerRow}")->applyFromArray([
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => self::C_VERDE]],
            'font' => ['bold' => true, 'color' => ['argb' => self::C_BLANCO], 'size' => 11, 'name' => 'Calibri'],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER, 'wrapText' => true],
            'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => self::C_BLANCO]]],
        ]);
        $sheet->getRowDimension($headerRow)->setRowHeight(28);

        // Datos
        $rowNum = $headerRow + 1;
        foreach ($rows as $r) {
            $sheet->setCellValue("A{$rowNum}", $r['nombre_periodo'] ?? '');
            $sheet->setCellValue("B{$rowNum}", $r['contratista'] ?? '');
            $sheet->setCellValue("C{$rowNum}", '#' . ($r['id_contrato'] ?? ''));
            $sheet->setCellValue("D{$rowNum}", $r['modulo'] ?? '');
            $sheet->setCellValue("E{$rowNum}", $r['subgrupo'] ?? '');
            $sheet->setCellValue("F{$rowNum}", $r['evidencia'] ?? '');
            $sheet->setCellValue("G{$rowNum}", $r['estado'] ?? '');
            $sheet->setCellValue("H{$rowNum}", self::fmtDate($r['fecha_carga'] ?? null));
            $sheet->setCellValue("I{$rowNum}", self::fmtDate($r['fecha_revision'] ?? null));
            $sheet->setCellValue("J{$rowNum}", $r['observaciones'] ?? '');

            $bg = ($rowNum % 2 === 0) ? self::C_GRIS0 : self::C_BLANCO;
            $sheet->getStyle("A{$rowNum}:{$lastCol}{$rowNum}")->applyFromArray([
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => $bg]],
                'font' => ['size' => 10, 'name' => 'Calibri', 'color' => ['argb' => 'FF334155']],
                'alignment' => ['vertical' => Alignment::VERTICAL_CENTER, 'wrapText' => true],
                'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_HAIR, 'color' => ['argb' => self::C_GRIS2]]],
            ]);

            self::styleEstadoCell($sheet, "G{$rowNum}", (string) ($r['estado'] ?? ''));
            self::styleModuloCell($sheet, "D{$rowNum}", (string) ($r['modulo'] ?? ''));

            $rowNum++;
        }

        $lastDataRow = max($headerRow, $rowNum - 1);
        $sheet->setAutoFilter("A{$headerRow}:{$lastCol}{$lastDataRow}");
        $sheet->freezePane('A' . ($headerRow + 1));

        // Leyenda estados (columna derecha inferior)
        $legendRow = $lastDataRow + 2;
        $sheet->setCellValue("A{$legendRow}", 'Leyenda de estados');
        $sheet->getStyle("A{$legendRow}")->applyFromArray([
            'font' => ['bold' => true, 'color' => ['argb' => self::C_AZUL], 'size' => 11],
        ]);
        $legendItems = [
            ['Aprobada', self::C_VERDE_LT, self::C_VERDE],
            ['Pendiente revisión', self::C_AMARILLO_LT, 'FFCA8A04'],
            ['Pendiente entrega', self::C_NARANJA_LT, 'FFEA580C'],
            ['Rechazada', self::C_ROJO_LT, 'FFDC2626'],
        ];
        foreach ($legendItems as $i => [$label, $bg, $fg]) {
            $lr = $legendRow + 1 + $i;
            $sheet->mergeCells("A{$lr}:B{$lr}");
            $sheet->setCellValue("A{$lr}", $label);
            $sheet->getStyle("A{$lr}:B{$lr}")->applyFromArray([
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => $bg]],
                'font' => ['bold' => true, 'color' => ['argb' => $fg], 'size' => 10],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
                'borders' => ['outline' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => self::C_GRIS2]]],
            ]);
        }

        return $spreadsheet;
    }

    private static function addLogo(\PhpOffice\PhpSpreadsheet\Worksheet\Worksheet $sheet): void
    {
        $candidates = [
            App::basePath('assets/logo-sena.png'),
            App::basePath('../frontend/images/logo-sena.png'),
        ];
        $path = null;
        foreach ($candidates as $p) {
            if (is_file($p)) {
                $path = $p;
                break;
            }
        }
        if ($path === null) {
            return;
        }

        $drawing = new Drawing();
        $drawing->setName('Logo SENA');
        $drawing->setDescription('Logo institucional SENA');
        $drawing->setPath($path);
        $drawing->setHeight(48);
        $drawing->setCoordinates('A1');
        $drawing->setOffsetX(8);
        $drawing->setOffsetY(10);
        $drawing->setWorksheet($sheet);
    }

    private static function styleEstadoCell(\PhpOffice\PhpSpreadsheet\Worksheet\Worksheet $sheet, string $cell, string $estado): void
    {
        $map = [
            'Aprobada'           => [self::C_VERDE_LT, self::C_VERDE],
            'Pendiente revisión' => [self::C_AMARILLO_LT, 'FFCA8A04'],
            'Pendiente entrega'  => [self::C_NARANJA_LT, 'FFEA580C'],
            'Rechazada'          => [self::C_ROJO_LT, 'FFDC2626'],
        ];
        if (!isset($map[$estado])) {
            return;
        }
        [$bg, $fg] = $map[$estado];
        $sheet->getStyle($cell)->applyFromArray([
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => $bg]],
            'font' => ['bold' => true, 'color' => ['argb' => $fg], 'size' => 10],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
        ]);
    }

    private static function styleModuloCell(\PhpOffice\PhpSpreadsheet\Worksheet\Worksheet $sheet, string $cell, string $modulo): void
    {
        if ($modulo === 'GF') {
            $sheet->getStyle($cell)->applyFromArray([
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => self::C_VERDE_LT]],
                'font' => ['bold' => true, 'color' => ['argb' => self::C_VERDE]],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            ]);
        } elseif ($modulo === 'GC') {
            $sheet->getStyle($cell)->applyFromArray([
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => self::C_AZUL_LT]],
                'font' => ['bold' => true, 'color' => ['argb' => self::C_AZUL]],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            ]);
        }
    }

    private static function fmtDate(?string $value): string
    {
        if ($value === null || trim($value) === '') {
            return '';
        }
        $ts = strtotime($value);
        return $ts ? date('d/m/Y H:i', $ts) : $value;
    }
}
