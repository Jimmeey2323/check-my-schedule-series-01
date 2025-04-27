
import React, { useState, useEffect } from 'react';
import { ClassData, PdfClassData, FilterState, ComparisonResult } from '@/types/schedule';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { FilterSection } from '../FilterSection';
import { passesFilters } from '@/utils/filterUtils';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface ComparisonViewerProps {
  csvData: {[day: string]: ClassData[]} | null;
  pdfData: PdfClassData[] | null;
}

interface DrillDownData {
  csvItem: ClassData | null;
  pdfItem: PdfClassData | null;
  isMatch: boolean;
  unmatchReason: string;
  discrepancyCols: string[];
}

export function ComparisonViewer({ csvData, pdfData }: ComparisonViewerProps) {
  const [comparisonResults, setComparisonResults] = useState<ComparisonResult[]>([]);
  const [filters, setFilters] = useState<FilterState>({ day: [], location: [], trainer: [], className: [] });
  const [statusFilter, setStatusFilter] = useState<'all' | 'match' | 'mismatch'>('all');
  const [unmatchReasonFilter, setUnmatchReasonFilter] = useState<string[]>([]);
  const [filteredResults, setFilteredResults] = useState<ComparisonResult[]>([]);
  const [selectedDrillDown, setSelectedDrillDown] = useState<DrillDownData | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  
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
    
    // Apply filters
    results = results.filter(result => passesFilters(
      { 
        day: result.csvItem?.day || result.pdfItem?.day || '',
        location: result.csvItem?.location || result.pdfItem?.location || '',
        trainer: result.csvItem?.trainer1 || result.pdfItem?.trainer || '',
        className: result.csvItem?.className || result.pdfItem?.className || ''
      },
      filters
    ));
    
    setFilteredResults(results);
  }, [comparisonResults, filters, statusFilter]);
  
  const compareData = (csvData: {[day: string]: ClassData[]}, pdfData: PdfClassData[]) => {
    // Flatten CSV data into array
    let csvClasses: ClassData[] = [];
    Object.values(csvData).forEach(arr => {
      csvClasses = csvClasses.concat(arr);
    });
    
    // Create sets for matching
    const results: ComparisonResult[] = [];
    const matchedPdfKeys = new Set<string>();
    const matchedCsvKeys = new Set<string>();
    
    // First pass: Find exact matches and close matches (only trainer differs)
    csvClasses.forEach(csvItem => {
      let found = false;
      
      pdfData.forEach(pdfItem => {
        if (matchedPdfKeys.has(pdfItem.uniqueKey)) return;
        
        const dayMatch = csvItem.day === pdfItem.day;
        const timeMatch = csvItem.time === pdfItem.time;
        const classMatch = csvItem.className === pdfItem.className;
        const trainerMatch = csvItem.trainer1 === pdfItem.trainer;
        
        // Check for match
        if (dayMatch && timeMatch && classMatch) {
          found = true;
          matchedPdfKeys.add(pdfItem.uniqueKey);
          matchedCsvKeys.add(csvItem.uniqueKey);
          
          const discrepancyCols = [];
          if (!trainerMatch) discrepancyCols.push('Trainer Name');
          
          results.push({
            csvItem,
            pdfItem,
            isMatch: trainerMatch,
            unmatchReason: trainerMatch ? '' : 'Trainer Name Mismatch',
            discrepancyCols
          });
          return;
        }
      });
      
      // If no match found, add as CSV-only entry
      if (!found) {
        results.push({
          csvItem,
          pdfItem: null,
          isMatch: false,
          unmatchReason: 'Missing in PDF',
          discrepancyCols: []
        });
      }
    });
    
    // Add remaining unmatched PDF entries
    pdfData.forEach(pdfItem => {
      if (!matchedPdfKeys.has(pdfItem.uniqueKey)) {
        results.push({
          csvItem: null,
          pdfItem,
          isMatch: false,
          unmatchReason: 'Missing in CSV',
          discrepancyCols: []
        });
      }
    });
    
    // Sort results by day and time
    results.sort((a, b) => {
      const dayA = a.csvItem?.day || a.pdfItem?.day || '';
      const dayB = b.csvItem?.day || b.pdfItem?.day || '';
      if (dayA !== dayB) return dayA.localeCompare(dayB);
      
      const timeA = a.csvItem?.time || a.pdfItem?.time || '';
      const timeB = b.csvItem?.time || b.pdfItem?.time || '';
      return timeA.localeCompare(timeB);
    });
    
    setComparisonResults(results);
    
    // Show comparison summary
    const matchCount = results.filter(r => r.isMatch).length;
    const mismatchCount = results.length - matchCount;
    
    toast({
      title: "Comparison Complete",
      description: `Found ${matchCount} matches and ${mismatchCount} discrepancies.`,
      variant: mismatchCount > 0 ? "destructive" : "default",
    });
  };
  
  const handleRowClick = (result: ComparisonResult) => {
    setSelectedDrillDown({
      csvItem: result.csvItem,
      pdfItem: result.pdfItem,
      isMatch: result.isMatch,
      unmatchReason: result.unmatchReason,
      discrepancyCols: result.discrepancyCols
    });
    setIsSheetOpen(true);
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
    <div className="flex flex-col h-full overflow-hidden">
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
          onFilterChange={setFilters}
          isComparisonView
        />
      </div>
      
      <Card className="flex-grow overflow-hidden">
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-300px)]">
            <Table>
              <TableHeader className="sticky top-0 z-10">
                <TableRow>
                  <TableHead className="bg-blue-600 text-white">Status</TableHead>
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
                    <TableRow 
                      key={index} 
                      className={result.isMatch ? "hover:bg-green-50 cursor-pointer" : "hover:bg-red-50 cursor-pointer"}
                      onClick={() => handleRowClick(result)}
                    >
                      <TableCell 
                        className={result.isMatch 
                          ? "bg-green-100 text-green-800 font-semibold text-center" 
                          : "bg-red-100 text-red-800 font-semibold text-center"}
                      >
                        {result.isMatch ? 'Match' : result.unmatchReason}
                      </TableCell>
                      <TableCell>{result.csvItem?.day || result.pdfItem?.day || '-'}</TableCell>
                      <TableCell>{result.csvItem?.time || result.pdfItem?.time || '-'}</TableCell>
                      <TableCell>
                        {result.csvItem?.location || result.pdfItem?.location || '-'}
                      </TableCell>
                      <TableCell>
                        {result.csvItem?.className || result.pdfItem?.className || '-'}
                      </TableCell>
                      <TableCell>{result.csvItem?.trainer1 || '-'}</TableCell>
                      <TableCell>{result.pdfItem?.trainer || '-'}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      No results match your current filters
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
      
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Class Details</SheetTitle>
            <SheetDescription>
              Detailed comparison of class information
            </SheetDescription>
          </SheetHeader>
          
          {selectedDrillDown && (
            <div className="mt-6 space-y-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">
                  {selectedDrillDown.isMatch ? (
                    <span className="text-green-600">Matching Class</span>
                  ) : (
                    <span className="text-red-600">Discrepancy Found</span>
                  )}
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">CSV Data</h4>
                    {selectedDrillDown.csvItem ? (
                      <div className="space-y-1">
                        <p><span className="font-medium">Day:</span> {selectedDrillDown.csvItem.day}</p>
                        <p><span className="font-medium">Time:</span> {selectedDrillDown.csvItem.time}</p>
                        <p><span className="font-medium">Class:</span> {selectedDrillDown.csvItem.className}</p>
                        <p><span className="font-medium">Trainer:</span> {selectedDrillDown.csvItem.trainer1}</p>
                        <p><span className="font-medium">Location:</span> {selectedDrillDown.csvItem.location}</p>
                        {selectedDrillDown.csvItem.notes && (
                          <p><span className="font-medium">Notes:</span> {selectedDrillDown.csvItem.notes}</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No CSV data available</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">PDF Data</h4>
                    {selectedDrillDown.pdfItem ? (
                      <div className="space-y-1">
                        <p><span className="font-medium">Day:</span> {selectedDrillDown.pdfItem.day}</p>
                        <p><span className="font-medium">Time:</span> {selectedDrillDown.pdfItem.time}</p>
                        <p><span className="font-medium">Class:</span> {selectedDrillDown.pdfItem.className}</p>
                        <p><span className="font-medium">Trainer:</span> {selectedDrillDown.pdfItem.trainer}</p>
                        <p><span className="font-medium">Location:</span> {selectedDrillDown.pdfItem.location}</p>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No PDF data available</p>
                    )}
                  </div>
                </div>
                
                {!selectedDrillDown.isMatch && (
                  <div className="mt-4 p-4 bg-red-50 rounded-md">
                    <h4 className="font-medium text-red-800">Discrepancy Details</h4>
                    <p className="text-red-700">{selectedDrillDown.unmatchReason}</p>
                    {selectedDrillDown.discrepancyCols.length > 0 && (
                      <p className="text-red-700 mt-2">
                        Fields with differences: {selectedDrillDown.discrepancyCols.join(', ')}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
