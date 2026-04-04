import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { mastersApi } from '@client/api/masters.api';
import { useBookingStore } from '@client/store/booking.store';
import { discountedPrice } from '@client/types';
import PageHeader from '@client/components/PageHeader';
export default function ServiceSelectPage() {
    const navigate = useNavigate();
    const { masterId, setService } = useBookingStore();
    const [master, setMaster] = useState(null);
    useEffect(() => {
        if (masterId)
            mastersApi.getById(masterId).then(setMaster).catch(() => navigate('/'));
    }, [masterId, navigate]);
    const handleSelect = (service) => {
        setService(service);
        navigate('/book/calendar');
    };
    return (_jsxs("div", { style: { minHeight: '100dvh', background: 'var(--color-bg)' }, children: [_jsx(PageHeader, { title: "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0443\u0441\u043B\u0443\u0433\u0443" }), _jsx("div", { style: { padding: '8px 16px 32px', display: 'flex', flexDirection: 'column', gap: 8 }, children: master?.categories.map((cat) => (_jsxs("div", { children: [cat.name && (_jsx("div", { style: {
                                fontSize: 13, fontWeight: 600,
                                color: 'var(--color-text-secondary)',
                                marginBottom: 8, marginTop: 8,
                                textTransform: 'uppercase', letterSpacing: 0.5,
                            }, children: cat.name })), _jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 8 }, children: cat.services.map((s) => {
                                const discounted = discountedPrice(s.price, s.discountPercent);
                                const displayPrice = discounted ?? s.price;
                                return (_jsxs("button", { onClick: () => handleSelect(s), style: {
                                        background: 'var(--color-card)',
                                        borderRadius: 'var(--radius)',
                                        padding: '14px 16px',
                                        display: 'flex', alignItems: 'center',
                                        gap: 12, textAlign: 'left',
                                        width: '100%',
                                    }, children: [s.photo && (_jsx("img", { src: s.photo, alt: "", style: {
                                                width: 56, height: 56, borderRadius: 12,
                                                objectFit: 'cover', flexShrink: 0,
                                            } })), _jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }, children: [_jsx("span", { style: { fontWeight: 500, fontSize: 17, color: 'var(--color-text)' }, children: s.name }), s.discountPercent && (_jsxs("span", { style: {
                                                                background: 'var(--color-danger)', color: '#fff',
                                                                borderRadius: 6, fontSize: 10, fontWeight: 700,
                                                                padding: '2px 6px', flexShrink: 0,
                                                            }, children: ["-", s.discountPercent, "%"] }))] }), s.description && (_jsx("div", { style: {
                                                        color: 'var(--color-text-secondary)', fontSize: 13, marginTop: 3,
                                                        overflow: 'hidden', display: '-webkit-box',
                                                        WebkitLineClamp: 1, WebkitBoxOrient: 'vertical',
                                                    }, children: s.description })), _jsxs("div", { style: {
                                                        display: 'flex', alignItems: 'center',
                                                        justifyContent: 'space-between', marginTop: 4,
                                                    }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsxs("span", { style: { fontSize: 17, fontWeight: 400, color: 'var(--color-text)' }, children: [(displayPrice / 100).toLocaleString('ru-RU'), " \u20BD"] }), s.discountPercent && (_jsxs("span", { style: {
                                                                        fontSize: 13, color: 'var(--color-text-secondary)',
                                                                        textDecoration: 'line-through',
                                                                    }, children: [(s.price / 100).toLocaleString('ru-RU'), " \u20BD"] }))] }), _jsxs("span", { style: { color: 'var(--color-text-secondary)', fontSize: 13 }, children: [s.duration, " \u043C\u0438\u043D"] })] })] }), _jsx("svg", { width: "9", height: "16", viewBox: "0 0 9 16", fill: "none", style: { flexShrink: 0 }, children: _jsx("path", { d: "M1 1l7 7-7 7", stroke: "#7D7D7F", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" }) })] }, s.id));
                            }) })] }, cat.id))) })] }));
}
