import createContextHook from '@nkzw/create-context-hook';
import type { FC, ReactNode } from 'react';

type ContextInitializer<T> = () => T;

type SafeContextProvider = FC<{ children: ReactNode }>;

/**
 * Wraps @nkzw/create-context-hook so consumers throw a clear error when used
 * outside their Provider instead of failing on undefined destructuring.
 */
export function createSafeContextHook<T>(
  initializer: ContextInitializer<T>,
  hookName: string,
  providerName: string
): [SafeContextProvider, () => T] {
  const [Provider, useContextValue] = createContextHook(initializer);

  function useSafeContext(): T {
    const value = useContextValue();
    if (value == null) {
      throw new Error(`${hookName} must be used within ${providerName}`);
    }
    return value;
  }

  return [Provider, useSafeContext];
}
