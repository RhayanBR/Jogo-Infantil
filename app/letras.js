// Letras 3D feitas no Blender (public/letras/): uma cinza, para a letra que ainda não foi
// tocada, e cinco coloridas, que se revezam de letra em letra quando ela acende.
// O texto da letra continua lá (o jogo lê ele), só fica invisível.
export function estiloLetra(letra, i) {
  const l = letra.toUpperCase();
  return {
    "--cinza": `url(/letras/cinza/${l}.png)`,
    "--viva": `url(/letras/c${i % 5}/${l}.png)`,
  };
}
