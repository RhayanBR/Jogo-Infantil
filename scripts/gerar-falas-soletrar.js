// Gera as falas dos jogos de soletrar (Família e Palavras) na ElevenLabs, em português do Brasil.
// Uso: XI_KEY=<chave> node scripts/gerar-falas-soletrar.js
// Cobre as frases que dependem do bicho (Lá vem..., lembretes, contagem...), as letras que
// faltavam e as palavras do jogo Palavras. Escreve os .mp3 em public/sounds/soletrar/ e o
// índice app/falas-soletrar.js (texto exato que o jogo fala -> arquivo). O que já existe é pulado.
// As frases abaixo precisam ficar iguais às montadas em app/brincadeira.js.
const fs = require("fs");
const raiz = require("path").resolve(__dirname, "..");

// Bichos (lê a lista de app/bichos.js)
const fonteBichos = fs.readFileSync(`${raiz}/app/bichos.js`, "utf8");
const lista = fonteBichos.slice(fonteBichos.indexOf("export const BICHOS = [") + "export const BICHOS = ".length, fonteBichos.indexOf("\n];") + 2);
const BICHOS = new Function(`return ${lista}`)();

function numero(n, tipo) {
  const ela = tipo.pronome === "ela";
  return ["zero", ela ? "uma" : "um", ela ? "duas" : "dois", "três", "quatro", "cinco", "seis", "sete", "oito"][n];
}
const quemVeio = (t, n) => (n === 1 ? t.nome : `${numero(n, t)} ${t.muitos}`);

const falas = new Map(); // texto do jogo -> texto para a voz
const add = (texto, tts) => falas.set(texto, tts || texto);

// Nome de cada letra como se fala (a voz erra se vier só a letra)
const LETRA = { A: "á", B: "bê", C: "cê", E: "é", F: "éfe", H: "agá", I: "i", J: "jóta", K: "cá", L: "éle", M: "ême", N: "êne", O: "ó", P: "pê", R: "érre", S: "ésse", T: "tê", U: "u", Y: "ípsilon" };
const letrasDoJogo = Object.keys(LETRA);
letrasDoJogo.forEach((l) => {
  add(`Toca na letra ${l}!`, `Toca na letra ${LETRA[l]}!`);
  add(`Pegou a letra ${l}!`, `Pegou a letra ${LETRA[l]}!`);
});

add("Toca em um boneco!");
add("Muito bem! Agora vamos para outra palavra!");
add("Corre, pega ele!");
add("Corre, pega ela!");
add("Corre, pega todos!");
add("Quase! Pega!");
add("Aee! Pegou os dois!");
add("Aee! Pegou todos!");
for (const n of ["um", "uma", "dois", "duas", "três", "quatro", "cinco", "seis", "sete"]) add(`${n}!`, `${n[0].toUpperCase() + n.slice(1)}!`);

for (const t of BICHOS) {
  add(`Aee! Pegou ${t.nome}!`);
  for (const q of [1, 2, 4, 8]) add(`Olha! Lá ${q === 1 ? "vem" : "vêm"} ${quemVeio(t, q)}!`);
  for (let n = 1; n <= 8; n++) add(`Corre! ${quemVeio(t, n)} ${n === 1 ? "está" : "estão"} fugindo! Pega!`);
  add(`Toca ${t.no} para pegar ${t.pronome}!`);
  add(`Toca nos ${t.muitos} para pegar!`);
  add(`Olha ${t.nome} correndo! Pega!`);
  add(`Olha os ${t.muitos} correndo! Pega!`);
}

// Jogo das Palavras
const fontePalavras = fs.readFileSync(`${raiz}/app/palavras.js`, "utf8");
for (const m of fontePalavras.matchAll(/palavra: "(\w+)".*?comArtigo: "([^"]+)", falar: "([^"]+)"/g)) {
  add(`Olha ${m[2]}! Toca na letra ${m[1][0]}!`, `Olha ${m[2]}! Toca na letra ${LETRA[m[1][0]]}!`);
  add(m[3]);
}

// O que já foi gerado antes (não gasta crédito de novo e mantém o nome dos arquivos)
const arquivoIndice = `${raiz}/app/falas-soletrar.js`;
let mapa = {};
if (fs.existsSync(arquivoIndice)) {
  const s = fs.readFileSync(arquivoIndice, "utf8");
  mapa = new Function(`return ${s.slice(s.indexOf("{"), s.lastIndexOf("}") + 1)}`)();
  for (const t of Object.keys(mapa)) mapa[t] = mapa[t].split("/").pop().replace(".mp3", "");
}
const jaTem = (() => {
  const s = fs.readFileSync(`${raiz}/app/falas-familia.js`, "utf8");
  return new Function(`return ${s.slice(s.indexOf("{"), s.lastIndexOf("}") + 1)}`)();
})();

const VOZ = "cgSgspJ2msm6clMCkdW9"; // Jessica: alegre e calorosa
fs.mkdirSync(`${raiz}/public/sounds/soletrar`, { recursive: true });
let proximo = Object.keys(mapa).length;
const trabalho = [...falas].filter(([texto]) => !jaTem[texto]);
console.log(falas.size, "frases,", trabalho.length, "para gerar,", trabalho.reduce((s, [, t]) => s + t.length, 0), "caracteres");

async function gerar([texto, tts]) {
  const nome = mapa[texto] || `s${String(++proximo).padStart(3, "0")}`;
  const destino = `${raiz}/public/sounds/soletrar/${nome}.mp3`;
  if (!fs.existsSync(destino) || fs.statSync(destino).size < 2000) {
    let ok = false;
    for (let t = 0; t < 5 && !ok; t++) {
      const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOZ}?output_format=mp3_44100_128`, {
        method: "POST",
        headers: { "xi-api-key": process.env.XI_KEY, "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ text: tts, model_id: "eleven_multilingual_v2", language_code: "pt", voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.4 } }),
      });
      if (r.ok) {
        fs.writeFileSync(destino, Buffer.from(await r.arrayBuffer()));
        ok = true;
      } else {
        console.log(nome, r.status, (await r.text()).slice(0, 100));
        await new Promise((x) => setTimeout(x, 2000 * (t + 1)));
      }
    }
    if (!ok) return;
  }
  mapa[texto] = nome;
}

(async () => {
  for (let i = 0; i < trabalho.length; i += 2) {
    await Promise.all(trabalho.slice(i, i + 2).map(gerar));
    if (i % 40 === 0) console.log(i, "/", trabalho.length);
  }
  const final = Object.fromEntries(Object.entries(mapa).map(([t, n]) => [t, `/sounds/soletrar/${n}.mp3`]));
  fs.writeFileSync(
    arquivoIndice,
    `// Falas gravadas dos jogos de soletrar, além das de app/falas-familia.js (public/sounds/soletrar/).\n// A chave é o texto exato que o jogo fala; o que não estiver aqui usa a voz do navegador.\n// Gerado por scripts/gerar-falas-soletrar.js (ElevenLabs).\nexport const GRAVADAS = ${JSON.stringify(final, null, 2)};\n`
  );
  console.log("pronto:", Object.keys(final).length, "falas");
})();
