<?php

require_once "conexao.php";

header("Content-Type: text/plain; charset=UTF-8");

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    exit("Método não permitido.");
}

$nome      = trim($_POST["nome"] ?? "");
$preco     = trim((string) ($_POST["preco"] ?? ""));
$descricao = trim($_POST["descricao"] ?? "");
$categoria = trim($_POST["categoria"] ?? "");

// Aceita vírgula como separador decimal (ex.: 10,50)
$preco = str_replace(",", ".", $preco);

// Validação

$erro = null;

if ($nome === "") {
    $erro = "O nome do doce é obrigatório.";
} elseif (mb_strlen($nome, "UTF-8") > 100) {
    $erro = "O nome deve ter no máximo 100 caracteres.";
} elseif (!preg_match('/^\d{1,8}(?:\.\d{1,2})?$/', $preco)) {
    $erro = "Preço inválido. Use um valor como 10.50.";
} elseif (mb_strlen($categoria, "UTF-8") > 50) {
    $erro = "A categoria deve ter no máximo 50 caracteres.";
} elseif (mb_strlen($descricao, "UTF-8") > 255) {
    $erro = "A descrição deve ter no máximo 255 caracteres.";
}

if ($erro !== null) {
    http_response_code(400);
    exit($erro);
}

// Normaliza para duas casas decimais, sem usar float
$partes = explode(".", $preco, 2);
$preco  = $partes[0] . "." . str_pad($partes[1] ?? "", 2, "0", STR_PAD_RIGHT);

// Cadastro

try {

    $pdo->beginTransaction();

    // Procura a categoria pelo nome; se não existir, cria.
    $id_categoria = null;

    if ($categoria !== "") {

        $stmt = $pdo->prepare(
            "SELECT id_categoria
             FROM categoria
             WHERE nome_categoria = :nome"
        );

        $stmt->execute([":nome" => $categoria]);

        $linha = $stmt->fetch();

        if ($linha) {

            $id_categoria = (int) $linha["id_categoria"];

        } else {

            $stmt = $pdo->prepare(
                "INSERT INTO categoria (nome_categoria)
                 VALUES (:nome)"
            );

            $stmt->execute([":nome" => $categoria]);

            $id_categoria = (int) $pdo->lastInsertId();

        }
    }

    $stmt = $pdo->prepare(
        "INSERT INTO doce
         (nome, preco, descricao, id_categoria)
         VALUES
         (:nome, :preco, :descricao, :id_categoria)"
    );

    $stmt->execute([
        ":nome"         => $nome,
        ":preco"        => $preco,
        ":descricao"    => $descricao,
        ":id_categoria" => $id_categoria
    ]);

    $id_doce = $pdo->lastInsertId();

    $pdo->commit();

    echo "Doce cadastrado com sucesso! ID: " . $id_doce;

} catch (PDOException $e) {

    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    error_log($e->getMessage());

    http_response_code(500);

    echo "Erro ao cadastrar o doce.";

}

?>