
import React, { useState, useEffect, useRef } from 'react';
import { ClassData, PdfClassData, FilterState } from '@/types/schedule';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { FilterSection } from '../FilterSection';
import { passesFilters } from '@/utils/filterUtils';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SideBySideViewerProps {
  csvData: {[day: string]: ClassData[]} | null;
  pdfData: PdfClassData[] | null;
}

type ViewMode = 'table' | 'cards' | 'compact' | 'detailed' | 'calendar';

export function SideBySideViewer({ csvData, pdfData }: SideBySideViewerProps) {
  const [filters, setFilters] = useState<FilterState>({ day: [], location: [], trainer: [], className: [] });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [flattenedCsvData, setFlattenedCsvData] = useState<ClassData[]>([]);
  const [filteredCsvData, setFilteredCsvData] = useState<ClassData[]>([]);
  const [filteredPdfData, setFilteredPdfData] = useState<PdfClassData[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  
  // Refs for synchronized scrolling
  const csvScrollRef = useRef<HTMLDivElement>(null);
  const pdfScrollRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
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
    setCurrentPage(1);
  }, [csvData, pdfData, flattenedCsvData, filters]);
  
  // Calculate pagination
  const paginatedCsvData = filteredCsvData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  
  const paginatedPdfData = filteredPdfData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  
  const totalPages = Math.max(
    Math.ceil(filteredCsvData.length / itemsPerPage),
    Math.ceil(filteredPdfData.length / itemsPerPage)
  );
  
  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    localStorage.setItem('csvFilters', JSON.stringify(newFilters));
  };
  
  // Synchronized scrolling handlers
  const handleCsvScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (isScrollingRef.current) return;
    
    const element = e.currentTarget;
    const scrollTop = element.scrollTop;
    const scrollLeft = element.scrollLeft;
    
    isScrollingRef.current = true;
    
    if (pdfScrollRef.current) {
      pdfScrollRef.current.scrollTop = scrollTop;
      pdfScrollRef.current.scrollLeft = scrollLeft;
    }
    
    // Clear any existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    // Reset the scrolling flag after a short delay
    scrollTimeoutRef.current = setTimeout(() => {
      isScrollingRef.current = false;
    }, 100);
  };
  
  const handlePdfScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (isScrollingRef.current) return;
    
    const element = e.currentTarget;
    const scrollTop = element.scrollTop;
    const scrollLeft = element.scrollLeft;
    
    isScrollingRef.current = true;
    
    if (csvScrollRef.current) {
      csvScrollRef.current.scrollTop = scrollTop;
      csvScrollRef.current.scrollLeft = scrollLeft;
    }
    
    // Clear any existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    // Reset the scrolling flag after a short delay
    scrollTimeoutRef.current = setTimeout(() => {
      isScrollingRef.current = false;
    }, 100);
  };
  
  // Pagination handlers
  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };
  
  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };
  
  const handlePageClick = (page: number) => {
    setCurrentPage(page);
  };
  
  if (!csvData || !pdfData) {
    return (
      <Card className="flex flex-col items-center justify-center p-8">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Side-by-Side Comparison Not Available</h2>
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
  
  // View mode options
  const renderTableView = () => {
    // Group data by day for better comparison
    const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const groupedCsvData: {[day: string]: ClassData[]} = {};
    const groupedPdfData: {[day: string]: PdfClassData[]} = {};
    
    // Group filtered data by day
    filteredCsvData.forEach(item => {
      if (!groupedCsvData[item.day]) groupedCsvData[item.day] = [];
      groupedCsvData[item.day].push(item);
    });
    
    filteredPdfData.forEach(item => {
      if (!groupedPdfData[item.day]) groupedPdfData[item.day] = [];
      groupedPdfData[item.day].push(item);
    });
    
    // Get all available days
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

    return (
      <div className="flex gap-4 mt-4 flex-1 min-h-0">
        {/* CSV Table */}
        <div className="flex-1 flex flex-col glass-card rounded-lg overflow-hidden animate-slideUp">
          <div className="px-4 py-3 gradient-primary text-white font-semibold text-center">
            📊 CSV Schedule ({filteredCsvData.length} classes)
          </div>
          <div 
            ref={csvScrollRef}
            className="flex-1 overflow-auto"
            onScroll={handleCsvScroll}
          >
            {allDays.map(day => {
              const dayClasses = groupedCsvData[day] || [];
              return (
                <div key={`csv-${day}`} className="border-b border-gray-100">
                  <div className="sticky top-0 bg-blue-50 px-4 py-2 font-medium text-blue-800 border-b border-blue-200 z-10">
                    {day} ({dayClasses.length} classes)
                  </div>
                  {dayClasses.length > 0 ? (
                    <table className="w-full">
                      <thead className="bg-blue-100 sticky top-8 z-10">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-blue-700">Time</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-blue-700">Class</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-blue-700">Trainer</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-blue-700">Location</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dayClasses.map((item, idx) => (
                          <tr key={`csv-${day}-${idx}`} className="hover:bg-blue-50 border-b border-gray-100">
                            <td className="px-3 py-2 text-sm">{item.time}</td>
                            <td className="px-3 py-2 text-sm font-medium">{item.className}</td>
                            <td className="px-3 py-2 text-sm">{item.trainer1}</td>
                            <td className="px-3 py-2 text-sm">{item.location}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="px-4 py-8 text-center text-gray-500 text-sm">No classes for {day}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        
        {/* PDF Table */}
        <div className="flex-1 flex flex-col glass-card rounded-lg overflow-hidden animate-slideUp">
          <div className="px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold text-center">
            📋 PDF Schedule ({filteredPdfData.length} classes)
          </div>
          <div 
            ref={pdfScrollRef}
            className="flex-1 overflow-auto"
            onScroll={handlePdfScroll}
          >
            {allDays.map(day => {
              const dayClasses = groupedPdfData[day] || [];
              return (
                <div key={`pdf-${day}`} className="border-b border-gray-100">
                  <div className="sticky top-0 bg-red-50 px-4 py-2 font-medium text-red-800 border-b border-red-200 z-10">
                    {day} ({dayClasses.length} classes)
                  </div>
                  {dayClasses.length > 0 ? (
                    <table className="w-full">
                      <thead className="bg-red-100 sticky top-8 z-10">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-red-700">Time</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-red-700">Class</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-red-700">Trainer</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-red-700">Location</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dayClasses.map((item, idx) => {
                          // Check for mismatch with CSV data
                          const csvMatch = groupedCsvData[day]?.find(csv => 
                            csv.time === item.time && csv.className === item.className
                          );
                          const hasMismatch = csvMatch && csvMatch.trainer1 !== item.trainer;
                          
                          return (
                            <tr 
                              key={`pdf-${day}-${idx}`} 
                              className={`hover:bg-red-50 border-b border-gray-100 ${hasMismatch ? 'bg-yellow-50' : ''}`}
                            >
                              <td className="px-3 py-2 text-sm">{item.time}</td>
                              <td className="px-3 py-2 text-sm font-medium">{item.className}</td>
                              <td className={`px-3 py-2 text-sm ${hasMismatch ? 'text-red-600 font-semibold' : ''}`}>
                                {item.trainer}
                                {hasMismatch && <span className="ml-1">⚠️</span>}
                              </td>
                              <td className="px-3 py-2 text-sm">{item.location}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <div className="px-4 py-8 text-center text-gray-500 text-sm">No classes for {day}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };
  
  const renderCardsView = () => {
    return (
      <div className="flex flex-col md:flex-row gap-4 mt-4 flex-1 min-h-0">
        {/* CSV Cards */}
        <div className="flex-1 flex flex-col glass-card rounded-md p-2 overflow-hidden animate-slideUp">
          <div className="p-2 font-semibold text-center mb-2 text-gradient-primary">
            CSV Schedule ({filteredCsvData.length} classes)
          </div>
          <div 
            ref={csvScrollRef}
            className="flex-1 overflow-auto"
            onScroll={handleCsvScroll}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-2">
              {paginatedCsvData.length > 0 ? (
                paginatedCsvData.map((item, idx) => (
                  <Card key={`csv-card-${idx}`}>
                    <CardContent className="p-4">
                      <div className="font-bold text-lg mb-1">{item.className}</div>
                      <div><span className="font-medium">Day:</span> {item.day}</div>
                      <div><span className="font-medium">Time:</span> {item.time}</div>
                      <div><span className="font-medium">Trainer:</span> {item.trainer1}</div>
                      <div><span className="font-medium">Location:</span> {item.location}</div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="col-span-2 text-center py-8">No CSV data matches your filters</div>
              )}
            </div>
          </div>
        </div>
        
        {/* PDF Cards */}
        <div className="flex-1 flex flex-col glass-card rounded-md p-2 overflow-hidden animate-slideUp">
          <div className="p-2 font-semibold text-center mb-2 text-red-600">
            PDF Schedule ({filteredPdfData.length} classes)
          </div>
          <div 
            ref={pdfScrollRef}
            className="flex-1 overflow-auto"
            onScroll={handlePdfScroll}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-2">
              {paginatedPdfData.length > 0 ? (
                paginatedPdfData.map((item, idx) => (
                  <Card key={`pdf-card-${idx}`}>
                    <CardContent className="p-4">
                      <div className="font-bold text-lg mb-1">{item.className}</div>
                      <div><span className="font-medium">Day:</span> {item.day}</div>
                      <div><span className="font-medium">Time:</span> {item.time}</div>
                      <div><span className="font-medium">Trainer:</span> {item.trainer}</div>
                      <div><span className="font-medium">Location:</span> {item.location}</div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="col-span-2 text-center py-8">No PDF data matches your filters</div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  const renderCompactView = () => {
    return (
      <div className="flex flex-col mt-4 flex-1 min-h-0">
        <ScrollArea className="flex-1">
          <Table>
            <TableHeader className="sticky top-0 z-10">
              <TableRow>
                <TableHead className="bg-gray-700 text-white">Day</TableHead>
                <TableHead className="bg-blue-600 text-white">CSV Class</TableHead>
                <TableHead className="bg-red-600 text-white">PDF Class</TableHead>
                <TableHead className="bg-blue-600 text-white">CSV Time</TableHead>
                <TableHead className="bg-red-600 text-white">PDF Time</TableHead>
                <TableHead className="bg-blue-600 text-white">CSV Location</TableHead>
                <TableHead className="bg-red-600 text-white">PDF Location</TableHead>
                <TableHead className="bg-blue-600 text-white">CSV Trainer</TableHead>
                <TableHead className="bg-red-600 text-white">PDF Trainer</TableHead>
                <TableHead className="bg-gray-700 text-white">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedCsvData.map((csvItem, idx) => {
                const matchingPdfItem = filteredPdfData.find(pdf => 
                  pdf.day === csvItem.day && 
                  pdf.time === csvItem.time && 
                  pdf.className === csvItem.className
                );
                
                const status = matchingPdfItem 
                  ? (matchingPdfItem.trainer === csvItem.trainer1 ? 'Match' : 'Trainer Mismatch')
                  : 'Missing in PDF';
                  
                const statusColor = status === 'Match' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
                
                return (
                  <TableRow key={`compact-${idx}`} className="hover:bg-gray-50">
                    <TableCell>{csvItem.day}</TableCell>
                    <TableCell className="bg-blue-50">{csvItem.className}</TableCell>
                    <TableCell className="bg-red-50">{matchingPdfItem?.className || '-'}</TableCell>
                    <TableCell className="bg-blue-50">{csvItem.time}</TableCell>
                    <TableCell className="bg-red-50">{matchingPdfItem?.time || '-'}</TableCell>
                    <TableCell className="bg-blue-50">{csvItem.location}</TableCell>
                    <TableCell className="bg-red-50">{matchingPdfItem?.location || '-'}</TableCell>
                    <TableCell className="bg-blue-50">{csvItem.trainer1}</TableCell>
                    <TableCell className="bg-red-50">{matchingPdfItem?.trainer || '-'}</TableCell>
                    <TableCell className={statusColor}>{status}</TableCell>
                  </TableRow>
                );
              })}
              
              {paginatedPdfData
                .filter(pdfItem => 
                  !paginatedCsvData.some(csv => 
                    csv.day === pdfItem.day && 
                    csv.time === pdfItem.time && 
                    csv.className === pdfItem.className
                  )
                )
                .map((pdfItem, idx) => (
                  <TableRow key={`pdf-only-${idx}`} className="hover:bg-gray-50">
                    <TableCell>{pdfItem.day}</TableCell>
                    <TableCell className="bg-blue-50">-</TableCell>
                    <TableCell className="bg-red-50">{pdfItem.className}</TableCell>
                    <TableCell className="bg-blue-50">-</TableCell>
                    <TableCell className="bg-red-50">{pdfItem.time}</TableCell>
                    <TableCell className="bg-blue-50">-</TableCell>
                    <TableCell className="bg-red-50">{pdfItem.location}</TableCell>
                    <TableCell className="bg-blue-50">-</TableCell>
                    <TableCell className="bg-red-50">{pdfItem.trainer}</TableCell>
                    <TableCell className="bg-red-100 text-red-800">Missing in CSV</TableCell>
                  </TableRow>
                ))
              }
              
              {paginatedCsvData.length === 0 && paginatedPdfData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8">No data matches your filters</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
    );
  };
  
  const renderDetailedView = () => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const visibleDays = filters.day.length > 0 ? filters.day : days;
    
    return (
      <div className="mt-4 flex-1 min-h-0 overflow-auto">
        <ScrollArea className="h-full">
          {visibleDays.map((day) => {
            const csvDayData = filteredCsvData.filter(item => item.day === day);
            const pdfDayData = filteredPdfData.filter(item => item.day === day);
            
            if (csvDayData.length === 0 && pdfDayData.length === 0) return null;
            
            return (
              <div key={day} className="mb-8">
                <h3 className="text-lg font-bold mb-2 bg-gray-100 p-2 rounded">{day}</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-2 bg-blue-100 p-1 rounded">CSV Schedule</h4>
                    {csvDayData.length > 0 ? (
                      <div className="space-y-4">
                        {csvDayData.map((item, idx) => (
                          <Card key={`csv-detail-${idx}`}>
                            <CardContent className="p-3">
                              <div className="flex justify-between">
                                <span className="font-bold">{item.time}</span>
                                <span className="font-medium">{item.location}</span>
                              </div>
                              <div className="font-semibold mt-1">{item.className}</div>
                              <div className="text-sm mt-1">Trainer: {item.trainer1}</div>
                              {item.notes && <div className="text-sm mt-1 italic">{item.notes}</div>}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 bg-gray-50 rounded">No CSV classes for {day}</div>
                    )}
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2 bg-red-100 p-1 rounded">PDF Schedule</h4>
                    {pdfDayData.length > 0 ? (
                      <div className="space-y-4">
                        {pdfDayData.map((item, idx) => (
                          <Card key={`pdf-detail-${idx}`}>
                            <CardContent className="p-3">
                              <div className="flex justify-between">
                                <span className="font-bold">{item.time}</span>
                                <span className="font-medium">{item.location}</span>
                              </div>
                              <div className="font-semibold mt-1">{item.className}</div>
                              <div className="text-sm mt-1">Trainer: {item.trainer}</div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 bg-gray-50 rounded">No PDF classes for {day}</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </ScrollArea>
      </div>
    );
  };
  
  const renderCalendarView = () => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const visibleDays = filters.day.length > 0 ? filters.day : days;
    
    // Check if we have any data to display
    if (!csvData && !pdfData) {
      return (
        <div className="mt-4 p-8 text-center">
          <div className="text-gray-500 text-lg mb-4">📅 No schedule data available</div>
          <p className="text-gray-400">Upload CSV or PDF data to view the calendar.</p>
        </div>
      );
    }
    
    // Extract all unique hours from the data to create a dynamic time grid
    const allTimes = new Set<number>();
    
    // Parse times from CSV data
    if (filteredCsvData.length > 0) {
      filteredCsvData.forEach(cls => {
        if (cls.timeDate) {
          allTimes.add(cls.timeDate.getHours());
        }
      });
    }
    
    // Parse times from PDF data
    if (filteredPdfData.length > 0) {
      filteredPdfData.forEach(cls => {
        const timeMatch = cls.time.match(/(\d{1,2})[:.:]?(\d{2})?\s*(am|pm)?/i);
        if (timeMatch) {
          let hour = parseInt(timeMatch[1]);
          const period = timeMatch[3];
          
          if (period) {
            if (period.toLowerCase() === 'pm' && hour !== 12) {
              hour += 12;
            } else if (period.toLowerCase() === 'am' && hour === 12) {
              hour = 0;
            }
          }
          allTimes.add(hour);
        }
      });
    }
    
    // Create hour range from data or use default
    const hours = allTimes.size > 0 
      ? Array.from(allTimes).sort((a, b) => a - b)
      : Array.from(Array(15).keys()).map(i => i + 6); // Default 6am to 8pm
    
    // Helper function to check if a class belongs to a specific hour
    const isClassInHour = (classTime: string | Date, targetHour: number): boolean => {
      if (classTime instanceof Date) {
        return classTime.getHours() === targetHour;
      }
      
      // Parse string time
      const timeMatch = classTime.match(/(\d{1,2})[:.:]?(\d{2})?\s*(am|pm)?/i);
      if (timeMatch) {
        let hour = parseInt(timeMatch[1]);
        const period = timeMatch[3];
        
        if (period) {
          if (period.toLowerCase() === 'pm' && hour !== 12) {
            hour += 12;
          } else if (period.toLowerCase() === 'am' && hour === 12) {
            hour = 0;
          }
        }
        return hour === targetHour;
      }
      return false;
    };
    
    return (
      <div className="mt-4 flex-1 min-h-0 overflow-auto">
        <ScrollArea className="h-full">
          <div className="min-w-[800px]">
            <div className="grid gap-1" style={{ gridTemplateColumns: `120px repeat(${visibleDays.length}, 1fr)` }}>
              {/* Header row */}
              <div className="font-semibold p-3 bg-gray-200 sticky left-0 z-10 border-r border-gray-300">
                Time
              </div>
              {visibleDays.map(day => (
                <div key={`header-${day}`} className="font-semibold p-3 text-center bg-gray-200 border-r border-gray-300">
                  <div className="text-sm">{day.substring(0, 3)}</div>
                  <div className="text-xs text-gray-600 mt-1">
                    {filteredCsvData.filter(c => c.day === day).length + 
                     filteredPdfData.filter(c => c.day === day).length} classes
                  </div>
                </div>
              ))}
              
              {/* Time slots */}
              {hours.map(hour => (
                <React.Fragment key={`hour-${hour}`}>
                  <div className="p-3 border-t border-gray-200 bg-gray-50 sticky left-0 z-10 text-sm font-medium border-r border-gray-300">
                    {hour === 0 ? '12 AM' : hour === 12 ? '12 PM' : hour > 12 ? `${hour-12} PM` : `${hour} AM`}
                  </div>
                  
                  {visibleDays.map(day => {
                    try {
                      // Get classes for this day and hour
                      const csvClasses = filteredCsvData.filter(c => 
                        c && c.day === day && isClassInHour(c.timeDate || c.time, hour)
                      );
                      const pdfClasses = filteredPdfData.filter(c => 
                        c && c.day === day && isClassInHour(c.time, hour)
                      );
                    
                      return (
                        <div key={`cell-${day}-${hour}`} className="border-t border-gray-200 border-r border-gray-300 p-2 min-h-[100px] relative bg-white">
                          {/* CSV Classes */}
                          {csvClasses.map((cls, i) => (
                            <div key={`csv-${i}`} className="mb-2 p-2 text-xs bg-blue-100 border border-blue-200 rounded shadow-sm">
                              <div className="font-bold text-blue-800 mb-1">{cls.className}</div>
                              <div className="text-blue-600">{cls.time}</div>
                              <div className="text-blue-700 font-medium">{cls.trainer1}</div>
                              <div className="text-blue-500 text-xs">{cls.location}</div>
                              <div className="text-xs text-blue-400 mt-1">📊 CSV</div>
                            </div>
                          ))}
                          
                          {/* PDF Classes (only if not matching CSV) */}
                          {pdfClasses.filter(pdf => {
                            try {
                              return !csvClasses.some(csv => 
                                csv.className === pdf.className
                              );
                            } catch (error) {
                              console.error('Error filtering PDF classes:', error);
                              return true;
                            }
                          }).map((cls, i) => (
                            <div key={`pdf-${i}`} className="mb-2 p-2 text-xs bg-red-100 border border-red-200 rounded shadow-sm">
                              <div className="font-bold text-red-800 mb-1">{cls.className}</div>
                              <div className="text-red-600">{cls.time}</div>
                              <div className="text-red-700 font-medium">{cls.trainer}</div>
                              <div className="text-red-500 text-xs">{cls.location}</div>
                              <div className="text-xs text-red-400 mt-1">📋 PDF</div>
                            </div>
                          ))}
                          
                          {/* Empty state */}
                          {csvClasses.length === 0 && pdfClasses.length === 0 && (
                            <div className="text-gray-400 text-xs italic">No classes</div>
                          )}
                        </div>
                      );
                    } catch (error) {
                      console.error('Error rendering calendar cell:', error);
                      return (
                        <div key={`cell-${day}-${hour}`} className="border-t border-gray-200 border-r border-gray-300 p-2 min-h-[100px] relative bg-white">
                          <div className="text-red-400 text-xs italic">Error loading data</div>
                        </div>
                      );
                    }
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        </ScrollArea>
        
        {/* Legend */}
        <div className="mt-4 p-3 bg-gray-50 border rounded-lg">
          <div className="text-sm font-medium mb-2">Legend:</div>
          <div className="flex gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-100 border border-blue-200 rounded"></div>
              <span>📊 CSV Data</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-100 border border-red-200 rounded"></div>
              <span>📋 PDF Data (unique to PDF)</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0">
        <FilterSection 
          data={csvData}
          filters={filters}
          onFilterChange={handleFilterChange}
          isComparisonView
        />
        
        <div className="flex flex-wrap justify-between items-center gap-4 mt-4">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)} className="w-full">
            <TabsList className="grid grid-cols-5 w-full max-w-2xl">
              <TabsTrigger value="table">📊 Table</TabsTrigger>
              <TabsTrigger value="cards">🗃️ Cards</TabsTrigger>
              <TabsTrigger value="compact">📋 Compact</TabsTrigger>
              <TabsTrigger value="detailed">📝 Detailed</TabsTrigger>
              <TabsTrigger value="calendar">📅 Calendar</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
        {/* Only show pagination controls for non-table views */}
        {viewMode !== 'table' && (
          <div className="flex justify-between items-center mt-4 p-3 glass-card rounded-lg animate-fadeIn">
            <div className="flex items-center gap-4">
              <div>
                <label htmlFor="perPage" className="mr-2 text-sm font-medium">Items per page:</label>
                <select
                  id="perPage"
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(parseInt(e.target.value))}
                  className="border rounded px-2 py-1 text-sm input-glass"
                >
                  <option value="5">5</option>
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                </select>
              </div>
              
              <div>
                <span className="text-sm font-medium">
                  {currentPage} of {totalPages} pages
                </span>
              </div>
            </div>
            
            <div className="text-sm font-medium text-gray-600">
              CSV: {filteredCsvData.length} classes | PDF: {filteredPdfData.length} classes
            </div>
          </div>
        )}
        
        {/* Show summary for table view */}
        {viewMode === 'table' && (
          <div className="flex justify-end mt-4 p-3 glass-card rounded-lg animate-fadeIn">
            <div className="text-sm font-medium text-foreground">
              📊 CSV: <span className="text-blue-600 font-semibold">{filteredCsvData.length}</span> classes | 
              📋 PDF: <span className="text-red-600 font-semibold">{filteredPdfData.length}</span> classes
            </div>
          </div>
        )}
      </div>
      
      {/* Main content area - this will expand to fill available space */}
      <div className="flex-1 flex flex-col min-h-0">
        {viewMode === 'table' && renderTableView()}
        {viewMode === 'cards' && renderCardsView()}
        {viewMode === 'compact' && renderCompactView()}
        {viewMode === 'detailed' && renderDetailedView()}
        {viewMode === 'calendar' && renderCalendarView()}
      </div>
      
      {/* Only show pagination for non-table views that use pagination */}
      {viewMode !== 'table' && totalPages > 1 && (
        <Pagination className="mt-4">
          <PaginationContent>
            <PaginationItem>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevPage}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
            </PaginationItem>
            
            {Array.from({length: Math.min(5, totalPages)}, (_, i) => {
              let pageNum: number;
              
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              if (pageNum > 0 && pageNum <= totalPages) {
                return (
                  <PaginationItem key={pageNum}>
                    <PaginationLink 
                      isActive={pageNum === currentPage}
                      onClick={() => handlePageClick(pageNum)}
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                );
              }
              return null;
            })}
            
            <PaginationItem>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
