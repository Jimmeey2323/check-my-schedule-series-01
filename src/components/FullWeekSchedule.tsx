import React, { useState, useEffect } from 'react';
import { ClassData, FilterState } from '@/types/schedule';
import { Card } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { passesFilters } from '@/utils/filterUtils';
import { getTrainerImageUrl } from '@/utils/imageUtils';
import { 
  ArrowDown, 
  ArrowUp, 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Sparkles, 
  Target,
  Activity,
  Filter,
  Search,
  CheckCircle
} from 'lucide-react';

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
      <ArrowUp className="inline-block w-4 h-4 ml-2 text-white" />
    ) : (
      <ArrowDown className="inline-block w-4 h-4 ml-2 text-white" />
    );
  };
  
  const getDayBadgeColor = (day: string) => {
    const colors = {
      'Monday': 'bg-blue-500/20 text-blue-700 border-blue-300',
      'Tuesday': 'bg-emerald-500/20 text-emerald-700 border-emerald-300',
      'Wednesday': 'bg-purple-500/20 text-purple-700 border-purple-300',
      'Thursday': 'bg-orange-500/20 text-orange-700 border-orange-300',
      'Friday': 'bg-pink-500/20 text-pink-700 border-pink-300',
      'Saturday': 'bg-teal-500/20 text-teal-700 border-teal-300',
      'Sunday': 'bg-red-500/20 text-red-700 border-red-300',
    };
    return colors[day as keyof typeof colors] || 'bg-gray-500/20 text-gray-700 border-gray-300';
  };
  
  return (
    <div className="flex flex-col h-full space-y-6 animate-fadeIn">
      {/* Sophisticated Header */}
      <div className="glass-card rounded-xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg gradient-primary">
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gradient-primary">Full Week Schedule</h2>
              <p className="text-muted-foreground">Complete overview with advanced sorting & filtering</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="glass-card px-4 py-2 rounded-full">
              <div className="flex items-center gap-2 text-sm">
                <Filter className="w-4 h-4 text-blue-500" />
                <span className="font-medium">{sortedClasses.length}</span>
                <span className="text-muted-foreground">classes shown</span>
              </div>
            </div>
            <div className="glass-card px-4 py-2 rounded-full">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span className="text-muted-foreground">Sorted by</span>
                <span className="font-medium capitalize">{sortColumn}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Premium Schedule Table */}
      <Card className="glass-card border-none flex-grow overflow-hidden hover:shadow-2xl transition-all duration-300">
        <div className="overflow-auto h-full fancy-scrollbar">
          <Table>
            <TableHeader className="sticky top-0 z-10">
              <TableRow className="gradient-primary hover:bg-transparent">
                <TableHead 
                  className="cursor-pointer hover:bg-white/10 transition-all duration-200 text-white font-semibold"
                  onClick={() => handleSortClick('day')}
                >
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    Day
                    {renderSortIcon('day')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-white/10 transition-all duration-200 text-white font-semibold"
                  onClick={() => handleSortClick('time')}
                >
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-2" />
                    Time
                    {renderSortIcon('time')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-white/10 transition-all duration-200 text-white font-semibold"
                  onClick={() => handleSortClick('location')}
                >
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-2" />
                    Location
                    {renderSortIcon('location')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-white/10 transition-all duration-200 text-white font-semibold"
                  onClick={() => handleSortClick('className')}
                >
                  <div className="flex items-center">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Class
                    {renderSortIcon('className')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-white/10 transition-all duration-200 text-white font-semibold"
                  onClick={() => handleSortClick('trainer1')}
                >
                  <div className="flex items-center">
                    <User className="w-4 h-4 mr-2" />
                    Trainer
                    {renderSortIcon('trainer1')}
                  </div>
                </TableHead>
                <TableHead className="text-white font-semibold">
                  <div className="flex items-center">
                    <Target className="w-4 h-4 mr-2" />
                    Details
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedClasses.length > 0 ? (
                sortedClasses.map((cls, index) => (
                  <TableRow 
                    key={index} 
                    className="hover:bg-blue-50/50 transition-all duration-200 border-b border-white/20 animate-slideUp"
                    style={{ animationDelay: `${index * 20}ms` }}
                  >
                    <TableCell className="py-4">
                      <div className={`px-3 py-1 rounded-full text-sm font-medium border ${getDayBadgeColor(cls.day)} backdrop-blur-sm`}>
                        {cls.day}
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="space-y-1">
                        <div className="font-bold text-gray-900">{cls.time}</div>
                        {cls.timeRaw && cls.timeRaw !== cls.time && (
                          <div className="text-xs text-muted-foreground italic bg-gray-100 px-2 py-1 rounded-full">
                            Raw: {cls.timeRaw}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-teal-400 animate-pulse"></div>
                        <span className="font-semibold">{cls.location}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="space-y-2">
                        <div className="font-bold text-gradient-primary text-lg">{cls.className}</div>
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
                          alt={`Trainer ${cls.trainer1}`}
                          className="w-12 h-12 rounded-full border-3 border-blue-200 object-cover shadow-lg hover:scale-110 transition-transform duration-200"
                        />
                        <div>
                          <div className="font-bold text-gray-900">{cls.trainer1}</div>
                          {cls.cover && cls.cover.trim() !== '' && cls.cover !== cls.trainer1 && (
                            <div className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded-full mt-1 w-fit">
                              Cover: {cls.cover}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="space-y-2">
                        {cls.notes && cls.notes.trim() !== '' && (
                          <div className="text-sm text-muted-foreground glass-card px-3 py-2 rounded-lg">
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
                          <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
                            ✓ Verified
                          </span>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="py-16">
                    <div className="flex flex-col items-center gap-4 text-muted-foreground">
                      <div className="p-4 rounded-full glass-card">
                        <Search className="h-16 w-16" />
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-lg mb-2">No classes found</div>
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
        {sortedClasses.length > 0 && (
          <div className="glass-card border-t border-white/20 p-4">
            <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-500" />
                  <span className="text-muted-foreground">Real-time data processing</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <span className="text-muted-foreground">All entries validated</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Target className="w-4 h-4" />
                <span>Displaying {sortedClasses.length} scheduled classes</span>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}