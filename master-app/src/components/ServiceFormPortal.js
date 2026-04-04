import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Spinner } from '@maxhub/max-ui';
import { uploadPhoto } from '@/api/upload.api';
import maskIconUrl from '@/assets/mask-icon.svg';
import { onboardingDiscountBadgeStyle, onboardingFieldInputStyle, onboardingFieldSuffixStyle, onboardingFieldWithSuffixWrapStyle, onboardingFieldWrapStyle, onboardingPortalContentStyle, onboardingPriceRowStyle, onboardingSectionLabelStyle, onboardingSelectChevronStyle, onboardingSelectStyle, onboardingSelectWrapStyle, onboardingToggleLabelStyle, primaryActionButtonBaseStyle, serviceWorkPhotoAddIconStyle, stepOneCounterStyle, stepOneTextareaStyle, stepOneTextareaWrapStyle, } from '@/components/onboardingStepOne.styles';
import { formatPrice } from '@/types';
const DISCOUNT_OPTIONS = [5, 10, 15, 20, 25, 30, 40, 50];
export default function ServiceFormPortal({ visible, isEdit, name, onNameChange, desc, onDescChange, durationMin, onDurationChange, price, onPriceChange, discountEnabled, onDiscountEnabledChange, discountPercent, onDiscountPercentChange, workPhotos, onWorkPhotosChange, categories, categoryId, onCategoryIdChange, onClose, onSave, }) {
    const fileRef = useRef(null);
    const [uploading, setUploading] = useState(false);
    if (!visible)
        return null;
    const canSave = name.trim() && !uploading;
    // Предпросмотр скидки
    const discountedPriceNum = discountEnabled && price
        ? Math.round(Number(price) * 100 * (1 - discountPercent / 100))
        : null;
    return createPortal(_jsxs("div", { style: {
            position: 'fixed', inset: 0,
            background: 'var(--color-bg)',
            zIndex: 200,
            display: 'flex', flexDirection: 'column',
        }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', padding: '14px 4px 0', flexShrink: 0 }, children: [_jsx("button", { onClick: onClose, style: {
                            width: 56, display: 'flex', justifyContent: 'center',
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: 'var(--color-primary)', padding: 0,
                        }, children: _jsx(BackArrowIcon, {}) }), _jsx("div", { style: {
                            flex: 1, textAlign: 'center',
                            fontSize: 20, fontWeight: 600,
                            color: 'var(--color-text)', letterSpacing: -0.3,
                        }, children: isEdit ? 'Редактирование услуги' : 'Добавление услуги' }), _jsx("div", { style: { width: 56 } })] }), _jsxs("div", { style: onboardingPortalContentStyle, children: [_jsx("div", { style: onboardingFieldWrapStyle, children: _jsx("input", { value: name, onChange: (e) => onNameChange(e.target.value), placeholder: "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435. \u041F\u0440\u0438\u043C\u0435\u0440: \u0423\u043A\u043B\u0430\u0434\u043A\u0430 \u0432\u043E\u043B\u043E\u0441", autoFocus: true, style: onboardingFieldInputStyle }) }), _jsx("div", { style: { ...onboardingFieldWrapStyle, position: 'relative' }, children: _jsxs("div", { style: stepOneTextareaWrapStyle, children: [_jsx("textarea", { value: desc, onChange: (e) => onDescChange(e.target.value.slice(0, 200)), placeholder: "\u041E\u043F\u0438\u0441\u0430\u043D\u0438\u0435", rows: 3, style: stepOneTextareaStyle }), _jsxs("span", { style: stepOneCounterStyle, children: [desc.length, "/200"] })] }) }), _jsxs("div", { style: { display: 'flex', gap: '20%' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 6, width: '40%' }, children: [_jsx("div", { style: { ...onboardingFieldWithSuffixWrapStyle, flex: 1 }, children: _jsx("input", { value: durationMin, onChange: (e) => onDurationChange(e.target.value.replace(/\D/g, '')), placeholder: "\u0414\u043B\u0438\u0442.", inputMode: "numeric", style: onboardingFieldInputStyle }) }), _jsx("span", { style: { ...onboardingFieldSuffixStyle, flexShrink: 0, fontSize: 15 }, children: "\u043C\u0438\u043D" })] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 6, width: '40%' }, children: [_jsx("div", { style: { ...onboardingFieldWithSuffixWrapStyle, flex: 1 }, children: _jsx("input", { value: price, onChange: (e) => onPriceChange(e.target.value.replace(/[^\d.]/, '')), placeholder: "\u0426\u0435\u043D\u0430", inputMode: "decimal", style: onboardingFieldInputStyle }) }), _jsx("span", { style: { ...onboardingFieldSuffixStyle, flexShrink: 0, fontSize: 15 }, children: "\u20BD" })] })] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 12, padding: '4px 0' }, children: [_jsxs("label", { style: { position: 'relative', display: 'inline-block', width: 44, height: 26, flexShrink: 0 }, children: [_jsx("input", { type: "checkbox", checked: discountEnabled, onChange: (e) => onDiscountEnabledChange(e.target.checked), style: { opacity: 0, width: 0, height: 0, position: 'absolute' } }), _jsx("span", { style: {
                                            position: 'absolute', inset: 0, borderRadius: 13, cursor: 'pointer',
                                            background: discountEnabled ? 'var(--color-primary)' : 'var(--color-card2)',
                                            transition: 'background 0.2s',
                                        }, children: _jsx("span", { style: {
                                                position: 'absolute', top: 3, left: discountEnabled ? 21 : 3,
                                                width: 20, height: 20, borderRadius: '50%', background: '#fff',
                                                transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                                            } }) })] }), _jsx("span", { style: onboardingToggleLabelStyle, children: "\u0421\u043A\u0438\u0434\u043A\u0430" }), discountEnabled && (_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }, children: [discountedPriceNum !== null && (_jsxs("div", { style: onboardingPriceRowStyle, children: [_jsx("span", { style: { fontWeight: 600, color: 'var(--color-primary)', fontSize: 14 }, children: formatPrice(discountedPriceNum) }), _jsxs("span", { style: onboardingDiscountBadgeStyle, children: [discountPercent, "%"] })] })), _jsxs("div", { style: { ...onboardingSelectWrapStyle, width: 92 }, children: [_jsx("select", { value: discountPercent, onChange: (e) => onDiscountPercentChange(Number(e.target.value)), style: { ...onboardingSelectStyle, padding: '11px 36px 11px 12px' }, children: DISCOUNT_OPTIONS.map((p) => _jsx("option", { value: p, children: p }, p)) }), _jsx("span", { style: onboardingSelectChevronStyle, children: "\u2304" })] }), _jsx("span", { style: { fontSize: 15, color: 'var(--color-text-secondary)' }, children: "%" })] }))] }), _jsxs("div", { children: [_jsx("div", { style: { ...onboardingSectionLabelStyle, marginBottom: 8 }, children: "\u041F\u0420\u0418\u041C\u0415\u0420\u042B \u0420\u0410\u0411\u041E\u0422" }), _jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: [_jsx("button", { onClick: () => fileRef.current?.click(), disabled: uploading, style: {
                                            width: 72, height: 72, borderRadius: 10,
                                            background: 'var(--color-card2)', border: 'none',
                                            cursor: uploading ? 'default' : 'pointer',
                                            display: 'flex', flexDirection: 'column',
                                            alignItems: 'center', justifyContent: 'center',
                                            gap: 4, opacity: uploading ? 0.5 : 1,
                                        }, children: uploading
                                            ? _jsx(Spinner, { size: 24, appearance: "contrast" })
                                            : _jsx("img", { src: maskIconUrl, alt: "upload", style: serviceWorkPhotoAddIconStyle }) }), workPhotos.map((photo, i) => (_jsxs("div", { style: { position: 'relative', width: 72, height: 72 }, children: [_jsx("img", { src: photo.previewUrl, alt: "", style: { width: 72, height: 72, borderRadius: 10, objectFit: 'cover' } }), photo.uploading && _jsx(UploadingOverlay, {}), _jsx("button", { onClick: () => onWorkPhotosChange(workPhotos.filter((_, j) => j !== i)), style: {
                                                    position: 'absolute', top: -6, right: -6,
                                                    width: 20, height: 20, borderRadius: '50%',
                                                    background: 'var(--color-danger)', border: 'none',
                                                    color: '#fff', fontSize: 12, lineHeight: 1,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    cursor: 'pointer', padding: 0,
                                                }, children: "\u00D7" })] }, photo.id))), _jsx("input", { ref: fileRef, type: "file", accept: "image/*", multiple: true, hidden: true, onChange: async (e) => {
                                            const files = Array.from(e.target.files ?? []);
                                            if (!files.length)
                                                return;
                                            const queued = files.map((file, idx) => ({
                                                id: `work-photo-${Date.now()}-${idx}`,
                                                url: null,
                                                previewUrl: URL.createObjectURL(file),
                                                uploading: true,
                                            }));
                                            onWorkPhotosChange([...workPhotos, ...queued]);
                                            setUploading(true);
                                            try {
                                                const results = await Promise.allSettled(files.map((file) => uploadPhoto(file, 'work')));
                                                onWorkPhotosChange([...workPhotos, ...queued].flatMap((photo) => {
                                                    const idx = queued.findIndex((q) => q.id === photo.id);
                                                    if (idx === -1)
                                                        return [photo];
                                                    const result = results[idx];
                                                    if (!result || result.status === 'rejected')
                                                        return [];
                                                    return [{ ...photo, url: result.value, previewUrl: result.value, uploading: false }];
                                                }));
                                            }
                                            catch (err) {
                                                console.error('Ошибка загрузки фото работ:', err);
                                            }
                                            finally {
                                                setUploading(false);
                                                e.target.value = '';
                                            }
                                        } })] })] })] }), _jsx("div", { style: {
                    padding: '12px 16px',
                    paddingBottom: 'calc(12px + env(safe-area-inset-bottom))',
                    flexShrink: 0,
                }, children: _jsx("button", { type: "button", disabled: !canSave, onClick: onSave, style: {
                        ...primaryActionButtonBaseStyle,
                        cursor: canSave ? 'pointer' : 'default',
                        background: canSave ? 'var(--color-primary)' : 'var(--color-card2)',
                        color: canSave ? '#fff' : 'var(--color-text-secondary)',
                    }, children: "\u0413\u043E\u0442\u043E\u0432\u043E" }) })] }), document.body);
}
function BackArrowIcon() {
    return (_jsx("svg", { width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", children: _jsx("path", { d: "M15 18l-6-6 6-6", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }) }));
}
function UploadingOverlay() {
    return (_jsx("div", { style: {
            position: 'absolute', inset: 0, borderRadius: 'inherit',
            background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
        }, children: _jsx(Spinner, { size: 20, appearance: "contrast-static" }) }));
}
