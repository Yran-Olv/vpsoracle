import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { SystemMetrics } from '../types';
import { metricsApi } from '../services/api';
import { useAuth } from './AuthContext';
import { useServer } from './ServerContext';

interface MetricsContextType {
  metrics: SystemMetrics | null;
  isLoading: boolean;
  isLive: boolean;
  secondsAgo: number;
  refreshMetrics: () => Promise<void>;
}

const MetricsContext = createContext<MetricsContextType | undefined>(undefined);

export const MetricsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const { activeServerId } = useServer();
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLive, setIsLive] = useState<boolean>(false);
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());
  const [secondsAgo, setSecondsAgo] = useState<number>(0);

  const fetchMetrics = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await metricsApi.getRealtime(activeServerId);
      setMetrics(data);
      setLastUpdate(Date.now());
      setIsLoading(false);
    } catch (e) {
      setIsLoading(false);
    }
  }, [isAuthenticated, activeServerId]);

  // Seconds counter
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastUpdate) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [lastUpdate]);

  // Real-time SSE Connection with polling fallback, keyed to activeServerId
  useEffect(() => {
    if (!isAuthenticated) {
      setMetrics(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    fetchMetrics();

    let eventSource: EventSource | null = null;
    let fallbackInterval: NodeJS.Timeout | null = null;

    try {
      const token = localStorage.getItem('vps_multivus_token') || localStorage.getItem('token');
      const params = new URLSearchParams();
      if (token) params.set('token', token);
      if (activeServerId !== undefined) params.set('serverId', String(activeServerId));

      const sseUrl = `/events?${params.toString()}`;
      eventSource = new EventSource(sseUrl);

      eventSource.onopen = () => {
        setIsLive(true);
      };

      eventSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.type === 'metrics' && parsed.data) {
            setMetrics(parsed.data);
            setLastUpdate(Date.now());
            setIsLoading(false);
          }
        } catch (e) {}
      };

      eventSource.onerror = () => {
        setIsLive(false);
        if (eventSource) eventSource.close();
        // Start polling fallback
        fallbackInterval = setInterval(fetchMetrics, 5000);
      };
    } catch (e) {
      setIsLive(false);
      fallbackInterval = setInterval(fetchMetrics, 5000);
    }

    return () => {
      if (eventSource) eventSource.close();
      if (fallbackInterval) clearInterval(fallbackInterval);
    };
  }, [isAuthenticated, activeServerId, fetchMetrics]);

  return (
    <MetricsContext.Provider value={{ metrics, isLoading, isLive, secondsAgo, refreshMetrics: fetchMetrics }}>
      {children}
    </MetricsContext.Provider>
  );
};

export const useMetrics = () => {
  const context = useContext(MetricsContext);
  if (!context) throw new Error('useMetrics must be used within a MetricsProvider');
  return context;
};
