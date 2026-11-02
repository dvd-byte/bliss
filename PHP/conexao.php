<?php

date_default_timezone_set("America/Sao_Paulo");

$host = "127.0.0.1";
$banco   = "bd_bliss";
$usuario = "bliss";
$senha = "bliss123";

try {

    $pdo = new PDO(
        "mysql:host=$host;dbname=$banco; charset-utf8mb4",
        $usuario,
        $senha,
        [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
            PDO::MYSQL_ATTR_INIT_COMMAND => "SET time_zone = '-03:00'"
        ]
    );

} catch (PDOException $e) {
    error_log($e->getMessage());
    http_response_code(500);
    exit("Erro de conexão com o banco.");
}

?>
