// Gera as falas do jogo do Monstrinho na ElevenLabs (português do Brasil).
// Uso: XI_KEY=<chave> node scripts/gerar-falas-monstrinho.js
// Escreve os .mp3 em public/sounds/monstrinho-falas/ e o índice app/falas-monstrinho.js
// (texto exato que o jogo fala -> nome do arquivo). Arquivos que já existem são pulados.
const fs = require("fs");
const raiz = require("path").resolve(__dirname, "..");
// [arquivo, texto que o jogo fala, texto para a voz (se for diferente)]
const falas = [
  ["chegou-maca", "Olha o monstrinho! Ele está com fome! Toca na maçã!"],
  ["brotou-maca", "Uma árvore nova! Toca na maçã!"],
  ["acabou-maca", "Ué? Acabaram as maçãs!"],
  ["gostosa-maca", "Hum... A árvore parece gostosa!"],
  ["comeu-maca", "Ele comeu a árvore inteira! Que barrigão!"],
  ["chegou-uva", "Olha! Uvas! Toca na uva!"],
  ["acabou-uva", "Ué? Acabaram as uvas!"],
  ["gostosa-uva", "Hum... A parreira parece gostosa!"],
  ["comeu-uva", "Ele comeu a parreira inteira! Que barrigão!"],
  ["nhac", "Nhaaac!", "Nhac!"],
  ["levantar", "Toca no monstrinho para ele levantar!"],
];
["Uma maçã!", "Duas maçãs!", "Três maçãs!", "Quatro maçãs!", "Cinco maçãs!"].forEach((t, i) => falas.push([`maca-${i + 1}`, t]));
["Uma uva!", "Duas uvas!", "Três uvas!", "Quatro uvas!", "Cinco uvas!"].forEach((t, i) => falas.push([`uva-${i + 1}`, t]));

const VOZ = "cgSgspJ2msm6clMCkdW9"; // Jessica: alegre e calorosa
(async () => {
  console.log(falas.length, "falas");
  fs.mkdirSync(`${raiz}/public/sounds/monstrinho-falas`, { recursive: true });
  for (const [arq, texto, tts] of falas) {
    const destino = `${raiz}/public/sounds/monstrinho-falas/${arq}.mp3`;
    if (fs.existsSync(destino) && fs.statSync(destino).size > 2000) continue;
    let ok = false;
    for (let t = 0; t < 4 && !ok; t++) {
      const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOZ}?output_format=mp3_44100_128`, {
        method: "POST",
        headers: { "xi-api-key": process.env.XI_KEY, "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ text: tts || texto, model_id: "eleven_multilingual_v2", language_code: "pt", voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.4 } }),
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
    `${raiz}/app/falas-monstrinho.js`,
    `// Falas gravadas do jogo do Monstrinho (public/sounds/monstrinho-falas/<nome>.mp3).\n// A chave é o texto exato que o jogo fala; o que não estiver aqui usa a voz do navegador.\n// Gerado por scripts/gerar-falas-monstrinho.js (ElevenLabs).\nexport const FALAS = ${JSON.stringify(mapa, null, 2)};\n`
  );
  console.log("pronto");
})();
