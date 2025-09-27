import React, { useState, useEffect, useMemo } from 'react';
import { ClassData, PdfClassData } from '@/types/schedule';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Database, 
  FileText, 
  Copy,
  Download,
  Search,
  Eye,
  BarChart3,
  AlertCircle,
  CheckCircle,
  Clock,
  Hash,
  RefreshCw
} from 'lucide-react';

interface RawOcsDataViewerProps {
  csvData: {[day: string]: ClassData[]} | null;
  pdfData: PdfClassData[] | null;
}

export function RawOcsDataViewer({ csvData, pdfData }: RawOcsDataViewerProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'csv-raw' | 'pdf-ocr' | 'analysis'>('overview');
  const [rawCsvText, setRawCsvText] = useState<string>('');
  const [rawOcrText, setRawOcrText] = useState<string>('');
  const [ocrTimestamp, setOcrTimestamp] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Load raw data from localStorage
  useEffect(() => {
    const savedCsvText = localStorage.getItem('originalCsvText') || '';
    const savedOcrText = localStorage.getItem('originalPdfOcrText') || '';
    const savedOcrTimestamp = localStorage.getItem('pdfOcrTimestamp') || '';
    
    setRawCsvText(savedCsvText);
    setRawOcrText(savedOcrText);
    setOcrTimestamp(savedOcrTimestamp);
  }, []);

  // Listen for clear data events
  useEffect(() => {
    const handleDataCleared = () => {
      setRawCsvText('');
      setRawOcrText('');
      setOcrTimestamp('');
      setSearchTerm('');
    };

    window.addEventListener('scheduleDataCleared', handleDataCleared);
    return () => window.removeEventListener('scheduleDataCleared', handleDataCleared);
  }, []);

  // Calculate statistics
  const stats = useMemo(() => {
    const csvLineCount = rawCsvText ? rawCsvText.split('\n').length : 0;
    const csvCharCount = rawCsvText.length;
    const ocrLineCount = rawOcrText ? rawOcrText.split('\n').length : 0;
    const ocrCharCount = rawOcrText.length;
    const ocrWordCount = rawOcrText ? rawOcrText.split(/\s+/).length : 0;
    
    return {
      csvLines: csvLineCount,
      csvChars: csvCharCount,
      ocrLines: ocrLineCount,
      ocrChars: ocrCharCount,
      ocrWords: ocrWordCount,
      hasOcr: rawOcrText.length > 0,
      hasCsv: rawCsvText.length > 0,
      processedRecords: (csvData ? Object.values(csvData).flat().length : 0) + (pdfData?.length || 0)
    };
  }, [rawCsvText, rawOcrText, csvData, pdfData]);

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text).then(() => {
      // You could add a toast notification here
      console.log(`${type} text copied to clipboard`);
    });
  };

  const downloadAsFile = (text: string, filename: string) => {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const highlightSearchTerm = (text: string, term: string) => {
    if (!term) return text;
    const regex = new RegExp(`(${term})`, 'gi');
    return text.replace(regex, '**$1**');
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-card border-blue-200 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-blue-600">{stats.csvLines}</div>
                <div className="text-sm text-gray-600">CSV Lines</div>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-red-200 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-red-600">{stats.ocrWords}</div>
                <div className="text-sm text-gray-600">OCR Words</div>
              </div>
              <div className="h-12 w-12 bg-red-100 rounded-xl flex items-center justify-center">
                <Search className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-green-200 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-green-600">{stats.processedRecords}</div>
                <div className="text-sm text-gray-600">Processed Records</div>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-purple-200 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {stats.hasOcr && stats.hasCsv ? '100' : stats.hasOcr || stats.hasCsv ? '50' : '0'}%
                </div>
                <div className="text-sm text-gray-600">Data Coverage</div>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Source Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-blue-600" />
              CSV Raw Data Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.hasCsv ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">File Size</span>
                  <Badge variant="secondary">{(stats.csvChars / 1024).toFixed(1)} KB</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Total Lines</span>
                  <Badge variant="secondary">{stats.csvLines} lines</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Status</span>
                  <Badge className="bg-green-100 text-green-700">Available</Badge>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <div className="text-sm">No CSV data available</div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-red-600" />
              PDF OCR Data Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.hasOcr ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Text Size</span>
                  <Badge variant="secondary">{(stats.ocrChars / 1024).toFixed(1)} KB</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Word Count</span>
                  <Badge variant="secondary">{stats.ocrWords} words</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Extracted</span>
                  <Badge className="bg-blue-100 text-blue-700">
                    {ocrTimestamp ? new Date(ocrTimestamp).toLocaleString() : 'Unknown'}
                  </Badge>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Search className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <div className="text-sm">No OCR data available</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderCsvRaw = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold">Raw CSV Data</h3>
          <Badge variant="outline">{stats.csvLines} lines</Badge>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => copyToClipboard(rawCsvText, 'CSV')}
            disabled={!stats.hasCsv}
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadAsFile(rawCsvText, 'raw_csv_data.csv')}
            disabled={!stats.hasCsv}
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>
      </div>

      {stats.hasCsv ? (
        <Card className="glass-card">
          <CardContent className="p-4">
            <ScrollArea className="h-96">
              <pre className="text-xs font-mono whitespace-pre-wrap text-gray-800 leading-relaxed">
                {rawCsvText}
              </pre>
            </ScrollArea>
          </CardContent>
        </Card>
      ) : (
        <Card className="glass-card p-8 text-center">
          <AlertCircle className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">No CSV Data Available</h3>
          <p className="text-gray-500">Upload a CSV file to view raw data</p>
        </Card>
      )}
    </div>
  );

  const renderPdfOcr = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Search className="h-5 w-5 text-red-600" />
          <h3 className="text-lg font-semibold">Raw OCR Text from PDF</h3>
          <Badge variant="outline">{stats.ocrWords} words</Badge>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => copyToClipboard(rawOcrText, 'OCR')}
            disabled={!stats.hasOcr}
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadAsFile(rawOcrText, 'raw_ocr_text.txt')}
            disabled={!stats.hasOcr}
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>
      </div>

      {/* Search functionality for OCR text */}
      {stats.hasOcr && (
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search in OCR text..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {stats.hasOcr ? (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Eye className="h-4 w-4" />
              OCR Extracted Text
              {ocrTimestamp && (
                <Badge variant="outline" className="ml-auto text-xs">
                  Extracted: {new Date(ocrTimestamp).toLocaleString()}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <ScrollArea className="h-96">
              <pre className="text-sm font-mono whitespace-pre-wrap text-gray-800 leading-relaxed bg-gray-50 p-4 rounded-lg">
                {searchTerm ? highlightSearchTerm(rawOcrText, searchTerm) : rawOcrText}
              </pre>
            </ScrollArea>
          </CardContent>
        </Card>
      ) : (
        <Card className="glass-card p-8 text-center">
          <AlertCircle className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">No OCR Data Available</h3>
          <p className="text-gray-500">Upload a PDF file to view raw OCR text</p>
        </Card>
      )}
    </div>
  );

  const renderAnalysis = () => (
    <div className="space-y-6">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-purple-600" />
            Raw Data Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Data Quality Metrics */}
          <div>
            <h4 className="font-semibold mb-3">Data Quality Metrics</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-blue-700">CSV Data Size</span>
                  <Badge className="bg-blue-100 text-blue-700">
                    {(stats.csvChars / 1024).toFixed(1)} KB
                  </Badge>
                </div>
                <div className="text-xs text-blue-600">
                  {stats.csvLines} lines • {stats.csvChars} characters
                </div>
              </div>

              <div className="p-4 bg-red-50 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-red-700">OCR Text Size</span>
                  <Badge className="bg-red-100 text-red-700">
                    {(stats.ocrChars / 1024).toFixed(1)} KB
                  </Badge>
                </div>
                <div className="text-xs text-red-600">
                  {stats.ocrWords} words • {stats.ocrChars} characters
                </div>
              </div>
            </div>
          </div>

          {/* Processing Results */}
          <div>
            <h4 className="font-semibold mb-3">Processing Results</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Records Processed</span>
                </div>
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  {stats.processedRecords} total
                </Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">CSV Processing Success</span>
                </div>
                <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                  {stats.hasCsv ? 'Success' : 'Not Available'}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium">OCR Extraction Success</span>
                </div>
                <Badge variant="secondary" className="bg-red-100 text-red-700">
                  {stats.hasOcr ? 'Success' : 'Not Available'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Data Coverage */}
          {stats.hasOcr && (
            <div>
              <h4 className="font-semibold mb-3">OCR Quality Indicators</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="font-bold text-lg">{stats.ocrLines}</div>
                  <div className="text-gray-600">Lines</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="font-bold text-lg">{stats.ocrWords}</div>
                  <div className="text-gray-600">Words</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="font-bold text-lg">
                    {stats.ocrWords > 0 ? (stats.ocrChars / stats.ocrWords).toFixed(1) : '0'}
                  </div>
                  <div className="text-gray-600">Avg Word Length</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="font-bold text-lg">
                    {ocrTimestamp ? new Date(ocrTimestamp).toLocaleDateString() : 'N/A'}
                  </div>
                  <div className="text-gray-600">Extract Date</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="flex flex-col h-full space-y-6 p-6">
      {/* Header */}
      <div className="glass-card rounded-xl p-6 border-2 border-gray-200/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shadow-lg">
              <Database className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Raw OCS Data Viewer
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <div className="h-2 w-2 rounded-full bg-purple-400 animate-pulse shadow-lg shadow-purple-400/50"></div>
                <span className="text-sm text-gray-600">
                  Raw OCR & CSV Data • Last updated: {new Date().toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm">
              <Eye className="h-4 w-4 mr-2" />
              View Mode
            </Button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
        <TabsList className="grid w-full grid-cols-4 glass-card">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="csv-raw" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            CSV Raw ({stats.csvLines})
          </TabsTrigger>
          <TabsTrigger value="pdf-ocr" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            PDF OCR ({stats.ocrWords})
          </TabsTrigger>
          <TabsTrigger value="analysis" className="flex items-center gap-2">
            <Hash className="h-4 w-4" />
            Analysis
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          {renderOverview()}
        </TabsContent>

        <TabsContent value="csv-raw" className="mt-6">
          {renderCsvRaw()}
        </TabsContent>

        <TabsContent value="pdf-ocr" className="mt-6">
          {renderPdfOcr()}
        </TabsContent>

        <TabsContent value="analysis" className="mt-6">
          {renderAnalysis()}
        </TabsContent>
      </Tabs>
    </div>
  );
}