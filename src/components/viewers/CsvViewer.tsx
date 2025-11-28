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
import { extractScheduleData } from '@/utils/csvParser';
import { Upload, ChevronDown, ChevronUp, Calendar, Users, MapPin, Activity, BarChart3, Table2 } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface CsvViewerProps {
  savedData: {[day: string]: ClassData[]} | null;
  onDataUpdate: (data: {[day: string]: ClassData[]}) => void;
}

export function CsvViewer({ savedData, onDataUpdate }: CsvViewerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({ 
    day: [], 
    location: ['Kwality House, Kemps Corner'], // Default location
    trainer: [], 
    className: [] 
  });
  const [viewOption, setViewOption] = useState<'byDay' | 'fullWeek'>('byDay');
  const [activeTab, setActiveTab] = useState<'data' | 'summary'>('data');
  const [filtersOpen, setFiltersOpen] = useState(false);
  
  // Listen for clear data events
  useEffect(() => {
    const handleDataCleared = () => {
      setError(null);
      setFilters({ day: [], location: ['Kwality House, Kemps Corner'], trainer: [], className: [] });
      setViewOption('byDay');
      setActiveTab('data');
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
      
      localStorage.setItem('originalCsvText', text);
      localStorage.setItem('csvFileName', file.name);
      localStorage.setItem('csvUploadDate', new Date().toLocaleDateString());
      
      const result = await extractScheduleData(text);
      
      // Reset filters with default location when new data is loaded
      setFilters({ day: [], location: ['Kwality House, Kemps Corner'], trainer: [], className: [] });
      
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
  
  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    localStorage.setItem('csvFilters', JSON.stringify(newFilters));
  };
  
  // Load saved filters on mount (but keep default location if no saved filters)
  useEffect(() => {
    const savedFilters = localStorage.getItem('csvFilters');
    if (savedFilters) {
      try {
        const parsed = JSON.parse(savedFilters);
        // Ensure Kwality House is selected if no location filter saved
        if (!parsed.location || parsed.location.length === 0) {
          parsed.location = ['Kwality House, Kemps Corner'];
        }
        setFilters(parsed);
      } catch (e) {
        console.error('Error parsing saved filters:', e);
      }
    }
  }, []);
  
  if (!savedData) {
    return (
      <div className="flex flex-col h-full animate-fadeIn p-4">
        <FileDropzone 
          onFileUpload={handleFileUpload}
          accept=".csv,text/csv"
          isLoading={isLoading}
          icon="file-csv"
          label="Drag & Drop your CSV schedule file here"
        />
      </div>
    );
  }

  // Calculate metrics
  const totalClasses = Object.values(savedData).reduce((total, classes) => total + classes.length, 0);
  const uniqueTrainers = new Set(Object.values(savedData).flat().map(cls => cls.trainer1)).size;
  const uniqueLocations = new Set(Object.values(savedData).flat().map(cls => cls.location)).size;
  const daysCount = Object.keys(savedData).length;
  
  // Count active filters
  const activeFilterCount = filters.day.length + filters.location.length + filters.trainer.length + filters.className.length;

  return (
    <div className="flex flex-col h-full p-4 space-y-3">
      {/* Compact Header with Upload Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span className="font-medium text-slate-700">{totalClasses}</span> classes
            <span className="text-slate-300">•</span>
            <span className="font-medium text-slate-700">{uniqueTrainers}</span> trainers
            <span className="text-slate-300">•</span>
            <span className="font-medium text-slate-700">{daysCount}</span> days
          </div>
        </div>
        <Button 
          variant="outline"
          size="sm"
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
          className="text-xs"
        >
          <Upload className="w-3 h-3 mr-1" />
          Upload New
        </Button>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('data')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === 'data' 
              ? 'bg-white shadow-sm text-slate-900' 
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Table2 className="w-4 h-4" />
          Schedule Data
        </button>
        <button
          onClick={() => setActiveTab('summary')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === 'summary' 
              ? 'bg-white shadow-sm text-slate-900' 
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Summary & Analytics
        </button>
      </div>

      {activeTab === 'data' && (
        <>
          {/* Collapsible Filter Section */}
          <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
            <CollapsibleTrigger asChild>
              <button className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-700">Filters</span>
                  {activeFilterCount > 0 && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                      {activeFilterCount} active
                    </span>
                  )}
                </div>
                {filtersOpen ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <div className="p-4 bg-white rounded-lg border border-slate-200">
                <FilterSection 
                  data={savedData}
                  filters={filters}
                  onFilterChange={handleFilterChange}
                  onViewOptionChange={setViewOption}
                  viewOption={viewOption}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Data Table */}
          <div className="flex-1 min-h-0 bg-white rounded-lg border border-slate-200 overflow-hidden">
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
        </>
      )}

      {activeTab === 'summary' && (
        <div className="flex-1 min-h-0 overflow-auto space-y-6">
          {/* Summary Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500 rounded-lg">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-900">{totalClasses}</div>
                  <div className="text-xs text-blue-600 font-medium">Total Classes</div>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4 border border-emerald-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500 rounded-lg">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-emerald-900">{uniqueTrainers}</div>
                  <div className="text-xs text-emerald-600 font-medium">Trainers</div>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500 rounded-lg">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-900">{uniqueLocations}</div>
                  <div className="text-xs text-purple-600 font-medium">Locations</div>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4 border border-amber-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500 rounded-lg">
                  <Activity className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-amber-900">{daysCount}</div>
                  <div className="text-xs text-amber-600 font-medium">Days Active</div>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Summary Section */}
          <SummarySection 
            classesByDay={savedData}
            filters={filters}
          />
        </div>
      )}
    </div>
  );
}