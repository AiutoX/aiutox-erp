// Ejecutar inmediatamente para suprimir errores de hidratación
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.error = (...args) => {
  const message = args[0];
  if (
    typeof message === "string" &&
    (message.includes("data-react-router-critical-css") ||
      message.includes("A tree hydrated but some attributes") ||
      message.includes("hydration-mismatch"))
  ) {
    // Ignorar errores específicos de hidratación
    return;
  }
  originalConsoleError(...args);
};

console.warn = (...args) => {
  const message = args[0];
  if (
    typeof message === "string" &&
    (message.includes("data-react-router-critical-css") ||
      message.includes("hydration"))
  ) {
    // Ignorar warnings específicos de hidratación
    return;
  }
  originalConsoleWarn(...args);
};

export {};
