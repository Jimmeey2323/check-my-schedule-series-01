import React, { useState, useCallback } from 'react';
import { ClassData, PdfClassData } from '@/types/schedule';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { 
  Download, 
  FileText, 
  Calendar, 
  Printer, 
  Share2, 
  RefreshCw,
  Settings,
  BookmarkPlus,
  Clock,
  BarChart3,
  CheckCircle,
  AlertTriangle,
  Zap,
  Copy,
  FileSpreadsheet,
  FileImage
} from 'lucide-react';

interface QuickActionToolbarProps {
  csvData?: {[day: string]: ClassData[]} | null;
  pdfData?: PdfClassData[] | null;
  onRefresh?: () => void;
  onShowAnalytics?: () => void;
  onShowConflicts?: () => void;
}

export function QuickActionToolbar({ 
  csvData, 
  pdfData, 
  onRefresh, 
  onShowAnalytics, 
  onShowConflicts 
}: QuickActionToolbarProps) {
  const [isExporting, setIsExporting] = useState(false);

  const totalCsvClasses = csvData ? Object.values(csvData).flat().length : 0;
  const totalPdfClasses = pdfData ? pdfData.length : 0;

  // Export to CSV format
  const exportToCsv = useCallback(async () => {
    if (!csvData) return;
    
    setIsExporting(true);
    try {
      const allClasses = Object.values(csvData).flat();
      const headers = ['Day', 'Time', 'Location', 'Class', 'Trainer', 'Cover', 'Notes'];
      
      const csvContent = [
        headers.join(','),
        ...allClasses.map(cls => [
          cls.day,
          cls.time,
          cls.location,
          `"${cls.className}"`,
          cls.trainer1,
          cls.cover || '',
          `"${cls.notes || ''}"`
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `schedule_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Export Successful",
        description: `Exported ${allClasses.length} classes to CSV format.`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "There was an error exporting the data.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  }, [csvData]);

  // Export to iCal format
  const exportToICal = useCallback(async () => {
    if (!csvData) return;
    
    setIsExporting(true);
    try {
      const allClasses = Object.values(csvData).flat().filter(cls => cls.timeDate);
      
      let icalContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Schedule Viewer//Schedule Export//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH'
      ].join('\r\n');

      allClasses.forEach((cls, index) => {
        const startDate = cls.timeDate!;
        const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // Assume 1 hour duration
        
        const formatDate = (date: Date) => {
          return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        };

        icalContent += '\r\n' + [
          'BEGIN:VEVENT',
          `UID:class-${index}-${Date.now()}@schedule-viewer.com`,
          `DTSTAMP:${formatDate(new Date())}`,
          `DTSTART:${formatDate(startDate)}`,
          `DTEND:${formatDate(endDate)}`,
          `SUMMARY:${cls.className}`,
          `DESCRIPTION:Trainer: ${cls.trainer1}\\nLocation: ${cls.location}${cls.notes ? `\\nNotes: ${cls.notes}` : ''}`,
          `LOCATION:${cls.location}`,
          'END:VEVENT'
        ].join('\r\n');
      });

      icalContent += '\r\nEND:VCALENDAR';

      const blob = new Blob([icalContent], { type: 'text/calendar;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `schedule_${new Date().toISOString().split('T')[0]}.ics`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Calendar Export Successful",
        description: `Exported ${allClasses.length} classes to iCal format.`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "There was an error exporting the calendar.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  }, [csvData]);

  // Copy data to clipboard
  const copyToClipboard = useCallback(async () => {
    if (!csvData) return;
    
    try {
      const allClasses = Object.values(csvData).flat();
      const textContent = allClasses.map(cls => 
        `${cls.day} ${cls.time} - ${cls.className} with ${cls.trainer1} at ${cls.location}`
      ).join('\n');

      await navigator.clipboard.writeText(textContent);
      
      toast({
        title: "Copied to Clipboard",
        description: `Copied ${allClasses.length} class entries to clipboard.`,
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Could not copy data to clipboard.",
        variant: "destructive"
      });
    }
  }, [csvData]);

  // Print function
  const printSchedule = useCallback(() => {
    window.print();
  }, []);

  // Detect data quality issues
  const dataQualityIssues = useCallback(() => {
    if (!csvData) return { issues: 0, warnings: [] };
    
    const allClasses = Object.values(csvData).flat();
    const warnings = [];
    
    // Check for missing time data
    const missingTime = allClasses.filter(cls => !cls.timeDate).length;
    if (missingTime > 0) {
      warnings.push(`${missingTime} classes missing parsed time`);
    }
    
    // Check for missing trainers
    const missingTrainers = allClasses.filter(cls => !cls.trainer1 || cls.trainer1.trim() === '').length;
    if (missingTrainers > 0) {
      warnings.push(`${missingTrainers} classes missing trainer information`);
    }
    
    // Check for missing locations
    const missingLocations = allClasses.filter(cls => !cls.location || cls.location.trim() === '').length;
    if (missingLocations > 0) {
      warnings.push(`${missingLocations} classes missing location information`);
    }
    
    return { issues: warnings.length, warnings };
  }, [csvData]);

  const qualityCheck = dataQualityIssues();

  return (
    <div className="glass-card neat-border rounded-xl p-4 animate-fadeIn">
      <div className="flex flex-wrap items-center gap-3">
        {/* Data Status */}
        <div className="flex items-center gap-3 mr-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></div>
            <span className="text-sm font-medium">Live Data</span>
          </div>
          
          {totalCsvClasses > 0 && (
            <Badge variant="outline" className="neat-border">
              <FileSpreadsheet className="h-3 w-3 mr-1" />
              {totalCsvClasses} CSV
            </Badge>
          )}
          
          {totalPdfClasses > 0 && (
            <Badge variant="outline" className="neat-border">
              <FileText className="h-3 w-3 mr-1" />
              {totalPdfClasses} PDF
            </Badge>
          )}

          {qualityCheck.issues > 0 && (
            <Badge variant="destructive" className="cursor-pointer" title={qualityCheck.warnings.join(', ')}>
              <AlertTriangle className="h-3 w-3 mr-1" />
              {qualityCheck.issues} Issues
            </Badge>
          )}
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Export Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportToCsv}
            disabled={!csvData || isExporting}
            className="neat-border"
          >
            <Download className="h-4 w-4 mr-1" />
            CSV Export
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={exportToICal}
            disabled={!csvData || isExporting}
            className="neat-border"
          >
            <Calendar className="h-4 w-4 mr-1" />
            iCal
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={copyToClipboard}
            disabled={!csvData}
            className="neat-border"
          >
            <Copy className="h-4 w-4 mr-1" />
            Copy
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={printSchedule}
            disabled={!csvData}
            className="neat-border"
          >
            <Printer className="h-4 w-4 mr-1" />
            Print
          </Button>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Analysis Actions */}
        <div className="flex items-center gap-2">
          {onShowAnalytics && (
            <Button
              variant="outline"
              size="sm"
              onClick={onShowAnalytics}
              className="neat-border"
            >
              <BarChart3 className="h-4 w-4 mr-1" />
              Analytics
            </Button>
          )}
          
          {onShowConflicts && qualityCheck.issues > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={onShowConflicts}
              className="neat-border border-orange-200 text-orange-700 hover:bg-orange-50"
            >
              <AlertTriangle className="h-4 w-4 mr-1" />
              Conflicts
            </Button>
          )}
          
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              className="neat-border"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
          )}
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Quick Stats */}
        <div className="flex items-center gap-4 ml-auto">
          <div className="text-sm text-muted-foreground">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
          
          <div className="flex items-center gap-1">
            <CheckCircle className="h-4 w-4 text-emerald-500" />
            <span className="text-sm font-medium">
              {((totalCsvClasses - qualityCheck.issues) / Math.max(totalCsvClasses, 1) * 100).toFixed(0)}% Quality
            </span>
          </div>
        </div>
      </div>
      
      {/* Loading indicator */}
      {isExporting && (
        <div className="mt-3 p-2 glass neat-border rounded-lg">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span>Exporting data...</span>
          </div>
        </div>
      )}
    </div>
  );
}