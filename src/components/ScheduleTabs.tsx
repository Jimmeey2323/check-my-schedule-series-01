
import React, { useState, useEffect } from 'react';
import { ClassData, FilterState } from '@/types/schedule';
import { Card } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { passesFilters } from '@/utils/filterUtils';
import { getTrainerImageUrl } from '@/utils/imageUtils';

const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface ScheduleTabsProps {
  classesByDay: {[day: string]: ClassData[]};
  filters: FilterState;
}

export function ScheduleTabs({ classesByDay, filters }: ScheduleTabsProps) {
  const [activeDay, setActiveDay] = useState<string | null>(null);
  
  // Set active day to first day or first day in filters if any
  useEffect(() => {
    const availableDays = Object.keys(classesByDay);
    if (availableDays.length === 0) return;
    
    if (filters.day.length > 0) {
      // Find the first day in the filters that exists in classesByDay
      const firstMatchingDay = filters.day.find(day => availableDays.includes(day));
      setActiveDay(firstMatchingDay || availableDays[0]);
    } else {
      // Sort days according to daysOrder and pick the first one
      const sortedDays = availableDays.sort((a, b) => {
        const idxA = daysOrder.indexOf(a);
        const idxB = daysOrder.indexOf(b);
        if (idxA === -1 && idxB === -1) return a.localeCompare(b);
        if (idxA === -1) return 1;
        if (idxB === -1) return -1;
        return idxA - idxB;
      });
      
      setActiveDay(sortedDays[0]);
    }
  }, [classesByDay, filters.day]);
  
  if (!activeDay) {
    return <div className="text-gray-600 text-center mt-6">No schedule data available</div>;
  }
  
  const days = Object.keys(classesByDay).sort((a, b) => {
    const idxA = daysOrder.indexOf(a);
    const idxB = daysOrder.indexOf(b);
    if (idxA === -1 && idxB === -1) return a.localeCompare(b);
    if (idxA === -1) return 1;
    if (idxB === -1) return -1;
    return idxA - idxB;
  });
  
  // Filter the classes for the active day
  const filteredClasses = classesByDay[activeDay].filter(cls => 
    passesFilters(
      { day: cls.day, location: cls.location, trainer: cls.trainer1, className: cls.className },
      filters
    )
  );
  
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-300 pb-2" role="tablist">
        {days.map((day, idx) => (
          <button
            key={day}
            className={`px-4 py-2 rounded-t-lg border border-b-0 border-gray-300 transition ${
              activeDay === day
                ? 'bg-white font-semibold text-blue-600 border-blue-500'
                : 'bg-gray-100 text-gray-700 hover:bg-blue-50'
            }`}
            onClick={() => setActiveDay(day)}
            data-day={day}
            role="tab"
            aria-selected={activeDay === day}
            tabIndex={activeDay === day ? 0 : -1}
          >
            {day}
          </button>
        ))}
      </div>
      
      <Card className="flex-grow overflow-hidden">
        <div className="overflow-auto h-full">
          <Table>
            <TableHeader className="sticky top-0 z-10">
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Trainer</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClasses.length > 0 ? (
                filteredClasses.map((cls, index) => (
                  <TableRow key={index} className="hover:bg-blue-50">
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
                  <TableCell colSpan={5} className="text-center py-8">
                    No classes found for the selected filters
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
