/**
 * A.I.M. Fuel Monitoring - Robust Apps Script
 * Maps to Column A (Date), E-P (Data)
 */

function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getActiveSheet();
  var data = JSON.parse(e.postData.contents);
  
  // Calculate Total if possible
  var amount = parseFloat(data.amount) || 0;
  var unitCost = parseFloat(data.unitCost) || 0;
  var total = (amount * unitCost).toFixed(2);
  
  // Format Date for Column A
  var dateObj = new Date(data.date);
  var formattedDate = Utilities.formatDate(dateObj, ss.getSpreadsheetTimeZone(), "MM/dd/yyyy");

  // Append data mapping to Columns E through P
  // E: Month, F: Day, G: Year, H: Trip Ticket, I: Office, J: Plate, K: Liters, L: Unit Cost, M: Total, N: OR No, O: Odometer, P: Fuel Type
  sheet.appendRow([
    formattedDate, // A
    "", "", "",    // B, C, D
    data.month,    // E
    data.day,      // F
    data.year,     // G
    data.tripTicket, // H
    data.office,   // I
    data.plateNumber, // J
    amount,        // K
    unitCost,      // L
    total,         // M
    data.orNumber, // N
    data.odometer, // O
    data.fuelType  // P
  ]);
  
  return ContentService.createTextOutput("Success").setMimeType(ContentService.MimeType.TEXT);
}

/**
 * Automates Calculations for manual spreadsheet entry
 */
function onEdit(e) {
  var range = e.range;
  var sheet = range.getSheet();
  var row = range.getRow();
  var col = range.getColumn();
  
  // Columns: K (Liters) is 11, L (Unit Cost) is 12, M (Total) is 13
  if ((col == 11 || col == 12) && row > 1) {
    var liters = sheet.getRange(row, 11).getValue();
    var unitCost = sheet.getRange(row, 12).getValue();
    if (liters && unitCost) {
      sheet.getRange(row, 13).setValue(liters * unitCost);
    }
  }
  
  // Columns: E (Month) is 5, F (Day) is 6, G (Year) is 7
  // If edited, update Column A (Master Date)
  if ((col >= 5 && col <= 7) && row > 1) {
    var monthStr = sheet.getRange(row, 5).getValue();
    var day = sheet.getRange(row, 6).getValue();
    var year = sheet.getRange(row, 7).getValue();
    
    if (monthStr && day && year) {
      var date = new Date(monthStr + " " + day + ", " + year);
      if (!isNaN(date.getTime())) {
        sheet.getRange(row, 1).setValue(date);
      }
    }
  }
}

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('A.I.M. Setup')
      .addItem('Format Headers', 'formatHeaders')
      .addToUi();
}

function formatHeaders() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var headers = ["DATE", "", "", "", "MONTH", "DAY", "YEAR", "TRIP TICKET", "OFFICE / RESPONSIBILITY CENTER", "PLATE NUMBER", "LITERS", "UNIT COST", "TOTAL COST", "O.R NO.", "ODOMETER", "FUEL TYPE"];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight("bold").setBackground("#f3f3f3");
  SpreadsheetApp.getUi().alert("Sheet headers formatted for Columns A and E-P.");
}
