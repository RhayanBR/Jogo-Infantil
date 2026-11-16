// Gera as falas do jogo dos Três Porquinhos na ElevenLabs (português do Brasil).
// Uso: XI_KEY=<chave> node scripts/gerar-falas-porquinhos.js
// Escreve os .mp3 em public/sounds/porquinhos/ e o índice app/falas-porquinhos.js
// (texto exato que o jogo fala -> nome do arquivo). Arquivos que já existem são pulados.
const fs = require("fs");
const raiz = require("path").resolve(__dirname, "..");
const NUMEROS = ["Um", "Dois", "Três", "Quatro", "Cinco", "Seis", "Sete", "Oito"];
const falas = [
  ["era-uma-vez", "Era uma vez três porquinhos! Eles estão fugindo do lobo!"],
  ["pedir-palha", "Vamos construir uma casa de palha! Toca na palha!"],
  ["pedir-madeira", "Agora uma casa de madeira! Toca na madeira!"],
  ["pedir-tijolo", "Agora uma casa de tijolo, bem forte! Toca nos tijolos!"],
  ["pronta-palha", "A casa de palha ficou pronta! Toca no lobo para ele soprar!"],
  ["pronta-madeira", "A casa de madeira ficou pronta! Toca no lobo para ele soprar!"],
  ["pronta-tijolo", "A casa de tijolo ficou pronta! Toca no lobo para ele soprar!"],
  ["palha-voou", "A casa de palha voou! Corre, porquinhos!"],
  ["madeira-caiu", "A casa de madeira caiu! Corre, porquinhos!"],
  ["blonk", "Blonk! A casa de tijolo nem mexeu! O lobo ficou cansadinho."],
  ["escada", "Olha uma escada! Toca na escada!"],
  ["subiu", "O lobo subiu na escada!"],
  ["chamine", "E caiu na chaminé!"],
  ["quente", "Ahhhhhhh! Tá quente! Ahhhhhhh!"],
  ["final", "Os porquinhos conseguiram! Aee! E eles viveram felizes para sempre!"],
  ["borboleta", "Borboleta!"],
  ["aee", "Aee!"],
];
NUMEROS.forEach((n, i) => {
  falas.push([`n${i + 1}`, `${n}!`]);
  falas.push([`n${i + 1}-la-vai`, `${n}! Lá vai!`]);
});

const VOZ = "cgSgspJ2msm6clMCkdW9"; // Jessica: alegre e calorosa
(async () => {
  console.log(falas.length, "falas,", falas.reduce((s, [, t]) => s + t.length, 0), "caracteres");
  for (const [arq, texto] of falas) {
    const destino = `${raiz}/public/sounds/porquinhos/${arq}.mp3`;
    if (fs.existsSync(destino) && fs.statSync(destino).size > 2000) continue;
    let ok = false;
    for (let t = 0; t < 4 && !ok; t++) {
      const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOZ}?output_format=mp3_44100_128`, {
        method: "POST",
        headers: { "xi-api-key": process.env.XI_KEY, "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ text: texto, model_id: "eleven_multilingual_v2", language_code: "pt", voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.4 } }),
      });
      if (r.ok) {
        fs.writeFileSync(destino, Buffer.from(await r.arrayBuffer()));
        ok = true;
      } else {
        console.log(arq, r.status);
        await new Promise((x) => setTimeout(x, 1500 * (t + 1)));
      }
    }
  }
  const mapa = Object.fromEntries(falas.map(([arq, texto]) => [texto, arq]));
  fs.writeFileSync(
    `${raiz}/app/falas-porquinhos.js`,
    `// Falas gravadas do jogo dos Três Porquinhos (public/sounds/porquinhos/<nome>.mp3).\n// A chave é o texto exato que o jogo fala; o que não estiver aqui usa a voz do navegador.\n// Gerado por scripts/gerar-falas-porquinhos.js (ElevenLabs).\nexport const FALAS = ${JSON.stringify(mapa, null, 2)};\n`
  );
  console.log("pronto");
})();
