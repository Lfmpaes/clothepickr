export interface CompressionResult {
  blob: Blob
  mimeType: string
  width: number
  height: number
}

export async function compressImage(
  file: File,
  maxDimension = 1400,
  quality = 0.8,
): Promise<CompressionResult> {
  if (!file.type.startsWith('image/')) {
    return {
      blob: file,
      mimeType: file.type || 'application/octet-stream',
      width: 0,
      height: 0,
    }
  }

  let imageBitmap: ImageBitmap
  try {
    imageBitmap = await createImageBitmap(file)
  } catch {
    return {
      blob: file,
      mimeType: file.type || 'application/octet-stream',
      width: 0,
      height: 0,
    }
  }

  const ratio = Math.min(maxDimension / imageBitmap.width, maxDimension / imageBitmap.height, 1)
  const width = Math.max(1, Math.round(imageBitmap.width * ratio))
  const height = Math.max(1, Math.round(imageBitmap.height * ratio))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Could not get canvas context.')
  }

  context.drawImage(imageBitmap, 0, 0, width, height)
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (!result) {
          reject(new Error('Could not compress image.'))
          return
        }
        resolve(result)
      },
      'image/jpeg',
      quality,
    )
  })

  return {
    blob,
    mimeType: blob.type,
    width,
    height,
  }
}
