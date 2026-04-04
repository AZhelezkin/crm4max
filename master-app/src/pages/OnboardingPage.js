import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { isAxiosError } from 'axios';
import CategoriesServicesEditor from '@/components/CategoriesServicesEditor';
import { Button as MaxButton, CellList, CellInput, Spinner, } from '@maxhub/max-ui';
import uploadIconUrl from '@/assets/upload-icon.svg';
import locationAddImg from '@/assets/location-add.png';
import { mastersApi } from '@/api/masters.api';
import { scheduleApi } from '@/api/schedule.api';
import { uploadPhoto } from '@/api/upload.api';
import { useAuthStore } from '@/store/auth.store';
import AddressSuggestInput from '@/components/AddressSuggestInput';
import { onboardingPortalContentStyle, onboardingSectionCardStyle, onboardingSectionLabelStyle, onboardingSelectChevronStyle, onboardingSelectStyle, onboardingSelectWrapStyle, onboardingTimeSelectStyle, onboardingTimeSelectWrapStyle, stepOneAddressButtonStyle, stepOneAddressContentStyle, stepOneAddressHintStyle, stepOneAddressTitleStyle, primaryActionButtonBaseStyle, stepOneCounterStyle, stepOneIntroTextStyle, stepOnePhotoButtonBaseStyle, stepOnePhotoContainerStyle, stepOnePhotoPlaceholderStyle, stepOnePhotoPreviewStyle, stepOneTextareaStyle, stepOneTextareaWrapStyle, } from '@/components/onboardingStepOne.styles';
const STEPS = ['Обо мне', 'График', 'Услуги'];
const DAYS = [
    { v: 1, l: 'ПН' }, { v: 2, l: 'ВТ' }, { v: 3, l: 'СР' },
    { v: 4, l: 'ЧТ' }, { v: 5, l: 'ПТ' }, { v: 6, l: 'СБ' }, { v: 7, l: 'ВС' },
];
const BUFFER_OPTIONS = [0, 10, 15, 20, 30, 45, 60];
const DISCOUNT_OPTIONS = [5, 10, 15, 20, 25, 30, 40, 50];
const ONBOARDING_MISSING_LABELS = {
    profile: 'заполнить профиль',
    schedule: 'настроить график',
    categories: 'добавить хотя бы одну категорию',
    services: 'добавить хотя бы одну услугу',
};
// ─── Компонент ────────────────────────────────────────────────────────────────
export default function OnboardingPage() {
    const navigate = useNavigate();
    const { setMaster } = useAuthStore();
    const [step, setStep] = useState(0);
    const [saving, setSaving] = useState(false);
    const [submitError, setSubmitError] = useState(null);
    // ── Шаг 0: Обо мне ──
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState('');
    const [addressDraft, setAddressDraft] = useState('');
    const [showAddressPortal, setShowAddressPortal] = useState(false);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [photoUrl, setPhotoUrl] = useState(null); // S3 URL аватара
    const [photoUploading, setPhotoUploading] = useState(false);
    const photoInputRef = useRef(null);
    // ── Шаг 1: График ──
    const [workingDays, setWorkingDays] = useState([1, 2, 3, 4, 5]);
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('18:00');
    const [buffer, setBuffer] = useState(30);
    // ── Шаг 2: Услуги ──
    const [servicesSubStep, setServicesSubStep] = useState('categories');
    const [servicesSelectedCatName, setServicesSelectedCatName] = useState('');
    const [catCount, setCatCount] = useState(0);
    const editorRef = useRef(null);
    // ─── Хелперы ──────────────────────────────────────────────────────────────
    const toggleDay = (d) => setWorkingDays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort());
    // Показывает локальный превью мгновенно, параллельно загружает в S3.
    // onUploaded(s3url) вызывается после успешной загрузки.
    const handlePhotoChange = async (e, setPreview, setUploading, onUploaded, folder = 'masters') => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        // Мгновенный превью
        setPreview(URL.createObjectURL(file));
        // Загрузка в S3
        setUploading(true);
        try {
            const url = await uploadPhoto(file, folder);
            onUploaded(url);
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error('Ошибка загрузки фото:', msg);
            setSubmitError(`Не удалось загрузить фото: ${msg}`);
        }
        finally {
            setUploading(false);
        }
    };
    // ─── Навигация по шагам ───────────────────────────────────────────────────
    const formatOnboardingError = (missing) => {
        if (!Array.isArray(missing) || missing.length === 0) {
            return 'Не удалось завершить онбординг. Проверьте заполнение всех шагов.';
        }
        const labels = missing
            .filter((item) => typeof item === 'string')
            .map((item) => ONBOARDING_MISSING_LABELS[item] ?? item);
        if (labels.length === 0) {
            return 'Не удалось завершить онбординг. Проверьте заполнение всех шагов.';
        }
        return `Чтобы завершить онбординг, нужно ${labels.join(', ')}.`;
    };
    const handleNext = async () => {
        setSubmitError(null);
        setSaving(true);
        try {
            if (step === 0) {
                if (!name.trim()) {
                    setSaving(false);
                    return;
                }
                await mastersApi.updateProfile({
                    name: name.trim(),
                    description,
                    location,
                    contacts: undefined,
                    photo: photoUrl ?? undefined,
                    isOnboarded: false,
                });
                setStep(1);
                return;
            }
            if (step === 1) {
                await scheduleApi.upsert({ workingDays, startTime, endTime, bufferMinutes: buffer });
                setStep(2);
                return;
            }
            if (step === 2) {
                if (servicesSubStep === 'services') {
                    editorRef.current?.goToCategories();
                    setServicesSubStep('categories');
                    setSaving(false);
                    return;
                }
                // servicesSubStep === 'categories' — категории/услуги уже в БД, завершаем онбординг
                await mastersApi.updateProfile({ isOnboarded: true });
                const master = await mastersApi.getMe();
                setMaster(master);
                navigate('/', { replace: true });
                return;
            }
        }
        catch (err) {
            const response = isAxiosError(err) ? err.response : undefined;
            if (response?.status === 400
                && response.data?.error === 'Onboarding is incomplete') {
                setSubmitError(formatOnboardingError(response.data.missing));
                return;
            }
            setSubmitError('Сохранение не удалось. Попробуйте еще раз.');
        }
        finally {
            setSaving(false);
        }
    };
    // ─── Рендер ───────────────────────────────────────────────────────────────
    return (_jsxs("div", { style: { minHeight: '100dvh', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column' }, children: [true && (_jsxs(_Fragment, { children: [step === 0 && (_jsxs("div", { style: { display: 'flex', alignItems: 'center', padding: '14px 4px 0' }, children: [_jsx("div", { style: { width: 56, display: 'flex', justifyContent: 'center' } }), _jsx("div", { style: { flex: 1, textAlign: 'center', fontSize: 20, fontWeight: 600, color: 'var(--color-text)', letterSpacing: -0.3 }, children: "\u041A\u0430\u043A\u0438\u043C \u0431\u0443\u0434\u0435\u0442 \u0442\u0432\u043E\u0439 \u0431\u0438\u0437\u043D\u0435\u0441?" }), _jsx("div", { style: { width: 56 } })] })), step === 1 && (_jsxs("div", { style: { display: 'flex', alignItems: 'center', padding: '14px 4px 0' }, children: [_jsx("button", { onClick: () => setStep(0), style: { width: 56, display: 'flex', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', padding: 0 }, children: _jsx(BackArrowIcon, {}) }), _jsx("div", { style: { flex: 1, textAlign: 'center', fontSize: 20, fontWeight: 600, color: 'var(--color-text)', letterSpacing: -0.3 }, children: "\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u0442\u0435 \u0433\u0440\u0430\u0444\u0438\u043A \u0440\u0430\u0431\u043E\u0442\u044B" }), _jsx("div", { style: { width: 56 } })] })), step === 2 && (_jsxs("div", { style: { display: 'flex', alignItems: 'center', padding: '14px 4px 0' }, children: [_jsx("button", { onClick: () => {
                                    if (servicesSubStep === 'services') {
                                        editorRef.current?.goToCategories();
                                        setServicesSubStep('categories');
                                    }
                                    else {
                                        setStep(1);
                                    }
                                }, style: { width: 56, display: 'flex', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', padding: 0 }, children: _jsx(BackArrowIcon, {}) }), _jsx("div", { style: { flex: 1, textAlign: 'center', fontSize: 20, fontWeight: 600, color: 'var(--color-text)', letterSpacing: -0.3 }, children: servicesSubStep === 'services' ? (servicesSelectedCatName || 'Услуги') : 'Категории услуг' }), _jsx("div", { style: { width: 56 } })] }))] })), _jsxs("div", { style: { ...onboardingPortalContentStyle, ...(step === 2 ? { display: 'none' } : {}) }, children: [step === 0 && (_jsxs(_Fragment, { children: [_jsx("div", { style: stepOneIntroTextStyle, children: "\u0414\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u0444\u043E\u0442\u043E, \u0447\u0442\u043E\u0431\u044B \u0432\u0430\u0441 \u0443\u0437\u043D\u0430\u0432\u0430\u043B\u0438 \u0441 \u043F\u0435\u0440\u0432\u043E\u0433\u043E \u0432\u0437\u0433\u043B\u044F\u0434\u0430" }), _jsxs("div", { style: stepOnePhotoContainerStyle, children: [_jsxs("button", { type: "button", onClick: () => photoInputRef.current?.click(), disabled: photoUploading, style: {
                                            ...stepOnePhotoButtonBaseStyle,
                                            cursor: photoUploading ? 'default' : 'pointer',
                                        }, children: [photoPreview
                                                ? (_jsx("img", { src: photoPreview, alt: "\u0424\u043E\u0442\u043E \u043F\u0440\u043E\u0444\u0438\u043B\u044F", style: stepOnePhotoPreviewStyle }))
                                                : _jsx("img", { src: uploadIconUrl, alt: "\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0444\u043E\u0442\u043E", style: stepOnePhotoPlaceholderStyle }), photoUploading && _jsx(UploadingOverlay, {})] }), _jsx("input", { ref: photoInputRef, type: "file", accept: "image/*", hidden: true, onChange: (e) => handlePhotoChange(e, setPhotoPreview, setPhotoUploading, (url) => setPhotoUrl(url), 'masters') })] }), _jsx(CellList, { mode: "island", children: _jsx(CellInput, { value: name, onChange: (e) => setName(e.target.value), placeholder: "\u0418\u043C\u044F \u0438\u043B\u0438 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u0431\u0438\u0437\u043D\u0435\u0441\u0430" }) }), _jsx(CellList, { mode: "island", children: _jsxs("div", { style: stepOneTextareaWrapStyle, children: [_jsx("textarea", { value: description, onChange: (e) => setDescription(e.target.value.slice(0, 200)), placeholder: "\u041E\u043F\u0438\u0441\u0430\u043D\u0438\u0435", rows: 3, style: stepOneTextareaStyle }), _jsxs("span", { style: stepOneCounterStyle, children: [description.length, "/200"] })] }) }), _jsx(CellList, { mode: "island", children: _jsxs("button", { onClick: () => {
                                        setAddressDraft(location);
                                        setShowAddressPortal(true);
                                    }, style: stepOneAddressButtonStyle, children: [_jsx("img", { src: locationAddImg, alt: "location", style: { width: 24, height: 24, flexShrink: 0 } }), _jsxs("div", { style: stepOneAddressContentStyle, children: [_jsx("div", { style: stepOneAddressTitleStyle, children: "\u0410\u0434\u0440\u0435\u0441" }), _jsx("div", { style: stepOneAddressHintStyle, children: location || 'Куда приезжать клиентам' })] }), _jsx(ChevronIcon, {})] }) })] })), step === 1 && (_jsxs(_Fragment, { children: [_jsx("div", { style: stepOneIntroTextStyle, children: "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0434\u043D\u0438 \u0438 \u0432\u0440\u0435\u043C\u044F, \u043A\u043E\u0433\u0434\u0430 \u0432\u0430\u043C \u0443\u0434\u043E\u0431\u043D\u043E \u043F\u0440\u0438\u043D\u0438\u043C\u0430\u0442\u044C \u043A\u043B\u0438\u0435\u043D\u0442\u043E\u0432" }), _jsxs("div", { style: onboardingSectionCardStyle, children: [_jsx("div", { style: onboardingSectionLabelStyle, children: "\u0414\u041D\u0418 \u041D\u0415\u0414\u0415\u041B\u0418" }), _jsx("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 8 }, children: DAYS.map((d) => (_jsx("button", { onClick: () => toggleDay(d.v), style: {
                                                border: 'none',
                                                borderRadius: 12,
                                                height: 36,
                                                fontSize: 13,
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                background: workingDays.includes(d.v) ? 'var(--color-primary)' : 'var(--color-card2)',
                                                color: workingDays.includes(d.v) ? '#fff' : 'var(--color-text)',
                                            }, children: d.l }, d.v))) })] }), _jsxs("div", { style: onboardingSectionCardStyle, children: [_jsx("div", { style: onboardingSectionLabelStyle, children: "\u0412\u0420\u0415\u041C\u042F \u0420\u0410\u0411\u041E\u0422\u042B" }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 10 }, children: [_jsx(TimeSelect, { value: startTime, onChange: setStartTime }), _jsx("span", { style: { color: 'var(--color-text-secondary)', fontWeight: 600 }, children: "\u2014" }), _jsx(TimeSelect, { value: endTime, onChange: setEndTime })] })] }), _jsxs("div", { style: onboardingSectionCardStyle, children: [_jsx("div", { style: onboardingSectionLabelStyle, children: "\u041F\u0415\u0420\u0415\u0420\u042B\u0412 \u041C\u0415\u0416\u0414\u0423 \u041F\u0420\u0418\u0415\u041C\u0410\u041C\u0418" }), _jsx(SelectField, { value: buffer, onChange: (v) => setBuffer(Number(v)), options: BUFFER_OPTIONS.map((m) => ({ value: m, label: m === 0 ? 'Без перерыва' : `${m} мин` })) })] })] }))] }), step === 2 && (_jsx(CategoriesServicesEditor, { ref: editorRef, onSubStepChange: (ss, catName) => {
                    setServicesSubStep(ss);
                    if (catName)
                        setServicesSelectedCatName(catName);
                }, onCategoryCountChange: setCatCount })), _jsxs("div", { style: { padding: '12px 16px', paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }, children: [submitError && (_jsx("div", { style: {
                            marginBottom: 12,
                            padding: '12px 14px',
                            borderRadius: 14,
                            background: 'rgba(209, 50, 50, 0.12)',
                            color: '#9f1d1d',
                            fontSize: 14,
                            lineHeight: 1.4,
                        }, children: submitError })), _jsx("button", { type: "button", disabled: saving || photoUploading || (step === 0 && !name.trim()), onClick: () => { void handleNext(); }, style: {
                            ...primaryActionButtonBaseStyle,
                            cursor: saving || photoUploading || (step === 0 && !name.trim()) ? 'default' : 'pointer',
                            background: saving || photoUploading || (step === 0 && !name.trim())
                                ? 'var(--color-card2)'
                                : 'var(--color-primary)',
                            color: saving || photoUploading || (step === 0 && !name.trim())
                                ? 'var(--color-text-secondary)'
                                : '#fff',
                        }, children: saving ? 'Сохраняем...' :
                            step === 2 && servicesSubStep === 'services' ? '← Назад к категориям' :
                                step === 2 && servicesSubStep === 'categories' && catCount === 0 ? 'Пропустить' :
                                    step === 2 && servicesSubStep === 'categories' ? 'Готово' :
                                        'Далее' })] }), showAddressPortal && createPortal(_jsxs("div", { style: {
                    position: 'fixed', inset: 0, background: 'var(--color-bg)', zIndex: 200,
                    display: 'flex', flexDirection: 'column',
                }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', padding: '14px 20px', flexShrink: 0 }, children: [_jsx(MaxButton, { appearance: "themed", mode: "tertiary", size: "medium", onClick: () => setShowAddressPortal(false), children: "\u2190 \u041D\u0430\u0437\u0430\u0434" }), _jsx("span", { style: {
                                    position: 'absolute', left: '50%', transform: 'translateX(-50%)',
                                    fontSize: 16, fontWeight: 600, color: 'var(--color-text)', pointerEvents: 'none',
                                }, children: "\u0414\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u0430\u0434\u0440\u0435\u0441\u0430" })] }), _jsx("div", { style: { flex: 1, minHeight: 0 }, children: _jsx(AddressSuggestInput, { value: addressDraft, onChange: setAddressDraft, confirmedAddress: location }) }), _jsx("div", { style: { padding: '16px 20px', paddingBottom: 'calc(16px + env(safe-area-inset-bottom))', marginTop: 'auto' }, children: _jsx("button", { type: "button", onClick: () => {
                                setLocation(addressDraft.trim());
                                setShowAddressPortal(false);
                            }, style: {
                                ...primaryActionButtonBaseStyle,
                                cursor: 'pointer',
                                background: 'var(--color-primary)',
                                color: '#fff',
                            }, children: "\u0413\u043E\u0442\u043E\u0432\u043E" }) })] }), document.body)] }));
}
// ─── Вспомогательные компоненты ───────────────────────────────────────────────
function SectionLabel({ children }) {
    return (_jsx("div", { style: { ...onboardingSectionLabelStyle, marginTop: 4, marginBottom: 0 }, children: children }));
}
function SelectField({ value, onChange, options }) {
    return (_jsxs("div", { style: onboardingSelectWrapStyle, children: [_jsx("select", { value: value, onChange: (e) => onChange(e.target.value), style: onboardingSelectStyle, children: options.map((o) => _jsx("option", { value: o.value, children: o.label }, o.value)) }), _jsx("span", { style: onboardingSelectChevronStyle, children: "\u2304" })] }));
}
function TimeSelect({ value, onChange }) {
    const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
    const [h, m] = value.split(':');
    return (_jsxs("div", { style: onboardingTimeSelectWrapStyle, children: [_jsx("select", { value: h, onChange: (e) => onChange(`${e.target.value}:${m}`), style: onboardingTimeSelectStyle, children: hours.map((hh) => _jsx("option", { value: hh, children: hh }, hh)) }), _jsx("span", { style: { color: 'var(--color-text-secondary)' }, children: ":" }), _jsx("select", { value: m, onChange: (e) => onChange(`${h}:${e.target.value}`), style: onboardingTimeSelectStyle, children: ['00', '15', '30', '45'].map((mm) => _jsx("option", { value: mm, children: mm }, mm)) })] }));
}
function BottomSheet({ title, children, onClose }) {
    return (_jsx("div", { style: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'flex-end' }, onClick: onClose, children: _jsxs("div", { style: { background: 'var(--color-bg)', borderRadius: '16px 16px 0 0', width: '100%', padding: 16, maxHeight: '90dvh', overflowY: 'auto' }, onClick: (e) => e.stopPropagation(), children: [_jsx("div", { style: { width: 36, height: 4, borderRadius: 2, background: 'var(--color-card2)', margin: '0 auto 16px' } }), _jsx("h2", { style: { fontSize: 17, fontWeight: 700, marginBottom: 16 }, children: title }), children] }) }));
}
function CameraIcon({ size = 28 }) {
    return (_jsxs("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", children: [_jsx("path", { d: "M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z", stroke: "#8E8E93", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", fill: "none" }), _jsx("circle", { cx: "12", cy: "13", r: "4", stroke: "#8E8E93", strokeWidth: "1.5", fill: "none" }), _jsx("path", { d: "M12 11v1", stroke: "#8E8E93", strokeWidth: "1.5", strokeLinecap: "round" })] }));
}
function EditIcon() {
    return (_jsxs("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", children: [_jsx("path", { d: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7", stroke: "#8E8E93", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round" }), _jsx("path", { d: "M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z", stroke: "#8E8E93", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round" })] }));
}
function UploadingOverlay() {
    return (_jsx("div", { style: {
            position: 'absolute', inset: 0, borderRadius: 'inherit',
            background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
        }, children: _jsx(Spinner, { size: 20, appearance: "contrast-static" }) }));
}
function LocationIcon() {
    return (_jsxs("svg", { width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", children: [_jsx("path", { d: "M12 13.43a3.12 3.12 0 1 0 0-6.24 3.12 3.12 0 0 0 0 6.24z", stroke: "#8E8E93", strokeWidth: "1.5" }), _jsx("path", { d: "M3.62 8.49c1.97-8.66 14.8-8.65 16.76.01 1.15 5.08-2.01 9.38-4.78 12.04a5.193 5.193 0 0 1-7.21 0c-2.76-2.66-5.92-6.97-4.77-12.05z", stroke: "#8E8E93", strokeWidth: "1.5" }), _jsx("path", { d: "M12 7.5v2M11 8.5h2", stroke: "#8E8E93", strokeWidth: "1.5", strokeLinecap: "round" })] }));
}
function ChevronIcon() {
    return (_jsx("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", children: _jsx("path", { d: "M9 18l6-6-6-6", stroke: "#8E8E93", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" }) }));
}
function BackArrowIcon() {
    return (_jsx("svg", { width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", children: _jsx("path", { d: "M15 19l-7-7 7-7", stroke: "var(--color-primary)", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }) }));
}
