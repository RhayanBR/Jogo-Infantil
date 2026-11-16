import { useEffect, useRef, useState } from "react";
import { sortearBicho, TOTAL_DE_BICHOS } from "./bichos";
import { criarVoz } from "./voz";
import { criarFalas } from "./falas";
import { tocarSom } from "./sons";

// "Encontre os animais": os bichos passeiam pelo pasto, a palavra de um deles
// aparece no meio e a voz pede para pegar esse bicho. Quem é pego vai para o
// cercadinho do celeiro, e o número em cima do celeiro conta quantos já estão lá.
// Bicho que já foi pego não volta mais: quando todos estiverem presos, acabou.
export default function Animais() {
  const pastoRef = useRef(null);
  const [rodada, setRodada] = useState(0);
  const [acabou, setAcabou] = useState(false);

  // Cada rodada começa uma brincadeira nova, do zero
  useEffect(() => iniciarCaca(pastoRef.current, () => setAcabou(true)), [rodada]);

  function jogarDeNovo() {
    setAcabou(false);
    setRodada((r) => r + 1);
  }

  return (
    <div className="pasto" ref={pastoRef}>
      <div className="tufos">
        {TUFOS.map(([x, y, t], i) => (
          <img key={i} className="tufo" src="/cenario/tufo.png" alt="" draggable="false" style={{ left: x + "%", top: y + "%", width: t + "vmin" }} />
        ))}
      </div>
      <div className="palavra-alvo" />
      {acabou && (
        <button className="escolha jogar-de-novo" style={{ "--cor": "#43a047" }} onClick={jogarDeNovo}>
          <span className="figura">🔄</span>
          Jogar de novo
        </button>
      )}
      <div className="fazenda">
        <div className="cercadinho">
          <div className="cerca h cima" />
          <div className="cerca h baixo" />
          <div className="cerca v esquerda" />
        </div>
        <div className="celeiro">
          <div className="contador">0</div>
          <Celeiro />
        </div>
      </div>
    </div>
  );
}

// Posições (em %) e tamanhos dos tufinhos de grama espalhados pelo pasto
const TUFOS = [
  [6, 12, 8], [24, 7, 6], [42, 14, 7], [63, 6, 6], [82, 11, 8], [93, 28, 6], [12, 34, 7], [33, 30, 6],
  [55, 36, 8], [75, 40, 6], [5, 58, 8], [22, 52, 6], [48, 60, 7], [70, 62, 8], [90, 55, 6], [15, 74, 6],
];

// Celeiro 3D (renderizado no Blender)
function Celeiro() {
  return (
    <>
      <img className="base" src="/cenario/celeiro-base.png" alt="Celeiro" draggable="false" />
      <img className="porta porta-esq" src="/cenario/porta-esq.png" alt="" draggable="false" />
      <img className="porta porta-dir" src="/cenario/porta-dir.png" alt="" draggable="false" />
      <div className="fazendeiro">
        <img className="normal" src="/cenario/fazendeiro.png" alt="" draggable="false" />
        <img className="mao" src="/cenario/fazendeiro-mao.png" alt="" draggable="false" />
      </div>
    </>
  );
}

const QUANTOS = 5; // sempre pelo menos 5 bichos andando no pasto
const CERCA = 12; // grossura da cerca do cercadinho (igual ao CSS)
const LADOS = ["cima", "esquerda", "direita"]; // por onde os bichos chegam
const DENTRO = 30; // quanto o bicho anda para dentro da tela antes de passear

function iniciarCaca(pasto, aoAcabar) {
  const timers = new Set();
  let quadro = null;

  function depois(fn, ms) {
    const id = setTimeout(() => {
      timers.delete(id);
      fn();
    }, ms);
    timers.add(id);
  }

  const voz = criarVoz(depois);
  const falas = criarFalas(voz, depois); // falas gravadas (public/sounds/animais)
  const idDe = (tipo) => tipo.palavra.toLowerCase();
  const cartao = pasto.querySelector(".palavra-alvo");
  const fazenda = pasto.querySelector(".fazenda");
  const cercadinho = pasto.querySelector(".cercadinho");
  const celeiro = pasto.querySelector(".celeiro");
  let fazendeiroOcupado = false;
  const contador = pasto.querySelector(".contador");
  let animais = [];
  let alvo = null; // o bicho que ela precisa pegar agora
  let comemorando = false;
  let tempoDica = 0;
  let pegos = 0;
  const jaVieram = new Set(); // emojis dos bichos que já entraram no pasto

  // Medidas da tela: o pasto vai até onde começa a fazenda
  function medidas() {
    const W = pasto.clientWidth;
    const H = pasto.clientHeight;
    const c = cercadinho.getBoundingClientRect();
    const cel = celeiro.getBoundingClientRect();
    return {
      W,
      fundoDoPasto: fazenda.getBoundingClientRect().top,
      cercado: {
        esquerda: c.left + CERCA,
        direita: c.right, // do lado do celeiro não tem cerca
        cima: c.top + CERCA,
        baixo: c.bottom - CERCA,
      },
      porta: { x: cel.left + cel.width / 2, y: cel.bottom - cel.height * 0.2 },
      H,
    };
  }

  // Estrelinhas saindo de um ponto da tela
  function explosao(x, y, emojis, total, distanciaMax = 180) {
    for (let i = 0; i < total; i++) {
      const el = document.createElement("span");
      el.className = "festa";
      el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      const angulo = Math.random() * Math.PI * 2;
      const distancia = 60 + Math.random() * distanciaMax;
      el.style.left = x + "px";
      el.style.top = y + "px";
      el.style.fontSize = 1.5 + Math.random() * 2 + "rem";
      el.style.animationDelay = Math.random() * 0.3 + "s";
      el.style.setProperty("--x", Math.cos(angulo) * distancia + "px");
      el.style.setProperty("--y", Math.sin(angulo) * distancia + "px");
      el.style.setProperty("--giro", Math.random() * 720 - 360 + "deg");
      document.body.appendChild(el);
      depois(() => el.remove(), 2200);
    }
  }

  // Bichos grandes (elefante, girafa) ficam maiores que os pequenos (formiga)
  function tamanhoDoBicho(tipo) {
    const { W, H } = medidas();
    const base = Math.min(W, H) / 9;
    // A figura mede 1,5 vez o tamanho da fonte; a escala de cada bicho vem de bichos.js
    return Math.max(40, (base * 2.3 * tipo.escala) / 1.5);
  }

  function novaDirecao(a) {
    // Vira só um pouquinho para o lado e segue em frente, sem voltar para trás
    const atual = a.vx || a.vy ? Math.atan2(a.vy, a.vx) : Math.random() * Math.PI * 2;
    const angulo = atual + (Math.random() - 0.5) * 1.0;
    const velocidade = a.estado === "no-cercado" ? a.velocidade * 0.4 : a.velocidade;
    a.vx = Math.cos(angulo) * velocidade;
    a.vy = Math.sin(angulo) * velocidade;
    a.tempoParaVirar = 3 + Math.random() * 3;
  }

  function posicionar(a) {
    if (a.vx > 0) a.el.classList.add("direita");
    else if (a.vx < 0) a.el.classList.remove("direita");
    a.el.style.transform = `translate(${a.x}px, ${a.y}px)`;
  }

  // Bate nas bordas de uma área e volta
  function baterNasBordas(a, esquerda, cima, direita, baixo) {
    const maxX = Math.max(esquerda, direita - a.w);
    const maxY = Math.max(cima, baixo - a.h);
    if (a.x < esquerda) { a.x = esquerda; a.vx = Math.abs(a.vx); }
    if (a.x > maxX) { a.x = maxX; a.vx = -Math.abs(a.vx); }
    if (a.y < cima) { a.y = cima; a.vy = Math.abs(a.vy); }
    if (a.y > maxY) { a.y = maxY; a.vy = -Math.abs(a.vy); }
  }

  // Um bicho novo chega por cima ou pelos lados da tela
  function entrarAnimal(lado = LADOS[Math.floor(Math.random() * LADOS.length)]) {
    // Cada bicho entra uma vez só; quando todos já vieram, não entra mais ninguém
    if (jaVieram.size >= TOTAL_DE_BICHOS) return;
    const tipo = sortearBicho([...jaVieram]);
    jaVieram.add(tipo.emoji);
    const el = document.createElement("div");
    el.className = "animal";
    el.dataset.palavra = tipo.palavra;
    el.style.fontSize = tamanhoDoBicho(tipo) + "px";
    el.innerHTML = `<div class="corpo"><span class="sacode"><span class="passo"><img src="${tipo.imagem}" alt="" draggable="false" /></span></span></div>`;
    pasto.appendChild(el);

    const caixa = el.getBoundingClientRect();
    const { W, fundoDoPasto } = medidas();
    const a = {
      el, tipo,
      w: caixa.width,
      h: caixa.height,
      estado: "entrando",
      velocidade: 35 + Math.random() * 25,
      tempoParaVirar: 0,
    };
    const entrada = 130;
    // A posição de entrada fica longe das bordas, senão o bicho atravessa a tela
    // reto, nunca começa a passear e some pelo outro lado
    const sorteio = (min, max) => min + Math.random() * Math.max(0, max - min);
    if (lado === "cima") {
      a.x = sorteio(DENTRO, W - DENTRO - a.w);
      a.y = -a.h;
      a.vx = 0;
      a.vy = entrada;
    } else {
      a.x = lado === "esquerda" ? -a.w : W;
      a.y = sorteio(DENTRO, fundoDoPasto - DENTRO - a.h);
      a.vx = lado === "esquerda" ? entrada : -entrada;
      a.vy = 0;
    }
    el.addEventListener("pointerdown", (evento) => tocar(a, evento));
    animais.push(a);
    posicionar(a);
  }

  // Escreve a palavra letra por letra: cada letra é um pedacinho que dança no seu tempo
  function escreverLetras(texto) {
    cartao.textContent = "";
    [...texto].forEach((letra, i) => {
      const el = document.createElement("span");
      el.className = "letra-alvo";
      el.textContent = letra;
      el.style.setProperty("--i", i);
      cartao.appendChild(el);
    });
  }

  // Tocar no celeiro: a porta abre e sai um fazendeiro bravinho, que reclama (gravação em
  // public/sounds/fazendeiro-reclamando.mp3) para ela manter a porta fechada. Quando ele
  // termina de falar, fecha a porta e vai embora. Sem o arquivo, só diz "Oi!" como antes.
  let falaFazendeiro = null;
  const FALA_FAZENDEIRO = 3300; // duração da gravação, em ms
  function abrirCeleiro(evento) {
    evento.preventDefault();
    evento.stopPropagation();
    if (fazendeiroOcupado) return;
    fazendeiroOcupado = true;
    // Não corta a voz do jogo: parar no meio perdia o "terminou" e o jogo travava sem alvo
    celeiro.classList.add("aberta"); // as duas folhas da porta abrem
    depois(() => celeiro.classList.add("fora"), 700); // o fazendeiro sai de dentro, andando
    depois(() => {
      celeiro.classList.add("acenando");
      try {
        falaFazendeiro = new Audio("/sounds/fazendeiro-reclamando.mp3");
        falaFazendeiro.onerror = () => voz.falar("Oi! Eu sou o fazendeiro!");
        falaFazendeiro.play().catch(() => {});
      } catch {}
    }, 2100);
    // Terminou de reclamar: volta para o celeiro com a mão esticada na porta, entra, e a porta fecha
    depois(() => {
      celeiro.classList.remove("acenando", "fora");
      celeiro.classList.add("entrando", "empurrando");
    }, 2100 + FALA_FAZENDEIRO);
    depois(() => celeiro.classList.remove("aberta"), 3200 + FALA_FAZENDEIRO);
    depois(() => {
      celeiro.classList.remove("entrando", "empurrando");
      fazendeiroOcupado = false;
    }, 4600 + FALA_FAZENDEIRO);
  }
  celeiro.addEventListener("pointerdown", abrirCeleiro);

  // Escolhe um dos bichos que estão no pasto e mostra a palavra dele
  function novoAlvo(primeiro) {
    // Só bicho que já está no pasto: quem ainda está entrando fica fora da tela
    const candidatos = animais.filter((a) => a.estado === "andando");
    if (!candidatos.length) {
      depois(() => novoAlvo(primeiro), 500);
      return;
    }
    alvo = candidatos[Math.floor(Math.random() * candidatos.length)];
    tempoDica = 0;
    escreverLetras(alvo.tipo.palavra);
    cartao.classList.remove("aparecer", "acertou");
    void cartao.offsetWidth; // recomeça a animação
    cartao.classList.add("aparecer");
    falas.falar(
      [(primeiro ? "vamos-brincar-" : "agora-pega-") + idDe(alvo.tipo)],
      primeiro ? `Vamos brincar! Pega ${alvo.tipo.nome}!` : `Agora pega ${alvo.tipo.nome}!`
    );
  }

  // Tocou no bicho: ele dá um pulinho
  function pular(a) {
    const corpo = a.el.querySelector(".corpo");
    corpo.classList.remove("pulou");
    void corpo.offsetWidth;
    corpo.classList.add("pulou");
    depois(() => corpo.classList.remove("pulou"), 550);
  }

  // O cercadinho tem um lugarzinho para cada bicho do jogo, numa grade arrumadinha
  let proximoLugar = 0;
  function lugarNoCercado(i, cercado) {
    const largura = cercado.direita - cercado.esquerda;
    const altura = cercado.baixo - cercado.cima;
    // Escolhe quantas colunas e linhas dão o lugar maior possível
    let melhor = { lado: 0, colunas: 1, linhas: TOTAL_DE_BICHOS };
    for (let linhas = 1; linhas <= TOTAL_DE_BICHOS; linhas++) {
      const colunas = Math.ceil(TOTAL_DE_BICHOS / linhas);
      const lado = Math.min(largura / colunas, altura / linhas);
      if (lado > melhor.lado) melhor = { lado, colunas, linhas: Math.ceil(TOTAL_DE_BICHOS / colunas) };
    }
    const { lado, colunas, linhas } = melhor;
    const sobraX = (largura - colunas * lado) / 2;
    const sobraY = (altura - linhas * lado) / 2;
    return {
      lado,
      x: cercado.esquerda + sobraX + (i % colunas) * lado + lado / 2,
      baixo: cercado.cima + sobraY + (Math.floor(i / colunas) + 1) * lado,
    };
  }

  // O bicho pego vai para o lugarzinho dele no cercadinho e fica paradinho lá
  function mandarProCercado(a) {
    const { cercado } = medidas();
    const lugar = lugarNoCercado(proximoLugar++, cercado);
    a.estado = "indo-pro-cercado";
    a.el.classList.add("pequeno");
    // Bicho grande ocupa mais do lugar que bicho pequeno
    const lado = lugar.lado * (0.6 + (0.4 * a.tipo.escala) / 1.5);
    a.el.style.fontSize = lado / 1.5 + "px";
    const caixa = a.el.getBoundingClientRect();
    a.w = caixa.width;
    a.h = caixa.height;
    a.destino = { x: lugar.x - a.w / 2, y: lugar.baixo - a.h };
  }

  // Bicho chegou no cercadinho: conta mais um em cima do celeiro
  function chegouNoCercado(a) {
    a.estado = "no-cercado";
    a.el.classList.remove("feliz");
    a.vx = 0;
    a.vy = 0;
    pegos++;
    contador.textContent = pegos;
    contador.classList.remove("pulou");
    void contador.offsetWidth;
    contador.classList.add("pulou");
  }

  function tocar(a, evento) {
    evento.preventDefault();
    evento.stopPropagation();
    pular(a);
    if (comemorando || !alvo) {
      // Mesmo na festa, o bicho toca no som dele (sem falar por cima)
      tocarSom(a.tipo, () => {});
      return;
    }

    // Bicho do cercadinho só faz o som dele
    if (a.estado === "no-cercado") {
      falas.somEFala(a.tipo, [`esse-e-${idDe(a.tipo)}`, `pega-${idDe(alvo.tipo)}`], `Esse é ${a.tipo.nome}! Pega ${alvo.tipo.nome}!`);
      return;
    }
    if (a.estado !== "andando" && a.estado !== "entrando") return;

    if (a !== alvo) {
      // Bicho errado: ele balança e a voz diz quem é
      a.el.classList.remove("errou");
      void a.el.offsetWidth;
      a.el.classList.add("errou");
      falas.somEFala(a.tipo, [`esse-e-${idDe(a.tipo)}`, `pega-${idDe(alvo.tipo)}`], `Esse é ${a.tipo.nome}! Pega ${alvo.tipo.nome}!`);
      return;
    }

    // Acertou! Festa, o bicho vai para o celeiro e entra outro no pasto
    comemorando = true;
    alvo = null;
    const caixa = a.el.getBoundingClientRect();
    explosao(caixa.left + caixa.width / 2, caixa.top + caixa.height / 2, ["⭐", "✨", "🌟", "🎉"], 30);
    a.el.classList.remove("dica", "errou");
    a.el.classList.add("feliz");
    cartao.classList.add("acertou");
    mandarProCercado(a);
    entrarAnimal();

    const total = pegos + 1;
    if (total >= TOTAL_DE_BICHOS) {
      fimDeJogo(a);
      return;
    }
    falas.somEFala(
      a.tipo,
      [`pegou-${idDe(a.tipo)}`, `agora-tem-${total}`],
      `Aee! Você pegou ${a.tipo.nome}! Agora tem ${total} ${total === 1 ? "bicho" : "bichos"} no celeiro!`,
      () => {
        comemorando = false;
        novoAlvo(false);
      }
    );
  }

  // Pegou o último bicho: festa grande e a brincadeira acaba
  function fimDeJogo(a) {
    const { W, H } = medidas();
    depois(() => {
      escreverLetras("PARABÉNS!");
      cartao.classList.remove("aparecer", "acertou");
      void cartao.offsetWidth;
      cartao.classList.add("aparecer");
      explosao(W / 2, H / 2, ["⭐", "✨", "🌟", "🎉", "🎊", "🏆"], 60, 400);
    }, 1200);
    falas.somEFala(a.tipo, [`pegou-${idDe(a.tipo)}`], `Aee! Você pegou ${a.tipo.nome}!`, () => {
      falas.falar(["muito-bem"], "Muito bem! Você pegou todos os animais!");
      depois(aoAcabar, 1500);
    });
  }

  // Anda em linha reta até um ponto; devolve true quando chega
  function irAte(a, x, y, velocidade, s) {
    const dx = x - a.x;
    const dy = y - a.y;
    const d = Math.hypot(dx, dy);
    if (d <= velocidade * s) {
      a.x = x;
      a.y = y;
      return true;
    }
    a.vx = (dx / d) * velocidade;
    a.vy = (dy / d) * velocidade;
    a.x += a.vx * s;
    a.y += a.vy * s;
    return false;
  }

  let ultimo = performance.now();

  function mover(agora) {
    const s = Math.min((agora - ultimo) / 1000, 0.05);
    ultimo = agora;
    const { W, fundoDoPasto } = medidas();

    for (const a of [...animais]) {
      if (a.estado === "entrando") {
        a.x += a.vx * s;
        a.y += a.vy * s;
        // Anda um pouco para dentro da tela antes de começar a passear
        const dentro =
          a.x >= DENTRO && a.y >= DENTRO && a.x + a.w <= W - DENTRO && a.y + a.h <= fundoDoPasto - DENTRO;
        // Segurança (tela pequena ou girada): se passou do meio, já fica no pasto
        const passou =
          (a.vx > 0 && a.x > W / 2) || (a.vx < 0 && a.x + a.w < W / 2) || (a.vy > 0 && a.y > fundoDoPasto / 2);
        if (dentro || passou) {
          a.estado = "andando";
          novaDirecao(a);
          baterNasBordas(a, 0, 0, W, fundoDoPasto);
        }
      } else if (a.estado === "andando") {
        a.tempoParaVirar -= s;
        if (a.tempoParaVirar <= 0) novaDirecao(a);
        a.x += a.vx * s;
        a.y += a.vy * s;
        baterNasBordas(a, 0, 0, W, fundoDoPasto);
      } else if (a.estado === "indo-pro-cercado") {
        if (irAte(a, a.destino.x, a.destino.y, 300, s)) chegouNoCercado(a);
      }
      posicionar(a);
    }

    // Se ela demorar, o bicho certo começa a brilhar e a voz ajuda
    if (alvo && !comemorando && !voz.falando && !fazendeiroOcupado) {
      tempoDica += s;
      if (tempoDica > 9) {
        tempoDica = 0;
        alvo.el.classList.add("dica");
        falas.falar([`procura-${idDe(alvo.tipo)}`], `Procura ${alvo.tipo.nome}! ${alvo.tipo.pronome === "ele" ? "Ele" : "Ela"} está brilhando!`);
      }
    }

    quadro = requestAnimationFrame(mover);
  }

  // Começo: os 5 primeiros bichos chegam um de cada vez
  for (let i = 0; i < QUANTOS; i++) {
    depois(() => entrarAnimal(LADOS[i % LADOS.length]), i * 700);
  }
  depois(() => novoAlvo(true), QUANTOS * 700 + 1200);
  quadro = requestAnimationFrame(mover);

  // Limpeza: para voz, animação e timers e tira os bichos da tela
  return () => {
    falas.parar();
    if (falaFazendeiro) falaFazendeiro.pause();
    cancelAnimationFrame(quadro);
    timers.forEach(clearTimeout);
    animais.forEach((a) => a.el.remove());
    animais = [];
    document.querySelectorAll(".festa").forEach((el) => el.remove());
    celeiro.removeEventListener("pointerdown", abrirCeleiro);
    celeiro.className = "celeiro";
    cartao.textContent = "";
    cartao.className = "palavra-alvo";
    contador.textContent = "0";
  };
}
