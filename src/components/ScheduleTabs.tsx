import React, { useState, useEffect } from 'react';
import { ClassData, FilterState } from '@/types/schedule';
import { Card } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { passesFilters } from '@/utils/filterUtils';
import { getTrainerImageUrl } from '@/utils/imageUtils';
import { Clock, MapPin, User, Calendar, CheckCircle, Sparkles, Activity } from 'lucide-react';

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
      const firstMatchingDay = filters.day.find(day => availableDays.includes(day));
      setActiveDay(firstMatchingDay || availableDays[0]);
    } else {
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
    return (
      <div className="flex flex-col items-center justify-center h-64 glass-card rounded-xl">
        <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
        <div className="text-muted-foreground text-center">No schedule data available</div>
      </div>
    );
  }
  
  const days = Object.keys(classesByDay).sort((a, b) => {
    const idxA = daysOrder.indexOf(a);
    const idxB = daysOrder.indexOf(b);
    if (idxA === -1 && idxB === -1) return a.localeCompare(b);
    if (idxA === -1) return 1;
    if (idxB === -1) return -1;
    return idxA - idxB;
  });
  
  const filteredClasses = classesByDay[activeDay].filter(cls => 
    passesFilters(
      { day: cls.day, location: cls.location, trainer: cls.trainer1, className: cls.className },
      filters
    )
  );
  
  return (
    <div className="flex flex-col h-full space-y-6 animate-fadeIn">
      {/* Sophisticated Tab Navigation */}
      <div className="glass-card rounded-xl p-4">
        <div className="flex items-center gap-3 mb-4">
          <Calendar className="h-5 w-5 text-blue-500" />
          <h3 className="font-semibold text-gradient-primary">Day Selection</h3>
        </div>
        <div className="flex flex-wrap gap-2" role="tablist">
          {days.map((day) => (
            <button
              key={day}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300 hover:scale-105 ${
                activeDay === day
                  ? 'gradient-primary text-white shadow-lg'
                  : 'glass border-white/30 hover:bg-white/20'
              }`}
              onClick={() => setActiveDay(day)}
              role="tab"
              aria-selected={activeDay === day}
            >
              {day}
            </button>
          ))}
        </div>
      </div>
      
      {/* Enhanced Schedule Display */}
      <div className="flex-grow glass-card rounded-xl overflow-hidden">
        {/* Header with Stats */}
        <div className="gradient-primary-light p-6 border-b border-white/20">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-gradient-primary flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {activeDay} Schedule
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {filteredClasses.length} classes • Normalized & verified data
              </p>
            </div>
            <div className="flex gap-3">
              <div className="glass-card px-3 py-1 rounded-full text-sm">
                <CheckCircle className="w-4 h-4 inline text-emerald-500 mr-1" />
                Data Verified
              </div>
              <div className="glass-card px-3 py-1 rounded-full text-sm">
                <Activity className="w-4 h-4 inline text-blue-500 mr-1" />
                Live Updates
              </div>
            </div>
          </div>
        </div>
        
        {/* Premium Table */}
        <div className="overflow-auto max-h-[600px] fancy-scrollbar">
          <Table className="w-full">
            <TableHeader className="sticky top-0 z-10">
              <TableRow className="gradient-primary hover:bg-transparent">
                <TableHead className="text-white font-medium">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Time
                  </div>
                </TableHead>
                <TableHead className="text-white font-medium">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Location
                  </div>
                </TableHead>
                <TableHead className="text-white font-medium">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Class
                  </div>
                </TableHead>
                <TableHead className="text-white font-medium">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Trainer
                  </div>
                </TableHead>
                <TableHead className="text-white font-medium">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClasses.length > 0 ? (
                filteredClasses.map((cls, index) => (
                  <TableRow key={index} className="hover:bg-blue-50/50 transition-all duration-200 animate-slideUp border-b border-white/20">
                    <TableCell className="py-4">
                      <div className="space-y-1">
                        <div className="font-semibold text-gray-900">{cls.time}</div>
                        {cls.timeRaw && cls.timeRaw !== cls.time && (
                          <div className="text-xs text-muted-foreground italic bg-gray-100 px-2 py-1 rounded">
                            Original: {cls.timeRaw}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-teal-400"></div>
                        <span className="font-medium">{cls.location}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="space-y-2">
                        <div className="font-bold text-gradient-primary">{cls.className}</div>
                        {cls.uniqueKey && (
                          <div className="glass-card px-2 py-1 rounded-full text-xs w-fit">
                            ID: {cls.uniqueKey.substring(0, 8)}...
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={getTrainerImageUrl(cls.trainer1)}
                          alt={cls.trainer1}
                          className="w-10 h-10 rounded-full border-2 border-blue-200 object-cover shadow-lg hover:scale-110 transition-transform"
                        />
                        <div>
                          <div className="font-semibold text-gray-900">{cls.trainer1}</div>
                          {cls.cover && cls.cover.trim() !== '' && cls.cover !== cls.trainer1 && (
                            <div className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded-full mt-1">
                              Cover: {cls.cover}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="space-y-2">
                        {cls.notes && cls.notes.trim() !== '' && (
                          <div className="text-sm text-muted-foreground bg-gray-50 px-3 py-1 rounded-lg">
                            {cls.notes}
                          </div>
                        )}
                        <div className="flex flex-wrap gap-1">
                          <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full text-xs font-medium">
                            📊 CSV
                          </span>
                          {cls.timeDate && (
                            <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs font-medium">
                              ⏰ Parsed
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="py-12">
                    <div className="flex flex-col items-center gap-4 text-muted-foreground">
                      <Calendar className="h-16 w-16" />
                      <div className="text-center">
                        <div className="font-medium text-lg">No classes found</div>
                        <div className="text-sm">Try adjusting your filters to see more results</div>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* Enhanced Footer */}
        <div className="glass-card border-t border-white/20 p-4">
          <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span className="text-muted-foreground">Data normalized & validated</span>
              </div>
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-500" />
                <span className="text-muted-foreground">Live schedule updates</span>
              </div>
            </div>
            <div className="text-muted-foreground">
              Showing {filteredClasses.length} of {classesByDay[activeDay].length} total classes
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}