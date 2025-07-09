import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Calendar, DollarSign, Package, Users, Settings, RefreshCw, Upload, FileSpreadsheet, X } from 'lucide-react';
import { GoogleSheetsModal } from './components/GoogleSheetsModal';
import { GoogleSheetsService } from './googleSheetsService';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

interface SalesData {
  id: string;
  accountId: string;
  itemId: string;
  listingId: string;
  amount: number;
  quantity: number;
  date: string;
  accountName: string;
}

interface AccountSummary {
  accountId: string;
  accountName: string;
  totalAmount: number;
  totalQuantity: number;
  salesChange: number;
  itemCount: number;
}

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

function App() {
  const [rotationIndex, setRotationIndex] = useState(0);
  const [selectedDateRange, setSelectedDateRange] = useState({
    start: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [isRotating, setIsRotating] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [uploadedData, setUploadedData] = useState<SalesData[]>([]);
  const [isUsingUploadedData, setIsUsingUploadedData] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [showGoogleSheetsModal, setShowGoogleSheetsModal] = useState(false);
  const [googleSheetsData, setGoogleSheetsData] = useState<SalesData[]>([]);
  const [isUsingGoogleSheets, setIsUsingGoogleSheets] = useState(false);
  const [googleSheetsStatus, setGoogleSheetsStatus] = useState<'disconnected' | 'connected' | 'error'>('disconnected');

  // Mock Google Sheets data
  const mockSalesData: SalesData[] = [
    { id: '1', accountId: 'ACC001', itemId: 'ITM001', listingId: 'LST001', amount: 299.99, quantity: 2, date: '2024-12-15', accountName: 'TechStore Pro' },
    { id: '2', accountId: 'ACC001', itemId: 'ITM002', listingId: 'LST002', amount: 149.50, quantity: 1, date: '2024-12-15', accountName: 'TechStore Pro' },
    { id: '3', accountId: 'ACC002', itemId: 'ITM003', listingId: 'LST003', amount: 89.99, quantity: 3, date: '2024-12-14', accountName: 'Fashion Hub' },
    { id: '4', accountId: 'ACC002', itemId: 'ITM004', listingId: 'LST004', amount: 199.99, quantity: 1, date: '2024-12-14', accountName: 'Fashion Hub' },
    { id: '5', accountId: 'ACC003', itemId: 'ITM005', listingId: 'LST005', amount: 449.99, quantity: 1, date: '2024-12-13', accountName: 'Home Essentials' },
    { id: '6', accountId: 'ACC001', itemId: 'ITM006', listingId: 'LST006', amount: 79.99, quantity: 4, date: '2024-12-12', accountName: 'TechStore Pro' },
    { id: '7', accountId: 'ACC003', itemId: 'ITM007', listingId: 'LST007', amount: 129.99, quantity: 2, date: '2024-12-11', accountName: 'Home Essentials' },
    { id: '8', accountId: 'ACC002', itemId: 'ITM008', listingId: 'LST008', amount: 249.99, quantity: 1, date: '2024-12-10', accountName: 'Fashion Hub' },
    { id: '9', accountId: 'ACC001', itemId: 'ITM009', listingId: 'LST009', amount: 399.99, quantity: 1, date: '2024-11-20', accountName: 'TechStore Pro' },
    { id: '10', accountId: 'ACC002', itemId: 'ITM010', listingId: 'LST010', amount: 99.99, quantity: 5, date: '2024-11-18', accountName: 'Fashion Hub' },
  ];

  // Handle file upload
  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n');
        const parsedData: SalesData[] = [];
        
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
          if (values.length >= 7) {
            parsedData.push({
              id: values[0] || `row-${i}`,
              accountId: values[1] || '',
              itemId: values[2] || '',
              listingId: values[3] || '',
              amount: parseFloat(values[4]) || 0,
              quantity: parseInt(values[5]) || 0,
              date: values[6] || '',
              accountName: values[7] || values[1] || 'Unknown Account'
            });
          }
        }
        
        setUploadedData(parsedData);
        setIsUsingUploadedData(true);
        setShowUploadModal(false);
        console.log('Data uploaded successfully:', parsedData.length, 'records');
      } catch (error) {
        console.error('Error parsing CSV file:', error);
        alert('Error parsing file. Please ensure it\'s a valid CSV format.');
      }
    };
    reader.readAsText(file);
  };

  // Handle Google Sheets connection
  const handleGoogleSheetsConnect = async (config: { spreadsheetId: string; range: string; apiKey: string }) => {
    try {
      const sheetsService = new GoogleSheetsService(config);
      const rawData = await sheetsService.fetchData();
      const salesData = GoogleSheetsService.parseToSalesData(rawData);
      
      setGoogleSheetsData(salesData);
      setIsUsingGoogleSheets(true);
      setIsUsingUploadedData(false);
      setGoogleSheetsStatus('connected');
      
      // Store config in localStorage for future use
      localStorage.setItem('googleSheetsConfig', JSON.stringify(config));
      
      console.log('Google Sheets connected successfully:', salesData.length, 'records');
    } catch (error) {
      setGoogleSheetsStatus('error');
      throw error;
    }
  };

  // Load saved Google Sheets config on component mount
  useEffect(() => {
    // Auto-configure with your spreadsheet ID and API key
    const defaultConfig = {
      spreadsheetId: '1331ogfREfU_aunmaQ17GxQ0QrLD7JoENPrU9pxQa4VY',
      range: 'Sheet1!A:Z',
      apiKey: 'AIzaSyAkkwg845uAn23apY-yB7i0VP-bSM6EyIs'
    };
    
    const savedConfig = localStorage.getItem('googleSheetsConfig');
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig);
        // Update with your spreadsheet ID and API key if different
        const updatedConfig = { ...config, spreadsheetId: defaultConfig.spreadsheetId, apiKey: defaultConfig.apiKey };
        handleGoogleSheetsConnect(updatedConfig).catch(() => {
          setGoogleSheetsStatus('error');
        });
      } catch (error) {
        console.error('Failed to load saved Google Sheets config:', error);
      }
    } else {
      // Store default config for easy access
      localStorage.setItem('defaultGoogleSheetsConfig', JSON.stringify(defaultConfig));
      handleGoogleSheetsConnect(defaultConfig).catch(() => {
        setGoogleSheetsStatus('error');
      });
    }
  }, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Use uploaded data if available, otherwise use mock data
  const currentSalesData = isUsingGoogleSheets ? googleSheetsData : (isUsingUploadedData ? uploadedData : mockSalesData);

  // Calculate account summaries
  const accountSummaries = (): AccountSummary[] => {
    // Always use accountName for grouping, fallback to 'Unknown Account'
    const accounts = [...new Set(currentSalesData.map(item => item.accountName || 'Unknown Account'))];
    return accounts.map(accountName => {
      const accountData = currentSalesData.filter(item => (item.accountName || 'Unknown Account') === accountName);
      const accountId = accountData[0]?.accountId || '';
      const currentPeriodData = accountData.filter(item => {
        const itemDate = new Date(item.date);
        const startDate = new Date(selectedDateRange.start);
        const endDate = new Date(selectedDateRange.end);
        return itemDate >= startDate && itemDate <= endDate;
      });
      const previousPeriodStart = new Date(selectedDateRange.start);
      previousPeriodStart.setDate(previousPeriodStart.getDate() - 30);
      const previousPeriodData = accountData.filter(item => {
        const itemDate = new Date(item.date);
        return itemDate >= previousPeriodStart && itemDate < new Date(selectedDateRange.start);
      });
      const totalAmount = currentPeriodData.reduce((sum, item) => sum + item.amount, 0);
      const totalQuantity = currentPeriodData.reduce((sum, item) => sum + item.quantity, 0);
      const previousAmount = previousPeriodData.reduce((sum, item) => sum + item.amount, 0);
      const salesChange = previousAmount > 0 ? ((totalAmount - previousAmount) / previousAmount) * 100 : 0;
      return {
        accountId,
        accountName,
        totalAmount,
        totalQuantity,
        salesChange,
        itemCount: currentPeriodData.length
      };
    });
  };

  // Grouped data for daily/weekly/monthly by account
  const groupedSalesData = {
    day: GoogleSheetsService.groupSalesDataByAccountAndPeriod(currentSalesData, 'day'),
    week: GoogleSheetsService.groupSalesDataByAccountAndPeriod(currentSalesData, 'week'),
    month: GoogleSheetsService.groupSalesDataByAccountAndPeriod(currentSalesData, 'month'),
  };

  // Calculate accounts once
  const accounts = accountSummaries();
  const totalRotations = accounts.length * 3; // 3 modes: day, week, month

  // Derived indices
  const accountIdx = Math.floor(rotationIndex / 3);
  const modeIdx = rotationIndex % 3;
  const currentAccount = accounts[accountIdx] || accounts[0];
  const selectedAccountName = currentAccount?.accountName || 'Unknown Account';
  const mode = ['day', 'week', 'month'][modeIdx];

  // Manual navigation (when not rotating)
  const handlePrev = () => {
    setRotationIndex((prev) => Math.max(0, prev - 1));
  };
  const handleNext = () => {
    setRotationIndex((prev) => Math.min(accounts.length * 3 - 1, prev + 1));
  };
  const handleAccountSelect = (idx: number) => {
    setRotationIndex(idx * 3);
  };
  const handleModeSelect = (m: 'day' | 'week' | 'month') => {
    setRotationIndex(accountIdx * 3 + ['day', 'week', 'month'].indexOf(m));
  };

  // Auto-rotate
  useEffect(() => {
    if (isRotating) {
      const interval = setInterval(() => {
        setRotationIndex((prev) => (prev + 1) % (accounts.length * 3));
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [isRotating, accounts.length]);

  // Filtered/grouped data for daily/weekly/monthly by account (show only selected account if selected)
  const filteredGroupedSalesData = {
    day: { [selectedAccountName]: groupedSalesData.day[selectedAccountName] || {} },
    week: { [selectedAccountName]: groupedSalesData.week[selectedAccountName] || {} },
    month: { [selectedAccountName]: groupedSalesData.month[selectedAccountName] || {} },
  };

  return (
    <div className="flex flex-col min-h-screen bg-black text-white">
      {/* Header */}
      <header className="bg-red-600 border-b border-red-500 p-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-0">
          <div className="flex items-center space-x-4">
            <Package className="w-8 h-8" />
            <h1 className="text-2xl font-bold">eBay Sales Dashboard</h1>
          </div>
          <div className="flex flex-wrap items-center space-x-2 md:space-x-4 gap-y-2">
            <div className="flex items-center space-x-2 bg-black/20 rounded-lg p-2">
              <Calendar className="w-4 h-4" />
              <input
                type="date"
                value={selectedDateRange.start}
                onChange={(e) => setSelectedDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="bg-transparent text-white text-sm"
              />
              <span>to</span>
              <input
                type="date"
                value={selectedDateRange.end}
                onChange={(e) => setSelectedDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="bg-transparent text-white text-sm"
              />
            </div>
            
            <button
              onClick={() => setIsRotating(!isRotating)}
              className={`p-2 rounded-lg transition-colors ${isRotating ? 'bg-white text-red-600' : 'bg-black/20 hover:bg-black/30'}`}
            >
              <RefreshCw className={`w-5 h-5 ${isRotating ? 'animate-spin' : ''}`} />
            </button>
            
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-lg bg-black/20 hover:bg-black/30 transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
            
            <button
              onClick={() => setShowGoogleSheetsModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Connect Sheets</span>
            </button>
            
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
            >
              <Upload className="w-4 h-4" />
              <span>Upload CSV</span>
            </button>
          </div>
        </div>
      </header>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-gray-900 border-b border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium">Data Source:</span>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  googleSheetsStatus === 'connected' ? 'bg-green-400' : 
                  googleSheetsStatus === 'error' ? 'bg-red-400' : 'bg-gray-400'
                }`}></div>
                <span className="text-sm text-gray-400">
                  {isUsingGoogleSheets ? `Google Sheets (${googleSheetsData.length} records)` :
                   isUsingUploadedData ? `Uploaded CSV (${uploadedData.length} records)` : 
                   'Mock Data Active'}
                </span>
              </div>
              <button 
                onClick={() => setShowGoogleSheetsModal(true)}
                className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm transition-colors"
              >
                {googleSheetsStatus === 'connected' ? 'Reconnect' : 'Connect'} Sheets
              </button>
              <span className="text-sm text-gray-400">
                Status: {isUsingUploadedData ? `Uploaded Data (${uploadedData.length} records)` : 'Mock Data Active'}
              </span>
            </div>
            
            {(isUsingUploadedData || isUsingGoogleSheets) && (
              <button
                onClick={() => {
                  setIsUsingGoogleSheets(false);
                  setIsUsingUploadedData(false);
                  setUploadedData([]);
                  setGoogleSheetsData([]);
                  setGoogleSheetsStatus('disconnected');
                  localStorage.removeItem('googleSheetsConfig');
                }}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
              >
                Use Mock Data
              </button>
            )}
          </div>
        </div>
      )}

      {/* Google Sheets Modal */}
      <GoogleSheetsModal
        isOpen={showGoogleSheetsModal}
        onClose={() => setShowGoogleSheetsModal(false)}
        onConnect={handleGoogleSheetsConnect}
      />

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg p-6 w-full max-w-md mx-4 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Upload Sales Data</h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-1 hover:bg-gray-800 rounded transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-400 mb-2">
                Upload a CSV file with the following columns:
              </p>
              <div className="bg-gray-800 rounded p-3 text-xs font-mono text-gray-300">
                id, accountId, itemId, listingId, amount, quantity, date, accountName
              </div>
            </div>
            
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? 'border-red-500 bg-red-500/10'
                  : 'border-gray-600 hover:border-gray-500'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <FileSpreadsheet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-300 mb-2">
                Drag and drop your CSV file here, or
              </p>
              <label className="inline-block px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg cursor-pointer transition-colors">
                Browse Files
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />
              </label>
            </div>
            
            <div className="mt-4 text-xs text-gray-500">
              <p>• File should be in CSV format</p>
              <p>• Date format: YYYY-MM-DD</p>
              <p>• Amount should be numeric values</p>
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-1 min-h-0 h-screen overflow-hidden">
        {/* Sidebar */}
        <div className="w-full lg:w-80 bg-gray-900 border-r border-gray-700 p-6 flex-shrink-0 flex flex-col h-screen overflow-y-auto">
          {/* Account Rotation */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Account Summary</h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handlePrev}
                  disabled={rotationIndex === 0}
                  className="p-1 rounded hover:bg-gray-800 disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-gray-400">
                  {accountIdx + 1} / {accounts.length}
                </span>
                <button
                  onClick={handleNext}
                  disabled={rotationIndex === totalRotations - 1}
                  className="p-1 rounded hover:bg-gray-800 disabled:opacity-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {currentAccount && (
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <h3 className="font-semibold text-white mb-2">{currentAccount.accountName}</h3>
                <p className="text-sm text-gray-400 mb-4">ID: {currentAccount.accountId}</p>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-400">Total Amount</p>
                    <p className="text-xl font-bold text-white">${currentAccount.totalAmount.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Total Quantity</p>
                    <p className="text-xl font-bold text-white">{currentAccount.totalQuantity}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {currentAccount.salesChange >= 0 ? (
                      <TrendingUp className="w-4 h-4 text-green-400" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-400" />
                    )}
                    <span className={`text-sm font-medium ${currentAccount.salesChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {currentAccount.salesChange >= 0 ? '+' : ''}{currentAccount.salesChange.toFixed(1)}%
                    </span>
                  </div>
                  <span className="text-sm text-gray-400">{currentAccount.itemCount} items</span>
                </div>
              </div>
            )}
          </div>

          {/* All Accounts List */}
          <div>
            <h3 className="text-md font-semibold mb-3">All Accounts</h3>
            <div className="space-y-2">
              {accounts.map((account, index) => (
                <button
                  key={account.accountId}
                  onClick={() => handleAccountSelect(index)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    index === accountIdx
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{account.accountName}</span>
                    <span className={`text-sm ${
                      account.salesChange >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {account.salesChange >= 0 ? '+' : ''}{account.salesChange.toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-sm text-gray-400">
                    ${account.totalAmount.toFixed(2)} • {account.totalQuantity} items
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-h-0 h-screen p-2 sm:p-4 md:p-6 overflow-hidden">
          {/* Time Period Toggle */}
          <div className="flex items-center justify-between mb-6 w-full flex-shrink-0">
            <div className="flex items-center space-x-4">
              <h2 className="text-2xl font-bold">Sales Overview</h2>
              <div className="flex bg-gray-800 rounded-lg p-1">
                {['day', 'week', 'month'].map((m) => (
                  <button
                    key={m}
                    onClick={() => handleModeSelect(m as 'day' | 'week' | 'month')}
                    className={`px-4 py-2 rounded-md transition-colors capitalize ${
                      m === mode
                        ? 'bg-red-600 text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-400">
                <Users className="w-4 h-4" />
                <span>{accounts.length} Accounts</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-400">
                <Package className="w-4 h-4" />
                <span>{currentSalesData.length} Total Items</span>
              </div>
            </div>
          </div>

          {/* Stats Cards and Chart share vertical space */}
          <div className="flex-1 flex flex-col gap-4 min-h-0 h-full overflow-hidden">
            {/* Three Summary Boxes: Previous, Current, Comparison */}
            <div className="w-full max-w-5xl mx-auto flex flex-col md:flex-row gap-4 md:gap-8 items-stretch justify-center flex-shrink-0">
              {(() => {
                const icon = mode === 'day' ? <Calendar className="w-5 h-5 text-blue-400" /> : mode === 'week' ? <TrendingUp className="w-5 h-5 text-green-400" /> : <DollarSign className="w-5 h-5 text-red-400" />;
                const label = mode === 'day' ? 'Daily' : mode === 'week' ? 'Weekly' : 'Monthly';
                const periods = filteredGroupedSalesData[mode as 'day' | 'week' | 'month'][selectedAccountName] || {};
                // Sort period keys (dates/periods) descending
                const periodKeys = Object.keys(periods).sort((a, b) => b.localeCompare(a));
                const currentKey = periodKeys[0];
                const prevKey = periodKeys[1];
                const current = periods[currentKey] || { amount: 0, quantity: 0 };
                const prev = periods[prevKey] || { amount: 0, quantity: 0 };
                const salesChange = prev.amount > 0 ? ((current.amount - prev.amount) / prev.amount) * 100 : 0;
                const quantityChange = prev.quantity > 0 ? ((current.quantity - prev.quantity) / prev.quantity) * 100 : 0;
                return (
                  <div className="w-full max-w-5xl flex flex-col md:flex-row gap-4 md:gap-8 items-stretch justify-center flex-shrink-0">
                    {/* Previous Period */}
                    <div className="flex-1 bg-gray-800 rounded-lg p-4 md:p-8 border border-gray-700 flex flex-col items-center justify-center min-w-0 min-h-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-gray-400 text-base md:text-lg font-medium">Previous</span>
                        {icon}
                      </div>
                      <div className="text-2xl md:text-4xl font-bold text-white mb-1">${prev.amount.toFixed(2)}</div>
                      <div className="text-lg md:text-2xl text-gray-400">{prev.quantity} items</div>
                      <div className="text-xs md:text-sm text-gray-500 mt-2 text-center">{prevKey ? `${label} (${prevKey})` : `No previous ${label.toLowerCase()} data`}</div>
                    </div>
                    {/* Current Period */}
                    <div className="flex-1 bg-gray-800 rounded-lg p-4 md:p-8 border border-gray-700 flex flex-col items-center justify-center min-w-0 min-h-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-gray-400 text-base md:text-lg font-medium">Current</span>
                        {icon}
                      </div>
                      <div className="text-2xl md:text-4xl font-bold text-white mb-1">${current.amount.toFixed(2)}</div>
                      <div className="text-lg md:text-2xl text-gray-400">{current.quantity} items</div>
                      <div className="text-xs md:text-sm text-gray-500 mt-2 text-center">{currentKey ? `${label} (${currentKey})` : `No current ${label.toLowerCase()} data`}</div>
                    </div>
                    {/* Comparison */}
                    <div className="flex-1 bg-gray-800 rounded-lg p-4 md:p-8 border border-gray-700 flex flex-col items-center justify-center min-w-0 min-h-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-gray-400 text-base md:text-lg font-medium">Comparison</span>
                        {icon}
                      </div>
                      <div className="flex flex-col gap-2 w-full items-center">
                        <span className={`text-xl md:text-2xl font-bold ${salesChange > 0 ? 'text-green-400' : salesChange < 0 ? 'text-red-400' : 'text-gray-300'}`}>Sales: {salesChange > 0 ? '+' : salesChange < 0 ? '-' : ''}{Math.abs(salesChange).toFixed(1)}%</span>
                        <span className={`text-xl md:text-2xl font-bold ${quantityChange > 0 ? 'text-green-400' : quantityChange < 0 ? 'text-red-400' : 'text-gray-300'}`}>Qty: {quantityChange > 0 ? '+' : quantityChange < 0 ? '-' : ''}{Math.abs(quantityChange).toFixed(1)}%</span>
                      </div>
                      <div className="text-xs md:text-sm text-gray-500 mt-2 text-center">vs Previous Period</div>
                    </div>
                  </div>
                );
              })()}
            </div>
            {/* Trend Chart Below Summary Boxes */}
            <div className="w-full max-w-5xl mx-auto bg-gray-900 rounded-lg p-4 md:p-8 border border-gray-700 flex-1 min-h-0 h-0">
              {(() => {
                const periods = filteredGroupedSalesData[mode as 'day' | 'week' | 'month'][selectedAccountName] || {};
                const periodKeys = Object.keys(periods).sort(); // Ascending for time
                const chartData = {
                  labels: periodKeys,
                  datasets: [
                    {
                      label: 'Sales Amount',
                      data: periodKeys.map(k => periods[k]?.amount || 0),
                      borderColor: '#ef4444',
                      backgroundColor: 'rgba(239,68,68,0.2)',
                      tension: 0.3,
                      fill: true,
                    },
                    {
                      label: 'Quantity',
                      data: periodKeys.map(k => periods[k]?.quantity || 0),
                      borderColor: '#3b82f6',
                      backgroundColor: 'rgba(59,130,246,0.1)',
                      tension: 0.3,
                      fill: false,
                      yAxisID: 'y1',
                    },
                  ],
                };
                const chartOptions = {
                  responsive: true,
                  plugins: {
                    legend: { display: true, labels: { color: '#fff' } },
                    title: { display: false },
                    tooltip: { mode: 'index' as const, intersect: false },
                  },
                  scales: {
                    x: { ticks: { color: '#aaa' }, grid: { color: '#333' } },
                    y: { ticks: { color: '#ef4444' }, grid: { color: '#333' }, title: { display: true, text: 'Sales ($)', color: '#ef4444' } },
                    y1: { position: 'right' as const, ticks: { color: '#3b82f6' }, grid: { drawOnChartArea: false }, title: { display: true, text: 'Quantity', color: '#3b82f6' } },
                  },
                  maintainAspectRatio: false,
                };
                if (periodKeys.length === 0) {
                  return <div className="text-center text-gray-400">No data to display for this period.</div>;
                }
                return (
                  <div className="h-64 md:h-80">
                    <Line data={chartData} options={chartOptions} />
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;