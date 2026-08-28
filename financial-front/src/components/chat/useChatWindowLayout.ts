import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'chat-window-layout';

type Layout = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const MIN_WIDTH = 320;
const MIN_HEIGHT = 360;
// Margem minima em qualquer borda pra sombra/borda arredondada nao serem cortadas
const VIEWPORT_MARGIN = 12;

function defaultLayout(): Layout {
  const width = Math.min(440, window.innerWidth - VIEWPORT_MARGIN * 2);
  // deixa espaco pra bolinha embaixo (~72px) + margem
  const height = Math.min(620, window.innerHeight - 90 - VIEWPORT_MARGIN);
  return {
    x: window.innerWidth - width - 20,
    y: Math.max(VIEWPORT_MARGIN, window.innerHeight - height - 90),
    width,
    height,
  };
}

function clampToViewport(l: Layout): Layout {
  const width = Math.max(MIN_WIDTH, Math.min(l.width, window.innerWidth - VIEWPORT_MARGIN * 2));
  const height = Math.max(MIN_HEIGHT, Math.min(l.height, window.innerHeight - VIEWPORT_MARGIN * 2));
  const maxX = Math.max(VIEWPORT_MARGIN, window.innerWidth - width - VIEWPORT_MARGIN);
  const maxY = Math.max(VIEWPORT_MARGIN, window.innerHeight - height - VIEWPORT_MARGIN);
  return {
    x: Math.min(Math.max(VIEWPORT_MARGIN, l.x), maxX),
    y: Math.min(Math.max(VIEWPORT_MARGIN, l.y), maxY),
    width,
    height,
  };
}

function loadLayout(): Layout {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultLayout();
    const parsed = JSON.parse(raw) as Layout;
    return clampToViewport(parsed);
  } catch {
    return defaultLayout();
  }
}

/**
 * Hook que expõe layout (posição + tamanho) do drawer, com persistência
 * em localStorage. Retorna também handlers pra drag e resize.
 */
export function useChatWindowLayout() {
  const [layout, setLayout] = useState<Layout>(() => loadLayout());
  const dragOrigin = useRef<{ mouseX: number; mouseY: number; origX: number; origY: number } | null>(null);
  const resizeOrigin = useRef<{ mouseX: number; mouseY: number; origW: number; origH: number; origX: number } | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
    } catch {
      // ignora quota
    }
  }, [layout]);

  // Ajusta se a janela mudar de tamanho
  useEffect(() => {
    function onResize() {
      setLayout((prev) => clampToViewport(prev));
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Drag
  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!dragOrigin.current) return;
      const dx = e.clientX - dragOrigin.current.mouseX;
      const dy = e.clientY - dragOrigin.current.mouseY;
      setLayout((prev) => clampToViewport({
        ...prev,
        x: dragOrigin.current!.origX + dx,
        y: dragOrigin.current!.origY + dy,
      }));
    }
    function onMouseUp() {
      dragOrigin.current = null;
      document.body.style.userSelect = '';
    }
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  // Resize (handle no canto inferior ESQUERDO — cresce/diminui pra esquerda e pra baixo)
  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!resizeOrigin.current) return;
      const dx = e.clientX - resizeOrigin.current.mouseX;
      const dy = e.clientY - resizeOrigin.current.mouseY;
      // handle esquerda-inferior: dx negativo = mais largo à esquerda
      const newWidth = Math.max(MIN_WIDTH, resizeOrigin.current.origW - dx);
      const newX = resizeOrigin.current.origX + (resizeOrigin.current.origW - newWidth);
      const newHeight = Math.max(MIN_HEIGHT, resizeOrigin.current.origH + dy);
      setLayout((prev) => clampToViewport({
        ...prev,
        x: newX,
        width: newWidth,
        height: newHeight,
      }));
    }
    function onMouseUp() {
      resizeOrigin.current = null;
      document.body.style.userSelect = '';
    }
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  const startDrag = useCallback((e: React.MouseEvent) => {
    dragOrigin.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      origX: layout.x,
      origY: layout.y,
    };
    document.body.style.userSelect = 'none';
  }, [layout.x, layout.y]);

  const startResize = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    resizeOrigin.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      origW: layout.width,
      origH: layout.height,
      origX: layout.x,
    };
    document.body.style.userSelect = 'none';
  }, [layout.width, layout.height, layout.x]);

  const reset = useCallback(() => {
    setLayout(defaultLayout());
  }, []);

  return { layout, startDrag, startResize, reset };
}
