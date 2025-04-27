
import React, { useState, useEffect } from 'react';
import { ClassData, FilterState } from '@/types/schedule';
import { Card, CardContent } from '@/components/ui/card';
import { MultiSelectFilter } from './MultiSelectFilter';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface FilterSectionProps {
  data: {[day: string]: ClassData[]};
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  viewOption?: 'byDay' | 'fullWeek';
  onViewOptionChange?: (option: 'byDay' | 'fullWeek') => void;
  isComparisonView?: boolean;
}

export function FilterSection({ 
  data, 
  filters, 
  onFilterChange, 
  viewOption, 
  onViewOptionChange,
  isComparisonView = false
}: FilterSectionProps) {
  const [uniqueDays, setUniqueDays] = useState<string[]>([]);
  const [uniqueLocations, setUniqueLocations] = useState<string[]>([]);
  const [uniqueTrainers, setUniqueTrainers] = useState<string[]>([]);
  const [uniqueClasses, setUniqueClasses] = useState<string[]>([]);
  
  useEffect(() => {
    const days = new Set<string>();
    const locations = new Set<string>();
    const trainers = new Set<string>();
    const classes = new Set<string>();
    
    // Collect unique values from all classes
    Object.values(data).forEach(dayClasses => {
      dayClasses.forEach(cls => {
        if (cls.day) days.add(cls.day);
        if (cls.location) locations.add(cls.location);
        if (cls.trainer1) trainers.add(cls.trainer1);
        if (cls.className) classes.add(cls.className);
      });
    });
    
    // Sort days according to custom order, other alphabetically
    const sortedDays = Array.from(days).sort((a, b) => {
      const idxA = daysOrder.indexOf(a);
      const idxB = daysOrder.indexOf(b);
      if (idxA === -1 && idxB === -1) return a.localeCompare(b);
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxA - idxB;
    });
    
    setUniqueDays(sortedDays);
    setUniqueLocations(Array.from(locations).sort());
    setUniqueTrainers(Array.from(trainers).sort());
    setUniqueClasses(Array.from(classes).sort());
  }, [data]);
  
  const handleDayFilterChange = (selected: string[]) => {
    onFilterChange({
      ...filters,
      day: selected
    });
  };
  
  const handleLocationFilterChange = (selected: string[]) => {
    onFilterChange({
      ...filters,
      location: selected
    });
  };
  
  const handleTrainerFilterChange = (selected: string[]) => {
    onFilterChange({
      ...filters,
      trainer: selected
    });
  };
  
  const handleClassFilterChange = (selected: string[]) => {
    onFilterChange({
      ...filters,
      className: selected
    });
  };
  
  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Filters & View Options</h2>
        <div className="flex flex-wrap gap-4">
          <MultiSelectFilter 
            id="day-filter"
            label="Filter by Day"
            options={uniqueDays}
            selected={filters.day}
            onChange={handleDayFilterChange}
          />
          
          <MultiSelectFilter 
            id="location-filter"
            label="Filter by Location"
            options={uniqueLocations}
            selected={filters.location}
            onChange={handleLocationFilterChange}
          />
          
          <MultiSelectFilter 
            id="trainer-filter"
            label="Filter by Trainer"
            options={uniqueTrainers}
            selected={filters.trainer}
            onChange={handleTrainerFilterChange}
          />
          
          <MultiSelectFilter 
            id="class-filter"
            label="Filter by Class"
            options={uniqueClasses}
            selected={filters.className}
            onChange={handleClassFilterChange}
          />
          
          {!isComparisonView && onViewOptionChange && (
            <div className="flex flex-col">
              <label htmlFor="view-option" className="mb-1 font-medium text-gray-700 block">
                View Option
              </label>
              <Select
                value={viewOption}
                onValueChange={(value) => onViewOptionChange(value as 'byDay' | 'fullWeek')}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select view" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="byDay">By Day (Tabs)</SelectItem>
                  <SelectItem value="fullWeek">Full Week Schedule</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
