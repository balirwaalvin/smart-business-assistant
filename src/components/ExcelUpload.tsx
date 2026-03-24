'use client';

import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2, X } from 'lucide-react';
import { useLang } from '@/contexts/LangContext';

interface UploadResult {
    success: boolean;
    totalRows: number;
    imported: number;
    failed: number;
    fileUrl?: string;
    errors?: string[];
}

export default function ExcelUpload({ onUploadComplete }: { onUploadComplete: () => void }) {
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [result, setResult] = useState<UploadResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { t } = useLang();

    const handleFile = (file: File) => {
        if (!file.name.match(/\.(xlsx|xls)$/i)) {
            setError(t('invalidFileError'));
            return;
        }
        setSelectedFile(file);
        setResult(null);
        setError(null);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => setIsDragging(false);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
    };

    const handleUpload = async () => {
        if (!selectedFile) return;

        setIsUploading(true);
        setError(null);
        setResult(null);

        try {
            const formData = new FormData();
            formData.append('file', selectedFile);

            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Upload failed');
                return;
            }

            setResult(data);
            setSelectedFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';

            // Refresh dashboard data
            if (data.imported > 0) {
                onUploadComplete();
            }
        } catch {
            setError(t('uploadFailed'));
        } finally {
            setIsUploading(false);
        }
    };

    const clearFile = () => {
        setSelectedFile(null);
        setResult(null);
        setError(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-violet-50 rounded-lg">
                    <FileSpreadsheet className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-black">{t('importExcelTitle')}</h2>
                    <p className="text-xs text-gray-500">{t('importExcelSub')}</p>
                </div>
            </div>

            {/* Drop Zone */}
            {!selectedFile && !result && (
                <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${isDragging
                            ? 'border-violet-600 bg-violet-50'
                            : 'border-gray-300 hover:border-violet-400 hover:bg-gray-50'
                        }`}
                >
                        <Upload className={`w-8 h-8 mx-auto mb-3 ${isDragging ? 'text-violet-600' : 'text-gray-400'}`} />
                    <p className="text-sm font-medium text-gray-700">
                        {isDragging ? t('dropFileActive') : t('dropFileDrag')}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">{t('clickToBrowse')}</p>
                    <p className="text-xs text-gray-400 mt-3">{t('fileFormats')}</p>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleInputChange}
                        className="hidden"
                    />
                </div>
            )}

            {/* Selected File Preview */}
            {selectedFile && !isUploading && !result && (
                <div className="border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <FileSpreadsheet className="w-8 h-8 text-green-600" />
                        <div>
                            <p className="text-sm font-medium text-black">{selectedFile.name}</p>
                            <p className="text-xs text-gray-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                        </div>
                    </div>
                    <button onClick={clearFile} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
            )}

            {/* Uploading State */}
            {isUploading && (
                <div className="border border-gray-200 rounded-lg p-6 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-violet-600 mx-auto mb-3" />
                    <p className="text-sm font-medium text-black">{t('analyzing')}</p>
                    <p className="text-xs text-gray-500 mt-1">{t('analyzingSubtitle')}</p>
                </div>
            )}

            {/* Success Result */}
            {result && result.success && (
                <div className="border border-green-200 bg-green-50 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-3">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <p className="text-sm font-bold text-green-800">{t('importComplete')}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-white rounded-md p-2 border border-green-100">
                            <p className="text-lg font-bold text-black">{result.totalRows}</p>
                            <p className="text-xs text-gray-500">{t('rowsFound')}</p>
                        </div>
                        <div className="bg-white rounded-md p-2 border border-green-100">
                            <p className="text-lg font-bold text-green-600">{result.imported}</p>
                            <p className="text-xs text-gray-500">{t('rowsImported')}</p>
                        </div>
                        <div className="bg-white rounded-md p-2 border border-green-100">
                            <p className="text-lg font-bold text-violet-600">{result.failed}</p>
                            <p className="text-xs text-gray-500">{t('rowsFailed')}</p>
                        </div>
                    </div>
                    <button
                        onClick={clearFile}
                        className="mt-3 w-full text-sm text-gray-500 hover:text-gray-700 transition-colors"
                    >
                        {t('uploadAnother')}
                    </button>
                </div>
            )}

            {/* Error State */}
            {error && (
                <div className="mt-3 flex items-start space-x-2 p-3 bg-violet-50 border border-violet-200 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-violet-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-violet-700">{error}</p>
                </div>
            )}

            {/* Upload Button */}
            {selectedFile && !isUploading && !result && (
                <button
                    onClick={handleUpload}
                    className="mt-4 w-full bg-violet-600 text-white py-2.5 rounded-lg font-medium hover:bg-violet-700 transition-colors flex items-center justify-center space-x-2"
                >
                    <Upload className="w-4 h-4" />
                    <span>{t('analyzeImport')}</span>
                </button>
            )}
        </div>
    );
}
