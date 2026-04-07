# CSV Data Ingestion Backend

A Node.js backend service for ingesting CSV data into MySQL with validation, error reporting, and performance optimization.

---

##  Project Overview

This project implements APIs to upload and process CSV files for:

- Stores
- Users
- Store-User Mapping (PJP)

The system validates each row, dynamically handles lookup tables, and inserts valid data into the database while reporting detailed errors.

---

##  Ingestion Pipeline

CSV Upload → Validation → Lookup Get-or-Create → Batch Insert → Error Report

- **CSV Upload**: Multipart file upload using Express + Multer
- **Validation**: Field-level validation (email, user_type, latitude, longitude, required fields)
- **Lookup Handling**: Dynamic get-or-create for store_brand, store_type, city, etc.
- **Batch Insert**: Efficient bulk insertion using batching
- **Error Reporting**: Returns row number, column, and reason

---

##  Design Decisions

### ✔ Failure Strategy
- Invalid rows are **skipped**
- Valid rows are still inserted

 Reason:
- Prevents complete failure due to few bad rows
- Ensures maximum data ingestion

---

### ✔ Data Normalization
- Trimmed values
- Case normalization for lookup tables
- Prevents duplicate lookup entries

---

### ✔ Referential Integrity
- Mapping rows are inserted only if:
  - user exists
  - store exists

---

##  Output Analysis

###  Users Ingestion
successRows: 27
failedRows: 3


Errors:
- Invalid user_type
- Missing username
- Invalid email

---

###  Stores Ingestion (Small File)
successRows: 95
failedRows: 5


Errors:
- Missing store_id
- Invalid latitude/longitude
- Invalid store_id format

---

###  Mapping Ingestion
successRows: ~118
failedRows: ~32


Errors:
- user does not exist
- store does not exist
- invalid date

 Ensures strict referential integrity

---

##  Performance Test (500k File)

File: `stores_master_500k.csv`
Total Rows: 500,000
Success Rows: 495,750
Failed Rows: 4,250
Time Taken: ~5 minutes


---

##  Performance Optimization

- **Batch Inserts** (configurable batch size)
- **Streaming CSV parsing** (no full memory load)
- **Lookup caching** (reduces repeated DB queries)
- **Limited error output** (first 10 errors only)

---

##  Setup Steps

### 1. Install Dependencies


### 2. Setup MySQL
- Create database: `csv_ingestion`

## Create Tables
   Run the following SQL in your MySQL client:

   ```sql
   -- Lookup tables
   CREATE TABLE store_brands (
     id INT AUTO_INCREMENT PRIMARY KEY,
     name VARCHAR(255) UNIQUE
   );

   CREATE TABLE store_types (
     id INT AUTO_INCREMENT PRIMARY KEY,
     name VARCHAR(255) UNIQUE
   );

   CREATE TABLE cities (
     id INT AUTO_INCREMENT PRIMARY KEY,
     name VARCHAR(255) UNIQUE
   );

   CREATE TABLE states (
     id INT AUTO_INCREMENT PRIMARY KEY,
     name VARCHAR(255) UNIQUE
   );

   CREATE TABLE countries (
     id INT AUTO_INCREMENT PRIMARY KEY,
     name VARCHAR(255) UNIQUE
   );

   CREATE TABLE regions (
     id INT AUTO_INCREMENT PRIMARY KEY,
     name VARCHAR(255) UNIQUE
   );

   -- Stores table
   CREATE TABLE stores (
     id INT AUTO_INCREMENT PRIMARY KEY,
     store_id VARCHAR(255) UNIQUE,
     store_external_id VARCHAR(255),
     name VARCHAR(255) NOT NULL,
     title VARCHAR(255),
     store_brand_id INT,
     store_type_id INT,
     city_id INT,
     state_id INT,
     country_id INT,
     region_id INT,
     latitude DECIMAL(10,8),
     longitude DECIMAL(11,8),
     is_active BOOLEAN DEFAULT TRUE,
     FOREIGN KEY (store_brand_id) REFERENCES store_brands(id),
     FOREIGN KEY (store_type_id) REFERENCES store_types(id),
     FOREIGN KEY (city_id) REFERENCES cities(id),
     FOREIGN KEY (state_id) REFERENCES states(id),
     FOREIGN KEY (country_id) REFERENCES countries(id),
     FOREIGN KEY (region_id) REFERENCES regions(id)
   );

   -- Users table
   CREATE TABLE users (
     id INT AUTO_INCREMENT PRIMARY KEY,
     username VARCHAR(255) UNIQUE NOT NULL,
     first_name VARCHAR(255),
     last_name VARCHAR(255),
     email VARCHAR(255) NOT NULL,
     user_type INT NOT NULL CHECK (user_type IN (1,2,3,7)),
     phone_number VARCHAR(20),
     supervisor_id INT,
     is_active BOOLEAN DEFAULT TRUE
   );

   -- Store user mapping table
   CREATE TABLE permanent_journey_plans (
     id INT AUTO_INCREMENT PRIMARY KEY,
     user_id INT NOT NULL,
     store_id INT NOT NULL,
     date DATE NOT NULL,
     UNIQUE(user_id, store_id, date),
     FOREIGN KEY (user_id) REFERENCES users(id),
     FOREIGN KEY (store_id) REFERENCES stores(id)
   );
   ```

### 4. Configure Environment
Create `.env` file:

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=csv_ingestion


### 5. Run Server
npm start

---

## API Endpoints

### Upload Stores

POST /upload/stores

### Upload Users

POST /upload/users


### Upload Mapping

POST /upload/store-mapping


---

## Example Usage with curl

Upload stores CSV:
```
curl.exe -X POST -F "file=@stores_master.csv" http://localhost:3000/upload/stores
```

Upload users CSV:
```
curl.exe -X POST -F "file=@users_master.csv" http://localhost:3000/upload/users
```

Upload mapping CSV:
```
curl.exe -X POST -F "file=@store_user_mapping.csv" http://localhost:3000/upload/store-mapping
```


---

##  CSV Formats

### stores_master.csv
store_id, store_external_id, name, title, store_brand, store_type, city, state, country, region, latitude, longitude, is_active

### users_master.csv
username, first_name, last_name, email, user_type, phone_number, supervisor_id, is_active

### store_user_mapping.csv
username, store_id, date

---

##  Key Highlights

-  Row-level validation with detailed error reporting
-  Dynamic lookup table handling
-  Referential integrity enforcement
-  Efficient batch processing
-  Handles large datasets (500k rows)
-  Scalable and production-ready design

---

##  Future Improvements

- Parallel processing (worker threads)
- Background job queue (Bull / Redis)
- Error export as CSV file
- API for ingestion status tracking

---

##  Author

Shahid