<?php
// Plantilla de configuración de correo.
// Copiá este archivo como "config.mail.php" y completá con datos reales.
// IMPORTANTE: config.mail.php NO se sube al repo (está en .gitignore).

return [
    'host'       => 'smtp.gmail.com',
    'username'   => 'tucorreo@gmail.com',
    'password'   => 'app-password-aca',
    'port'       => 465,
    'secure'     => 'smtps', // 'smtps' (465) o 'starttls' (587)
    'from_email' => 'tucorreo@gmail.com',
    'from_name'  => 'Alucraft',
    'to_email'   => 'tucorreo@gmail.com',
    'to_name'    => 'Alucraft',
];
