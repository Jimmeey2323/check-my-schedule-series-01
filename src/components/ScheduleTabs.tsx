
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
        {/* Table Header with Info */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-blue-900">Schedule for {activeDay}</h3>
              <p className="text-sm text-blue-700">
                Showing {filteredClasses.length} classes with normalized data
              </p>
            </div>
            <div className="flex gap-2 text-xs">
              <div className="bg-white px-2 py-1 rounded border border-blue-200">
                <span className="text-blue-600">✓</span> Normalized Values
              </div>
              <div className="bg-white px-2 py-1 rounded border border-green-200">
                <span className="text-green-600">📊</span> CSV Data
              </div>
            </div>
          </div>
        </div>
        
        <div className="h-full overflow-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Time</th>
                <th className="px-4 py-3 text-left font-medium">Location</th>
                <th className="px-4 py-3 text-left font-medium">Class Name</th>
                <th className="px-4 py-3 text-left font-medium">Trainer</th>
                <th className="px-4 py-3 text-left font-medium">Additional Info</th>
              </tr>
            </thead>
            <tbody>
              {filteredClasses.length > 0 ? (
                filteredClasses.map((cls, index) => (
                  <tr key={index} className="hover:bg-blue-50 border-b border-gray-100 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <div className="font-medium text-gray-900">{cls.time}</div>
                      {cls.timeRaw && cls.timeRaw !== cls.time && (
                        <div className="text-xs text-gray-500 italic">
                          Original: {cls.timeRaw}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <div className="font-medium text-gray-900">{cls.location}</div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="font-semibold text-gray-900">{cls.className}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {cls.uniqueKey && (
                          <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                            ID: {cls.uniqueKey.substring(0, 8)}...
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <div className="flex items-center space-x-3">
                        <img
                          src={getTrainerImageUrl(cls.trainer1)}
                          alt={`Trainer ${cls.trainer1}`}
                          className="w-8 h-8 rounded-full border-2 border-blue-200 object-cover shadow-sm"
                        />
                        <div>
                          <div className="font-medium text-gray-900">{cls.trainer1}</div>
                          {cls.cover && cls.cover.trim() !== '' && cls.cover !== cls.trainer1 && (
                            <div className="text-xs text-orange-600">
                              Cover: {cls.cover}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="space-y-1">
                        {cls.notes && cls.notes.trim() !== '' && (
                          <div className="text-gray-600">{cls.notes}</div>
                        )}
                        <div className="flex flex-wrap gap-1 text-xs">
                          <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full">
                            📊 CSV
                          </span>
                          {cls.timeDate && (
                            <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                              ⏰ Parsed
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
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
        
        {/* Legend/Help Section */}
        <div className="border-t border-gray-200 bg-gray-50 p-3">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <span className="text-blue-500">📊</span>
                <span>CSV Source Data</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-green-500">✓</span>
                <span>Normalized Values</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-purple-500">⏰</span>
                <span>Time Parsed</span>
              </div>
            </div>
            <div className="text-gray-500">
              {filteredClasses.length} of {classesByDay[activeDay]?.length || 0} classes shown
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
