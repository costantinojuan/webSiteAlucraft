<?php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// Incluir PHPMailer
require __DIR__ . '/PHPMailer/src/Exception.php';
require __DIR__ . '/PHPMailer/src/PHPMailer.php';
require __DIR__ . '/PHPMailer/src/SMTP.php';

// TEMPORAL: en true muestra el motivo del error en pantalla.
// Cuando el envío funcione, poné $DEBUG = false;
$DEBUG = false;

function fail($reason) {
    global $DEBUG;
    if ($DEBUG) {
        header('Content-Type: text/plain; charset=utf-8');
        echo "DEBUG ERROR: " . $reason;
    } else {
        header('Location: /contacto/?status=error');
    }
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: /contacto/');
    exit;
}

function clean_input($value) {
    return trim(strip_tags((string)$value));
}

$name = clean_input($_POST['name'] ?? '');
$telefono = clean_input($_POST['telefono'] ?? '');
$email = clean_input($_POST['email'] ?? '');
$message = clean_input($_POST['message'] ?? '');
$website = clean_input($_POST['website'] ?? '');
$formStart = (int)($_POST['form_start'] ?? 0);

// Honeypot y tiempo minimo de llenado para frenar bots.
if ($website !== '' || $formStart <= 0 || (time() - $formStart) < 3) {
    fail('anti-bot (honeypot/tiempo). form_start=' . $formStart . ' diff=' . (time() - $formStart));
}

if (
    strlen($name) < 2 || strlen($name) > 80 ||
    !preg_match('/^[0-9+()\-\s]{8,20}$/', $telefono) ||
    !filter_var($email, FILTER_VALIDATE_EMAIL) ||
    strlen($email) > 120 ||
    strlen($message) < 10 || strlen($message) > 1200
) {
    fail('validacion de campos (revisa nombre/telefono/email/mensaje)');
}

$configPath = __DIR__ . '/config.mail.php';
if (!is_file($configPath)) {
    fail('falta config.mail.php en el servidor (subilo por FTP a la misma carpeta que enviar.php)');
}
$cfg = require $configPath;

$mail = new PHPMailer(true);

try {
    $mail->isSMTP();
    $mail->Host       = $cfg['host'];
    $mail->SMTPAuth   = true;
    $mail->Username   = trim((string)$cfg['username']);
    $mail->Password   = preg_replace('/\s+/', '', (string)$cfg['password']);
    $mail->SMTPSecure = ($cfg['secure'] === 'starttls')
        ? PHPMailer::ENCRYPTION_STARTTLS
        : PHPMailer::ENCRYPTION_SMTPS;
    $mail->Port       = (int)$cfg['port'];

    $mail->setFrom($cfg['from_email'], $cfg['from_name']);
    $mail->addAddress($cfg['to_email'], $cfg['to_name']);
    $mail->CharSet = 'UTF-8';

    $mail->isHTML(true);
    $mail->Subject = 'Nuevo mensaje de contacto';
    $mail->Body    = "
        <h3>Nuevo mensaje desde el formulario</h3>
        <p><strong>Nombre:</strong> " . htmlspecialchars($name, ENT_QUOTES, 'UTF-8') . "</p>
        <p><strong>Telefono:</strong> " . htmlspecialchars($telefono, ENT_QUOTES, 'UTF-8') . "</p>
        <p><strong>Email:</strong> " . htmlspecialchars($email, ENT_QUOTES, 'UTF-8') . "</p>
        <p><strong>Mensaje:</strong><br>" . nl2br(htmlspecialchars($message, ENT_QUOTES, 'UTF-8')) . "</p>
    ";

    $mail->send();

    // Redirigir a pagina de exito
    header("Location: /gracias.html");
    exit;
} catch (Exception $e) {
    fail('SMTP: ' . $mail->ErrorInfo);
}
