import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, Calendar, FileText, AlertCircle, CheckCircle } from 'lucide-react';

interface CleanedOcrViewerProps {}

export function CleanedOcrViewer({}: CleanedOcrViewerProps) {
  const [rawOcrText, setRawOcrText] = useState<string>('');
  const [cleanedData, setCleanedData] = useState<{ [day: string]: string[] }>({});
  const [activeDay, setActiveDay] = useState<string>('');

  useEffect(() => {
    // Load raw OCR text from localStorage
    const ocrText = localStorage.getItem('originalPdfOcrText') || '';
    setRawOcrText(ocrText);

    if (ocrText) {
      const cleaned = cleanAndGroupOcrByDay(ocrText);
      setCleanedData(cleaned);
      
      // Set active day to first available day
      const days = Object.keys(cleaned);
      if (days.length > 0) {
        setActiveDay(days[0]);
      }
    }
  }, []);

  // Listen for updates to OCR data
  useEffect(() => {
    const handleUpdate = () => {
      const ocrText = localStorage.getItem('originalPdfOcrText') || '';
      setRawOcrText(ocrText);
      
      if (ocrText) {
        const cleaned = cleanAndGroupOcrByDay(ocrText);
        setCleanedData(cleaned);
        
        const days = Object.keys(cleaned);
        if (days.length > 0 && !activeDay) {
          setActiveDay(days[0]);
        }
      }
    };

    window.addEventListener('scheduleDataUpdated', handleUpdate);
    return () => window.removeEventListener('scheduleDataUpdated', handleUpdate);
  }, [activeDay]);

  const cleanAndGroupOcrByDay = (text: string): { [day: string]: string[] } => {
    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const result: { [day: string]: string[] } = {};
    
    // Initialize all days
    daysOfWeek.forEach(day => result[day] = []);
    
    // Split by lines and clean
    const lines = text.split(/\n/).map(l => l.trim()).filter(l => l.length > 0);
    
    // Remove garbage lines
    const cleanedLines = lines.filter(line => {
      // Skip location headers
      if (/^KEMPS\s*CORNER$/i.test(line)) return false;
      if (/^STUDIO\s*SCHEDULE$/i.test(line)) return false;
      if (/^Supreme\s*HQ$/i.test(line)) return false;
      if (/^BANDRA$/i.test(line)) return false;
      
      // Skip date headers
      if (/^November\s+\d+/i.test(line)) return false;
      if (/^December\s+\d+/i.test(line)) return false;
      if (/^January\s+\d+/i.test(line)) return false;
      if (/^\d+th\s*-\s*\d+th\s+\d{4}$/i.test(line)) return false;
      if (/^20\d{2}$/i.test(line)) return false;
      
      // Skip difficulty level headers
      if (/^BEGINNER\s*:/i.test(line)) return false;
      if (/^INTERMEDIATE\s*:/i.test(line)) return false;
      if (/^ADVANCED\s*:/i.test(line)) return false;
      
      // Skip class list lines
      if (/^BARRE\s+57\s*,\s*powerCycle$/i.test(line)) return false;
      if (/^CARDIO\s+BARRE/i.test(line) && line.includes('powerCycle') && !line.match(/\d{1,2}[:.]?\d{0,2}\s*(?:AM|PM)/i)) return false;
      if (/^HIIT\s*,\s*AMPED/i.test(line)) return false;
      if (/^STRENGTH\s+LAB\s*,\s*powerCycle$/i.test(line)) return false;
      
      // Skip theme category lines
      if (/^TABATA$/i.test(line)) return false;
      if (/^ICY\s*ISOMETRIC$/i.test(line)) return false;
      if (/^SLAY\s*SUNDAY$/i.test(line)) return false;
      
      return true;
    });

    // Find day header lines (e.g., "MONDAY TUESDAY")
    const dayHeaderLines: { lineIndex: number; days: string[] }[] = [];
    
    cleanedLines.forEach((line, idx) => {
      const foundDays: string[] = [];
      daysOfWeek.forEach(day => {
        if (new RegExp(`\\b${day}\\b`, 'i').test(line)) {
          foundDays.push(day);
        }
      });
      
      if (foundDays.length > 0) {
        dayHeaderLines.push({ lineIndex: idx, days: foundDays });
      }
    });

    // Process each section between day headers
    for (let i = 0; i < dayHeaderLines.length; i++) {
      const currentHeader = dayHeaderLines[i];
      const nextHeader = dayHeaderLines[i + 1];
      
      const startIdx = currentHeader.lineIndex + 1;
      const endIdx = nextHeader ? nextHeader.lineIndex : cleanedLines.length;
      
      const sectionLines = cleanedLines.slice(startIdx, endIdx);
      const sectionDays = currentHeader.days;
      
      // Process each line in this section
      sectionLines.forEach((line) => {
        // Skip if not schedule data
        if (!line.match(/\d{1,2}[:.]?\d{0,2}\s*(?:AM|PM)/i) && 
            !line.match(/BARRE|CYCLE|MAT|FIT|STRENGTH|CARDIO|AMPED|HIIT|RECOVERY/i)) {
          return;
        }
        
        // Split merged row by dash to separate entries
        const entries = splitMergedRow(line);
        
        // Assign entries to days based on number of days in header
        entries.forEach((entry, entryIdx) => {
          const dayIdx = sectionDays.length > 1 && entries.length > 1 
            ? Math.min(entryIdx, sectionDays.length - 1) 
            : 0;
          const assignedDay = sectionDays[dayIdx];
          
          result[assignedDay].push(entry);
        });
      });
    }

    return result;
  };

  const splitMergedRow = (line: string): string[] => {
    const entries: string[] = [];
    
    // Split by dash to find TIME CLASS - TRAINER segments
    const parts = line.split(/\s*[-–—]\s*/);
    
    if (parts.length < 2) {
      // No dashes, return as-is if it has schedule data
      if (line.match(/\d{1,2}[:.]?\d{0,2}\s*(?:AM|PM)/i)) {
        entries.push(line);
      }
      return entries;
    }
    
    let currentPart = parts[0].trim();
    
    for (let i = 1; i < parts.length; i++) {
      const nextPart = parts[i].trim();
      if (!currentPart || !nextPart) continue;
      
      // Extract time from currentPart
      const timeMatch = currentPart.match(/^(\d{1,2}[:.]?\d{0,2}\s*(?:AM|PM))/i);
      if (!timeMatch) {
        currentPart = nextPart;
        continue;
      }
      
      // Check if nextPart contains another time (meaning it's "TRAINER TIME CLASS")
      const nextTimeMatch = nextPart.match(/^([A-Za-z]+)\s+(\d{1,2}[:.]?\d{0,2}\s*(?:AM|PM))/i);
      
      if (nextTimeMatch) {
        // nextPart is "TRAINER TIME CLASS" - extract trainer and create entry
        const trainer = nextTimeMatch[1];
        const fullEntry = `${currentPart} - ${trainer}`;
        entries.push(fullEntry);
        
        // Save rest for next iteration ("TIME CLASS")
        currentPart = nextPart.substring(nextTimeMatch[1].length).trim();
      } else {
        // nextPart is just "TRAINER" - create complete entry
        const fullEntry = `${currentPart} - ${nextPart}`;
        entries.push(fullEntry);
        currentPart = '';
      }
    }
    
    return entries;
  };

  const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const sortedDays = Object.keys(cleanedData).sort((a, b) => {
    const idxA = daysOrder.indexOf(a);
    const idxB = daysOrder.indexOf(b);
    if (idxA === -1 && idxB === -1) return a.localeCompare(b);
    if (idxA === -1) return 1;
    if (idxB === -1) return -1;
    return idxA - idxB;
  });

  const totalLines = Object.values(cleanedData).reduce((sum, lines) => sum + lines.length, 0);
  const originalLines = rawOcrText.split(/\n/).filter(l => l.trim().length > 0).length;
  const removedLines = originalLines - totalLines;

  if (!rawOcrText) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 glass-card rounded-xl">
        <AlertCircle className="h-16 w-16 text-blue-400 mb-4" />
        <h3 className="text-xl font-semibold mb-2 text-gradient-primary">No OCR Data Available</h3>
        <p className="text-muted-foreground text-center max-w-md">
          Upload a PDF file in the "PDF Schedule" tab to see cleaned OCR data here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-6 animate-fadeIn p-6">
      {/* Header Stats */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gradient-primary">
            <Sparkles className="h-5 w-5" />
            Cleaned OCR Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">
                <strong>{originalLines}</strong> original lines
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <span className="text-sm text-muted-foreground">
                <strong>{totalLines}</strong> clean lines
              </span>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-muted-foreground">
                <strong>{removedLines}</strong> garbage lines removed
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-purple-500" />
              <span className="text-sm text-muted-foreground">
                <strong>{sortedDays.length}</strong> days found
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Day Tabs */}
      <Card className="glass-card">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-2">
            {sortedDays.map((day) => (
              <button
                key={day}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300 hover:scale-105 ${
                  activeDay === day
                    ? 'gradient-primary text-white shadow-lg'
                    : 'glass border-white/30 hover:bg-white/20'
                }`}
                onClick={() => setActiveDay(day)}
              >
                {day}
                <Badge className="ml-2 bg-white/20 text-white border-none">
                  {cleanedData[day]?.length || 0}
                </Badge>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Cleaned Data Display */}
      {activeDay && cleanedData[activeDay] && (
        <Card className="glass-card flex-grow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gradient-primary">
              <Calendar className="h-5 w-5" />
              {activeDay} - Cleaned OCR Lines
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {cleanedData[activeDay].length} lines of schedule data
            </p>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px] w-full rounded-lg glass p-4">
              <div className="space-y-2 font-mono text-sm">
                {cleanedData[activeDay].map((line, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg glass-card hover:bg-white/10 transition-colors border border-white/10"
                  >
                    <div className="flex items-start gap-3">
                      <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300 shrink-0">
                        {idx + 1}
                      </Badge>
                      <span className="text-gray-800 break-all">{line}</span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
