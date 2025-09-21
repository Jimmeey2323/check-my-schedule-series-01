import React, { useState, useEffect } from 'react';
import { ClassData, PdfClassData, FilterState } from '@/types/schedule';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FilterSection } from '../FilterSection';
import { passesFilters } from '@/utils/filterUtils';

interface QuickMismatchViewerProps {
  csvData: {[day: string]: ClassData[]} | null;
  pdfData: PdfClassData[] | null;
}

interface MismatchItem {
  type: 'trainer_mismatch' | 'missing_in_pdf' | 'missing_in_csv' | 'time_mismatch' | 'location_mismatch';
  day: string;
  time: string;
  className: string;
  csvTrainer?: string;
  pdfTrainer?: string;
  csvLocation?: string;
  pdfLocation?: string;
  csvTime?: string;
  pdfTime?: string;
  severity: 'high' | 'medium' | 'low';
}

export function QuickMismatchViewer({ csvData, pdfData }: QuickMismatchViewerProps) {
  const [filters, setFilters] = useState<FilterState>({ day: [], location: [], trainer: [], className: [] });
  const [mismatches, setMismatches] = useState<MismatchItem[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    trainerMismatches: 0,
    missingInPdf: 0,
    missingInCsv: 0,
    timeMismatches: 0,
    locationMismatches: 0
  });

  // Load saved filters
  useEffect(() => {
    const savedFilters = localStorage.getItem('csvFilters');
    if (savedFilters) {
      try {
        setFilters(JSON.parse(savedFilters));
      } catch (e) {
        console.error('Error parsing saved filters:', e);
      }
    }
  }, []);

  // Helper function to parse time strings and compare them
  const parseTime = (timeString: string): Date | null => {
    try {
      // Handle different time formats
      const cleanTime = timeString.trim().toLowerCase();
      
      // Common time formats: "10:00 AM", "10:00", "10.00 AM", etc.
      const timeMatch = cleanTime.match(/(\d{1,2})[:.:](\d{2})\s*(am|pm)?/i);
      
      if (timeMatch) {
        let hour = parseInt(timeMatch[1]);
        const minute = parseInt(timeMatch[2]);
        const period = timeMatch[3];
        
        if (period) {
          if (period.toLowerCase() === 'pm' && hour !== 12) {
            hour += 12;
          } else if (period.toLowerCase() === 'am' && hour === 12) {
            hour = 0;
          }
        }
        
        const date = new Date();
        date.setHours(hour, minute, 0, 0);
        return date;
      }
    } catch (error) {
      console.error('Error parsing time:', timeString, error);
    }
    return null;
  };

  const timesMatch = (time1: string, time2: string): boolean => {
    const t1 = parseTime(time1);
    const t2 = parseTime(time2);
    
    if (!t1 || !t2) {
      // If parsing fails, do string comparison
      return time1.trim().toLowerCase() === time2.trim().toLowerCase();
    }
    
    // Allow 5 minute tolerance
    return Math.abs(t1.getTime() - t2.getTime()) < 300000;
  };

  // Calculate mismatches
  useEffect(() => {
    if (!csvData || !pdfData) {
      setMismatches([]);
      setStats({
        total: 0,
        trainerMismatches: 0,
        missingInPdf: 0,
        missingInCsv: 0,
        timeMismatches: 0,
        locationMismatches: 0
      });
      return;
    }

    const csvFlat: ClassData[] = [];
    Object.values(csvData).forEach(dayClasses => {
      csvFlat.push(...dayClasses);
    });

    const detectedMismatches: MismatchItem[] = [];

    // Check CSV classes against PDF
    csvFlat.forEach(csvClass => {
      // Find matching PDF class by day, time, and class name
      const pdfMatch = pdfData.find(pdf => 
        pdf.day === csvClass.day && 
        pdf.className === csvClass.className &&
        timesMatch(pdf.time, csvClass.time)
      );

      if (!pdfMatch) {
        detectedMismatches.push({
          type: 'missing_in_pdf',
          day: csvClass.day,
          time: csvClass.time,
          className: csvClass.className,
          csvTrainer: csvClass.trainer1,
          csvLocation: csvClass.location,
          severity: 'high'
        });
      } else {
        // Check for trainer mismatch
        if (pdfMatch.trainer !== csvClass.trainer1) {
          detectedMismatches.push({
            type: 'trainer_mismatch',
            day: csvClass.day,
            time: csvClass.time,
            className: csvClass.className,
            csvTrainer: csvClass.trainer1,
            pdfTrainer: pdfMatch.trainer,
            severity: 'high'
          });
        }

        // Check for location mismatch
        if (pdfMatch.location !== csvClass.location) {
          detectedMismatches.push({
            type: 'location_mismatch',
            day: csvClass.day,
            time: csvClass.time,
            className: csvClass.className,
            csvLocation: csvClass.location,
            pdfLocation: pdfMatch.location,
            severity: 'medium'
          });
        }

        // Check for time mismatch (only if they don't match exactly)
        if (!timesMatch(pdfMatch.time, csvClass.time)) {
          detectedMismatches.push({
            type: 'time_mismatch',
            day: csvClass.day,
            time: csvClass.time,
            className: csvClass.className,
            csvTime: csvClass.time,
            pdfTime: pdfMatch.time,
            severity: 'medium'
          });
        }
      }
    });

    // Check for classes in PDF but not in CSV
    pdfData.forEach(pdfClass => {
      const csvMatch = csvFlat.find(csv => 
        csv.day === pdfClass.day && 
        csv.className === pdfClass.className &&
        timesMatch(csv.time, pdfClass.time)
      );

      if (!csvMatch) {
        detectedMismatches.push({
          type: 'missing_in_csv',
          day: pdfClass.day,
          time: pdfClass.time,
          className: pdfClass.className,
          pdfTrainer: pdfClass.trainer,
          pdfLocation: pdfClass.location,
          severity: 'high'
        });
      }
    });

    setMismatches(detectedMismatches);

    // Calculate stats
    const statsData = {
      total: detectedMismatches.length,
      trainerMismatches: detectedMismatches.filter(m => m.type === 'trainer_mismatch').length,
      missingInPdf: detectedMismatches.filter(m => m.type === 'missing_in_pdf').length,
      missingInCsv: detectedMismatches.filter(m => m.type === 'missing_in_csv').length,
      timeMismatches: detectedMismatches.filter(m => m.type === 'time_mismatch').length,
      locationMismatches: detectedMismatches.filter(m => m.type === 'location_mismatch').length
    };
    setStats(statsData);

    // Debug logging
    console.log('QuickMismatchViewer Debug:', {
      csvDataKeys: csvData ? Object.keys(csvData) : 'null',
      csvClassCount: csvFlat.length,
      pdfClassCount: pdfData.length,
      detectedMismatches: detectedMismatches.length,
      stats: statsData
    });
  }, [csvData, pdfData]);

  // Filter mismatches
  const filteredMismatches = mismatches.filter(mismatch => 
    passesFilters({
      day: mismatch.day,
      location: mismatch.csvLocation || mismatch.pdfLocation || '',
      trainer: mismatch.csvTrainer || mismatch.pdfTrainer || '',
      className: mismatch.className
    }, filters)
  );

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    localStorage.setItem('csvFilters', JSON.stringify(newFilters));
  };

  const getMismatchIcon = (type: string) => {
    switch (type) {
      case 'trainer_mismatch': return '👥';
      case 'missing_in_pdf': return '📋❌';
      case 'missing_in_csv': return '📊❌';
      case 'time_mismatch': return '⏰';
      case 'location_mismatch': return '📍';
      default: return '⚠️';
    }
  };

  const getMismatchColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'secondary';
    }
  };

  const getMismatchTitle = (type: string) => {
    switch (type) {
      case 'trainer_mismatch': return 'Trainer Mismatch';
      case 'missing_in_pdf': return 'Missing in PDF';
      case 'missing_in_csv': return 'Missing in CSV';
      case 'time_mismatch': return 'Time Mismatch';
      case 'location_mismatch': return 'Location Mismatch';
      default: return 'Unknown Mismatch';
    }
  };

  if (!csvData || !pdfData) {
    return (
      <Card className="flex flex-col items-center justify-center p-8">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Quick Mismatch Check Not Available</h2>
          <p className="mb-4 text-gray-600">
            Please upload both CSV and PDF schedule data to check for mismatches.
          </p>
          <div className="flex gap-4 justify-center">
            {!csvData && (
              <button 
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                onClick={() => document.getElementById('tab-csv')?.click()}
              >
                Upload CSV Data
              </button>
            )}
            {!pdfData && (
              <button 
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                onClick={() => document.getElementById('tab-pdf')?.click()}
              >
                Upload PDF Data
              </button>
            )}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4">
        <FilterSection 
          data={csvData}
          filters={filters}
          onFilterChange={handleFilterChange}
          isComparisonView
        />
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
        <Card className="text-center">
          <CardContent className="p-3">
            <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
            <div className="text-xs text-gray-600">Total Issues</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="p-3">
            <div className="text-2xl font-bold text-red-600">{stats.trainerMismatches}</div>
            <div className="text-xs text-gray-600">Trainer</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="p-3">
            <div className="text-2xl font-bold text-orange-600">{stats.missingInPdf}</div>
            <div className="text-xs text-gray-600">Missing PDF</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="p-3">
            <div className="text-2xl font-bold text-purple-600">{stats.missingInCsv}</div>
            <div className="text-xs text-gray-600">Missing CSV</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="p-3">
            <div className="text-2xl font-bold text-blue-600">{stats.timeMismatches}</div>
            <div className="text-xs text-gray-600">Time</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="p-3">
            <div className="text-2xl font-bold text-green-600">{stats.locationMismatches}</div>
            <div className="text-xs text-gray-600">Location</div>
          </CardContent>
        </Card>
      </div>

      {/* Mismatch List */}
      <div className="flex-grow overflow-auto">
        {filteredMismatches.length === 0 ? (
          <Alert>
            <AlertDescription>
              {stats.total === 0 ? 
                "🎉 No mismatches found! Your schedules are perfectly aligned." :
                "No mismatches match your current filters."
              }
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-3">
            {filteredMismatches.map((mismatch, index) => (
              <Card key={index} className="border-l-4 border-l-red-500">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{getMismatchIcon(mismatch.type)}</span>
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={getMismatchColor(mismatch.severity) as any}>
                            {getMismatchTitle(mismatch.type)}
                          </Badge>
                          <span className="font-medium">{mismatch.className}</span>
                        </div>
                        <div className="text-sm text-gray-600 mb-2">
                          {mismatch.day} at {mismatch.time}
                        </div>
                        
                        {mismatch.type === 'trainer_mismatch' && (
                          <div className="text-sm">
                            <span className="text-blue-600">CSV:</span> {mismatch.csvTrainer} →{' '}
                            <span className="text-red-600">PDF:</span> {mismatch.pdfTrainer}
                          </div>
                        )}
                        
                        {mismatch.type === 'missing_in_pdf' && (
                          <div className="text-sm">
                            <span className="text-blue-600">Only in CSV:</span> {mismatch.csvTrainer} at {mismatch.csvLocation}
                          </div>
                        )}
                        
                        {mismatch.type === 'missing_in_csv' && (
                          <div className="text-sm">
                            <span className="text-red-600">Only in PDF:</span> {mismatch.pdfTrainer} at {mismatch.pdfLocation}
                          </div>
                        )}
                        
                        {mismatch.type === 'time_mismatch' && (
                          <div className="text-sm">
                            <span className="text-blue-600">CSV:</span> {mismatch.csvTime} →{' '}
                            <span className="text-red-600">PDF:</span> {mismatch.pdfTime}
                          </div>
                        )}
                        
                        {mismatch.type === 'location_mismatch' && (
                          <div className="text-sm">
                            <span className="text-blue-600">CSV:</span> {mismatch.csvLocation} →{' '}
                            <span className="text-red-600">PDF:</span> {mismatch.pdfLocation}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}