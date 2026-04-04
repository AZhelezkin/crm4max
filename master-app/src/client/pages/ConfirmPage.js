import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import { mastersApi } from '@client/api/masters.api';
import { bookingsApi } from '@client/api/bookings.api';
import { useBookingStore } from '@client/store/booking.store';
import { discountedPrice } from '@client/types';
dayjs.locale('ru');
export default function ConfirmPage() {
    const navigate = useNavigate();
    const { masterId, service, date, time, remind } = useBookingStore();
    const [master, setMaster] = useState(null);
    const [loading, setLoading] = useState(false);
    useEffect(() => {
        if (masterId)
            mastersApi.getById(masterId).then(setMaster).catch(() => { });
    }, [masterId]);
    const handleConfirm = async () => {
        if (!service)
            return;
        setLoading(true);
        try {
            await bookingsApi.create({ masterId, serviceId: service.id, date, time });
            navigate('/book/success');
        }
        finally {
            setLoading(false);
        }
    };
    if (!service)
        return null;
    const price = discountedPrice(service.price, service.discountPercent) ?? service.price;
    const formattedDate = dayjs(date).format('D MMMM, dddd');
    return (_jsxs("div", { style: { minHeight: '100dvh', background: '#000', display: 'flex', flexDirection: 'column' }, children: [_jsxs("div", { style: {
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '16px 16px 12px', position: 'sticky', top: 0, zIndex: 10, background: '#000',
                }, children: [_jsx("button", { onClick: () => navigate(-1), style: { background: 'none', color: '#2688EB', fontSize: 22 }, children: "\u2190" }), _jsxs("div", { style: { textAlign: 'center' }, children: [_jsx("div", { style: { fontWeight: 600, fontSize: 17 }, children: "\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u0435" }), _jsx("div", { style: { color: '#8E8E93', fontSize: 13 }, children: service.name })] }), _jsx("button", { onClick: () => navigate('/'), style: {
                            background: '#2C2C2E', borderRadius: 8, width: 30, height: 30,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#8E8E93', fontSize: 16,
                        }, children: "\u2715" })] }), _jsxs("div", { style: { flex: 1, padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 10 }, children: [master && (_jsx("div", { style: { background: '#1C1C1E', borderRadius: 14, padding: 14 }, children: _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 12 }, children: [_jsx("div", { style: {
                                        width: 44, height: 44, borderRadius: '50%', overflow: 'hidden',
                                        background: '#2C2C2E', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 22, flexShrink: 0,
                                    }, children: master.photo
                                        ? _jsx("img", { src: master.photo, alt: "", style: { width: '100%', height: '100%', objectFit: 'cover' } })
                                        : '👤' }), _jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsx("div", { style: { fontWeight: 600, fontSize: 15 }, children: master.name }), master.description && (_jsx("div", { style: {
                                                color: '#8E8E93', fontSize: 13, marginTop: 1,
                                                overflow: 'hidden', display: '-webkit-box',
                                                WebkitLineClamp: 1, WebkitBoxOrient: 'vertical',
                                            }, children: master.description }))] }), master.rating > 0 && (_jsxs("div", { style: { color: '#FF9500', fontWeight: 600, fontSize: 14, flexShrink: 0 }, children: ["\u2605 ", master.rating.toFixed(1)] }))] }) })), _jsxs("div", { style: { background: '#1C1C1E', borderRadius: 14, padding: 14 }, children: [_jsx("div", { style: { fontWeight: 600, fontSize: 15, marginBottom: 4 }, children: service.name }), service.description && (_jsx("div", { style: { color: '#8E8E93', fontSize: 14, lineHeight: 1.5, marginBottom: 8 }, children: service.description })), _jsxs("div", { style: { display: 'flex', alignItems: 'baseline', gap: 8 }, children: [_jsxs("span", { style: { fontWeight: 600, fontSize: 16 }, children: [(price / 100).toLocaleString('ru-RU'), " \u20BD"] }), service.discountPercent && (_jsxs("span", { style: { color: '#8E8E93', fontSize: 13, textDecoration: 'line-through' }, children: [(service.price / 100).toLocaleString('ru-RU'), " \u20BD"] }))] })] }), _jsxs("div", { style: {
                            background: '#1C1C1E', borderRadius: 14, padding: '14px 16px',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        }, children: [_jsxs("div", { children: [_jsx("div", { style: { fontWeight: 600 }, children: formattedDate }), _jsx("div", { style: { color: '#8E8E93', fontSize: 13 }, children: "\u0414\u0430\u0442\u0430" })] }), _jsx("button", { onClick: () => navigate('/book/calendar'), style: { background: 'none' }, children: _jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", children: [_jsx("path", { d: "M12 20h9", stroke: "#8E8E93", strokeWidth: "2", strokeLinecap: "round" }), _jsx("path", { d: "M16.5 3.5l4 4L7 21H3v-4L16.5 3.5z", stroke: "#8E8E93", strokeWidth: "2", strokeLinejoin: "round" })] }) })] }), _jsxs("div", { style: {
                            background: '#1C1C1E', borderRadius: 14, padding: '14px 16px',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        }, children: [_jsxs("div", { children: [_jsx("div", { style: { fontWeight: 600 }, children: time }), _jsx("div", { style: { color: '#8E8E93', fontSize: 13 }, children: remind ? 'Напомним за 1 час' : 'Без напоминания' })] }), _jsx("button", { onClick: () => navigate('/book/calendar'), style: { background: 'none' }, children: _jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", children: [_jsx("path", { d: "M12 20h9", stroke: "#8E8E93", strokeWidth: "2", strokeLinecap: "round" }), _jsx("path", { d: "M16.5 3.5l4 4L7 21H3v-4L16.5 3.5z", stroke: "#8E8E93", strokeWidth: "2", strokeLinejoin: "round" })] }) })] })] }), _jsx("div", { style: { padding: '12px 16px 32px' }, children: _jsxs("button", { onClick: handleConfirm, disabled: loading, style: {
                        width: '100%', padding: 16, borderRadius: 14,
                        background: loading ? '#1C1C1E' : '#2688EB',
                        color: loading ? '#8E8E93' : '#fff',
                        fontWeight: 600, fontSize: 16,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    }, children: ["\uD83D\uDCC5 ", loading ? 'Записываем...' : 'Записаться'] }) })] }));
}
