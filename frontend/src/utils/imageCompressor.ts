/**
 * Kompresi gambar sisi klien menggunakan native HTML5 Canvas.
 * Mengonversi gambar (JPEG, PNG, HEIC dll) menjadi format WebP dengan max width/height dan kualitas terkontrol.
 * File non-gambar (PDF, berkas teks dll) dilewati tanpa perubahan.
 */
export async function compressImage(
  file: File,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number; // 0.1 - 1.0
  } = {}
): Promise<File> {
  // Jika bukan file gambar (misal PDF atau dokumen), jangan dikompres
  if (!file.type.startsWith('image/')) {
    return file;
  }

  // Jika SVG, biarkan karena vector
  if (file.type === 'image/svg+xml') {
    return file;
  }

  const { maxWidth = 1920, maxHeight = 1920, quality = 0.8 } = options;

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Hitung skala aspect ratio
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        // Gambar ke canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Convert ke WebP blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }

            // Ganti ekstensi file menjadi .webp
            const cleanName = file.name.replace(/\.[^/.]+$/, '') + '.webp';
            const compressedFile = new File([blob], cleanName, {
              type: 'image/webp',
              lastModified: Date.now(),
            });

            // Jika hasil kompresi ternyata lebih besar dari aslinya, pakai yang asli
            if (compressedFile.size > file.size) {
              resolve(file);
            } else {
              resolve(compressedFile);
            }
          },
          'image/webp',
          quality
        );
      };

      img.onerror = () => {
        resolve(file);
      };
    };

    reader.onerror = () => {
      resolve(file);
    };
  });
}
