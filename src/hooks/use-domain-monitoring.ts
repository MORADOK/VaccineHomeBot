import { useEffect, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { domainMonitoringService, DomainHealthCheck, DomainAlert } from '@/lib/domain-monitoring-service';
import { supabase } from '@/integrations/supabase/client';

export interface DomainMonitoringState {
  isMonitoring: boolean;
  alerts: DomainAlert[];
  healthChecks: Record<string, DomainHealthCheck>;
}

export function useDomainMonitoring() {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const queryClient = useQueryClient();

  // Query for active alerts
  const {
    data: alerts = [],
    isLoading: alertsLoading,
    error: alertsError,
  } = useQuery({
    queryKey: ['domain-alerts'],
    queryFn: () => domainMonitoringService.getActiveAlerts(),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Query for domain health status
  const {
    data: domains = [],
    isLoading: domainsLoading,
  } = useQuery({
    queryKey: ['domain-configurations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('domain_configurations')
        .select('*')
        .eq('status', 'enabled');
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 60000, // Refetch every minute
  });

  // Mutation to resolve alerts
  const resolveAlertMutation = useMutation({
    mutationFn: (alertId: string) => domainMonitoringService.resolveAlert(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domain-alerts'] });
    },
  });

  // Mutation to perform manual health check
  const performHealthCheckMutation = useMutation({
    mutationFn: (domain: string) => domainMonitoringService.checkDomainHealth(domain),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domain-configurations'] });
      queryClient.invalidateQueries({ queryKey: ['domain-alerts'] });
    },
  });

  // Start monitoring service
  const startMonitoring = useCallback(() => {
    domainMonitoringService.startMonitoring();
    setIsMonitoring(true);
  }, []);

  // Stop monitoring service
  const stopMonitoring = useCallback(() => {
    domainMonitoringService.stopMonitoring();
    setIsMonitoring(false);
  }, []);

  // Resolve an alert
  const resolveAlert = useCallback((alertId: string) => {
    resolveAlertMutation.mutate(alertId);
  }, [resolveAlertMutation]);

  // Perform manual health check
  const performHealthCheck = useCallback((domain: string) => {
    performHealthCheckMutation.mutate(domain);
  }, [performHealthCheckMutation]);

  // Get alerts by severity
  const getAlertsBySeverity = useCallback((severity: 'low' | 'medium' | 'high' | 'critical') => {
    return alerts.filter(alert => alert.severity === severity);
  }, [alerts]);

  // Get critical alerts count
  const criticalAlertsCount = alerts.filter(alert => alert.severity === 'critical').length;

  // Auto-start monitoring when component mounts
  useEffect(() => {
    startMonitoring();
    
    return () => {
      stopMonitoring();
    };
  }, [startMonitoring, stopMonitoring]);

  // Set up real-time subscriptions for alerts
  useEffect(() => {
    const alertsSubscription = supabase
      .channel('domain_alerts_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'domain_alerts',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['domain-alerts'] });
        }
      )
      .subscribe();

    const domainsSubscription = supabase
      .channel('domain_configurations_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'domain_configurations',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['domain-configurations'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(alertsSubscription);
      supabase.removeChannel(domainsSubscription);
    };
  }, [queryClient]);

  return {
    // State
    isMonitoring,
    alerts,
    domains,
    criticalAlertsCount,
    
    // Loading states
    alertsLoading,
    domainsLoading,
    isResolvingAlert: resolveAlertMutation.isPending,
    isPerformingHealthCheck: performHealthCheckMutation.isPending,
    
    // Error states
    alertsError,
    resolveAlertError: resolveAlertMutation.error,
    healthCheckError: performHealthCheckMutation.error,
    
    // Actions
    startMonitoring,
    stopMonitoring,
    resolveAlert,
    performHealthCheck,
    getAlertsBySeverity,
  };
}