const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/src/app.module');
const { StorageService } = require('./dist/src/storage/storage.service');

async function testPresigned() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const storage = app.get(StorageService);

  const url = "https://aecrqxcczzoprlehncyz.supabase.co/storage/v1/object/public/assinaturas/1781874364874-v6ucoe4.png";
  try {
    console.log('Original URL:', url);
    const presigned = await storage.getPresignedUrl(url);
    console.log('Presigned URL:', presigned);
  } catch (err) {
    console.error(err);
  } finally {
    await app.close();
  }
}

testPresigned();
