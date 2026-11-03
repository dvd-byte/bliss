const nav = document.querySelectorAll("[data-acao]");
const heros = document.querySelectorAll("[data-hero]");
const botãobr = document.getElementById("botãobr");
const containeres = document.querySelectorAll(".opçõesbr:not(#opçõescones) .container");
const cardsbr = document.querySelectorAll(".card");
const addBrs = document.querySelectorAll(".saboresbr:not([id]) .add")
const opçõesbr = document.querySelector(".opçõesbr");
const saboresbr = document.querySelector(".saboresbr");
const resumo = document.querySelector(".resumo");
const avisoCarrinho = document.getElementById("aviso-carrinho");
const overlay = document.querySelector(".overlay");
overlay.addEventListener("click", fechar);
const usuario = document.querySelector(".usuario");
const botaoUsuario = document.getElementById("abrir-usuario");
const nomeUsuario = document.getElementById("usuario-nome");
const telefoneUsuario = document.getElementById("usuario-telefone");
const statusUsuario = document.getElementById("usuario-status");
const statusPedido = document.getElementById("status-pedido");
const emailUsuario = document.getElementById("usuario-email");
const enderecoUsuario = document.getElementById("usuario-endereco");
const dadosEntrega = document.getElementById("dados-entrega");
const entregaData = document.getElementById("entrega-data");
const entregaPagamento = document.getElementById("entrega-pagamento");
dadosEntrega.remove(); // volta para dentro do carrinho quando houver itens
let focoAnterior = null;
resumo.inert = true;
botaoUsuario.addEventListener("click", function() { abrir(usuario); });
document.addEventListener("keydown", function(event) {
  const menu = document.querySelector("aside.aberto");
  if (!menu) return;
  if (event.key === "Escape") fechar();
  if (event.key === "Tab") {
    const controles = menu.querySelectorAll("button, input, a[href], select, textarea");
    const primeiro = controles[0];
    const ultimo = controles[controles.length - 1];
    if (event.shiftKey && document.activeElement === primeiro) {
      event.preventDefault(); ultimo.focus();
    } else if (!event.shiftKey && document.activeElement === ultimo) {
      event.preventDefault(); primeiro.focus();
    }
  }
});
function atualizarSaudacao() {
  document.getElementById("saudacao-usuario").textContent = nomeUsuario.value.trim()
    ? "Olá, " + nomeUsuario.value.trim() + "!" : "Olá, visitante!";
}
try {
  const dados = JSON.parse(localStorage.getItem("bliss-perfil") || "null");
  if (dados && typeof dados.nome === "string" && typeof dados.telefone === "string") {
    nomeUsuario.value = dados.nome;
    telefoneUsuario.value = dados.telefone;
    if (typeof dados.email === "string") emailUsuario.value = dados.email;
    if (typeof dados.endereco === "string") enderecoUsuario.value = dados.endereco;
    atualizarSaudacao();
  }
} catch (_) { /* O formulário continua disponível sem armazenamento local. */ }
document.getElementById("form-usuario").addEventListener("submit", async function(event) {
  event.preventDefault();
  const nome = nomeUsuario.value.trim();
  const telefone = telefoneUsuario.value.trim();
  const email = emailUsuario.value.trim();
  const endereco = enderecoUsuario.value.trim();
  if (!nome) {
    statusUsuario.textContent = "Preencha seu nome para salvar.";
    nomeUsuario.focus();
    return;
  }
  try {
    localStorage.setItem("bliss-perfil", JSON.stringify({ nome: nome, telefone: telefone, email: email, endereco: endereco }));
  } catch (_) { /* O cadastro no banco não depende do armazenamento local. */ }
  atualizarSaudacao();
  statusUsuario.textContent = "Salvando...";
  const resultado = await salvarCliente(nome, telefone, email, endereco);
  statusUsuario.textContent = resultado.ok ? "Seus dados foram salvos." : resultado.texto;
});

let heroAtual = document.querySelector("[data-hero='inicio']");

let categoriaSelecionada = "";
let saborSelecionado = "";
let categoria = "";
let telaAtual = heroAtual;
let emTransicao = false;
const opcoesCones = document.getElementById("opçõescones");
const conesTradicionais = document.getElementById("conesTradicionais");
const conesCombinados = document.getElementById("conesCombinados");
document.querySelector('[data-hero="cones"] button').addEventListener("click", function() {
  trocarTela(opcoesCones);
});
opcoesCones.querySelectorAll(".container").forEach(function(container) {
  container.addEventListener("click", function() {
    trocarTela(container.dataset.tipo === "normal" ? conesTradicionais : conesCombinados);
  });
});

const pedido = [];

/* ===== INTEGRAÇÃO COM O PHP / BANCO DE DADOS ===== */

// Os arquivos PHP estão na MESMA pasta do index.html.
// Se um dia ficarem em outra pasta, coloque o caminho aqui (ex.: "PHP/").
const URL_PHP = "";

// Mesma ordem e mesmos nomes do arquivo seed_doces.sql:
// o id_doce de cada produto é a posição dele nesta lista (começando em 1).
const CATALOGO = [
  ["Tradicional", ["Chocolate", "Beijinho", "Leite em Pó", "Bicho de Pé", "Amendoim", "Café", "Maracujá"]],
  ["Gourmet", ["Chocolate", "Beijinho", "Leite em Pó", "Bicho de Pé", "Amendoim", "Café", "Maracujá"]],
  ["Personalizado", ["Chocolate", "Beijinho", "Leite em Pó", "Bicho de Pé", "Amendoim", "Café", "Maracujá"]],
  ["Cone tradicional", ["Brigadeiro", "Leite em pó", "Beijinho", "Amendoim", "Maracujá", "Surpresa de uva"]],
  ["Cone combinação", ["Brigadeiro com morango", "Brigadeiro com uva", "Leite em pó com brigadeiro",
    "Beijinho com brigadeiro", "Amendoim com brigadeiro", "Maracujá com brigadeiro"]],
  ["Doce no potinho", ["Mousse de limão", "Morango com chocolate", "Brigadeiro com beijinho"]],
  ["Doce especial", ["Coxinha de morango", "Surpresa de uva", "Bombom de morango"]]
];

const IDS_DOCES = {};
let proximoId = 1;
CATALOGO.forEach(function(grupo) {
  grupo[1].forEach(function(nome) {
    IDS_DOCES[grupo[0] + "|" + nome] = proximoId++;
  });
});

let clienteAtual = null;
try {
  const salvo = JSON.parse(localStorage.getItem("bliss-cliente") || "null");
  if (salvo && salvo.id) clienteAtual = salvo;
} catch (_) { /* segue sem armazenamento local */ }

function guardarCliente(cliente) {
  clienteAtual = cliente;
  try {
    if (cliente) localStorage.setItem("bliss-cliente", JSON.stringify(cliente));
    else localStorage.removeItem("bliss-cliente");
  } catch (_) { /* o cliente continua válido nesta página */ }
}

async function enviarParaPHP(url, dados) {
  try {
    const resposta = await fetch(url, { method: "POST", body: dados });
    let texto = new DOMParser()
      .parseFromString(await resposta.text(), "text/html")
      .body.textContent.trim();
    if (!resposta.ok && (!texto || texto.length > 200)) {
      texto = "Não foi possível enviar (erro " + resposta.status + "). Abra o site pelo servidor PHP.";
    }
    return { ok: resposta.ok, texto: texto };
  } catch (_) {
    return { ok: false, texto: "Não foi possível conectar ao servidor. Tente novamente." };
  }
}

async function salvarCliente(nome, telefone, email, endereco) {
  if (clienteAtual && clienteAtual.nome === nome && clienteAtual.telefone === telefone
      && (clienteAtual.email || "") === email && (clienteAtual.endereco || "") === endereco) {
    return { ok: true, texto: "Seus dados já estavam salvos." };
  }
  const dados = new FormData();
  dados.append("nome", nome);
  dados.append("telefone", telefone);
  dados.append("email", email);
  dados.append("endereco", endereco);
  const resultado = await enviarParaPHP(URL_PHP + "cadastrar_clientes.php", dados);
  const id = resultado.texto.match(/ID:\s*(\d+)/);
  if (resultado.ok && id) {
    guardarCliente({ id: id[1], nome: nome, telefone: telefone, email: email, endereco: endereco });
  } else if (resultado.ok) {
    return { ok: false, texto: "Não foi possível confirmar o cadastro." };
  }
  return resultado;
}

function mostrarStatusPedido(texto, sucesso) {
  if (!statusPedido) { alert(texto); return; }
  statusPedido.textContent = texto;
  statusPedido.classList.toggle("sucesso", sucesso);
  statusPedido.classList.toggle("erro", !sucesso);
}

// Menor data/hora que o campo de entrega aceita (agora, no horário local)
function minimoEntrega() {
  const agora = new Date();
  agora.setMinutes(agora.getMinutes() - agora.getTimezoneOffset());
  return agora.toISOString().slice(0, 16);
}

async function finalizarPedido() {
  if (!pedido.length) return;

  if (!clienteAtual) {
    statusUsuario.textContent = "Salve seus dados para finalizar o pedido.";
    abrir(usuario);
    return;
  }

  const formaPagamento = entregaPagamento.value;
  if (!formaPagamento) {
    mostrarStatusPedido("Escolha a forma de pagamento.", false);
    entregaPagamento.focus();
    return;
  }

  const dados = new FormData();
  dados.append("id_cliente", clienteAtual.id);
  dados.append("status", "Pendente");
  if (entregaData.value) dados.append("data_entrega", entregaData.value);

  for (let i = 0; i < pedido.length; i++) {
    const idDoce = IDS_DOCES[pedido[i].categoria + "|" + pedido[i].doce];
    if (!idDoce) {
      mostrarStatusPedido("Produto sem cadastro no banco: " + pedido[i].doce, false);
      return;
    }
    dados.append("itens[" + i + "][id_doce]", idDoce);
    dados.append("itens[" + i + "][quantidade]", pedido[i].quantidade);
  }

  const botao = document.getElementById("finalizar");
  if (botao) botao.disabled = true;

  const resultado = await enviarParaPHP(URL_PHP + "cadastrar_pedido.php", dados);

  if (resultado.ok) {
    const numero = resultado.texto.match(/Pedido número:\s*(\d+)/);
    const total = resultado.texto.match(/Valor total:\s*(R\$\s*[\d.,]+)/);
    let mensagem = "Pedido " + (numero ? "nº " + numero[1] + " " : "") + "enviado!"
      + (total ? " Total: " + total[1] + "." : "");
    let sucesso = true;

    // Registra o pagamento do pedido (fica pendente até a confirmação)
    if (numero) {
      const pagamento = new FormData();
      pagamento.append("id_pedido", numero[1]);
      pagamento.append("forma_pagamento", formaPagamento);
      pagamento.append("status_pagamento", "Pendente");
      const resultadoPagamento = await enviarParaPHP(URL_PHP + "cadastrar_pagamento.php", pagamento);
      if (resultadoPagamento.ok) {
        mensagem += " Pagamento: " + formaPagamento + " (pendente).";
      } else {
        mensagem += " O pagamento não foi registrado: " + resultadoPagamento.texto;
        sucesso = false;
      }
    }

    pedido.length = 0;
    entregaData.value = "";
    entregaPagamento.value = "";
    atualizarResumo();
    mostrarStatusPedido(mensagem, sucesso);
    return;
  }

  if (/Cliente não encontrado/.test(resultado.texto)) {
    guardarCliente(null);
    resultado.texto = "Seus dados não foram encontrados. Salve-os novamente em 'Minha conta'.";
  }
  if (botao) botao.disabled = false;
  mostrarStatusPedido(resultado.texto, false);
}

const brigadeiro = {
  tradicional: {
    tipo: "Tradicional",
    precos: {
      unidade: 2.50,
      meioCento: 70.00,
      cento: 140.00
    },
    sabores: {
      chocolate: "Chocolate",
      beijinho: "Beijinho",
      leitePo: "Leite em Pó",
      bichoPe: "Bicho de Pé",
      amendoim: "Amendoim",
      cafe: "Café",
      maracuja: "Maracujá",
    },
  },

  gourmet: {
    tipo: "Gourmet",
    precos: {
      unidade: 2.50,
      meioCento: 87.50,
      cento: 175.00
    },
    sabores: {
      chocolate: "Chocolate",
      beijinho: "Beijinho",
      leitePo: "Leite em Pó",
      bichoPe: "Bicho de Pé",
      amendoim: "Amendoim",
      cafe: "Café",
      maracuja: "Maracujá",
    },
  },

  personalizado: {
    tipo: "Personalizado",
    precos: {
      unidade: 2.50,
      meioCento: 100.00,
      cento: 200.00
    },
    sabores: {
      chocolate: "Chocolate",
      beijinho: "Beijinho",
      leitePo: "Leite em Pó",
      bichoPe: "Bicho de Pé",
      amendoim: "Amendoim",
      cafe: "Café",
      maracuja: "Maracujá",
    },
  },
};

botãobr.addEventListener("click", function () {
  mostrarOpções();
});

containeres.forEach(function (container) {
  container.addEventListener("click", function(event) {
    categoriaSelecionada = event.currentTarget.dataset.tipo;
    categoria = brigadeiro[categoriaSelecionada]; //virou brigadeiro.(categoria)
    mostrarSabores();
  });
});

const estadoVazio = [resumo.querySelector("#carrinho"), resumo.querySelector("#vazio")];
const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

addBrs.forEach(function(add) {
  add.addEventListener("click", function(event) {
    const sabor = event.currentTarget.id;
    if (!categoria || !categoria.sabores[sabor]) return;
    const existente = pedido.find(function(item) {
      return item.doce === categoria.sabores[sabor] && item.categoria === categoria.tipo;
    });
    if (existente) {
      addDoce(existente);
      return;
    }
    pedido.push({
      doce: categoria.sabores[sabor],
      quantidade: 1,
      categoria: categoria.tipo,
      preco: categoria.precos.unidade
    });
    atualizarResumo();
    avisarAdicao();
  });
});

const precoCone = 10.00;
document.querySelectorAll("#conesTradicionais .add, #conesCombinados .add").forEach(function(botao) {
  botao.addEventListener("click", function() {
    const doce = botao.dataset.sabor;
    const categoriaCone = botao.closest("#conesTradicionais") ? "Cone tradicional" : "Cone combinação";
    const existente = pedido.find(function(item) {
      return item.doce === doce && item.categoria === categoriaCone;
    });
    if (existente) {
      addDoce(existente);
      return;
    }
    pedido.push({ doce, categoria: categoriaCone, quantidade: 1, preco: precoCone });
    atualizarResumo();
    avisarAdicao();
  });
});

const precosPotinho = { unidade: 10.00, cento: 100.00 };
const precoEspecial = 14.00;
[
  { hero: "doPo", tela: "saboresPotinhos", categoria: "Doce no potinho", preco: precosPotinho.unidade },
  { hero: "especiais", tela: "saboresEspeciais", categoria: "Doce especial", preco: precoEspecial }
].forEach(function(produto) {
  const tela = document.getElementById(produto.tela);
  document.querySelector('[data-hero="' + produto.hero + '"] button').addEventListener("click", function() {
    trocarTela(tela);
  });
  tela.querySelectorAll(".add").forEach(function(botao) {
    botao.addEventListener("click", function() {
      const doce = botao.dataset.sabor;
      const existente = pedido.find(function(item) {
        return item.doce === doce && item.categoria === produto.categoria;
      });
      if (existente) {
        addDoce(existente);
        return;
      }
      pedido.push({ doce, categoria: produto.categoria, quantidade: 1, preco: produto.preco });
      atualizarResumo();
      avisarAdicao();
    });
  });
});

function calcularPreco(itemPedido) {
  const quantidade = itemPedido.quantidade;
  if (quantidade <= 0) return 0;
  if (itemPedido.categoria === "Doce no potinho") {
    return Math.floor(quantidade / 100) * Math.round(precosPotinho.cento * 100)
      + (quantidade % 100) * Math.round(precosPotinho.unidade * 100);
  }
  if (itemPedido.categoria === "Doce especial") {
    return quantidade * Math.round(precoEspecial * 100);
  }
  if (itemPedido.categoria === "Cone tradicional" || itemPedido.categoria === "Cone combinação") {
    return quantidade * Math.round(precoCone * 100);
  }

  const categorias = {
    Tradicional: brigadeiro.tradicional.precos,
    Gourmet: brigadeiro.gourmet.precos,
    Personalizado: brigadeiro.personalizado.precos
  };

  const precos = categorias[itemPedido.categoria];

  if (!precos || quantidade <= 0) return 0;

  let totalEmCentavos;

  if (quantidade >= 100) {
    totalEmCentavos =
      Math.round(precos.cento * 100) +
      (quantidade - 100) * Math.round(precos.unidade * 100);
  } else if (quantidade >= 50) {
    totalEmCentavos =
      Math.round(precos.meioCento * 100) +
      (quantidade - 50) * Math.round(precos.unidade * 100);
  } else {
    totalEmCentavos =
      quantidade * Math.round(precos.unidade * 100);
  }

  return totalEmCentavos;
}

function atualizarResumo() {
  resumo.querySelector(".pedido")?.remove();
  estadoVazio.forEach(function(elemento) {
    elemento.hidden = pedido.length > 0;
  });
  if (!pedido.length) return;
  if (statusPedido) statusPedido.textContent = "";

  const containerPedido = document.createElement("div");
  containerPedido.classList.add("pedido");
  pedido.forEach(function(itemPedido) {
    criarItem(containerPedido, itemPedido);
  });
  const final = document.createElement("div");
  final.classList.add("final");
  const subtotal = document.createElement("p");
  subtotal.id = "subtotal";
  // Sabores da mesma categoria compartilham os pacotes de meio cento e cento.
  const grupos = new Map();
  pedido.forEach(function(item) {
    const quantidade = grupos.get(item.categoria) || 0;
    grupos.set(item.categoria, quantidade + item.quantidade);
  });
  const total = Array.from(grupos, function([categoria, quantidade]) {
    return { categoria, quantidade };
  }).reduce(function(soma, item) {
    return soma + calcularPreco(item);
  }, 0);
  subtotal.textContent = "Subtotal: " + moeda.format(total / 100);
  subtotal.setAttribute("aria-live", "polite");
  const finalizar = document.createElement("button");
  finalizar.id = "finalizar";
  finalizar.type = "button";
  finalizar.textContent = "Finalizar";
  finalizar.addEventListener("click", finalizarPedido);
  final.append(subtotal, finalizar);
  entregaData.min = minimoEntrega();
  containerPedido.append(dadosEntrega, final);
  resumo.appendChild(containerPedido);
}

function criarItem(containerPedido, itemPedido) {
  const novoItem = document.createElement("div");
  novoItem.classList.add("item");
  const infos = document.createElement("div");
  const tituloInfo = document.createElement("h3");
  tituloInfo.textContent = itemPedido.doce;
  const categoriaInfo = document.createElement("p");
  categoriaInfo.textContent = itemPedido.categoria;
  infos.append(tituloInfo, categoriaInfo);
  const quantidadeDoce = document.createElement("div");
  quantidadeDoce.classList.add("quantidade");
  const botaoRemover = document.createElement("button");
  botaoRemover.type = "button";
  botaoRemover.textContent = "-";
  botaoRemover.setAttribute("aria-label", "Remover uma unidade de " + itemPedido.doce);
  botaoRemover.addEventListener("click", function() { removeDoce(itemPedido); });
  const botaoAdicionar = document.createElement("button");
  botaoAdicionar.type = "button";
  botaoAdicionar.textContent = "+";
  botaoAdicionar.setAttribute("aria-label", "Adicionar uma unidade de " + itemPedido.doce);
  botaoAdicionar.addEventListener("click", function() { addDoce(itemPedido); });
  const inputQuantidade = document.createElement("input");
  inputQuantidade.type = "number";
  inputQuantidade.value = itemPedido.quantidade;
  inputQuantidade.min = 0;
  inputQuantidade.step = 1;
  inputQuantidade.setAttribute("aria-label", "Quantidade de " + itemPedido.doce + " " + itemPedido.categoria);
  inputQuantidade.addEventListener("change", function() {
    const quantidade = inputQuantidade.valueAsNumber;
    if (!Number.isSafeInteger(quantidade) || quantidade < 0) {
      inputQuantidade.value = itemPedido.quantidade;
      return;
    }
    alterarQuantidade(itemPedido, quantidade);
  });
  quantidadeDoce.append(botaoRemover, inputQuantidade, botaoAdicionar);
  novoItem.append(infos, quantidadeDoce);
  containerPedido.appendChild(novoItem);
}

function trocarTela(destino) {
  if (!destino || destino === telaAtual || emTransicao) return;
  emTransicao = true;
  const origem = telaAtual;
  let temporizador;
  function concluir(event) {
    if (event && (event.target !== origem || event.propertyName !== "transform")) return;
    origem.removeEventListener("transitionend", concluir);
    clearTimeout(temporizador);
    if (destino.hasAttribute("data-hero")) {
      destino.classList.add("deslizarCarrossel");
      heroAtual = destino;
    } else {
      destino.classList.remove("escondido");
    }
    telaAtual = destino;
    emTransicao = false;
  }
  origem.addEventListener("transitionend", concluir);
  if (origem.hasAttribute("data-hero")) origem.classList.remove("deslizarCarrossel");
  else origem.classList.add("escondido");
  // Garante a troca mesmo quando o navegador não emite transitionend.
  const estilo = getComputedStyle(origem);
  const segundos = valor => valor.trim().endsWith("ms") ? parseFloat(valor) / 1000 : parseFloat(valor);
  const duracoes = estilo.transitionDuration.split(",").map(segundos);
  const atrasos = estilo.transitionDelay.split(",").map(segundos);
  const tempo = Math.max(...duracoes.map((duracao, i) => duracao + atrasos[i % atrasos.length]));
  temporizador = setTimeout(concluir, tempo * 1000 + 50);
}

function mostrarOpções() {
  trocarTela(opçõesbr);
}

function mostrarSabores() {
  trocarTela(saboresbr);
}

function abrir(menu = resumo){
  if (!document.querySelector("aside.aberto")) focoAnterior = document.activeElement;
  document.querySelectorAll("aside.aberto").forEach(function(aberto) {
    aberto.classList.remove("aberto");
    aberto.inert = true;
  });
  menu.inert = false;
  menu.classList.add("aberto");
  if (menu === resumo) avisoCarrinho.hidden = true;
  overlay.hidden = false;
  botaoUsuario.setAttribute("aria-expanded", String(menu === usuario));
  menu.querySelector(".fechar").focus();
}

function fechar(){
  document.querySelectorAll("aside.aberto").forEach(function(menu) {
    menu.classList.remove("aberto");
    menu.inert = true;
  });
  overlay.hidden = true;
  botaoUsuario.setAttribute("aria-expanded", "false");
  focoAnterior?.focus();
  focoAnterior = null;
}

nav.forEach(function(button) {
  button.addEventListener("click", function(event) {
    const destino = Array.from(heros).find(function(hero) {
      return hero.dataset.hero === event.currentTarget.dataset.acao;
    });
    trocarTela(destino);
  });
});

function alterarQuantidade(itemPedido, quantidade) {
  const index = pedido.indexOf(itemPedido);
  if (index < 0 || !Number.isSafeInteger(quantidade) || quantidade < 0) return;
  if (quantidade === 0) {
    pedido.splice(index, 1);
  } else {
    itemPedido.quantidade = quantidade;
  }
  atualizarResumo();
}

function addDoce(itemPedido) {
  alterarQuantidade(itemPedido, itemPedido.quantidade + 1);
  avisarAdicao();
}

function avisarAdicao() {
  avisoCarrinho.hidden = resumo.classList.contains("aberto");
}

function removeDoce(itemPedido) {
  alterarQuantidade(itemPedido, itemPedido.quantidade - 1);
}
