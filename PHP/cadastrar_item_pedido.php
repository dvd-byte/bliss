<?php

require_once "conexao.php";
require_once "funcoes.php";

header("Content-Type: text/plain; charset=UTF-8");

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    exit("Método não permitido.");
}

$id_pedido = filter_input(
    INPUT_POST,
    "id_pedido",
    FILTER_VALIDATE_INT,
    ["options" => ["min_range" => 1]]
);

$id_doce = filter_input(
    INPUT_POST,
    "id_doce",
    FILTER_VALIDATE_INT,
    ["options" => ["min_range" => 1]]
);

$quantidade = filter_input(
    INPUT_POST,
    "quantidade",
    FILTER_VALIDATE_INT,
    ["options" => ["min_range" => 1, "max_range" => 10000]]
);

// Validação

if ($id_pedido === false || $id_pedido === null) {
    http_response_code(400);
    exit("Pedido inválido.");
}

if ($id_doce === false || $id_doce === null) {
    http_response_code(400);
    exit("Doce inválido.");
}

if ($quantidade === false || $quantidade === null) {
    http_response_code(400);
    exit("Quantidade inválida (use de 1 a 10000).");
}

try {

    $pdo->beginTransaction();

    // Verifica se o pedido existe e o trava até o fim da transação

    $stmt = $pdo->prepare(
        "SELECT id_pedido
         FROM pedido
         WHERE id_pedido = :id_pedido
         FOR UPDATE"
    );

    $stmt->execute([":id_pedido" => $id_pedido]);

    if (!$stmt->fetch()) {
        throw new ErroValidacao("Pedido não encontrado.");
    }

    // Busca o preço atual do doce

    $stmt = $pdo->prepare(
        "SELECT preco
         FROM doce
         WHERE id_doce = :id_doce"
    );

    $stmt->execute([":id_doce" => $id_doce]);

    $doce = $stmt->fetch();

    if (!$doce) {
        throw new ErroValidacao("Doce não encontrado.");
    }

    // Calcula o subtotal em centavos (sem float)

    $preco_centavos = decimalParaCentavos((string) $doce["preco"]);
    $subtotal_centavos = $preco_centavos * $quantidade;

    // Insere o item

    $stmt = $pdo->prepare(
        "INSERT INTO item_pedido
         (id_pedido, id_doce, quantidade, preco_unitario, subtotal)
         VALUES
         (:id_pedido, :id_doce, :quantidade, :preco_unitario, :subtotal)"
    );

    $stmt->execute([
        ":id_pedido"      => $id_pedido,
        ":id_doce"        => $id_doce,
        ":quantidade"     => $quantidade,
        ":preco_unitario" => centavosParaDecimal($preco_centavos),
        ":subtotal"       => centavosParaDecimal($subtotal_centavos)
    ]);

    // Recalcula o total do pedido (com os pacotes de meio cento e cento)

    recalcularTotalPedido($pdo, $id_pedido);

    $pdo->commit();

    echo "Item adicionado ao pedido!";

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
        echo "Não foi possível adicionar o item.";
    }

}
