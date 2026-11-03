<?php

require_once __DIR__ . "/conexao.php";
require_once __DIR__ . "/funcoes.php";

header("Content-Type: text/plain; charset=UTF-8");

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    exit("Método não permitido.");
}

try {

    /* RECEBER DADOS */

    $id_cliente = filter_var(
        $_POST["id_cliente"] ?? null,
        FILTER_VALIDATE_INT,
        ["options" => ["min_range" => 1]]
    );

    $data_entrega = trim($_POST["data_entrega"] ?? "");
    $status       = trim($_POST["status"] ?? "");
    $itens        = $_POST["itens"] ?? [];


    /* VALIDAR CLIENTE */

    if ($id_cliente === false || $id_cliente === null) {
        throw new ErroValidacao("Cliente inválido.");
    }


    /* VALIDAR STATUS */

    $statusPermitidos = [
        "Pendente",
        "Em produção",
        "Pronto",
        "Entregue"
    ];

    if (!in_array($status, $statusPermitidos, true)) {
        throw new ErroValidacao("Status inválido.");
    }


    /* VALIDAR DATA DE ENTREGA (opcional) */

    if ($data_entrega !== "") {

        $dataValida = DateTime::createFromFormat(
            "!Y-m-d\TH:i",
            $data_entrega
        );

        if (
            !$dataValida ||
            $dataValida->format("Y-m-d\TH:i") !== $data_entrega
        ) {
            throw new ErroValidacao("Data de entrega inválida.");
        }

        if ($dataValida < new DateTime("today")) {
            throw new ErroValidacao(
                "A data de entrega não pode estar no passado."
            );
        }

        $data_entrega = $dataValida->format("Y-m-d H:i:s");

    } else {

        $data_entrega = null;

    }


    /* VALIDAR ITENS */

    if (
        !is_array($itens) ||
        count($itens) === 0 ||
        count($itens) > 100
    ) {
        throw new ErroValidacao(
            "O pedido precisa ter entre 1 e 100 itens."
        );
    }


    /* INICIAR TRANSAÇÃO */

    $pdo->beginTransaction();


    /* VERIFICAR CLIENTE */

    $stmt = $pdo->prepare(
        "SELECT id_cliente
         FROM cliente
         WHERE id_cliente = :id_cliente"
    );

    $stmt->execute([":id_cliente" => $id_cliente]);

    if (!$stmt->fetch()) {
        throw new ErroValidacao("Cliente não encontrado.");
    }


    /* CRIAR PEDIDO */

    $stmt = $pdo->prepare(
        "INSERT INTO pedido
         (id_cliente, data_entrega, status, valor_total)
         VALUES
         (:id_cliente, :data_entrega, :status, 0.00)"
    );

    $stmt->execute([
        ":id_cliente"   => $id_cliente,
        ":data_entrega" => $data_entrega,
        ":status"       => $status
    ]);

    $id_pedido = (int) $pdo->lastInsertId();


    /* PREPARAR CONSULTAS */

    $stmtPreco = $pdo->prepare(
        "SELECT preco
         FROM doce
         WHERE id_doce = :id_doce"
    );

    $stmtItem = $pdo->prepare(
        "INSERT INTO item_pedido
         (id_pedido, id_doce, quantidade, preco_unitario, subtotal)
         VALUES
         (:id_pedido, :id_doce, :quantidade, :preco_unitario, :subtotal)"
    );


    /* PROCESSAR CADA ITEM */

    foreach ($itens as $item) {

        if (!is_array($item)) {
            throw new ErroValidacao("Item inválido.");
        }

        $id_doce = filter_var(
            $item["id_doce"] ?? null,
            FILTER_VALIDATE_INT,
            ["options" => ["min_range" => 1]]
        );

        if ($id_doce === false || $id_doce === null) {
            throw new ErroValidacao("Doce inválido.");
        }

        $quantidade = filter_var(
            $item["quantidade"] ?? null,
            FILTER_VALIDATE_INT,
            ["options" => ["min_range" => 1, "max_range" => 10000]]
        );

        if ($quantidade === false || $quantidade === null) {
            throw new ErroValidacao(
                "Quantidade inválida (use de 1 a 10000)."
            );
        }

        // Preço sempre vem do banco, nunca do formulário
        $stmtPreco->execute([":id_doce" => $id_doce]);

        $doce = $stmtPreco->fetch();

        if (!$doce) {
            throw new ErroValidacao("Doce não encontrado.");
        }

        $preco_unitario_centavos = decimalParaCentavos(
            (string) $doce["preco"]
        );

        $subtotal_centavos = $preco_unitario_centavos * $quantidade;

        $stmtItem->execute([
            ":id_pedido"      => $id_pedido,
            ":id_doce"        => $id_doce,
            ":quantidade"     => $quantidade,
            ":preco_unitario" => centavosParaDecimal($preco_unitario_centavos),
            ":subtotal"       => centavosParaDecimal($subtotal_centavos)
        ]);

    }


    /* CALCULAR E GRAVAR O TOTAL (com os pacotes de meio cento e cento) */

    $valor_total_centavos = recalcularTotalPedido($pdo, $id_pedido);


    /* CONFIRMAR TRANSAÇÃO */

    $pdo->commit();


    /* RESPOSTA */

    echo "Pedido cadastrado com sucesso!\n";
    echo "Pedido número: " . $id_pedido . "\n";
    echo "Valor total: R$ "
        . number_format($valor_total_centavos / 100, 2, ",", ".");

} catch (Throwable $e) {

    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    if ($e instanceof ErroValidacao) {

        http_response_code(400);

        echo $e->getMessage();

    } else {

        error_log($e->getMessage());

        http_response_code(500);

        echo "Não foi possível cadastrar o pedido. Tente novamente.";

    }

}
