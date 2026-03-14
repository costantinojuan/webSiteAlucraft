<?php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// Incluir PHPMailer
require __DIR__ . '/PHPMailer/src/Exception.php';
require __DIR__ . '/PHPMailer/src/PHPMailer.php';
require __DIR__ . '/PHPMailer/src/SMTP.php';

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

    $mail->isHTML(true);
    $mail->Subject = 'Nuevo mensaje de contacto';
    $mail->Body    = "
        <h3>Nuevo mensaje desde el formulario</h3>
        <p><strong>Nombre:</strong> {$_POST['name']}</p>
        <p><strong>Tel¨¦fono:</strong> {$_POST['telefono']}</p>
        <p><strong>Email:</strong> {$_POST['email']}</p>
        <p><strong>Mensaje:</strong><br>{$_POST['message']}</p>
    ";

    $mail->send();

    // Redirigir a p¨¢gina de ¨¦xito
    header("Location: gracias.html");
    exit;
} catch (Exception $e) {
    // Redirigir a p¨¢gina de error
    header("Location: error.html");
    exit;
}
