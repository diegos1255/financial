import confetti from 'canvas-confetti';

/**
 * Chuva de confetes cobrindo a tela toda, cores do arco-iris.
 *
 * Combina 3 fontes simultaneas de particulas:
 *  1. Rajada lateral esquerda (do canto inferior pra cima e direita)
 *  2. Rajada lateral direita (do canto inferior pra cima e esquerda)
 *  3. Chuva do topo — particulas nascem em posicoes aleatorias no topo,
 *     caem por gravidade cobrindo o centro tambem
 *
 * Duracao default 4s. Auto-para depois.
 */
export function celebrateSuccess(durationMs = 4000): void {
  const end = Date.now() + durationMs;

  // Arco-iris + rosa/ciano pra encorpar
  const colors = [
    '#ef4444', // vermelho
    '#f97316', // laranja
    '#eab308', // amarelo
    '#22c55e', // verde
    '#06b6d4', // ciano
    '#3b82f6', // azul
    '#8b5cf6', // violeta
    '#ec4899', // rosa
  ];

  function frame() {
    // Rajada da esquerda (sobe e vai pra direita)
    confetti({
      particleCount: 4,
      angle: 60,
      spread: 60,
      startVelocity: 55,
      origin: { x: 0, y: 0.75 },
      colors,
      zIndex: 9999,
    });
    // Rajada da direita (sobe e vai pra esquerda)
    confetti({
      particleCount: 4,
      angle: 120,
      spread: 60,
      startVelocity: 55,
      origin: { x: 1, y: 0.75 },
      colors,
      zIndex: 9999,
    });
    // Chuva do topo — particulas nascem em toda a largura, caem por
    // gravidade cobrindo o centro que as rajadas laterais nao alcancam.
    confetti({
      particleCount: 3,
      angle: 270,      // pra baixo
      spread: 90,      // dispersao alta
      startVelocity: 30,
      origin: { x: Math.random(), y: 0 },
      colors,
      zIndex: 9999,
      gravity: 0.8,
      scalar: 1.1,
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  }
  frame();
}
