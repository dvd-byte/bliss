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
    atualizarSaudacao();
  }
} catch (_) { /* O formulário continua disponível sem armazenamento local. */ }
document.getElementById("form-usuario").addEventListener("submit", function(event) {
  event.preventDefault();
  if (!nomeUsuario.value.trim()) {
    statusUsuario.textContent = "Preencha seu nome para salvar.";
    nomeUsuario.focus();
    return;
  }
  try {
    localStorage.setItem("bliss-perfil", JSON.stringify({
      nome: nomeUsuario.value.trim(), telefone: telefoneUsuario.value.trim()
    }));
    atualizarSaudacao();
    statusUsuario.textContent = "Seus dados foram salvos neste navegador.";
  } catch (_) {
    statusUsuario.textContent = "Não foi possível salvar os dados neste navegador.";
  }
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
  final.append(subtotal, finalizar);
  containerPedido.appendChild(final);
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
