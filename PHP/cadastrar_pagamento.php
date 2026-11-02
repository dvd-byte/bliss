<?php

require_once "conexao.php";
require_once "funcoes.php";

header("Content-Type: text/plain; charset=UTF-8");

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    exit("Método não permitido.");
}

// Ajustar depois de ver o banco de dados
$formasPermitidas = [
    "Dinheiro",
    "Pix",
    "Cartão de crédito",
    "Cartão de débito"
];

$statusPermitidos = [
    "Pendente",
    "Pago",
    "Cancelado"
];

$id_pedido = filter_input(
    INPUT_POST,
    "id_pedido",
    FILTER_VALIDATE_INT,
    ["options" => ["min_range" => 1]]
);

$forma_pagamento  = trim($_POST["forma_pagamento"] ?? "");
$status_pagamento = trim($_POST["status_pagamento"] ?? "");

// Validação

if ($id_pedido === false || $id_pedido === null) {
    http_response_code(400);
    exit("Pedido inválido.");
}

if (!in_array($forma_pagamento, $formasPermitidas, true)) {
    http_response_code(400);
    exit("Forma de pagamento inválida.");
}

if (!in_array($status_pagamento, $statusPermitidos, true)) {
    http_response_code(400);
    exit("Status do pagamento inválido.");
}

// Cadastro

try {

    $pdo->beginTransaction();

    // Busca e trava o pedido

    $stmt = $pdo->prepare(
        "SELECT valor_total
         FROM pedido
         WHERE id_pedido = :id_pedido
         FOR UPDATE"
    );

    $stmt->execute([":id_pedido" => $id_pedido]);

    $pedido = $stmt->fetch();

    if (!$pedido) {
        throw new ErroValidacao("Pedido não encontrado.");
    }

    $valor = centavosParaDecimal(
        decimalParaCentavos((string) $pedido["valor_total"])
    );

    if ($valor === "0.00") {
        throw new ErroValidacao(
            "O pedido não possui itens. Adicione itens antes de pagar."
        );
    }

    // Impede pagamento duplicado

    $stmt = $pdo->prepare(
        "SELECT id_pedido
         FROM pagamento
         WHERE id_pedido = :id_pedido
         LIMIT 1"
    );

    $stmt->execute([":id_pedido" => $id_pedido]);

    if ($stmt->fetch()) {
        throw new ErroValidacao("Este pedido já possui um pagamento.");
    }

    // Registra o pagamento

    $stmt = $pdo->prepare(
        "INSERT INTO pagamento
         (id_pedido, forma_pagamento, valor, status_pagamento)
         VALUES
         (:id_pedido, :forma_pagamento, :valor, :status_pagamento)"
    );

    $stmt->execute([
        ":id_pedido"        => $id_pedido,
        ":forma_pagamento"  => $forma_pagamento,
        ":valor"            => $valor,
        ":status_pagamento" => $status_pagamento
    ]);

    $pdo->commit();

    echo "Pagamento cadastrado com sucesso!";

} catch (Throwable $e) {

    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    if ($e instanceof ErroValidacao) {
        http_response_code(400);
        echo $e->getMessage();
    } else {
        error_log($e->getMessage());
        http_response_code(500);
        echo "Não foi possível cadastrar o pagamento.";
    }

}

?>