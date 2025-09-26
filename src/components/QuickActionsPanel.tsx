import React, { useState } from 'react';
import { 
  Download, 
  Upload, 
  RefreshCw, 
  Search, 
  Filter, 
  Settings, 
  BarChart3, 
  Calendar, 
  Share2,
  Save,
  AlertTriangle,
  CheckCircle,
  Zap,
  Target,
  TrendingUp,
  Users,
  Clock,
  MapPin,
  FileText,
  ExternalLink
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface QuickActionsPanelProps {
  onExport?: (format: string) => void;
  onRefresh?: () => void;
  onAnalytics?: () => void;
  hasData?: boolean;
  dataQuality?: number;
  lastUpdated?: Date;
}

export function QuickActionsPanel({ 
  onExport, 
  onRefresh, 
  onAnalytics, 
  hasData = false,
  dataQuality = 85,
  lastUpdated 
}: QuickActionsPanelProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [selectedExportFormat, setSelectedExportFormat] = useState<string | null>(null);

  const handleExport = async (format: string) => {
    setIsExporting(true);
    setSelectedExportFormat(format);
    
    // Simulate export process
    setTimeout(() => {
      onExport?.(format);
      setIsExporting(false);
      setSelectedExportFormat(null);
    }, 2000);
  };

  const quickActions = [
    {
      id: 'refresh',
      label: 'Refresh Data',
      icon: RefreshCw,
      action: onRefresh,
      variant: 'secondary' as const,
      shortcut: '⌘R',
      description: 'Reload and validate all data'
    },
    {
      id: 'search',
      label: 'Smart Search',
      icon: Search,
      action: () => {},
      variant: 'secondary' as const,
      shortcut: '⌘K',
      description: 'Global search with autocomplete'
    },
    {
      id: 'analytics',
      label: 'AI Insights',
      icon: BarChart3,
      action: onAnalytics,
      variant: 'accent' as const,
      shortcut: '⌘I',
      description: 'Generate intelligent reports'
    },
    {
      id: 'conflicts',
      label: 'Find Conflicts',
      icon: AlertTriangle,
      action: () => {},
      variant: 'warning' as const,
      shortcut: '⌘F',
      description: 'Detect scheduling conflicts'
    }
  ];

  const exportOptions = [
    { format: 'excel', label: 'Excel (.xlsx)', icon: FileText, color: 'text-green-700' },
    { format: 'pdf', label: 'PDF Report', icon: FileText, color: 'text-red-700' },
    { format: 'calendar', label: 'iCal (.ics)', icon: Calendar, color: 'text-blue-700' },
    { format: 'json', label: 'JSON Data', icon: FileText, color: 'text-purple-700' }
  ];

  const getQualityColor = (quality: number) => {
    if (quality >= 90) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (quality >= 75) return 'text-yellow-700 bg-yellow-50 border-yellow-200';
    return 'text-red-700 bg-red-50 border-red-200';
  };

  const getQualityIcon = (quality: number) => {
    if (quality >= 90) return CheckCircle;
    if (quality >= 75) return AlertTriangle;
    return AlertTriangle;
  };

  return (
    <div className="space-y-6">
      {/* Data Status Panel */}
      <Card className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg gradient-primary">
              <Target className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gradient-primary">Data Status</h3>
              <p className="text-sm text-gray-600">Real-time data quality monitoring</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getQualityColor(dataQuality)}`}>
              {React.createElement(getQualityIcon(dataQuality), { className: "w-3 h-3 inline mr-1" })}
              {dataQuality}% Quality
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 gradient-success-light rounded-xl">
            <Users className="h-6 w-6 mx-auto mb-2 text-emerald-700" />
            <div className="text-sm font-medium text-emerald-700">Data Loaded</div>
            <div className="text-xs text-emerald-600">{hasData ? 'Yes' : 'No'}</div>
          </div>
          <div className="text-center p-3 gradient-accent-light rounded-xl">
            <Clock className="h-6 w-6 mx-auto mb-2 text-indigo-700" />
            <div className="text-sm font-medium text-indigo-700">Last Update</div>
            <div className="text-xs text-indigo-600">
              {lastUpdated ? lastUpdated.toLocaleTimeString() : 'Never'}
            </div>
          </div>
          <div className="text-center p-3 gradient-primary-light rounded-xl">
            <TrendingUp className="h-6 w-6 mx-auto mb-2 text-gray-700" />
            <div className="text-sm font-medium text-gray-700">Processing</div>
            <div className="text-xs text-gray-600">Real-time</div>
          </div>
          <div className="text-center p-3 gradient-success-light rounded-xl">
            <Zap className="h-6 w-6 mx-auto mb-2 text-emerald-700" />
            <div className="text-sm font-medium text-emerald-700">Performance</div>
            <div className="text-xs text-emerald-600">Optimal</div>
          </div>
        </div>
      </Card>

      {/* Quick Actions */}
      <Card className="glass-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg gradient-accent">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gradient-secondary">Quick Actions</h3>
            <p className="text-sm text-gray-600">Streamlined workflow commands</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {quickActions.map((action) => (
            <Button
              key={action.id}
              onClick={action.action}
              className={`
                h-auto p-4 justify-start text-left hover:scale-105 transition-all duration-300
                ${action.variant === 'accent' ? 'btn-accent' : 
                  action.variant === 'warning' ? 'gradient-warning' : 'btn-secondary'}
              `}
              disabled={!hasData && action.id !== 'refresh'}
            >
              <div className="flex items-center gap-3 w-full">
                <action.icon className="h-5 w-5" />
                <div className="flex-1">
                  <div className="font-semibold">{action.label}</div>
                  <div className={`text-xs ${action.variant === 'secondary' ? 'text-gray-600' : 'text-white/80'}`}>
                    {action.description}
                  </div>
                </div>
                <div className={`text-xs px-2 py-1 rounded ${
                  action.variant === 'secondary' ? 'bg-gray-100 text-gray-600' : 'bg-white/20 text-white'
                }`}>
                  {action.shortcut}
                </div>
              </div>
            </Button>
          ))}
        </div>
      </Card>

      {/* Export Options */}
      <Card className="glass-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg gradient-info">
            <Download className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gradient-accent">Export Data</h3>
            <p className="text-sm text-gray-600">Download in multiple formats</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {exportOptions.map((option) => (
            <Button
              key={option.format}
              onClick={() => handleExport(option.format)}
              disabled={!hasData || isExporting}
              className="h-auto p-4 justify-start text-left btn-secondary hover:scale-105 transition-all duration-300"
            >
              <div className="flex items-center gap-3 w-full">
                <option.icon className={`h-5 w-5 ${option.color}`} />
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">{option.label}</div>
                </div>
                {isExporting && selectedExportFormat === option.format && (
                  <RefreshCw className="h-4 w-4 animate-spin text-gray-600" />
                )}
                {!isExporting && (
                  <ExternalLink className="h-4 w-4 text-gray-400" />
                )}
              </div>
            </Button>
          ))}
        </div>

        {!hasData && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-2 text-amber-700">
              <Upload className="h-4 w-4" />
              <span className="text-sm font-medium">Upload schedule data to enable export options</span>
            </div>
          </div>
        )}
      </Card>

      {/* Smart Features Preview */}
      <Card className="glass-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg gradient-secondary">
            <Settings className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gradient-primary">Smart Features</h3>
            <p className="text-sm text-gray-600">AI-powered schedule optimization</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 gradient-primary-light rounded-lg">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-gray-700" />
              <div>
                <div className="font-medium text-gray-900">Conflict Detection</div>
                <div className="text-xs text-gray-600">Real-time scheduling conflict alerts</div>
              </div>
            </div>
            <div className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-xs font-medium">
              Coming Soon
            </div>
          </div>

          <div className="flex items-center justify-between p-3 gradient-accent-light rounded-lg">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-indigo-700" />
              <div>
                <div className="font-medium text-indigo-900">Predictive Analytics</div>
                <div className="text-xs text-indigo-600">Capacity planning and optimization</div>
              </div>
            </div>
            <div className="px-3 py-1 bg-indigo-200 text-indigo-700 rounded-full text-xs font-medium">
              Beta
            </div>
          </div>

          <div className="flex items-center justify-between p-3 gradient-success-light rounded-lg">
            <div className="flex items-center gap-3">
              <Share2 className="h-5 w-5 text-emerald-700" />
              <div>
                <div className="font-medium text-emerald-900">Collaboration Tools</div>
                <div className="text-xs text-emerald-600">Share schedules and track changes</div>
              </div>
            </div>
            <div className="px-3 py-1 bg-emerald-200 text-emerald-700 rounded-full text-xs font-medium">
              Preview
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}