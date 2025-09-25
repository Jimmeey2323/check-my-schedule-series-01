import React, { useMemo } from 'react';
import { ClassData, FilterState } from '@/types/schedule';
import { Card, CardContent } from '@/components/ui/card';
import { passesFilters } from '@/utils/filterUtils';
import { motion } from 'framer-motion';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  RadialBarChart,
  RadialBar
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  TrendingUp, 
  Users, 
  MapPin, 
  Clock, 
  Target, 
  Activity,
  BarChart3,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon
} from 'lucide-react';

const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface SummarySectionProps {
  classesByDay: {[day: string]: ClassData[]};
  filters: FilterState;
}

export function SummarySection({ classesByDay, filters }: SummarySectionProps) {
  // Generate comprehensive summary based on filtered data
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
    
    // Helper function to calculate class duration in hours
    const getClassDuration = (cls: ClassData): number => {
      if (!cls.timeDate || !cls.time) return 1; // Default 1 hour if no time info
      
      // Try to extract duration from time string (e.g., "9:00AM - 10:00AM")
      const timeMatch = cls.time.match(/(\d{1,2}):?(\d{0,2})\s*(AM|PM)?\s*-\s*(\d{1,2}):?(\d{0,2})\s*(AM|PM)?/i);
      if (timeMatch) {
        const [, startHour, startMin = '0', startPeriod, endHour, endMin = '0', endPeriod] = timeMatch;
        
        let startTime = parseInt(startHour) + (parseInt(startMin) / 60);
        let endTime = parseInt(endHour) + (parseInt(endMin) / 60);
        
        // Convert to 24-hour format if period is specified
        if (startPeriod && startPeriod.toUpperCase() === 'PM' && startTime < 12) startTime += 12;
        if (startPeriod && startPeriod.toUpperCase() === 'AM' && startTime === 12) startTime = 0;
        if (endPeriod && endPeriod.toUpperCase() === 'PM' && endTime < 12) endTime += 12;
        if (endPeriod && endPeriod.toUpperCase() === 'AM' && endTime === 12) endTime = 0;
        
        const duration = endTime - startTime;
        return duration > 0 ? duration : 1;
      }
      
      return 1; // Default duration
    };
    
    // Count by location with hours
    const locationStats = allClasses.reduce((stats: {[key: string]: {count: number, hours: number}}, cls) => {
      if (!cls.location) return stats;
      if (!stats[cls.location]) stats[cls.location] = {count: 0, hours: 0};
      stats[cls.location].count += 1;
      stats[cls.location].hours += getClassDuration(cls);
      return stats;
    }, {});
    
    // Count by trainer with hours and classes taught
    const trainerStats = allClasses.reduce((stats: {[key: string]: {count: number, hours: number, classes: Set<string>, locations: Set<string>}}, cls) => {
      if (!cls.trainer1) return stats;
      if (!stats[cls.trainer1]) stats[cls.trainer1] = {count: 0, hours: 0, classes: new Set(), locations: new Set()};
      stats[cls.trainer1].count += 1;
      stats[cls.trainer1].hours += getClassDuration(cls);
      if (cls.className) stats[cls.trainer1].classes.add(cls.className);
      if (cls.location) stats[cls.trainer1].locations.add(cls.location);
      return stats;
    }, {});
    
    // Count by day with hours
    const dayStats = allClasses.reduce((stats: {[key: string]: {count: number, hours: number}}, cls) => {
      if (!cls.day) return stats;
      if (!stats[cls.day]) stats[cls.day] = {count: 0, hours: 0};
      stats[cls.day].count += 1;
      stats[cls.day].hours += getClassDuration(cls);
      return stats;
    }, {});
    
    // Count by class type with hours
    const classStats = allClasses.reduce((stats: {[key: string]: {count: number, hours: number, trainers: Set<string>}}, cls) => {
      if (!cls.className) return stats;
      if (!stats[cls.className]) stats[cls.className] = {count: 0, hours: 0, trainers: new Set()};
      stats[cls.className].count += 1;
      stats[cls.className].hours += getClassDuration(cls);
      if (cls.trainer1) stats[cls.className].trainers.add(cls.trainer1);
      return stats;
    }, {});
    
    // Detailed trainer-location breakdown with class names and counts
    const trainerLocationBreakdown: {[trainer: string]: {[location: string]: {count: number, hours: number, classes: {[className: string]: number}}}} = {};
    allClasses.forEach(cls => {
      if (!cls.trainer1 || !cls.location || !cls.className) return;
      
      if (!trainerLocationBreakdown[cls.trainer1]) {
        trainerLocationBreakdown[cls.trainer1] = {};
      }
      if (!trainerLocationBreakdown[cls.trainer1][cls.location]) {
        trainerLocationBreakdown[cls.trainer1][cls.location] = {count: 0, hours: 0, classes: {}};
      }
      if (!trainerLocationBreakdown[cls.trainer1][cls.location].classes[cls.className]) {
        trainerLocationBreakdown[cls.trainer1][cls.location].classes[cls.className] = 0;
      }
      
      trainerLocationBreakdown[cls.trainer1][cls.location].count += 1;
      trainerLocationBreakdown[cls.trainer1][cls.location].hours += getClassDuration(cls);
      trainerLocationBreakdown[cls.trainer1][cls.location].classes[cls.className] += 1;
    });
    
    // Prepare chart data
    const chartData = {
      trainerHours: Object.entries(trainerStats)
        .sort(([,a], [,b]) => b.hours - a.hours)
        .slice(0, 10)
        .map(([trainer, stats]) => ({
          trainer: trainer.length > 15 ? trainer.substring(0, 15) + '...' : trainer,
          fullName: trainer,
          hours: Math.round(stats.hours * 10) / 10,
          classes: stats.count,
          locations: stats.locations.size,
          classTypes: stats.classes.size
        })),
        
      locationDistribution: Object.entries(locationStats)
        .sort(([,a], [,b]) => b.hours - a.hours)
        .map(([location, stats]) => ({
          location: location.length > 20 ? location.substring(0, 20) + '...' : location,
          fullName: location,
          hours: Math.round(stats.hours * 10) / 10,
          classes: stats.count,
          percentage: Math.round((stats.hours / totalHours) * 100)
        })),
        
      dailyDistribution: daysOrder
        .filter(day => dayStats[day])
        .map(day => ({
          day,
          hours: Math.round(dayStats[day].hours * 10) / 10,
          classes: dayStats[day].count
        })),
        
      classTypePopularity: Object.entries(classStats)
        .sort(([,a], [,b]) => b.count - a.count)
        .slice(0, 12)
        .map(([className, stats]) => ({
          className: className.length > 25 ? className.substring(0, 25) + '...' : className,
          fullName: className,
          count: stats.count,
          hours: Math.round(stats.hours * 10) / 10,
          trainers: stats.trainers.size
        }))
    };
    
    // Color palettes for charts
    const colors = {
      primary: ['#8B5CF6', '#A78BFA', '#C4B5FD', '#DDD6FE', '#EDE9FE'],
      secondary: ['#10B981', '#34D399', '#6EE7B7', '#9DECCC', '#C6F6D5'],
      accent: ['#F59E0B', '#FBBF24', '#FCD34D', '#FDE68A', '#FEF3C7'],
      gradient: ['#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981']
    };
    
    // Calculate total hours
    const totalHours = allClasses.reduce((total, cls) => total + getClassDuration(cls), 0);
    
    return {
      locationStats,
      trainerStats,
      dayStats,
      classStats,
      trainerLocationBreakdown,
      chartData,
      colors,
      totalClasses: allClasses.length,
      totalHours
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
    <Card className="glass-card">
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20">
            <span className="text-2xl">�</span>
          </div>
          <div>
            <h2 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Comprehensive Analytics
            </h2>
            <p className="text-sm text-muted-foreground">
              {summary.totalClasses} classes • {summary.totalHours.toFixed(1)} total hours
            </p>
          </div>
        </div>
        
        {/* Summary Cards Grid */}
        <div className="grid gap-4 auto-rows-min sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {/* Total Hours Card */}
          <div className="p-4 rounded-lg bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-200/50 dark:border-indigo-800/50">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
              <h3 className="font-semibold text-indigo-800 dark:text-indigo-200 text-sm">Total Hours</h3>
            </div>
            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              {summary.totalHours.toFixed(1)}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Across all classes
            </div>
          </div>
          
          {/* Total Classes Card */}
          <div className="p-4 rounded-lg bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200/50 dark:border-emerald-800/50">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              <h3 className="font-semibold text-emerald-800 dark:text-emerald-200 text-sm">Total Classes</h3>
            </div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {summary.totalClasses}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Classes scheduled
            </div>
          </div>
          
          {/* Avg Hours Per Day */}
          <div className="p-4 rounded-lg bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border border-orange-200/50 dark:border-orange-800/50">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-orange-500"></div>
              <h3 className="font-semibold text-orange-800 dark:text-orange-200 text-sm">Avg Hours/Day</h3>
            </div>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {Object.keys(summary.dayStats).length > 0 ? (summary.totalHours / Object.keys(summary.dayStats).length).toFixed(1) : '0'}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Average per day
            </div>
          </div>
          
          {/* Unique Trainers */}
          <div className="p-4 rounded-lg bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20 border border-pink-200/50 dark:border-pink-800/50">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-pink-500"></div>
              <h3 className="font-semibold text-pink-800 dark:text-pink-200 text-sm">Trainers</h3>
            </div>
            <div className="text-2xl font-bold text-pink-600 dark:text-pink-400">
              {Object.keys(summary.trainerStats).length}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Unique trainers
            </div>
          </div>
        </div>
        
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Location Analysis */}
          <div className="p-6 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200/50 dark:border-blue-800/50">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <h3 className="font-bold text-blue-800 dark:text-blue-200">Location Breakdown</h3>
            </div>
            <div className="space-y-3 max-h-64 overflow-y-auto fancy-scrollbar">
              {Object.entries(summary.locationStats)
                .sort(([,a], [,b]) => b.hours - a.hours)
                .map(([location, stats]) => (
                  <div key={location} className="p-3 rounded-lg bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-blue-200/30">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium text-gray-800 dark:text-gray-200 text-sm">{location}</span>
                      <div className="text-right">
                        <div className="text-blue-600 dark:text-blue-400 font-bold text-sm">{stats.hours.toFixed(1)}h</div>
                        <div className="text-xs text-gray-500">{stats.count} classes</div>
                      </div>
                    </div>
                    <div className="w-full bg-blue-100 dark:bg-blue-900/50 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full" 
                        style={{width: `${(stats.hours / summary.totalHours) * 100}%`}}
                      ></div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
          
          {/* Trainer Analysis */}
          <div className="p-6 rounded-lg bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200/50 dark:border-emerald-800/50">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              <h3 className="font-bold text-emerald-800 dark:text-emerald-200">Trainer Analysis</h3>
            </div>
            <div className="space-y-3 max-h-64 overflow-y-auto fancy-scrollbar">
              {Object.entries(summary.trainerStats)
                .sort(([,a], [,b]) => b.hours - a.hours)
                .map(([trainer, stats]) => (
                  <div key={trainer} className="p-3 rounded-lg bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-emerald-200/30">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium text-gray-800 dark:text-gray-200 text-sm">{trainer}</span>
                      <div className="text-right">
                        <div className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">{stats.hours.toFixed(1)}h</div>
                        <div className="text-xs text-gray-500">{stats.count} classes</div>
                      </div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                      <span>{stats.classes.size} class types</span>
                      <span>{stats.locations.size} locations</span>
                    </div>
                    <div className="w-full bg-emerald-100 dark:bg-emerald-900/50 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-emerald-500 to-teal-500 h-2 rounded-full" 
                        style={{width: `${(stats.hours / summary.totalHours) * 100}%`}}
                      ></div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
        
        {/* Detailed Trainer-Location Breakdown */}
        <div className="mt-8 p-6 rounded-lg bg-gradient-to-r from-violet-50/80 via-purple-50/80 to-fuchsia-50/80 dark:from-violet-900/20 dark:via-purple-900/20 dark:to-fuchsia-900/20 border border-violet-200/50 dark:border-violet-800/50">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20">
              <span className="text-lg">🎯</span>
            </div>
            <div>
              <h3 className="font-bold text-lg bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 bg-clip-text text-transparent">
                Trainer-Location Matrix
              </h3>
              <p className="text-xs text-muted-foreground">Detailed breakdown by trainer and location</p>
            </div>
          </div>
          
          <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
            {Object.entries(summary.trainerLocationBreakdown)
              .sort(([,a], [,b]) => {
                const aTotal = Object.values(a).reduce((sum, stats) => sum + stats.hours, 0);
                const bTotal = Object.values(b).reduce((sum, stats) => sum + stats.hours, 0);
                return bTotal - aTotal;
              })
              .map(([trainer, locations]) => (
                <div key={trainer} className="p-4 rounded-lg bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-white/30 dark:border-gray-700/30">
                  <div className="font-semibold text-gray-800 dark:text-gray-200 mb-3 text-sm border-b border-gray-200 dark:border-gray-700 pb-2">
                    {trainer}
                  </div>
                  <div className="space-y-2">
                    {Object.entries(locations)
                      .sort(([,a], [,b]) => b.hours - a.hours)
                      .map(([location, stats]) => (
                        <div key={`${trainer}-${location}`} className="flex justify-between items-center p-2 rounded bg-gradient-to-r from-gray-50/50 to-gray-100/50 dark:from-gray-700/50 dark:to-gray-600/50">
                          <div>
                            <div className="font-medium text-xs text-gray-700 dark:text-gray-300">{location}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{stats.classes.size} types</div>
                          </div>
                          <div className="text-right">
                            <div className="text-violet-600 dark:text-violet-400 font-bold text-xs">{stats.hours.toFixed(1)}h</div>
                            <div className="text-xs text-gray-500">{stats.count} classes</div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}