const csv = require('csv-parser');
const fs = require('fs');
const { query } = require('./db');
const { isValidEmail, isValidUserType, isValidLatitude, isValidLongitude, isValidDate, validateMappingRow, isValidStoreId } = require('./validation');

const BATCH_SIZE = 1000;

async function getOrCreateLookup(table, name) {
  const normalizedName = name.trim().toLowerCase();
  let rows = await query(`SELECT id FROM ${table} WHERE name = ?`, [normalizedName]);
  if (rows.length > 0) {
    return rows[0].id;
  }
  const result = await query(`INSERT INTO ${table} (name) VALUES (?)`, [normalizedName]);
  return result.insertId;
}

async function processStoresCSV(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];
    const errors = [];
    let rowNumber = 1;

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => {
        rowNumber++;
        rows.push({ data, rowNumber });
      })
      .on('end', async () => {
        try {
          for (const { data, rowNumber } of rows) {
            const validationErrors = validateStoreRow(data, rowNumber);
            if (validationErrors.length > 0) {
              errors.push(...validationErrors);
            }
          }
          const validRows = rows.filter(({ data, rowNumber }) => {
            return validateStoreRow(data, rowNumber).length === 0;
          }).map(({ data }) => data);
          const successCount = await batchInsertStores(validRows);
          resolve({ successRows: successCount, failedRows: errors.length, errors });
        } catch (err) {
          reject(err);
        }
      })
      .on('error', reject);
  });
}

function validateStoreRow(row, rowNumber) {
  const errors = [];
  if (!row.store_id || row.store_id.trim() === '') {
  errors.push({ row: rowNumber, column: 'store_id', reason: 'required' });
  } else if (!isValidStoreId(row.store_id)) {
    errors.push({ 
      row: rowNumber, 
      column: 'store_id', 
      reason: 'invalid format (expected STR-XXXX)' 
    });
  }
  if (!row.name || row.name.trim() === '') {
    errors.push({ row: rowNumber, column: 'name', reason: 'required' });
  }
  if (row.latitude && !isValidLatitude(row.latitude)) {
    errors.push({ row: rowNumber, column: 'latitude', reason: 'invalid latitude' });
  }
  if (row.longitude && !isValidLongitude(row.longitude)) {
    errors.push({ row: rowNumber, column: 'longitude', reason: 'invalid longitude' });
  }
  return errors;
}

async function batchInsertStores(rows) {
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const values = [];
    const placeholders = [];

    for (const row of batch) {
      const storeBrandId = row.store_brand ? await getOrCreateLookup('store_brands', row.store_brand) : null;
      const storeTypeId = row.store_type ? await getOrCreateLookup('store_types', row.store_type) : null;
      const cityId = row.city ? await getOrCreateLookup('cities', row.city) : null;
      const stateId = row.state ? await getOrCreateLookup('states', row.state) : null;
      const countryId = row.country ? await getOrCreateLookup('countries', row.country) : null;
      const regionId = row.region ? await getOrCreateLookup('regions', row.region) : null;

      values.push(
        row.store_id,
        row.store_external_id || null,
        row.name,
        row.title || null,
        storeBrandId,
        storeTypeId,
        cityId,
        stateId,
        countryId,
        regionId,
        row.latitude ? parseFloat(row.latitude) : null,
        row.longitude ? parseFloat(row.longitude) : null,
        row.is_active !== 'false' // default true
      );
      placeholders.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    }

    const sql = `INSERT IGNORE INTO stores (store_id, store_external_id, name, title, store_brand_id, store_type_id, city_id, state_id, country_id, region_id, latitude, longitude, is_active) VALUES ${placeholders.join(', ')}`;
    await query(sql, values);
    inserted += batch.length;
  }
  return inserted;
}

async function processUsersCSV(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];
    const errors = [];
    let rowNumber = 1;

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => {
        rowNumber++;
        rows.push({ data, rowNumber });
      })
      .on('end', async () => {
        try {
          for (const { data, rowNumber } of rows) {
            const validationErrors = validateUserRow(data, rowNumber);
            if (validationErrors.length > 0) {
              errors.push(...validationErrors);
            }
          }
          const validRows = rows.filter(({ data, rowNumber }) => {
            return validateUserRow(data, rowNumber).length === 0;
          }).map(({ data }) => data);
          const successCount = await batchInsertUsers(validRows);
          resolve({ successRows: successCount, failedRows: errors.length, errors });
        } catch (err) {
          reject(err);
        }
      })
      .on('error', reject);
  });
}

function validateUserRow(row, rowNumber) {
  const errors = [];
  if (!row.username || row.username.trim() === '') {
    errors.push({ row: rowNumber, column: 'username', reason: 'required' });
  }
  if (!row.email || !isValidEmail(row.email)) {
    errors.push({ row: rowNumber, column: 'email', reason: 'invalid email' });
  }
  if (row.user_type && !isValidUserType(row.user_type)) {
    errors.push({ row: rowNumber, column: 'user_type', reason: 'must be 1, 2, 3, or 7' });
  }
  return errors;
}

async function batchInsertUsers(rows) {
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const values = [];
    const placeholders = [];

    for (const row of batch) {
      values.push(
        row.username,
        row.first_name || null,
        row.last_name || null,
        row.email,
        parseInt(row.user_type) || 1,
        row.phone_number || null,
        row.supervisor_id ? parseInt(row.supervisor_id) : null,
        row.is_active !== 'false'
      );
      placeholders.push('(?, ?, ?, ?, ?, ?, ?, ?)');
    }

    const sql = `INSERT IGNORE INTO users (username, first_name, last_name, email, user_type, phone_number, supervisor_id, is_active) VALUES ${placeholders.join(', ')}`;
    await query(sql, values);
    inserted += batch.length;
  }
  return inserted;
}

async function processMappingCSV(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];
    const errors = [];
    let rowNumber = 1;

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => {
        rowNumber++;
        rows.push({ data, rowNumber });
      })
      .on('end', async () => {
        try {
          const validRows = [];
          for (const { data, rowNumber } of rows) {
            let validationErrors = validateMappingRow(data, rowNumber);
            if (validationErrors.length > 0) {
              errors.push(...validationErrors);
            } else {
              // Check existence
              const userExists = await checkUserExists(data.username);
              const storeExists = await checkStoreExists(data.store_id);
              if (!userExists) {
                errors.push({ row: rowNumber, column: 'username', reason: 'user does not exist' });
              } else if (!storeExists) {
                errors.push({ row: rowNumber, column: 'store_id', reason: 'store does not exist' });
              } else {
                validRows.push(data);
              }
            }
          }
          const successCount = await batchInsertMappings(validRows);
          resolve({ successRows: successCount, failedRows: errors.length, errors });
        } catch (err) {
          reject(err);
        }
      })
      .on('error', reject);
  });
}

async function checkUserExists(username) {
  const users = await query('SELECT id FROM users WHERE username = ?', [username.trim()]);
  return users.length > 0;
}

async function checkStoreExists(storeId) {
  const stores = await query('SELECT id FROM stores WHERE store_id = ?', [storeId.trim()]);
  return stores.length > 0;
}

async function batchInsertMappings(rows) {
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const values = [];
    const placeholders = [];

    for (const row of batch) {
      const users = await query('SELECT id FROM users WHERE username = ?', [row.username.trim()]);
      const stores = await query('SELECT id FROM stores WHERE store_id = ?', [row.store_id.trim()]);
      if (users.length > 0 && stores.length > 0) {
        values.push(users[0].id, stores[0].id, row.date);
        placeholders.push('(?, ?, ?)');
      }
    }

    if (values.length > 0) {
      const sql = `INSERT IGNORE INTO permanent_journey_plans (user_id, store_id, date) VALUES ${placeholders.join(', ')}`;
      await query(sql, values);
      inserted += batch.length;
    }
  }
  return inserted;
}

module.exports = {
  processStoresCSV,
  processUsersCSV,
  processMappingCSV
};