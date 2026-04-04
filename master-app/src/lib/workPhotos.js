export function getFirstUploadedWorkPhotoUrl(workPhotos) {
    return workPhotos.find((p) => !p.uploading && p.url)?.url ?? null;
}
