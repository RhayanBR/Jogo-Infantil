// Gera as falas da Corrida dos animais na ElevenLabs (português do Brasil).
// Uso: XI_KEY=<chave> node scripts/gerar-falas-corrida.js
// Escreve os .mp3 em public/sounds/corrida/ e o índice app/falas-corrida.js
// (texto exato que o jogo fala -> nome do arquivo). Arquivos que já existem são pulados.
// As frases abaixo precisam ficar iguais às montadas em app/corrida.js.
const fs = require("fs");
const raiz = require("path").resolve(__dirname, "..");

const fonteBichos = fs.readFileSync(`${raiz}/app/bichos.js`, "utf8");
const lista = fonteBichos.slice(fonteBichos.indexOf("export const BICHOS = [") + "export const BICHOS = ".length, fonteBichos.indexOf("\n];") + 2);
const BICHOS = new Function(`return ${lista}`)();
const fonteCorrida = fs.readFileSync(`${raiz}/app/corrida.js`, "utf8");
const corredores = [...fonteCorrida.slice(fonteCorrida.indexOf("const CORREDORES = {")).split("};")[0].matchAll(/^\s+([A-Z]+):/gm)].map((m) => m[1]);
const maiuscula = (t) => t[0].toUpperCase() + t.slice(1);

const falas = new Map(); // arquivo -> [texto do jogo, texto para a voz]
const add = (arq, texto, tts) => falas.set(arq, [texto, tts || texto]);

add("corrida", "Corrida dos animais!");
add("quem-corre-mais", "Quem corre mais? Escolhe um!");
add("acertou", "Você acertou!");
add("tres", "Três!");
add("dois", "Dois!");
add("um", "Um!");
add("ja", "Já!");
for (const pronome of ["ele", "ela"])
  ["segundo", "terceiro", "quarto", "quinto"].forEach((o) => add(`${pronome}-${o}`, `${maiuscula(pronome)} chegou em ${o} lugar.`));
for (const b of BICHOS.filter((x) => corredores.includes(x.palavra))) {
  const id = b.palavra.toLowerCase();
  add(`nome-${id}`, `${maiuscula(b.nome)}!`);
  add(`escolheu-${id}`, `Você escolheu ${b.nome}!`);
  add(`primeiro-${id}`, `${maiuscula(b.nome)} chegou primeiro!`);
  add(`parabens-${id}`, `Parabéns! ${maiuscula(b.nome)} é o primeiro!`);
}

const VOZ = "cgSgspJ2msm6clMCkdW9"; // Jessica: alegre e calorosa
(async () => {
  console.log(falas.size, "falas,", [...falas.values()].reduce((s, [, t]) => s + t.length, 0), "caracteres");
  fs.mkdirSync(`${raiz}/public/sounds/corrida`, { recursive: true });
  const itens = [...falas];
  const feitos = new Set();
  async function gerar([arq, [, tts]]) {
    const destino = `${raiz}/public/sounds/corrida/${arq}.mp3`;
    if (fs.existsSync(destino) && fs.statSync(destino).size > 2000) return feitos.add(arq);
    for (let t = 0; t < 5; t++) {
      const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOZ}?output_format=mp3_44100_128`, {
        method: "POST",
        headers: { "xi-api-key": process.env.XI_KEY, "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ text: tts, model_id: "eleven_multilingual_v2", language_code: "pt", voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.4 } }),
      });
      if (r.ok) {
        fs.writeFileSync(destino, Buffer.from(await r.arrayBuffer()));
        return feitos.add(arq);
      }
      console.log(arq, r.status);
      await new Promise((x) => setTimeout(x, 2000 * (t + 1)));
    }
  }
  for (let i = 0; i < itens.length; i += 2) await Promise.all(itens.slice(i, i + 2).map(gerar));
  const mapa = Object.fromEntries(itens.filter(([arq]) => feitos.has(arq)).map(([arq, [texto]]) => [texto, arq]));
  fs.writeFileSync(
    `${raiz}/app/falas-corrida.js`,
    `// Falas gravadas da Corrida dos animais (public/sounds/corrida/<nome>.mp3).\n// A chave é o texto exato que o jogo fala; o que não estiver aqui usa a voz do navegador.\n// Gerado por scripts/gerar-falas-corrida.js (ElevenLabs).\nexport const FALAS = ${JSON.stringify(mapa, null, 2)};\n`
  );
  console.log("pronto:", Object.keys(mapa).length, "de", falas.size);
})();
