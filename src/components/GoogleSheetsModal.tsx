import React, { useState } from 'react';
import { X, ExternalLink, Key, FileSpreadsheet, AlertCircle } from 'lucide-react';

interface GoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (config: GoogleSheetsConfig) => void;
}

interface GoogleSheetsConfig {
  spreadsheetId: string;
  range: string;
  apiKey: string;
}

export const GoogleSheetsModal: React.FC<GoogleSheetsModalProps> = ({
  isOpen,
  onClose,
  onConnect
}) => {
  const [config, setConfig] = useState<GoogleSheetsConfig>({
    spreadsheetId: '1331ogfREfU_aunmaQ17GxQ0QrLD7JoENPrU9pxQa4VY',
    range: 'Sheet1!A:H',
    apiKey: ''
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string>('');

  const handleConnect = async () => {
    if (!config.spreadsheetId || !config.apiKey) {
      setError('Please fill in all required fields');
      return;
    }

    setIsConnecting(true);
    setError('');

    try {
      await onConnect(config);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to Google Sheets');
    } finally {
      setIsConnecting(false);
    }
  };

  const extractSpreadsheetId = (url: string): string => {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : url;
  };

  const handleUrlChange = (url: string) => {
    const id = extractSpreadsheetId(url);
    setConfig(prev => ({ ...prev, spreadsheetId: id }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 w-full max-w-2xl mx-4 border border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <FileSpreadsheet className="w-6 h-6 text-green-400" />
            <h3 className="text-xl font-semibold text-white">Connect Google Sheets</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-800 rounded transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <span className="text-red-400 text-sm">{error}</span>
          </div>
        )}

        <div className="space-y-6">
          {/* Setup Instructions */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h4 className="font-medium text-white mb-3">Setup Instructions:</h4>
            <ol className="text-sm text-gray-300 space-y-2 list-decimal list-inside">
              <li>
                Go to{' '}
                <a
                  href="https://console.developers.google.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 inline-flex items-center"
                >
                  Google Cloud Console <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </li>
              <li>Create a new project or select an existing one</li>
              <li>Enable the Google Sheets API</li>
              <li>Create credentials (API Key) for the Google Sheets API</li>
              <li>Make sure your Google Sheet is publicly accessible (Anyone with the link can view)</li>
            </ol>
          </div>

          {/* Google Sheets URL */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Google Sheets URL or Spreadsheet ID *
            </label>
            <input
              type="text"
              placeholder="https://docs.google.com/spreadsheets/d/your-sheet-id/edit or just the ID"
              value={config.spreadsheetId}
              onChange={(e) => handleUrlChange(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Paste the full Google Sheets URL or just the spreadsheet ID
            </p>
          </div>

          {/* Range */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Sheet Range
            </label>
            <input
              type="text"
              placeholder="Sheet1!A:H"
              value={config.range}
              onChange={(e) => setConfig(prev => ({ ...prev, range: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Specify the range of cells to read (e.g., Sheet1!A:H for columns A through H)
            </p>
          </div>

          {/* API Key */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Google Sheets API Key *
            </label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="password"
                placeholder="Your Google Sheets API Key"
                value={config.apiKey}
                onChange={(e) => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                className="w-full pl-10 pr-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Your API key will be stored locally and used to fetch data from your sheet
            </p>
          </div>

          {/* Expected Format */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h4 className="font-medium text-white mb-3">Expected Sheet Format:</h4>
            <div className="bg-gray-900 rounded p-3 text-xs font-mono text-gray-300 overflow-x-auto">
              <div className="grid grid-cols-8 gap-2 min-w-max">
                <div className="font-bold">id</div>
                <div className="font-bold">accountId</div>
                <div className="font-bold">itemId</div>
                <div className="font-bold">listingId</div>
                <div className="font-bold">amount</div>
                <div className="font-bold">quantity</div>
                <div className="font-bold">date</div>
                <div className="font-bold">accountName</div>
              </div>
              <div className="grid grid-cols-8 gap-2 min-w-max mt-1 text-gray-400">
                <div>1</div>
                <div>ACC001</div>
                <div>16-LED001</div>
                <div>LST001</div>
                <div>299.99</div>
                <div>2</div>
                <div>2024-12-15</div>
                <div>LEDSone eBay</div>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              First row should contain headers. Account names will be auto-detected from item IDs if not provided.
            </p>
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConnect}
            disabled={isConnecting || !config.spreadsheetId || !config.apiKey}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center space-x-2"
          >
            {isConnecting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <FileSpreadsheet className="w-4 h-4" />
                <span>Connect Sheet</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};