import { NextRequest, NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';
import fs from 'fs';
import path from 'path';

const storage = new Storage();
const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'GOLD_TRACKER_IMAGE';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name');

  if (!name) {
    return new NextResponse('Missing name parameter', { status: 400 });
  }

  const cleanName = path.basename(name);

  try {
    const bucket = storage.bucket(BUCKET_NAME);
    const file = bucket.file(cleanName);
    
    const [fileBuffer] = await file.download();
    const [metadata] = await file.getMetadata();
    const contentType = metadata.contentType || 'image/jpeg';

    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.warn(`GCS fetch failed for ${cleanName}, trying local fallback:`, error);
    
    const localFilePath = path.join(process.cwd(), 'public/assets/gallery', cleanName);
    if (fs.existsSync(localFilePath)) {
      try {
        const fileBuffer = fs.readFileSync(localFilePath);
        const ext = path.extname(cleanName).toLowerCase();
        let contentType = 'image/jpeg';
        if (ext === '.png') contentType = 'image/png';
        else if (ext === '.webp') contentType = 'image/webp';
        else if (ext === '.gif') contentType = 'image/gif';

        return new NextResponse(new Uint8Array(fileBuffer), {
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        });
      } catch (localErr) {
        console.error('Local fallback read failed:', localErr);
      }
    }
  }

  return new NextResponse('File not found', { status: 404 });
}
