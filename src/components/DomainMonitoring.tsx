import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useDomainMonitoring } from '@/hooks/use-domain-monitoring';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Shield, 
  Activity,
  RefreshCw,
  Bell
} from 'lucide-react';

interface DomainMonitoringProps {
  className?: string;
}

export function DomainMonitoring({ className }: DomainMonitoringProps) {
  const {
    isMonitoring,
    alerts,
    domains,
    criticalAlertsCount,
    alertsLoading,
    domainsLoading,
    isResolvingAlert,
    isPerformingHealthCheck,
    resolveAlert,
    performHealthCheck,
    getAlertsBySeverity,
  } = useDomainMonitoring();

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'medium':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'low':
        return <AlertTriangle className="h-4 w-4 text-blue-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'destructive';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const formatLastChecked = (timestamp: string | null) => {
    if (!timestamp) return 'Never';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  if (alertsLoading || domainsLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Domain Monitoring
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      {/* Monitoring Status */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Domain Monitoring
            {isMonitoring ? (
              <Badge variant="outline" className="ml-auto">
                <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
                Active
              </Badge>
            ) : (
              <Badge variant="secondary" className="ml-auto">
                <XCircle className="h-3 w-3 mr-1 text-red-500" />
                Inactive
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Continuous monitoring of domain accessibility and SSL certificates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{domains.length}</div>
              <div className="text-sm text-muted-foreground">Monitored Domains</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{criticalAlertsCount}</div>
              <div className="text-sm text-muted-foreground">Critical Alerts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{alerts.length}</div>
              <div className="text-sm text-muted-foreground">Total Alerts</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Active Alerts
            </CardTitle>
            <CardDescription>
              Domain issues requiring attention
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {alerts.map((alert) => (
              <Alert key={alert.id} className="relative">
                <div className="flex items-start gap-3">
                  {getSeverityIcon(alert.severity)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={getSeverityColor(alert.severity) as any}>
                        {alert.severity.toUpperCase()}
                      </Badge>
                      <span className="text-sm font-medium">{alert.domain}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatLastChecked(alert.createdAt.toString())}
                      </span>
                    </div>
                    <AlertDescription className="text-sm">
                      {alert.message}
                    </AlertDescription>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => resolveAlert(alert.id)}
                    disabled={isResolvingAlert}
                  >
                    Resolve
                  </Button>
                </div>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Domain Health Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Domain Health Status
          </CardTitle>
          <CardDescription>
            Current status of all monitored domains
          </CardDescription>
        </CardHeader>
        <CardContent>
          {domains.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No domains configured for monitoring
            </div>
          ) : (
            <div className="space-y-4">
              {domains.map((domain) => (
                <div key={domain.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium">{domain.domain}</h4>
                      {domain.is_accessible ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Status:</span>
                        <div className="font-medium">
                          {domain.is_accessible ? 'Accessible' : 'Inaccessible'}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">SSL:</span>
                        <div className="font-medium">
                          {domain.ssl_valid ? 'Valid' : 'Invalid'}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Response:</span>
                        <div className="font-medium">
                          {domain.response_time_ms ? `${domain.response_time_ms}ms` : 'N/A'}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Last Check:</span>
                        <div className="font-medium">
                          {formatLastChecked(domain.last_health_check)}
                        </div>
                      </div>
                    </div>
                    {domain.ssl_expires_at && (
                      <div className="mt-2 text-sm">
                        <span className="text-muted-foreground">SSL Expires:</span>
                        <span className="ml-1 font-medium">
                          {new Date(domain.ssl_expires_at).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {domain.last_error && (
                      <div className="mt-2 text-sm text-red-600">
                        <span className="font-medium">Error:</span> {domain.last_error}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => performHealthCheck(domain.domain)}
                      disabled={isPerformingHealthCheck}
                    >
                      <RefreshCw className={`h-4 w-4 ${isPerformingHealthCheck ? 'animate-spin' : ''}`} />
                      Check Now
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}