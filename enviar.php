<?php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// Incluir PHPMailer
require __DIR__ . '/PHPMailer/src/Exception.php';
require __DIR__ . '/PHPMailer/src/PHPMailer.php';
require __DIR__ . '/PHPMailer/src/SMTP.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: pagina4/contacto.html');
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
    header('Location: pagina4/contacto.html?status=error');
    exit;
}

if (
    strlen($name) < 2 || strlen($name) > 80 ||
    !preg_match('/^[0-9+()\-\s]{8,20}$/', $telefono) ||
    !filter_var($email, FILTER_VALIDATE_EMAIL) ||
    strlen($email) > 120 ||
    strlen($message) < 10 || strlen($message) > 1200
) {
    header('Location: pagina4/contacto.html?status=error');
    exit;
}

$mail = new PHPMailer(true);

try {
    $mail->isSMTP();
    $mail->Host       = 'smtp.gmail.com';
    $mail->SMTPAuth   = true;
    $mail->Username   = 'craft.aluminio@gmail.com';
    $mail->Password   = 'ripj larf ycod bwny';
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
    $mail->Port       = 465;

    $mail->setFrom('craft.aluminio@gmail.com', 'Alucraft');
    $mail->addAddress('craft.aluminio@gmail.com', 'Alucraft');
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
    header("Location: gracias.html");
    exit;
} catch (Exception $e) {
    // Redirigir a contacto con estado de error
    header("Location: pagina4/contacto.html?status=error");
    exit;
}
