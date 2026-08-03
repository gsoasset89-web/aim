'use client';

import { useMemo } from 'react';

/**
 * Custom hook to stabilize Firebase references (CollectionReference, DocumentReference)
 * and Queries. It ensures that the reference/query object is only re-created
 * when its dependencies change, preventing unnecessary re-renders or infinite loops
 * in hooks like useCollection and useDoc.
 *
 * @param factory A function that returns the Firebase reference or query.
 * @param deps Dependency array for memoization.
 * @returns The memoized Firebase reference or query.
 */
export function useMemoFirebase<T>(factory: () => T, deps: React.DependencyList): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(factory, deps);
}