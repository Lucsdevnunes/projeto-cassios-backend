const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/src/app.module');
const { StorageService } = require('./dist/src/storage/storage.service');

async function testFetch() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const storage = app.get(StorageService);

  const urls = [
    "https://aecrqxcczzoprlehncyz.supabase.co/storage/v1/object/public/fotos-antes/1781874366051-xkecktu.jpeg",
    "https://aecrqxcczzoprlehncyz.supabase.co/storage/v1/object/public/fotos-depois/1781874367220-6906gku.jpeg"
  ];
  
  for (const url of urls) {
    try {
      const presigned = await storage.getPresignedUrl(url);
      console.log('Fetching:', url);
      const response = await fetch(presigned);
      console.log('Status Code:', response.status);
    } catch (err) {
      console.error(err);
    }
  }
  await app.close();
}

testFetch();
