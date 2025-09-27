import React, { useState, useRef, useEffect } from 'react';
import { ClassData, FilterState } from '@/types/schedule';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
    <div className="flex flex-col h-full space-y-4 p-4">
      {/* Clean Header Section */}
      <Card className="glass-card border-2 border-blue-200/60 shadow-lg">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Title & Status */}
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-600 to-emerald-600 flex items-center justify-center shadow-lg">
                <Activity className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">
                  CSV Schedule Data
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></div>
                  <span className="text-sm text-gray-600">{totalClasses} classes • {uniqueTrainers} trainers • {daysCount} days</span>
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button 
                variant="outline"
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
                disabled={isLoading}
                className="hover:bg-blue-50 border-blue-300"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload New
              </Button>
              
              <Button 
                onClick={handleRefresh}
                disabled={!savedData || isLoading}
                className="bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Reprocess
              </Button>
            </div>
          </div>
          
          {/* Compact Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              <div className="text-sm">
                <div className="font-semibold text-blue-700">{totalClasses}</div>
                <div className="text-xs text-gray-500">Classes</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-600" />
              <div className="text-sm">
                <div className="font-semibold text-emerald-700">{uniqueTrainers}</div>
                <div className="text-xs text-gray-500">Trainers</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-purple-600" />
              <div className="text-sm">
                <div className="font-semibold text-purple-700">{uniqueLocations}</div>
                <div className="text-xs text-gray-500">Locations</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-orange-600" />
              <div className="text-sm">
                <div className="font-semibold text-orange-700">{daysCount}</div>
                <div className="text-xs text-gray-500">Days</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Clean Feature Navigation */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'schedule', label: 'Schedule', icon: Calendar, color: 'blue' },
              { id: 'search', label: 'Search', icon: Search, color: 'emerald' },
              { id: 'conflicts', label: 'Conflicts', icon: AlertTriangle, color: 'orange' },
              { id: 'analytics', label: 'Analytics', icon: BarChart3, color: 'purple' },
              { id: 'actions', label: 'Actions', icon: Settings, color: 'gray' }
            ].map((feature) => (
              <Button
                key={feature.id}
                onClick={() => setActiveFeature(feature.id as any)}
                variant={activeFeature === feature.id ? 'default' : 'outline'}
                size="sm"
                className={`
                  flex items-center gap-2 transition-all duration-200
                  ${
                    activeFeature === feature.id 
                      ? 'bg-gradient-to-r from-blue-600 to-emerald-600 text-white shadow-md' 
                      : 'hover:bg-gray-50 border-gray-300'
                  }
                `}
              >
                <feature.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{feature.label}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

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