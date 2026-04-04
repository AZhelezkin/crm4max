/**
 * Сжимает изображение через canvas.
 * maxSize — максимальная сторона в пикселях (по умолчанию 1200).
 * quality — качество JPEG (0–1, по умолчанию 0.82).
 */
export function compressImage(file, maxSize = 1200, quality = 0.82) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(objectUrl);
            let { width, height } = img;
            if (width > maxSize || height > maxSize) {
                if (width >= height) {
                    height = Math.round((height * maxSize) / width);
                    width = maxSize;
                }
                else {
                    width = Math.round((width * maxSize) / height);
                    height = maxSize;
                }
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob((blob) => {
                if (!blob) {
                    reject(new Error('canvas toBlob failed'));
                    return;
                }
                resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
            }, 'image/jpeg', quality);
        };
        img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Image load failed')); };
        img.src = objectUrl;
    });
}
/**
 * Загружает файл на сервер → S3 и возвращает публичный URL.
 * Перед загрузкой сжимает изображение через canvas.
 *
 * Использует fetch напрямую (не axios), чтобы браузер сам установил
 * Content-Type: multipart/form-data с правильным boundary.
 */
export async function uploadPhoto(file, folder = 'masters') {
    const compressed = await compressImage(file).catch(() => file);
    const token = localStorage.getItem('masterToken');
    const formData = new FormData();
    formData.append('file', compressed);
    const baseUrl = `${import.meta.env.VITE_API_URL ?? ''}/api`;
    const res = await fetch(`${baseUrl}/upload?folder=${folder}`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Upload failed: ${res.status}`);
    }
    const { url } = await res.json();
    return url;
}
