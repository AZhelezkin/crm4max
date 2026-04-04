import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { Button as MaxButton } from '@maxhub/max-ui';
import { categoriesApi, servicesApi } from '@/api/services.api';
import { formatPrice, formatDuration, discountedPrice } from '@/types';
import CategoryFormPortal from '@/components/CategoryFormPortal';
import ServiceFormPortal from '@/components/ServiceFormPortal';
import { getFirstUploadedWorkPhotoUrl } from '@/lib/workPhotos';
import { onboardingDiscountBadgeStyle, onboardingListActionButtonStyle, onboardingListButtonStyle, onboardingListCardStyle, onboardingListMediaStyle, onboardingListSubtitleStyle, onboardingListTitleStyle, onboardingPriceRowStyle, } from '@/components/onboardingStepOne.styles';
const CategoriesServicesEditor = forwardRef(({ onSubStepChange, onCategoryCountChange }, ref) => {
    const [categories, setCategories] = useState([]);
    const [subStep, setSubStep] = useState('categories');
    const [selectedCatId, setSelectedCatId] = useState(null);
    // Форма категории
    const [showCatForm, setShowCatForm] = useState(false);
    const [editCatId, setEditCatId] = useState(null);
    const [catName, setCatName] = useState('');
    const [catDesc, setCatDesc] = useState('');
    const [catPhotoPreview, setCatPhotoPreview] = useState(null);
    const [catPhotoUrl, setCatPhotoUrl] = useState(null);
    const [catPhotoUploading, setCatPhotoUploading] = useState(false);
    // Форма услуги
    const [showSvcForm, setShowSvcForm] = useState(false);
    const [editService, setEditService] = useState(null);
    const [svcCategoryId, setSvcCategoryId] = useState('');
    const [svcName, setSvcName] = useState('');
    const [svcDesc, setSvcDesc] = useState('');
    const [svcPrice, setSvcPrice] = useState('');
    const [svcDuration, setSvcDuration] = useState('');
    const [svcDiscountEnabled, setSvcDiscountEnabled] = useState(false);
    const [svcDiscountPercent, setSvcDiscountPercent] = useState(10);
    const [svcWorkPhotos, setSvcWorkPhotos] = useState([]);
    const load = () => categoriesApi.list().then((cats) => {
        setCategories(cats);
        onCategoryCountChange?.(cats.length);
    }).catch(() => { });
    useEffect(() => { load(); }, []);
    const changeSubStep = (ss, catName) => {
        setSubStep(ss);
        onSubStepChange?.(ss, catName);
    };
    useImperativeHandle(ref, () => ({
        subStep,
        selectedCatName: categories.find((c) => c.id === selectedCatId)?.name ?? '',
        categoryCount: categories.length,
        goToCategories: () => changeSubStep('categories'),
    }), [subStep, categories, selectedCatId]);
    // ─── Категория ────────────────────────────────────────────────────────────
    const openCatForm = (cat) => {
        if (cat) {
            setEditCatId(cat.id);
            setCatName(cat.name);
            setCatDesc(cat.description ?? '');
            setCatPhotoPreview(cat.photo);
            setCatPhotoUrl(cat.photo);
        }
        else {
            setEditCatId(null);
            setCatName('');
            setCatDesc('');
            setCatPhotoPreview(null);
            setCatPhotoUrl(null);
        }
        setShowCatForm(true);
    };
    const saveCatForm = async () => {
        if (!catName.trim())
            return;
        const data = { name: catName.trim(), description: catDesc || undefined, photo: catPhotoUrl || undefined };
        if (editCatId)
            await categoriesApi.update(editCatId, data);
        else
            await categoriesApi.create(data);
        setShowCatForm(false);
        load();
    };
    const handleDeleteCategory = async (id) => {
        await categoriesApi.remove(id);
        if (id === selectedCatId)
            changeSubStep('categories');
        load();
    };
    // ─── Услуга ───────────────────────────────────────────────────────────────
    const openSvcForm = (service, defaultCatId) => {
        if (service) {
            setEditService(service);
            setSvcName(service.name);
            setSvcDesc(service.description ?? '');
            setSvcPrice(String(service.price / 100));
            setSvcDuration(String(service.duration));
            setSvcCategoryId(service.categoryId ?? '');
            setSvcDiscountEnabled(!!service.discountPercent);
            setSvcDiscountPercent(service.discountPercent ?? 10);
            setSvcWorkPhotos((service.workPhotos ?? []).map((p) => ({
                id: p.id, url: p.url, previewUrl: p.url, uploading: false,
            })));
        }
        else {
            setEditService(null);
            setSvcName('');
            setSvcDesc('');
            setSvcPrice('');
            setSvcDuration('');
            setSvcCategoryId(defaultCatId ?? categories[0]?.id ?? '');
            setSvcDiscountEnabled(false);
            setSvcDiscountPercent(10);
            setSvcWorkPhotos([]);
        }
        setShowSvcForm(true);
    };
    const saveSvcForm = async () => {
        if (!svcName.trim())
            return;
        const firstPhotoUrl = getFirstUploadedWorkPhotoUrl(svcWorkPhotos);
        const data = {
            name: svcName.trim(),
            description: svcDesc || undefined,
            price: Math.round(Number(svcPrice) * 100) || 0,
            duration: Number(svcDuration) || 30,
            categoryId: svcCategoryId || undefined,
            discountPercent: svcDiscountEnabled ? svcDiscountPercent : undefined,
            photo: firstPhotoUrl || undefined,
        };
        if (editService) {
            await servicesApi.update(editService.id, data);
            const origIds = new Set((editService.workPhotos ?? []).map((p) => p.id));
            const currentIds = new Set(svcWorkPhotos.map((p) => p.id));
            for (const id of origIds) {
                if (!currentIds.has(id))
                    await servicesApi.removeWorkPhoto(id);
            }
            const newPhotos = svcWorkPhotos.filter((p) => !origIds.has(p.id) && p.url);
            for (let i = 0; i < newPhotos.length; i++) {
                await servicesApi.addWorkPhoto(editService.id, newPhotos[i].url, i);
            }
        }
        else {
            const created = await servicesApi.create(data);
            const uploaded = svcWorkPhotos.filter((p) => !p.uploading && p.url);
            for (let i = 0; i < uploaded.length; i++) {
                await servicesApi.addWorkPhoto(created.id, uploaded[i].url, i);
            }
        }
        setShowSvcForm(false);
        load();
    };
    const handleDeleteService = async (id) => {
        await servicesApi.remove(id);
        load();
    };
    const selectedCat = categories.find((c) => c.id === selectedCatId) ?? null;
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }, children: [_jsxs("div", { style: { flex: 1, overflowY: 'auto', padding: '8px 16px 8px', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'stretch' }, children: [subStep === 'categories' && (_jsxs(_Fragment, { children: [categories.map((cat) => (_jsx("div", { onClick: () => { setSelectedCatId(cat.id); changeSubStep('services', cat.name); }, style: { ...onboardingListCardStyle, cursor: 'pointer' }, children: _jsxs("div", { style: onboardingListButtonStyle, children: [_jsx("div", { style: onboardingListMediaStyle, children: cat.photo
                                                ? _jsx("img", { src: cat.photo, alt: "", style: { width: '100%', height: '100%', objectFit: 'cover' } })
                                                : _jsx("span", { style: { fontSize: 22 }, children: "\u2702\uFE0F" }) }), _jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsxs("div", { style: { ...onboardingListTitleStyle, display: 'flex', alignItems: 'center', gap: 6 }, children: [cat.name, cat.services.some((s) => s.discountPercent) && (_jsx("span", { style: onboardingDiscountBadgeStyle, children: "% \u0441\u043A\u0438\u0434\u043A\u0438" }))] }), _jsx("div", { style: onboardingListSubtitleStyle, children: cat.services.length === 0
                                                        ? 'Нет услуг'
                                                        : `${cat.services.length} ${cat.services.length === 1 ? 'услуга' : cat.services.length < 5 ? 'услуги' : 'услуг'}` })] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }, children: [_jsx("button", { onClick: (e) => { e.stopPropagation(); openCatForm(cat); }, style: onboardingListActionButtonStyle, children: _jsx(EditIcon, {}) }), _jsx("button", { onClick: (e) => { e.stopPropagation(); void handleDeleteCategory(cat.id); }, style: { ...onboardingListActionButtonStyle, color: 'var(--color-text-secondary)', fontSize: 20, lineHeight: 1 }, children: "\u00D7" })] })] }) }, cat.id))), _jsx(MaxButton, { appearance: "themed", mode: "secondary", size: "medium", stretched: true, onClick: () => openCatForm(), children: "+ \u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u043A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u044E" })] })), subStep === 'services' && selectedCat && (_jsxs(_Fragment, { children: [selectedCat.services.map((s) => {
                                const dPrice = discountedPrice(s.price, s.discountPercent);
                                return (_jsx("div", { onClick: () => openSvcForm(s), style: { ...onboardingListCardStyle, cursor: 'pointer' }, children: _jsxs("div", { style: onboardingListButtonStyle, children: [_jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsx("div", { style: onboardingListTitleStyle, children: s.name }), _jsx("div", { style: onboardingListSubtitleStyle, children: formatDuration(s.duration) }), _jsx("div", { style: onboardingPriceRowStyle, children: dPrice !== null ? (_jsxs(_Fragment, { children: [_jsx("span", { style: { fontWeight: 600, color: 'var(--color-primary)', fontSize: 14 }, children: formatPrice(dPrice) }), _jsx("span", { style: { fontSize: 13, color: 'var(--color-text-secondary)', textDecoration: 'line-through' }, children: formatPrice(s.price) }), _jsxs("span", { style: onboardingDiscountBadgeStyle, children: [s.discountPercent, "% \u0421\u041A\u0418\u0414\u041A\u0410"] })] })) : (_jsx("span", { style: { fontWeight: 600, fontSize: 14 }, children: formatPrice(s.price) })) })] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }, children: [_jsx("button", { type: "button", onClick: (e) => { e.stopPropagation(); openSvcForm(s); }, style: onboardingListActionButtonStyle, children: _jsx(EditIcon, {}) }), _jsx("button", { type: "button", onClick: (e) => { e.stopPropagation(); void handleDeleteService(s.id); }, style: { ...onboardingListActionButtonStyle, color: 'var(--color-text-secondary)', fontSize: 20, lineHeight: 1 }, children: "\u00D7" })] })] }) }, s.id));
                            }), _jsx(MaxButton, { appearance: "themed", mode: "secondary", size: "medium", stretched: true, onClick: () => openSvcForm(undefined, selectedCat.id), children: "+ \u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0443\u0441\u043B\u0443\u0433\u0443" })] }))] }), _jsx(CategoryFormPortal, { visible: showCatForm, isEdit: !!editCatId, name: catName, onNameChange: setCatName, desc: catDesc, onDescChange: setCatDesc, photoPreview: catPhotoPreview, onPhotoPreview: setCatPhotoPreview, onPhotoUrl: setCatPhotoUrl, photoUploading: catPhotoUploading, onPhotoUploading: setCatPhotoUploading, onClose: () => setShowCatForm(false), onSave: () => { void saveCatForm(); } }), _jsx(ServiceFormPortal, { visible: showSvcForm, isEdit: !!editService, name: svcName, onNameChange: setSvcName, desc: svcDesc, onDescChange: setSvcDesc, duration: svcDuration, onDurationChange: setSvcDuration, price: svcPrice, onPriceChange: setSvcPrice, discountEnabled: svcDiscountEnabled, onDiscountEnabledChange: setSvcDiscountEnabled, discountPercent: svcDiscountPercent, onDiscountPercentChange: setSvcDiscountPercent, workPhotos: svcWorkPhotos, onWorkPhotosChange: setSvcWorkPhotos, onClose: () => setShowSvcForm(false), onSave: () => { void saveSvcForm(); } })] }));
});
CategoriesServicesEditor.displayName = 'CategoriesServicesEditor';
export default CategoriesServicesEditor;
// ─── Иконки ──────────────────────────────────────────────────────────────────
function EditIcon() {
    return (_jsxs("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", children: [_jsx("path", { d: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7", stroke: "#8E8E93", strokeWidth: "1.8", strokeLinecap: "round" }), _jsx("path", { d: "M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z", stroke: "#8E8E93", strokeWidth: "1.8", strokeLinecap: "round" })] }));
}
