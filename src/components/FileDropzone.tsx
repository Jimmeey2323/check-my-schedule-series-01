
import React, { useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';

interface FileDropzoneProps {
  onFileUpload: (file: File) => void;
  accept: string;
  isLoading?: boolean;
  icon: string;
  iconColor?: string;
  label: string;
}

export function FileDropzone({ 
  onFileUpload, 
  accept, 
  isLoading = false,
  icon,
  iconColor = "text-blue-500",
  label
}: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);
  
  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files.length) {
      onFileUpload(e.dataTransfer.files[0]);
    }
  }, [onFileUpload]);
  
  const handleClick = useCallback(() => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = accept;
    fileInput.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) onFileUpload(file);
    };
    fileInput.click();
  }, [accept, onFileUpload]);
  
  return (
    <Card
      className={`border-4 border-dashed p-12 text-center cursor-pointer transition-colors flex flex-col items-center justify-center ${
        isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white hover:border-blue-500'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      tabIndex={0}
      role="button"
      aria-label={`Drag and drop ${accept} file or click to upload`}
    >
      {isLoading ? (
        <div className="flex flex-col items-center">
          <div className="h-12 w-12 rounded-full border-4 border-t-blue-500 border-b-blue-500 border-r-transparent border-l-transparent animate-spin mb-4"></div>
          <p className="text-lg font-medium text-gray-700">Processing file...</p>
        </div>
      ) : (
        <>
          <i className={`fas fa-${icon} text-6xl ${iconColor} mb-4`}></i>
          <p className="text-lg font-medium text-gray-700 mb-2">{label}</p>
          <p className="text-gray-500">or click to select a file</p>
        </>
      )}
    </Card>
  );
}
