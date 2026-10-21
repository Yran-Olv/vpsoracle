import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { SystemMetrics } from '../types';
import { metricsApi } from '../services/api';
import { useAuth } from './AuthContext';

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
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLive, setIsLive] = useState<boolean>(false);
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());
  const [secondsAgo, setSecondsAgo] = useState<number>(0);

  const fetchMetrics = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await metricsApi.getRealtime();
      setMetrics(data);
      setLastUpdate(Date.now());
      setIsLoading(false);
    } catch (e) {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Seconds counter
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastUpdate) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [lastUpdate]);

  // Real-time SSE Connection with polling fallback
  useEffect(() => {
    if (!isAuthenticated) {
      setMetrics(null);
      setIsLoading(false);
      return;
    }

    fetchMetrics();

    let eventSource: EventSource | null = null;
    let fallbackInterval: NodeJS.Timeout | null = null;

    try {
      eventSource = new EventSource('/events');
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
  }, [isAuthenticated, fetchMetrics]);

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
