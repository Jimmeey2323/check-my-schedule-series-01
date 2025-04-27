
import React, { useState, useEffect } from 'react';
import { ClassData, PdfClassData, FilterState, ComparisonResult } from '@/types/schedule';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { FilterSection } from '../FilterSection';
import { passesFilters } from '@/utils/filterUtils';

interface ComparisonViewerProps {
  csvData: {[day: string]: ClassData[]} | null;
  pdfData: PdfClassData[] | null;
}

export function ComparisonViewer({ csvData, pdfData }: ComparisonViewerProps) {
  const [comparisonResults, setComparisonResults] = useState<ComparisonResult[]>([]);
  const [filters, setFilters] = useState<FilterState>({ day: [], location: [], trainer: [], className: [] });
  const [statusFilter, setStatusFilter] = useState<'all' | 'match' | 'mismatch'>('all');
  const [unmatchReasonFilter, setUnmatchReasonFilter] = useState<string[]>([]);
  const [filteredResults, setFilteredResults] = useState<ComparisonResult[]>([]);
  
  useEffect(() => {
    if (csvData && pdfData) {
      compareData(csvData, pdfData);
    } else {
      setComparisonResults([]);
    }
  }, [csvData, pdfData]);
  
  useEffect(() => {
    let results = [...comparisonResults];
    
    // Apply status filter
    if (statusFilter === 'match') {
      results = results.filter(result => result.isMatch);
    } else if (statusFilter === 'mismatch') {
      results = results.filter(result => !result.isMatch);
    }
    
    // Apply unmatch reason filter if any selected
    if (unmatchReasonFilter.length > 0) {
      results = results.filter(result => 
        unmatchReasonFilter.some(reason => result.unmatchReason.includes(reason))
      );
    }
    
    // Apply general filters
    results = results.filter(result => {
      const csvItem = result.csvItem;
      const pdfItem = result.pdfItem;
      
      // If no CSV item, check PDF item against filters
      if (!csvItem && pdfItem) {
        return passesFilters(
          { day: pdfItem.day, location: pdfItem.location, trainer: pdfItem.trainer, className: pdfItem.className },
          filters
        );
      }
      
      // If no PDF item, check CSV item against filters
      if (csvItem && !pdfItem) {
        return passesFilters(
          { day: csvItem.day, location: csvItem.location, trainer: csvItem.trainer1, className: csvItem.className },
          filters
        );
      }
      
      // If both exist, check if either passes filters
      if (csvItem && pdfItem) {
        return passesFilters(
          { day: csvItem.day, location: csvItem.location, trainer: csvItem.trainer1, className: csvItem.className },
          filters
        ) || passesFilters(
          { day: pdfItem.day, location: pdfItem.location, trainer: pdfItem.trainer, className: pdfItem.className },
          filters
        );
      }
      
      return false;
    });
    
    setFilteredResults(results);
  }, [comparisonResults, filters, statusFilter, unmatchReasonFilter]);
  
  const compareData = (csvData: {[day: string]: ClassData[]}, pdfData: PdfClassData[]) => {
    // Flatten CSV data into array
    let csvClasses: ClassData[] = [];
    Object.values(csvData).forEach(arr => {
      csvClasses = csvClasses.concat(arr);
    });
    
    // Create maps by uniqueKey for quick lookup
    const csvMap = new Map<string, ClassData>();
    csvClasses.forEach(item => {
      csvMap.set(item.uniqueKey, item);
    });
    
    const pdfMap = new Map<string, PdfClassData>();
    pdfData.forEach(item => {
      pdfMap.set(item.uniqueKey, item);
    });
    
    // Create union of keys
    const allKeys = new Set<string>([...csvMap.keys(), ...pdfMap.keys()]);
    
    // Build comparison results
    const results: ComparisonResult[] = Array.from(allKeys).map(key => {
      const csvItem = csvMap.get(key) || null;
      const pdfItem = pdfMap.get(key) || null;
      
      let isMatch = false;
      let unmatchReason = '';
      let discrepancyCols: string[] = [];
      
      if (csvItem && pdfItem) {
        // Compare relevant fields
        const dayMatch = csvItem.day === pdfItem.day;
        const timeMatch = csvItem.time === pdfItem.time;
        const classMatch = csvItem.className === pdfItem.className;
        const trainerMatch = csvItem.trainer1 === pdfItem.trainer;
        
        isMatch = dayMatch && timeMatch && classMatch && trainerMatch;
        
        if (!isMatch) {
          if (!dayMatch) discrepancyCols.push('Day');
          if (!timeMatch) discrepancyCols.push('Time');
          if (!classMatch) discrepancyCols.push('Class Name');
          if (!trainerMatch) discrepancyCols.push('Trainer Name');
          unmatchReason = 'Mismatch in ' + discrepancyCols.join(', ');
        }
      } else if (csvItem && !pdfItem) {
        unmatchReason = 'Missing in PDF';
      } else if (!csvItem && pdfItem) {
        unmatchReason = 'Missing in CSV';
      }
      
      return {
        csvItem,
        pdfItem,
        isMatch,
        unmatchReason,
        discrepancyCols
      };
    });
    
    // Sort by key for consistent order
    results.sort((a, b) => {
      const keyA = a.csvItem?.uniqueKey || a.pdfItem?.uniqueKey || '';
      const keyB = b.csvItem?.uniqueKey || b.pdfItem?.uniqueKey || '';
      return keyA.localeCompare(keyB);
    });
    
    setComparisonResults(results);
    
    // Generate unmatch reason options for filtering
    const reasons = new Set<string>();
    results
      .filter(r => !r.isMatch)
      .forEach(r => {
        if (r.unmatchReason) {
          if (r.unmatchReason.startsWith('Mismatch in')) {
            r.discrepancyCols.forEach(col => reasons.add(`Mismatch in ${col}`));
          } else {
            reasons.add(r.unmatchReason);
          }
        }
      });
    
    // Show toast with comparison results
    const matchCount = results.filter(r => r.isMatch).length;
    const mismatchCount = results.length - matchCount;
    
    toast({
      title: "Comparison Complete",
      description: `Found ${matchCount} matches and ${mismatchCount} mismatches.`,
      variant: mismatchCount > 0 ? "destructive" : "default",
    });
  };
  
  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
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
  
  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="mb-4 space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button
            variant={statusFilter === 'all' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('all')}
            className="text-sm"
          >
            All Results
          </Button>
          <Button
            variant={statusFilter === 'match' ? 'default' : 'outline'} 
            onClick={() => setStatusFilter('match')}
            className="text-sm"
          >
            Matches Only
          </Button>
          <Button
            variant={statusFilter === 'mismatch' ? 'default' : 'outline'} 
            onClick={() => setStatusFilter('mismatch')}
            className="text-sm"
          >
            Mismatches Only
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setFilters({ day: [], location: [], trainer: [], className: [] });
              setStatusFilter('all');
              setUnmatchReasonFilter([]);
            }}
            className="text-sm ml-auto"
          >
            Clear Filters
          </Button>
        </div>
        
        <FilterSection 
          data={csvData}
          filters={filters}
          onFilterChange={handleFilterChange}
          isComparisonView
        />
      </div>
      
      <Card className="flex-grow overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto h-full">
            <Table>
              <TableHeader className="sticky top-0 z-10">
                <TableRow>
                  <TableHead className="bg-blue-600 text-white">Status</TableHead>
                  <TableHead className="bg-blue-600 text-white">Issue</TableHead>
                  <TableHead className="bg-blue-600 text-white">Day</TableHead>
                  <TableHead className="bg-blue-600 text-white">Time</TableHead>
                  <TableHead className="bg-blue-600 text-white">Location</TableHead>
                  <TableHead className="bg-blue-600 text-white">Class</TableHead>
                  <TableHead className="bg-blue-600 text-white">CSV Trainer</TableHead>
                  <TableHead className="bg-blue-600 text-white">PDF Trainer</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredResults.length > 0 ? (
                  filteredResults.map((result, index) => (
                    <TableRow key={index} className={result.isMatch ? "hover:bg-green-50" : "hover:bg-red-50"}>
                      <TableCell 
                        className={result.isMatch 
                          ? "bg-green-100 text-green-800 font-semibold text-center" 
                          : "bg-red-100 text-red-800 font-semibold text-center"}
                      >
                        {result.isMatch ? 'Match' : 'Mismatch'}
                      </TableCell>
                      <TableCell>{result.unmatchReason}</TableCell>
                      <TableCell>
                        {result.csvItem?.day || ''} 
                        {result.pdfItem?.day && result.csvItem?.day !== result.pdfItem?.day && (
                          <span className="text-red-500 block">PDF: {result.pdfItem.day}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {result.csvItem?.time || ''}
                        {result.pdfItem?.time && result.csvItem?.time !== result.pdfItem?.time && (
                          <span className="text-red-500 block">PDF: {result.pdfItem.time}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {result.csvItem?.location || result.pdfItem?.location || ''}
                      </TableCell>
                      <TableCell>
                        {result.csvItem?.className || ''}
                        {result.pdfItem?.className && result.csvItem?.className !== result.pdfItem?.className && (
                          <span className="text-red-500 block">PDF: {result.pdfItem.className}</span>
                        )}
                      </TableCell>
                      <TableCell>{result.csvItem?.trainer1 || '-'}</TableCell>
                      <TableCell>{result.pdfItem?.trainer || '-'}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      No results match your current filters
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
