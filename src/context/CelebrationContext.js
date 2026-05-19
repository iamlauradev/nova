import React, { createContext, useContext, useState, useCallback } from 'react';

const CelebrationContext = createContext(null);

export function CelebrationProvider({ children }) {
  const [celebration, setCelebration] = useState(null);
  // celebration: { message, subtext } | null

  const celebrate = useCallback((message, subtext = '') => {
    setCelebration({ message, subtext });
  }, []);

  const dismiss = useCallback(() => {
    setCelebration(null);
  }, []);

  return (
    <CelebrationContext.Provider value={{ celebration, celebrate, dismiss }}>
      {children}
    </CelebrationContext.Provider>
  );
}

export const useCelebration = () => useContext(CelebrationContext);
