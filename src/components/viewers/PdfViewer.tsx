
import React, { useState, useEffect } from 'react';
import { PdfClassData } from '@/types/schedule';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { FileDropzone } from '../FileDropzone';
import { extractTextFromPDF, extractTextWithPositions, extractWithVisualOCR, parseScheduleFromPdfText, parseScheduleFromColumns } from '@/utils/pdfParser';
import { extractScheduleWithGemini, enhanceOCRWithGemini } from '@/utils/geminiOCR';
import { extractScheduleFromImage } from '@/utils/imageUtils';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Upload, FileText, Sparkles, Calendar, Users, MapPin, Activity, Brain, Zap } from 'lucide-react';
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
  const [processingProgress, setProcessingProgress] = useState<number>(0);
  const [processingMessage, setProcessingMessage] = useState<string>('');
  
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
    setProcessingProgress(0);
    setProcessingMessage('');
    
    try {
      const isImage = file.type.startsWith('image/');
      const isPdf = file.type === 'application/pdf';
      
      if (!isPdf && !isImage) {
        throw new Error('Please upload a valid PDF or image file (PNG, JPG, WEBP).');
      }
      
      // Check file size to prevent memory issues
      const maxSizeMB = isImage ? 20 : 10;
      if (file.size > maxSizeMB * 1024 * 1024) {
        throw new Error(`File is too large. Please upload a file smaller than ${maxSizeMB}MB.`);
      }
      
      // Determine location from filename
      let location = 'Unknown';
      const fname = file.name.toLowerCase();
      if (fname.includes('bandra')) {
        location = 'Bandra';
      } else if (fname.includes('kemps')) {
        location = 'Kemps';
      }
      
      let parsedData: PdfClassData[] = [];
      let rawText = '';
      
      // === HANDLE IMAGE FILES ===
      if (isImage) {
        toast({
          title: "🤖 AI Vision Processing",
          description: "Analyzing image with Gemini Vision AI...",
          variant: "default",
        });
        
        const imageResult = await extractScheduleFromImage(
          file,
          location,
          (progress, message) => {
            setProcessingProgress(progress);
            setProcessingMessage(message);
          }
        );
        
        if (imageResult.success && imageResult.data.length > 0) {
          parsedData = imageResult.data;
          rawText = imageResult.rawText;
          
          toast({
            title: "✨ AI Vision Success",
            description: `Extracted ${parsedData.length} classes from image`,
            variant: "default",
          });
        } else {
          throw new Error(imageResult.error || 'Failed to extract schedule from image');
        }
      }
      
      // === HANDLE PDF FILES ===
      if (isPdf) {
        // Save original PDF file for viewing later
        try {
          const arrayBuffer = await file.arrayBuffer();
          if (arrayBuffer.byteLength < 5 * 1024 * 1024) {
            const base64String = btoa(new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));
            localStorage.setItem('originalPdfBlob', base64String);
            localStorage.setItem('pdfFileName', file.name);
            localStorage.setItem('pdfUploadDate', new Date().toLocaleDateString());
          }
        } catch (storageError) {
          console.error('Error storing PDF in localStorage:', storageError);
        }
        
        // === PRIMARY EXTRACTION: Use Gemini Vision API ===
        toast({
          title: "🤖 AI Vision Processing",
          description: "Using advanced AI vision to analyze your schedule...",
          variant: "default",
        });
        
        // Try Gemini Vision extraction first (most accurate)
        try {
          console.log('Starting Gemini Vision extraction...');
          const geminiResult = await extractScheduleWithGemini(
            file,
            location,
            (progress, message) => {
              setProcessingProgress(progress);
              setProcessingMessage(message);
            }
          );
          
          if (geminiResult.success && geminiResult.data.length > 0) {
            console.log(`Gemini Vision extracted ${geminiResult.data.length} classes successfully!`);
            parsedData = geminiResult.data;
            rawText = geminiResult.rawText;
            
            toast({
              title: "✨ AI Vision Success",
              description: `Extracted ${parsedData.length} classes with high accuracy`,
              variant: "default",
            });
          } else {
            console.warn('Gemini Vision extraction returned no data, falling back to OCR...');
          }
        } catch (geminiError) {
          console.error('Gemini Vision extraction failed:', geminiError);
          toast({
            title: "AI Vision Fallback",
            description: "Falling back to traditional OCR extraction...",
            variant: "default",
          });
        }
        
        // === FALLBACK 1: Use Tesseract OCR + Gemini text enhancement ===
        if (parsedData.length === 0) {
          setProcessingMessage('Falling back to OCR extraction...');
          
          const extractionPromise = extractWithVisualOCR(file);
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('PDF processing timed out. The file may be too large or complex.')), 60000);
          });
          
          const { fullText, columns } = await Promise.race([extractionPromise, timeoutPromise]);
          rawText = fullText;
          
          // Store the raw OCR text
          localStorage.setItem('originalPdfOcrText', fullText);
          localStorage.setItem('pdfOcrTimestamp', new Date().toISOString());
          
          // Try to enhance OCR text with Gemini
          try {
            console.log('Enhancing OCR text with Gemini...');
            setProcessingMessage('Enhancing OCR results with AI...');
            const enhancedResult = await enhanceOCRWithGemini(fullText, location);
            
            if (enhancedResult.success && enhancedResult.data.length > 0) {
              console.log(`Gemini enhanced extraction found ${enhancedResult.data.length} classes`);
              parsedData = enhancedResult.data;
              
              toast({
                title: "🧠 AI Enhancement Success",
                description: `AI improved OCR results: ${parsedData.length} classes extracted`,
                variant: "default",
              });
            }
          } catch (enhanceError) {
            console.error('Gemini text enhancement failed:', enhanceError);
          }
          
          // === FALLBACK 2: Use traditional parsing ===
          if (parsedData.length === 0) {
            setProcessingMessage('Using traditional parsing...');
            
            // Try column-based parsing first (from visual OCR)
            parsedData = parseScheduleFromColumns(columns, location);
            console.log(`Visual OCR column parsing found ${parsedData.length} classes`);
            
            // Also try text-based parsing
            const textParsedData = parseScheduleFromPdfText(fullText, location);
            console.log(`Text-based parsing found ${textParsedData.length} classes`);
            
            // Helper function to check if class entry is garbage
            const isGarbageEntry = (cls: typeof textParsedData[0]): boolean => {
              const name = cls.className;
              
              if (/^[a-z]{1,4}\s+\d/i.test(name)) return true;
              if (/^\d+:\d+\s*(AM|PM)?\s+/i.test(name)) return true;
              if (/^[a-z]+\s+\d+:?\d*/i.test(name) && !/^Studio/i.test(name)) return true;
              if (/^[a-z]\s+\d/i.test(name)) return true;
              if (/S00AM|S00PM/i.test(name)) return true;
              if (name.length < 5) return true;
              if (/\d{3,}|[A-Z]{2,}\s+\d+\s+[A-Z]/i.test(name)) return true;
              
              const hourMatch = cls.time.match(/^(\d+):/);
              if (hourMatch) {
                const hour = parseInt(hourMatch[1]);
                if (hour > 12 || hour === 0) return true;
              }
              
              return false;
            };
            
            // Filter garbage entries
            parsedData = parsedData.filter(cls => !isGarbageEntry(cls));
            
            // Merge results
            const existingKeys = new Set(parsedData.map(c => c.uniqueKey));
            const existingCombos = new Set(parsedData.map(c => 
              `${c.day.toLowerCase()}-${c.className.toLowerCase()}-${c.trainer.toLowerCase()}`
            ));
            
            textParsedData.forEach(cls => {
              if (existingKeys.has(cls.uniqueKey)) return;
              if (isGarbageEntry(cls)) return;
              
              const combo = `${cls.day.toLowerCase()}-${cls.className.toLowerCase()}-${cls.trainer.toLowerCase()}`;
              if (existingCombos.has(combo)) return;
              
              if (cls.time === 'TBD') {
                const dayHasProperTimes = parsedData.some(existing => 
                  existing.day.toLowerCase() === cls.day.toLowerCase() && existing.time !== 'TBD'
                );
                if (dayHasProperTimes) return;
              }
              
              parsedData.push(cls);
              existingKeys.add(cls.uniqueKey);
              existingCombos.add(combo);
            });
          }
        }
      }
      
      // Store raw text
      if (rawText) {
        localStorage.setItem('originalPdfOcrText', rawText);
        localStorage.setItem('pdfOcrTimestamp', new Date().toISOString());
      }
      
      console.log(`Final total: ${parsedData.length} classes from ${new Set(parsedData.map(c => c.day)).size} days`);
      
      if (parsedData.length === 0) {
        throw new Error('No valid schedule data found. Please check the file format.');
      }
      
      onDataUpdate(parsedData);
      toast({
        title: "🎉 Success",
        description: `Successfully processed ${parsedData.length} classes.`,
        variant: "default",
      });
    } catch (err) {
      console.error('Error processing file:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error processing the file';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setProcessingProgress(0);
      setProcessingMessage('');
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
          
          {/* Progress indicator when processing */}
          {isLoading && (
            <Card className="glass-card mb-4 p-4 border-blue-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center animate-pulse">
                  <Brain className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-blue-700">AI Processing</div>
                  <div className="text-xs text-gray-500">{processingMessage || 'Analyzing document...'}</div>
                </div>
                <div className="text-sm font-mono text-blue-600">{processingProgress}%</div>
              </div>
              <Progress value={processingProgress} className="h-2" />
            </Card>
          )}
          
          <FileDropzone 
            onFileUpload={handleFileUpload}
            accept="application/pdf,image/png,image/jpeg,image/jpg,image/webp"
            isLoading={isLoading}
            icon="file-pdf"
            iconColor="text-red-500"
            label="Drag & Drop your PDF or Image file here"
          />
          
          {/* Welcome Message for PDF */}
          <Card className="glass-card p-8 text-center mt-8 max-w-2xl mx-auto">
            <div className="mb-6">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-red-600 to-orange-600 flex items-center justify-center mx-auto mb-4">
                <Brain className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent mb-2">
                AI-Powered PDF Schedule Processor
              </h2>
              <p className="text-gray-600">Advanced Gemini Vision AI for accurate schedule extraction</p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-sm">
              <div className="text-center p-3 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
                <Brain className="h-6 w-6 mx-auto mb-2 text-purple-600" />
                <div className="font-medium text-purple-700">Gemini Vision</div>
                <div className="text-xs text-gray-500">AI Analysis</div>
              </div>
              <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                <Zap className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                <div className="font-medium text-blue-700">High Accuracy</div>
                <div className="text-xs text-gray-500">Smart OCR</div>
              </div>
              <div className="text-center p-3 bg-gradient-to-br from-red-50 to-red-100 rounded-lg">
                <FileText className="h-6 w-6 mx-auto mb-2 text-red-600" />
                <div className="font-medium text-red-700">Multi-Page</div>
                <div className="text-xs text-gray-500">Full Support</div>
              </div>
              <div className="text-center p-3 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg">
                <Sparkles className="h-6 w-6 mx-auto mb-2 text-orange-600" />
                <div className="font-medium text-orange-700">Auto-Fix</div>
                <div className="text-xs text-gray-500">OCR Errors</div>
              </div>
            </div>
            
            <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
              <strong>How it works:</strong> Upload your PDF schedule or screenshot image and our AI will analyze it visually, 
              extracting class times, names, trainers, and themes with high accuracy. Supports PDF, PNG, JPG, and WEBP files.
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
                      fileInput.accept = 'application/pdf,image/png,image/jpeg,image/jpg,image/webp';
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
