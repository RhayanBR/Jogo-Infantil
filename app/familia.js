import { useEffect, useRef } from "react";
import { iniciarBrincadeira } from "./brincadeira";
import { estiloLetra } from "./letras";

// Os rostos são imagens 3D (public/familia/), feitas no Blender
function Rosto({ arquivo, nome }) {
  return <img src={`/familia/${arquivo}.png`} alt={nome} draggable="false" />;
}

const NOMES = [
  {
    nome: "Rhayan",
    foto: <Rosto arquivo="papai" nome="Papai" />,
    falar: "Raian, o Papai!",
    festa: "❤️ 💥 ❤️ 💥 🎉 ⭐",
    quantidade: 40,
    cor: "#1e88e5",
  },
  {
    nome: "Fatima",
    foto: <Rosto arquivo="mamae" nome="Mamãe" />,
    falar: "Fátima, a Mamãe! Mamãe te ama!",
    festa: "❤️ 💖 💕 💗 💓 💞 💘",
    quantidade: 90,
    cor: "#e91e63",
  },
  {
    nome: "Julia",
    foto: <Rosto arquivo="julia" nome="Julia" />,
    falar: "Júlia, a Julinha!",
    festa: "❤️ 💜 ⭐ 🌟 🎉 ✨",
    quantidade: 50,
    cor: "#8e24aa",
  },
];

export default function Familia() {
  const listaRef = useRef(null);

  useEffect(() => iniciarBrincadeira(listaRef.current, { escolher: true, falarNoComeco: "Toca em um boneco!" }), []);

  return (
    <ul ref={listaRef}>
      {NOMES.map((n) => (
        <li
          key={n.nome}
          data-falar={n.falar}
          data-festa={n.festa}
          data-quantidade={n.quantidade}
          style={{ "--cor": n.cor }}
        >
          <span className="foto">{n.foto}</span>
          {[...n.nome.toUpperCase()].map((letra, i) => (
            <span key={i} className="letra" style={estiloLetra(letra, i)}>
              {letra}
            </span>
          ))}
        </li>
      ))}
    </ul>
  );
}
