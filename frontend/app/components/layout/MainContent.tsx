import { memo, useEffect, useRef, useState, type ReactNode } from "react";

/**
 * MainContent - Contenedor principal del contenido de la aplicación
 *
 * Proporciona un contenedor scrollable con padding y márgenes apropiados
 * para el contenido principal de cada página.
 */
interface MainContentProps {
  children: ReactNode;
}

export const MainContent = memo(({ children }: MainContentProps) => {
  const mainRef = useRef<HTMLElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [hasOverflow, setHasOverflow] = useState(false);

  useEffect(() => {
    const element = mainRef.current;
    if (!element) return undefined;

    const checkOverflow = () => {
      const nextHasOverflow = element.scrollHeight - element.clientHeight > 8;
      setHasOverflow(nextHasOverflow);
    };

    checkOverflow();
    const raf = requestAnimationFrame(checkOverflow);

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(checkOverflow)
        : null;

    resizeObserver?.observe(element);
    if (contentRef.current) {
      resizeObserver?.observe(contentRef.current);
    }
    window.addEventListener("resize", checkOverflow);

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", checkOverflow);
    };
  }, [children]);

  return (
    <main
      ref={mainRef}
      className={`flex-1 ${hasOverflow ? "overflow-y-auto" : "overflow-y-hidden"} overflow-x-hidden bg-background min-h-0`}
      role="main"
    >
      <div ref={contentRef} className="container mx-auto px-6 py-6">
        {children}
      </div>
    </main>
  );
});

MainContent.displayName = "MainContent";
