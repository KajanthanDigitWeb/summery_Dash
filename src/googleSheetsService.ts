interface GoogleSheetsConfig {
  spreadsheetId: string;
  range: string;
  apiKey?: string;
}

interface SheetRow {
  [key: string]: string;
}

export class GoogleSheetsService {
  private config: GoogleSheetsConfig;

  constructor(config: GoogleSheetsConfig) {
    this.config = config;
  }

  async fetchData(): Promise<any[]> {
    try {
      const { spreadsheetId, range, apiKey } = this.config;
      
      if (!apiKey) {
        throw new Error('Google Sheets API key is required');
      }

      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${apiKey}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.values || data.values.length === 0) {
        return [];
      }

      // Convert rows to objects using first row as headers
      const headers = data.values[0];
      const rows = data.values.slice(1);
      
      return rows.map((row: string[]) => {
        const obj: SheetRow = {};
        headers.forEach((header: string, index: number) => {
          obj[header] = row[index] || '';
        });
        return obj;
      });
    } catch (error) {
      console.error('Error fetching Google Sheets data:', error);
      throw error;
    }
  }

  static parseToSalesData(sheetData: SheetRow[]): any[] {
    // Map account field to display name
    const accountMap: Record<string, string> = {
      'led_sone': 'LEDSone(Renuha)',
      'electricalsone': 'Electricalsone(Jubista)',
      'so_926407': 'Sunsone(Renuha)',
      'vintageinterior': 'Vintage Interior',
      'coventrylights': 'Coventry Lights',
      'dctransformer': 'DC Transformer',
      'lighting_sone': 'Lighting Sone',
      'bestbringer': 'Best Bringer',
      're6865': 'Redro Led',
    };
    return sheetData
      .map((row, index) => {
        const itemId = row.itemId || row.itemid || row.sku || '';
        const accountRaw = row.account || '';
        const accountName = accountMap[accountRaw];
        if (!accountName) return null; // skip rows not in the 9 mapped accounts
        return {
          id: row.order_id || `sheet-${index}`,
          accountId: accountRaw,
          itemId: itemId,
          listingId: row.sku || '',
          amount: parseFloat(row.amount || '0'),
          quantity: parseInt(row.quantity || '0'),
          date: row.order_date || '',
          accountName: accountName
        };
      })
      .filter(Boolean); // remove nulls (Other accounts)
  }

  static groupSalesDataByAccountAndPeriod(salesData: any[], mode: 'day' | 'week' | 'month') {
    // Group by accountName and period (day/week/month)
    const grouped: Record<string, Record<string, { amount: number; quantity: number; count: number }>> = {};
    salesData.forEach(item => {
      // Always use 'Other accounts' for unknown/empty accountName
      const accountName = item.accountName && item.accountName !== 'Unknown Account' ? item.accountName : 'Other accounts';
      let periodKey = '';
      const date = new Date(item.date);
      if (isNaN(date.getTime())) return; // skip invalid dates
      if (mode === 'day') {
        periodKey = item.date;
      } else if (mode === 'week') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        periodKey = weekStart.toISOString().split('T')[0];
      } else if (mode === 'month') {
        periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }
      if (!grouped[accountName]) grouped[accountName] = {};
      if (!grouped[accountName][periodKey]) grouped[accountName][periodKey] = { amount: 0, quantity: 0, count: 0 };
      grouped[accountName][periodKey].amount += item.amount;
      grouped[accountName][periodKey].quantity += item.quantity;
      grouped[accountName][periodKey].count += 1;
    });
    return grouped;
  }
}