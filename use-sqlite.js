const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
const envPath = path.join(__dirname, '.env');

// 1. Update schema.prisma provider
if (fs.existsSync(schemaPath)) {
  let schema = fs.readFileSync(schemaPath, 'utf8');
  if (schema.includes('provider = "postgresql"')) {
    schema = schema.replace('provider = "postgresql"', 'provider = "sqlite"');
    fs.writeFileSync(schemaPath, schema, 'utf8');
    console.log('schema.prisma updated successfully to SQLite!');
  } else {
    console.log('schema.prisma is already configured for SQLite (or is not PostgreSQL).');
  }
} else {
  console.error('schema.prisma not found at:', schemaPath);
}

// 2. Create/Update .env file
let envContent = 'DATABASE_URL="file:./dev.db"\nJWT_SECRET="super-secret-key-123"\nPORT=3001\nUPLOAD_DIR="./uploads"\n';
fs.writeFileSync(envPath, envContent, 'utf8');
console.log('.env file updated with SQLite configurations.');
console.log('\nTo complete SQLite migration, run:\n  npx prisma migrate dev --name init\n  npx prisma db seed\n');
