import React, { useState, useEffect, useRef } from 'react';
import { ClassData, PdfClassData, FilterState } from '@/types/schedule';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FilterSection } from '../FilterSection';
import { passesFilters } from '@/utils/filterUtils';
import { toast } from '@/hooks/use-toast';
import { 
  CheckCircle2, 
  AlertTriangle, 
  ArrowLeftRight, 
  FileSpreadsheet, 
  FileText, 
  Users, 
  BookOpen, 
  Clock,
  ChevronDown,
  ChevronUp,
  Filter,
  Copy,
  Check
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface SideBySideViewerProps {
  csvData: {[day: string]: ClassData[]} | null;
  pdfData: PdfClassData[] | null;
}

// More specific mismatch types
type MismatchType = 'match' | 'trainer-mismatch' | 'class-mismatch' | 'time-mismatch' | 'csv-only' | 'pdf-only';
type QuickFilter = 'all' | 'matches' | 'trainer-mismatch' | 'class-mismatch' | 'time-mismatch' | 'csv-only' | 'pdf-only';

export function SideBySideViewer({ csvData, pdfData }: SideBySideViewerProps) {
  const [filters, setFilters] = useState<FilterState>({ day: [], location: ['Kwality House', 'Kemps Corner'], trainer: [], className: [] });
  const [flattenedCsvData, setFlattenedCsvData] = useState<ClassData[]>([]);
  const [filteredCsvData, setFilteredCsvData] = useState<ClassData[]>([]);
  const [filteredPdfData, setFilteredPdfData] = useState<PdfClassData[]>([]);
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Refs for synchronized scrolling
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Set default filter on mount (only if no saved filters)
  useEffect(() => {
    const savedFilters = localStorage.getItem('csvFilters');
    if (savedFilters) {
      try {
        const parsed = JSON.parse(savedFilters);
        // Only use saved filters if they have values, otherwise use default
        if (parsed.location && parsed.location.length > 0) {
          setFilters(parsed);
        } else {
          // Set default to Kwality House and Kemps Corner
          const defaultFilters = { day: [], location: ['Kwality House', 'Kemps Corner'], trainer: [], className: [] };
          setFilters(defaultFilters);
          localStorage.setItem('csvFilters', JSON.stringify(defaultFilters));
        }
      } catch (e) {
        console.error('Error parsing saved filters:', e);
      }
    } else {
      // No saved filters, set default
      const defaultFilters = { day: [], location: ['Kwality House', 'Kemps Corner'], trainer: [], className: [] };
      setFilters(defaultFilters);
      localStorage.setItem('csvFilters', JSON.stringify(defaultFilters));
    }
  }, []);

  // Listen for clear data events and reset state
  useEffect(() => {
    const handleDataCleared = () => {
      setFilters({ day: [], location: ['Kwality House', 'Kemps Corner'], trainer: [], className: [] });
      setQuickFilter('all');
    };

    window.addEventListener('scheduleDataCleared', handleDataCleared);
    return () => window.removeEventListener('scheduleDataCleared', handleDataCleared);
  }, []);
  
  // Flatten CSV data on load
  useEffect(() => {
    if (!csvData) return;
    
    const flattened: ClassData[] = [];
    Object.values(csvData).forEach(dayClasses => {
      flattened.push(...dayClasses);
    });
    
    setFlattenedCsvData(flattened);
  }, [csvData]);
  
  // Apply filters to both datasets
  useEffect(() => {
    if (!csvData || !pdfData) return;
    
    // Filter CSV data
    const csvFiltered = flattenedCsvData.filter(item => 
      passesFilters({
        day: item.day,
        location: item.location,
        trainer: item.trainer1,
        className: item.className
      }, filters)
    );
    
    // Filter PDF data
    const pdfFiltered = pdfData.filter(item => 
      passesFilters({
        day: item.day,
        location: item.location,
        trainer: item.trainer,
        className: item.className
      }, filters)
    );
    
    setFilteredCsvData(csvFiltered);
    setFilteredPdfData(pdfFiltered);
  }, [csvData, pdfData, flattenedCsvData, filters]);
  
  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    localStorage.setItem('csvFilters', JSON.stringify(newFilters));
  };
  
  if (!csvData || !pdfData) {
    return (
      <Card className="flex flex-col items-center justify-center p-8">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Comparison Not Available</h2>
          <p className="mb-4 text-gray-600">
            Please upload both CSV and PDF schedule data to enable comparison.
          </p>
          <div className="flex gap-4 justify-center">
            {!csvData && (
              <Button variant="outline" onClick={() => document.getElementById('tab-csv')?.click()}>
                Upload CSV Data
              </Button>
            )}
            {!pdfData && (
              <Button variant="outline" onClick={() => document.getElementById('tab-pdf')?.click()}>
                Upload PDF Data
              </Button>
            )}
          </div>
        </div>
      </Card>
    );
  }
  
  // Helper functions for time parsing and normalization
  const parseTimeToMinutes = (timeStr: string): number => {
    if (!timeStr) return 0;
    const match = timeStr.match(/(\d{1,2})[:.:](\d{2})\s*(AM|PM)?/i);
    if (match) {
      let hours = parseInt(match[1]);
      const minutes = parseInt(match[2]);
      const period = match[3]?.toUpperCase();
      
      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      
      return hours * 60 + minutes;
    }
    return 0;
  };

  const normalizeTimeKey = (timeStr: string): string => {
    const minutes = parseTimeToMinutes(timeStr);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  // Group data by day
  const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const groupedCsvData: {[day: string]: ClassData[]} = {};
  const groupedPdfData: {[day: string]: PdfClassData[]} = {};
  
  filteredCsvData.forEach(item => {
    if (!groupedCsvData[item.day]) groupedCsvData[item.day] = [];
    groupedCsvData[item.day].push(item);
  });
  
  filteredPdfData.forEach(item => {
    if (!groupedPdfData[item.day]) groupedPdfData[item.day] = [];
    groupedPdfData[item.day].push(item);
  });
  
  const allDays = Array.from(new Set([
    ...Object.keys(groupedCsvData),
    ...Object.keys(groupedPdfData)
  ])).sort((a, b) => {
    const aIndex = daysOrder.indexOf(a);
    const bIndex = daysOrder.indexOf(b);
    if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  // Build aligned rows for each day
  interface AlignedRow {
    day: string;
    timeKey: string;
    displayTime: string;
    sortKey: number;
    csvClass: ClassData | null;
    pdfClass: PdfClassData | null;
    matchStatus: MismatchType;
  }

  const buildAlignedDayData = (day: string): AlignedRow[] => {
    const csvClasses = [...(groupedCsvData[day] || [])].sort((a, b) => 
      parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time)
    );
    const pdfClasses = [...(groupedPdfData[day] || [])].sort((a, b) => 
      parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time)
    );
    
    const alignedRows: AlignedRow[] = [];
    const usedCsvIndices = new Set<number>();
    const usedPdfIndices = new Set<number>();
    
    // Helper to determine specific match status
    const getMatchStatus = (csvClass: ClassData | null, pdfClass: PdfClassData | null): MismatchType => {
      if (!csvClass && pdfClass) return 'pdf-only';
      if (csvClass && !pdfClass) return 'csv-only';
      if (!csvClass || !pdfClass) return 'csv-only';
      
      // Check time match
      const csvTimeKey = normalizeTimeKey(csvClass.time);
      const pdfTimeKey = normalizeTimeKey(pdfClass.time);
      const timeMatches = csvTimeKey === pdfTimeKey;
      
      // Check class name match
      const csvClassName = csvClass.className.toLowerCase().replace('studio ', '');
      const pdfClassName = pdfClass.className.toLowerCase().replace('studio ', '');
      const classMatches = csvClassName.includes(pdfClassName) || pdfClassName.includes(csvClassName);
      
      // Check trainer match
      const trainerMatches = csvClass.trainer1 === pdfClass.trainer;
      
      // Determine specific mismatch type (prioritize by importance)
      if (!timeMatches) return 'time-mismatch';
      if (!classMatches) return 'class-mismatch';
      if (!trainerMatches) return 'trainer-mismatch';
      
      return 'match';
    };
    
    // Match CSV classes with PDF classes at the same time
    csvClasses.forEach((csvClass, csvIdx) => {
      const csvTimeKey = normalizeTimeKey(csvClass.time);
      const csvSortKey = parseTimeToMinutes(csvClass.time);
      
      const matchingPdfIdx = pdfClasses.findIndex((pdfClass, pdfIdx) => {
        if (usedPdfIndices.has(pdfIdx)) return false;
        const pdfTimeKey = normalizeTimeKey(pdfClass.time);
        return pdfTimeKey === csvTimeKey && 
          (pdfClass.className.toLowerCase().includes(csvClass.className.toLowerCase().replace('studio ', '')) ||
           csvClass.className.toLowerCase().includes(pdfClass.className.toLowerCase().replace('studio ', '')));
      });
      
      if (matchingPdfIdx !== -1) {
        usedCsvIndices.add(csvIdx);
        usedPdfIndices.add(matchingPdfIdx);
        const pdfClass = pdfClasses[matchingPdfIdx];
        alignedRows.push({
          day,
          timeKey: csvTimeKey,
          displayTime: csvClass.time,
          sortKey: csvSortKey,
          csvClass: csvClass,
          pdfClass: pdfClass,
          matchStatus: getMatchStatus(csvClass, pdfClass)
        });
      }
    });
    
    // Add remaining CSV classes
    csvClasses.forEach((csvClass, csvIdx) => {
      if (usedCsvIndices.has(csvIdx)) return;
      const csvTimeKey = normalizeTimeKey(csvClass.time);
      const csvSortKey = parseTimeToMinutes(csvClass.time);
      
      const pdfAtSameTime = pdfClasses.find((pdfClass, pdfIdx) => {
        if (usedPdfIndices.has(pdfIdx)) return false;
        return normalizeTimeKey(pdfClass.time) === csvTimeKey;
      });
      
      if (pdfAtSameTime) {
        const pdfIdx = pdfClasses.indexOf(pdfAtSameTime);
        usedPdfIndices.add(pdfIdx);
        alignedRows.push({
          day,
          timeKey: csvTimeKey,
          displayTime: csvClass.time,
          sortKey: csvSortKey,
          csvClass: csvClass,
          pdfClass: pdfAtSameTime,
          matchStatus: getMatchStatus(csvClass, pdfAtSameTime)
        });
      } else {
        alignedRows.push({
          day,
          timeKey: csvTimeKey,
          displayTime: csvClass.time,
          sortKey: csvSortKey,
          csvClass: csvClass,
          pdfClass: null,
          matchStatus: 'csv-only'
        });
      }
    });
    
    // Add remaining PDF classes
    pdfClasses.forEach((pdfClass, pdfIdx) => {
      if (usedPdfIndices.has(pdfIdx)) return;
      const pdfTimeKey = normalizeTimeKey(pdfClass.time);
      const pdfSortKey = parseTimeToMinutes(pdfClass.time);
      
      alignedRows.push({
        day,
        timeKey: pdfTimeKey,
        displayTime: pdfClass.time,
        sortKey: pdfSortKey,
        csvClass: null,
        pdfClass: pdfClass,
        matchStatus: 'pdf-only'
      });
    });
    
    alignedRows.sort((a, b) => a.sortKey - b.sortKey);
    return alignedRows;
  };

  // Collect all aligned data for all days
  const allAlignedData: AlignedRow[] = [];
  allDays.forEach(day => {
    allAlignedData.push(...buildAlignedDayData(day));
  });

  // Calculate totals for quick filter badges
  let totalMatches = 0;
  let totalTrainerMismatch = 0;
  let totalClassMismatch = 0;
  let totalTimeMismatch = 0;
  let totalCsvOnly = 0;
  let totalPdfOnly = 0;

  allAlignedData.forEach(row => {
    switch (row.matchStatus) {
      case 'match': totalMatches++; break;
      case 'trainer-mismatch': totalTrainerMismatch++; break;
      case 'class-mismatch': totalClassMismatch++; break;
      case 'time-mismatch': totalTimeMismatch++; break;
      case 'csv-only': totalCsvOnly++; break;
      case 'pdf-only': totalPdfOnly++; break;
    }
  });

  const totalMismatches = totalTrainerMismatch + totalClassMismatch + totalTimeMismatch;

  // Apply quick filter
  const filterRows = (rows: AlignedRow[]): AlignedRow[] => {
    if (quickFilter === 'all') return rows;
    if (quickFilter === 'matches') return rows.filter(row => row.matchStatus === 'match');
    return rows.filter(row => row.matchStatus === quickFilter);
  };

  // Get status label for mismatch type
  const getStatusLabel = (status: MismatchType): string => {
    switch (status) {
      case 'match': return 'Match';
      case 'trainer-mismatch': return 'Trainer Mismatch';
      case 'class-mismatch': return 'Class Mismatch';
      case 'time-mismatch': return 'Time Mismatch';
      case 'csv-only': return 'Not in PDF';
      case 'pdf-only': return 'Not in CSV';
    }
  };

  // Get status icon and label
  const getStatusInfo = (status: MismatchType): { icon: React.ReactNode; label: string; color: string } => {
    switch (status) {
      case 'match':
        return { 
          icon: <CheckCircle2 className="w-4 h-4 text-green-600" />, 
          label: 'Match',
          color: 'text-green-600'
        };
      case 'trainer-mismatch':
        return { 
          icon: <Users className="w-4 h-4 text-orange-500" />, 
          label: 'Trainer',
          color: 'text-orange-500'
        };
      case 'class-mismatch':
        return { 
          icon: <BookOpen className="w-4 h-4 text-purple-500" />, 
          label: 'Class',
          color: 'text-purple-500'
        };
      case 'time-mismatch':
        return { 
          icon: <Clock className="w-4 h-4 text-amber-500" />, 
          label: 'Time',
          color: 'text-amber-500'
        };
      case 'csv-only':
        return { 
          icon: <FileSpreadsheet className="w-4 h-4 text-blue-600" />, 
          label: 'CSV Only',
          color: 'text-blue-600'
        };
      case 'pdf-only':
        return { 
          icon: <FileText className="w-4 h-4 text-red-600" />, 
          label: 'PDF Only',
          color: 'text-red-600'
        };
    }
  };

  // Copy mismatched rows to clipboard as HTML table with inline styles
  const copyMismatchesToClipboard = () => {
    const mismatchedRows = allAlignedData.filter(row => row.matchStatus !== 'match');
    
    if (mismatchedRows.length === 0) {
      toast({
        title: "No Mismatches",
        description: "There are no mismatched rows to copy.",
        variant: "default",
      });
      return;
    }

    // Build HTML table with inline styles
    const html = `
<table style="border-collapse: collapse; font-family: Arial, sans-serif; font-size: 12px; width: 100%;">
  <thead>
    <tr style="background-color: #374151; color: white;">
      <th style="border: 1px solid #d1d5db; padding: 8px; text-align: left;">Day</th>
      <th style="border: 1px solid #d1d5db; padding: 8px; text-align: left; background-color: #3b82f6;">CSV Time</th>
      <th style="border: 1px solid #d1d5db; padding: 8px; text-align: left; background-color: #3b82f6;">CSV Class</th>
      <th style="border: 1px solid #d1d5db; padding: 8px; text-align: left; background-color: #3b82f6;">CSV Trainer</th>
      <th style="border: 1px solid #d1d5db; padding: 8px; text-align: left; background-color: #3b82f6;">CSV Location</th>
      <th style="border: 1px solid #d1d5db; padding: 8px; text-align: center; background-color: #6b7280;">Status</th>
      <th style="border: 1px solid #d1d5db; padding: 8px; text-align: left; background-color: #ef4444;">PDF Time</th>
      <th style="border: 1px solid #d1d5db; padding: 8px; text-align: left; background-color: #ef4444;">PDF Class</th>
      <th style="border: 1px solid #d1d5db; padding: 8px; text-align: left; background-color: #ef4444;">PDF Trainer</th>
      <th style="border: 1px solid #d1d5db; padding: 8px; text-align: left; background-color: #ef4444;">PDF Location</th>
    </tr>
  </thead>
  <tbody>
    ${mismatchedRows.map(row => {
      const statusLabel = getStatusLabel(row.matchStatus);
      const statusColor = row.matchStatus === 'trainer-mismatch' ? '#f97316' :
                          row.matchStatus === 'class-mismatch' ? '#a855f7' :
                          row.matchStatus === 'time-mismatch' ? '#f59e0b' :
                          row.matchStatus === 'csv-only' ? '#3b82f6' :
                          row.matchStatus === 'pdf-only' ? '#ef4444' : '#22c55e';
      
      return `
    <tr style="background-color: white;">
      <td style="border: 1px solid #d1d5db; padding: 8px;">${row.day}</td>
      <td style="border: 1px solid #d1d5db; padding: 8px;">${row.csvClass?.time || '—'}</td>
      <td style="border: 1px solid #d1d5db; padding: 8px;">${row.csvClass?.className || '—'}</td>
      <td style="border: 1px solid #d1d5db; padding: 8px;">${row.csvClass?.trainer1 || '—'}</td>
      <td style="border: 1px solid #d1d5db; padding: 8px;">${row.csvClass?.location || '—'}</td>
      <td style="border: 1px solid #d1d5db; padding: 8px; text-align: center; color: ${statusColor}; font-weight: bold;">${statusLabel}</td>
      <td style="border: 1px solid #d1d5db; padding: 8px;">${row.pdfClass?.time || '—'}</td>
      <td style="border: 1px solid #d1d5db; padding: 8px;">${row.pdfClass?.className || '—'}</td>
      <td style="border: 1px solid #d1d5db; padding: 8px;">${row.pdfClass?.trainer || '—'}</td>
      <td style="border: 1px solid #d1d5db; padding: 8px;">${row.pdfClass?.location || '—'}</td>
    </tr>`;
    }).join('')}
  </tbody>
</table>`;

    // Copy as HTML with fallback to plain text
    const plainText = mismatchedRows.map(row => 
      `${row.day}\t${row.csvClass?.time || '—'}\t${row.csvClass?.className || '—'}\t${row.csvClass?.trainer1 || '—'}\t${row.csvClass?.location || '—'}\t${getStatusLabel(row.matchStatus)}\t${row.pdfClass?.time || '—'}\t${row.pdfClass?.className || '—'}\t${row.pdfClass?.trainer || '—'}\t${row.pdfClass?.location || '—'}`
    ).join('\n');

    const header = 'Day\tCSV Time\tCSV Class\tCSV Trainer\tCSV Location\tStatus\tPDF Time\tPDF Class\tPDF Trainer\tPDF Location';
    const textWithHeader = header + '\n' + plainText;

    // Use the Clipboard API with HTML
    const blob = new Blob([html], { type: 'text/html' });
    const textBlob = new Blob([textWithHeader], { type: 'text/plain' });
    
    navigator.clipboard.write([
      new ClipboardItem({
        'text/html': blob,
        'text/plain': textBlob
      })
    ]).then(() => {
      setCopied(true);
      toast({
        title: "Copied to Clipboard",
        description: `${mismatchedRows.length} mismatched rows copied as a formatted table.`,
      });
      setTimeout(() => setCopied(false), 2000);
    }).catch(err => {
      // Fallback to plain text
      navigator.clipboard.writeText(textWithHeader).then(() => {
        setCopied(true);
        toast({
          title: "Copied to Clipboard",
          description: `${mismatchedRows.length} mismatched rows copied as plain text.`,
        });
        setTimeout(() => setCopied(false), 2000);
      });
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0">
        {/* Collapsible Filters */}
        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between mb-2">
              <span className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Filters {filters.location.length > 0 && `(Location: ${filters.location.join(', ')})`}
              </span>
              {filtersOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <FilterSection 
              data={csvData}
              filters={filters}
              onFilterChange={handleFilterChange}
              isComparisonView
            />
          </CollapsibleContent>
        </Collapsible>
        
        {/* Quick Filter Buttons */}
        <div className="flex flex-wrap gap-2 mt-2 p-3 bg-gray-50 rounded-lg border">
          <span className="text-sm font-medium text-gray-600 mr-2 flex items-center">Quick Filter:</span>
          
          <Button
            variant={quickFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setQuickFilter('all')}
            className="gap-1"
          >
            <ArrowLeftRight className="w-4 h-4" />
            All ({totalMatches + totalMismatches + totalCsvOnly + totalPdfOnly})
          </Button>
          
          <Button
            variant={quickFilter === 'matches' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setQuickFilter('matches')}
            className={`gap-1 ${quickFilter === 'matches' ? 'bg-green-600 hover:bg-green-700' : 'hover:bg-green-50 hover:border-green-300'}`}
          >
            <CheckCircle2 className="w-4 h-4" />
            Matches ({totalMatches})
          </Button>
          
          <Button
            variant={quickFilter === 'trainer-mismatch' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setQuickFilter('trainer-mismatch')}
            className={`gap-1 ${quickFilter === 'trainer-mismatch' ? 'bg-orange-500 hover:bg-orange-600' : 'hover:bg-orange-50 hover:border-orange-300'}`}
          >
            <Users className="w-4 h-4" />
            Trainer Mismatch ({totalTrainerMismatch})
          </Button>
          
          <Button
            variant={quickFilter === 'class-mismatch' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setQuickFilter('class-mismatch')}
            className={`gap-1 ${quickFilter === 'class-mismatch' ? 'bg-purple-500 hover:bg-purple-600' : 'hover:bg-purple-50 hover:border-purple-300'}`}
          >
            <BookOpen className="w-4 h-4" />
            Class Mismatch ({totalClassMismatch})
          </Button>
          
          <Button
            variant={quickFilter === 'time-mismatch' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setQuickFilter('time-mismatch')}
            className={`gap-1 ${quickFilter === 'time-mismatch' ? 'bg-amber-500 hover:bg-amber-600' : 'hover:bg-amber-50 hover:border-amber-300'}`}
          >
            <Clock className="w-4 h-4" />
            Time Mismatch ({totalTimeMismatch})
          </Button>
          
          <Button
            variant={quickFilter === 'csv-only' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setQuickFilter('csv-only')}
            className={`gap-1 ${quickFilter === 'csv-only' ? 'bg-blue-600 hover:bg-blue-700' : 'hover:bg-blue-50 hover:border-blue-300'}`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            Not in PDF ({totalCsvOnly})
          </Button>
          
          <Button
            variant={quickFilter === 'pdf-only' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setQuickFilter('pdf-only')}
            className={`gap-1 ${quickFilter === 'pdf-only' ? 'bg-red-600 hover:bg-red-700' : 'hover:bg-red-50 hover:border-red-300'}`}
          >
            <FileText className="w-4 h-4" />
            Not in CSV ({totalPdfOnly})
          </Button>
        </div>
        
        {/* Summary with Copy Button */}
        <div className="flex justify-between items-center mt-3 p-2">
          <Button
            variant="outline"
            size="sm"
            onClick={copyMismatchesToClipboard}
            className="gap-2"
          >
            {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy Mismatches'}
          </Button>
          <div className="text-sm text-gray-600">
            📊 CSV: <span className="font-semibold text-blue-600 mx-1">{filteredCsvData.length}</span> classes | 
            📋 PDF: <span className="font-semibold text-red-600 mx-1">{filteredPdfData.length}</span> classes
          </div>
        </div>
      </div>
      
      {/* Table View with auto-fit columns */}
      <div className="flex-1 flex flex-col min-h-0 border rounded-lg overflow-hidden mt-2">
        <div 
          ref={scrollRef}
          className="flex-1 overflow-auto"
        >
          {allDays.map(day => {
            const alignedData = buildAlignedDayData(day);
            const displayData = filterRows(alignedData);
            
            if (displayData.length === 0) return null;
            
            const matchCount = alignedData.filter(s => s.matchStatus === 'match').length;
            const mismatchCount = alignedData.filter(s => 
              s.matchStatus === 'trainer-mismatch' || 
              s.matchStatus === 'class-mismatch' || 
              s.matchStatus === 'time-mismatch'
            ).length;
            
            return (
              <div key={`aligned-${day}`} className="border-b-2 border-gray-300">
                {/* Day Header */}
                <div className="sticky top-0 bg-gray-800 px-4 py-2 font-semibold text-white border-b border-gray-200 z-20 h-10 flex items-center justify-between">
                  <span>{day}</span>
                  <span className="text-sm font-normal flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                      {matchCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      {mismatchCount}
                    </span>
                  </span>
                </div>
                
                {/* Table Header - using table for proper column sizing */}
                <table className="w-full table-auto border-collapse">
                  <thead className="sticky top-10 z-10">
                    <tr className="bg-gray-100 border-b border-gray-300">
                      {/* CSV Headers */}
                      <th className="px-3 py-2 text-xs font-semibold text-gray-700 text-left border-r border-gray-300 bg-blue-50 whitespace-nowrap">Time</th>
                      <th className="px-3 py-2 text-xs font-semibold text-gray-700 text-left border-r border-gray-300 bg-blue-50 whitespace-nowrap">Class</th>
                      <th className="px-3 py-2 text-xs font-semibold text-gray-700 text-left border-r border-gray-300 bg-blue-50 whitespace-nowrap">Trainer</th>
                      <th className="px-3 py-2 text-xs font-semibold text-gray-700 text-left border-r-2 border-gray-400 bg-blue-50 whitespace-nowrap">Location</th>
                      {/* Status column */}
                      <th className="px-3 py-2 text-xs font-bold text-gray-600 text-center bg-gray-200 whitespace-nowrap" style={{ minWidth: '100px' }}>Status</th>
                      {/* PDF Headers */}
                      <th className="px-3 py-2 text-xs font-semibold text-gray-700 text-left border-l-2 border-gray-400 border-r border-gray-300 bg-red-50 whitespace-nowrap">Time</th>
                      <th className="px-3 py-2 text-xs font-semibold text-gray-700 text-left border-r border-gray-300 bg-red-50 whitespace-nowrap">Class</th>
                      <th className="px-3 py-2 text-xs font-semibold text-gray-700 text-left border-r border-gray-300 bg-red-50 whitespace-nowrap">Trainer</th>
                      <th className="px-3 py-2 text-xs font-semibold text-gray-700 text-left bg-red-50 whitespace-nowrap">Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayData.length > 0 ? (
                      displayData.map((slot, idx) => {
                        const statusInfo = getStatusInfo(slot.matchStatus);
                        const isTrainerMismatch = slot.matchStatus === 'trainer-mismatch';
                        const isClassMismatch = slot.matchStatus === 'class-mismatch';
                        const isTimeMismatch = slot.matchStatus === 'time-mismatch';
                        
                        return (
                          <tr 
                            key={`row-${day}-${idx}`} 
                            className="border-b border-gray-200 bg-white hover:bg-gray-50"
                          >
                            {/* CSV Side */}
                            <td className={`px-3 py-2 text-xs font-mono whitespace-nowrap border-r border-gray-200 ${isTimeMismatch ? 'text-amber-600 font-semibold' : 'text-gray-800'} ${!slot.csvClass ? 'bg-gray-50' : ''}`}>
                              {slot.csvClass?.time || '—'}
                            </td>
                            <td className={`px-3 py-2 text-xs font-medium whitespace-nowrap border-r border-gray-200 ${isClassMismatch ? 'text-purple-600 font-semibold' : 'text-gray-800'} ${!slot.csvClass ? 'bg-gray-50 text-gray-400 italic' : ''}`} title={slot.csvClass?.className}>
                              {slot.csvClass?.className || '—'}
                            </td>
                            <td className={`px-3 py-2 text-xs whitespace-nowrap border-r border-gray-200 ${isTrainerMismatch ? 'text-orange-600 font-semibold' : 'text-gray-700'} ${!slot.csvClass ? 'bg-gray-50 text-gray-400 italic' : ''}`} title={slot.csvClass?.trainer1}>
                              {slot.csvClass?.trainer1 || '—'}
                            </td>
                            <td className={`px-3 py-2 text-xs whitespace-nowrap border-r-2 border-gray-400 text-gray-600 ${!slot.csvClass ? 'bg-gray-50 text-gray-400 italic' : ''}`} title={slot.csvClass?.location}>
                              {slot.csvClass?.location || '—'}
                            </td>
                            
                            {/* Status Indicator */}
                            <td className="px-3 py-2 text-center bg-gray-50 whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1">
                                {statusInfo.icon}
                                <span className={`text-xs font-medium ${statusInfo.color}`}>{statusInfo.label}</span>
                              </div>
                            </td>
                            
                            {/* PDF Side */}
                            <td className={`px-3 py-2 text-xs font-mono whitespace-nowrap border-l-2 border-gray-400 border-r border-gray-200 ${isTimeMismatch ? 'text-amber-600 font-semibold' : 'text-gray-800'} ${!slot.pdfClass ? 'bg-gray-50' : ''}`}>
                              {slot.pdfClass?.time || '—'}
                            </td>
                            <td className={`px-3 py-2 text-xs font-medium whitespace-nowrap border-r border-gray-200 ${isClassMismatch ? 'text-purple-600 font-semibold' : 'text-gray-800'} ${!slot.pdfClass ? 'bg-gray-50 text-gray-400 italic' : ''}`} title={slot.pdfClass?.className}>
                              {slot.pdfClass?.className || '—'}
                            </td>
                            <td className={`px-3 py-2 text-xs whitespace-nowrap border-r border-gray-200 ${isTrainerMismatch ? 'text-orange-600 font-semibold' : 'text-gray-700'} ${!slot.pdfClass ? 'bg-gray-50 text-gray-400 italic' : ''}`} title={slot.pdfClass?.trainer}>
                              {slot.pdfClass?.trainer || '—'}
                            </td>
                            <td className={`px-3 py-2 text-xs whitespace-nowrap text-gray-600 ${!slot.pdfClass ? 'bg-gray-50 text-gray-400 italic' : ''}`} title={slot.pdfClass?.location}>
                              {slot.pdfClass?.location || '—'}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={9} className="h-12 text-center text-gray-500 text-sm bg-white">No classes for this day</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Legend */}
      <div className="flex-shrink-0 mt-3 p-3 bg-gray-50 border rounded-lg">
        <div className="text-sm font-medium mb-2 text-gray-700">Legend:</div>
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <span className="text-gray-700">Match - All fields align</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-orange-500" />
            <span className="text-gray-700">Trainer Mismatch</span>
          </div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-purple-500" />
            <span className="text-gray-700">Class Mismatch</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            <span className="text-gray-700">Time Mismatch</span>
          </div>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-blue-600" />
            <span className="text-gray-700">Not in PDF</span>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-red-600" />
            <span className="text-gray-700">Not in CSV</span>
          </div>
        </div>
      </div>
    </div>
  );
}
