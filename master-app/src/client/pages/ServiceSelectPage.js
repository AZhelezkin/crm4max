import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { mastersApi } from '@client/api/masters.api';
import { useBookingStore } from '@client/store/booking.store';
import { discountedPrice, formatPrice, formatDuration } from '@client/types';
import BottomNav from '@client/components/BottomNav';
export default function ServiceSelectPage() {
    const navigate = useNavigate();
    const { masterId, setService } = useBookingStore();
    const [master, setMaster] = useState(null);
    const [expandedIds, setExpandedIds] = useState(new Set());
    useEffect(() => {
        if (masterId)
            mastersApi.getById(masterId).then(setMaster).catch(() => navigate('/'));
    }, [masterId, navigate]);
    const handleSelect = (service) => {
        setService(service);
        navigate('/book/calendar');
    };
    const toggleCategory = (id) => setExpandedIds((prev) => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
    });
    return (_jsxs("div", { style: { minHeight: '100dvh', background: '#0F0F11', paddingBottom: 95 }, children: [_jsxs("div", { style: {
                    height: 116, background: '#0F0F11',
                    display: 'flex', alignItems: 'center', padding: '0 14px',
                    gap: 12, position: 'sticky', top: 0, zIndex: 10,
                }, children: [_jsx("button", { onClick: () => navigate(-1), style: {
                            background: 'none', border: 'none', cursor: 'pointer', padding: 8, flexShrink: 0,
                        }, children: _jsxs("svg", { width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", children: [_jsx("path", { d: "M15.57 17.93L9.5 12l6.07-6.07", stroke: "#D3D4D6", strokeWidth: "2", strokeMiterlimit: "10", strokeLinecap: "round", strokeLinejoin: "round" }), _jsx("path", { d: "M20.5 12H9.67", stroke: "#D3D4D6", strokeWidth: "2", strokeMiterlimit: "10", strokeLinecap: "round", strokeLinejoin: "round" })] }) }), master && (_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }, children: [_jsx("div", { style: {
                                    width: 44, height: 44, borderRadius: 22, overflow: 'hidden',
                                    background: '#25262B', flexShrink: 0,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }, children: master.photo
                                    ? _jsx("img", { src: master.photo, alt: "", style: { width: '100%', height: '100%', objectFit: 'cover' } })
                                    : _jsx("span", { style: { fontSize: 20, color: '#7D7D7F' }, children: "\uD83D\uDC64" }) }), _jsxs("div", { style: { minWidth: 0 }, children: [_jsx("div", { style: { fontSize: 15, fontWeight: 600, color: '#D3D4D6', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: master.name }), master.description && (_jsx("div", { style: { fontSize: 13, color: '#7D7D7F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: master.description }))] })] })), _jsx("button", { onClick: () => {
                            window.WebApp?.openMaxLink('https://max.ru/u/f9LHodD0cOIigfttbzyjUqKELI60m9aczxqqW1rkNwoQQg8IKRZa3afRH24');
                        }, style: {
                            background: 'none', border: 'none', cursor: 'pointer', padding: 8, flexShrink: 0,
                        }, children: _jsxs("svg", { width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", children: [_jsx("path", { d: "M8.5 19H8C4 19 2 18 2 13V8C2 4 4 2 8 2H16C20 2 22 4 22 8V13C22 17 20 19 16 19H15.5C15.19 19 14.89 19.15 14.7 19.4L13.2 21.4C12.54 22.28 11.46 22.28 10.8 21.4L9.3 19.4C9.14 19.18 8.77 19 8.5 19Z", stroke: "#D3D4D6", strokeWidth: "2", strokeMiterlimit: "10", strokeLinecap: "round", strokeLinejoin: "round" }), _jsx("path", { d: "M7 8H17M7 13H13", stroke: "#D3D4D6", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" })] }) })] }), _jsx("div", { style: { padding: '0 14px', display: 'flex', flexDirection: 'column', gap: 20 }, children: master?.categories.map((cat) => (_jsx(CategoryCard, { category: cat, expanded: expandedIds.has(cat.id), onToggle: () => toggleCategory(cat.id), onSelect: handleSelect }, cat.id))) }), _jsx(BottomNav, {})] }));
}
/* ── CategoryCard ──────────────────────────────────────────────────────── */
function CategoryCard({ category: cat, expanded, onToggle, onSelect }) {
    const hasDiscount = cat.services.some((s) => s.discountPercent);
    const preview = cat.services.map((s) => s.name).join(' • ');
    return (_jsxs("div", { children: [_jsxs("div", { onClick: onToggle, style: {
                    display: 'flex', alignItems: 'center',
                    background: '#25262B',
                    borderRadius: expanded ? '20px 20px 0 0' : 20,
                    minHeight: 108, padding: '0 16px 0 0',
                    cursor: 'pointer',
                }, children: [_jsxs("div", { style: { flex: 1, minWidth: 0, padding: '16px 0 16px 16px' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }, children: [_jsx("span", { style: { fontWeight: 600, fontSize: 15, color: '#D3D4D6' }, children: cat.name }), hasDiscount && (_jsx("span", { style: {
                                            background: 'rgba(206,66,89,0.3)', color: '#CE4259',
                                            fontSize: 11, fontWeight: 700, borderRadius: 6,
                                            padding: '2px 8px', lineHeight: '18px',
                                        }, children: "% \u0441\u043A\u0438\u0434\u043A\u0438" }))] }), _jsx("div", { style: {
                                    color: '#7D7D7F', fontSize: 13,
                                    overflow: 'hidden', display: '-webkit-box',
                                    WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                                }, children: cat.description || preview })] }), _jsx("div", { style: {
                            flexShrink: 0, marginLeft: 8,
                            transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s',
                        }, children: _jsx("svg", { width: "18", height: "18", viewBox: "0 0 18 18", fill: "none", children: _jsx("path", { d: "M7 5L11 9L7 13", stroke: "#7D7D7F", strokeWidth: "1.75", strokeLinecap: "round", strokeLinejoin: "round" }) }) })] }), expanded && (_jsx("div", { style: { background: '#25262B', borderRadius: '0 0 20px 20px', overflow: 'hidden' }, children: cat.services.map((s) => {
                    const dPrice = discountedPrice(s.price, s.discountPercent);
                    return (_jsxs("button", { onClick: () => onSelect(s), style: {
                            width: '100%', display: 'flex', alignItems: 'center',
                            padding: '12px 16px',
                            borderTop: '1px solid rgba(255,255,255,0.08)',
                            background: 'none', cursor: 'pointer', textAlign: 'left',
                            gap: 12, border: 'none', borderTopStyle: 'solid', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)',
                        }, children: [s.photo && (_jsx("img", { src: s.photo, alt: "", style: { width: 48, height: 48, borderRadius: 10, objectFit: 'cover', flexShrink: 0 } })), _jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }, children: [_jsx("span", { style: { fontSize: 14, fontWeight: 500, color: '#D3D4D6' }, children: s.name }), s.discountPercent && (_jsxs("span", { style: {
                                                    background: 'rgba(206,66,89,0.3)', color: '#CE4259',
                                                    fontSize: 10, fontWeight: 700, borderRadius: 6, padding: '1px 5px',
                                                }, children: ["-", s.discountPercent, "%"] }))] }), _jsx("div", { style: { color: '#7D7D7F', fontSize: 12, marginTop: 2 }, children: formatDuration(s.duration) }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }, children: [_jsx("span", { style: { fontWeight: 600, fontSize: 14, color: dPrice !== null ? '#007AFE' : '#D3D4D6' }, children: formatPrice(dPrice ?? s.price) }), dPrice !== null && (_jsx("span", { style: { fontSize: 12, color: '#7D7D7F', textDecoration: 'line-through' }, children: formatPrice(s.price) }))] })] }), _jsx("svg", { width: "9", height: "16", viewBox: "0 0 9 16", fill: "none", style: { flexShrink: 0 }, children: _jsx("path", { d: "M1 1l7 7-7 7", stroke: "#007AFE", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" }) })] }, s.id));
                }) }))] }));
}
