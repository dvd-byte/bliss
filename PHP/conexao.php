<?php

$host = "localhost"
$banco = ""
$usuario = "root"
$senha = ""

try {

    $pdo = new PDO(
        "mysql:host=$host;dbname=$banco; charset-utf8mb4",
        $usuario,
        $senha,
        [
            PDO: :ATTR_ERRMODE => PDO: :ERRMODE_EXCEPTION,
            PDO: :ATTR_DEFAULT_FETCH_MODE => PDO: :FETCH_ASS0C,

            PDO: :ATTR_EMULATE_PREPARES => false
        ]
    );

} catch (PDOException $e) {

    error_log($e->getMessage())

    die("Erro ao conectar ao banco.");
}

?>