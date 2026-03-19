'use client';

import { useEffect, useRef, useState } from 'react';

export default function FancyCursor() {
  const dotRef = useRef<HTMLDivElement | null>(null);
  const ringRef = useRef<HTMLDivElement | null>(null);
  const targetRef = useRef({ x: 0, y: 0 });
  const ringRefPos = useRef({ x: 0, y: 0 });
  const rafIdRef = useRef<number | null>(null);
  const visibleRef = useRef(false);
  const [visible, setVisible] = useState(false);
  const [interactiveHover, setInteractiveHover] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const canUseCustomCursor =
      window.matchMedia('(pointer: fine)').matches &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!canUseCustomCursor) return;

    document.body.classList.add('fancy-cursor-enabled');

    const animate = () => {
      const ring = ringRef.current;
      const dot = dotRef.current;
      if (ring && dot) {
        const lerp = 0.2;
        ringRefPos.current.x += (targetRef.current.x - ringRefPos.current.x) * lerp;
        ringRefPos.current.y += (targetRef.current.y - ringRefPos.current.y) * lerp;

        dot.style.transform = `translate3d(${targetRef.current.x}px, ${targetRef.current.y}px, 0)`;
        ring.style.transform = `translate3d(${ringRefPos.current.x}px, ${ringRefPos.current.y}px, 0)`;
      }
      rafIdRef.current = window.requestAnimationFrame(animate);
    };

    const onPointerMove = (event: PointerEvent) => {
      targetRef.current = { x: event.clientX, y: event.clientY };
      if (!visibleRef.current) {
        visibleRef.current = true;
        setVisible(true);
      }
    };

    const onPointerLeave = () => {
      visibleRef.current = false;
      setVisible(false);
    };
    const onPointerEnter = () => {
      visibleRef.current = true;
      setVisible(true);
    };

    const onPointerOver = (event: PointerEvent) => {
      const el = event.target as HTMLElement | null;
      if (!el) return;
      const interactive = el.closest('button, a, input, textarea, select, [role="button"]');
      setInteractiveHover(Boolean(interactive));
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerleave', onPointerLeave);
    window.addEventListener('pointerenter', onPointerEnter);
    window.addEventListener('pointerover', onPointerOver);

    rafIdRef.current = window.requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerleave', onPointerLeave);
      window.removeEventListener('pointerenter', onPointerEnter);
      window.removeEventListener('pointerover', onPointerOver);
      if (rafIdRef.current !== null) {
        window.cancelAnimationFrame(rafIdRef.current);
      }
      document.body.classList.remove('fancy-cursor-enabled');
    };
  }, []);

  return (
    <>
      <div
        ref={ringRef}
        className={`fancy-cursor-ring ${visible ? 'is-visible' : ''} ${interactiveHover ? 'is-hover' : ''}`}
        aria-hidden="true"
      />
      <div
        ref={dotRef}
        className={`fancy-cursor-dot ${visible ? 'is-visible' : ''} ${interactiveHover ? 'is-hover' : ''}`}
        aria-hidden="true"
      />
    </>
  );
}
