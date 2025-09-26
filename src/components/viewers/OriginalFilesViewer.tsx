import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  Download, 
  Eye, 
  FileSpreadsheet,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  FileImage
} from 'lucide-react';

interface OriginalFilesViewerProps {}

export function OriginalFilesViewer({}: OriginalFilesViewerProps) {
  const [csvContent, setCsvContent] = useState<string | null>(null);
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [csvUploadDate, setCsvUploadDate] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);
  const [pdfUploadDate, setPdfUploadDate] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<'csv' | 'pdf' | null>(null);

  useEffect(() => {
    // Load saved CSV content with safety checks
    const savedCsvText = localStorage.getItem('originalCsvText');
    const savedCsvFileName = localStorage.getItem('csvFileName');
    const savedCsvUploadDate = localStorage.getItem('csvUploadDate');
    
    if (savedCsvText && savedCsvText.length < 1000000) {
      setCsvContent(savedCsvText);
    }
    if (savedCsvFileName) {
      setCsvFileName(savedCsvFileName);
    }
    if (savedCsvUploadDate) {
      setCsvUploadDate(savedCsvUploadDate);
    }

    // Load saved PDF blob with safety checks
    const savedPdfBlob = localStorage.getItem('originalPdfBlob');
    const savedPdfFileName = localStorage.getItem('pdfFileName');
    const savedPdfUploadDate = localStorage.getItem('pdfUploadDate');
    
    if (savedPdfBlob && savedPdfBlob.length < 5000000) {
      try {
        const binaryString = atob(savedPdfBlob);
        const bytes = new Uint8Array(binaryString.length);
        
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        const blob = new Blob([bytes], { type: 'application/pdf' });
        setPdfBlob(blob);
      } catch (error) {
        console.error('Error loading PDF blob:', error);
      }
    }
    
    if (savedPdfFileName) {
      setPdfFileName(savedPdfFileName);
    }
    if (savedPdfUploadDate) {
      setPdfUploadDate(savedPdfUploadDate);
    }
  }, []);

  // Listen for clear data events and reset state
  useEffect(() => {
    const handleDataCleared = () => {
      setCsvContent(null);
      setCsvFileName(null);
      setCsvUploadDate(null);
      setPdfBlob(null);
      setPdfFileName(null);
      setPdfUploadDate(null);
      setSelectedFile(null);
    };

    window.addEventListener('scheduleDataCleared', handleDataCleared);
    return () => window.removeEventListener('scheduleDataCleared', handleDataCleared);
  }, []);

  const downloadFile = (type: 'csv' | 'pdf') => {
    if (type === 'csv' && csvContent && csvFileName) {
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = csvFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else if (type === 'pdf' && pdfBlob && pdfFileName) {
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = pdfFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const viewFile = (type: 'csv' | 'pdf') => {
    setSelectedFile(type);
  };

  const formatFileSize = (size: number) => {
    if (size < 1024) return size + ' B';
    if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB';
    return (size / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const renderCsvTable = (csvContent: string) => {
    const lines = csvContent.trim().split('\n');
    if (lines.length === 0) return null;

    const maxRows = 30;
    const displayLines = lines.slice(0, maxRows);
    
    const rows = displayLines.map(line => {
      return line.split(',').map(cell => cell.trim().replace(/"/g, ''));
    });

    if (rows.length === 0) return null;

    const headers = rows[0];
    const dataRows = rows.slice(1);

    return (
      <div className="overflow-auto max-h-80">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 bg-gradient-primary text-white">
            <tr>
              {headers.map((header, index) => (
                <th key={index} className="border border-gray-300 p-2 font-semibold text-left min-w-24">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataRows.map((row, rowIndex) => (
              <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                {headers.map((_, cellIndex) => (
                  <td key={cellIndex} className="border border-gray-300 p-2 text-gray-800">
                    {row[cellIndex] || ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {lines.length > maxRows && (
          <div className="text-center py-2 text-gray-500 text-xs bg-gray-100 border-t">
            Showing first {maxRows} rows of {lines.length - 1} total rows
          </div>
        )}
      </div>
    );
  };

  const renderFilePreview = () => {
    if (selectedFile === 'csv' && csvContent) {
      return (
        <div className="bg-white border-2 border-gray-200/80 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-bold text-gradient-primary">CSV File Preview</h4>
            <Button
              onClick={() => setSelectedFile(null)}
              className="btn-secondary text-xs"
            >
              Close Preview
            </Button>
          </div>
          {renderCsvTable(csvContent)}
        </div>
      );
    }

    if (selectedFile === 'pdf' && pdfBlob) {
      const pdfUrl = URL.createObjectURL(pdfBlob);
      
      return (
        <div className="bg-white border-2 border-gray-200/80 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-bold text-gradient-primary">PDF File Preview</h4>
            <Button
              onClick={() => setSelectedFile(null)}
              className="btn-secondary text-xs"
            >
              Close Preview
            </Button>
          </div>
          <div className="border border-gray-300 rounded-lg overflow-hidden">
            <object
              data={pdfUrl}
              type="application/pdf"
              width="100%"
              height="500px"
              className="rounded-lg"
            >
              <div className="flex flex-col items-center justify-center h-96 bg-gray-50 text-gray-600">
                <FileText className="h-16 w-16 mb-4 text-gray-400" />
                <p className="text-lg font-medium mb-2">PDF Preview Unavailable</p>
                <p className="text-sm mb-4">Your browser doesn't support PDF viewing</p>
                <Button
                  onClick={() => downloadFile('pdf')}
                  className="btn-primary"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF to View
                </Button>
              </div>
            </object>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <Card className="glass-card p-6 border-2 border-gray-200/60">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg gradient-primary">
            <FileImage className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gradient-primary">Original Files</h2>
            <p className="text-gray-600">View and download your uploaded files</p>
          </div>
        </div>

        {!csvContent && !pdfBlob && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 text-blue-800">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">No files uploaded yet</span>
            </div>
            <p className="text-sm text-blue-600 mt-1">
              Upload CSV or PDF files from other tabs to view them here.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <Card className="glass-card p-6 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-xl gradient-success-light">
                <FileSpreadsheet className="h-8 w-8 text-emerald-700" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gradient-accent">CSV File</h3>
                <p className="text-sm text-gray-600">Schedule data in CSV format</p>
              </div>
            </div>

            {csvContent ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <div className="font-medium text-emerald-800">File Name</div>
                    <div className="text-emerald-700 truncate">{csvFileName || 'Unknown'}</div>
                  </div>
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <div className="font-medium text-emerald-800">Upload Date</div>
                    <div className="text-emerald-700">{csvUploadDate || 'Unknown'}</div>
                  </div>
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <div className="font-medium text-emerald-800">Size</div>
                    <div className="text-emerald-700">{formatFileSize(csvContent.length)}</div>
                  </div>
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <div className="font-medium text-emerald-800">Status</div>
                    <div className="flex items-center gap-1 text-emerald-700">
                      <CheckCircle className="h-3 w-3" />
                      <span>Loaded</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => viewFile('csv')}
                    className="btn-secondary flex-1"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                  <Button
                    onClick={() => downloadFile('csv')}
                    className="btn-primary flex-1"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileSpreadsheet className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <div className="text-sm font-medium text-gray-600 mb-2">No CSV file uploaded yet</div>
                <div className="text-xs text-gray-500 mb-4">Upload a CSV file to see it here</div>
              </div>
            )}
          </Card>

          <Card className="glass-card p-6 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-xl bg-red-50 border border-red-200">
                <FileText className="h-8 w-8 text-red-700" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gradient-secondary">PDF File</h3>
                <p className="text-sm text-gray-600">Schedule data in PDF format</p>
              </div>
            </div>

            {pdfBlob ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="font-medium text-red-800">File Name</div>
                    <div className="text-red-700 truncate">{pdfFileName || 'Unknown'}</div>
                  </div>
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="font-medium text-red-800">Upload Date</div>
                    <div className="text-red-700">{pdfUploadDate || 'Unknown'}</div>
                  </div>
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="font-medium text-red-800">Size</div>
                    <div className="text-red-700">{formatFileSize(pdfBlob.size)}</div>
                  </div>
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="font-medium text-red-800">Status</div>
                    <div className="flex items-center gap-1 text-red-700">
                      <CheckCircle className="h-3 w-3" />
                      <span>Loaded</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => viewFile('pdf')}
                    className="btn-secondary flex-1"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                  <Button
                    onClick={() => downloadFile('pdf')}
                    className="btn-primary flex-1"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <div className="text-sm font-medium text-gray-600 mb-2">No PDF file uploaded yet</div>
                <div className="text-xs text-gray-500 mb-4">Upload a PDF file to see it here</div>
              </div>
            )}
          </Card>
        </div>
      </Card>

      {renderFilePreview()}

      <Card className="glass-card p-6 border-2 border-gray-200/60">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg gradient-info">
            <RefreshCw className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gradient-primary">File Management</h3>
            <p className="text-gray-600">Manage your uploaded files</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 gradient-primary-light rounded-lg text-center">
            <Clock className="h-6 w-6 mx-auto mb-2 text-gray-700" />
            <div className="font-medium text-gray-800">Auto-Save</div>
            <div className="text-xs text-gray-600 mt-1">Files automatically saved to browser storage</div>
          </div>
          <div className="p-4 gradient-accent-light rounded-lg text-center">
            <CheckCircle className="h-6 w-6 mx-auto mb-2 text-indigo-700" />
            <div className="font-medium text-indigo-800">Data Integrity</div>
            <div className="text-xs text-indigo-600 mt-1">Original files preserved unchanged</div>
          </div>
          <div className="p-4 gradient-success-light rounded-lg text-center">
            <Download className="h-6 w-6 mx-auto mb-2 text-emerald-700" />
            <div className="font-medium text-emerald-800">Export Ready</div>
            <div className="text-xs text-emerald-600 mt-1">Download anytime in original format</div>
          </div>
        </div>
      </Card>
    </div>
  );
}