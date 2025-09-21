
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
      <div className="flex flex-wrap gap-2 mb-6 p-1 bg-gray-50 rounded-lg border" role="tablist">
        {days.map((day, idx) => (
          <button
            key={day}
            className={`px-4 py-2 rounded-md font-medium text-sm transition-all duration-200 ${
              activeDay === day
                ? 'bg-white text-blue-600 shadow-sm border border-blue-100'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
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
      
      <div className="flex-grow bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="h-full overflow-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Time</th>
                <th className="px-4 py-3 text-left font-medium">Location</th>
                <th className="px-4 py-3 text-left font-medium">Class</th>
                <th className="px-4 py-3 text-left font-medium">Trainer</th>
                <th className="px-4 py-3 text-left font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {filteredClasses.length > 0 ? (
                filteredClasses.map((cls, index) => (
                  <tr key={index} className="hover:bg-blue-50 border-b border-gray-100 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">{cls.time}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">{cls.location}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">{cls.className}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <div className="flex items-center space-x-3">
                        <img
                          src={getTrainerImageUrl(cls.trainer1)}
                          alt={`Trainer ${cls.trainer1}`}
                          className="w-8 h-8 rounded-full border-2 border-blue-200 object-cover shadow-sm"
                        />
                        <span className="font-medium">{cls.trainer1}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{cls.notes || '-'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-2xl">📅</span>
                      <span>No classes found for the selected filters</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
