import { useState } from 'react';
import { Upload, FileText, X, CheckCircle, AlertCircle } from 'lucide-react';
import { getApiUrl } from '../config/api';

interface DocumentUploadProps {
  onUploadComplete?: () => void;
}

export default function DocumentUpload({ onUploadComplete }: DocumentUploadProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [url, setUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [fileName, setFileName] = useState('');
  const [isProcessingPDF, setIsProcessingPDF] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !content.trim()) {
      setErrorMessage('Title and content are required');
      setUploadStatus('error');
      return;
    }

    setIsUploading(true);
    setUploadStatus('idle');
    setErrorMessage('');

    try {
      const apiUrl = getApiUrl('/ingest-document');
      const headers = {
        'Content-Type': 'application/json',
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title,
          content,
          url: url || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload document');
      }

      const result = await response.json();
      console.log('Document uploaded:', result);

      setUploadStatus('success');
      setTitle('');
      setContent('');
      setUrl('');

      setTimeout(() => {
        setUploadStatus('idle');
        onUploadComplete?.();
      }, 2000);
    } catch (error) {
      console.error('Upload error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to upload document');
      setUploadStatus('error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setUploadStatus('idle');
    setErrorMessage('');

    if (!title) {
      setTitle(file.name.replace(/\.[^/.]+$/, ''));
    }

    if (file.type === 'application/pdf') {
      setIsProcessingPDF(true);
      try {
        const formData = new FormData();
        formData.append('file', file);

        const apiUrl = getApiUrl('/extract-pdf');
        const response = await fetch(apiUrl, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to extract PDF text');
        }

        const result = await response.json();
        setContent(result.text);
        setIsProcessingPDF(false);
      } catch (error) {
        console.error('PDF extraction error:', error);
        setErrorMessage(error instanceof Error ? error.message : 'Failed to extract text from PDF');
        setUploadStatus('error');
        setIsProcessingPDF(false);
      }
    } else {
      try {
        const text = await file.text();
        setContent(text);
      } catch (error) {
        setErrorMessage('Failed to read file. Please make sure it\'s a text file.');
        setUploadStatus('error');
      }
    }
  };

  const handleReset = () => {
    setTitle('');
    setContent('');
    setUrl('');
    setFileName('');
    setUploadStatus('idle');
    setErrorMessage('');
    setIsProcessingPDF(false);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 max-w-3xl mx-auto">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-lg flex items-center justify-center">
          <FileText className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Upload Document</h2>
          <p className="text-sm text-gray-500">Add documents to the knowledge base</p>
        </div>
      </div>

      {uploadStatus === 'success' && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          <p className="text-sm text-green-800 font-medium">Document uploaded successfully!</p>
        </div>
      )}

      {uploadStatus === 'error' && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-800">{errorMessage}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload File (optional)
          </label>
          <div className="relative">
            <input
              type="file"
              accept=".txt,.md,.json,.csv,.log,.xml,.html,.css,.js,.ts,.jsx,.tsx,.py,.java,.c,.cpp,.go,.rs,.sh,.pdf"
              onChange={handleFileUpload}
              disabled={isUploading || isProcessingPDF}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className={`flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-violet-400 transition-all bg-gray-50 hover:bg-violet-50 ${isUploading || isProcessingPDF ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {isProcessingPDF ? (
                <>
                  <div className="w-5 h-5 border-2 border-violet-600 border-t-transparent rounded-full animate-spin mr-2" />
                  <span className="text-sm text-gray-600">Extracting text from PDF...</span>
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-600">
                    {fileName ? fileName : 'Click to select a file or drag & drop'}
                  </span>
                </>
              )}
            </label>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Supported: .txt, .md, .json, .csv, .log, .xml, .html, .css, .js, .ts, .py, .pdf, etc.
          </p>
        </div>

        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter document title"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all"
            disabled={isUploading || isProcessingPDF}
          />
        </div>

        <div>
          <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
            URL (optional)
          </label>
          <input
            id="url"
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/document"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all"
            disabled={isUploading || isProcessingPDF}
          />
        </div>

        <div className="flex items-center space-x-3 pt-2">
          <button
            type="submit"
            disabled={isUploading || isProcessingPDF || !title.trim() || !content.trim()}
            className="flex items-center space-x-2 px-6 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-medium rounded-lg hover:from-violet-700 hover:to-fuchsia-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isUploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>Upload Document</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleReset}
            disabled={isUploading || isProcessingPDF}
            className="flex items-center space-x-2 px-6 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <X className="w-4 h-4" />
            <span>Clear</span>
          </button>
        </div>
      </form>

      <div className="mt-6 pt-6 border-t border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">How it works:</h3>
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex items-start space-x-2">
            <span className="text-violet-600 font-bold">1.</span>
            <span>Your document is converted into vector embeddings using OpenAI</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-violet-600 font-bold">2.</span>
            <span>Stored in the vector database for semantic search</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-violet-600 font-bold">3.</span>
            <span>Instantly searchable through the chat interface</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
