"use client";

import { useState } from "react";
import Familia from "./familia";
import Palavras from "./palavras";
import Animais from "./animais";
import Corrida from "./corrida";
import Porquinhos from "./porquinhos";
import Monstrinho from "./monstrinho";

// Os jogos da tela inicial, na ordem: o número no cantinho de cada cartão é a posição aqui.
// As figuras são renderizadas em 3D no Blender (public/menu e public/monstrinho).
const JOGOS = [
  { id: "familia", nome: "Família", cor: "#e91e63", imagem: "/menu/familia.png" },
  { id: "palavras", nome: "Palavras", cor: "#1e88e5", imagem: "/menu/palavras.png" },
  { id: "animais", nome: "Encontre os animais", cor: "#43a047", imagem: "/menu/animais.png" },
  { id: "corrida", nome: "Corrida dos animais", cor: "#ff7043", imagem: "/menu/corrida.png" },
  { id: "porquinhos", nome: "Três porquinhos", cor: "#8e24aa", imagem: "/menu/porquinhos.png" },
  { id: "monstrinho", nome: "Monstrinho", cor: "#00897b", imagem: "/monstrinho/pose-parado.png" },
];

export default function Inicio() {
  const [jogo, setJogo] = useState(null);

  if (!jogo) {
    return (
      <div className="menu">
        {JOGOS.map((j, i) => (
          <button key={j.id} className="cartao" style={{ "--cor": j.cor }} onClick={() => setJogo(j.id)}>
            <span className="numero">{i + 1}</span>
            <img className="figura" src={j.imagem} alt="" draggable="false" />
            <span className="nome">{j.nome}</span>
          </button>
        ))}
      </div>

    );
  }

  return (
    <>
      <button className="voltar" onClick={() => setJogo(null)} aria-label="Voltar ao início">
        🏠
      </button>
      {jogo === "familia" && <Familia />}
      {jogo === "palavras" && <Palavras />}
      {jogo === "animais" && <Animais />}
      {jogo === "corrida" && <Corrida />}
      {jogo === "porquinhos" && <Porquinhos />}
      {jogo === "monstrinho" && <Monstrinho />}
    </>
  );
}
