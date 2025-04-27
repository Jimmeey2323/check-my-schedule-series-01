
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
          </div>

          <FilterSection 
            data={savedData}
            filters={filters}
            onFilterChange={handleFilterChange}
            viewOption={viewOption}
            onViewOptionChange={setViewOption}
          />

          <div className="flex-grow overflow-auto">
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
          
          <SummarySection 
            classesByDay={savedData}
            filters={filters}
          />
        </>
      )}
    </div>
  );
}
