import { Storage } from '@google-cloud/storage';
import fs from 'fs';
import path from 'path';

const storage = new Storage();
const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'gold_tracker_image';

export const getGalleryImages = async (): Promise<string[]> => {
  try {
    const bucket = storage.bucket(BUCKET_NAME);
    const [files] = await bucket.getFiles();
    const imageFiles = files
      .map(file => file.name)
      .filter(name => /\.(jpe?g|png|webp|gif)$/i.test(name));
      
    if (imageFiles.length > 0) {
      return imageFiles;
    }
  } catch (error) {
    console.warn('GCS access failed, falling back to local gallery files:', error);
  }

  // Fallback to local gallery.json list if it exists
  try {
    const localGalleryPath = path.join(process.cwd(), 'src/app/login/gallery.json');
    if (fs.existsSync(localGalleryPath)) {
      const data = fs.readFileSync(localGalleryPath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (localError) {
    console.error('Local gallery fallback failed:', localError);
  }
  
  return [];
};

export const getGCSFileStream = (filename: string) => {
  const bucket = storage.bucket(BUCKET_NAME);
  const file = bucket.file(filename);
  return file.createReadStream();
};

export const getGCSFileMetadata = async (filename: string) => {
  const bucket = storage.bucket(BUCKET_NAME);
  const file = bucket.file(filename);
  const [metadata] = await file.getMetadata();
  return metadata;
};
