
import React, { useState, useEffect } from 'react';
import { ClassData, FilterState } from '@/types/schedule';
import { Card } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { passesFilters } from '@/utils/filterUtils';
import { getTrainerImageUrl } from '@/utils/imageUtils';
import { ArrowDown, ArrowUp } from 'lucide-react';

const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface FullWeekScheduleProps {
  classesByDay: {[day: string]: ClassData[]};
  filters: FilterState;
}

type SortColumn = 'day' | 'time' | 'location' | 'className' | 'trainer1';
type SortDirection = 1 | -1;

export function FullWeekSchedule({ classesByDay, filters }: FullWeekScheduleProps) {
  const [sortColumn, setSortColumn] = useState<SortColumn>('day');
  const [sortDirection, setSortDirection] = useState<SortDirection>(1);
  const [allClasses, setAllClasses] = useState<ClassData[]>([]);
  
  // Flatten and filter classes based on filters
  useEffect(() => {
    let classes: ClassData[] = [];
    
    Object.entries(classesByDay).forEach(([day, dayClasses]) => {
      const filtered = dayClasses.filter(cls => 
        passesFilters(
          { day: cls.day, location: cls.location, trainer: cls.trainer1, className: cls.className },
          filters
        )
      );
      classes = classes.concat(filtered);
    });
    
    setAllClasses(classes);
  }, [classesByDay, filters]);
  
  // Handle sort column click
  const handleSortClick = (column: SortColumn) => {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(prev => prev === 1 ? -1 : 1);
    } else {
      // New column, reset to ascending
      setSortColumn(column);
      setSortDirection(1);
    }
  };
  
  // Sort classes based on current sort settings
  const sortedClasses = [...allClasses].sort((a, b) => {
    let valA = a[sortColumn];
    let valB = b[sortColumn];
    
    if (sortColumn === 'day') {
      const idxA = daysOrder.indexOf(valA as string);
      const idxB = daysOrder.indexOf(valB as string);
      if (idxA === -1 && idxB === -1) return 0;
      if (idxA === -1) return 1 * sortDirection;
      if (idxB === -1) return -1 * sortDirection;
      return (idxA - idxB) * sortDirection;
    }
    
    if (sortColumn === 'time') {
      const dateA = a.timeDate;
      const dateB = b.timeDate;
      if (dateA && dateB) return (dateA.getTime() - dateB.getTime()) * sortDirection;
      if (dateA) return -1 * sortDirection;
      if (dateB) return 1 * sortDirection;
      return 0;
    }
    
    // Default string comparison
    const strA = String(valA).toLowerCase();
    const strB = String(valB).toLowerCase();
    if (strA < strB) return -1 * sortDirection;
    if (strA > strB) return 1 * sortDirection;
    return 0;
  });
  
  const renderSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) return null;
    
    return sortDirection === 1 ? (
      <ArrowUp className="inline-block w-4 h-4 ml-1" />
    ) : (
      <ArrowDown className="inline-block w-4 h-4 ml-1" />
    );
  };
  
  return (
    <Card className="flex-grow overflow-hidden">
      <div className="overflow-auto h-full">
        <Table>
          <TableHeader className="sticky top-0 z-10">
            <TableRow>
              <TableHead 
                className="cursor-pointer hover:bg-blue-50"
                onClick={() => handleSortClick('day')}
              >
                Day {renderSortIcon('day')}
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-blue-50"
                onClick={() => handleSortClick('time')}
              >
                Time {renderSortIcon('time')}
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-blue-50"
                onClick={() => handleSortClick('location')}
              >
                Location {renderSortIcon('location')}
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-blue-50"
                onClick={() => handleSortClick('className')}
              >
                Class {renderSortIcon('className')}
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-blue-50"
                onClick={() => handleSortClick('trainer1')}
              >
                Trainer {renderSortIcon('trainer1')}
              </TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedClasses.length > 0 ? (
              sortedClasses.map((cls, index) => (
                <TableRow key={index} className="hover:bg-blue-50">
                  <TableCell className="whitespace-nowrap">{cls.day}</TableCell>
                  <TableCell className="whitespace-nowrap">{cls.time}</TableCell>
                  <TableCell className="whitespace-nowrap">{cls.location}</TableCell>
                  <TableCell>{cls.className}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <img
                        src={getTrainerImageUrl(cls.trainer1)}
                        alt={`Trainer ${cls.trainer1}`}
                        className="w-7 h-7 rounded-full border-2 border-gray-200 object-cover"
                      />
                      <span>{cls.trainer1}</span>
                    </div>
                  </TableCell>
                  <TableCell>{cls.notes || '-'}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  No classes found for the selected filters
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
