import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { mastersApi } from '@client/api/masters.api';
import { useBookingStore } from '@client/store/booking.store';
import { discountedPrice, formatPrice } from '@client/types';
import BottomNav from '@client/components/BottomNav';
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
    return (_jsxs("div", { style: { minHeight: '100dvh', background: '#0F0F11', paddingBottom: 95 }, children: [_jsxs("div", { style: {
                    height: 116, background: '#0F0F11',
                    display: 'flex', alignItems: 'center', padding: '0 14px',
                    gap: 12, position: 'sticky', top: 0, zIndex: 10,
                }, children: [_jsx("button", { onClick: () => navigate(-1), style: { background: 'none', border: 'none', cursor: 'pointer', padding: 8, flexShrink: 0 }, children: _jsxs("svg", { width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", children: [_jsx("path", { d: "M15.57 17.93L9.5 12l6.07-6.07", stroke: "#D3D4D6", strokeWidth: "2", strokeMiterlimit: "10", strokeLinecap: "round", strokeLinejoin: "round" }), _jsx("path", { d: "M20.5 12H9.67", stroke: "#D3D4D6", strokeWidth: "2", strokeMiterlimit: "10", strokeLinecap: "round", strokeLinejoin: "round" })] }) }), _jsx("div", { style: { flex: 1, fontSize: 17, fontWeight: 600, color: '#D3D4D6', textAlign: 'center' }, children: "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0443\u0441\u043B\u0443\u0433\u0443" }), _jsx("button", { onClick: () => {
                            window.WebApp?.openMaxLink('https://max.ru/u/f9LHodD0cOIigfttbzyjUqKELI60m9aczxqqW1rkNwoQQg8IKRZa3afRH24');
                        }, style: { background: 'none', border: 'none', cursor: 'pointer', padding: 8, flexShrink: 0 }, children: _jsxs("svg", { width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", children: [_jsx("path", { d: "M8.5 19H8C4 19 2 18 2 13V8C2 4 4 2 8 2H16C20 2 22 4 22 8V13C22 17 20 19 16 19H15.5C15.19 19 14.89 19.15 14.7 19.4L13.2 21.4C12.54 22.28 11.46 22.28 10.8 21.4L9.3 19.4C9.14 19.18 8.77 19 8.5 19Z", stroke: "#D3D4D6", strokeWidth: "2", strokeMiterlimit: "10", strokeLinecap: "round", strokeLinejoin: "round" }), _jsx("path", { d: "M7 8H17M7 13H13", stroke: "#D3D4D6", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" })] }) })] }), _jsx("div", { style: { padding: '0 14px', display: 'flex', flexDirection: 'column', gap: 20 }, children: master?.categories.map((cat) => (_jsxs("div", { children: [cat.name && (_jsx("div", { style: {
                                fontSize: 13, fontWeight: 600, color: '#7D7D7F',
                                marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5,
                            }, children: cat.name })), _jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 20 }, children: cat.services.map((s) => {
                                const dPrice = discountedPrice(s.price, s.discountPercent);
                                return (_jsxs("button", { onClick: () => handleSelect(s), style: {
                                        width: '100%', minHeight: 108,
                                        background: '#25262B', borderRadius: 20,
                                        padding: '16px 16px', border: 'none',
                                        display: 'flex', alignItems: 'center',
                                        cursor: 'pointer', textAlign: 'left', gap: 12,
                                    }, children: [_jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsx("div", { style: { fontWeight: 600, fontSize: 15, color: '#D3D4D6', marginBottom: 4 }, children: s.name }), s.description && (_jsx("div", { style: {
                                                        color: '#7D7D7F', fontSize: 13, marginBottom: 10,
                                                        overflow: 'hidden', display: '-webkit-box',
                                                        WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                                                    }, children: s.description })), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx("span", { style: {
                                                                fontWeight: 600, fontSize: 15,
                                                                color: dPrice !== null ? '#CE4259' : '#D3D4D6',
                                                            }, children: formatPrice(dPrice ?? s.price) }), dPrice !== null && (_jsx("span", { style: { fontSize: 13, color: '#7D7D7F', textDecoration: 'line-through' }, children: formatPrice(s.price) })), s.discountPercent && (_jsx("span", { style: {
                                                                background: 'rgba(206,66,89,0.3)', color: '#CE4259',
                                                                fontSize: 11, fontWeight: 700, borderRadius: 6,
                                                                padding: '2px 8px', lineHeight: '18px',
                                                            }, children: "% \u0441\u043A\u0438\u0434\u043A\u0438" }))] })] }), _jsx("svg", { width: "18", height: "18", viewBox: "0 0 18 18", fill: "none", style: { flexShrink: 0 }, children: _jsx("path", { d: "M7 5L11 9L7 13", stroke: "#7D7D7F", strokeWidth: "1.75", strokeLinecap: "round", strokeLinejoin: "round" }) })] }, s.id));
                            }) })] }, cat.id))) }), _jsx(BottomNav, {})] }));
}
