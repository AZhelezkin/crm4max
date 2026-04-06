import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { CellList, CellInput, Spinner } from '@maxhub/max-ui';
import { useAuthStore } from '@/store/auth.store';
import { mastersApi } from '@/api/masters.api';
import { uploadPhoto } from '@/api/upload.api';
import AddressSuggestInput from '@/components/AddressSuggestInput';
import uploadIconUrl from '@/assets/upload-icon.svg';
import locationAddImg from '@/assets/location-add.png';
import { onboardingPortalContentStyle, primaryActionButtonBaseStyle, stepOneIntroTextStyle, stepOnePhotoContainerStyle, stepOnePhotoButtonBaseStyle, stepOnePhotoPreviewStyle, stepOnePhotoPlaceholderStyle, stepOneTextareaWrapStyle, stepOneTextareaStyle, stepOneCounterStyle, stepOneAddressButtonStyle, stepOneAddressContentStyle, stepOneAddressTitleStyle, stepOneAddressHintStyle, } from '@/components/onboardingStepOne.styles';
function BackArrowIcon() {
    return (_jsx("svg", { width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", children: _jsx("path", { d: "M15 19l-7-7 7-7", stroke: "var(--color-primary)", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }) }));
}
function ChevronIcon() {
    return (_jsx("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", children: _jsx("path", { d: "M9 18l6-6-6-6", stroke: "#8E8E93", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" }) }));
}
function UploadingOverlay() {
    return (_jsx("div", { style: {
            position: 'absolute', inset: 0, borderRadius: 'inherit',
            background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }, children: _jsx(Spinner, { size: 20, appearance: "contrast-static" }) }));
}
export default function AboutMePage() {
    const navigate = useNavigate();
    const { master, setMaster } = useAuthStore();
    const [name, setName] = useState(master?.name ?? '');
    const [contacts] = useState(master?.contacts ?? '');
    const [phone, setPhone] = useState(master?.phone ?? '');
    const [phoneError, setPhoneError] = useState(null);
    const [description, setDescription] = useState(master?.description ?? '');
    const [location, setLocation] = useState(master?.location ?? '');
    const [coords, setCoords] = useState(null);
    const [saving, setSaving] = useState(false);
    const [photoPreview, setPhotoPreview] = useState(master?.photo ?? null);
    const [photoUrl, setPhotoUrl] = useState(master?.photo ?? null);
    const [photoUploading, setPhotoUploading] = useState(false);
    const photoInputRef = useRef(null);
    const [showAddressPortal, setShowAddressPortal] = useState(false);
    const [addressDraft, setAddressDraft] = useState(location);
    const formatPhone = (raw) => {
        const digits = raw.replace(/\D/g, '');
        const d = digits.startsWith('8') ? '7' + digits.slice(1) : digits;
        const n = d.startsWith('7') ? d : d ? '7' + d : '';
        if (!n)
            return '';
        let result = '+7';
        if (n.length > 1)
            result += ' (' + n.slice(1, 4);
        if (n.length >= 4)
            result += ') ' + n.slice(4, 7);
        if (n.length >= 7)
            result += '-' + n.slice(7, 9);
        if (n.length >= 9)
            result += '-' + n.slice(9, 11);
        return result;
    };
    const isValidPhone = (val) => val.replace(/\D/g, '').length === 11;
    const handlePhoneChange = (rawInput) => {
        setPhoneError(null);
        let digits = rawInput.replace(/\D/g, '');
        if (digits.startsWith('8'))
            digits = '7' + digits.slice(1);
        digits = digits.slice(0, 11);
        const prevDigits = phone.replace(/\D/g, '');
        if (digits === prevDigits && rawInput.length < phone.length) {
            digits = prevDigits.slice(0, -1);
        }
        setPhone(digits ? formatPhone(digits) : '');
    };
    const handlePhotoChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        setPhotoPreview(URL.createObjectURL(file));
        setPhotoUploading(true);
        try {
            const url = await uploadPhoto(file, 'masters');
            setPhotoUrl(url);
        }
        catch (err) {
            console.error('Ошибка загрузки фото:', err);
        }
        finally {
            setPhotoUploading(false);
        }
    };
    const handleSave = async () => {
        if (phone && !isValidPhone(phone)) {
            setPhoneError('Введите номер полностью: +7 (XXX) XXX-XX-XX');
            return;
        }
        setSaving(true);
        try {
            const updated = await mastersApi.updateProfile({
                name,
                contacts,
                phone: phone || undefined,
                description,
                location,
                ...(coords ? { lat: coords.lat, lng: coords.lng } : {}),
                ...(photoUrl ? { photo: photoUrl } : {}),
            });
            setMaster({ ...master, ...updated });
            navigate(-1);
        }
        finally {
            setSaving(false);
        }
    };
    return (_jsxs("div", { style: { minHeight: '100dvh', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', padding: '14px 4px 0' }, children: [_jsx("button", { onClick: () => navigate(-1), style: { width: 56, display: 'flex', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }, children: _jsx(BackArrowIcon, {}) }), _jsx("div", { style: { flex: 1, textAlign: 'center', fontSize: 20, fontWeight: 600, color: 'var(--color-text)', letterSpacing: -0.3 }, children: "\u041E\u0431\u043E \u043C\u043D\u0435" }), _jsx("div", { style: { width: 56 } })] }), _jsxs("div", { style: onboardingPortalContentStyle, children: [_jsx("div", { style: stepOneIntroTextStyle, children: "\u0414\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u0444\u043E\u0442\u043E, \u0447\u0442\u043E\u0431\u044B \u0432\u0430\u0441 \u0443\u0437\u043D\u0430\u0432\u0430\u043B\u0438 \u0441 \u043F\u0435\u0440\u0432\u043E\u0433\u043E \u0432\u0437\u0433\u043B\u044F\u0434\u0430" }), _jsxs("div", { style: stepOnePhotoContainerStyle, children: [_jsxs("button", { type: "button", onClick: () => photoInputRef.current?.click(), disabled: photoUploading, style: { ...stepOnePhotoButtonBaseStyle, cursor: photoUploading ? 'default' : 'pointer' }, children: [photoPreview
                                        ? _jsx("img", { src: photoPreview, alt: "\u0424\u043E\u0442\u043E \u043F\u0440\u043E\u0444\u0438\u043B\u044F", style: stepOnePhotoPreviewStyle })
                                        : _jsx("img", { src: uploadIconUrl, alt: "\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0444\u043E\u0442\u043E", style: stepOnePhotoPlaceholderStyle }), photoUploading && _jsx(UploadingOverlay, {})] }), _jsx("input", { ref: photoInputRef, type: "file", accept: "image/*", hidden: true, onChange: handlePhotoChange })] }), _jsx(CellList, { mode: "island", children: _jsx(CellInput, { value: name, onChange: (e) => setName(e.target.value), placeholder: "\u0418\u043C\u044F \u0438\u043B\u0438 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u0431\u0438\u0437\u043D\u0435\u0441\u0430" }) }), _jsxs("div", { children: [_jsx(CellList, { mode: "island", children: _jsx(CellInput, { value: phone, onChange: (e) => handlePhoneChange(e.target.value), placeholder: "\u0422\u0435\u043B\u0435\u0444\u043E\u043D", inputMode: "tel" }) }), phoneError && (_jsx("div", { style: { fontSize: 13, color: 'var(--color-error, #FF3B30)', padding: '4px 16px 0' }, children: phoneError }))] }), _jsx(CellList, { mode: "island", children: _jsxs("div", { style: stepOneTextareaWrapStyle, children: [_jsx("textarea", { value: description, onChange: (e) => setDescription(e.target.value.slice(0, 200)), placeholder: "\u041E\u043F\u0438\u0441\u0430\u043D\u0438\u0435", rows: 3, style: stepOneTextareaStyle }), _jsxs("span", { style: stepOneCounterStyle, children: [description.length, "/200"] })] }) }), _jsx(CellList, { mode: "island", children: _jsxs("button", { onClick: () => { setAddressDraft(location); setShowAddressPortal(true); }, style: stepOneAddressButtonStyle, children: [_jsx("img", { src: locationAddImg, alt: "location", style: { width: 24, height: 24, flexShrink: 0 } }), _jsxs("div", { style: stepOneAddressContentStyle, children: [_jsx("div", { style: stepOneAddressTitleStyle, children: "\u0410\u0434\u0440\u0435\u0441" }), _jsx("div", { style: stepOneAddressHintStyle, children: location || 'Куда приезжать клиентам' })] }), _jsx(ChevronIcon, {})] }) })] }), _jsx("div", { style: { padding: '16px 20px', paddingBottom: 'calc(16px + env(safe-area-inset-bottom))', marginTop: 'auto' }, children: _jsx("button", { type: "button", onClick: handleSave, disabled: saving, style: {
                        ...primaryActionButtonBaseStyle,
                        cursor: saving ? 'default' : 'pointer',
                        background: 'var(--color-primary)',
                        color: '#fff',
                        opacity: saving ? 0.7 : 1,
                    }, children: saving ? 'Сохраняем...' : 'Сохранить' }) }), showAddressPortal && createPortal(_jsxs("div", { style: { position: 'fixed', inset: 0, background: 'var(--color-bg)', zIndex: 200, display: 'flex', flexDirection: 'column' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', padding: '14px 20px', flexShrink: 0 }, children: [_jsx("button", { onClick: () => setShowAddressPortal(false), style: { width: 56, display: 'flex', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }, children: _jsx(BackArrowIcon, {}) }), _jsx("span", { style: {
                                    position: 'absolute', left: '50%', transform: 'translateX(-50%)',
                                    fontSize: 16, fontWeight: 600, color: 'var(--color-text)', pointerEvents: 'none',
                                }, children: "\u0414\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u0430\u0434\u0440\u0435\u0441\u0430" })] }), _jsx("div", { style: { flex: 1, minHeight: 0 }, children: _jsx(AddressSuggestInput, { value: addressDraft, onChange: setAddressDraft, onGeocode: (lat, lng) => setCoords({ lat, lng }), confirmedAddress: location }) }), _jsx("div", { style: { padding: '16px 20px', paddingBottom: 'calc(16px + env(safe-area-inset-bottom))', marginTop: 'auto' }, children: _jsx("button", { type: "button", onClick: () => { setLocation(addressDraft.trim()); setShowAddressPortal(false); }, style: { ...primaryActionButtonBaseStyle, cursor: 'pointer', background: 'var(--color-primary)', color: '#fff' }, children: "\u0413\u043E\u0442\u043E\u0432\u043E" }) })] }), document.body)] }));
}
