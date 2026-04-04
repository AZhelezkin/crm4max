export function discountedPrice(price, discountPercent) {
    if (!discountPercent)
        return null;
    return Math.round(price * (1 - discountPercent / 100));
}
export function formatPrice(kopecks) {
    return (kopecks / 100).toLocaleString('ru-RU') + ' ₽';
}
export function formatDuration(min) {
    return `${min} мин`;
}
