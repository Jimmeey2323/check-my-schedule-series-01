
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
  
  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    setError(null);
    
    try {
      if (file.type !== 'application/pdf') {
        throw new Error('Please upload a valid PDF file.');
      }
      
      // Determine location from filename
      let location = 'Unknown';
      const fname = file.name.toLowerCase();
      if (fname.includes('bandra')) {
        location = 'Bandra';
      } else if (fname.includes('kemps')) {
        location = 'Kemps';
      }
      
      // Save original PDF file for viewing later
      const arrayBuffer = await file.arrayBuffer();
      const base64String = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      
      localStorage.setItem('originalPdfBlob', base64String);
      localStorage.setItem('pdfFileName', file.name);
      localStorage.setItem('pdfUploadDate', new Date().toLocaleDateString());
      
      // Process PDF file
      const extractedText = await extractTextFromPDF(file);
      const parsedData = parseScheduleFromPdfText(extractedText, location);
      
      if (parsedData.length === 0) {
        throw new Error('No valid schedule data found in the PDF.');
      }
      
      onDataUpdate(parsedData);
    } catch (err) {
      console.error('Error processing PDF:', err);
      setError(err instanceof Error ? err.message : 'Unknown error processing the PDF file');
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : 'Unknown error processing the PDF file',
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
