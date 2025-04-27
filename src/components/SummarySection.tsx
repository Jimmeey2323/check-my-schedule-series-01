
import React, { useMemo } from 'react';
import { ClassData, FilterState } from '@/types/schedule';
import { Card, CardContent } from '@/components/ui/card';
import { passesFilters } from '@/utils/filterUtils';

const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface SummarySectionProps {
  classesByDay: {[day: string]: ClassData[]};
  filters: FilterState;
}

export function SummarySection({ classesByDay, filters }: SummarySectionProps) {
  // Generate summary counts based on filtered data
  const summary = useMemo(() => {
    // Flatten and filter all classes
    let allClasses: ClassData[] = [];
    
    Object.entries(classesByDay).forEach(([day, dayClasses]) => {
      const filtered = dayClasses.filter(cls => 
        passesFilters(
          { day: cls.day, location: cls.location, trainer: cls.trainer1, className: cls.className },
          filters
        )
      );
      allClasses = allClasses.concat(filtered);
    });
    
    // Count by location
    const locationCounts = allClasses.reduce((counts: {[key: string]: number}, cls) => {
      if (!cls.location) return counts;
      counts[cls.location] = (counts[cls.location] || 0) + 1;
      return counts;
    }, {});
    
    // Count by trainer
    const trainerCounts = allClasses.reduce((counts: {[key: string]: number}, cls) => {
      if (!cls.trainer1) return counts;
      counts[cls.trainer1] = (counts[cls.trainer1] || 0) + 1;
      return counts;
    }, {});
    
    // Count by day
    const dayCounts = allClasses.reduce((counts: {[key: string]: number}, cls) => {
      if (!cls.day) return counts;
      counts[cls.day] = (counts[cls.day] || 0) + 1;
      return counts;
    }, {});
    
    // Count by class
    const classCounts = allClasses.reduce((counts: {[key: string]: number}, cls) => {
      if (!cls.className) return counts;
      counts[cls.className] = (counts[cls.className] || 0) + 1;
      return counts;
    }, {});
    
    // Class formats by trainer
    const classFormatsTrainer: {[trainer: string]: {[className: string]: number}} = {};
    allClasses.forEach((cls) => {
      if (!cls.trainer1 || !cls.className) return;
      if (!classFormatsTrainer[cls.trainer1]) classFormatsTrainer[cls.trainer1] = {};
      classFormatsTrainer[cls.trainer1][cls.className] = 
        (classFormatsTrainer[cls.trainer1][cls.className] || 0) + 1;
    });
    
    return {
      locationCounts,
      trainerCounts,
      dayCounts,
      classCounts,
      classFormatsTrainer,
      totalClasses: allClasses.length
    };
  }, [classesByDay, filters]);
  
  // Sort function helpers
  const sortByCount = (a: [string, number], b: [string, number]) => b[1] - a[1];
  
  const sortByDay = (a: [string, number], b: [string, number]) => {
    const idxA = daysOrder.indexOf(a[0]);
    const idxB = daysOrder.indexOf(b[0]);
    if (idxA === -1 && idxB === -1) return a[0].localeCompare(b[0]);
    if (idxA === -1) return 1;
    if (idxB === -1) return -1;
    return idxA - idxB;
  };
  
  if (summary.totalClasses === 0) {
    return null;
  }
  
  return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Summary Counts</h2>
      <div className="grid gap-6 auto-rows-min sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {/* Counts by Location */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold text-gray-700 mb-2 border-b border-gray-200 pb-1">
              Counts by Location
            </h3>
            <ul className="text-gray-600 text-sm max-h-40 overflow-y-auto">
              {Object.entries(summary.locationCounts)
                .sort(sortByCount)
                .map(([location, count]) => (
                  <li key={location} className="py-1">
                    {location}: <span className="font-semibold">{count}</span>
                  </li>
                ))}
            </ul>
          </CardContent>
        </Card>
        
        {/* Counts by Trainer */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold text-gray-700 mb-2 border-b border-gray-200 pb-1">
              Counts by Trainer
            </h3>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
              {Object.entries(summary.trainerCounts)
                .sort(sortByCount)
                .map(([trainer, count]) => (
                  <div key={trainer} className="bg-gray-50 p-2 rounded border border-gray-200 text-center">
                    <div className="font-semibold">{trainer}</div>
                    <div className="text-blue-600">{count}</div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
        
        {/* Counts by Day */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold text-gray-700 mb-2 border-b border-gray-200 pb-1">
              Counts by Day
            </h3>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
              {Object.entries(summary.dayCounts)
                .sort(sortByDay)
                .map(([day, count]) => (
                  <div key={day} className="bg-gray-50 p-2 rounded border border-gray-200 text-center">
                    <div className="font-semibold">{day}</div>
                    <div className="text-blue-600">{count}</div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
        
        {/* Counts by Class */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold text-gray-700 mb-2 border-b border-gray-200 pb-1">
              Counts by Class
            </h3>
            <ul className="text-gray-600 text-sm max-h-40 overflow-y-auto">
              {Object.entries(summary.classCounts)
                .sort(sortByCount)
                .map(([className, count]) => (
                  <li key={className} className="py-1">
                    {className}: <span className="font-semibold">{count}</span>
                  </li>
                ))}
            </ul>
          </CardContent>
        </Card>
        
        {/* Class Formats by Trainer */}
        <Card className="sm:col-span-2 lg:col-span-4">
          <CardContent className="p-4">
            <h3 className="font-semibold text-gray-700 mb-2 border-b border-gray-200 pb-1">
              Class Formats & Counts by Trainer
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-h-60 overflow-y-auto">
              {Object.entries(summary.classFormatsTrainer).map(([trainer, classes]) => (
                <div key={trainer} className="mb-3">
                  <h4 className="font-semibold text-gray-800 mb-1">{trainer}</h4>
                  <ul className="list-disc list-inside text-gray-700 text-sm space-y-0.5 pl-2">
                    {Object.entries(classes)
                      .sort(sortByCount)
                      .map(([className, count]) => (
                        <li key={className}>
                          {className}: <span className="font-semibold">{count}</span>
                        </li>
                      ))}
                  </ul>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
