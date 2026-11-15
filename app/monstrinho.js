import { useEffect, useRef, useState } from "react";
import { criarVoz } from "./voz";

// "Monstrinho comilão": uma árvore com 5 maçãs e um monstrinho com fome no chão.
// Ela toca numa maçã, a maçã cai quicando, o monstrinho vai pulando até ela e come
// (crunch!), e a voz conta quantas ele já comeu. Quando acabam as maçãs, ele fica
// com cara de "ué?", abre um bocão gigante e come a árvore inteira (nhaaac!).
// Aí deita no chão de barriga para cima, todo cheio, e depois de um tempinho sai
// correndo para outra tela: lá tem uma parreira com 5 cachos de uva, e é tudo de novo.
// Depois da parreira vem confete e ela pode plantar de novo.
export default function Monstrinho() {
  const raizRef = useRef(null);
  const [rodada, setRodada] = useState(0);
  const [venceu, setVenceu] = useState(false);

  // Na primeira vez a árvore já está lá; nas outras ela brota do chão
  useEffect(() => iniciarMonstrinho(raizRef.current, () => setVenceu(true), rodada > 0), [rodada]);

  function plantarDeNovo() {
    setVenceu(false);
    setRodada((r) => r + 1);
  }

  return (
    <div className="monstrinho" ref={raizRef}>
      <div className="chao" />
      <div className="nuvem nuvem-1">
        <img src="/monstrinho/nuvem.png" alt="" draggable="false" />
      </div>
      <div className="nuvem nuvem-2">
        <img src="/monstrinho/nuvem.png" alt="" draggable="false" />
      </div>
      <div className="planta" />
      <div className="monstro">
        <div className="pulo">
          <div className="corpo-monstro" dangerouslySetInnerHTML={{ __html: MONSTRO + MONSTRO_DEITADO }} />
        </div>
        <div className="duvida">?</div>
      </div>
      {venceu && (
        <button className="escolha de-novo-monstrinho" style={{ "--cor": "#00897b" }} onClick={plantarDeNovo}>
          <span className="figura">🌳</span>
          Plantar de novo
        </button>
      )}
    </div>
  );
}

// A árvore: tronco marrom e uma copa bem colorida, com florzinhas
const ARVORE = `<img class="" src="/monstrinho/arvore.png" alt="" draggable="false" />`;

// Uma maçã vermelha brilhante, com cabinho e folhinha
const MACA = `<img class="" src="/monstrinho/maca.png" alt="" draggable="false" />`;

// O monstrinho, de frente. Partes com classe para a animação:
// orelhas e flor na cabeça, olhos (pupilas olham para os lados com --olhar-x/--olhar-y),
// pálpebras que piscam, olhos felizes (^^), sorriso, bocona aberta, baba e braços.
const MONSTRO = `<img class="pose pose-parado" src="/monstrinho/pose-parado.png" alt="" draggable="false" />
<img class="pose pose-comendo" src="/monstrinho/pose-comendo.png" alt="" draggable="false" />
<img class="pose pose-bocao" src="/monstrinho/pose-bocao.png" alt="" draggable="false" />
<img class="pose pose-mastigando" src="/monstrinho/pose-mastigando.png" alt="" draggable="false" />
<img class="pose pose-ue" src="/monstrinho/pose-ue.png" alt="" draggable="false" />
<img class="pose pose-feliz" src="/monstrinho/pose-feliz.png" alt="" draggable="false" />
<img class="pose pose-cheio" src="/monstrinho/pose-cheio.png" alt="" draggable="false" />`;

// O monstrinho deitado no chão de barriga para cima (barriga cheia): cabeça à esquerda,
// barrigona redonda para o alto, pezinhos para cima e as mãos fazendo carinho na barriga
const MONSTRO_DEITADO = ``;

// Sons do jogo: gravações geradas em public/sounds/ (monstrinho-*.mp3) e uma
// musiquinha de fundo bem baixinha. Se um arquivo não existir, fica em silêncio.
// Não são sons de bicho (esses só com gravação, ver sons.js).
// Sons de toque: gravações em public/sons/toque-monstrinho.mp3 (monstrinho) e
// public/sons/toque-nuvem.mp3 (nuvens). Se o arquivo não existir (ainda), toca o "pop"
// feito pelo navegador no lugar.
const temToque = {}; // lembra quais gravações existem, para não procurar de novo
function tocarToque(sons, nome = "toque-monstrinho") {
  if (temToque[nome] === false) {
    sons.pop();
    return;
  }
  const audio = new Audio(`/sons/${nome}.mp3`);
  audio.onplaying = () => (temToque[nome] = true);
  audio.onerror = () => {
    temToque[nome] = false;
    sons.pop();
  };
  audio.play().catch(() => {
    if (temToque[nome] !== true) {
      temToque[nome] = false;
      sons.pop();
    }
  });
}

function criarSons() {
  let liberado = false; // o navegador só deixa tocar som depois de um toque dela
  let fundo = null;
  const tocando = new Set();

  function tocar(nome, volume = 1) {
    if (!liberado) return;
    try {
      const audio = new Audio(`/sounds/monstrinho-${nome}.mp3`);
      audio.volume = volume;
      tocando.add(audio);
      audio.addEventListener("ended", () => tocando.delete(audio));
      audio.play().catch(() => tocando.delete(audio));
    } catch {}
  }

  return {
    acordar() {
      if (liberado) return;
      liberado = true;
      try {
        fundo = new Audio("/sounds/monstrinho-fundo.mp3");
        fundo.loop = true;
        fundo.volume = 0.18;
        fundo.play().catch(() => {});
      } catch {}
    },

    // A maçã se solta do galho
    pop: () => tocar("pop"),

    // A maçã batendo no chão (o segundo quique é mais fraquinho)
    quique: (forca) => tocar("quique", 0.6 * forca + 0.2),

    // Crunch! A mordida crocante
    crunch: () => tocar("crunch"),

    // Nhaaac! Um bocão enorme se fechando na árvore
    nhac: () => tocar("nhac"),

    // Arroto engraçado
    arroto: () => tocar("arroto"),

    // A árvore nova subindo do chão
    brotar: () => tocar("brotar"),

    // Musiquinha alegre da barriga cheia
    musica: () => tocar("musica"),

    fechar() {
      liberado = false;
      try {
        if (fundo) fundo.pause();
        tocando.forEach((a) => a.pause());
      } catch {}
      fundo = null;
      tocando.clear();
    },
  };
}

// A parreira: dois postes de madeira, uma trave em cima coberta de folhas,
// o tronquinho torto subindo pelo meio e gavinhas enroladas
const PARREIRA = `<img class="" src="/monstrinho/parreira.png" alt="" draggable="false" />`;

// Um cachinho de uva roxa, com cabinho e folhinha
const UVA = `<img class="" src="/monstrinho/uva.png" alt="" draggable="false" />`;

// As fases: primeiro as maçãs da árvore, depois as uvas da parreira.
// lugares: onde fica cada fruta (em % da planta, pelo meio da fruta).
const FASES = [
  {
    nome: "maca",
    planta: ARVORE,
    fruta: MACA,
    tamanho: 20, // largura da caixa de toque, em % da planta
    lugares: [[28, 40], [50, 20], [73, 37], [39, 61], [64, 60]],
    contagem: ["", "Uma maçã!", "Duas maçãs!", "Três maçãs!", "Quatro maçãs!", "Cinco maçãs!"],
    migalhas: ["#e53935", "#fff3c4"],
    chegou: "Olha o monstrinho! Ele está com fome! Toca na maçã!",
    brotou: "Uma árvore nova! Toca na maçã!",
    acabou: "Ué? Acabaram as maçãs!",
    gostosa: "Hum... A árvore parece gostosa!",
    comeu: "Ele comeu a árvore inteira! Que barrigão!",
  },
  {
    nome: "uva",
    planta: PARREIRA,
    fruta: UVA,
    tamanho: 18,
    lugares: [[17, 44], [33, 52], [50, 44], [67, 52], [83, 44]],
    contagem: ["", "Uma uva!", "Duas uvas!", "Três uvas!", "Quatro uvas!", "Cinco uvas!"],
    migalhas: ["#8e24aa", "#e1bee7"],
    chegou: "Olha! Uvas! Toca na uva!",
    acabou: "Ué? Acabaram as uvas!",
    gostosa: "Hum... A parreira parece gostosa!",
    comeu: "Ele comeu a parreira inteira! Que barrigão!",
  },
];

// Toda a brincadeira roda direto no DOM (animações com CSS, timers e voz).
// Devolve uma função de limpeza que para tudo e deixa a tela como no começo.
function iniciarMonstrinho(raiz, aoVencer, brotar) {
  const timers = new Set();

  function depois(fn, ms) {
    const id = setTimeout(() => {
      timers.delete(id);
      fn();
    }, ms);
    timers.add(id);
  }

  const voz = criarVoz(depois);
  const sons = criarSons();
  const planta = raiz.querySelector(".planta");
  const chao = raiz.querySelector(".chao");
  const monstro = raiz.querySelector(".monstro");
  const pulo = raiz.querySelector(".pulo");
  const corpo = raiz.querySelector(".corpo-monstro");
  const duvida = raiz.querySelector(".duvida");

  // esperando: ela pode tocar nas frutas (e no monstrinho); ocupado: alguma animação acontecendo
  let estado = "ocupado";
  let fase = 0;
  let comidas = 0;
  let dica = 0; // contador para cancelar a dica quando ela toca antes
  let andar = 0; // contador para ignorar chegadas de caminhadas antigas

  function trocarClasse(el, classe) {
    el.classList.remove(classe);
    void el.offsetWidth; // recomeça a animação
    el.classList.add(classe);
  }

  // Posição de um elemento dentro da cena
  function caixa(el) {
    const r = el.getBoundingClientRect();
    const base = raiz.getBoundingClientRect();
    return { x: r.left - base.left, y: r.top - base.top, w: r.width, h: r.height };
  }

  // Onde fica a boca do monstrinho na cena (na imagem, a boca fica um pouco abaixo do meio)
  function boca() {
    const c = caixa(corpo);
    return { x: c.x + c.w * 0.5, y: c.y + c.h * 0.62, w: c.w, h: c.h };
  }

  function soltarPedaco(conteudo, classe, x, y, props, duracao = 3000) {
    const el = document.createElement("div");
    el.className = `pedaco ${classe}`;
    if (conteudo) el.textContent = conteudo;
    el.style.left = x + "px";
    el.style.top = y + "px";
    for (const [nome, valor] of Object.entries(props)) el.style.setProperty(nome, valor);
    raiz.appendChild(el);
    depois(() => el.remove(), duracao);
    return el;
  }

  // Para onde o monstrinho olha: "cima" (as frutas), "frente" (para ela), "arvore" (a planta)
  function olhar(para) {
    monstro.classList.remove("olha-cima", "olha-frente", "olha-arvore");
    monstro.classList.add(`olha-${para}`);
  }

  // Leva o monstrinho, pulando, até que o meio dele fique em x. Chama chegou() lá.
  // Devolve quanto tempo vai demorar. Correndo, vai bem mais depressa.
  // Passeando (andando = true) ele vai devagar, balançando de um lado para o outro.
  function irPulando(x, chegou, correndo = false, andando = false) {
    const minha = ++andar;
    const atual = monstro._x || 0;
    const destino = x - monstro._base;
    const velocidade = raiz.clientWidth * (correndo ? 1.4 : andando ? 0.22 : 0.9);
    const segundos = Math.max(0.3, Math.abs(destino - atual) / velocidade);
    monstro._x = destino;
    pulo.classList.remove("pulando", "correndo", "andando");
    pulo.classList.add(correndo ? "correndo" : andando ? "andando" : "pulando");
    monstro.style.transition = `translate ${segundos}s linear`;
    monstro.style.translate = `${destino}px 0`;
    depois(() => {
      if (minha !== andar) return;
      pulo.classList.remove("pulando", "correndo", "andando");
      if (chegou) chegou();
    }, segundos * 1000);
    return segundos * 1000;
  }

  // Põe o monstrinho num lugar na hora, sem andar (para entrar pelo canto da tela)
  function teleportar(x) {
    andar++;
    monstro._x = x - monstro._base;
    monstro.style.transition = "none";
    monstro.style.translate = `${monstro._x}px 0`;
    void monstro.offsetWidth;
  }

  // ---------- Começo ----------
  function comecar() {
    const m = caixa(monstro);
    monstro._base = m.x + m.w / 2;
    monstro._x = 0;
    // Carrega já as imagens da outra tela, para a parreira não piscar quando chegar
    ["parreira", "uva"].forEach((n) => {
      new Image().src = `/monstrinho/${n}.png`;
    });
    olhar("cima");
    colocarPlanta(0);
    raiz.classList.add("com-fome");

    if (brotar) {
      // A árvore nova sobe do chão e as maçãs aparecem uma por uma
      trocarClasse(planta, "brotando");
      sons.brotar();
      depois(() => voz.falar(FASES[0].brotou, esperar), 700);
    } else {
      voz.falar(FASES[0].chegou, esperar);
    }
  }

  // Monta a planta da fase com as frutas penduradas
  function colocarPlanta(n) {
    fase = n;
    comidas = 0;
    const f = FASES[n];
    planta.getAnimations().forEach((a) => a.cancel());
    planta.className = `planta planta-${f.nome}`;
    planta.innerHTML = f.planta;
    raiz.classList.remove(...FASES.map((x) => `cena-${x.nome}`));
    raiz.classList.add(`cena-${f.nome}`);
    f.lugares.forEach(([x, y], i) => {
      const el = document.createElement("div");
      el.className = "fruta";
      el.innerHTML = f.fruta;
      el.style.left = x + "%";
      el.style.top = y + "%";
      el.style.width = f.tamanho + "%";
      el.style.setProperty("--i", i);
      el.addEventListener("pointerdown", (evento) => tocarNaFruta(evento, el));
      planta.appendChild(el);
    });
  }

  function esperar() {
    estado = "esperando";
    raiz.classList.add("esperando", "com-fome");
    olhar("cima");
    passear();
    agendarDica();
  }

  // Se ela demora, uma fruta pula chamando
  function agendarDica() {
    const minha = ++dica;
    depois(() => {
      if (minha !== dica || estado !== "esperando") return;
      const frutas = planta.querySelectorAll(".fruta");
      if (frutas.length) trocarClasse(frutas[Math.floor(Math.random() * frutas.length)], "chamando");
    }, 6000);
  }

  // ---------- Ela toca numa fruta ----------
  function tocarNaFruta(evento, el) {
    evento.preventDefault();
    evento.stopPropagation();
    sons.acordar();
    if (estado !== "esperando" || voz.falando) return;
    estado = "ocupado";
    raiz.classList.remove("esperando");
    dica++;
    sons.pop();
    olhar("frente");
    monstro.classList.add("animado");

    // A fruta sai da planta e passa a cair pela cena
    const m = caixa(el);
    el.classList.remove("chamando");
    el.classList.add("caindo");
    el.style.left = m.x + "px";
    el.style.top = m.y + "px";
    el.style.width = m.w + "px";
    raiz.appendChild(el);

    // Cai até a grama, um pouquinho para o lado do monstrinho, e quica duas vezes
    const chaoY = caixa(chao).y;
    const dx = -m.w * (0.3 + Math.random() * 0.5);
    const dy = chaoY - (m.y + m.h * 0.85);
    const quica = m.h * 0.8;
    const DURACAO = 800;
    el.animate(
      [
        { transform: "translate(0, 0) rotate(0deg)", easing: "cubic-bezier(0.5, 0, 1, 1)" },
        { transform: `translate(${dx * 0.6}px, ${dy}px) rotate(-40deg)`, offset: 0.5, easing: "ease-out" },
        { transform: `translate(${dx * 0.8}px, ${dy - quica}px) rotate(-80deg)`, offset: 0.68, easing: "ease-in" },
        { transform: `translate(${dx * 0.95}px, ${dy}px) rotate(-110deg)`, offset: 0.84, easing: "ease-out" },
        { transform: `translate(${dx}px, ${dy - quica * 0.3}px) rotate(-120deg)`, offset: 0.92, easing: "ease-in" },
        { transform: `translate(${dx}px, ${dy}px) rotate(-125deg)` },
      ],
      { duration: DURACAO, fill: "forwards" }
    );
    depois(() => sons.quique(1), DURACAO * 0.5);
    depois(() => sons.quique(0.5), DURACAO * 0.84);

    // O monstrinho vai pulando até onde a fruta cai (a fruta fica do lado direito dele)
    const largura = caixa(monstro).w;
    const chegada = irPulando(m.x + m.w / 2 + dx - largura * 0.45, null);
    depois(() => comerFruta(el), Math.max(DURACAO + 50, chegada));
  }

  // Abre a boca, a fruta voa para dentro, crunch, e ele mastiga feliz
  function comerFruta(el) {
    pulo.classList.remove("pulando");
    monstro.classList.remove("animado");
    raiz.classList.remove("com-fome");
    corpo.classList.add("comendo");

    depois(() => {
      const a = caixa(el);
      const b = boca();
      el.getAnimations().forEach((animacao) => animacao.cancel());
      el.style.left = a.x + "px";
      el.style.top = a.y + "px";
      el.animate(
        [
          { transform: "translate(0, 0) rotate(-125deg) scale(1)" },
          { transform: `translate(${b.x - (a.x + a.w / 2)}px, ${b.y - (a.y + a.h / 2)}px) rotate(-200deg) scale(0.3)` },
        ],
        { duration: 200, easing: "ease-in", fill: "forwards" }
      );
    }, 120);

    depois(() => {
      el.remove();
      comidas++;
      sons.crunch();
      migalhas();
      corpo.classList.remove("comendo");
      corpo.classList.add("mastigando");
      let falou = false;
      let mastigou = false;
      const seguir = () => {
        if (falou && mastigou) satisfeito();
      };
      voz.falar(FASES[fase].contagem[comidas], () => {
        falou = true;
        seguir();
      });
      depois(() => {
        mastigou = true;
        seguir();
      }, 700);
    }, 330);
  }

  // Pedacinhos da fruta voando da boca
  function migalhas() {
    const b = boca();
    const cores = FASES[fase].migalhas;
    for (let i = 0; i < 9; i++) {
      soltarPedaco("", "migalha", b.x, b.y, {
        "--x": (Math.random() - 0.5) * b.w * 1.2 + "px",
        "--y": -b.h * (0.1 + Math.random() * 0.4) + "px",
        "--giro": Math.random() * 720 - 360 + "deg",
        "--tempo": 0.5 + Math.random() * 0.3 + "s",
        width: b.w * 0.07 + "px",
        height: b.w * 0.05 + "px",
        background: cores[i % 3 === 0 ? 0 : 1],
      }, 900);
    }
  }

  // Mastigou: fica feliz um instante. Se ainda tem fruta, ela já pode tocar na próxima
  // enquanto ele volta (não precisa esperar ele chegar)
  function satisfeito() {
    corpo.classList.remove("mastigando");
    corpo.classList.add("feliz");
    depois(() => {
      corpo.classList.remove("feliz");
      if (comidas < FASES[fase].lugares.length) {
        voltarParaCasa(null);
        esperar();
      } else {
        voltarParaCasa(acabaram);
      }
    }, 300);
  }

  function voltarParaCasa(chegou) {
    irPulando(monstro._base, chegou);
  }

  // ---------- Acabaram as frutas: ué? ----------
  function acabaram() {
    olhar("cima");
    depois(() => {
      olhar("frente");
      duvida.classList.add("aparece");
      corpo.classList.add("ue");
      voz.falar(FASES[fase].acabou, () => depois(olharPlanta, 150));
    }, 500);
  }

  function olharPlanta() {
    duvida.classList.remove("aparece");
    corpo.classList.remove("ue");
    olhar("arvore");
    depois(() => {
      corpo.classList.add("arregalado");
      raiz.classList.add("com-fome");
      voz.falar(FASES[fase].gostosa, abocanhar);
    }, 350);
  }

  // Abre um bocão gigante, vai pulando até a planta, cresce e engole tudo de uma vez
  function abocanhar() {
    raiz.classList.remove("com-fome");
    corpo.classList.remove("arregalado");
    corpo.classList.add("bocao");
    const p = caixa(planta);
    irPulando(p.x + p.w * 0.42, () => {
      corpo.classList.add("gigante");
      depois(engolirPlanta, 330);
    });
  }

  function engolirPlanta() {
    const p = caixa(planta);
    const b = boca();
    planta.animate(
      [
        { transform: "translate(0, 0) scale(1)", opacity: 1 },
        { transform: `translate(${b.x - (p.x + p.w / 2)}px, ${b.y - (p.y + p.h / 2)}px) scale(0.05)`, opacity: 0.6 },
      ],
      { duration: 400, easing: "ease-in", fill: "forwards" }
    );
    sons.nhac();
    voz.falar("Nhaaac!");

    // Nuvem de fumaça de desenho animado onde estava a planta
    for (let i = 0; i < 16; i++) {
      depois(() => {
        soltarPedaco("", "nuvem", p.x + p.w * (0.15 + Math.random() * 0.7), p.y + p.h * (0.15 + Math.random() * 0.8), {
          "--x": (Math.random() - 0.5) * p.w * 0.4 + "px",
          "--y": -p.h * (0.1 + Math.random() * 0.2) + "px",
          "--tempo": 0.9 + Math.random() * 0.5 + "s",
          width: p.w * (0.2 + Math.random() * 0.15) + "px",
          height: p.w * (0.2 + Math.random() * 0.15) + "px",
        }, 1600);
      }, 200 + Math.random() * 250);
    }

    depois(() => {
      planta.classList.add("comida");
      corpo.classList.remove("bocao", "gigante");
      corpo.classList.add("mastigando", "cheio");
    }, 500);
    depois(deitar, 1200);
  }

  // ---------- Barriga cheia: deita no chão de barriga para cima ----------
  function deitar() {
    corpo.classList.remove("mastigando");
    corpo.classList.add("feliz", "deitado");
    olhar("frente");
    depois(() => sons.arroto(), 500);
    const ultima = fase === FASES.length - 1;
    let falou = false;
    let descansou = false;
    const seguir = () => {
      if (!falou || !descansou) return;
      if (ultima) vitoria();
      else esperarToque();
    };
    depois(() => {
      voz.falar(FASES[fase].comeu, () => {
        falou = true;
        seguir();
      });
      if (ultima) {
        chuvaDeConfete();
        sons.musica();
      }
    }, 900);
    // Fica um tempinho deitado, descansando a barriga
    depois(() => {
      descansou = true;
      seguir();
    }, 3000);
  }

  // Deitado de barriga cheia, ele só levanta quando ela toca nele. A voz lembra de tempos em tempos.
  function esperarToque() {
    estado = "deitado";
    pulo.classList.add("chamando");
    const lembrar = () => {
      if (estado !== "deitado") return;
      voz.falar("Toca no monstrinho para ele levantar!");
      depois(lembrar, 12000);
    };
    lembrar();
  }

  // Levanta num pulo e sai correndo pela direita; na outra tela, a parreira já
  // chega deslizando e ele entra correndo pela esquerda
  function levantarECorrer() {
    corpo.classList.remove("deitado", "cheio", "feliz");
    trocarClasse(pulo, "pulinho");
    const largura = caixa(monstro).w;
    depois(() => {
      irPulando(raiz.clientWidth + largura, () => {
        colocarPlanta(fase + 1);
        trocarClasse(planta, "chegando");
        teleportar(-largura);
        irPulando(monstro._base, () => voz.falar(FASES[fase].chegou, esperar), true);
      }, true);
    }, 400);
  }

  function vitoria() {
    estado = "fim";
    chuvaDeConfete();
    aoVencer();
  }

  function chuvaDeConfete() {
    const cores = ["#e53935", "#fdd835", "#43a047", "#1e88e5", "#8e24aa", "#fb8c00", "#ec407a"];
    const largura = raiz.clientWidth;
    for (let i = 0; i < 90; i++) {
      const el = soltarPedaco("", "confete", Math.random() * largura, -30, {
        "--x": (Math.random() - 0.5) * 200 + "px",
        "--y": raiz.clientHeight + 60 + "px",
        "--giro": Math.random() * 1440 - 720 + "deg",
        "--tempo": 2.2 + Math.random() * 2 + "s",
        "animation-delay": Math.random() * 0.8 + "s",
        background: cores[i % cores.length],
      }, 5200);
      if (i % 3 === 0) el.style.borderRadius = "50%";
    }
  }

  // Tocar no monstrinho: ele dá um pulo para o lado, rindo (no fim, arrota).
  // Ela pode continuar tocando nas frutas enquanto ele pula.
  function tocarNoMonstro(evento) {
    evento.preventDefault();
    sons.acordar();
    if (estado === "deitado") {
      estado = "ocupado";
      voz.parar();
      pulo.classList.remove("chamando");
      levantarECorrer();
      return;
    }
    if (estado === "fim") {
      trocarClasse(pulo, "pulinho");
      sons.arroto();
      return;
    }
    if (estado !== "esperando") return;
    // Dá um pulinho no lugar e faz o som de toque; continua passeando depois
    trocarClasse(corpo, "toque");
    depois(() => corpo.classList.remove("toque"), 550);
    tocarToque(sons);
  }

  // Enquanto espera, ele fica andando de um lado para o outro (passa na frente do tronco;
  // as frutas ficam lá no alto). Para sozinho quando ela toca numa fruta (estado muda).
  function passear() {
    const sortear = () => {
      if (estado !== "esperando") return;
      const largura = caixa(monstro).w;
      const minimo = largura * 0.6;
      const maximo = raiz.clientWidth - largura * 0.6;
      const atual = monstro._base + (monstro._x || 0);
      let destino = minimo + Math.random() * (maximo - minimo);
      // Sempre anda um pedaço bom, para parecer um passeio
      if (Math.abs(destino - atual) < largura) {
        destino = atual < raiz.clientWidth / 2 ? atual + largura * 1.5 : atual - largura * 1.5;
      }
      destino = Math.min(maximo, Math.max(minimo, destino));
      irPulando(destino, () => depois(sortear, 500 + Math.random() * 1200), false, true);
    };
    depois(sortear, 700);
  }

  // Tocar numa nuvem: ela dá um pulinho e faz o som de toque da nuvem
  function tocarNaNuvem(evento) {
    evento.preventDefault();
    evento.stopPropagation();
    sons.acordar();
    const figura = evento.currentTarget.querySelector("img");
    trocarClasse(figura, "pulou");
    depois(() => figura.classList.remove("pulou"), 600);
    tocarToque(sons, "toque-nuvem");
  }

  const nuvens = raiz.querySelectorAll(".nuvem");
  nuvens.forEach((n) => n.addEventListener("pointerdown", tocarNaNuvem));

  const acordar = () => sons.acordar();
  raiz.addEventListener("pointerdown", acordar);
  monstro.addEventListener("pointerdown", tocarNoMonstro);
  document.body.classList.add("luvinha"); // o mouse vira a luvinha, igual nos outros jogos

  comecar();

  // Limpeza: para voz, sons e timers e devolve o DOM ao estado inicial
  return () => {
    voz.parar();
    sons.fechar();
    timers.forEach(clearTimeout);
    raiz.removeEventListener("pointerdown", acordar);
    monstro.removeEventListener("pointerdown", tocarNoMonstro);
    nuvens.forEach((n) => n.removeEventListener("pointerdown", tocarNaNuvem));
    document.body.classList.remove("luvinha");
    raiz.querySelectorAll(".pedaco, .fruta").forEach((el) => el.remove());
    raiz.className = "monstrinho";
    planta.getAnimations().forEach((a) => a.cancel());
    planta.className = "planta";
    planta.innerHTML = "";
    monstro.className = "monstro";
    monstro.removeAttribute("style");
    monstro._x = 0;
    pulo.className = "pulo";
    corpo.className = "corpo-monstro";
    duvida.className = "duvida";
  };
}
