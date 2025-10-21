# Bank Transaction Analyzer

A simple web application that analyzes bank statement PDFs to categorize and count transactions.

## Features

- **PDF Upload**: Drag-and-drop or click to upload bank statement PDFs
- **Transaction Categorization**: Automatically categorizes transactions into:
  - **Checks**: Check transactions (both incoming and outgoing)
  - **Debits**: Money going out
  - **Credits**: Money coming in
- **Analysis Tables**: 
  - Summary table with counts, totals, and averages per category
  - Detailed transaction table with search and filtering
- **Interactive Features**:
  - Search transactions by description
  - Filter by transaction type
  - Sort by any column (date, description, amount, type)

## How to Use

1. Open `index.html` in a web browser
2. Upload a PDF bank statement by dragging it to the upload area or clicking to browse
3. Wait for the PDF to be processed
4. View the analysis results in the summary and detailed tables
5. Use search and filter options to explore specific transactions
6. Click "Analyze Another Statement" to start over

## Technical Details

- **Frontend**: Pure HTML, CSS, and JavaScript (no frameworks)
- **PDF Processing**: PDF.js library for client-side text extraction
- **Browser Compatibility**: Works in all modern browsers
- **No Backend Required**: All processing happens in the browser

## File Structure

```
├── index.html          # Main HTML page
├── styles.css          # CSS styling
├── app.js             # JavaScript application logic
└── README.md          # This file
```

## Notes

- The PDF parsing uses pattern matching to identify transactions
- Different bank statement formats may require adjustments to the parsing logic
- All data processing happens locally in your browser - no data is sent to external servers
- The application works offline once the page is loaded

## Browser Requirements

- Modern web browser with JavaScript enabled
- PDF.js library is loaded from CDN (requires internet connection for initial load)
