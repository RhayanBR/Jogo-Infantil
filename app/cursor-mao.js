"use client";

import { useEffect, useRef } from "react";

// Cursor da mãozinha (imagens 3D feitas no Blender, em public/sprites/): esconde o cursor do
// sistema e mostra a mão seguindo o ponteiro. A mão se inclina para o lado em que o mouse anda
// e volta ao centro quando para. Em repouso ela fica aberta; ao clicar ou segurar o botão
// (ou encostar o dedo), vira a mão tocando com o indicador, com um leve "aperto".
const TAMANHO = 96;
const PONTA = { aberta: [48, 6], tocando: [63, 7] }; // a pontinha do dedo que é o "clique" (em px)
const LIMITE = 18; // inclinação máxima, em graus
const SENSIBILIDADE = 1.4; // quantos graus por pixel andado de um quadro para o outro

export default function CursorMao() {
  const caixaRef = useRef(null);

  useEffect(() => {
    const caixa = caixaRef.current;
    const html = document.documentElement;
    let x = -200;
    let y = -200;
    let alvoDeAngulo = 0;
    let angulo = 0;
    let ultimoX = null;
    let quadro = 0;
    let apertando = false;
    let aparecendo = false;
    let sumir = 0;

    // Mostra e esconde a mão (e devolve o cursor normal se o JavaScript parar)
    function aparecer() {
      clearTimeout(sumir);
      if (aparecendo) return;
      aparecendo = true;
      caixa.classList.add("visivel");
      html.classList.add("cursor-mao");
    }

    function esconder() {
      clearTimeout(sumir);
      aparecendo = false;
      caixa.classList.remove("visivel");
      html.classList.remove("cursor-mao");
    }

    function pintar() {
      const [px, py] = PONTA[apertando ? "tocando" : "aberta"];
      caixa.style.transform = `translate3d(${x - px}px, ${y - py}px, 0)`;
      // A mão gira em volta do pulso (embaixo), para parecer que se inclina
      caixa.firstChild.style.transform = `rotate(${angulo}deg)`; // o aperto (scale 0.88) é feito pela CSS, com transição
    }

    function andar(evento) {
      x = evento.clientX;
      y = evento.clientY;
      if (evento.pointerType === "touch") return; // dedo: a mão só aparece enquanto aperta
      aparecer();
      if (ultimoX !== null) {
        const delta = x - ultimoX;
        alvoDeAngulo = Math.max(-LIMITE, Math.min(LIMITE, delta * SENSIBILIDADE));
      }
      ultimoX = x;
      pintar();
    }

    function apertar(evento) {
      x = evento.clientX;
      y = evento.clientY;
      apertando = true;
      caixa.classList.add("apertando");
      if (evento.pointerType === "touch") aparecer();
      pintar();
    }

    function soltar(evento) {
      apertando = false;
      caixa.classList.remove("apertando");
      pintar();
      // No toque, a mão some um instante depois de soltar
      if (evento && evento.pointerType === "touch") sumir = setTimeout(esconder, 350);
    }

    // A cada quadro a inclinação vai suavemente para o alvo, e o alvo volta a 0 quando o mouse para
    function animar() {
      alvoDeAngulo *= 0.82;
      angulo += (alvoDeAngulo - angulo) * 0.2;
      if (Math.abs(angulo) < 0.05) angulo = 0;
      if (aparecendo) pintar();
      quadro = requestAnimationFrame(animar);
    }

    function saiu() {
      ultimoX = null;
      esconder();
    }

    window.addEventListener("pointermove", andar, { passive: true });
    window.addEventListener("pointerdown", apertar, { passive: true });
    window.addEventListener("pointerup", soltar, { passive: true });
    window.addEventListener("pointercancel", soltar, { passive: true });
    document.addEventListener("pointerleave", saiu);
    document.documentElement.addEventListener("mouseleave", saiu);
    quadro = requestAnimationFrame(animar);

    return () => {
      cancelAnimationFrame(quadro);
      clearTimeout(sumir);
      window.removeEventListener("pointermove", andar);
      window.removeEventListener("pointerdown", apertar);
      window.removeEventListener("pointerup", soltar);
      window.removeEventListener("pointercancel", soltar);
      document.removeEventListener("pointerleave", saiu);
      document.documentElement.removeEventListener("mouseleave", saiu);
      html.classList.remove("cursor-mao");
    };
  }, []);

  return (
    <div ref={caixaRef} className="cursor-mao-caixa" aria-hidden="true">
      <div className="cursor-mao-gira">
        <img className="aberta" src="/sprites/cursor_mao_aberta.png" alt="" draggable="false" width={TAMANHO} height={TAMANHO} />
        <img className="tocando" src="/sprites/cursor_mao_tocando.png" alt="" draggable="false" width={TAMANHO} height={TAMANHO} />
      </div>
    </div>
  );
}
