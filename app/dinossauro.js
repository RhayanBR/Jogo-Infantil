import { useEffect, useRef } from "react";
import { criarVoz } from "./voz";
import { tocarSom } from "./sons";
import { criarFalas } from "./falas";
import { FALAS } from "./falas-dinossauro";

// "Dinossauro": três árvores cheias de folhas. Ela toca numa árvore e o dinossauro anda até lá
// e come as folhas (sobram só os galhos). Quando as árvores estão peladas, ela toca numa nuvem:
// chove, e as folhas voltam a crescer. Tudo em 3D (public/dinossauro, feito no Blender).
export default function Dinossauro() {
  const raizRef = useRef(null);

  useEffect(() => iniciarDinossauro(raizRef.current), []);

  return (
    <div className="dinossauro" ref={raizRef}>
      <div className="chao" />
      <div className="nuvem nuvem-d1">
        <img src="/monstrinho/nuvem.png" alt="" draggable="false" />
      </div>
      <div className="nuvem nuvem-d2">
        <img src="/monstrinho/nuvem.png" alt="" draggable="false" />
      </div>
      {["a", "b", "c"].map((v, i) => (
        <div className={`arvore arvore-${i + 1}`} data-estagio="3" key={v}>
          {[0, 1, 2, 3].map((e) => (
            <img
              key={e}
              className={`est est-${e}`}
              src={`/dinossauro/arvore-${v}${e}.png`}
              alt=""
              draggable="false"
            />
          ))}
        </div>
      ))}
      <div className="dino">
        <div className="corpo-dino">
          {/* Só a barriga e as pernas respondem ao toque: o resto (pescoço, cabeça, cauda) deixa tocar na árvore atrás */}
          <div className="dino-toque" />
          {[0, 1, 2, 3].flatMap((g) =>
            ["parado", "comendo", "mastigando"].map((p) => (
              <img
                key={`${p}-${g}`}
                className="pose"
                data-pose={p}
                data-g={g}
                src={`/dinossauro/dino-${p}-${g}.png`}
                alt=""
                draggable="false"
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// Chuva feita pelo navegador (ruído filtrado): não é som de bicho, então pode ser gerada
function criarSons() {
  let ctx = null;
  let chuva = null;

  function acordar() {
    try {
      if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === "suspended") ctx.resume();
    } catch {
      ctx = null;
    }
  }

  return {
    acordar,
    // Chiado de chuva por alguns segundos, entrando e saindo devagar
    chuva(segundos) {
      if (!ctx) return;
      const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * segundos), ctx.sampleRate);
      const dados = buffer.getChannelData(0);
      for (let i = 0; i < dados.length; i++) dados[i] = Math.random() * 2 - 1;
      const fonte = ctx.createBufferSource();
      fonte.buffer = buffer;
      const filtro = ctx.createBiquadFilter();
      filtro.type = "highpass";
      filtro.frequency.value = 1800;
      const ganho = ctx.createGain();
      const t = ctx.currentTime;
      ganho.gain.setValueAtTime(0.0001, t);
      ganho.gain.exponentialRampToValueAtTime(0.18, t + 0.8);
      ganho.gain.setValueAtTime(0.18, t + segundos - 1);
      ganho.gain.exponentialRampToValueAtTime(0.0001, t + segundos);
      fonte.connect(filtro).connect(ganho).connect(ctx.destination);
      fonte.start(t);
      chuva = fonte;
    },
    fechar() {
      try {
        if (chuva) chuva.stop();
        if (ctx) ctx.close();
      } catch {}
      ctx = null;
    },
  };
}

// Mordidas num pedaço de árvore: o que acontece a cada vez que o dinossauro "morde"
const MORDIDAS = 3; // a árvore vai de 3 (cheia) a 0 (só galhos) em 3 mordidas
const CHUVA = 5000; // quanto tempo chove, em ms

function iniciarDinossauro(raiz) {
  const timers = new Set();

  function depois(fn, ms) {
    const id = setTimeout(() => {
      timers.delete(id);
      fn();
    }, ms);
    timers.add(id);
    return id;
  }

  const voz = criarVoz(depois);
  const sons = criarSons();
  const falas = criarFalas(voz, depois, "dinossauro");
  const efeitos = new Set(); // efeitos tocando, para parar se ela sair do jogo

  // Fala a gravação (public/sounds/dinossauro) se existir; senão, a voz do navegador
  function falar(texto, depoisDeFalar) {
    const id = FALAS[texto];
    if (id) falas.falar([id], texto, depoisDeFalar);
    else voz.falar(texto, depoisDeFalar);
  }
  const arvores = [...raiz.querySelectorAll(".arvore")];
  const nuvens = [...raiz.querySelectorAll(".nuvem")];
  const dino = raiz.querySelector(".dino");
  const corpo = raiz.querySelector(".corpo-dino");

  // Tudo pode acontecer ao mesmo tempo: ela pode tocar no dinossauro, nas árvores e nas nuvens
  // sem esperar a fala terminar. Só o dinossauro faz uma coisa por vez (come uma árvore e depois
  // a próxima da fila); a chuva e o crescimento das folhas correm por conta própria.
  let chovendo = false;
  let fimDaChuva = 0;
  let arvoreAtual = null; // a árvore que ele está comendo
  const fila = []; // árvores que ela já tocou e ele ainda vai comer
  let posicao = 0; // onde o dinossauro está (translate em x)
  let virado = false; // olhando para a esquerda
  let comendo = false; // enquanto come, ele não passeia
  let velocidade = 0; // passeio: pixels por segundo (cada toque nele aumenta)
  let dica = null;

  const estagio = (a) => Number(a.dataset.estagio);

  function pintar(a, n) {
    a.dataset.estagio = n;
    a.querySelectorAll(".est").forEach((img, i) => img.classList.toggle("ligada", i === n));
    atualizarDica();
  }

  function trocarClasse(el, classe, ms = 600) {
    el.classList.remove(classe);
    void el.offsetWidth; // recomeça a animação
    el.classList.add(classe);
    depois(() => el.classList.remove(classe), ms);
  }

  // O dinossauro começa magrinho e engorda a cada mordida (4 níveis). Cada nível tem as 3 poses:
  // parado, comendo (boca aberta) e mastigando. Só a imagem certa fica ligada.
  let poseAtual = "parado";
  let mordidasTotal = 0;
  const nivelDeGordura = () => (mordidasTotal >= 8 ? 3 : mordidasTotal >= 5 ? 2 : mordidasTotal >= 2 ? 1 : 0);

  function mostrarDino() {
    const g = nivelDeGordura();
    corpo.querySelectorAll(".pose").forEach((img) => {
      img.classList.toggle("ligada", img.dataset.pose === poseAtual && Number(img.dataset.g) === g);
    });
  }

  function pose(nome) {
    poseAtual = nome || "parado";
    mostrarDino();
  }

  function caixa(el) {
    const r = el.getBoundingClientRect();
    const base = raiz.getBoundingClientRect();
    return { x: r.left - base.left, y: r.top - base.top, w: r.width, h: r.height };
  }

  // ---------- Avisos de quem tocar ----------
  // Piscam as árvores que podem ser comidas; a nuvem pisca quando alguma árvore precisa de chuva
  function atualizarDica() {
    arvores.forEach((a) => a.classList.toggle("convida", estagio(a) === 3 && a !== arvoreAtual && !fila.includes(a)));
    const precisaChuva = arvores.some((a) => estagio(a) < 3);
    nuvens.forEach((n) => n.classList.toggle("convida", precisaChuva && !chovendo));
  }

  function lembrar() {
    clearTimeout(dica);
    dica = depois(() => {
      if (!comendo && !chovendo) {
        const temFolha = arvores.some((a) => estagio(a) === 3);
        falar(temFolha ? "Toca em uma árvore para o dinossauro comer!" : "Toca na nuvem para chover!");
      }
      lembrar();
    }, 12000);
  }

  // ---------- Comer as folhas ----------
  // O dinossauro anda até a árvore: a cabeça fica embaixo das folhas (ele olha para o lado
  // de onde veio). Anda com um balançadinho.
  function irAte(arvore, depoisDeChegar) {
    const d = caixa(dino);
    const a = caixa(arvore);
    const centroDaArvore = a.x + a.w / 2;
    // Vem da esquerda: olha para a direita; se a árvore está atrás, vira
    const paraEsquerda = centroDaArvore < d.x + (virado ? 0.14 : 0.86) * d.w - 8; // a cabeça está à direita da árvore?
    virado = paraEsquerda;
    corpo.classList.toggle("virado", virado);
    const cabeca = (virado ? 0.14 : 0.86) * d.w;
    const novo = centroDaArvore - cabeca - (d.x - posicao);
    const distancia = Math.abs(novo - posicao);
    const segundos = Math.max(0.5, distancia / (raiz.clientWidth * 0.35));
    dino.classList.add("andando");
    if (distancia > 20) tocarEfeito("dinossauro/efeito-passos", "sounds", 0.6);
    dino.style.transition = `translate ${segundos}s ease-in-out`;
    dino.style.translate = `${novo}px 0`;
    posicao = novo;
    depois(() => {
      dino.classList.remove("andando");
      depoisDeChegar();
    }, segundos * 1000 + 100);
  }

  // Folhinhas voando da copa até a boca do dinossauro
  function soltarFolhas(arvore, quantas) {
    const a = caixa(arvore);
    const boca = caixa(corpo);
    const bx = boca.x + (virado ? 0.1 : 0.9) * boca.w;
    const by = boca.y + 0.2 * boca.h;
    for (let i = 0; i < quantas; i++) {
      const el = document.createElement("img");
      el.className = "folha-voando";
      el.src = "/dinossauro/folha.png";
      el.alt = "";
      el.draggable = false;
      const x0 = a.x + a.w * (0.2 + Math.random() * 0.6);
      const y0 = a.y + a.h * (0.15 + Math.random() * 0.4);
      el.style.left = x0 + "px";
      el.style.top = y0 + "px";
      el.style.setProperty("--dx", bx - x0 + (Math.random() - 0.5) * 30 + "px");
      el.style.setProperty("--dy", by - y0 + (Math.random() - 0.5) * 30 + "px");
      el.style.setProperty("--giro", Math.random() * 720 - 360 + "deg");
      el.style.animationDelay = Math.random() * 0.25 + "s";
      raiz.appendChild(el);
      depois(() => el.remove(), 1200);
    }
  }

  // Tocou numa árvore: se ela está cheia, entra na fila do dinossauro (ele come uma de cada vez,
  // mas ela não precisa esperar para tocar na próxima)
  function comerArvore(arvore) {
    if (estagio(arvore) < 3) {
      // Árvore pelada ou ainda crescendo: só balança os galhos
      trocarClasse(arvore, "balanca");
      tocarEfeito("dinossauro/efeito-folhas");
      return;
    }
    if (arvore === arvoreAtual || fila.includes(arvore)) return;
    if (comendo) {
      fila.push(arvore);
      atualizarDica();
      return;
    }
    comecarAComer(arvore);
  }

  function comecarAComer(arvore) {
    comendo = true;
    arvoreAtual = arvore;
    velocidade = 0;
    atualizarDica();
    irAte(arvore, () => mordida(arvore, MORDIDAS));
  }

  // Cada mordida: abre a boca, as folhas voam, ele mastiga e a árvore fica mais pelada
  function mordida(arvore, restantes) {
    pose("comendo");
    depois(() => {
      soltarFolhas(arvore, 8);
      mordidasTotal++; // mais uma mordida: ele engorda um pouquinho
      pintar(arvore, estagio(arvore) - 1);
      tocarEfeito("monstrinho-crunch");
      pose("mastigando");
      trocarClasse(corpo, "mastiga", 500);
    }, 350);
    depois(() => {
      if (restantes > 1) mordida(arvore, restantes - 1);
      else terminouDeComer();
    }, 1250);
  }

  function terminouDeComer() {
    comendo = false;
    arvoreAtual = null;
    pose(null);
    trocarClasse(dino, "pulou", 700);
    // Próxima árvore da fila (se ela ainda estiver cheia)
    while (fila.length) {
      const proxima = fila.shift();
      if (estagio(proxima) === 3) {
        falar("Nham nham!");
        comecarAComer(proxima);
        return;
      }
    }
    atualizarDica();
    const faltam = arvores.some((a) => estagio(a) === 3);
    falar(faltam ? "Nham nham! Ele comeu as folhas! Toca em outra árvore!" : "Nham nham! Ele comeu todas as folhas! Agora toca na nuvem para chover!");
  }

  // ---------- Chover e crescer ----------
  // Dá para chover a qualquer hora (mesmo com ele comendo). Tocar na nuvem de novo estica a chuva.
  function chover(nuvem) {
    trocarClasse(nuvem.querySelector("img"), "pulou", 600);
    if (chovendo) {
      fimDaChuva = performance.now() + CHUVA; // mais chuva
      return;
    }
    const precisa = arvores.some((a) => estagio(a) < 3);
    if (!precisa) {
      // Todas as árvores estão cheias: só o pulinho e o som da nuvem
      tocarEfeito("toque-nuvem", "sons");
      return;
    }
    chovendo = true;
    fimDaChuva = performance.now() + CHUVA;
    atualizarDica();
    // A chuva gravada fica repetindo enquanto chove; sem o arquivo, o chiado feito pelo navegador
    const chuva = tocarEfeito("dinossauro/efeito-chuva", "sounds", 0.5, () => sons.chuva(CHUVA / 1000 + 0.5));
    if (chuva) chuva.loop = true;
    nuvens.forEach((n) => n.classList.add("chovendo"));
    falar("Plim plim! Está chovendo!");

    // Gotas caindo das duas nuvens até o chão, enquanto chove
    const gotas = () => {
      if (!chovendo) return;
      nuvens.forEach((n) => {
        const c = caixa(n);
        for (let i = 0; i < 2; i++) soltarGota(c.x + c.w * (0.15 + Math.random() * 0.7), c.y + c.h * 0.7);
      });
      depois(gotas, 70);
    };
    gotas();

    depois(() => tocarEfeito("dinossauro/efeito-crescer"), 900);

    // Enquanto chove vão se formando poças no chão (no máximo 4)
    const formarPocas = () => {
      if (!chovendo) return;
      if (pocas.length < MAX_POCAS) fazerPoca();
      depois(formarPocas, 1100);
    };
    depois(formarPocas, 700);

    // As folhas crescem aos poucos, uma etapa a cada 1,3 segundo, em todas as árvores que não
    // estão sendo comidas agora
    const crescer = () => {
      if (!chovendo) return;
      arvores.forEach((a, i) => {
        if (a !== arvoreAtual && estagio(a) < 3) depois(() => a !== arvoreAtual && estagio(a) < 3 && crescerUmPouco(a), i * 150);
      });
      depois(crescer, 1300);
    };
    depois(crescer, 900);

    // Acaba a chuva (se ela tocou na nuvem de novo, o fim foi empurrado para mais tarde)
    const vigia = () => {
      if (performance.now() < fimDaChuva) {
        depois(vigia, 200);
        return;
      }
      chovendo = false;
      nuvens.forEach((n) => n.classList.remove("chovendo"));
      if (chuva) chuva.pause();
      atualizarDica();
      if (arvores.every((a) => estagio(a) === 3)) falar("Olha! As folhas cresceram! Toca na árvore!");
    };
    depois(vigia, CHUVA);
  }

  function crescerUmPouco(a) {
    pintar(a, estagio(a) + 1);
    if (estagio(a) === 3) trocarClasse(a, "balanca", 700);
  }

  // ---------- Poças ----------
  // A chuva deixa poças no chão. Se o dinossauro está em cima de uma e ela toca nele
  // (ou ele passa por ela andando), sai água para todo lado. Elas secam depois de um tempo.
  const pocas = []; // { el, x, w }
  const MAX_POCAS = 4;

  function fazerPoca() {
    const W = raiz.clientWidth;
    const w = W * (0.09 + Math.random() * 0.06);
    // Sorteia um lugar que não bata em outra poça
    let x = 0;
    for (let t = 0; t < 12; t++) {
      x = Math.random() * (W - w);
      if (pocas.every((p) => Math.abs(p.x - x) > (p.w + w) / 2 + 8)) break;
    }
    const el = document.createElement("div");
    el.className = "poca";
    el.style.left = x + "px";
    el.style.width = w + "px";
    raiz.appendChild(el);
    const poca = { el, x, w };
    pocas.push(poca);
    // Depois de um tempo ela seca
    depois(() => {
      el.classList.add("secando");
      depois(() => {
        el.remove();
        const i = pocas.indexOf(poca);
        if (i >= 0) pocas.splice(i, 1);
      }, 2200);
    }, 14000 + Math.random() * 4000);
  }

  // O dinossauro está pisando em alguma poça? (os pés ficam na parte do meio dele)
  function pocaDebaixoDoDino() {
    const d = caixa(dino);
    const de = d.x + d.w * 0.28;
    const ate = d.x + d.w * 0.74;
    return pocas.find((p) => !p.el.classList.contains("secando") && p.x < ate && p.x + p.w > de) || null;
  }

  function respingar(poca, quantas = 12) {
    const d = caixa(dino);
    const base = raiz.getBoundingClientRect();
    const y = poca.el.getBoundingClientRect().top - base.top + poca.el.offsetHeight * 0.4;
    const x0 = Math.max(poca.x, d.x + d.w * 0.28);
    const x1 = Math.min(poca.x + poca.w, d.x + d.w * 0.74);
    for (let i = 0; i < quantas; i++) {
      const el = document.createElement("span");
      el.className = "respingo";
      el.style.left = x0 + Math.random() * Math.max(10, x1 - x0) + "px";
      el.style.top = y + "px";
      el.style.setProperty("--dx", (Math.random() - 0.5) * raiz.clientWidth * 0.1 + "px");
      el.style.setProperty("--alto", 40 + Math.random() * raiz.clientHeight * 0.13 + "px");
      el.style.animationDuration = 0.55 + Math.random() * 0.3 + "s";
      raiz.appendChild(el);
      depois(() => el.remove(), 1000);
    }
    // uma ondinha na poça
    const onda = document.createElement("span");
    onda.className = "ondinha";
    onda.style.left = (x0 + x1) / 2 + "px";
    onda.style.top = y + "px";
    raiz.appendChild(onda);
    depois(() => onda.remove(), 800);
    tocarEfeito("dinossauro/efeito-respingo", "sounds", 0.6);
  }

  function soltarGota(x, y) {
    const el = document.createElement("span");
    el.className = "gota";
    el.style.left = x + "px";
    el.style.top = y + "px";
    el.style.setProperty("--queda", raiz.clientHeight - y - raiz.clientHeight * 0.1 + "px");
    el.style.animationDuration = 0.55 + Math.random() * 0.25 + "s";
    raiz.appendChild(el);
    depois(() => el.remove(), 900);
  }

  // Efeitos gravados (public/sounds/<nome>.mp3 ou public/sons/<nome>.mp3): mordida, passos do
  // dinossauro, folhas, chuva, folhas crescendo. Sem o arquivo: silêncio (ou o plano, se tiver).
  function tocarEfeito(nome, pasta = "sounds", volume = 0.7, plano) {
    try {
      const audio = new Audio(`/${pasta}/${nome}.mp3`);
      audio.volume = volume;
      efeitos.add(audio);
      audio.onended = () => efeitos.delete(audio);
      audio.onerror = () => {
        efeitos.delete(audio);
        if (plano) plano();
      };
      audio.play().catch(() => {
        efeitos.delete(audio);
        if (plano) plano();
      });
      return audio;
    } catch {
      if (plano) plano();
      return null;
    }
  }

  // Tocar no dinossauro: ele dá um pulinho e faz o som dele (public/sons/dinossauro.mp3)
  function tocarNoDino(evento) {
    evento.preventDefault();
    evento.stopPropagation();
    sons.acordar();
    trocarClasse(corpo, "pulou", 600);
    tocarSom({ palavra: "DINOSSAURO" }, () => {});
    const poca = pocaDebaixoDoDino();
    if (poca) respingar(poca);
    if (comendo) return;
    // Cada toque o deixa mais rápido; um toque só já faz ele andar um pouquinho
    const W = raiz.clientWidth;
    velocidade = Math.min(W * 0.7, Math.max(velocidade, W * 0.12) + W * 0.1);
    if (!passeando) {
      // Escolhe o lado: continua para onde estava olhando
      sentido = virado ? -1 : 1;
      passeando = true;
      dino.style.transition = "none";
    }
  }

  // ---------- Passeio: toca nele e ele anda; quanto mais toca, mais rápido ----------
  // Sem toques, a velocidade vai caindo até ele parar (mas sempre anda um pouco antes).
  const ATRITO = 1.1; // quanto da velocidade se perde por segundo
  let passeando = false;
  let sentido = 1;
  let quadro = 0;
  let ultimo = performance.now();
  let ultimoRespingo = 0;

  function passear(agora) {
    const s = Math.min((agora - ultimo) / 1000, 0.05);
    ultimo = agora;
    if (passeando && !comendo) {
      const W = raiz.clientWidth;
      velocidade *= Math.exp(-ATRITO * s);
      velocidade -= W * 0.03 * s;
      if (velocidade < W * 0.02) {
        velocidade = 0;
        passeando = false;
        dino.classList.remove("andando");
        dino.style.removeProperty("--passo");
      } else {
        // Limites da tela: bate na borda e volta
        const d = caixa(dino);
        const origem = d.x - posicao;
        const minimo = -origem + 4;
        const maximo = W - d.w - origem - 4;
        posicao += sentido * velocidade * s;
        if (posicao > maximo) { posicao = maximo; sentido = -1; }
        if (posicao < minimo) { posicao = minimo; sentido = 1; }
        virado = sentido < 0;
        corpo.classList.toggle("virado", virado);
        dino.style.translate = `${posicao}px 0`;
        dino.classList.add("andando");
        if (agora - ultimoRespingo > 350) {
          const poca = pocaDebaixoDoDino();
          if (poca) {
            ultimoRespingo = agora;
            respingar(poca, 6);
          }
        }
        // Pernas mais depressa quando ele corre mais
        dino.style.setProperty("--passo", Math.max(0.14, 0.42 - (velocidade / (W * 0.7)) * 0.28) + "s");
      }
    }
    quadro = requestAnimationFrame(passear);
  }
  quadro = requestAnimationFrame(passear);

  const ouvintes = [];
  function ouvir(el, fn) {
    const f = (evento) => {
      evento.preventDefault();
      evento.stopPropagation();
      sons.acordar();
      fn(el);
    };
    el.addEventListener("pointerdown", f);
    ouvintes.push([el, f]);
  }
  arvores.forEach((a) => ouvir(a, comerArvore));
  nuvens.forEach((n) => ouvir(n, chover));
  dino.addEventListener("pointerdown", tocarNoDino);
  const acordar = () => sons.acordar();
  raiz.addEventListener("pointerdown", acordar);

  // Girou o celular: o tamanho da cena muda, então o dinossauro volta para o cantinho dele
  const aoGirar = () => {
    dino.style.transition = "none";
    dino.style.translate = "";
    posicao = 0;
  };
  window.addEventListener("resize", aoGirar);
  document.body.classList.add("luvinha"); // o mouse vira a luvinha, igual nos outros jogos

  // Começo: as árvores cheias e o dinossauro chegando devagar
  arvores.forEach((a) => pintar(a, 3));
  mostrarDino();
  falar("Olha o dinossauro! Ele está com fome! Toca em uma árvore!");
  atualizarDica();
  lembrar();

  // Limpeza: para voz, sons e timers e devolve o DOM ao estado inicial
  return () => {
    cancelAnimationFrame(quadro);
    falas.parar();
    efeitos.forEach((a) => a.pause());
    efeitos.clear();
    sons.fechar();
    timers.forEach(clearTimeout);
    ouvintes.forEach(([el, f]) => el.removeEventListener("pointerdown", f));
    dino.removeEventListener("pointerdown", tocarNoDino);
    raiz.removeEventListener("pointerdown", acordar);
    window.removeEventListener("resize", aoGirar);
    document.body.classList.remove("luvinha");
    raiz.querySelectorAll(".folha-voando, .gota, .poca, .respingo, .ondinha").forEach((el) => el.remove());
  };
}
