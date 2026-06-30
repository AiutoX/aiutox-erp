/**
 * Hook for password strength validation using zxcvbn-ts
 */

import { useCallback, useEffect, useRef, useState } from "react";

import type { PasswordStrength } from "../lib/api/auth.api";

let zxcvbnInitialized = false;
let zxcvbnFn: ((password: string, userInputs?: string[]) => { score: number; crackTimesDisplay: { offlineSlowHashing1e4PerSecond: string }; feedback: { suggestions: string[]; warning: string | null } }) | null = null;

async function loadZxcvbn() {
  if (zxcvbnInitialized) return;
  const [{ zxcvbn, zxcvbnOptions }, common, en] = await Promise.all([
    import("@zxcvbn-ts/core"),
    import("@zxcvbn-ts/language-common"),
    import("@zxcvbn-ts/language-en"),
  ]);
  zxcvbnOptions.setOptions({
    translations: en.translations,
    graphs: common.adjacencyGraphs,
    dictionary: { ...common.dictionary, ...en.dictionary },
  });
  zxcvbnFn = zxcvbn;
  zxcvbnInitialized = true;
}

export interface PasswordStrengthResult {
  score: number;
  strength: PasswordStrength;
  crackTime: string;
  suggestions: string[];
  warnings: string[];
  isValid: boolean;
}

interface UsePasswordStrengthOptions {
  minScore?: number;
  userInputs?: string[];
}

/**
 * Hook to validate password strength in real-time
 *
 * @param password - Password to validate
 * @param options - Validation options
 * @returns Password strength analysis
 */
export function usePasswordStrength(
  password: string,
  options: UsePasswordStrengthOptions = {}
): PasswordStrengthResult {
  const { minScore = 2, userInputs = [] } = options;
  const userInputsRef = useRef(userInputs);
  userInputsRef.current = userInputs;

  const [result, setResult] = useState<PasswordStrengthResult>({
    score: 0,
    strength: "very-weak",
    crackTime: "",
    suggestions: [],
    warnings: [],
    isValid: false,
  });

  const analyzePassword = useCallback(async () => {
    if (!password || password.length === 0) {
      setResult({
        score: 0,
        strength: "very-weak",
        crackTime: "",
        suggestions: ["Ingresa una contraseña"],
        warnings: [],
        isValid: false,
      });
      return;
    }

    await loadZxcvbn();
    if (!zxcvbnFn) return;
    const analysis = zxcvbnFn(password, userInputsRef.current);

    // Map score to strength level
    const strengthMap: Record<number, PasswordStrength> = {
      0: "very-weak",
      1: "weak",
      2: "fair",
      3: "good",
      4: "strong",
    };

    const strength = strengthMap[analysis.score] || "very-weak";

    // Get crack time display
    const crackTimeDisplay =
      analysis.crackTimesDisplay.offlineSlowHashing1e4PerSecond || "";

    // Translate crack time to Spanish
    const crackTime = translateCrackTime(crackTimeDisplay);

    // Extract suggestions and warnings
    const suggestions = analysis.feedback.suggestions || [];
    const warnings = analysis.feedback.warning
      ? [analysis.feedback.warning]
      : [];

    // Translate suggestions and warnings to Spanish
    const translatedSuggestions = suggestions.map(translateSuggestion);
    const translatedWarnings = warnings.map(translateWarning);

    setResult({
      score: analysis.score,
      strength,
      crackTime,
      suggestions: translatedSuggestions,
      warnings: translatedWarnings,
      isValid: analysis.score >= minScore,
    });
  }, [password, minScore]);

  useEffect(() => {
    void analyzePassword();
  }, [analyzePassword]);

  return result;
}

/**
 * Translate crack time to Spanish
 */
function translateCrackTime(crackTime: string): string {
  const translations: Record<string, string> = {
    "less than a second": "menos de 1 segundo",
    seconds: "segundos",
    minutes: "minutos",
    hours: "horas",
    days: "días",
    months: "meses",
    years: "años",
    centuries: "siglos",
  };

  let translated = crackTime.toLowerCase();
  for (const [eng, esp] of Object.entries(translations)) {
    translated = translated.replace(eng, esp);
  }

  return translated;
}

/**
 * Translate suggestions to Spanish
 */
function translateSuggestion(suggestion: string): string {
  const translations: Record<string, string> = {
    "Use a few words, avoid common phrases":
      "Usa varias palabras, evita frases comunes",
    "No need for symbols, digits, or uppercase letters":
      "No es necesario usar símbolos, números o mayúsculas",
    "Add another word or two. Uncommon words are better.":
      "Agrega una o dos palabras más. Las palabras poco comunes son mejores.",
    "Capitalization doesn't help very much": "Las mayúsculas no ayudan mucho",
    "All-uppercase is almost as easy to guess as all-lowercase":
      "Todo en mayúsculas es casi tan fácil de adivinar como todo en minúsculas",
    "Reversed words aren't much harder to guess":
      "Las palabras invertidas no son mucho más difíciles de adivinar",
    "Predictable substitutions like '@' instead of 'a' don't help very much":
      "Las sustituciones predecibles como '@' en lugar de 'a' no ayudan mucho",
    "Use a longer keyboard pattern with more turns":
      "Usa un patrón de teclado más largo con más giros",
    "Avoid repeated words and characters":
      "Evita palabras y caracteres repetidos",
    "Avoid sequences": "Evita secuencias",
    "Avoid recent years": "Evita años recientes",
    "Avoid years that are associated with you":
      "Evita años que estén asociados contigo",
    "Avoid dates and years that are associated with you":
      "Evita fechas y años que estén asociados contigo",
  };

  return translations[suggestion] || suggestion;
}

/**
 * Translate warnings to Spanish
 */
function translateWarning(warning: string): string {
  const translations: Record<string, string> = {
    "This is a top-10 common password": "Esta es una contraseña muy común",
    "This is a top-100 common password": "Esta es una contraseña muy común",
    "This is a very common password": "Esta es una contraseña muy común",
    "This is similar to a commonly used password":
      "Esta es similar a una contraseña comúnmente usada",
    "A word by itself is easy to guess":
      "Una palabra sola es fácil de adivinar",
    "Names and surnames by themselves are easy to guess":
      "Los nombres y apellidos solos son fáciles de adivinar",
    "Common names and surnames are easy to guess":
      "Los nombres y apellidos comunes son fáciles de adivinar",
    "Straight rows of keys are easy to guess":
      "Las filas rectas de teclas son fáciles de adivinar",
    "Short keyboard patterns are easy to guess":
      "Los patrones cortos de teclado son fáciles de adivinar",
    "Repeats like 'aaa' are easy to guess":
      "Las repeticiones como 'aaa' son fáciles de adivinar",
    "Repeats like 'abcabcabc' are only slightly harder to guess than 'abc'":
      "Las repeticiones como 'abcabcabc' son solo un poco más difíciles de adivinar que 'abc'",
    "Sequences like 'abc' or '6543' are easy to guess":
      "Las secuencias como 'abc' o '6543' son fáciles de adivinar",
    "Recent years are easy to guess":
      "Los años recientes son fáciles de adivinar",
    "Dates are often easy to guess":
      "Las fechas suelen ser fáciles de adivinar",
  };

  return translations[warning] || warning;
}
