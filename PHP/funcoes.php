<?php

/*
    Erro de validação: a mensagem pode ser mostrada ao usuário.
    Qualquer outra exceção é tratada como erro interno.
*/
class ErroValidacao extends Exception
{
}

/*
    Converte um valor decimal do banco ("10.50")
    para centavos inteiros (1050).
*/
function decimalParaCentavos(string $valor): int
{
    if (!preg_match('/^\d+(?:\.\d{1,2})?$/', $valor)) {
        throw new Exception("Valor monetário inválido.");
    }

    $partes = explode(".", $valor, 2);

    $reais = (int) $partes[0];

    $centavos = isset($partes[1])
        ? (int) str_pad($partes[1], 2, "0", STR_PAD_RIGHT)
        : 0;

    return ($reais * 100) + $centavos;
}

/*
    Converte centavos (1050) para o formato
    decimal aceito pelo MySQL ("10.50").
*/
function centavosParaDecimal(int $centavos): string
{
    return intdiv($centavos, 100)
        . "."
        . str_pad((string) ($centavos % 100), 2, "0", STR_PAD_LEFT);
}

/*
    REGRAS DE PREÇO DO SITE (em centavos).
    Devem ser iguais às do index.JS (função calcularPreco).
    Os sabores da mesma categoria somam as quantidades
    para formar meio cento e cento.
*/
const REGRAS_BRIGADEIRO = [
    "Tradicional"   => ["unidade" => 250, "meioCento" => 7000,  "cento" => 14000],
    "Gourmet"       => ["unidade" => 250, "meioCento" => 8750,  "cento" => 17500],
    "Personalizado" => ["unidade" => 250, "meioCento" => 10000, "cento" => 20000]
];

const PRECO_POTINHO_UNIDADE = 1000;
const PRECO_POTINHO_CENTO   = 10000;

/*
    Total (em centavos) de uma categoria, dada a quantidade
    somada de todos os sabores e o total a preço de unidade.
*/
function totalDaCategoria(
    ?string $categoria,
    int $quantidade,
    int $subtotalCentavos
): int {
    if ($quantidade <= 0) {
        return 0;
    }

    if ($categoria === "Doce no potinho") {
        return intdiv($quantidade, 100) * PRECO_POTINHO_CENTO
            + ($quantidade % 100) * PRECO_POTINHO_UNIDADE;
    }

    if ($categoria !== null && isset(REGRAS_BRIGADEIRO[$categoria])) {

        $regra = REGRAS_BRIGADEIRO[$categoria];

        if ($quantidade >= 100) {
            return $regra["cento"]
                + ($quantidade - 100) * $regra["unidade"];
        }

        if ($quantidade >= 50) {
            return $regra["meioCento"]
                + ($quantidade - 50) * $regra["unidade"];
        }

        return $quantidade * $regra["unidade"];
    }

    // Demais categorias (cones, especiais...): preço de unidade do banco
    return $subtotalCentavos;
}

/*
    Recalcula e grava o valor_total do pedido a partir dos itens.
    Retorna o total em centavos.
    Deve ser chamada dentro de uma transação.
*/
function recalcularTotalPedido(PDO $pdo, int $id_pedido): int
{
    $stmt = $pdo->prepare(
        "SELECT c.nome_categoria AS categoria,
                SUM(i.quantidade) AS quantidade,
                SUM(i.subtotal)   AS subtotal
         FROM item_pedido i
         JOIN doce d ON d.id_doce = i.id_doce
         LEFT JOIN categoria c ON c.id_categoria = d.id_categoria
         WHERE i.id_pedido = :id_pedido
         GROUP BY c.id_categoria, c.nome_categoria"
    );

    $stmt->execute([":id_pedido" => $id_pedido]);

    $total = 0;

    foreach ($stmt->fetchAll() as $linha) {
        $total += totalDaCategoria(
            $linha["categoria"],
            (int) $linha["quantidade"],
            decimalParaCentavos((string) $linha["subtotal"])
        );
    }

    $stmt = $pdo->prepare(
        "UPDATE pedido
         SET valor_total = :valor_total
         WHERE id_pedido = :id_pedido"
    );

    $stmt->execute([
        ":valor_total" => centavosParaDecimal($total),
        ":id_pedido"   => $id_pedido
    ]);

    return $total;
}
