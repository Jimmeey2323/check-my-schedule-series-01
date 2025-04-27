
import React, { useState, useEffect } from 'react';
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
    return (
      <div className="flex flex-col md:flex-row gap-4 mt-4 h-[calc(100vh-400px)]">
        {/* CSV Table */}
        <Card className="flex-1 overflow-hidden">
          <CardContent className="p-0 h-full">
            <ScrollArea className="h-full">
              <div className="p-2 bg-blue-50 font-semibold text-center">CSV Schedule ({filteredCsvData.length} classes)</div>
              <Table>
                <TableHeader className="sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="bg-blue-600 text-white">Day</TableHead>
                    <TableHead className="bg-blue-600 text-white">Time</TableHead>
                    <TableHead className="bg-blue-600 text-white">Class</TableHead>
                    <TableHead className="bg-blue-600 text-white">Trainer</TableHead>
                    <TableHead className="bg-blue-600 text-white">Location</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedCsvData.length > 0 ? (
                    paginatedCsvData.map((item, idx) => (
                      <TableRow key={`csv-${idx}`} className="hover:bg-blue-50">
                        <TableCell>{item.day}</TableCell>
                        <TableCell>{item.time}</TableCell>
                        <TableCell>{item.className}</TableCell>
                        <TableCell>{item.trainer1}</TableCell>
                        <TableCell>{item.location}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">No CSV data matches your filters</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
        
        {/* PDF Table */}
        <Card className="flex-1 overflow-hidden">
          <CardContent className="p-0 h-full">
            <ScrollArea className="h-full">
              <div className="p-2 bg-red-50 font-semibold text-center">PDF Schedule ({filteredPdfData.length} classes)</div>
              <Table>
                <TableHeader className="sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="bg-red-600 text-white">Day</TableHead>
                    <TableHead className="bg-red-600 text-white">Time</TableHead>
                    <TableHead className="bg-red-600 text-white">Class</TableHead>
                    <TableHead className="bg-red-600 text-white">Trainer</TableHead>
                    <TableHead className="bg-red-600 text-white">Location</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedPdfData.length > 0 ? (
                    paginatedPdfData.map((item, idx) => (
                      <TableRow key={`pdf-${idx}`} className="hover:bg-red-50">
                        <TableCell>{item.day}</TableCell>
                        <TableCell>{item.time}</TableCell>
                        <TableCell>{item.className}</TableCell>
                        <TableCell>{item.trainer}</TableCell>
                        <TableCell>{item.location}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">No PDF data matches your filters</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    );
  };
  
  const renderCardsView = () => {
    return (
      <div className="flex flex-col md:flex-row gap-4 mt-4 h-[calc(100vh-400px)]">
        {/* CSV Cards */}
        <ScrollArea className="flex-1 h-full border rounded-md p-2 bg-blue-50">
          <div className="p-2 font-semibold text-center mb-2">CSV Schedule ({filteredCsvData.length} classes)</div>
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
        </ScrollArea>
        
        {/* PDF Cards */}
        <ScrollArea className="flex-1 h-full border rounded-md p-2 bg-red-50">
          <div className="p-2 font-semibold text-center mb-2">PDF Schedule ({filteredPdfData.length} classes)</div>
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
        </ScrollArea>
      </div>
    );
  };
  
  const renderCompactView = () => {
    return (
      <div className="flex flex-col mt-4 h-[calc(100vh-400px)]">
        <ScrollArea className="h-full">
          <Table>
            <TableHeader className="sticky top-0 z-10">
              <TableRow>
                <TableHead className="bg-gray-700 text-white">Day</TableHead>
                <TableHead className="bg-gray-700 text-white">Time</TableHead>
                <TableHead className="bg-gray-700 text-white">Class</TableHead>
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
                    <TableCell>{csvItem.time}</TableCell>
                    <TableCell>{csvItem.className}</TableCell>
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
                    <TableCell>{pdfItem.time}</TableCell>
                    <TableCell>{pdfItem.className}</TableCell>
                    <TableCell className="bg-blue-50">-</TableCell>
                    <TableCell className="bg-red-50">{pdfItem.trainer}</TableCell>
                    <TableCell className="bg-red-100 text-red-800">Missing in CSV</TableCell>
                  </TableRow>
                ))
              }
              
              {paginatedCsvData.length === 0 && paginatedPdfData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">No data matches your filters</TableCell>
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
      <div className="mt-4 h-[calc(100vh-400px)] overflow-auto">
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
    const hours = Array.from(Array(15).keys()).map(i => i + 6); // 6am to 8pm
    
    return (
      <div className="mt-4 h-[calc(100vh-400px)] overflow-auto">
        <ScrollArea className="h-full">
          <div className="min-w-[800px]">
            <div className="grid grid-cols-8 gap-1">
              <div className="font-semibold p-2 bg-gray-200 sticky left-0 z-10">Time</div>
              {visibleDays.map(day => (
                <div key={`header-${day}`} className="font-semibold p-2 text-center bg-gray-200">
                  {day}
                </div>
              ))}
              
              {hours.map(hour => (
                <React.Fragment key={`hour-${hour}`}>
                  <div className="p-2 border-t border-gray-200 bg-gray-100 sticky left-0 z-10">
                    {hour === 12 ? '12 PM' : hour > 12 ? `${hour-12} PM` : `${hour} AM`}
                  </div>
                  
                  {visibleDays.map(day => {
                    const hourStr = hour === 12 ? '12:00 PM' : hour > 12 ? `${hour-12}:00 PM` : `${hour}:00 AM`;
                    const csvClasses = filteredCsvData.filter(c => 
                      c.day === day && c.time.startsWith(hourStr.replace(':00', ':'))
                    );
                    const pdfClasses = filteredPdfData.filter(c => 
                      c.day === day && c.time.startsWith(hourStr.replace(':00', ':'))
                    );
                    
                    return (
                      <div key={`cell-${day}-${hour}`} className="border-t border-gray-200 p-1 min-h-[80px] relative">
                        {csvClasses.map((cls, i) => (
                          <div key={`csv-${i}`} className="mb-1 p-1 text-xs bg-blue-100 rounded">
                            <div className="font-bold">{cls.className}</div>
                            <div>{cls.time} - {cls.trainer1}</div>
                          </div>
                        ))}
                        
                        {pdfClasses.filter(pdf => 
                          !csvClasses.some(csv => 
                            csv.time === pdf.time && 
                            csv.className === pdf.className
                          )
                        ).map((cls, i) => (
                          <div key={`pdf-${i}`} className="mb-1 p-1 text-xs bg-red-100 rounded">
                            <div className="font-bold">{cls.className}</div>
                            <div>{cls.time} - {cls.trainer}</div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        </ScrollArea>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4">
        <FilterSection 
          data={csvData}
          filters={filters}
          onFilterChange={handleFilterChange}
          isComparisonView
        />
        
        <div className="flex flex-wrap justify-between items-center gap-4 mt-4">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)} className="w-full">
            <TabsList className="grid grid-cols-5 w-full">
              <TabsTrigger value="table">Table View</TabsTrigger>
              <TabsTrigger value="cards">Cards View</TabsTrigger>
              <TabsTrigger value="compact">Compact View</TabsTrigger>
              <TabsTrigger value="detailed">Detailed View</TabsTrigger>
              <TabsTrigger value="calendar">Calendar View</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
        <div className="flex justify-between items-center mt-4">
          <div className="flex items-center gap-4">
            <div>
              <label htmlFor="perPage" className="mr-2 text-sm font-medium">Items per page:</label>
              <select
                id="perPage"
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(parseInt(e.target.value))}
                className="border rounded px-2 py-1 text-sm"
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
          
          <div className="text-sm font-medium">
            CSV: {filteredCsvData.length} classes | PDF: {filteredPdfData.length} classes
          </div>
        </div>
      </div>
      
      {viewMode === 'table' && renderTableView()}
      {viewMode === 'cards' && renderCardsView()}
      {viewMode === 'compact' && renderCompactView()}
      {viewMode === 'detailed' && renderDetailedView()}
      {viewMode === 'calendar' && renderCalendarView()}
      
      {totalPages > 1 && (
        <Pagination className="mt-4">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious onClick={handlePrevPage} disabled={currentPage === 1} />
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
              <PaginationNext onClick={handleNextPage} disabled={currentPage === totalPages} />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
