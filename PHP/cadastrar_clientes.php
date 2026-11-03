<?php

require_once __DIR__ . "/conexao.php";

header("Content-Type: text/plain; charset=UTF-8");

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    exit("Método não permitido.");
}

$nome     = trim($_POST["nome"] ?? "");
$telefone = trim($_POST["telefone"] ?? "");
$email    = trim($_POST["email"] ?? "");
$endereco = trim($_POST["endereco"] ?? "");

// Validação

$erro = null;

if ($nome === "") {
    $erro = "O nome é obrigatório.";
} elseif (mb_strlen($nome, "UTF-8") > 100) {
    $erro = "O nome deve ter no máximo 100 caracteres.";
} elseif (
    $telefone !== "" &&
    (
        mb_strlen($telefone, "UTF-8") > 20 ||
        !preg_match('/^[0-9()+\-.\s]{8,20}$/', $telefone)
    )
) {
    $erro = "Telefone inválido.";
} elseif ($email !== "" && mb_strlen($email, "UTF-8") > 100) {
    $erro = "O email deve ter no máximo 100 caracteres.";
} elseif ($email !== "" && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $erro = "Email inválido.";
} elseif (mb_strlen($endereco, "UTF-8") > 200) {
    $erro = "O endereço deve ter no máximo 200 caracteres.";
}

if ($erro !== null) {
    http_response_code(400);
    exit($erro);
}

// Cadastro

try {

    $sql = "INSERT INTO cliente
            (nome, telefone, email, endereco)
            VALUES
            (:nome, :telefone, :email, :endereco)";

    $stmt = $pdo->prepare($sql);

    $stmt->execute([
        ":nome"     => $nome,
        ":telefone" => $telefone !== "" ? $telefone : null,
        ":email"    => $email !== "" ? $email : null,
        ":endereco" => $endereco !== "" ? $endereco : null
    ]);

    echo "Cliente cadastrado com sucesso! ID: " . $pdo->lastInsertId();

} catch (PDOException $e) {

    error_log($e->getMessage());

    http_response_code(500);

    echo "Não foi possível cadastrar o cliente.";

}

?>