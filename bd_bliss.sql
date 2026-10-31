-- Cria banco de dados
CREATE DATABASE IF NOT EXISTS bd_bliss
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE bd_bliss;

-- Cria tabelas

CREATE TABLE cliente (
    id_cliente INT AUTO_INCREMENT PRIMARY KEY,
    nome       VARCHAR(100) NOT NULL,
    telefone   VARCHAR(20)  NULL,
    email      VARCHAR(100) NULL,
    endereco   VARCHAR(200) NULL
) ENGINE=InnoDB;

CREATE TABLE categoria (
    id_categoria   INT AUTO_INCREMENT PRIMARY KEY,
    nome_categoria VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE doce (
    id_doce      INT AUTO_INCREMENT PRIMARY KEY,
    id_categoria INT NULL,
    descricao    VARCHAR(255) NULL,
    nome         VARCHAR(100) NOT NULL,
    preco        DECIMAL(10,2) NOT NULL,
    CHECK (preco >= 0)
) ENGINE=InnoDB;

CREATE TABLE pedido (
    id_pedido    INT AUTO_INCREMENT PRIMARY KEY,
    id_cliente   INT NOT NULL,
    data_pedido  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_entrega DATETIME NULL,
    status       VARCHAR(20) NOT NULL,
    valor_total  DECIMAL(10,2) NOT NULL DEFAULT 0.00
) ENGINE=InnoDB;

CREATE TABLE item_pedido (
    id_item        INT AUTO_INCREMENT PRIMARY KEY,
    id_pedido      INT NOT NULL,
    id_doce        INT NOT NULL,
    quantidade     INT NOT NULL,
    preco_unitario DECIMAL(10,2) NOT NULL,
    subtotal       DECIMAL(10,2) NOT NULL,
    CHECK (quantidade > 0)
) ENGINE=InnoDB;

CREATE TABLE pagamento (
    id_pagamento     INT AUTO_INCREMENT PRIMARY KEY,
    id_pedido        INT NOT NULL,
    forma_pagamento  VARCHAR(30) NOT NULL,
    valor            DECIMAL(10,2) NOT NULL,
    status_pagamento VARCHAR(20) NOT NULL
) ENGINE=InnoDB;

-- Chaves estrangeiras

ALTER TABLE doce
    ADD FOREIGN KEY (id_categoria) REFERENCES categoria (id_categoria);

ALTER TABLE pedido
    ADD FOREIGN KEY (id_cliente) REFERENCES cliente (id_cliente);

ALTER TABLE item_pedido
    ADD FOREIGN KEY (id_pedido) REFERENCES pedido (id_pedido),
    ADD FOREIGN KEY (id_doce)   REFERENCES doce (id_doce);

ALTER TABLE pagamento
    ADD FOREIGN KEY (id_pedido) REFERENCES pedido (id_pedido);
