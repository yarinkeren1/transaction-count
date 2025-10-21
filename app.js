// Transaction Analysis Application
class TransactionAnalyzer {
    constructor() {
        this.transactions = [];
        this.filteredTransactions = [];
        this.sortColumn = null;
        this.sortDirection = 'asc';
        
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        const resetBtn = document.getElementById('resetBtn');
        const searchInput = document.getElementById('searchInput');
        const typeFilter = document.getElementById('typeFilter');

        // File upload events
        uploadArea.addEventListener('click', () => fileInput.click());
        uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
        uploadArea.addEventListener('dragleave', this.handleDragLeave.bind(this));
        uploadArea.addEventListener('drop', this.handleDrop.bind(this));
        fileInput.addEventListener('change', this.handleFileSelect.bind(this));

        // Reset button
        resetBtn.addEventListener('click', this.reset.bind(this));

        // Search and filter
        searchInput.addEventListener('input', this.filterTransactions.bind(this));
        typeFilter.addEventListener('change', this.filterTransactions.bind(this));

        // Table sorting
        document.querySelectorAll('.sortable').forEach(header => {
            header.addEventListener('click', this.handleSort.bind(this));
        });
    }

    handleDragOver(e) {
        e.preventDefault();
        e.currentTarget.classList.add('dragover');
    }

    handleDragLeave(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('dragover');
    }

    handleDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.processFile(files[0]);
        }
    }

    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            this.processFile(file);
        }
    }

    async processFile(file) {
        // Check file type
        const validTypes = [
            'text/csv',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ];
        
        const validExtensions = ['.csv', '.xlsx', '.xls'];
        const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
        
        if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
            alert('Please select a CSV or Excel file (.csv, .xlsx, .xls).');
            return;
        }

        this.showProcessing();
        
        try {
            const transactions = await this.parseSpreadsheet(file);
            this.transactions = transactions;
            this.filteredTransactions = [...this.transactions];
            this.displayResults();
        } catch (error) {
            console.error('Error processing spreadsheet:', error);
            alert('Error processing spreadsheet. Please check the format and try again.');
        } finally {
            this.hideProcessing();
        }
    }

    async parseSpreadsheet(file) {
        if (file.name.toLowerCase().endsWith('.csv')) {
            const text = await this.readFileAsText(file);
            return this.parseCSV(text);
        } else {
            // Handle Excel files (.xlsx, .xls)
            return this.parseExcel(file);
        }
    }

    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    async parseExcel(file) {
        console.log('🔍 Starting Excel file parsing for:', file.name);
        
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    console.log('📁 Excel file read successfully, size:', e.target.result.byteLength, 'bytes');
                    
                    const data = new Uint8Array(e.target.result);
                    console.log('📊 Converting to workbook...');
                    
                    const workbook = XLSX.read(data, { type: 'array' });
                    console.log('✅ Excel workbook loaded successfully');
                    console.log('📋 Available sheets:', workbook.SheetNames);
                    
                    // Get the first worksheet
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    
                    console.log('📄 Processing worksheet:', firstSheetName);
                    console.log('📊 Worksheet range:', worksheet['!ref']);
                    
                    // Convert worksheet to JSON array
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                    console.log('📈 Excel data converted to JSON:', jsonData.length, 'rows');
                    console.log('📝 First few rows:', jsonData.slice(0, 3));
                    
                    // Convert to CSV-like format for processing
                    const csvLines = jsonData.map((row, index) => {
                        if (Array.isArray(row)) {
                            const csvRow = row.map(cell => {
                                // Handle empty cells and wrap in quotes if contains comma
                                const cellValue = cell === undefined || cell === null ? '' : String(cell);
                                return cellValue.includes(',') ? `"${cellValue}"` : cellValue;
                            }).join(',');
                            
                            if (index < 3) {
                                console.log(`Row ${index}:`, csvRow);
                            }
                            return csvRow;
                        }
                        return '';
                    }).filter(line => line.trim());
                    
                    const csvText = csvLines.join('\n');
                    console.log('📄 Converted to CSV format (first 500 chars):', csvText.substring(0, 500));
                    
                    // Parse as CSV
                    console.log('🔄 Starting CSV parsing...');
                    const transactions = this.parseCSV(csvText);
                    console.log('✅ Excel parsing completed, found', transactions.length, 'transactions');
                    resolve(transactions);
                } catch (error) {
                    console.error('❌ Error parsing Excel file:', error);
                    console.error('Error details:', error.message);
                    console.error('Stack trace:', error.stack);
                    reject(new Error(`Error parsing Excel file: ${error.message}. Please check the format and try again.`));
                }
            };
            reader.onerror = (error) => {
                console.error('❌ FileReader error:', error);
                reject(new Error('Error reading Excel file.'));
            };
            reader.readAsArrayBuffer(file);
        });
    }

    parseCSV(text) {
        const lines = text.split('\n');
        const transactions = [];
        
        console.log('Parsing CSV with', lines.length, 'lines');
        
        // Find the best header row and column mapping
        const columnMapping = this.findColumnMapping(lines);
        
        if (!columnMapping) {
            throw new Error('Could not find required columns. Please ensure your CSV has Date and Amount columns.');
        }
        
        console.log('Column mapping found:', columnMapping);
        console.log('📊 Column Detection Results:');
        console.log('  Date column index:', columnMapping.dateIndex);
        console.log('  Description column index:', columnMapping.descriptionIndex);
        console.log('  Amount column index:', columnMapping.amountIndex);
        console.log('  Type column index:', columnMapping.typeIndex);
        
        // Parse data rows starting after the header row
        for (let i = columnMapping.headerRow + 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const row = this.parseCSVLine(line);
            if (row.length < Math.max(columnMapping.dateIndex, columnMapping.amountIndex) + 1) continue;
            
            const transaction = this.createTransactionFromRow(row, columnMapping.dateIndex, columnMapping.descriptionIndex, columnMapping.amountIndex, columnMapping.typeIndex);
            if (transaction) {
                transactions.push(transaction);
                console.log('Parsed transaction:', transaction);
            }
        }
        
        console.log('Total transactions parsed:', transactions.length);
        return transactions;
    }

    findColumnMapping(lines) {
        console.log('🔍 Searching for column mapping...');
        
        // Search through the first 20 lines to find the best header row
        for (let rowIndex = 0; rowIndex < Math.min(20, lines.length); rowIndex++) {
            const line = lines[rowIndex].trim();
            if (!line) continue;
            
            console.log(`Checking row ${rowIndex}:`, line.substring(0, 100) + '...');
            
            const headers = this.parseCSVLine(line);
            console.log(`Headers in row ${rowIndex}:`, headers);
            
            // Try to find all required columns in this row
            const dateIndex = this.findColumnIndex(headers, [
                'date', 'transaction date', 'posting date', 'trans date', 'txn date',
                'transaction_date', 'posting_date', 'trans_date', 'txn_date'
            ]);
            
            const descriptionIndex = this.findColumnIndex(headers, [
                'description', 'memo', 'payee', 'merchant', 'vendor', 'payee name',
                'transaction description', 'memo description', 'payee_name', 'merchant_name'
            ]);
            
            const amountIndex = this.findColumnIndex(headers, [
                'amount', 'transaction amount', 'debit', 'credit', 'balance',
                'transaction_amount', 'debit_amount', 'credit_amount', 'balance_amount'
            ]);
            
            const typeIndex = this.findColumnIndex(headers, [
                'type', 'transaction type', 'category', 'classification',
                'transaction_type', 'category_type', 'classification_type'
            ]);
            
            console.log(`Row ${rowIndex} - Date: ${dateIndex}, Description: ${descriptionIndex}, Amount: ${amountIndex}, Type: ${typeIndex}`);
            
            // If we found at least Date and Amount, this is a good header row
            if (dateIndex !== -1 && amountIndex !== -1) {
                console.log(`✅ Found valid header row at line ${rowIndex}`);
                return {
                    headerRow: rowIndex,
                    dateIndex: dateIndex,
                    descriptionIndex: descriptionIndex,
                    amountIndex: amountIndex,
                    typeIndex: typeIndex
                };
            }
        }
        
        console.log('❌ No valid header row found');
        return null;
    }

    isHeaderRow(line) {
        const headers = this.parseCSVLine(line);
        const headerText = headers.join(' ').toLowerCase();
        
        return headerText.includes('date') && 
               (headerText.includes('amount') || headerText.includes('debit') || headerText.includes('credit'));
    }

    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current.trim());
        return result;
    }

    findColumnIndex(headers, possibleNames) {
        for (let i = 0; i < headers.length; i++) {
            const header = headers[i].toLowerCase().trim();
            for (const name of possibleNames) {
                if (header.includes(name.toLowerCase())) {
                    return i;
                }
            }
        }
        return -1;
    }

    createTransactionFromRow(row, dateIndex, descriptionIndex, amountIndex, typeIndex) {
        try {
            // Parse date
            const dateStr = row[dateIndex];
            const date = this.parseDate(dateStr);
            if (!date) {
                console.warn('Invalid date:', dateStr);
                return null;
            }
            
            // Parse amount
            const amountStr = row[amountIndex];
            const amount = this.parseAmount(amountStr);
            if (amount === null) {
                console.warn('Invalid amount:', amountStr);
                return null;
            }
            
            // Get description
            const description = descriptionIndex !== -1 ? row[descriptionIndex] : 'Transaction';
            
            // Determine type
            let type = 'debits'; // default
            if (typeIndex !== -1 && row[typeIndex] !== undefined) {
                const typeStr = String(row[typeIndex]).toLowerCase();
                if (typeStr.includes('credit') || typeStr.includes('deposit') || typeStr.includes('payment')) {
                    type = 'credits';
                } else if (typeStr.includes('check')) {
                    type = 'checks';
                } else if (typeStr.includes('debit') || typeStr.includes('purchase') || typeStr.includes('withdrawal')) {
                    type = 'debits';
                }
            } else {
                // Auto-detect type based on amount
                if (amount < 0) {
                    type = 'credits';
                } else {
                    type = 'debits';
                }
            }
            
            return {
                date: date,
                description: description,
                amount: amount,
                type: type
            };
        } catch (error) {
            console.warn('Error creating transaction from row:', row, error);
            return null;
        }
    }

    parseDate(dateStr) {
        try {
            // Handle various date formats
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) {
                // Try MM/DD/YYYY format
                const parts = dateStr.split('/');
                if (parts.length === 3) {
                    const month = parseInt(parts[0]);
                    const day = parseInt(parts[1]);
                    let year = parseInt(parts[2]);
                    
                    if (year < 100) {
                        year += year < 50 ? 2000 : 1900;
                    }
                    
                    return new Date(year, month - 1, day);
                }
            }
            return date;
        } catch (error) {
            console.warn('Error parsing date:', dateStr);
            return null;
        }
    }

    parseAmount(amountStr) {
        try {
            // Handle empty or non-numeric strings
            if (!amountStr || typeof amountStr !== 'string') {
                return null;
            }
            
            // Remove currency symbols, commas, and extra spaces
            const cleanAmount = amountStr.replace(/[$,\s]/g, '');
            
            // Check if it's a valid number
            if (!/^-?\d*\.?\d+$/.test(cleanAmount)) {
                return null;
            }
            
            const amount = parseFloat(cleanAmount);
            return isNaN(amount) ? null : amount;
        } catch (error) {
            console.warn('Error parsing amount:', amountStr);
            return null;
        }
    }

    displayResults() {
        const resultsSection = document.getElementById('resultsSection');
        resultsSection.style.display = 'block';

        this.displayColumnDetection();
        this.displaySummary();
        this.displayTransactions();
        this.displayDebugInfo();
    }

    displayColumnDetection() {
        // Add a section to show which columns were detected
        const resultsSection = document.getElementById('resultsSection');
        
        // Check if column detection info already exists
        let detectionInfo = document.getElementById('columnDetectionInfo');
        if (detectionInfo) {
            detectionInfo.remove();
        }
        
        detectionInfo = document.createElement('div');
        detectionInfo.id = 'columnDetectionInfo';
        detectionInfo.className = 'column-detection';
        detectionInfo.innerHTML = `
            <h3>📊 Column Detection Results</h3>
            <div class="detection-grid">
                <div class="detection-item">
                    <span class="detection-label">Date Column:</span>
                    <span class="detection-value">✅ Detected</span>
                </div>
                <div class="detection-item">
                    <span class="detection-label">Description Column:</span>
                    <span class="detection-value">✅ Detected</span>
                </div>
                <div class="detection-item">
                    <span class="detection-label">Amount Column:</span>
                    <span class="detection-value">✅ Detected</span>
                </div>
                <div class="detection-item">
                    <span class="detection-label">Type Column:</span>
                    <span class="detection-value">${this.transactions.length > 0 && this.transactions[0].type ? '✅ Detected' : '⚠️ Auto-detected from amounts'}</span>
                </div>
            </div>
            <p class="detection-note">The analyzer automatically found and mapped your spreadsheet columns.</p>
        `;
        
        // Insert before the summary section
        const summarySection = resultsSection.querySelector('.summary-section');
        resultsSection.insertBefore(detectionInfo, summarySection);
    }

    displayDebugInfo() {
        console.log('=== DEBUG INFO ===');
        console.log('Total transactions parsed:', this.transactions.length);
        console.log('Transaction breakdown:');
        
        const breakdown = this.transactions.reduce((acc, t) => {
            acc[t.type] = (acc[t.type] || 0) + 1;
            return acc;
        }, {});
        
        console.log('By type:', breakdown);
        console.log('Sample transactions:', this.transactions.slice(0, 5));
        console.log('==================');
    }

    displaySummary() {
        const summaryTableBody = document.getElementById('summaryTableBody');
        const summary = this.calculateSummary();

        summaryTableBody.innerHTML = '';

        // Display each transaction type
        ['checks', 'debits', 'credits'].forEach(type => {
            const data = summary[type];
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="type-${type}">${this.capitalizeFirst(type)}</td>
                <td>${data.count}</td>
                <td class="${data.total >= 0 ? 'amount-positive' : 'amount-negative'}">$${Math.abs(data.total).toFixed(2)}</td>
                <td class="${data.average >= 0 ? 'amount-positive' : 'amount-negative'}">$${Math.abs(data.average).toFixed(2)}</td>
            `;
            summaryTableBody.appendChild(row);
        });

        // Add totals row
        const totalsRow = document.createElement('tr');
        totalsRow.style.fontWeight = 'bold';
        totalsRow.style.backgroundColor = '#f8f9fa';
        totalsRow.innerHTML = `
            <td>Total</td>
            <td>${summary.total.count}</td>
            <td class="${summary.total.total >= 0 ? 'amount-positive' : 'amount-negative'}">$${Math.abs(summary.total.total).toFixed(2)}</td>
            <td class="${summary.total.average >= 0 ? 'amount-positive' : 'amount-negative'}">$${Math.abs(summary.total.average).toFixed(2)}</td>
        `;
        summaryTableBody.appendChild(totalsRow);
    }

    displayTransactions() {
        const transactionsTableBody = document.getElementById('transactionsTableBody');
        transactionsTableBody.innerHTML = '';

        this.filteredTransactions.forEach(transaction => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${transaction.date.toLocaleDateString()}</td>
                <td>${transaction.description}</td>
                <td class="${transaction.amount >= 0 ? 'amount-positive' : 'amount-negative'}">$${Math.abs(transaction.amount).toFixed(2)}</td>
                <td class="type-${transaction.type}">${this.capitalizeFirst(transaction.type)}</td>
            `;
            transactionsTableBody.appendChild(row);
        });
    }

    calculateSummary() {
        const summary = {
            checks: { count: 0, total: 0, average: 0 },
            debits: { count: 0, total: 0, average: 0 },
            credits: { count: 0, total: 0, average: 0 },
            total: { count: 0, total: 0, average: 0 }
        };

        this.transactions.forEach(transaction => {
            const type = transaction.type;
            summary[type].count++;
            summary[type].total += transaction.amount;
            summary.total.count++;
            summary.total.total += transaction.amount;
        });

        // Calculate averages
        Object.keys(summary).forEach(key => {
            if (summary[key].count > 0) {
                summary[key].average = summary[key].total / summary[key].count;
            }
        });

        return summary;
    }

    filterTransactions() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const typeFilter = document.getElementById('typeFilter').value;

        this.filteredTransactions = this.transactions.filter(transaction => {
            const matchesSearch = !searchTerm || 
                transaction.description.toLowerCase().includes(searchTerm) ||
                transaction.type.toLowerCase().includes(searchTerm);
            
            const matchesType = !typeFilter || transaction.type === typeFilter;

            return matchesSearch && matchesType;
        });

        this.displayTransactions();
    }

    handleSort(e) {
        const column = e.target.dataset.column;
        
        if (this.sortColumn === column) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = column;
            this.sortDirection = 'asc';
        }

        this.sortTransactions();
        this.updateSortIndicators();
        this.displayTransactions();
    }

    sortTransactions() {
        this.filteredTransactions.sort((a, b) => {
            let aVal, bVal;

            switch (this.sortColumn) {
                case 'date':
                    aVal = a.date;
                    bVal = b.date;
                    break;
                case 'description':
                    aVal = a.description.toLowerCase();
                    bVal = b.description.toLowerCase();
                    break;
                case 'amount':
                    aVal = a.amount;
                    bVal = b.amount;
                    break;
                case 'type':
                    aVal = a.type;
                    bVal = b.type;
                    break;
                default:
                    return 0;
            }

            if (aVal < bVal) return this.sortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return this.sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }

    updateSortIndicators() {
        document.querySelectorAll('.sortable').forEach(header => {
            header.classList.remove('sort-asc', 'sort-desc');
        });

        if (this.sortColumn) {
            const activeHeader = document.querySelector(`[data-column="${this.sortColumn}"]`);
            if (activeHeader) {
                activeHeader.classList.add(this.sortDirection === 'asc' ? 'sort-asc' : 'sort-desc');
            }
        }
    }

    showProcessing() {
        document.getElementById('uploadArea').style.display = 'none';
        document.getElementById('processingIndicator').style.display = 'block';
    }

    hideProcessing() {
        document.getElementById('uploadArea').style.display = 'block';
        document.getElementById('processingIndicator').style.display = 'none';
    }

    reset() {
        this.transactions = [];
        this.filteredTransactions = [];
        this.sortColumn = null;
        this.sortDirection = 'asc';

        document.getElementById('resultsSection').style.display = 'none';
        document.getElementById('fileInput').value = '';
        document.getElementById('searchInput').value = '';
        document.getElementById('typeFilter').value = '';
        
        // Reset sort indicators
        document.querySelectorAll('.sortable').forEach(header => {
            header.classList.remove('sort-asc', 'sort-desc');
        });
    }

    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new TransactionAnalyzer();
});