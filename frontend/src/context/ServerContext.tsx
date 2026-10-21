import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { ServerItem } from '../types';
import { serversApi } from '../services/api';
import { useAuth } from './AuthContext';

interface ServerContextType {
  servers: ServerItem[];
  activeServerId: number | 'all';
  activeServer: ServerItem | null;
  isLoading: boolean;
  setActiveServerId: (id: number | 'all') => void;
  refreshServers: () => Promise<void>;
}

const ServerContext = createContext<ServerContextType | undefined>(undefined);

const STORAGE_KEY = 'vps_multivus_active_server';

export const ServerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [servers, setServers] = useState<ServerItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize activeServerId from localStorage or default to 1
  const [activeServerId, setActiveServerIdState] = useState<number | 'all'>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'all') return 'all';
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed)) return parsed;
    }
    return 1; // Default to host server 1
  });

  const setActiveServerId = useCallback((id: number | 'all') => {
    setActiveServerIdState(id);
    localStorage.setItem(STORAGE_KEY, String(id));
  }, []);

  const refreshServers = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const list = await serversApi.list();
      setServers(list);

      // Verify if activeServerId still exists
      if (activeServerId !== 'all') {
        const exists = list.some(s => s.id === activeServerId);
        if (!exists && list.length > 0) {
          const defaultServer = list.find(s => s.is_default) || list[0];
          setActiveServerId(defaultServer.id);
        }
      }
    } catch (e) {
      console.error('Falha ao carregar servidores:', e);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, activeServerId, setActiveServerId]);

  useEffect(() => {
    if (isAuthenticated) {
      refreshServers();
      const interval = setInterval(refreshServers, 30000);
      return () => clearInterval(interval);
    } else {
      setServers([]);
      setIsLoading(false);
    }
  }, [isAuthenticated, refreshServers]);

  const activeServer = useMemo(() => {
    if (activeServerId === 'all') return null;
    return servers.find(s => s.id === activeServerId) || null;
  }, [servers, activeServerId]);

  return (
    <ServerContext.Provider
      value={{
        servers,
        activeServerId,
        activeServer,
        isLoading,
        setActiveServerId,
        refreshServers
      }}
    >
      {children}
    </ServerContext.Provider>
  );
};

export const useServer = () => {
  const context = useContext(ServerContext);
  if (!context) {
    throw new Error('useServer must be used within a ServerProvider');
  }
  return context;
};
