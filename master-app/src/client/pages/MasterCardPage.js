import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { mastersApi } from '@client/api/masters.api';
import { useBookingStore } from '@client/store/booking.store';
import BottomNav from '@client/components/BottomNav';
function IcoBook() {
    return (_jsxs("svg", { width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", children: [_jsx("path", { d: "M8 2V5", stroke: "#007AFE", strokeWidth: "2", strokeMiterlimit: "10", strokeLinecap: "round", strokeLinejoin: "round" }), _jsx("path", { d: "M16 2V5", stroke: "#007AFE", strokeWidth: "2", strokeMiterlimit: "10", strokeLinecap: "round", strokeLinejoin: "round" }), _jsx("path", { d: "M3.5 9.09009H20.5", stroke: "#007AFE", strokeWidth: "2", strokeMiterlimit: "10", strokeLinecap: "round", strokeLinejoin: "round" }), _jsx("path", { d: "M21 8.5V17C21 20 19.5 22 16 22H8C4.5 22 3 20 3 17V8.5C3 5.5 4.5 3.5 8 3.5H16C19.5 3.5 21 5.5 21 8.5Z", stroke: "#007AFE", strokeWidth: "2", strokeMiterlimit: "10", strokeLinecap: "round", strokeLinejoin: "round" }), _jsx("path", { d: "M11.9955 13.7H12.0045", stroke: "#007AFE", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }), _jsx("path", { d: "M8.29431 13.7H8.30329", stroke: "#007AFE", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }), _jsx("path", { d: "M8.29431 16.7H8.30329", stroke: "#007AFE", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" })] }));
}
function IcoCall() {
    return (_jsx("svg", { width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", children: _jsx("path", { d: "M21.97 18.33C21.97 18.69 21.89 19.06 21.72 19.42C21.55 19.78 21.33 20.12 21.04 20.44C20.55 20.98 20.01 21.37 19.4 21.62C18.8 21.87 18.15 22 17.45 22C16.43 22 15.34 21.76 14.19 21.27C13.04 20.78 11.89 20.12 10.75 19.29C9.6 18.45 8.51 17.52 7.47 16.49C6.44 15.45 5.51 14.36 4.68 13.22C3.86 12.08 3.2 10.94 2.72 9.81C2.24 8.67 2 7.58 2 6.54C2 5.86 2.12 5.21 2.36 4.61C2.6 4 2.98 3.44 3.51 2.94C4.15 2.31 4.85 2 5.59 2C5.87 2 6.15 2.06 6.4 2.18C6.66 2.3 6.89 2.48 7.07 2.74L9.39 6.01C9.57 6.26 9.7 6.49 9.79 6.71C9.88 6.92 9.93 7.13 9.93 7.32C9.93 7.56 9.86 7.8 9.72 8.03C9.59 8.26 9.4 8.5 9.16 8.74L8.4 9.53C8.29 9.64 8.24 9.77 8.24 9.93C8.24 10.01 8.25 10.08 8.27 10.16C8.3 10.24 8.33 10.3 8.35 10.36C8.53 10.69 8.84 11.12 9.28 11.64C9.73 12.16 10.21 12.69 10.73 13.22C11.27 13.75 11.79 14.24 12.32 14.69C12.84 15.13 13.27 15.43 13.61 15.61C13.66 15.63 13.72 15.66 13.79 15.69C13.87 15.72 13.95 15.73 14.04 15.73C14.21 15.73 14.34 15.67 14.45 15.56L15.21 14.81C15.46 14.56 15.7 14.37 15.93 14.25C16.16 14.11 16.39 14.04 16.64 14.04C16.83 14.04 17.03 14.08 17.25 14.17C17.47 14.26 17.7 14.39 17.95 14.56L21.26 16.91C21.52 17.09 21.7 17.3 21.81 17.55C21.91 17.8 21.97 18.05 21.97 18.33Z", stroke: "#007AFE", strokeWidth: "2", strokeMiterlimit: "10" }) }));
}
function IcoChat() {
    return (_jsxs("svg", { width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", children: [_jsx("path", { d: "M8.5 19H8C4 19 2 18 2 13V8C2 4 4 2 8 2H16C20 2 22 4 22 8V13C22 17 20 19 16 19H15.5C15.19 19 14.89 19.15 14.7 19.4L13.2 21.4C12.54 22.28 11.46 22.28 10.8 21.4L9.3 19.4C9.14 19.18 8.77 19 8.5 19Z", stroke: "#007AFE", strokeWidth: "2", strokeMiterlimit: "10", strokeLinecap: "round", strokeLinejoin: "round" }), _jsx("path", { d: "M7 8H17", stroke: "#007AFE", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }), _jsx("path", { d: "M7 13H13", stroke: "#007AFE", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" })] }));
}
function IcoDirections() {
    return (_jsxs("svg", { width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", children: [_jsx("path", { fillRule: "evenodd", clipRule: "evenodd", d: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z", fill: "#007AFE", fillOpacity: "0.4" }), _jsx("path", { fillRule: "evenodd", clipRule: "evenodd", d: "M12 6.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z", fill: "#007AFE" })] }));
}
const TABS = ['services', 'photo', 'reviews'];
const TAB_LABELS = {
    services: 'Услуги',
    photo: 'Фото',
    reviews: 'Отзывы',
};
export default function MasterCardPage() {
    const [params] = useSearchParams();
    // start_param из Max WebApp содержит UUID мастера (передаётся при открытии через deeplink)
    const masterId = window.WebApp?.initDataUnsafe?.start_param ?? params.get('masterId') ?? '';
    const navigate = useNavigate();
    const { setMasterId } = useBookingStore();
    const [master, setMaster] = useState(null);
    const [tab, setTab] = useState('services');
    useEffect(() => {
        if (masterId)
            mastersApi.getById(masterId).then(setMaster).catch(() => { });
    }, [masterId]);
    const handleBook = () => {
        setMasterId(masterId);
        navigate('/book/services');
    };
    if (!masterId)
        return (_jsx("div", { style: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100dvh' }, children: _jsx("span", { style: { color: 'var(--color-text-secondary)' }, children: "\u041E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0435 \u0447\u0435\u0440\u0435\u0437 \u0431\u043E\u0442\u0430" }) }));
    if (!master)
        return (_jsx("div", { style: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100dvh' }, children: _jsx("span", { style: { color: 'var(--color-text-secondary)' }, children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430..." }) }));
    const workPhotos = master.categories.flatMap((c) => c.services.flatMap((s) => s.workPhotos ?? []));
    const tabBadge = (t) => {
        if (t === 'photo')
            return workPhotos.length;
        if (t === 'reviews')
            return master.reviews.length;
        return 0;
    };
    return (_jsxs("div", { style: { minHeight: '100dvh', background: 'var(--color-bg)', paddingBottom: 95 }, children: [_jsxs("div", { style: {
                    position: 'sticky', top: 0, zIndex: 10,
                    background: 'var(--color-bg)',
                    paddingTop: 48, paddingBottom: 12,
                    paddingInline: 0,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }, children: [_jsx("button", { onClick: () => navigate(-1), style: { width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none' }, children: _jsx("svg", { width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", children: _jsx("path", { d: "M9.57 5.93L3.5 12l6.07 6.07M20.5 12H3.67", stroke: "#D3D4D6", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" }) }) }), master.rating > 0 && (_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 6, marginRight: 16 }, children: [_jsx("span", { style: { fontSize: 20, fontWeight: 600, color: '#D3D4D6' }, children: master.rating.toFixed(1) }), _jsx("div", { style: { display: 'flex', gap: 2 }, children: Array.from({ length: 5 }).map((_, i) => (_jsx("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: i < Math.round(master.rating) ? '#FF9500' : '#3A3A3C', children: _jsx("path", { d: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" }) }, i))) })] }))] }), _jsxs("div", { style: { padding: '0 16px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }, children: [_jsx("div", { style: {
                            width: 110, height: 110, borderRadius: '50%',
                            background: 'var(--color-card)', overflow: 'hidden',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }, children: master.photo
                            ? _jsx("img", { src: master.photo, alt: "", style: { width: '100%', height: '100%', objectFit: 'cover' } })
                            : _jsx("span", { style: { fontSize: 44, color: 'var(--color-text-secondary)' }, children: "\uD83D\uDC64" }) }), _jsxs("div", { style: { textAlign: 'center' }, children: [_jsx("div", { style: { fontSize: 28, fontWeight: 600, color: '#D3D4D6', lineHeight: 1.2 }, children: master.name }), master.description && (_jsx("div", { style: { fontSize: 15, fontWeight: 400, color: '#7D7D7F', marginTop: 4 }, children: master.description }))] })] }), _jsx("div", { style: { display: 'flex', gap: 8, padding: '0 16px 16px' }, children: [
                    { label: 'Запись', Icon: IcoBook, action: handleBook },
                    { label: 'Звонок', Icon: IcoCall, action: () => { } },
                    { label: 'Чат', Icon: IcoChat, action: () => navigate('/messages') },
                    { label: 'Как добраться', Icon: IcoDirections, action: () => { } },
                ].map((btn) => (_jsxs("button", { onClick: btn.action, style: {
                        flex: 1, height: 69,
                        background: '#25262B', borderRadius: 18,
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', gap: 6,
                    }, children: [_jsx(btn.Icon, {}), _jsx("span", { style: { fontSize: 14, fontWeight: 400, color: '#007AFE' }, children: btn.label })] }, btn.label))) }), _jsx("div", { style: {
                    display: 'flex',
                    borderBottom: '1px solid var(--color-border)',
                    overflowX: 'auto', scrollbarWidth: 'none',
                    paddingLeft: 16,
                }, children: TABS.map((key, idx) => {
                    const active = tab === key;
                    const badge = tabBadge(key);
                    return (_jsxs("button", { onClick: () => setTab(key), style: {
                            flexShrink: 0,
                            paddingTop: 10, paddingBottom: 14,
                            paddingLeft: idx === 0 ? 0 : 20, paddingRight: 20,
                            background: 'none',
                            fontSize: 17, fontWeight: 500,
                            color: active ? '#007AFE' : '#7D7D7F',
                            borderBottom: active ? '2px solid #007AFE' : '2px solid transparent',
                            display: 'flex', alignItems: 'center', gap: 6,
                            whiteSpace: 'nowrap',
                        }, children: [TAB_LABELS[key], badge > 0 && (_jsx("span", { style: {
                                    background: active ? '#007AFE' : '#45475B',
                                    color: active ? '#fff' : '#7D7D7F',
                                    borderRadius: 20, fontSize: 13, fontWeight: 400,
                                    padding: '1px 7px', minWidth: 23, textAlign: 'center',
                                }, children: badge }))] }, key));
                }) }), _jsxs("div", { style: { padding: '12px 16px 0' }, children: [tab === 'services' && (_jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 8 }, children: master.categories.map((cat) => {
                            const hasDiscount = cat.services.some((s) => s.discountPercent);
                            return (_jsxs("button", { onClick: () => {
                                    setMasterId(masterId);
                                    navigate('/book/services', { state: { categoryId: cat.id } });
                                }, style: {
                                    background: 'rgba(37,38,43,0.6)', borderRadius: 20,
                                    height: 78, padding: '0 16px',
                                    display: 'flex', alignItems: 'center', gap: 12,
                                    width: '100%', textAlign: 'left',
                                }, children: [_jsx("div", { style: {
                                            width: 46, height: 46, borderRadius: '50%', flexShrink: 0,
                                            background: 'var(--color-border)', overflow: 'hidden',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }, children: cat.photo
                                            ? _jsx("img", { src: cat.photo, alt: "", style: { width: '100%', height: '100%', objectFit: 'cover' } })
                                            : _jsx("span", { style: { fontSize: 20 }, children: "\u2702\uFE0F" }) }), _jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx("span", { style: { fontSize: 17, fontWeight: 500, color: '#D3D4D6' }, children: cat.name }), hasDiscount && (_jsx("span", { style: { background: '#CE4259', color: '#fff', borderRadius: 6, fontSize: 11, fontWeight: 700, padding: '2px 6px' }, children: "\u0421\u043A\u0438\u0434\u043A\u0430" }))] }), _jsxs("div", { style: { fontSize: 14, color: '#7D7D7F', marginTop: 2 }, children: [cat.services.slice(0, 2).map((s) => s.name).join(', '), cat.services.length > 2 ? '...' : ''] })] }), _jsx("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", style: { flexShrink: 0 }, children: _jsx("path", { d: "M8.91 19.92l6.52-6.52c.77-.77.77-2.03 0-2.8L8.91 4.08", stroke: "#7D7D7F", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" }) })] }, cat.id));
                        }) })), tab === 'photo' && (workPhotos.length === 0 ? (_jsx("div", { style: { textAlign: 'center', color: 'var(--color-text-secondary)', marginTop: 40 }, children: "\u041D\u0435\u0442 \u0444\u043E\u0442\u043E\u0433\u0440\u0430\u0444\u0438\u0439" })) : (_jsx("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3, margin: '0 -16px' }, children: workPhotos.map((p) => (_jsx("div", { style: { aspectRatio: '134/170', overflow: 'hidden' }, children: _jsx("img", { src: p.url, alt: "", style: { width: '100%', height: '100%', objectFit: 'cover' } }) }, p.id))) }))), tab === 'reviews' && (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 10 }, children: [master.reviews.length === 0 && (_jsx("div", { style: { textAlign: 'center', color: 'var(--color-text-secondary)', marginTop: 32 }, children: "\u041F\u043E\u043A\u0430 \u043D\u0435\u0442 \u043E\u0442\u0437\u044B\u0432\u043E\u0432" })), master.reviews.map((r) => (_jsxs("div", { style: { background: '#25262B', borderRadius: 20, padding: 16 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }, children: [_jsx("div", { style: {
                                                    width: 44, height: 44, borderRadius: '50%',
                                                    background: 'var(--color-border)', overflow: 'hidden',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                                }, children: r.client.photo
                                                    ? _jsx("img", { src: r.client.photo, alt: "", style: { width: '100%', height: '100%', objectFit: 'cover' } })
                                                    : _jsx("span", { style: { fontSize: 20 }, children: "\uD83D\uDC64" }) }), _jsxs("div", { children: [_jsx("div", { style: { fontSize: 15, fontWeight: 500, color: '#D3D4D6' }, children: r.client.name }), _jsx("div", { style: { display: 'flex', gap: 2, marginTop: 2 }, children: Array.from({ length: 5 }).map((_, i) => (_jsx("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: i < r.rating ? '#FF9500' : '#3A3A3C', children: _jsx("path", { d: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" }) }, i))) })] })] }), r.text && (_jsx("p", { style: { fontSize: 15, color: '#7D7D7F', lineHeight: 1.5, margin: 0 }, children: r.text }))] }, r.id)))] }))] }), _jsx(BottomNav, {})] }));
}
