import { useState, useCallback } from 'react';

interface UseLoadingStateReturn {
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
  startLoading: () => void;
  stopLoading: () => void;
  withLoading: <T>(asyncFn: () => Promise<T>) => Promise<T>;
}

/**
 * Custom hook for managing loading states
 * Provides utilities for common loading patterns
 */
export function useLoadingState(initialState = false): UseLoadingStateReturn {
  const [isLoading, setIsLoading] = useState(initialState);

  const setLoading = useCallback((loading: boolean) => {
    setIsLoading(loading);
  }, []);

  const startLoading = useCallback(() => {
    setIsLoading(true);
  }, []);

  const stopLoading = useCallback(() => {
    setIsLoading(false);
  }, []);

  const withLoading = useCallback(async <T>(asyncFn: () => Promise<T>): Promise<T> => {
    setIsLoading(true);
    try {
      const result = await asyncFn();
      return result;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    setLoading,
    startLoading,
    stopLoading,
    withLoading
  };
}

/**
 * Hook for managing multiple loading states
 * Useful when you have different loading states for different operations
 */
export function useMultipleLoadingStates<T extends string>(
  keys: readonly T[]
): Record<T, boolean> & {
  setLoading: (key: T, loading: boolean) => void;
  startLoading: (key: T) => void;
  stopLoading: (key: T) => void;
  withLoading: <R>(key: T, asyncFn: () => Promise<R>) => Promise<R>;
  isAnyLoading: boolean;
} {
  const [loadingStates, setLoadingStates] = useState<Record<T, boolean>>(
    keys.reduce((acc, key) => ({ ...acc, [key]: false }), {} as Record<T, boolean>)
  );

  const setLoading = useCallback((key: T, loading: boolean) => {
    setLoadingStates(prev => ({ ...prev, [key]: loading }));
  }, []);

  const startLoading = useCallback((key: T) => {
    setLoading(key, true);
  }, [setLoading]);

  const stopLoading = useCallback((key: T) => {
    setLoading(key, false);
  }, [setLoading]);

  const withLoading = useCallback(async <R>(key: T, asyncFn: () => Promise<R>): Promise<R> => {
    setLoading(key, true);
    try {
      const result = await asyncFn();
      return result;
    } finally {
      setLoading(key, false);
    }
  }, [setLoading]);

  const isAnyLoading = Object.values(loadingStates).some(Boolean);

  return {
    ...loadingStates,
    setLoading,
    startLoading,
    stopLoading,
    withLoading,
    isAnyLoading
  };
}

/**
 * Hook for managing async operations with loading, error, and success states
 */
export function useAsyncOperation<T = unknown, E = Error>() {
  const [state, setState] = useState<{
    isLoading: boolean;
    data: T | null;
    error: E | null;
    isSuccess: boolean;
  }>({
    isLoading: false,
    data: null,
    error: null,
    isSuccess: false
  });

  const execute = useCallback(async (asyncFn: () => Promise<T>) => {
    setState({
      isLoading: true,
      data: null,
      error: null,
      isSuccess: false
    });

    try {
      const result = await asyncFn();
      setState({
        isLoading: false,
        data: result,
        error: null,
        isSuccess: true
      });
      return result;
    } catch (error) {
      setState({
        isLoading: false,
        data: null,
        error: error as E,
        isSuccess: false
      });
      throw error;
    }
  }, []);

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      data: null,
      error: null,
      isSuccess: false
    });
  }, []);

  return {
    ...state,
    execute,
    reset
  };
}

/**
 * Hook for debounced loading states
 * Useful for search inputs or rapid state changes
 */
export function useDebouncedLoading(delay = 300) {
  const [isLoading, setIsLoading] = useState(false);
  const [, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const startLoading = useCallback(() => {
    setTimeoutId(prevTimeoutId => {
      if (prevTimeoutId) {
        clearTimeout(prevTimeoutId);
      }
      return null;
    });
    setIsLoading(true);
  }, []);

  const stopLoading = useCallback(() => {
    setTimeoutId(prevTimeoutId => {
      if (prevTimeoutId) {
        clearTimeout(prevTimeoutId);
      }
      const newTimeoutId = setTimeout(() => {
        setIsLoading(false);
      }, delay);
      return newTimeoutId;
    });
  }, [delay]);

  const immediateStop = useCallback(() => {
    setTimeoutId(prevTimeoutId => {
      if (prevTimeoutId) {
        clearTimeout(prevTimeoutId);
      }
      return null;
    });
    setIsLoading(false);
  }, []);

  return {
    isLoading,
    startLoading,
    stopLoading,
    immediateStop
  };
}