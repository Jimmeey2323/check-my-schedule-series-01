
import React, { useState, useEffect } from 'react';
import { PdfClassData } from '@/types/schedule';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { FileDropzone } from '../FileDropzone';
import { extractTextFromPDF, parseScheduleFromPdfText } from '@/utils/pdfParser';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, FileText, Sparkles, Calendar, Users, MapPin, Activity } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

// Ensure PDF.js worker is configured
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

interface PdfViewerProps {
  savedData: PdfClassData[] | null;
  onDataUpdate: (data: PdfClassData[]) => void;
}

export function PdfViewer({ savedData, onDataUpdate }: PdfViewerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfLibVersion, setPdfLibVersion] = useState<string>('');
  
  useEffect(() => {
    // Display PDF.js version information on component mount
    if (pdfjsLib.version) {
      setPdfLibVersion(`PDF.js v${pdfjsLib.version}`);
      console.log(`Using PDF.js version: ${pdfjsLib.version}`);
    }
  }, []);
  
  // Listen for clear data events
  useEffect(() => {
    const handleDataCleared = () => {
      // Reset error state
      setError(null);
    };

    window.addEventListener('scheduleDataCleared', handleDataCleared);
    return () => window.removeEventListener('scheduleDataCleared', handleDataCleared);
  }, []);
  
  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    setError(null);
    
    try {
      if (file.type !== 'application/pdf') {
        throw new Error('Please upload a valid PDF file.');
      }
      
      // Check file size to prevent memory issues
      const maxSizeMB = 10;
      if (file.size > maxSizeMB * 1024 * 1024) {
        throw new Error(`PDF file is too large. Please upload a file smaller than ${maxSizeMB}MB.`);
      }
      
      // Determine location from filename
      let location = 'Unknown';
      const fname = file.name.toLowerCase();
      if (fname.includes('bandra')) {
        location = 'Bandra';
      } else if (fname.includes('kemps')) {
        location = 'Kemps';
      }
      
      // Save original PDF file for viewing later - with safety checks
      try {
        const arrayBuffer = await file.arrayBuffer();
        // Only store if under reasonable size
        if (arrayBuffer.byteLength < 5 * 1024 * 1024) { // 5MB limit for localStorage
          const base64String = btoa(new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));
          
          localStorage.setItem('originalPdfBlob', base64String);
          localStorage.setItem('pdfFileName', file.name);
          localStorage.setItem('pdfUploadDate', new Date().toLocaleDateString());
        } else {
          console.warn('PDF too large for local storage, skipping preview storage');
        }
      } catch (storageError) {
        console.error('Error storing PDF in localStorage:', storageError);
        // Continue processing even if storage fails
      }
      
      // Process PDF file with timeout protection
      const extractionPromise = extractTextFromPDF(file);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('PDF processing timed out. The file may be too large or complex.')), 30000);
      });
      
      const extractedText = await Promise.race([extractionPromise, timeoutPromise]);
      
      // Store the raw OCR text for the Raw OCS Data tab
      localStorage.setItem('originalPdfOcrText', extractedText);
      localStorage.setItem('pdfOcrTimestamp', new Date().toISOString());
      
      const parsedData = parseScheduleFromPdfText(extractedText, location);
      
      if (parsedData.length === 0) {
        throw new Error('No valid schedule data found in the PDF. Please check the file format.');
      }
      
      onDataUpdate(parsedData);
      toast({
        title: "Success",
        description: `Successfully processed ${parsedData.length} classes from the PDF.`,
        variant: "default",
      });
    } catch (err) {
      console.error('Error processing PDF:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error processing the PDF file';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const uniqueTrainers = savedData ? new Set(savedData.map(cls => cls.trainer)).size : 0;
  const uniqueLocations = savedData ? new Set(savedData.map(cls => cls.location)).size : 0;
  const uniqueDays = savedData ? new Set(savedData.map(cls => cls.day)).size : 0;
  
  return (
    <div className="flex flex-col h-full space-y-4 p-4">
      {!savedData ? (
        <div className="flex flex-col h-full">
          {pdfLibVersion && (
            <div className="text-xs text-gray-500 mb-2 text-right">{pdfLibVersion}</div>
          )}
          <FileDropzone 
            onFileUpload={handleFileUpload}
            accept="application/pdf"
            isLoading={isLoading}
            icon="file-pdf"
            iconColor="text-red-500"
            label="Drag & Drop your PDF file here"
          />
          
          {/* Welcome Message for PDF */}
          <Card className="glass-card p-8 text-center mt-8 max-w-2xl mx-auto">
            <div className="mb-6">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-red-600 to-orange-600 flex items-center justify-center mx-auto mb-4">
                <FileText className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent mb-2">
                PDF Schedule Processor
              </h2>
              <p className="text-gray-600">Upload your PDF schedule for advanced parsing and analysis</p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6 text-sm">
              <div className="text-center p-3 bg-gradient-to-br from-red-50 to-red-100 rounded-lg">
                <FileText className="h-6 w-6 mx-auto mb-2 text-red-600" />
                <div className="font-medium text-red-700">PDF Parsing</div>
              </div>
              <div className="text-center p-3 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg">
                <Activity className="h-6 w-6 mx-auto mb-2 text-orange-600" />
                <div className="font-medium text-orange-700">Data Extract</div>
              </div>
              <div className="text-center p-3 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
                <Sparkles className="h-6 w-6 mx-auto mb-2 text-purple-600" />
                <div className="font-medium text-purple-700">AI Processing</div>
              </div>
            </div>
            
            <div className="text-sm text-gray-500">
              Upload your PDF file to unlock advanced schedule processing
            </div>
          </Card>
        </div>
      ) : (
        <>
          {/* Clean Header Section */}
          <Card className="glass-card border-2 border-red-200/60 shadow-lg">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                {/* Title & Status */}
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-red-600 to-orange-600 flex items-center justify-center shadow-lg">
                    <FileText className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                      PDF Schedule Data
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="h-2 w-2 rounded-full bg-red-400 animate-pulse"></div>
                      <span className="text-sm text-gray-600">
                        {savedData.length} classes • {uniqueTrainers} trainers • {uniqueDays} days
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button 
                    variant="outline"
                    onClick={() => {
                      const fileInput = document.createElement('input');
                      fileInput.type = 'file';
                      fileInput.accept = 'application/pdf';
                      fileInput.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) handleFileUpload(file);
                      };
                      fileInput.click();
                    }}
                    disabled={isLoading}
                    className="hover:bg-red-50 border-red-300"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload New
                  </Button>
                </div>
              </div>
              
              {/* Compact Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-red-600" />
                  <div className="text-sm">
                    <div className="font-semibold text-red-700">{savedData.length}</div>
                    <div className="text-xs text-gray-500">Classes</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-orange-600" />
                  <div className="text-sm">
                    <div className="font-semibold text-orange-700">{uniqueTrainers}</div>
                    <div className="text-xs text-gray-500">Trainers</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-purple-600" />
                  <div className="text-sm">
                    <div className="font-semibold text-purple-700">{uniqueLocations}</div>
                    <div className="text-xs text-gray-500">Locations</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-yellow-600" />
                  <div className="text-sm">
                    <div className="font-semibold text-yellow-700">{uniqueDays}</div>
                    <div className="text-xs text-gray-500">Days</div>
                  </div>
                </div>
              </div>
              
              {pdfLibVersion && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <Badge variant="outline" className="text-xs text-gray-500">
                    {pdfLibVersion}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Enhanced Data Table */}
          <Card className="flex-grow glass-card border-red-200/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5 text-red-600" />
                Parsed Schedule Data
                <Badge variant="secondary" className="ml-auto">
                  {savedData.length} records
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-96">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-white">
                    <TableRow>
                      <TableHead className="font-semibold">Day</TableHead>
                      <TableHead className="font-semibold">Time</TableHead>
                      <TableHead className="font-semibold">Location</TableHead>
                      <TableHead className="font-semibold">Class</TableHead>
                      <TableHead className="font-semibold">Trainer</TableHead>
                      <TableHead className="font-semibold">Theme</TableHead>
                      <TableHead className="font-semibold">Unique Key</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {savedData.map((cls, index) => (
                      <TableRow 
                        key={index} 
                        className="hover:bg-red-50/50 transition-colors border-b border-gray-100"
                      >
                        <TableCell className="font-medium">{cls.day}</TableCell>
                        <TableCell className="font-mono text-sm">{cls.time}</TableCell>
                        <TableCell className="text-sm">{cls.location}</TableCell>
                        <TableCell className="font-medium text-sm">{cls.className}</TableCell>
                        <TableCell className="text-sm">{cls.trainer}</TableCell>
                        <TableCell className="text-purple-600 font-medium text-sm">
                          {cls.theme || (
                            <span className="text-gray-400 italic">-</span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-gray-600 max-w-32 truncate" title={cls.uniqueKey}>
                          {cls.uniqueKey.substring(0, 12)}...
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
