/**
 * Hook to debounce a value
 *
 * Useful for search inputs and other scenarios where you want to delay
 * the update of a value until the user stops typing
 */

import { useState, useEffect } from "react";

export function useDebouncedValue<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
