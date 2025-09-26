
import React, { useState, useEffect } from 'react';
import { PdfClassData } from '@/types/schedule';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { FileDropzone } from '../FileDropzone';
import { extractTextFromPDF, parseScheduleFromPdfText } from '@/utils/pdfParser';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
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
  
  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {!savedData ? (
        <>
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
        </>
      ) : (
        <>
          <div className="flex justify-between mb-4">
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
              className="text-sm"
            >
              Upload New PDF
            </Button>
            
            {pdfLibVersion && (
              <div className="text-xs text-gray-500 self-center">{pdfLibVersion}</div>
            )}
          </div>

          <Card className="flex-grow overflow-hidden">
            <CardContent className="p-0 h-full overflow-auto">
              <div>
                <Table>
                  <TableHeader className="sticky top-0 z-10">
                    <TableRow>
                      <TableHead>Day</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Trainer</TableHead>
                      <TableHead>Unique Key</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {savedData.map((cls, index) => (
                      <TableRow key={index} className="hover:bg-red-50">
                        <TableCell>{cls.day}</TableCell>
                        <TableCell>{cls.time}</TableCell>
                        <TableCell>{cls.location}</TableCell>
                        <TableCell>{cls.className}</TableCell>
                        <TableCell>{cls.trainer}</TableCell>
                        <TableCell className="font-mono text-xs break-all">{cls.uniqueKey}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
