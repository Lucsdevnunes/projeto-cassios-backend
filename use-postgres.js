const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
const envPath = path.join(__dirname, '.env');

// 1. Update schema.prisma provider
if (fs.existsSync(schemaPath)) {
  let schema = fs.readFileSync(schemaPath, 'utf8');
  if (schema.includes('provider = "sqlite"')) {
    schema = schema.replace('provider = "sqlite"', 'provider = "postgresql"');
    fs.writeFileSync(schemaPath, schema, 'utf8');
    console.log('schema.prisma updated successfully to PostgreSQL!');
  } else {
    console.log('schema.prisma is already configured for PostgreSQL (or is not SQLite).');
  }
} else {
  console.error('schema.prisma not found at:', schemaPath);
}

// 2. Create/Update .env file template
let envContent = 'DATABASE_URL="postgresql://postgres:postgres@localhost:5432/cassios_db?schema=public"\nJWT_SECRET="super-secret-key-123"\nPORT=3001\nUPLOAD_DIR="./uploads"\n';
fs.writeFileSync(envPath, envContent, 'utf8');
console.log('.env file updated with PostgreSQL template configurations.');
console.log('\nTo complete PostgreSQL migration, run:\n  npx prisma migrate dev --name init\n  npx prisma db seed\n');
