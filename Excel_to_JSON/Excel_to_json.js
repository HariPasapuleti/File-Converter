const XLSX = require('xlsx');
const fs = require('fs');

/**
 * Excel to MongoDB JSON Converter
 * Converts Excel files to clean MongoDB-ready JSON array of objects
 */

// Configuration
const CONFIG = {
  inputFile: './2022_FIFA.xlsx',       // Your Excel file path
  outputFile: './output.json',       // Output JSON file
  sheetName: null,                   // null = first sheet, or specify sheet name
  chunkSize: 500,                    // Rows per chunk file (0 = no chunking)
  enableChunking: false              // Set to true for auto-chunking
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
 * Clean and transform data
 */
function cleanData(data) {
  const cleaned = [];
  
  for (let row of data) {
    // Trim all values
    const trimmedRow = {};
    for (let key in row) {
      const trimmedKey = key.trim();
      trimmedRow[trimmedKey] = trimValue(row[key]);
    }
    
    // Standardize nulls
    const standardizedRow = {};
    for (let key in trimmedRow) {
      standardizedRow[key] = standardizeNull(trimmedRow[key]);
    }
    
    // Skip empty rows
    if (!isEmptyRow(standardizedRow)) {
      cleaned.push(standardizedRow);
    }
  }
  
  return cleaned;
}

/**
 * Convert Excel to JSON
 */
function convertExcelToJSON(inputPath, outputPath, options = {}) {
  try {
    console.log('📖 Reading Excel file...');
    
    // Read Excel file
    const workbook = XLSX.readFile(inputPath);
    
    // Get sheet name
    const sheetName = options.sheetName || workbook.SheetNames[0];
    console.log(`📊 Processing sheet: ${sheetName}`);
    
    // Convert to JSON
    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`📝 Found ${rawData.length} rows (including header)`);
    
    // Clean data
    console.log('🧹 Cleaning data...');
    const cleanedData = cleanData(rawData);
    
    console.log(`✨ Cleaned data: ${cleanedData.length} valid rows`);
    
    // Handle chunking
    if (options.enableChunking && options.chunkSize > 0) {
      console.log(`📦 Chunking into ${options.chunkSize} rows per file...`);
      
      const chunks = [];
      for (let i = 0; i < cleanedData.length; i += options.chunkSize) {
        chunks.push(cleanedData.slice(i, i + options.chunkSize));
      }
      
      chunks.forEach((chunk, index) => {
        const chunkFileName = outputPath.replace('.json', `_chunk_${index + 1}.json`);
        fs.writeFileSync(chunkFileName, JSON.stringify(chunk, null, 2), 'utf8');
        console.log(`✅ Created ${chunkFileName} (${chunk.length} rows)`);
      });
      
    } else {
      // Write single file
      fs.writeFileSync(outputPath, JSON.stringify(cleanedData, null, 2), 'utf8');
      console.log(`✅ JSON file created: ${outputPath}`);
    }
    
    // Display sample
    console.log('\n📋 Sample data (first 2 rows):');
    console.log(JSON.stringify(cleanedData.slice(0, 2), null, 2));
    
    return cleanedData;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
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
  console.log('🚀 Excel to MongoDB JSON Converter\n');
  
  convertExcelToJSON(CONFIG.inputFile, CONFIG.outputFile, {
    sheetName: CONFIG.sheetName,
    chunkSize: CONFIG.chunkSize,
    enableChunking: CONFIG.enableChunking
  });
  
  generateMongoInsertExample();
}

module.exports = { convertExcelToJSON, cleanData };