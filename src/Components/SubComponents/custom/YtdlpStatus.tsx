import React, { useState, useEffect } from 'react';
import { Button } from '../shadcn/components/ui/button';
import { Badge } from '../shadcn/components/ui/badge';
import { CheckCircle, Download, AlertCircle, RefreshCw } from 'lucide-react';

interface YtdlpStatusInfo {
  available: boolean;
  path: string | null;
  needsDownload: boolean;
  version?: string | null;
  error?: string;
}

interface YtdlpStatusProps {
  className?: string;
}

export const YtdlpStatus: React.FC<YtdlpStatusProps> = ({ className }) => {
  const [status, setStatus] = useState<YtdlpStatusInfo | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const checkStatus = async () => {
    try {
      const statusInfo = await window.ytdlp.checkStatus();
      setStatus(statusInfo);
    } catch (error) {
      console.error('Error checking yt-dlp status:', error);
      setStatus({
        available: false,
        path: null,
        needsDownload: true,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const downloadBinary = async () => {
    setIsDownloading(true);
    setDownloadError(null);
    setDownloadSuccess(false);

    try {
      const result = await window.ytdlp.downloadBinary();
      if (result.success) {
        setDownloadSuccess(true);
        await checkStatus(); // Refresh status
      } else {
        setDownloadError(result.error || 'Failed to download yt-dlp');
      }
    } catch (error) {
      setDownloadError(
        error instanceof Error ? error.message : 'Unknown error',
      );
    } finally {
      setIsDownloading(false);
    }
  };

  useEffect(() => {
    checkStatus();

    // Set up event listeners
    const unsubscribeStarted = window.ytdlp.onDownloadStarted(() => {
      setIsDownloading(true);
      setDownloadError(null);
    });

    const unsubscribeSuccess = window.ytdlp.onDownloadSuccess(() => {
      setIsDownloading(false);
      setDownloadSuccess(true);
      checkStatus();
    });

    const unsubscribeFailed = window.ytdlp.onDownloadFailed((error: string) => {
      setIsDownloading(false);
      setDownloadError(error);
    });

    return () => {
      unsubscribeStarted();
      unsubscribeSuccess();
      unsubscribeFailed();
    };
  }, []);

  if (!status) {
    return (
      <div className={`border rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Checking yt-dlp status...</span>
        </div>
      </div>
    );
  }

  const getStatusIcon = () => {
    if (status.available) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
    return <AlertCircle className="h-5 w-5 text-yellow-500" />;
  };

  const getStatusBadge = () => {
    if (status.available) {
      return (
        <Badge variant="secondary" className="bg-green-100 text-green-800">
          Available
        </Badge>
      );
    }
    if (status.needsDownload) {
      return (
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
          Needs Download
        </Badge>
      );
    }
    return <Badge variant="destructive">Error</Badge>;
  };

  return (
    <div className={`border rounded-lg ${className}`}>
      <div className="p-4 pb-3 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            <h3 className="text-lg font-semibold">yt-dlp Status</h3>
          </div>
          {getStatusBadge()}
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Video downloader backend status
        </p>
      </div>
      <div className="p-4">
        <div className="space-y-3">
          {status.available && (
            <div className="space-y-2">
              <div className="text-sm">
                <strong>Version:</strong> {status.version || 'Unknown'}
              </div>
              <div className="text-sm text-muted-foreground">
                <strong>Path:</strong> {status.path}
              </div>
            </div>
          )}

          {status.needsDownload && !status.available && (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                yt-dlp is required for downloading videos. Click below to
                download it automatically.
              </div>
              <Button
                onClick={downloadBinary}
                disabled={isDownloading}
                className="w-full"
              >
                {isDownloading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Download yt-dlp
                  </>
                )}
              </Button>
            </div>
          )}

          {downloadSuccess && (
            <div className="text-sm text-green-600 bg-green-50 p-2 rounded">
              ✅ yt-dlp downloaded successfully!
            </div>
          )}

          {downloadError && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
              ❌ Download failed: {downloadError}
            </div>
          )}

          {status.error && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
              ⚠️ Error: {status.error}
            </div>
          )}

          <div className="pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={checkStatus}
              className="w-full"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Status
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default YtdlpStatus;
