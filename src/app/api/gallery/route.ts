import { NextResponse } from 'next/server';
import { getGalleryImages } from '@/lib/gcs';

export const dynamic = 'force-dynamic';

export async function GET() {
  const images = await getGalleryImages();
  return NextResponse.json(images, {
    headers: {
      'Cache-Control': 'public, max-age=60, s-maxage=60', // cache list for 1 minute
    },
  });
}
