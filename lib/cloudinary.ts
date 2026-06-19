const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? ''
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? ''

export function toWebP(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      canvas.getContext('2d')!.drawImage(img, 0, 0)
      URL.revokeObjectURL(url)
      canvas.toBlob(b => b ? resolve(b) : reject(new Error('WebP conversion failed')), 'image/webp', 0.85)
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')) }
    img.src = url
  })
}

export async function uploadToCloudinary(file: File, type: 'image' | 'video', folder = 'printEve/products'): Promise<string> {
  if (!CLOUD_NAME || !UPLOAD_PRESET)
    throw new Error('Cloudinary is not configured (check NEXT_PUBLIC_CLOUDINARY_* env vars)')

  const fd = new FormData()
  if (type === 'image' && file.type !== 'image/svg+xml') {
    const webp = await toWebP(file)
    fd.append('file', webp, file.name.replace(/\.[^.]+$/, '.webp'))
  } else {
    fd.append('file', file)
  }
  fd.append('upload_preset', UPLOAD_PRESET)
  fd.append('folder', folder)
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${type}/upload`, {
    method: 'POST',
    body: fd,
  })
  const data = await res.json() as { secure_url?: string; error?: { message: string } }
  if (!res.ok) throw new Error(data.error?.message ?? 'Cloudinary upload failed')
  return data.secure_url!
}
