import React, { useState, useEffect } from 'react';
import { ClassData, FilterState } from '@/types/schedule';
import { MultiSelectFilter } from './MultiSelectFilter';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Filter, Eye, Calendar, MapPin, Users, BookOpen } from 'lucide-react';

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
    <div className="p-6 animate-slideUp overflow-visible">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-8 w-8 rounded-full bg-gradient-to-r from-purple-500 to-blue-600 flex items-center justify-center">
          <Filter className="h-4 w-4 text-white" />
        </div>
        <h2 className="text-lg font-bold text-gradient-primary">Filters & View Options</h2>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 pb-4 overflow-visible">
        {/* Day Filter */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Calendar className="h-4 w-4 text-blue-500" />
            <span>Days</span>
          </div>
          <MultiSelectFilter 
            id="day-filter"
            label="Select Days"
            options={uniqueDays}
            selected={filters.day}
            onChange={handleDayFilterChange}
          />
        </div>
        
        {/* Location Filter */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <MapPin className="h-4 w-4 text-teal-500" />
            <span>Locations</span>
          </div>
          <MultiSelectFilter 
            id="location-filter"
            label="Select Locations"
            options={uniqueLocations}
            selected={filters.location}
            onChange={handleLocationFilterChange}
          />
        </div>
        
        {/* Trainer Filter */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Users className="h-4 w-4 text-purple-500" />
            <span>Trainers</span>
          </div>
          <MultiSelectFilter 
            id="trainer-filter"
            label="Select Trainers"
            options={uniqueTrainers}
            selected={filters.trainer}
            onChange={handleTrainerFilterChange}
          />
        </div>
        
        {/* Class Filter */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <BookOpen className="h-4 w-4 text-emerald-500" />
            <span>Classes</span>
          </div>
          <MultiSelectFilter 
            id="class-filter"
            label="Select Classes"
            options={uniqueClasses}
            selected={filters.className}
            onChange={handleClassFilterChange}
          />
        </div>
        
        {/* View Option */}
        {!isComparisonView && onViewOptionChange && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Eye className="h-4 w-4 text-orange-500" />
              <span>View Mode</span>
            </div>
            <Select
              value={viewOption}
              onValueChange={(value) => onViewOptionChange(value as 'byDay' | 'fullWeek')}
            >
              <SelectTrigger className="input-glass hover:bg-white/20 transition-colors">
                <SelectValue placeholder="Select view" />
              </SelectTrigger>
              <SelectContent className="glass-card">
                <SelectItem value="byDay">📅 By Day</SelectItem>
                <SelectItem value="fullWeek">📋 Full Week</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
}