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