const fs = require('fs');
const csv = require('csv-parser');

/**
 * CSV to MongoDB JSON Converter
 * Converts CSV files to clean MongoDB-ready JSON array of objects
 */

// Configuration
const CONFIG = {
  inputFile: './30045.csv',           // Your CSV file path
  outputFile: './output3.json',       // Output JSON file
  chunkSize: 500,                    // Rows per chunk file (0 = no chunking)
  enableChunking: false,             // Set to true for auto-chunking
  delimiter: ',',                    // CSV delimiter (comma, semicolon, tab, etc.)
  encoding: 'utf8',                  // File encoding
  selectedColumns: [                 // Specify columns to extract (null = all columns)
    // 'Id', ' ', ......
  ]
};

/**
 * Trim whitespace from string values
 */
function trimValue(value) {
  if (typeof value === 'string') {
    return value.trim();
  }
  return value;
}

/**
 * Standardize null/missing values
 */
function standardizeNull(value) {
  if (value === null || value === undefined || value === '' || 
      (typeof value === 'string' && ['null', 'NULL', 'N/A', 'n/a', 'NA'].includes(value.trim()))) {
    return null;
  }
  return value;
}

/**
 * Check if row is empty
 */
function isEmptyRow(row) {
  return Object.values(row).every(val => val === null || val === undefined || val === '');
}

/**
 * Clean row data and filter columns
 */
function cleanRow(row, selectedColumns = null) {
  // First trim and standardize all values
  const cleanedData = {};
  
  for (let key in row) {
    const trimmedKey = key.trim();
    const trimmedValue = trimValue(row[key]);
    cleanedData[trimmedKey] = standardizeNull(trimmedValue);
  }
  
  // If no column filter, return all cleaned data
  if (!selectedColumns || selectedColumns.length === 0) {
    return cleanedData;
  }
  
  // Filter only selected columns (case-insensitive matching)
  const filtered = {};
  selectedColumns.forEach(col => {
    const matchingKey = Object.keys(cleanedData).find(
      key => key.toLowerCase() === col.toLowerCase()
    );
    
    if (matchingKey) {
      filtered[col] = cleanedData[matchingKey];
    } else {
      filtered[col] = null; // Column not found, set to null
    }
  });
  
  return filtered;
}

/**
 * Convert CSV to JSON
 */
function convertCSVToJSON(inputPath, outputPath, options = {}) {
  return new Promise((resolve, reject) => {
    const results = [];
    let rowCount = 0;
    
    console.log('📖 Reading CSV file...');
    
    fs.createReadStream(inputPath, { encoding: options.encoding || 'utf8' })
      .pipe(csv({
        separator: options.delimiter || ',',
        skipEmptyLines: true,
        trim: true
      }))
      .on('data', (data) => {
        rowCount++;
        
        // Clean the row with column filtering
        const cleanedRow = cleanRow(data, options.selectedColumns);
        
        // Skip empty rows
        if (!isEmptyRow(cleanedRow)) {
          results.push(cleanedRow);
        }
      })
      .on('end', () => {
        console.log(`📝 Found ${rowCount} rows in CSV`);
        console.log(`✨ Cleaned data: ${results.length} valid rows`);
        
        try {
          // Handle chunking
          if (options.enableChunking && options.chunkSize > 0) {
            console.log(`📦 Chunking into ${options.chunkSize} rows per file...`);
            
            const chunks = [];
            for (let i = 0; i < results.length; i += options.chunkSize) {
              chunks.push(results.slice(i, i + options.chunkSize));
            }
            
            chunks.forEach((chunk, index) => {
              const chunkFileName = outputPath.replace('.json', `_chunk_${index + 1}.json`);
              fs.writeFileSync(chunkFileName, JSON.stringify(chunk, null, 2), 'utf8');
              console.log(`✅ Created ${chunkFileName} (${chunk.length} rows)`);
            });
            
          } else {
            // Write single file
            fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf8');
            console.log(`✅ JSON file created: ${outputPath}`);
          }
          
          // Display sample
          console.log('\n📋 Sample data (first 2 rows):');
          console.log(JSON.stringify(results.slice(0, 2), null, 2));
          
          if (options.selectedColumns && options.selectedColumns.length > 0) {
            console.log(`\n🎯 Extracted ${options.selectedColumns.length} columns: ${options.selectedColumns.join(', ')}`);
          }
          
          resolve(results);
          
        } catch (error) {
          reject(error);
        }
      })
      .on('error', (error) => {
        console.error('❌ Error reading CSV:', error.message);
        reject(error);
      });
  });
}

/**
 * Generate MongoDB bulk insert example
 */
function generateMongoInsertExample(collectionName = 'myCollection') {
  console.log('\n💾 MongoDB Bulk Insert Example:');
  console.log('─'.repeat(50));
  console.log(`
const MongoClient = require('mongodb').MongoClient;
const fs = require('fs');

async function bulkInsert() {
  const client = await MongoClient.connect('mongodb://localhost:27017');
  const db = client.db('myDatabase');
  const collection = db.collection('${collectionName}');
  
  // Read JSON file
  const data = JSON.parse(fs.readFileSync('${CONFIG.outputFile}', 'utf8'));
  
  // Bulk insert
  const result = await collection.insertMany(data);
  console.log(\`Inserted \${result.insertedCount} documents\`);
  
  await client.close();
}

bulkInsert().catch(console.error);
  `);
}

// Main execution
if (require.main === module) {
  console.log('🚀 CSV to MongoDB JSON Converter\n');
  
  convertCSVToJSON(CONFIG.inputFile, CONFIG.outputFile, {
    delimiter: CONFIG.delimiter,
    chunkSize: CONFIG.chunkSize,
    enableChunking: CONFIG.enableChunking,
    encoding: CONFIG.encoding,
    selectedColumns: CONFIG.selectedColumns
  })
  .then(() => {
    generateMongoInsertExample();
  })
  .catch((error) => {
    console.error('❌ Conversion failed:', error.message);
    process.exit(1);
  });
}

module.exports = { convertCSVToJSON, cleanRow };