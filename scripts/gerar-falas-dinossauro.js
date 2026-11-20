// Gera as falas do jogo do Dinossauro na ElevenLabs (português do Brasil).
// Uso: XI_KEY=<chave> node scripts/gerar-falas-dinossauro.js
// Escreve os .mp3 em public/sounds/dinossauro/ e o índice app/falas-dinossauro.js
// (texto exato que o jogo fala -> nome do arquivo). Arquivos que já existem são pulados.
// Os efeitos (chuva, crescer, passos, folhas) são efeito-*.mp3 na mesma pasta, feitos com a
// API de efeitos sonoros.
const fs = require("fs");
const raiz = require("path").resolve(__dirname, "..");
const falas = [
  ["comeco", "Olha o dinossauro! Ele está com fome! Toca em uma árvore!"],
  ["lembrar-arvore", "Toca em uma árvore para o dinossauro comer!"],
  ["lembrar-nuvem", "Toca na nuvem para chover!"],
  ["comeu-outra", "Nham nham! Ele comeu as folhas! Toca em outra árvore!"],
  ["comeu-todas", "Nham nham! Ele comeu todas as folhas! Agora toca na nuvem para chover!"],
  ["chovendo", "Plim plim! Está chovendo!"],
  ["cresceram", "Olha! As folhas cresceram! Toca na árvore!"],
];
const VOZ = "cgSgspJ2msm6clMCkdW9"; // Jessica: alegre e calorosa
(async () => {
  fs.mkdirSync(`${raiz}/public/sounds/dinossauro`, { recursive: true });
  const feitos = new Set();
  for (const [arq, texto] of falas) {
    const destino = `${raiz}/public/sounds/dinossauro/${arq}.mp3`;
    if (fs.existsSync(destino) && fs.statSync(destino).size > 2000) { feitos.add(arq); continue; }
    for (let t = 0; t < 5 && !feitos.has(arq); t++) {
      const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOZ}?output_format=mp3_44100_128`, {
        method: "POST",
        headers: { "xi-api-key": process.env.XI_KEY, "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ text: texto, model_id: "eleven_multilingual_v2", language_code: "pt", voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.4 } }),
      });
      if (r.ok) {
        fs.writeFileSync(destino, Buffer.from(await r.arrayBuffer()));
        feitos.add(arq);
      } else {
        console.log(arq, r.status);
        await new Promise((x) => setTimeout(x, 2000 * (t + 1)));
      }
    }
  }
  const mapa = Object.fromEntries(falas.filter(([arq]) => feitos.has(arq)).map(([arq, texto]) => [texto, arq]));
  fs.writeFileSync(
    `${raiz}/app/falas-dinossauro.js`,
    `// Falas gravadas do jogo do Dinossauro (public/sounds/dinossauro/<nome>.mp3).\n// A chave é o texto exato que o jogo fala; o que não estiver aqui usa a voz do navegador.\n// Gerado por scripts/gerar-falas-dinossauro.js (ElevenLabs).\nexport const FALAS = ${JSON.stringify(mapa, null, 2)};\n`
  );
  console.log("pronto:", Object.keys(mapa).length, "de", falas.length);
})();
