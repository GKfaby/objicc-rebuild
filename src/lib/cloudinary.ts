const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

export async function uploadToCloudinary(file: File, folder: string): Promise<string> {
  if (!cloudName || !uploadPreset) {
    throw new Error('Cloudinary is not configured. Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET.');
  }

  const body = new FormData();
  body.append('file', file);
  body.append('upload_preset', uploadPreset);
  body.append('folder', folder);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
    method: 'POST',
    body,
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Cloudinary upload failed (${response.status}): ${details}`);
  }

  const result = await response.json() as { secure_url?: string };
  if (!result.secure_url) throw new Error('Cloudinary did not return a URL.');
  return result.secure_url;
}