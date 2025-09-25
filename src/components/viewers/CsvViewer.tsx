
import React, { useState, useRef } from 'react';
import { ClassData, FilterState } from '@/types/schedule';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { FileDropzone } from '../FileDropzone';
import { FilterSection } from '../FilterSection';
import { ScheduleTabs } from '../ScheduleTabs';
import { FullWeekSchedule } from '../FullWeekSchedule';
import { SummarySection } from '../SummarySection';
import { SmartSearchComponent } from '../SmartSearchComponent';
import { AdvancedAnalyticsDashboard } from '../AdvancedAnalyticsDashboard';
import { QuickActionToolbar } from '../QuickActionToolbar';
import { extractScheduleData } from '@/utils/csvParser';
import { Upload, Sparkles, Activity, Calendar, Users, MapPin, BarChart3, Search, Zap } from 'lucide-react';

interface CsvViewerProps {
  savedData: {[day: string]: ClassData[]} | null;
  onDataUpdate: (data: {[day: string]: ClassData[]}) => void;
}

export function CsvViewer({ savedData, onDataUpdate }: CsvViewerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({ day: [], location: [], trainer: [], className: [], searchQuery: '' });
  const [viewOption, setViewOption] = useState<'byDay' | 'fullWeek'>('byDay');
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showSmartSearch, setShowSmartSearch] = useState(false);
  const [activeView, setActiveView] = useState<'schedule' | 'analytics' | 'search'>('schedule');
  
  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    setError(null);
    
    try {
      if (!file.name.toLowerCase().endsWith('.csv')) {
        throw new Error('Please upload a valid CSV file.');
      }
      
      const text = await file.text();
      
      // Save original CSV text for reprocessing
      localStorage.setItem('originalCsvText', text);
      
      const result = await extractScheduleData(text);
      
      // Reset filters when new data is loaded
      setFilters({ day: [], location: [], trainer: [], className: [], searchQuery: '' });
      
      onDataUpdate(result);
      
      toast({
        title: "✅ Success",
        description: "CSV data processed successfully!",
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
  
  // Enhanced filter change handler with persistence
  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    // Store filters in localStorage for persistence across tabs
    localStorage.setItem('csvFilters', JSON.stringify(newFilters));
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
          label="Drag & Drop your CSV file here"
        />
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
      <div className="glass-card rounded-xl p-6 sticky top-0 z-10 shadow-xl border border-white/30">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-teal-600 flex items-center justify-center animate-float">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gradient-primary">CSV Schedule Data</h1>
              <div className="flex items-center gap-2 mt-1">
                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-lg shadow-emerald-400/50"></div>
                <span className="text-sm text-muted-foreground">Live data loaded</span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3">
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
              className="glass border-white/30 hover:bg-white/20 hover:scale-105 transition-all duration-300"
              disabled={isLoading}
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload New CSV
            </Button>
            
            <Button 
              variant="outline"
              onClick={async () => {
                if (savedData) {
                  setIsLoading(true);
                  try {
                    const originalCsv = localStorage.getItem('originalCsvText');
                    if (originalCsv) {
                      const result = await extractScheduleData(originalCsv);
                      onDataUpdate(result);
                      toast({
                        title: "✅ Success",
                        description: "Data reprocessed with latest class name mappings",
                        variant: "default",
                      });
                    } else {
                      toast({
                        title: "ℹ️ Info",
                        description: "Please upload a new CSV file to apply latest class name mappings",
                        variant: "default",
                      });
                    }
                  } catch (err) {
                    console.error('Error reprocessing data:', err);
                    toast({
                      title: "❌ Error",
                      description: "Failed to reprocess data",
                      variant: "destructive",
                    });
                  } finally {
                    setIsLoading(false);
                  }
                }
              }}
              className="gradient-primary-light border-blue-300/30 text-blue-700 hover:bg-blue-100/50 hover:scale-105 transition-all duration-300"
              disabled={!savedData || isLoading}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Reprocess Data
            </Button>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="glass-card p-4 rounded-lg hover:shadow-md transition-all duration-300">
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-blue-500" />
              <div>
                <div className="text-2xl font-bold text-gradient-primary">{daysCount}</div>
                <div className="text-xs text-muted-foreground">Days</div>
              </div>
            </div>
          </div>
          
          <div className="glass-card p-4 rounded-lg hover:shadow-md transition-all duration-300">
            <div className="flex items-center gap-3">
              <Activity className="h-8 w-8 text-teal-500" />
              <div>
                <div className="text-2xl font-bold text-gradient-primary">{totalClasses}</div>
                <div className="text-xs text-muted-foreground">Classes</div>
              </div>
            </div>
          </div>
          
          <div className="glass-card p-4 rounded-lg hover:shadow-md transition-all duration-300">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-purple-500" />
              <div>
                <div className="text-2xl font-bold text-gradient-primary">{uniqueTrainers}</div>
                <div className="text-xs text-muted-foreground">Trainers</div>
              </div>
            </div>
          </div>
          
          <div className="glass-card p-4 rounded-lg hover:shadow-md transition-all duration-300">
            <div className="flex items-center gap-3">
              <MapPin className="h-8 w-8 text-emerald-500" />
              <div>
                <div className="text-2xl font-bold text-gradient-primary">{uniqueLocations}</div>
                <div className="text-xs text-muted-foreground">Locations</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Toolbar */}
      <QuickActionToolbar 
        csvData={savedData}
        onRefresh={async () => {
          if (savedData) {
            setIsLoading(true);
            try {
              const originalCsv = localStorage.getItem('originalCsvText');
              if (originalCsv) {
                const result = await extractScheduleData(originalCsv);
                onDataUpdate(result);
                toast({
                  title: "✅ Success",
                  description: "Data refreshed successfully",
                  variant: "default",
                });
              }
            } catch (err) {
              console.error('Error refreshing data:', err);
              toast({
                title: "❌ Error",
                description: "Failed to refresh data",
                variant: "destructive",
              });
            } finally {
              setIsLoading(false);
            }
          }
        }}
        onShowAnalytics={() => setActiveView('analytics')}
        onShowConflicts={() => setActiveView('search')}
      />

      {/* View Navigation */}
      <div className="glass-card neat-border rounded-xl p-4">
        <div className="flex gap-2">
          <Button
            variant={activeView === 'schedule' ? "default" : "outline"}
            onClick={() => setActiveView('schedule')}
            className={activeView === 'schedule' ? "gradient-primary text-white" : "neat-border"}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Schedule View
          </Button>
          <Button
            variant={activeView === 'search' ? "default" : "outline"}
            onClick={() => setActiveView('search')}
            className={activeView === 'search' ? "gradient-primary text-white" : "neat-border"}
          >
            <Search className="h-4 w-4 mr-2" />
            Smart Search
          </Button>
          <Button
            variant={activeView === 'analytics' ? "default" : "outline"}
            onClick={() => setActiveView('analytics')}
            className={activeView === 'analytics' ? "gradient-primary text-white" : "neat-border"}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </Button>
        </div>
      </div>

      {/* Dynamic Content Based on Active View */}
      {activeView === 'search' && (
        <SmartSearchComponent 
          data={savedData}
          filters={filters}
          onFilterChange={handleFilterChange}
        />
      )}

      {activeView === 'analytics' && (
        <AdvancedAnalyticsDashboard 
          data={savedData}
        />
      )}

      {activeView === 'schedule' && (
        <>
          {/* Filter Section with Glass Effect */}
          <div className="glass-card neat-border rounded-xl overflow-visible">
            <FilterSection 
              data={savedData}
              filters={filters}
              onFilterChange={handleFilterChange}
              viewOption={viewOption}
              onViewOptionChange={setViewOption}
            />
          </div>

          {/* Main Content Area */}
          <div className="flex-grow glass-card neat-border rounded-xl p-6 animate-slideUp">
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
          </div>

          {/* Summary Section */}
          <div className="glass-card neat-border rounded-xl">
            <SummarySection 
              classesByDay={savedData}
              filters={filters}
            />
          </div>
        </>
      )}
    </div>
  );
}
