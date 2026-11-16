import { tocarSom } from "./sons";

// Falas gravadas (public/sounds/<pasta>/<nome>.mp3): usado no "Encontre os animais" e nos porquinhos.
// Cada fala é uma lista de gravações curtinhas tocadas em seguida (ex.: "Esse é o gato!" e
// depois "Pega a vaca!"). Se alguma gravação não carregar, a voz do navegador fala o texto,
// como era antes. Usa o mesmo objeto `voz` do jogo, para o jogo saber quando ela está falando.
export function criarFalas(voz, depois, pasta = "animais") {
  let vez = 0;
  let audio = null;

  function parar() {
    vez++;
    if (audio) audio.pause();
    audio = null;
  }

  function falar(gravacoes, texto, quandoTerminar) {
    voz.calar();
    parar();
    const minha = vez;
    voz.falando = true;
    let terminou = false;
    let i = 0;

    const acabar = () => {
      if (terminou || minha !== vez) return;
      terminou = true;
      voz.falando = false;
      if (quandoTerminar) quandoTerminar();
    };
    const usarVozDoNavegador = () => {
      if (terminou || minha !== vez) return;
      terminou = true;
      voz.falar(texto, quandoTerminar);
    };
    const proxima = () => {
      if (minha !== vez) return;
      if (i >= gravacoes.length) return acabar();
      const a = new Audio(`/sounds/${pasta}/${gravacoes[i++]}.mp3`);
      audio = a;
      a.onended = proxima;
      a.onerror = usarVozDoNavegador;
      a.play().catch(usarVozDoNavegador);
    };
    proxima();

    // Segurança: se uma gravação travar, libera o jogo depois de um tempo
    depois(acabar, 3000 + gravacoes.length * 8000);
  }

  // Primeiro o bicho faz o som dele, depois tocam as gravações
  function somEFala(tipo, gravacoes, texto, quandoTerminar) {
    voz.calar();
    parar();
    voz.falando = true;
    tocarSom(tipo, (somFalado) => falar(gravacoes, somFalado + texto, quandoTerminar));
  }

  return {
    falar,
    somEFala,
    parar() {
      parar();
      voz.parar();
    },
  };
}
