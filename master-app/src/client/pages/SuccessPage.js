import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import { mastersApi } from '@client/api/masters.api';
import { useBookingStore } from '@client/store/booking.store';
dayjs.locale('ru');
export default function SuccessPage() {
    const navigate = useNavigate();
    const { masterId, service, date, time, remind, reset } = useBookingStore();
    const [master, setMaster] = useState(null);
    useEffect(() => {
        if (masterId)
            mastersApi.getById(masterId).then(setMaster).catch(() => { });
    }, [masterId]);
    const handleClose = () => {
        reset();
        navigate('/');
    };
    const handleMyBookings = () => {
        reset();
        navigate('/my-bookings');
    };
    const formattedDate = dayjs(date).format('D MMMM, dddd');
    return (_jsxs("div", { style: { minHeight: '100dvh', background: '#000', display: 'flex', flexDirection: 'column' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 12px' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 12 }, children: [_jsx("div", { style: {
                                    width: 36, height: 36, borderRadius: '50%', background: '#1E3A1E', flexShrink: 0,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }, children: _jsx("svg", { width: "20", height: "20", viewBox: "0 0 20 20", fill: "none", children: _jsx("path", { d: "M4 10l4 4 8-8", stroke: "#34C759", strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round" }) }) }), _jsxs("div", { children: [_jsx("div", { style: { fontWeight: 700, fontSize: 16 }, children: "\u0412\u044B \u0437\u0430\u043F\u0438\u0441\u0430\u043D\u044B!" }), _jsx("div", { style: { color: '#8E8E93', fontSize: 13 }, children: "\u041D\u0435 \u043E\u043F\u0430\u0437\u0434\u044B\u0432\u0430\u0439\u0442\u0435 \uD83D\uDE0F" })] })] }), _jsx("button", { onClick: handleClose, style: { background: 'none', color: '#8E8E93', fontSize: 18 }, children: "\u2715" })] }), _jsxs("div", { style: { flex: 1, padding: '4px 16px', display: 'flex', flexDirection: 'column', gap: 10 }, children: [master && (_jsx("div", { style: { background: '#1C1C1E', borderRadius: 14, padding: 14 }, children: _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 12 }, children: [_jsx("div", { style: {
                                        width: 44, height: 44, borderRadius: '50%', overflow: 'hidden',
                                        background: '#2C2C2E', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 22, flexShrink: 0,
                                    }, children: master.photo
                                        ? _jsx("img", { src: master.photo, alt: "", style: { width: '100%', height: '100%', objectFit: 'cover' } })
                                        : '👤' }), _jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsx("div", { style: { fontWeight: 600, fontSize: 15 }, children: master.name }), master.description && (_jsx("div", { style: {
                                                color: '#8E8E93', fontSize: 13, marginTop: 1,
                                                overflow: 'hidden', display: '-webkit-box',
                                                WebkitLineClamp: 1, WebkitBoxOrient: 'vertical',
                                            }, children: master.description }))] }), master.rating > 0 && (_jsxs("div", { style: { color: '#FF9500', fontWeight: 600, fontSize: 14, flexShrink: 0 }, children: ["\u2605 ", master.rating.toFixed(1)] }))] }) })), service && (_jsxs("div", { style: { background: '#1C1C1E', borderRadius: 14, padding: 14 }, children: [_jsx("div", { style: { fontWeight: 600, fontSize: 15, marginBottom: 4 }, children: service.name }), service.description && (_jsx("div", { style: { color: '#8E8E93', fontSize: 14, lineHeight: 1.5, marginBottom: 8 }, children: service.description })), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 10 }, children: [_jsxs("span", { style: { fontWeight: 600 }, children: [(service.price / 100).toLocaleString('ru-RU'), " \u20BD"] }), _jsx("span", { style: {
                                            background: '#3A0A0A', color: '#FF3B30',
                                            borderRadius: 6, fontSize: 11, fontWeight: 700, padding: '2px 8px',
                                        }, children: "\u041D\u0415 \u041E\u041F\u041B\u0410\u0427\u0415\u041D\u041E" })] })] })), _jsxs("div", { style: { background: '#1C1C1E', borderRadius: 14, padding: '14px 16px' }, children: [_jsx("div", { style: { fontWeight: 600 }, children: formattedDate }), _jsx("div", { style: { color: '#8E8E93', fontSize: 13 }, children: "\u0414\u0430\u0442\u0430" })] }), _jsxs("div", { style: { background: '#1C1C1E', borderRadius: 14, padding: '14px 16px' }, children: [_jsx("div", { style: { fontWeight: 600 }, children: time }), _jsx("div", { style: { color: '#8E8E93', fontSize: 13 }, children: remind ? 'Напомним за 1 час' : 'Без напоминания' })] })] }), _jsxs("div", { style: { padding: '8px 16px 32px' }, children: [_jsxs("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }, children: [_jsx("button", { onClick: () => navigate('/'), style: { background: '#1C1C1E', borderRadius: 14, padding: '14px 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsxs("svg", { width: "22", height: "22", viewBox: "0 0 24 24", fill: "none", children: [_jsx("rect", { x: "3", y: "4", width: "18", height: "17", rx: "3", stroke: "#2688EB", strokeWidth: "2" }), _jsx("path", { d: "M3 9h18", stroke: "#2688EB", strokeWidth: "2" }), _jsx("path", { d: "M8 2v4M16 2v4", stroke: "#2688EB", strokeWidth: "2", strokeLinecap: "round" })] }) }), _jsx("button", { style: { background: '#1C1C1E', borderRadius: 14, padding: '14px 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsxs("svg", { width: "22", height: "22", viewBox: "0 0 24 24", fill: "none", children: [_jsx("path", { d: "M12 20h9", stroke: "#2688EB", strokeWidth: "2", strokeLinecap: "round" }), _jsx("path", { d: "M16.5 3.5l4 4L7 21H3v-4L16.5 3.5z", stroke: "#2688EB", strokeWidth: "2", strokeLinejoin: "round" })] }) }), _jsx("button", { onClick: () => navigate('/messages'), style: { background: '#1C1C1E', borderRadius: 14, padding: '14px 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsx("svg", { width: "22", height: "22", viewBox: "0 0 24 24", fill: "none", children: _jsx("path", { d: "M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H7l-4 4V6a2 2 0 0 1 2-2z", stroke: "#2688EB", strokeWidth: "2", fill: "none", strokeLinejoin: "round" }) }) }), _jsx("button", { onClick: handleClose, style: { background: '#1C1C1E', borderRadius: 14, padding: '14px 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsxs("svg", { width: "22", height: "22", viewBox: "0 0 24 24", fill: "none", children: [_jsx("circle", { cx: "12", cy: "12", r: "9", stroke: "#FF3B30", strokeWidth: "2" }), _jsx("path", { d: "M9 9l6 6M15 9l-6 6", stroke: "#FF3B30", strokeWidth: "2", strokeLinecap: "round" })] }) })] }), _jsxs("button", { onClick: handleMyBookings, style: {
                            width: '100%', padding: 16, borderRadius: 14,
                            background: '#2688EB', color: '#fff', fontWeight: 600, fontSize: 16,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        }, children: [_jsxs("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", children: [_jsx("rect", { x: "2", y: "6", width: "20", height: "14", rx: "3", stroke: "#fff", strokeWidth: "2" }), _jsx("path", { d: "M2 10h20", stroke: "#fff", strokeWidth: "2" })] }), "\u041E\u043F\u043B\u0430\u0442\u0438\u0442\u044C"] })] })] }));
}
