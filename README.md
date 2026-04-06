# CSV Data Ingestion Backend

A simple Node.js backend for ingesting CSV data into MySQL with validation and error reporting.

## Project Overview

This project provides APIs to upload CSV files and ingest them into a MySQL database. It handles three types of CSV files: stores, users, and store-user mappings. The system validates data, normalizes lookup values, and reports errors for invalid rows.

## Ingestion Pipeline

The flow is: CSV upload → row validation → lookup get-or-create → batch insert → error report

- **CSV Upload**: Files are uploaded via POST endpoints using multipart/form-data.
- **Row Validation**: Each row is validated against business rules (e.g., required fields, valid emails).
- **Lookup Get-or-Create**: For store data, lookup tables are used to normalize values like brands, types, cities, etc. If a value doesn't exist, it's created.
- **Batch Insert**: Valid rows are inserted in batches of 1000 to handle large files efficiently.
- **Error Report**: Invalid rows are collected and returned in the response.

## Handling Large CSV Files

For files with 500k+ rows, the system uses:
- **Streaming**: csv-parser streams the file without loading it entirely into memory.
- **Batch Inserts**: Inserts are done in batches of 1000 rows to avoid overwhelming the database.
- **Validation**: Basic validation is done per row, existence checks for mappings are batched.

## Setup Steps

1. **Install Dependencies**
   ```
   npm install
   ```

2. **Setup MySQL**
   - Install MySQL locally.
   - Create a database named `csv_ingestion`.

3. **Create Tables**
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

4. **Configure Environment**
   - Copy `.env.example` to `.env`.
   - Update the database credentials in `.env`.

5. **Run Server**
   ```
   npm start
   ```

## API Endpoints

### POST /api/upload/stores
Upload stores_master.csv

### POST /api/upload/users
Upload users_master.csv

### POST /api/upload/store-mapping
Upload store_user_mapping.csv

All endpoints accept a file upload with key 'file' and return JSON with success/failure counts and error details.

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

## CSV Formats

### stores_master.csv
Columns: store_id, store_external_id, name, title, store_brand, store_type, city, state, country, region, latitude, longitude, is_active

### users_master.csv
Columns: username, first_name, last_name, email, user_type, phone_number, supervisor_id, is_active

### store_user_mapping.csv
Columns: username, store_id, date