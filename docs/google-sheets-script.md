# Google Sheets Integration Script

To link your Google Sheet to the A.I.M system so that data entered in the **Consumption Entry** page is automatically saved to your sheet, follow these steps:

## 1. Open your Google Sheet
Go to the Google Sheet you want to use: [Electric Consumption Sheet](https://docs.google.com/spreadsheets/d/19oe9VB9MKXn0QSAYxwqzp1LYw9nLX_OQgc9c1QMU7ro/edit?gid=1461192828#gid=1461192828)

## 2. Open Apps Script
In the menu bar, go to **Extensions** > **Apps Script**.

## 3. Paste the following Code
Delete any code in the editor and paste this:

```javascript
/**
 * A.I.M - Asset Inventory Management
 * Google Sheets Data Sync Script
 */

function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getActiveSheet();
  
  try {
    var data = JSON.parse(e.postData.contents);
    
    // Mapping data based on type
    if (data.type === 'fuel') {
      // Fuel reporting layout (matches matrix format)
      sheet.appendRow([
        null, null, null, null,
        data.month,
        data.day,
        data.year,
        data.tripTicket || '-',
        data.office,
        data.plateNumber || '-',
        data.amount,
        data.unitCost || 0,
        data.cost,
        data.orNumber || '-',
        data.odometer || 0,
        data.fuelType || '-'
      ]);
    } else {
      // Water / Electricity entry
      // Format: Date, Office, Amount, Cost, LoggedBy
      sheet.appendRow([
        new Date(data.date),
        data.office,
        data.amount,
        data.cost,
        data.userName
      ]);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ "result": "success" }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ "result": "error", "error": err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Enable CORS for testing
function doGet(e) {
  return ContentService.createTextOutput("A.I.M Sync API Active.");
}
```

## 4. Deploy the Script
1. Click **Deploy** > **New deployment**.
2. Select type: **Web app**.
3. Description: `AIM Data Sync`.
4. Execute as: **Me**.
5. Who has access: **Anyone** (This is required for the app to send data without OAuth login).
6. Click **Deploy**.
7. Copy the **Web App URL**.

## 5. Link to A.I.M
1. Open the A.I.M app and navigate to **Consumption Entry**.
2. Paste the **Web App URL** into the **Connection Settings** box on the right.
3. Your data will now sync to that Google Sheet when you submit an entry.