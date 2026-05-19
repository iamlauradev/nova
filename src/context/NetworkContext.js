import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';

const NetworkContext = createContext({ isOnline: true });

export function NetworkProvider({ children }) {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsub = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected !== false && state.isInternetReachable !== false);
    });
    // Check immediately
    NetInfo.fetch().then(state => {
      setIsOnline(state.isConnected !== false && state.isInternetReachable !== false);
    });
    return unsub;
  }, []);

  return (
    <NetworkContext.Provider value={{ isOnline }}>
      {children}
    </NetworkContext.Provider>
  );
}

export const useNetwork = () => useContext(NetworkContext);
