function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidUserType(userType) {
  return [1, 2, 3, 7].includes(parseInt(userType));
}

function isValidLatitude(lat) {
  const num = parseFloat(lat);
  return !isNaN(num) && num >= -90 && num <= 90;
}

function isValidLongitude(lon) {
  const num = parseFloat(lon);
  return !isNaN(num) && num >= -180 && num <= 180;
}

function isValidDate(dateStr) {
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

function isValidStoreId(storeId) {
  if (!storeId) return false;
  storeId = storeId.trim();
  return /^STR-\d{4}$/.test(storeId);
}

function validateMappingRow(row, rowNumber) {
  const errors = [];

  if (!row.username || row.username.trim() === '') {
    errors.push({ row: rowNumber, column: 'username', reason: 'required' });
  }

  if (!row.store_id || row.store_id.trim() === '') {
    errors.push({ row: rowNumber, column: 'store_id', reason: 'required' });
  }

  if (!row.date || !isValidDate(row.date)) {
    errors.push({ row: rowNumber, column: 'date', reason: 'invalid date' });
  }

  return errors;
}

module.exports = {
  isValidEmail,
  isValidUserType,
  isValidLatitude,
  isValidLongitude,
  isValidDate,
  validateMappingRow,
  isValidStoreId
};