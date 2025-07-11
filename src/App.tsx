import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Calendar, Package, Settings, RefreshCw, Upload, FileSpreadsheet, X } from 'lucide-react';
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
  const [isRotating, setIsRotating] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [uploadedData, setUploadedData] = useState<SalesData[]>([]);
  const [isUsingUploadedData, setIsUsingUploadedData] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [showGoogleSheetsModal, setShowGoogleSheetsModal] = useState(false);
  const [googleSheetsData, setGoogleSheetsData] = useState<SalesData[]>([]);
  const [lastYearGoogleSheetsData, setLastYearGoogleSheetsData] = useState<SalesData[]>([]);
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

  // Fetch last year data from Sheet2
  const fetchLastYearSheet = async () => {
    try {
      const config = {
        spreadsheetId: '1331ogfREfU_aunmaQ17GxQ0QrLD7JoENPrU9pxQa4VY',
        range: 'Sheet2!A:Z',
        apiKey: 'AIzaSyAkkwg845uAn23apY-yB7i0VP-bSM6EyIs'
      };
      const sheetsService = new GoogleSheetsService(config);
      const rawData = await sheetsService.fetchData();
      const salesData = GoogleSheetsService.parseToSalesData(rawData);
      setLastYearGoogleSheetsData(salesData);
    } catch (error) {
      console.error('Failed to fetch last year sheet:', error);
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

  // Fetch last year data on mount if using Google Sheets
  useEffect(() => {
    if (isUsingGoogleSheets) {
      fetchLastYearSheet();
    }
  }, [isUsingGoogleSheets]);

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
    // Always use accountName for grouping, fallback to 'Other accounts'
    const accounts = [...new Set(currentSalesData.map(item => item.accountName || 'Other accounts'))];
    // Custom sort order: LEDSone, Electricalsone, Sunsone, Other accounts
    const order = [
      'LEDSone eBay(Renuha)',
      'Electricalsone eBay(Jubista)',
      'Sunsone eBay(Renuha)',
      'Other accounts'
    ];
    accounts.sort((a, b) => {
      const aIdx = order.indexOf(a);
      const bIdx = order.indexOf(b);
      if (aIdx === -1 && bIdx === -1) return a.localeCompare(b);
      if (aIdx === -1) return 1;
      if (bIdx === -1) return -1;
      return aIdx - bIdx;
    });
    return accounts.map(accountName => {
      const accountData = currentSalesData.filter(item => (item.accountName || 'Other accounts') === accountName);
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

  // Helper: get all unique dates from the data (using 'order_date' if present in raw data, else 'date')
  const getAllOrderDates = () => {
    // Try to get 'order_date' if it exists, else fallback to 'date'
    return Array.from(new Set(currentSalesData.map(item => {
      // @ts-ignore
      return (item.order_date || item.date || '').slice(0, 10);
    }).filter(Boolean))).sort();
  };

  const getPeriodDateRanges = (mode: string) => {
    const today = new Date();
    let prevRange = '', currRange = '';
    const toYMD = (date: Date) => date.toISOString().slice(0, 10);
    if (mode === 'day') {
      const currentStart = new Date(today);
      currentStart.setDate(today.getDate() - 1);
      const currentEnd = new Date(today);
      currentEnd.setDate(today.getDate() - 1);
      const prevStart = new Date(currentStart);
      prevStart.setFullYear(currentStart.getFullYear() - 1);
      const prevEnd = new Date(currentEnd);
      prevEnd.setFullYear(currentEnd.getFullYear() - 1);
      prevRange = `${toYMD(prevStart)} to ${toYMD(prevEnd)}`;
      currRange = `${toYMD(currentStart)} to ${toYMD(currentEnd)}`;
    } else if (mode === 'week') {
      const currentStart = new Date(today);
      currentStart.setDate(today.getDate() - 7);
      const currentEnd = new Date(today);
      currentEnd.setDate(today.getDate() - 1);
      const prevStart = new Date(currentStart);
      prevStart.setFullYear(currentStart.getFullYear() - 1);
      const prevEnd = new Date(currentEnd);
      prevEnd.setFullYear(currentEnd.getFullYear() - 1);
      prevRange = `${toYMD(prevStart)} to ${toYMD(prevEnd)}`;
      currRange = `${toYMD(currentStart)} to ${toYMD(currentEnd)}`;
    } else if (mode === 'month') {
      const currentStart = new Date(today);
      currentStart.setDate(today.getDate() - 31);
      const currentEnd = new Date(today);
      currentEnd.setDate(today.getDate() - 1);
      const prevStart = new Date(currentStart);
      prevStart.setFullYear(currentStart.getFullYear() - 1);
      const prevEnd = new Date(currentEnd);
      prevEnd.setFullYear(currentEnd.getFullYear() - 1);
      prevRange = `${toYMD(prevStart)} to ${toYMD(prevEnd)}`;
      currRange = `${toYMD(currentStart)} to ${toYMD(currentEnd)}`;
    }
    return { prevRange, currRange };
  };

  // --- Helper: Get last year period for day/week/month ---
  function getLastYearPeriod(mode: string) {
    // Use the current period range, but set year to -1 for both start and end
    const { currRange } = getPeriodDateRanges(mode);
    const [currStart, currEnd] = currRange.split(' to ');
    const start = new Date(currStart);
    const end = new Date(currEnd);
    start.setFullYear(start.getFullYear() - 1);
    end.setFullYear(end.getFullYear() - 1);
    return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
  }

  // --- Calculate current and last year period totals for summary boxes ---
  function getPeriodTotals(accountName: string, mode: string) {
    // Use the new date ranges for current and last year
    const { currRange, prevRange } = getPeriodDateRanges(mode);
    const [currStart, currEnd] = currRange.split(' to ');
    const [prevStart, prevEnd] = prevRange.split(' to ');

    // Current period totals
    const currentData = (googleSheetsData.length > 0 ? googleSheetsData : mockSalesData).filter(
      d => d.accountName === accountName && d.date >= currStart && d.date <= currEnd
    );
    const currentAmount = currentData.reduce((sum, d) => sum + d.amount, 0);
    const currentQuantity = currentData.reduce((sum, d) => sum + d.quantity, 0);

    // Last year period totals (same month/day, year-1)
    const lastYearData = lastYearGoogleSheetsData.filter(
      d => d.accountName === accountName && d.date >= prevStart && d.date <= prevEnd
    );
    const lastYearAmount = lastYearData.reduce((sum, d) => sum + d.amount, 0);
    const lastYearQuantity = lastYearData.reduce((sum, d) => sum + d.quantity, 0);

    // YoY change
    const amountYoY = lastYearAmount > 0 ? ((currentAmount - lastYearAmount) / lastYearAmount) * 100 : 0;
    const quantityYoY = lastYearQuantity > 0 ? ((currentQuantity - lastYearQuantity) / lastYearQuantity) * 100 : 0;

    return {
      currentAmount,
      currentQuantity,
      lastYearAmount,
      lastYearQuantity,
      amountYoY,
      quantityYoY,
      lastYearPeriod: { start: prevStart, end: prevEnd }
    };
  }

  // --- Helper: Get last 60 days totals for current and last year for sidebar ---
  function getSidebar60DayTotals(accountName: string) {
    // Use currentSalesData for current year, lastYearGoogleSheetsData for last year
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Current year: last 60 days
    const currStart = new Date(today);
    currStart.setDate(today.getDate() - 59); // include today
    const currEnd = today;
    const currStartStr = currStart.toISOString().slice(0, 10);
    const currEndStr = currEnd.toISOString().slice(0, 10);

    // Last year: same period, but year - 1
    const lastStart = new Date(currStart);
    lastStart.setFullYear(currStart.getFullYear() - 1);
    const lastEnd = new Date(currEnd);
    lastEnd.setFullYear(currEnd.getFullYear() - 1);
    const lastStartStr = lastStart.toISOString().slice(0, 10);
    const lastEndStr = lastEnd.toISOString().slice(0, 10);

    // Current year data
    const currData = currentSalesData.filter(
      d => d.accountName === accountName && d.date >= currStartStr && d.date <= currEndStr
    );
    // Last year data
    const lastData = lastYearGoogleSheetsData.filter(
      d => d.accountName === accountName && d.date >= lastStartStr && d.date <= lastEndStr
    );

    const currAmount = currData.reduce((sum, d) => sum + d.amount, 0);
    const currQuantity = currData.reduce((sum, d) => sum + d.quantity, 0);
    const lastAmount = lastData.reduce((sum, d) => sum + d.amount, 0);
    const lastQuantity = lastData.reduce((sum, d) => sum + d.quantity, 0);

    return {
      currAmount,
      currQuantity,
      lastAmount,
      lastQuantity,
      currStartStr,
      currEndStr,
      lastStartStr,
      lastEndStr
    };
  }

  return (
    <>
      {/* Meta viewport for responsive scaling */}
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      {/* Fullscreen JS: triggers on first click/tap */}
      <script dangerouslySetInnerHTML={{__html: `
        (function(){
          let fsTriggered = false;
          function goFS() {
            if (!fsTriggered && document.documentElement.requestFullscreen) {
              document.documentElement.requestFullscreen();
              fsTriggered = true;
              window.removeEventListener('click', goFS);
              window.removeEventListener('touchstart', goFS);
            }
          }
          window.addEventListener('click', goFS);
          window.addEventListener('touchstart', goFS);
        })();
      `}} />
      <div
        className="flex flex-col min-h-screen min-w-0 w-screen h-screen bg-black text-white overflow-hidden"
        style={{ width: '100vw', height: '100vh', margin: 0, padding: 0, boxSizing: 'border-box', overflow: 'hidden' }}
      >
        {/* Header */}
        <header className="bg-red-600 border-b border-red-500 p-2 md:p-4 lg:p-6 xl:p-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-0 w-full">
            <div className="flex items-center space-x-4">
              <Package className="w-12 h-12 lg:w-16 lg:h-16 2xl:w-20 2xl:h-20" />
              <h1 className="text-3xl lg:text-5xl 2xl:text-7xl font-bold">eBay Sales Dashboard</h1>
            </div>
            <div className="flex flex-wrap items-center space-x-2 md:space-x-4 gap-y-2">
              <div className="flex items-center space-x-2 bg-black/20 rounded-lg p-3">
                <Calendar className="w-5 h-5" />
                <input
                  type="date"
                  value={selectedDateRange.start}
                  onChange={(e) => setSelectedDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="bg-transparent text-white text-base"
                />
                <span>to</span>
                <input
                  type="date"
                  value={selectedDateRange.end}
                  onChange={(e) => setSelectedDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="bg-transparent text-white text-base"
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
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Connect Sheets</span>
              </button>
              
              <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Upload className="w-4 h-4" />
                <span>Upload CSV</span>
              </button>
            </div>
          </div>
        </header>

        {/* Settings Panel */}
        {showSettings && (
          <div className="bg-gray-900 border-b border-gray-700 p-4 lg:p-6 xl:p-8 2xl:p-10">
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
        <div className="flex flex-1 min-h-0 h-screen w-screen max-w-none overflow-hidden">
          {/* Sidebar */}
          <div className="w-full max-w-xs md:max-w-sm lg:w-64 xl:w-72 2xl:w-[18vw] bg-gray-900 border-r border-gray-700 p-4 lg:p-6 xl:p-8 flex-shrink-0 flex flex-col h-full min-h-0 overflow-y-auto">
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
                    <ChevronRight className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>

              {currentAccount && (
                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <h3 className="font-semibold text-white mb-2">{currentAccount.accountName}</h3>
                  <p className="text-sm text-gray-400 mb-4">ID: {currentAccount.accountId}</p>
                  {/* --- Sidebar: Last 60 days current and last year totals --- */}
                  {(() => {
                    const totals = getSidebar60DayTotals(currentAccount.accountName);
                    return (
                      <div className="mb-4 grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[10px] sm:text-xs md:text-sm text-gray-400">Last 60 Days<br/>(Current Year)</p>
                          <p className="text-sm sm:text-base md:text-lg font-bold text-white">£{totals.currAmount.toFixed(2)}</p>
                          <p className="text-xs sm:text-sm md:text-base font-bold text-white mt-2">Qty: {totals.currQuantity}</p>
                          <p className="text-[9px] sm:text-xs md:text-sm text-gray-500 mt-1">{totals.currStartStr} to {totals.currEndStr}</p>
                          <p className="text-[9px] sm:text-xs md:text-sm text-gray-400 mt-1">Range: <span className="text-gray-300">{totals.currStartStr} - {totals.currEndStr}</span></p>
                        </div>
                        <div>
                          <p className="text-[10px] sm:text-xs md:text-sm text-gray-400">Last 60 Days<br/>(Last Year)</p>
                          <p className="text-sm sm:text-base md:text-lg font-bold text-white">£{totals.lastAmount.toFixed(2)}</p>
                          <p className="text-xs sm:text-sm md:text-base font-bold text-white mt-2">Qty: {totals.lastQuantity}</p>
                          <p className="text-[9px] sm:text-xs md:text-sm text-gray-500 mt-1">{totals.lastStartStr} to {totals.lastEndStr}</p>
                          <p className="text-[9px] sm:text-xs md:text-sm text-gray-400 mt-1">Range: <span className="text-gray-300">{totals.lastStartStr} - {totals.lastEndStr}</span></p>
                        </div>
                      </div>
                    );
                  })()}
                  {/* --- End sidebar custom totals --- */}
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
                    <span className="font-medium">{account.accountName}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col min-h-0 h-full p-2 sm:p-4 md:p-6 lg:p-8 xl:p-10 overflow-hidden w-full">
            {/* Account name and mode switcher at the top */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6 w-full">
              <h2 className="text-lg sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-white break-words max-w-full leading-tight">{currentAccount.accountName}</h2>
              <div className="flex flex-wrap items-center gap-2 justify-start sm:justify-end w-full sm:w-auto">
                {['day', 'week', 'month'].map((m) => (
                  <button
                    key={m}
                    onClick={() => handleModeSelect(m as 'day' | 'week' | 'month')}
                    className={`px-2 py-1 sm:px-3 sm:py-1.5 md:px-4 md:py-2 rounded-lg font-semibold text-xs sm:text-sm md:text-base lg:text-lg transition-colors ${mode === m ? 'bg-red-600 text-white' : 'bg-gray-800 hover:bg-gray-700 text-gray-300'}`}
                  >
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            {/* Summary Boxes */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6" style={{ minHeight: '170px', height: '20vh' }}>
              {/* Last Year Period */}
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 flex flex-col items-center h-full min-h-[180px]">
                {(() => {
                  const totals = getPeriodTotals(selectedAccountName, mode);
                  const { prevRange } = getPeriodDateRanges(mode);
                  return (
                    <>
                      <p className="text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl text-gray-400 mb-2 font-medium">Last Year</p>
                      <p className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-extrabold text-white"><span className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl">£ {totals.lastYearAmount.toFixed(2)}</span></p>
                      <p className="text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl font-bold text-white mt-2">Qty: <span className="text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl">{totals.lastYearQuantity}</span></p>
                      <p className="text-[10px] sm:text-xs md:text-sm lg:text-base text-gray-400 mt-2">Range: <span className="text-gray-300">{prevRange}</span></p>
                    </>
                  );
                })()}
              </div>
              {/* Current Year Period */}
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 flex flex-col items-center h-full min-h-[180px]">
                {(() => {
                  const totals = getPeriodTotals(selectedAccountName, mode);
                  const { currRange } = getPeriodDateRanges(mode);
                  return (
                    <>
                      <p className="text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl text-gray-400 mb-2 font-medium">Current Year</p>
                      <p className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-extrabold text-white">£ {totals.currentAmount.toFixed(2)}</p>
                      <p className="text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl font-bold text-white mt-2">Qty: <span className="text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl">{totals.currentQuantity}</span></p>
                      <p className="text-[10px] sm:text-xs md:text-sm lg:text-base text-gray-400 mt-2">Range: <span className="text-gray-300">{currRange}</span></p>
                    </>
                  );
                })()}
              </div>
              {/* Comparison (YoY) */}
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 flex flex-col items-center h-full min-h-[180px]">
                {(() => {
                  const totals = getPeriodTotals(selectedAccountName, mode);
                  const { currRange, prevRange } = getPeriodDateRanges(mode);
                  return (
                    <>
                      <p className="text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl text-gray-400 mb-2 font-medium">YoY Comparison</p>
                      <div className="flex items-center space-x-2 mb-2">
                        {totals.amountYoY >= 0 ? (
                          <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 lg:w-8 lg:h-8 text-green-400" />
                        ) : (
                          <TrendingDown className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 lg:w-8 lg:h-8 text-red-400" />
                        )}
                        <span className={`text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl font-extrabold ${totals.amountYoY >= 0 ? 'text-green-400' : 'text-red-400'}`}>Amount: {totals.amountYoY >= 0 ? '+' : ''}{totals.amountYoY.toFixed(1)}%</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {totals.quantityYoY >= 0 ? (
                          <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 lg:w-8 lg:h-8 text-green-400" />
                        ) : (
                          <TrendingDown className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 lg:w-8 lg:h-8 text-red-400" />
                        )}
                        <span className={`text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl font-extrabold ${totals.quantityYoY >= 0 ? 'text-green-400' : 'text-red-400'}`}>Qty: {totals.quantityYoY >= 0 ? '+' : ''}{totals.quantityYoY.toFixed(1)}%</span>
                      </div>
                      <p className="text-[10px] sm:text-xs md:text-sm lg:text-base text-gray-400 mt-2">Current Year: <span className="text-gray-300">{currRange}</span></p>
                      <p className="text-[10px] sm:text-xs md:text-sm lg:text-base text-gray-400">Last Year: <span className="text-gray-300">{prevRange}</span></p>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Trend Chart */}
            <div className="flex-1 min-h-0" style={{ minHeight: '300px', minWidth: '100%', height: 'calc(56vh - 6px)', width: '100%' }}>
              <Line
                data={{
                  labels: Object.keys((filteredGroupedSalesData as any)[mode][selectedAccountName] || {}),
                  datasets: [
                    {
                      label: 'Amount',
                      data: Object.values((filteredGroupedSalesData as any)[mode][selectedAccountName] || {}).map((d: any) => d.amount),
                      borderColor: '#ef4444',
                      backgroundColor: 'rgba(239,68,68,0.2)',
                      tension: 0.4,
                    },
                    {
                      label: 'Quantity',
                      data: Object.values((filteredGroupedSalesData as any)[mode][selectedAccountName] || {}).map((d: any) => d.quantity),
                      borderColor: '#22d3ee',
                      backgroundColor: 'rgba(34,211,238,0.2)',
                      tension: 0.4,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      labels: { color: '#fff', font: { size: 14 } },
                    },
                    title: {
                      display: true,
                      text: `${selectedAccountName} - ${mode.charAt(0).toUpperCase() + mode.slice(1)} Trend`,
                      color: '#fff',
                      font: { size: 2, weight: 'bold' },
                    },
                  },
                  scales: {
                    x: {
                      ticks: { color: '#fff', font: { size: 14 } },
                      grid: { color: '#374151' },
                    },
                    y: {
                      ticks: { color: '#fff', font: { size: 14 } },
                      grid: { color: '#374151' },
                    },
                  },
                  maintainAspectRatio: false,
                }}
                height={320}
              />
            </div>
          </div>
        </div>
        {/* Footer */}
        <footer className="w-full py-4 bg-gray-900 border-t border-gray-700 flex items-center justify-center">
          <span className="text-gray-200 text-lg md:text-2xl lg:text-3xl font-bold text-center tracking-wide">Digit Web Lanka (PVT) LTD</span>
        </footer>
      </div>
    </>
  );
}

export default App;