<?php
namespace App\Services;

use App\Config\App;

/**
 * Plantillas HTML para correos transaccionales SGFC.
 */
final class EmailTemplateService
{
    public const SENA_LOGO_CID = 'sena_logo';

    /** @return array{html:string,text:string,embeds:array<int,array{path:string,cid:string,name:string}>} */
    public static function passwordReset(string $nombre, string $link): array
    {
        $nombre = trim($nombre);
        $saludo = $nombre !== ''
            ? 'Hola, <strong>' . self::e($nombre) . '</strong>.'
            : 'Hola.';

        $html = self::wrap(
            'Restablecer contraseña — SGFC',
            self::passwordResetContent($saludo, $link)
        );

        $text = self::passwordResetPlainText($nombre, $link);

        $embeds = [];
        $logoPath = self::senaLogoPath();
        if (is_readable($logoPath)) {
            $embeds[] = [
                'path' => $logoPath,
                'cid'  => self::SENA_LOGO_CID,
                'name' => 'logo-sena.png',
            ];
        }

        return [
            'html'   => $html,
            'text'   => $text,
            'embeds' => $embeds,
        ];
    }

    public static function senaLogoPath(): string
    {
        return dirname(App::basePath())
            . DIRECTORY_SEPARATOR . 'frontend'
            . DIRECTORY_SEPARATOR . 'images'
            . DIRECTORY_SEPARATOR . 'logo-sena.png';
    }

    private static function passwordResetContent(string $saludo, string $link): string
    {
        $safeLink = self::e($link);
        $logoTag = is_readable(self::senaLogoPath())
            ? '<img src="cid:' . self::SENA_LOGO_CID . '" alt="SENA" width="120" height="auto" style="display:block;margin:0 auto 16px;border:0;max-width:120px;">'
            : '';

        return <<<HTML
<tr>
  <td style="height:4px;background-color:#39A900;font-size:0;line-height:0;">&nbsp;</td>
</tr>
<tr>
  <td style="padding:28px 32px 20px;text-align:center;">
    {$logoTag}
    <p style="margin:0;font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:0.6px;">SGFC &middot; SENA</p>
    <h1 style="margin:10px 0 0;font-size:20px;font-weight:700;color:#00304D;letter-spacing:-0.3px;line-height:1.3;">Restablecer contrase&ntilde;a</h1>
  </td>
</tr>
<tr>
  <td style="padding:0 32px 24px;color:#334155;font-size:15px;line-height:1.6;font-family:Segoe UI,Calibri,Arial,sans-serif;">
    <p style="margin:0 0 16px;">{$saludo}</p>
    <p style="margin:0 0 24px;">
      Recibimos una solicitud para restablecer la contrase&ntilde;a de su cuenta en el
      <strong>Sistema de Gesti&oacute;n Financiera y Contractual (SGFC)</strong>.
      Use el bot&oacute;n siguiente para definir una nueva contrase&ntilde;a:
    </p>
    <table role="presentation" cellspacing="0" cellpadding="0" align="center" style="margin:0 auto 24px;">
      <tr>
        <td align="center" style="border-radius:8px;background-color:#39A900;">
          <a href="{$safeLink}" target="_blank" style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:8px;">
            Restablecer contrase&ntilde;a
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 8px;font-size:13px;color:#64748B;">Si el bot&oacute;n no funciona, copie y pegue este enlace en su navegador:</p>
    <p style="margin:0 0 24px;font-size:12px;color:#004D7A;word-break:break-all;line-height:1.5;">
      <a href="{$safeLink}" style="color:#004D7A;text-decoration:underline;">{$safeLink}</a>
    </p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;">
      <tr>
        <td style="padding:14px 16px;font-size:12px;color:#475569;line-height:1.55;">
          <strong style="color:#334155;">Importante:</strong>
          el enlace es v&aacute;lido durante 30&nbsp;minutos y solo puede usarse una vez.
          Si usted no solicit&oacute; este cambio, ignore este correo; su contrase&ntilde;a actual no se modificar&aacute;.
        </td>
      </tr>
    </table>
  </td>
</tr>
<tr>
  <td style="padding:20px 32px 28px;border-top:1px solid #E2E8F0;text-align:center;font-size:11px;color:#94A3B8;line-height:1.55;font-family:Segoe UI,Calibri,Arial,sans-serif;">
    Servicio Nacional de Aprendizaje &mdash; SENA<br>
    Sistema de Gesti&oacute;n Financiera y Contractual (SGFC)
  </td>
</tr>
HTML;
    }

    private static function passwordResetPlainText(string $nombre, string $link): string
    {
        $saludo = $nombre !== '' ? "Hola, {$nombre}." : 'Hola.';
        return implode("\n", [
            $saludo,
            '',
            'Recibimos una solicitud para restablecer la contraseña de su cuenta en el',
            'Sistema de Gestión Financiera y Contractual (SGFC).',
            '',
            'Abra el siguiente enlace para definir una nueva contraseña:',
            $link,
            '',
            'El enlace es válido durante 30 minutos y solo puede usarse una vez.',
            'Si usted no solicitó este cambio, ignore este correo; su contraseña actual no se modificará.',
            '',
            '— SGFC · SENA',
        ]);
    }

    private static function wrap(string $title, string $innerRows): string
    {
        $safeTitle = self::e($title);
        return <<<HTML
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{$safeTitle}</title>
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#F1F5F9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background-color:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #E2E8F0;">
          {$innerRows}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
HTML;
    }

    private static function e(string $value): string
    {
        return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }
}
