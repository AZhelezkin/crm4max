/** Расчёт цены со скидкой в копейках */
export function discountedPrice(price, discountPercent) {
    if (!discountPercent)
        return null;
    return Math.round(price * (1 - discountPercent / 100));
}
/** Форматирование цены из копеек в рубли */
export function formatPrice(kopecks) {
    return (kopecks / 100).toLocaleString('ru-RU') + ' ₽';
}
/** Форматирование длительности */
export function formatDuration(min) {
    return `${min} мин`;
}
