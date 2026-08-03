
'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect, useMemo } from 'react';

type SheetType = 'ics' | 'par' | 'inactive_ics' | 'inactive_par';

interface NotificationState {
  totalCounts: Record<SheetType, number>;
  lastSeenCounts: Record<SheetType, number>;
}

interface NotificationContextType {
  counts: Record<SheetType, number>;
  setItemCount: (sheetType: SheetType, count: number) => void;
  markAsSeen: (sheetType: SheetType) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<NotificationState>(() => {
    // Initialize state from localStorage if available
    try {
      if (typeof window !== 'undefined') {
        const storedState = localStorage.getItem('notificationState');
        if (storedState) {
          return JSON.parse(storedState);
        }
      }
    } catch (error) {
      console.error('Could not parse notification state from localStorage', error);
    }
    return {
      totalCounts: { ics: 0, par: 0, inactive_ics: 0, inactive_par: 0 },
      lastSeenCounts: { ics: 0, par: 0, inactive_ics: 0, inactive_par: 0 },
    };
  });

  // Persist state to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('notificationState', JSON.stringify(state));
    } catch (error) {
      console.error('Could not save notification state to localStorage', error);
    }
  }, [state]);

  const setItemCount = useCallback((sheetType: SheetType, count: number) => {
    setState(prevState => {
      // Stability check: only update if the count has actually changed
      if (prevState.totalCounts[sheetType] === count) return prevState;
      return {
        ...prevState,
        totalCounts: {
          ...prevState.totalCounts,
          [sheetType]: count,
        },
      };
    });
  }, []);

  const markAsSeen = useCallback((sheetType: SheetType) => {
    setState(prevState => {
      // Stability check: only update if the last seen count needs to change
      if (prevState.lastSeenCounts[sheetType] === prevState.totalCounts[sheetType]) return prevState;
      return {
        ...prevState,
        lastSeenCounts: {
          ...prevState.lastSeenCounts,
          [sheetType]: prevState.totalCounts[sheetType],
        },
      };
    });
  }, []);

  // Memoize the notification counts to prevent unnecessary re-renders of consuming components
  const notificationCounts = useMemo(() => ({
    ics: Math.max(0, state.totalCounts.ics - state.lastSeenCounts.ics),
    par: Math.max(0, state.totalCounts.par - state.lastSeenCounts.par),
    inactive_ics: Math.max(0, state.totalCounts.inactive_ics - state.lastSeenCounts.inactive_ics),
    inactive_par: Math.max(0, state.totalCounts.inactive_par - state.lastSeenCounts.inactive_par),
  }), [state.totalCounts, state.lastSeenCounts]);

  return (
    <NotificationContext.Provider value={{ counts: notificationCounts, setItemCount, markAsSeen }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
