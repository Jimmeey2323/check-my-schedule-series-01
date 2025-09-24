
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
import { extractScheduleData } from '@/utils/csvParser';

interface CsvViewerProps {
  savedData: {[day: string]: ClassData[]} | null;
  onDataUpdate: (data: {[day: string]: ClassData[]}) => void;
}

export function CsvViewer({ savedData, onDataUpdate }: CsvViewerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({ day: [], location: [], trainer: [], className: [] });
  const [viewOption, setViewOption] = useState<'byDay' | 'fullWeek'>('byDay');
  
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
      setFilters({ day: [], location: [], trainer: [], className: [] });
      
      onDataUpdate(result);
    } catch (err) {
      console.error('Error processing CSV:', err);
      setError(err instanceof Error ? err.message : 'Unknown error processing the CSV file');
      toast({
        title: "Error",
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
  
  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {!savedData ? (
        <FileDropzone 
          onFileUpload={handleFileUpload}
          accept=".csv,text/csv"
          isLoading={isLoading}
          icon="file-csv"
          label="Drag & Drop your CSV file here"
        />
      ) : (
        <>
          <div className="flex justify-between mb-4 gap-2 flex-wrap">
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
              className="text-sm"
            >
              Upload New CSV
            </Button>
            
            <Button 
              variant="outline"
              onClick={async () => {
                if (savedData) {
                  setIsLoading(true);
                  try {
                    // Get the original CSV data from localStorage if available
                    const originalCsv = localStorage.getItem('originalCsvText');
                    if (originalCsv) {
                      const result = await extractScheduleData(originalCsv);
                      onDataUpdate(result);
                      toast({
                        title: "Success",
                        description: "Data reprocessed with latest class name mappings",
                        variant: "default",
                      });
                    } else {
                      toast({
                        title: "Info",
                        description: "Please upload a new CSV file to apply latest class name mappings",
                        variant: "default",
                      });
                    }
                  } catch (err) {
                    console.error('Error reprocessing data:', err);
                    toast({
                      title: "Error",
                      description: "Failed to reprocess data",
                      variant: "destructive",
                    });
                  } finally {
                    setIsLoading(false);
                  }
                }
              }}
              className="text-sm"
              disabled={!savedData}
            >
              Reprocess Data
            </Button>
          </div>

          <FilterSection 
            data={savedData}
            filters={filters}
            onFilterChange={handleFilterChange}
            viewOption={viewOption}
            onViewOptionChange={setViewOption}
          />

          <div className="flex-grow overflow-hidden flex flex-col">
            {/* Enhanced Header Section */}
            <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-shrink-0 w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                  <span className="text-white text-xl">📊</span>
                </div>
                <div className="flex-grow">
                  <h3 className="font-semibold text-blue-900">CSV Schedule Data Table</h3>
                  <p className="text-sm text-blue-700">Normalized and processed data from your uploaded CSV file</p>
                </div>
              </div>
              
              {/* Data Processing Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                <div className="bg-white rounded-lg p-3 border border-blue-100">
                  <div className="text-lg font-bold text-blue-600">{Object.keys(savedData).length}</div>
                  <div className="text-xs text-blue-500">Days Available</div>
                </div>
                <div className="bg-white rounded-lg p-3 border border-blue-100">
                  <div className="text-lg font-bold text-blue-600">
                    {Object.values(savedData).reduce((total, classes) => total + classes.length, 0)}
                  </div>
                  <div className="text-xs text-blue-500">Total Classes</div>
                </div>
                <div className="bg-white rounded-lg p-3 border border-blue-100">
                  <div className="text-lg font-bold text-blue-600">
                    {new Set(Object.values(savedData).flat().map(cls => cls.trainer1)).size}
                  </div>
                  <div className="text-xs text-blue-500">Unique Trainers</div>
                </div>
              </div>

              {/* Normalization Info */}
              <div className="bg-white rounded-lg p-3 border border-blue-100">
                <h4 className="font-medium text-blue-800 mb-2">Data Normalization Applied:</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <span className="text-green-600">✓</span>
                    <span className="text-gray-600">Time format standardized</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-green-600">✓</span>
                    <span className="text-gray-600">Class names mapped</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-green-600">✓</span>
                    <span className="text-gray-600">Trainer names validated</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-green-600">✓</span>
                    <span className="text-gray-600">Location names standardized</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex-grow overflow-hidden">
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
            
            {/* Daily Summary Cards */}
            <div className="mt-4">
              <h4 className="font-semibold text-gray-800 mb-3">Daily Breakdown</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(savedData).map(([day, classes]) => (
                  <div key={day} className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-semibold text-gray-800">{day}</h5>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                        {classes.length} classes
                      </span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Classes:</span>
                        <span className="font-medium">{classes.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Trainers:</span>
                        <span className="font-medium">{new Set(classes.map(c => c.trainer1)).size}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Locations:</span>
                        <span className="font-medium">{new Set(classes.map(c => c.location)).size}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Time Span:</span>
                        <span className="font-medium text-xs">
                          {classes.length > 0 && classes[0].timeDate && classes[classes.length - 1].timeDate
                            ? (() => {
                                try {
                                  const firstTime = typeof classes[0].timeDate === 'string' ? new Date(classes[0].timeDate) : classes[0].timeDate;
                                  const lastTime = typeof classes[classes.length - 1].timeDate === 'string' ? new Date(classes[classes.length - 1].timeDate) : classes[classes.length - 1].timeDate;
                                  return `${firstTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - ${lastTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
                                } catch (e) {
                                  return 'Varies';
                                }
                              })()
                            : 'Varies'
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <SummarySection 
            classesByDay={savedData}
            filters={filters}
          />
        </>
      )}
    </div>
  );
}
