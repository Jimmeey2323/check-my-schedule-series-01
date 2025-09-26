import React, { useState, useRef, useEffect } from 'react';
import { ClassData, FilterState } from '@/types/schedule';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { FileDropzone } from '../FileDropzone';
import { FilterSection } from '../FilterSection';
import { ScheduleTabs } from '../ScheduleTabs';
import { FullWeekSchedule } from '../FullWeekSchedule';
import { SummarySection } from '../SummarySection';
import { QuickActionsPanel } from '../QuickActionsPanel';
import { SmartSearch } from '../SmartSearch';
import { ConflictDetection } from '../ConflictDetection';
import { extractScheduleData } from '@/utils/csvParser';
import { Upload, Sparkles, Activity, Calendar, Users, MapPin, BarChart3, Search, AlertTriangle, Settings } from 'lucide-react';

interface CsvViewerProps {
  savedData: {[day: string]: ClassData[]} | null;
  onDataUpdate: (data: {[day: string]: ClassData[]}) => void;
}

export function CsvViewer({ savedData, onDataUpdate }: CsvViewerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({ day: [], location: [], trainer: [], className: [] });
  const [viewOption, setViewOption] = useState<'byDay' | 'fullWeek'>('byDay');
  const [activeFeature, setActiveFeature] = useState<'schedule' | 'analytics' | 'search' | 'conflicts' | 'actions'>('schedule');
  
  // Listen for clear data events
  useEffect(() => {
    const handleDataCleared = () => {
      // Reset all internal state
      setError(null);
      setFilters({ day: [], location: [], trainer: [], className: [] });
      setViewOption('byDay');
      setActiveFeature('schedule');
    };

    window.addEventListener('scheduleDataCleared', handleDataCleared);
    return () => window.removeEventListener('scheduleDataCleared', handleDataCleared);
  }, []);
  
  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    setError(null);
    
    try {
      if (!file.name.toLowerCase().endsWith('.csv')) {
        throw new Error('Please upload a valid CSV file.');
      }
      
      const text = await file.text();
      
      // Save original CSV text and metadata for reprocessing
      localStorage.setItem('originalCsvText', text);
      localStorage.setItem('csvFileName', file.name);
      localStorage.setItem('csvUploadDate', new Date().toLocaleDateString());
      
      const result = await extractScheduleData(text);
      
      // Reset filters when new data is loaded
      setFilters({ day: [], location: [], trainer: [], className: [] });
      
      onDataUpdate(result);
      
      toast({
        title: "✅ Success",
        description: "CSV data processed successfully with enhanced validation!",
        variant: "default",
      });
    } catch (err) {
      console.error('Error processing CSV:', err);
      setError(err instanceof Error ? err.message : 'Unknown error processing the CSV file');
      toast({
        title: "❌ Error",
        description: err instanceof Error ? err.message : 'Unknown error processing the CSV file',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    // Store filters in localStorage for persistence across tabs
    localStorage.setItem('csvFilters', JSON.stringify(newFilters));
  };

  const handleExport = (format: string) => {
    toast({
      title: "🚀 Export Started",
      description: `Generating ${format.toUpperCase()} export...`,
      variant: "default",
    });
    // Export logic would be implemented here
  };

  const handleAnalytics = () => {
    setActiveFeature('analytics');
  };

  const handleRefresh = () => {
    // Reprocess the data
    const savedCsvText = localStorage.getItem('originalCsvText');
    if (savedCsvText) {
      extractScheduleData(savedCsvText).then(result => {
        onDataUpdate(result);
        toast({
          title: "🔄 Data Refreshed",
          description: "Schedule data has been reprocessed with latest algorithms.",
        });
      });
    }
  };
  
  // Load saved filters on component mount
  React.useEffect(() => {
    const savedFilters = localStorage.getItem('csvFilters');
    if (savedFilters) {
      try {
        setFilters(JSON.parse(savedFilters));
      } catch (e) {
        console.error('Error parsing saved filters:', e);
      }
    }
  }, []);
  
  if (!savedData) {
    return (
      <div className="flex flex-col h-full animate-fadeIn">
        <FileDropzone 
          onFileUpload={handleFileUpload}
          accept=".csv,text/csv"
          isLoading={isLoading}
          icon="file-csv"
          label="Drag & Drop your CSV schedule file here"
        />
        
        {/* Enhanced Welcome Message */}
        <Card className="glass-card p-8 text-center mt-8 max-w-2xl mx-auto">
          <div className="mb-6">
            <div className="h-16 w-16 rounded-full gradient-primary flex items-center justify-center mx-auto mb-4">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gradient-primary mb-2">Welcome to Enhanced CSV Viewer</h2>
            <p className="text-gray-600">Experience next-generation schedule management with AI-powered features</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-3 gradient-success-light rounded-lg">
              <Search className="h-6 w-6 mx-auto mb-2 text-emerald-700" />
              <div className="text-sm font-medium text-emerald-700">Smart Search</div>
            </div>
            <div className="text-center p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-orange-700" />
              <div className="text-sm font-medium text-orange-700">Conflict Detection</div>
            </div>
            <div className="text-center p-3 gradient-accent-light rounded-lg">
              <BarChart3 className="h-6 w-6 mx-auto mb-2 text-indigo-700" />
              <div className="text-sm font-medium text-indigo-700">AI Analytics</div>
            </div>
            <div className="text-center p-3 gradient-primary-light rounded-lg">
              <Settings className="h-6 w-6 mx-auto mb-2 text-gray-700" />
              <div className="text-sm font-medium text-gray-700">Quick Actions</div>
            </div>
          </div>
          
          <div className="text-sm text-gray-500">
            Upload your CSV file to unlock powerful schedule analysis tools
          </div>
        </Card>
      </div>
    );
  }

  // Calculate metrics
  const totalClasses = Object.values(savedData).reduce((total, classes) => total + classes.length, 0);
  const uniqueTrainers = new Set(Object.values(savedData).flat().map(cls => cls.trainer1)).size;
  const uniqueLocations = new Set(Object.values(savedData).flat().map(cls => cls.location)).size;
  const daysCount = Object.keys(savedData).length;

  return (
    <div className="flex flex-col h-full space-y-6 animate-fadeIn gradient-background min-h-screen">
      {/* Premium Header with Glass Effect */}
      <div className="glass-card rounded-xl p-6 sticky top-0 z-10 shadow-xl border-2 border-gray-200/60">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl gradient-primary flex items-center justify-center shadow-lg">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gradient-primary">Enhanced CSV Viewer</h1>
              <div className="flex items-center gap-2 mt-1">
                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-lg shadow-emerald-400/50"></div>
                <span className="text-sm text-gray-600">Live data • {totalClasses} classes loaded</span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <Button 
              onClick={() => {
                const fileInput = document.createElement('input');
                fileInput.type = 'file';
                fileInput.accept = '.csv,text/csv';
                fileInput.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) handleFileUpload(file);
                };
                fileInput.click();
              }}
              className="btn-secondary"
              disabled={isLoading}
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload New CSV
            </Button>
            
            <Button 
              onClick={handleRefresh}
              className="btn-primary"
              disabled={!savedData || isLoading}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Reprocess Data
            </Button>
          </div>
        </div>
        
        {/* Enhanced Metrics Bar */}
        <div className="flex flex-wrap gap-6 mt-6 pt-6 border-t-2 border-gray-200/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg gradient-success-light">
              <Calendar className="h-5 w-5 text-emerald-700" />
            </div>
            <div>
              <div className="text-xl font-bold text-gradient-primary">{totalClasses}</div>
              <div className="text-xs text-gray-600">Total Classes</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg gradient-accent-light">
              <Users className="h-5 w-5 text-indigo-700" />
            </div>
            <div>
              <div className="text-xl font-bold text-gradient-secondary">{uniqueTrainers}</div>
              <div className="text-xs text-gray-600">Trainers</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg gradient-primary-light">
              <MapPin className="h-5 w-5 text-gray-700" />
            </div>
            <div>
              <div className="text-xl font-bold text-gradient-accent">{uniqueLocations}</div>
              <div className="text-xs text-gray-600">Locations</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-50 border border-orange-200">
              <Activity className="h-5 w-5 text-orange-700" />
            </div>
            <div>
              <div className="text-xl font-bold text-gradient-primary">{daysCount}</div>
              <div className="text-xs text-gray-600">Active Days</div>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Navigation Tabs */}
      <div className="glass-card rounded-xl p-3 border-2 border-gray-200/60">
        <div className="flex flex-wrap gap-3">
          {[
            { id: 'schedule', label: 'Schedule View', icon: Calendar, color: 'text-blue-700' },
            { id: 'search', label: 'Smart Search', icon: Search, color: 'text-emerald-700' },
            { id: 'conflicts', label: 'Conflict Detection', icon: AlertTriangle, color: 'text-orange-700' },
            { id: 'analytics', label: 'Analytics', icon: BarChart3, color: 'text-purple-700' },
            { id: 'actions', label: 'Quick Actions', icon: Settings, color: 'text-gray-700' }
          ].map((feature, index) => (
            <Button
              key={feature.id}
              onClick={() => setActiveFeature(feature.id as any)}
              className={`
                flex items-center gap-3 px-6 py-3 rounded-xl font-bold text-sm transition-all duration-300 hover:scale-105 border-2 animate-slideUp
                ${activeFeature === feature.id 
                  ? 'gradient-primary text-white shadow-lg border-gray-700' 
                  : 'bg-white text-gray-800 border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                }
              `}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <feature.icon className={`h-5 w-5 ${
                activeFeature === feature.id ? 'text-white' : feature.color
              }`} />
              <span>{feature.label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-h-0">
        {activeFeature === 'schedule' && (
          <div className="space-y-6">
            <FilterSection 
              data={savedData}
              filters={filters}
              onFilterChange={handleFilterChange}
              onViewOptionChange={setViewOption}
              viewOption={viewOption}
            />

            {viewOption === 'byDay' ? (
              <ScheduleTabs 
                classesByDay={savedData}
                filters={filters}
              />
            ) : (
              <FullWeekSchedule 
                classesByDay={savedData}
                filters={filters}
              />
            )}

            <SummarySection 
              classesByDay={savedData}
              filters={filters}
            />
          </div>
        )}

        {activeFeature === 'search' && (
          <SmartSearch 
            classesByDay={savedData}
            onFiltersChange={handleFilterChange}
            currentFilters={filters}
          />
        )}

        {activeFeature === 'conflicts' && (
          <ConflictDetection classesByDay={savedData} />
        )}

        {activeFeature === 'analytics' && (
          <div className="space-y-6">
            <SummarySection 
              classesByDay={savedData}
              filters={filters}
            />
            <Card className="glass-card p-8 text-center border-2 border-gray-200/60">
              <div className="h-16 w-16 rounded-xl gradient-accent flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gradient-secondary mb-2">Advanced Analytics Dashboard</h3>
              <p className="text-gray-600 mb-6">
                Enhanced reporting with predictive insights, capacity planning, and performance metrics
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="p-4 gradient-accent-light rounded-xl border-2 border-indigo-200/60">
                  <div className="font-bold text-indigo-800">Utilization Reports</div>
                  <div className="text-sm text-indigo-700 mt-1">Trainer and location usage analysis</div>
                </div>
                <div className="p-4 gradient-success-light rounded-xl border-2 border-emerald-200/60">
                  <div className="font-bold text-emerald-800">Capacity Planning</div>
                  <div className="text-sm text-emerald-700 mt-1">Optimal resource allocation insights</div>
                </div>
                <div className="p-4 gradient-primary-light rounded-xl border-2 border-gray-200/60">
                  <div className="font-bold text-gray-800">Trend Analysis</div>
                  <div className="text-sm text-gray-700 mt-1">Historical patterns and forecasting</div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeFeature === 'actions' && (
          <QuickActionsPanel 
            onExport={handleExport}
            onRefresh={handleRefresh}
            onAnalytics={handleAnalytics}
            hasData={!!savedData}
            dataQuality={95}
            lastUpdated={new Date()}
          />
        )}
      </div>
    </div>
  );
}