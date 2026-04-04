import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useRef } from 'react';
import { createPortal } from 'react-dom';
import { Spinner } from '@maxhub/max-ui';
import { uploadPhoto } from '@/api/upload.api';
import uploadIconUrl from '@/assets/upload-icon.svg';
import { onboardingFieldInputStyle, onboardingFieldWrapStyle, onboardingPortalContentStyle, primaryActionButtonBaseStyle, stepOneCounterStyle, stepOneIntroTextStyle, stepOnePhotoButtonBaseStyle, stepOnePhotoContainerStyle, stepOnePhotoPlaceholderStyle, stepOnePhotoPreviewStyle, stepOneTextareaStyle, stepOneTextareaWrapStyle, } from '@/components/onboardingStepOne.styles';
export default function CategoryFormPortal({ visible, isEdit, name, onNameChange, desc, onDescChange, photoPreview, onPhotoPreview, onPhotoUrl, photoUploading, onPhotoUploading, onClose, onSave, }) {
    const fileRef = useRef(null);
    if (!visible)
        return null;
    const canSave = name.trim() && !photoUploading;
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
                        }, children: isEdit ? 'Редактирование категории' : 'Добавление категории' }), _jsx("div", { style: { width: 56 } })] }), _jsxs("div", { style: onboardingPortalContentStyle, children: [_jsx("div", { style: stepOneIntroTextStyle, children: "\u0414\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u0444\u043E\u0442\u043E \u043A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u0438, \u0447\u0442\u043E\u0431\u044B \u043A\u043B\u0438\u0435\u043D\u0442\u0430\u043C \u0431\u044B\u043B\u043E \u043F\u0440\u043E\u0449\u0435 \u0432\u044B\u0431\u0438\u0440\u0430\u0442\u044C \u0443\u0441\u043B\u0443\u0433\u0438" }), _jsxs("div", { style: stepOnePhotoContainerStyle, children: [_jsxs("button", { type: "button", onClick: () => fileRef.current?.click(), disabled: photoUploading, style: { ...stepOnePhotoButtonBaseStyle, cursor: photoUploading ? 'default' : 'pointer' }, children: [photoPreview
                                        ? _jsx("img", { src: photoPreview, alt: "\u0424\u043E\u0442\u043E \u043A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u0438", style: stepOnePhotoPreviewStyle })
                                        : _jsx("img", { src: uploadIconUrl, alt: "\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0444\u043E\u0442\u043E", style: stepOnePhotoPlaceholderStyle }), photoUploading && _jsx(UploadingOverlay, {})] }), _jsx("input", { ref: fileRef, type: "file", accept: "image/*", hidden: true, onChange: async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file)
                                        return;
                                    onPhotoPreview(URL.createObjectURL(file));
                                    onPhotoUploading(true);
                                    try {
                                        const url = await uploadPhoto(file, 'categories');
                                        onPhotoUrl(url);
                                        onPhotoPreview(url);
                                    }
                                    catch (err) {
                                        console.error('Ошибка загрузки фото категории:', err);
                                    }
                                    finally {
                                        onPhotoUploading(false);
                                        e.target.value = '';
                                    }
                                } })] }), _jsx("div", { style: onboardingFieldWrapStyle, children: _jsx("input", { value: name, onChange: (e) => onNameChange(e.target.value), placeholder: "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435", autoFocus: true, style: onboardingFieldInputStyle }) }), _jsx("div", { style: { ...onboardingFieldWrapStyle, position: 'relative' }, children: _jsxs("div", { style: stepOneTextareaWrapStyle, children: [_jsx("textarea", { value: desc, onChange: (e) => onDescChange(e.target.value.slice(0, 200)), placeholder: "\u041E\u043F\u0438\u0441\u0430\u043D\u0438\u0435", rows: 3, style: stepOneTextareaStyle }), _jsxs("span", { style: stepOneCounterStyle, children: [desc.length, "/200"] })] }) })] }), _jsx("div", { style: {
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
