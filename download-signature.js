const fs = require('fs');
const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/src/app.module');
const { StorageService } = require('./dist/src/storage/storage.service');

async function downloadSig() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const storage = app.get(StorageService);

  const url = "https://aecrqxcczzoprlehncyz.supabase.co/storage/v1/object/public/assinaturas/1781874364874-v6ucoe4.png";
  try {
    const presigned = await storage.getPresignedUrl(url);
    const response = await fetch(presigned);
    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync('signature-test.png', buffer);
    console.log('Saved signature-test.png');
  } catch (err) {
    console.error(err);
  } finally {
    await app.close();
  }
}

downloadSig();
