import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private s3Client: S3Client | null = null;
  private bucketName: string | null = null;
  private uploadDir: string;

  constructor(private configService: ConfigService) {
    this.uploadDir = this.configService.get<string>('UPLOAD_DIR', './uploads');

    // Check if S3 credentials are provided
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');
    const region = this.configService.get<string>('AWS_REGION');
    this.bucketName = this.configService.get<string>('AWS_BUCKET_NAME') || null;

    if (accessKeyId && secretAccessKey && region && this.bucketName) {
      const endpoint = this.configService.get<string>('AWS_S3_ENDPOINT');
      this.s3Client = new S3Client({
        region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
        endpoint: endpoint || undefined,
        forcePathStyle: endpoint ? true : false, // Required for some S3-compatibles like LocalStack or MinIO
      });
      this.logger.log('S3/R2 Storage Service initialized');
    } else {
      this.logger.log('S3 credentials not complete, falling back to Local Storage');
      // Create local upload folder if it doesn't exist
      if (!fs.existsSync(this.uploadDir)) {
        fs.mkdirSync(this.uploadDir, { recursive: true });
      }
    }
  }

  /**
   * Uploads a file (buffer) and returns its accessible URL or path
   */
  async uploadFile(fileBuffer: Buffer, fileName: string, mimeType: string, bucketName?: string): Promise<string> {
    // 1. Security validation: file size limit (max 10MB)
    const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
    if (fileBuffer.length > MAX_SIZE_BYTES) {
      throw new BadRequestException('O arquivo excede o limite máximo permitido de 10MB.');
    }

    // 2. Security validation: strict MIME type whitelisting (images only)
    const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase())) {
      throw new BadRequestException('Tipo de arquivo não permitido. Apenas imagens (PNG, JPEG, WEBP) são aceitas.');
    }

    const targetBucket = bucketName || this.bucketName || 'uploads';
    const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}${path.extname(fileName) || '.jpg'}`;

    if (this.s3Client && targetBucket) {
      try {
        const command = new PutObjectCommand({
          Bucket: targetBucket,
          Key: uniqueFileName,
          Body: fileBuffer,
          ContentType: mimeType,
          ACL: 'public-read',
        });
        await this.s3Client.send(command);

        // Get Supabase URL if configured
        const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
        if (supabaseUrl) {
          return `${supabaseUrl}/storage/v1/object/public/${targetBucket}/${uniqueFileName}`;
        }

        // Get S3 URL fallback
        const endpoint = this.configService.get<string>('AWS_S3_ENDPOINT');
        const region = this.configService.get<string>('AWS_REGION');
        if (endpoint) {
          return `${endpoint}/${targetBucket}/${uniqueFileName}`;
        }
        return `https://${targetBucket}.s3.${region}.amazonaws.com/${uniqueFileName}`;
      } catch (error) {
        this.logger.error(`Error uploading file to S3 bucket ${targetBucket}, falling back to local`, error);
      }
    }

    // Local file fallback
    const targetLocalDir = path.join(this.uploadDir, targetBucket);
    if (!fs.existsSync(targetLocalDir)) {
      fs.mkdirSync(targetLocalDir, { recursive: true });
    }
    const filePath = path.join(targetLocalDir, uniqueFileName);
    await fs.promises.writeFile(filePath, fileBuffer);
    
    // We return a relative URL path that will be served by static files
    return `/uploads/${targetBucket}/${uniqueFileName}`;
  }

  /**
   * Uploads a base64 image (used for digital signatures)
   */
  async uploadBase64Image(base64Data: string, prefix: string, bucketName?: string): Promise<string> {
    // Extract base64 content
    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let mimeType = 'image/png';
    let buffer: Buffer;

    if (!matches || matches.length !== 3) {
      // If not standard data URI, try to convert directly assuming it's a plain base64 string
      buffer = Buffer.from(base64Data, 'base64');
    } else {
      mimeType = matches[1];
      buffer = Buffer.from(matches[2], 'base64');
    }

    const extension = mimeType.split('/')[1] || 'png';
    const fileName = `${prefix}-${Date.now()}.${extension}`;
    return this.uploadFile(buffer, fileName, mimeType, bucketName);
  }

  /**
   * Generates a temporary secure (presigned) URL for private buckets.
   */
  async getPresignedUrl(urlOrPath: string): Promise<string> {
    if (!urlOrPath) return urlOrPath;

    // If it's already a presigned URL, return it
    if (urlOrPath.includes('?token=') || urlOrPath.includes('Signature=')) {
      return urlOrPath;
    }

    let bucketName = '';
    let fileKey = '';

    if (urlOrPath.startsWith('/uploads/')) {
      // Local path format: /uploads/bucketName/fileKey
      const parts = urlOrPath.split('/');
      if (parts.length >= 4) {
        bucketName = parts[2];
        fileKey = parts.slice(3).join('/');
      }
    } else if (urlOrPath.includes('/storage/v1/object/public/')) {
      // Supabase public URL format: https://xxx.supabase.co/storage/v1/object/public/bucketName/fileKey
      const parts = urlOrPath.split('/storage/v1/object/public/');
      if (parts.length === 2) {
        const subParts = parts[1].split('/');
        bucketName = subParts[0];
        fileKey = subParts.slice(1).join('/');
      }
    } else if (urlOrPath.includes('.amazonaws.com/')) {
      // S3 format: https://bucketName.s3.region.amazonaws.com/fileKey
      try {
        const url = new URL(urlOrPath);
        const hostParts = url.hostname.split('.');
        bucketName = hostParts[0];
        fileKey = url.pathname.substring(1);
      } catch (e) {
        // Ignore
      }
    }

    const privateBuckets = []; // All our buckets are configured as public in Supabase to allow public timeline access
    if (bucketName && fileKey && privateBuckets.includes(bucketName)) {
      if (this.s3Client) {
        try {
          const command = new GetObjectCommand({
            Bucket: bucketName,
            Key: fileKey,
          });
          const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
          const signedUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 }); // 1 hour
          return signedUrl;
        } catch (error) {
          this.logger.error(`Error generating presigned URL for ${bucketName}/${fileKey}`, error);
        }
      }
    }

    return urlOrPath;
  }
}
