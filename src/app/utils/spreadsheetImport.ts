export type SpreadsheetFileType = 'csv' | 'xlsx';
export type SpreadsheetCadence = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface SpreadsheetImportIssue {
  sheet: string;
  row?: number;
  message: string;
}

export interface SpreadsheetExpenseRow {
  rowNumber: number;
  date: string;
  amount: number;
  currency?: string;
  vendor: string;
  category: string;
  notes?: string;
  isRecurring: boolean;
  recurringKey?: string;
}

export interface SpreadsheetCategoryRow {
  rowNumber: number;
  name: string;
  group?: string;
  icon?: string;
  color?: string;
}

export interface SpreadsheetRecurringRow {
  rowNumber: number;
  recurringKey: string;
  vendor: string;
  amount: number;
  category: string;
  cadence: SpreadsheetCadence;
  startDate: string;
  endDate?: string;
  notes?: string;
}

export interface ParsedSpreadsheetImport {
  sourceType: SpreadsheetFileType;
  expenses: SpreadsheetExpenseRow[];
  categories: SpreadsheetCategoryRow[];
  recurring: SpreadsheetRecurringRow[];
  warnings: string[];
}

export interface SpreadsheetImportSummary {
  expenses: number;
  categories: number;
  recurring: number;
  skippedDuplicates: number;
  skippedRecurringExpenseRows: number;
  warnings: string[];
}

type RawRow = Record<string, string>;
type XlsxSheet = Record<string, unknown>;
type XlsxModule = {
  read: (data: ArrayBuffer | string, options: Record<string, unknown>) => {
    SheetNames: string[];
    Sheets: Record<string, XlsxSheet>;
  };
  writeFile: (workbook: unknown, filename: string) => void;
  utils: {
    book_new: () => unknown;
    aoa_to_sheet: (rows: Array<Array<string | number>>) => XlsxSheet;
    book_append_sheet: (workbook: unknown, sheet: XlsxSheet, name: string) => void;
    sheet_to_json: (sheet: XlsxSheet, options: Record<string, unknown>) => string[][];
  };
};

const INFORMATION_SHEET = 'Information';
const EXPENSES_SHEET = 'Expenses';
const CATEGORIES_SHEET = 'Categories';
const RECURRING_SHEET = 'Recurring';

const EXPENSE_HEADERS = [
  'date (YYYY-MM-DD)',
  'amount (number)',
  'currency (optional, 3-letter code)',
  'vendor',
  'category',
  'notes (optional)',
  'is_recurring (TRUE / FALSE)',
  'recurring_key (optional)',
];

const CATEGORY_HEADERS = [
  'name (required)',
  'group (optional, if supported)',
  'icon (optional)',
  'color (optional)',
];

const RECURRING_HEADERS = [
  'recurring_key (required, unique)',
  'vendor',
  'amount',
  'category',
  'cadence (daily | weekly | monthly | yearly)',
  'start_date (YYYY-MM-DD)',
  'end_date (optional)',
  'notes (optional)',
];

const INFO_ROWS = [
  ['CalendarSpent Import Template'],
  [''],
  ['How to use this file'],
  ['Fill in the sheets below.'],
  ['You can delete example rows before importing.'],
  ['Dates must be YYYY-MM-DD.'],
  ['Amounts must be positive numbers.'],
  [''],
  ['Sheets overview'],
  ['Expenses: individual expense records.'],
  ['Categories: optional - used to pre-create categories.'],
  ['Recurring: optional - defines recurring expenses.'],
  [''],
  ['Important notes'],
  ['Importing the same file twice may create duplicates.'],
  ['Categories referenced by name will be created if missing.'],
  ['Excel (.xlsx) supports full import; CSV supports Expenses only.'],
  [''],
  ['This sheet is for instructions only and is not imported.'],
];

const EXPENSE_EXAMPLES = [
  ['2026-01-12', 48.7, 'CAD', 'FreshMart', 'Groceries', 'Weekly grocery run', 'FALSE', ''],
  ['2026-01-15', 18.99, 'CAD', 'CloudBox', 'Subscriptions', 'Monthly storage plan', 'TRUE', 'cloudbox-monthly'],
  ['2026-01-31', 1425, 'CAD', 'Maple Tower', 'Rent', 'January rent payment', 'TRUE', 'maple-rent'],
];

const CATEGORY_EXAMPLES = [
  ['Groceries', 'Everyday', 'ShoppingCart', '#81B29A'],
  ['Rent', 'Home & Life', 'Home', '#2D9CDB'],
  ['Subscriptions', 'Home & Life', 'Repeat', '#BB6BD9'],
];

const RECURRING_EXAMPLES = [
  ['maple-rent', 'Maple Tower', 1425, 'Rent', 'monthly', '2026-01-01', '', 'Primary apartment rent'],
  ['cloudbox-monthly', 'CloudBox', 18.99, 'Subscriptions', 'monthly', '2026-01-15', '', 'Cloud storage subscription'],
];

const CADENCE_VALUES = new Set<SpreadsheetCadence>(['daily', 'weekly', 'monthly', 'yearly']);

export class SpreadsheetImportValidationError extends Error {
  issues: SpreadsheetImportIssue[];

  constructor(issues: SpreadsheetImportIssue[]) {
    super(formatSpreadsheetIssues(issues));
    this.name = 'SpreadsheetImportValidationError';
    this.issues = issues;
  }
}

export function formatSpreadsheetIssues(issues: SpreadsheetImportIssue[]): string {
  const preview = issues.slice(0, 10).map((issue) => {
    const rowPart = issue.row ? ` row ${issue.row}` : '';
    return `${issue.sheet}${rowPart}: ${issue.message}`;
  });

  const suffix = issues.length > 10 ? `\n...and ${issues.length - 10} more issue${issues.length - 10 === 1 ? '' : 's'}.` : '';
  return `Import validation failed:\n${preview.join('\n')}${suffix}`;
}

export async function downloadSpreadsheetTemplate(): Promise<void> {
  const XLSX = await import('xlsx') as XlsxModule;
  const workbook = XLSX.utils.book_new();

  const informationSheet = XLSX.utils.aoa_to_sheet(INFO_ROWS);
  informationSheet['!cols'] = [{ wch: 48 }];

  const expensesSheet = XLSX.utils.aoa_to_sheet([EXPENSE_HEADERS, ...EXPENSE_EXAMPLES]);
  expensesSheet['!cols'] = [
    { wch: 16 },
    { wch: 14 },
    { wch: 18 },
    { wch: 24 },
    { wch: 20 },
    { wch: 28 },
    { wch: 18 },
    { wch: 24 },
  ];

  const categoriesSheet = XLSX.utils.aoa_to_sheet([CATEGORY_HEADERS, ...CATEGORY_EXAMPLES]);
  categoriesSheet['!cols'] = [
    { wch: 22 },
    { wch: 22 },
    { wch: 20 },
    { wch: 14 },
  ];

  const recurringSheet = XLSX.utils.aoa_to_sheet([RECURRING_HEADERS, ...RECURRING_EXAMPLES]);
  recurringSheet['!cols'] = [
    { wch: 24 },
    { wch: 22 },
    { wch: 12 },
    { wch: 20 },
    { wch: 16 },
    { wch: 18 },
    { wch: 18 },
    { wch: 28 },
  ];

  XLSX.utils.book_append_sheet(workbook, informationSheet, INFORMATION_SHEET);
  XLSX.utils.book_append_sheet(workbook, expensesSheet, EXPENSES_SHEET);
  XLSX.utils.book_append_sheet(workbook, categoriesSheet, CATEGORIES_SHEET);
  XLSX.utils.book_append_sheet(workbook, recurringSheet, RECURRING_SHEET);

  XLSX.writeFile(workbook, 'calendarspent-import-template.xlsx');
}

export async function parseSpreadsheetFile(file: File): Promise<ParsedSpreadsheetImport> {
  const extension = getExtension(file.name);
  if (extension !== 'csv' && extension !== 'xlsx') {
    throw new Error('Unsupported file type. Upload a .xlsx or .csv file.');
  }

  const XLSX = await import('xlsx') as XlsxModule;
  const workbook = extension === 'csv'
    ? XLSX.read(await file.text(), { type: 'string' })
    : XLSX.read(await file.arrayBuffer(), { type: 'array' });

  const issues: SpreadsheetImportIssue[] = [];
  const warnings: string[] = [];

  if (extension === 'csv') {
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      throw new Error('The CSV file is empty.');
    }

    const expenses = parseExpensesSheet(XLSX, workbook.Sheets[firstSheetName], 'Expenses', issues, true);
    if (issues.length > 0) {
      throw new SpreadsheetImportValidationError(issues);
    }

    warnings.push('CSV import supports Expenses only. Use the Excel template for categories and recurring items.');
    return {
      sourceType: 'csv',
      expenses,
      categories: [],
      recurring: [],
      warnings,
    };
  }

  const expensesSheet = getSheetByName(workbook, EXPENSES_SHEET);
  if (!expensesSheet) {
    issues.push({ sheet: EXPENSES_SHEET, message: 'Missing required sheet.' });
  }

  const categoriesSheet = getSheetByName(workbook, CATEGORIES_SHEET);
  const recurringSheet = getSheetByName(workbook, RECURRING_SHEET);

  const expenses = expensesSheet ? parseExpensesSheet(XLSX, expensesSheet, EXPENSES_SHEET, issues, false) : [];
  const categories = categoriesSheet ? parseCategoriesSheet(XLSX, categoriesSheet, CATEGORIES_SHEET, issues) : [];
  const recurring = recurringSheet ? parseRecurringSheet(XLSX, recurringSheet, RECURRING_SHEET, issues) : [];

  validateRecurringLinks(expenses, recurring, issues);

  if (issues.length > 0) {
    throw new SpreadsheetImportValidationError(issues);
  }

  return {
    sourceType: 'xlsx',
    expenses,
    categories,
    recurring,
    warnings,
  };
}

function parseExpensesSheet(
  XLSX: XlsxModule,
  sheet: XlsxSheet,
  sheetName: string,
  issues: SpreadsheetImportIssue[],
  csvMode: boolean,
): SpreadsheetExpenseRow[] {
  const rows = readRows(XLSX, sheet);
  const table = mapRows(sheetName, rows, ['date', 'amount', 'vendor', 'category', 'is_recurring'], issues);
  const expenses: SpreadsheetExpenseRow[] = [];

  table.forEach(({ rowNumber, values }) => {
    const date = getRequired(values, 'date', sheetName, rowNumber, issues);
    const amountRaw = getRequired(values, 'amount', sheetName, rowNumber, issues);
    const vendor = getRequired(values, 'vendor', sheetName, rowNumber, issues);
    const category = getRequired(values, 'category', sheetName, rowNumber, issues);
    const isRecurringRaw = values.is_recurring ?? '';
    const currency = normalizeOptional(values.currency);
    const notes = normalizeOptional(values.notes);
    const recurringKey = normalizeOptional(values.recurring_key);

    if (!date || !isIsoDate(date)) {
      issues.push({ sheet: sheetName, row: rowNumber, message: 'Date must use YYYY-MM-DD.' });
    }

    const amount = Number(amountRaw);
    if (!Number.isFinite(amount) || amount <= 0) {
      issues.push({ sheet: sheetName, row: rowNumber, message: 'Amount must be a number greater than 0.' });
    }

    if (currency && !/^[A-Za-z]{3}$/.test(currency)) {
      issues.push({ sheet: sheetName, row: rowNumber, message: 'Currency must be a 3-letter code.' });
    }

    const isRecurring = parseBoolean(isRecurringRaw);
    if (isRecurring === null) {
      issues.push({ sheet: sheetName, row: rowNumber, message: 'is_recurring must be TRUE or FALSE.' });
    }

    if (isRecurring === true && !recurringKey) {
      issues.push({ sheet: sheetName, row: rowNumber, message: 'Recurring expenses require a recurring_key.' });
    }

    if (csvMode && isRecurring === true) {
      issues.push({ sheet: sheetName, row: rowNumber, message: 'CSV imports do not support recurring-linked rows. Use the Excel template.' });
    }

    if (
      date &&
      isIsoDate(date) &&
      Number.isFinite(amount) &&
      amount > 0 &&
      vendor &&
      category &&
      isRecurring !== null &&
      (!currency || /^[A-Za-z]{3}$/.test(currency)) &&
      (!csvMode || isRecurring === false)
    ) {
      expenses.push({
        rowNumber,
        date,
        amount,
        currency: currency?.toUpperCase(),
        vendor,
        category,
        notes,
        isRecurring,
        recurringKey,
      });
    }
  });

  return expenses;
}

function parseCategoriesSheet(
  XLSX: XlsxModule,
  sheet: XlsxSheet,
  sheetName: string,
  issues: SpreadsheetImportIssue[],
): SpreadsheetCategoryRow[] {
  const rows = readRows(XLSX, sheet);
  const table = mapRows(sheetName, rows, ['name'], issues);
  const categories: SpreadsheetCategoryRow[] = [];
  const seenNames = new Set<string>();

  table.forEach(({ rowNumber, values }) => {
    const name = getRequired(values, 'name', sheetName, rowNumber, issues);
    if (!name) {
      return;
    }

    const normalizedName = normalizeKey(name);
    if (seenNames.has(normalizedName)) {
      issues.push({ sheet: sheetName, row: rowNumber, message: 'Duplicate category name in file.' });
      return;
    }

    seenNames.add(normalizedName);
    categories.push({
      rowNumber,
      name,
      group: normalizeOptional(values.group),
      icon: normalizeOptional(values.icon),
      color: normalizeOptional(values.color),
    });
  });

  return categories;
}

function parseRecurringSheet(
  XLSX: XlsxModule,
  sheet: XlsxSheet,
  sheetName: string,
  issues: SpreadsheetImportIssue[],
): SpreadsheetRecurringRow[] {
  const rows = readRows(XLSX, sheet);
  const table = mapRows(sheetName, rows, ['recurring_key', 'vendor', 'amount', 'category', 'cadence', 'start_date'], issues);
  const recurring: SpreadsheetRecurringRow[] = [];
  const seenKeys = new Set<string>();

  table.forEach(({ rowNumber, values }) => {
    const recurringKey = getRequired(values, 'recurring_key', sheetName, rowNumber, issues);
    const vendor = getRequired(values, 'vendor', sheetName, rowNumber, issues);
    const amountRaw = getRequired(values, 'amount', sheetName, rowNumber, issues);
    const category = getRequired(values, 'category', sheetName, rowNumber, issues);
    const cadenceRaw = getRequired(values, 'cadence', sheetName, rowNumber, issues);
    const startDate = getRequired(values, 'start_date', sheetName, rowNumber, issues);
    const endDate = normalizeOptional(values.end_date);
    const notes = normalizeOptional(values.notes);

    if (recurringKey) {
      const normalizedKey = normalizeKey(recurringKey);
      if (seenKeys.has(normalizedKey)) {
        issues.push({ sheet: sheetName, row: rowNumber, message: 'recurring_key must be unique.' });
      } else {
        seenKeys.add(normalizedKey);
      }
    }

    const amount = Number(amountRaw);
    if (!Number.isFinite(amount) || amount <= 0) {
      issues.push({ sheet: sheetName, row: rowNumber, message: 'Amount must be a number greater than 0.' });
    }

    const cadence = cadenceRaw?.toLowerCase() as SpreadsheetCadence;
    if (!CADENCE_VALUES.has(cadence)) {
      issues.push({ sheet: sheetName, row: rowNumber, message: 'Cadence must be daily, weekly, monthly, or yearly.' });
    }

    if (!startDate || !isIsoDate(startDate)) {
      issues.push({ sheet: sheetName, row: rowNumber, message: 'start_date must use YYYY-MM-DD.' });
    }

    if (endDate && !isIsoDate(endDate)) {
      issues.push({ sheet: sheetName, row: rowNumber, message: 'end_date must use YYYY-MM-DD.' });
    }

    if (startDate && endDate && isIsoDate(startDate) && isIsoDate(endDate) && startDate > endDate) {
      issues.push({ sheet: sheetName, row: rowNumber, message: 'end_date must be on or after start_date.' });
    }

    if (
      recurringKey &&
      vendor &&
      category &&
      Number.isFinite(amount) &&
      amount > 0 &&
      CADENCE_VALUES.has(cadence) &&
      startDate &&
      isIsoDate(startDate) &&
      (!endDate || isIsoDate(endDate))
    ) {
      recurring.push({
        rowNumber,
        recurringKey,
        vendor,
        amount,
        category,
        cadence,
        startDate,
        endDate,
        notes,
      });
    }
  });

  return recurring;
}

function validateRecurringLinks(
  expenses: SpreadsheetExpenseRow[],
  recurring: SpreadsheetRecurringRow[],
  issues: SpreadsheetImportIssue[],
) {
  const recurringKeys = new Set(recurring.map((row) => normalizeKey(row.recurringKey)));

  expenses.forEach((expense) => {
    if (!expense.isRecurring) {
      return;
    }

    if (!expense.recurringKey) {
      issues.push({ sheet: EXPENSES_SHEET, row: expense.rowNumber, message: 'Recurring expenses require a recurring_key.' });
      return;
    }

    if (!recurringKeys.has(normalizeKey(expense.recurringKey))) {
      issues.push({
        sheet: EXPENSES_SHEET,
        row: expense.rowNumber,
        message: `No matching recurring definition found for "${expense.recurringKey}".`,
      });
    }
  });
}

function readRows(XLSX: XlsxModule, sheet: XlsxSheet): string[][] {
  return XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '', blankrows: false });
}

function mapRows(
  sheetName: string,
  rows: string[][],
  requiredHeaders: string[],
  issues: SpreadsheetImportIssue[],
): Array<{ rowNumber: number; values: RawRow }> {
  if (rows.length === 0) {
    issues.push({ sheet: sheetName, message: 'Sheet is empty.' });
    return [];
  }

  const headerRow = rows[0].map((cell) => normalizeHeader(cell));
  const missing = requiredHeaders.filter((header) => !headerRow.includes(header));
  if (missing.length > 0) {
    issues.push({ sheet: sheetName, message: `Missing required column${missing.length === 1 ? '' : 's'}: ${missing.join(', ')}.` });
    return [];
  }

  return rows
    .slice(1)
    .map((row, index) => ({
      rowNumber: index + 2,
      values: headerRow.reduce<RawRow>((acc, header, headerIndex) => {
        if (header) {
          acc[header] = `${row[headerIndex] ?? ''}`.trim();
        }
        return acc;
      }, {}),
    }))
    .filter(({ values }) => Object.values(values).some((value) => value !== ''));
}

function getSheetByName(
  workbook: { SheetNames: string[]; Sheets: Record<string, XlsxSheet> },
  targetName: string,
) {
  const match = workbook.SheetNames.find((sheetName) => normalizeKey(sheetName) === normalizeKey(targetName));
  return match ? workbook.Sheets[match] : null;
}

function getRequired(
  values: RawRow,
  key: string,
  sheetName: string,
  rowNumber: number,
  issues: SpreadsheetImportIssue[],
) {
  const value = normalizeOptional(values[key]);
  if (!value) {
    issues.push({ sheet: sheetName, row: rowNumber, message: `${key} is required.` });
    return '';
  }
  return value;
}

function parseBoolean(value: string | undefined): boolean | null {
  const normalized = normalizeOptional(value)?.toLowerCase();
  if (!normalized) return false;
  if (['true', 'yes', '1'].includes(normalized)) return true;
  if (['false', 'no', '0'].includes(normalized)) return false;
  return null;
}

function normalizeHeader(value: string | undefined): string {
  const base = normalizeOptional(value)?.toLowerCase() ?? '';
  return base.replace(/\s*\(.+\)\s*/g, '').replace(/\s+/g, '_');
}

function normalizeOptional(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function getExtension(filename: string): string {
  const index = filename.lastIndexOf('.');
  return index >= 0 ? filename.slice(index + 1).toLowerCase() : '';
}
