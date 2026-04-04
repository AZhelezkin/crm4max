import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { formatPrice, formatDuration, discountedPrice } from '@/types';
export default function ProfilePage() {
    const { master } = useAuthStore();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('services');
    const [lightboxIndex, setLightboxIndex] = useState(null);
    const lbStripRef = useRef(null);
    const lbOverlayRef = useRef(null);
    const lbTouch = useRef({ startX: 0, startY: 0, dir: null, moved: false });
    const totalServices = master?.categories.reduce((acc, c) => acc + c.services.length, 0) ?? 0;
    const allPhotos = (master?.categories ?? [])
        .flatMap(c => c.services)
        .flatMap(s => s.workPhotos ?? [])
        .sort((a, b) => a.order - b.order);
    function onLbStart(e) {
        e.stopPropagation();
        const t = e.touches[0];
        lbTouch.current = { startX: t.clientX, startY: t.clientY, dir: null, moved: false };
        if (lbStripRef.current)
            lbStripRef.current.style.transition = 'none';
        if (lbOverlayRef.current)
            lbOverlayRef.current.style.transition = 'none';
    }
    function onLbMove(e) {
        e.stopPropagation();
        const dx = e.touches[0].clientX - lbTouch.current.startX;
        const dy = e.touches[0].clientY - lbTouch.current.startY;
        lbTouch.current.moved = true;
        if (!lbTouch.current.dir) {
            if (Math.abs(dx) > Math.abs(dy) + 5)
                lbTouch.current.dir = 'h';
            else if (Math.abs(dy) > Math.abs(dx) + 5)
                lbTouch.current.dir = 'v';
            else
                return;
        }
        if (lbTouch.current.dir === 'h' && lbStripRef.current) {
            lbStripRef.current.style.transform = `translateX(calc(-100vw + ${dx}px))`;
        }
        if (lbTouch.current.dir === 'v' && lbOverlayRef.current) {
            const p = Math.max(0, dy);
            lbOverlayRef.current.style.transform = `translateY(${p}px)`;
            lbOverlayRef.current.style.opacity = String(Math.max(0, 1 - p / 300));
        }
    }
    function onLbEnd(e) {
        e.preventDefault();
        e.stopPropagation();
        const { startX, startY, dir, moved } = lbTouch.current;
        const dx = e.changedTouches[0].clientX - startX;
        const dy = e.changedTouches[0].clientY - startY;
        // Tap — close
        if (!moved) {
            setLightboxIndex(null);
            return;
        }
        if (dir === 'v') {
            if (dy > 100 && lbOverlayRef.current) {
                lbOverlayRef.current.style.transition = 'transform 0.25s ease, opacity 0.25s ease';
                lbOverlayRef.current.style.transform = 'translateY(100%)';
                lbOverlayRef.current.style.opacity = '0';
                setTimeout(() => setLightboxIndex(null), 250);
            }
            else if (lbOverlayRef.current) {
                lbOverlayRef.current.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
                lbOverlayRef.current.style.transform = 'translateY(0)';
                lbOverlayRef.current.style.opacity = '1';
            }
            return;
        }
        if (dir === 'h') {
            const W = window.innerWidth;
            const goNext = dx < -60 && lightboxIndex < allPhotos.length - 1;
            const goPrev = dx > 60 && lightboxIndex > 0;
            if (goNext || goPrev) {
                if (lbStripRef.current) {
                    lbStripRef.current.style.transition = 'transform 0.25s ease';
                    lbStripRef.current.style.transform = `translateX(calc(-100vw + ${goNext ? -W : W}px))`;
                }
                setTimeout(() => {
                    setLightboxIndex(i => i !== null ? i + (goNext ? 1 : -1) : null);
                    if (lbStripRef.current) {
                        lbStripRef.current.style.transition = 'none';
                        lbStripRef.current.style.transform = 'translateX(-100vw)';
                    }
                }, 250);
            }
            else if (lbStripRef.current) {
                lbStripRef.current.style.transition = 'transform 0.3s ease';
                lbStripRef.current.style.transform = 'translateX(-100vw)';
            }
        }
    }
    return (_jsxs("div", { style: { minHeight: '100dvh', background: 'var(--color-bg)', overflowX: 'hidden' }, children: [_jsxs("div", { style: { position: 'relative', paddingTop: 16, paddingBottom: 20, textAlign: 'center' }, children: [!!master?.rating && (_jsxs("div", { style: {
                            position: 'absolute', top: 16, right: 16,
                            display: 'flex', alignItems: 'center', gap: 4,
                            background: 'var(--color-card)', borderRadius: 20,
                            padding: '4px 10px',
                        }, children: [_jsx("span", { style: { color: '#FFD60A', fontSize: 14 }, children: "\u2605" }), _jsx("span", { style: { fontSize: 14, fontWeight: 600 }, children: master.rating.toFixed(1) })] })), _jsx("div", { style: {
                            width: 90, height: 90, borderRadius: '50%',
                            border: '3px solid var(--color-primary)',
                            overflow: 'hidden', margin: '0 auto 12px',
                            background: 'var(--color-card2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }, children: master?.photo
                            ? _jsx("img", { src: master.photo, alt: "", style: { width: '100%', height: '100%', objectFit: 'cover' } })
                            : _jsx("span", { style: { fontSize: 36 }, children: "\uD83D\uDC64" }) }), _jsx("div", { style: { fontSize: 20, fontWeight: 700 }, children: master?.name || 'Мастер' }), master?.description && (_jsx("div", { style: { color: 'var(--color-text-secondary)', fontSize: 14, marginTop: 4 }, children: master.description })), _jsx("div", { style: { display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16, padding: '0 16px' }, children: [
                            {
                                label: 'Услуги', action: () => navigate('/services'),
                                icon: _jsx(CatalogIcon, { active: true }),
                            },
                            {
                                label: 'Профиль', action: () => navigate('/about'),
                                icon: _jsx(EditIcon, { active: true }),
                            },
                            {
                                label: 'Поделиться', action: () => navigate('/share'),
                                icon: _jsx(ShareIcon, { active: true }),
                            },
                            { label: 'Еще', action: () => { }, icon: _jsx(MoreIcon, { active: true }) },
                        ].map(({ label, icon, action }) => (_jsxs("button", { onClick: action, style: {
                                flex: 1,
                                display: 'flex', flexDirection: 'column',
                                alignItems: 'center', gap: 6,
                                background: 'var(--color-card)',
                                border: 'none', borderRadius: 'var(--radius-sm)',
                                padding: '10px 4px',
                                cursor: 'pointer',
                            }, children: [icon, _jsx("span", { style: { fontSize: 11, color: 'var(--color-primary)', fontWeight: 500 }, children: label })] }, label))) })] }), _jsx("div", { style: { display: 'flex', borderBottom: '1px solid var(--color-border)', padding: '0 16px' }, children: [
                    { key: 'services', label: 'Услуги', count: totalServices },
                    { key: 'photos', label: 'Фото', count: 0 },
                    { key: 'reviews', label: 'Отзывы', count: 0 },
                ].map((tab) => (_jsxs("button", { onClick: () => setActiveTab(tab.key), style: {
                        flex: 1, background: 'none', border: 'none',
                        padding: '12px 0', cursor: 'pointer',
                        borderBottom: activeTab === tab.key ? '2px solid var(--color-primary)' : '2px solid transparent',
                        color: activeTab === tab.key ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                        fontSize: 14, fontWeight: 500,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    }, children: [tab.label, tab.count > 0 && (_jsx("span", { style: {
                                background: activeTab === tab.key ? 'var(--color-primary)' : 'var(--color-card2)',
                                color: activeTab === tab.key ? '#fff' : 'var(--color-text-secondary)',
                                borderRadius: 10, padding: '1px 6px', fontSize: 11, fontWeight: 600,
                            }, children: tab.count }))] }, tab.key))) }), _jsxs("div", { style: { padding: '12px 16px 80px' }, children: [activeTab === 'services' && (master?.categories.length
                        ? _jsx(ServicesList, { categories: master.categories })
                        : _jsx(EmptyState, { text: "\u0423\u0441\u043B\u0443\u0433\u0438 \u0435\u0449\u0451 \u043D\u0435 \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u044B", action: { label: '+ Добавить услуги', onClick: () => navigate('/services') } })), activeTab === 'photos' && (!allPhotos.length
                        ? _jsx(EmptyState, { text: "\u0424\u043E\u0442\u043E \u0440\u0430\u0431\u043E\u0442 \u043F\u043E\u044F\u0432\u044F\u0442\u0441\u044F \u0437\u0434\u0435\u0441\u044C" })
                        : _jsx("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, margin: '0 -16px' }, children: allPhotos.map((p, i) => (_jsx("div", { style: { aspectRatio: '1', overflow: 'hidden', cursor: 'pointer' }, onClick: () => setLightboxIndex(i), children: _jsx("img", { src: p.url, alt: "", style: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' } }) }, p.id))) })), activeTab === 'reviews' && _jsx(EmptyState, { text: "\u041E\u0442\u0437\u044B\u0432\u044B \u043F\u043E\u044F\u0432\u044F\u0442\u0441\u044F \u043F\u043E\u0441\u043B\u0435 \u043F\u0435\u0440\u0432\u044B\u0445 \u0437\u0430\u043F\u0438\u0441\u0435\u0439" })] }), lightboxIndex !== null && (_jsxs("div", { ref: lbOverlayRef, onTouchStart: onLbStart, onTouchMove: onLbMove, onTouchEnd: onLbEnd, style: {
                    position: 'fixed', inset: 0, zIndex: 1000,
                    background: 'rgba(0,0,0,0.92)',
                    overflow: 'hidden',
                }, onClick: (e) => e.stopPropagation(), children: [_jsx("div", { ref: lbStripRef, style: {
                            display: 'flex', width: '300vw', height: '100%',
                            transform: 'translateX(-100vw)',
                            willChange: 'transform',
                        }, children: [lightboxIndex - 1, lightboxIndex, lightboxIndex + 1].map((idx) => (_jsx("div", { style: {
                                width: '100vw', height: '100%', flexShrink: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }, children: allPhotos[idx] && (_jsx("img", { src: allPhotos[idx].url, alt: "", style: { maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block', pointerEvents: 'none' } })) }, idx))) }), allPhotos.length > 1 && (_jsx("div", { style: { position: 'absolute', bottom: 32, left: 0, right: 0, display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center', pointerEvents: 'none' }, children: allPhotos.map((_, i) => (_jsx("div", { style: {
                                width: i === lightboxIndex ? 8 : 6,
                                height: i === lightboxIndex ? 8 : 6,
                                borderRadius: '50%',
                                background: i === lightboxIndex ? '#fff' : 'rgba(255,255,255,0.35)',
                                transition: 'all 0.2s',
                            } }, i))) }))] }))] }));
}
// ─── ServicesList ─────────────────────────────────────────────────────────────
function ServicesList({ categories }) {
    const [expandedIds, setExpandedIds] = useState(new Set());
    const toggle = (id) => setExpandedIds((prev) => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
    });
    return (_jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 10 }, children: categories.map((cat) => {
            const expanded = expandedIds.has(cat.id);
            const hasDiscount = cat.services.some((s) => s.discountPercent);
            const preview = cat.services.map((s) => s.name).join(' • ');
            return (_jsxs("div", { children: [_jsxs("div", { onClick: () => toggle(cat.id), style: {
                            display: 'flex', alignItems: 'center',
                            background: 'var(--color-card)',
                            borderRadius: expanded ? '20px 20px 0 0' : 20,
                            minHeight: 78,
                            padding: '0 16px 0 0',
                            cursor: 'pointer',
                        }, children: [_jsx("div", { style: {
                                    width: 46, height: 46, borderRadius: '50%',
                                    flexShrink: 0, overflow: 'hidden',
                                    background: 'var(--color-card2)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    margin: '0 12px 0 16px',
                                }, children: cat.photo
                                    ? _jsx("img", { src: cat.photo, alt: "", style: { width: '100%', height: '100%', objectFit: 'cover' } })
                                    : _jsx("span", { style: { fontSize: 22 }, children: "\u2702\uFE0F" }) }), _jsxs("div", { style: { flex: 1, minWidth: 0, padding: '14px 0' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }, children: [_jsx("span", { style: { fontWeight: 600, fontSize: 15 }, children: cat.name }), hasDiscount && (_jsx("span", { style: {
                                                    background: 'rgba(206,66,89,0.3)', color: '#CE4259',
                                                    fontSize: 11, fontWeight: 700, borderRadius: 6, padding: '2px 6px',
                                                }, children: "% \u0441\u043A\u0438\u0434\u043A\u0438" }))] }), _jsx("div", { style: {
                                            color: 'var(--color-text-secondary)', fontSize: 13,
                                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                        }, children: cat.description || preview })] }), _jsx("div", { style: {
                                    flexShrink: 0,
                                    transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
                                    transition: 'transform 0.2s',
                                    marginLeft: 8,
                                }, children: _jsx(ChevronRightIcon, {}) })] }), expanded && (_jsx("div", { style: { background: 'var(--color-card)', borderRadius: '0 0 20px 20px', overflow: 'hidden' }, children: cat.services.map((s) => {
                            const dPrice = discountedPrice(s.price, s.discountPercent);
                            return (_jsxs("div", { style: {
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '10px 16px',
                                    borderTop: '1px solid var(--color-border)',
                                }, children: [_jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsx("div", { style: { fontSize: 14, fontWeight: 500 }, children: s.name }), _jsx("div", { style: { color: 'var(--color-text-secondary)', fontSize: 12, marginTop: 2 }, children: formatDuration(s.duration) })] }), _jsx("div", { style: { textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }, children: dPrice !== null ? (_jsxs(_Fragment, { children: [_jsx("div", { style: { fontWeight: 600, color: 'var(--color-primary)', fontSize: 14 }, children: formatPrice(dPrice) }), _jsx("div", { style: { fontSize: 11, color: 'var(--color-text-secondary)', textDecoration: 'line-through' }, children: formatPrice(s.price) }), _jsxs("div", { style: {
                                                        background: 'rgba(206,66,89,0.3)', color: '#CE4259',
                                                        fontSize: 10, fontWeight: 700, borderRadius: 6, padding: '1px 5px',
                                                    }, children: ["-", s.discountPercent, "%"] })] })) : (_jsx("div", { style: { fontWeight: 600, fontSize: 14 }, children: formatPrice(s.price) })) })] }, s.id));
                        }) }))] }, cat.id));
        }) }));
}
function EmptyState({ text, action }) {
    return (_jsxs("div", { style: { textAlign: 'center', padding: '40px 0' }, children: [_jsx("div", { style: { color: 'var(--color-text-secondary)', fontSize: 15 }, children: text }), action && (_jsx("button", { onClick: action.onClick, style: {
                    marginTop: 16, background: 'var(--color-primary)',
                    color: '#fff', border: 'none', borderRadius: 'var(--radius)',
                    padding: '10px 20px', fontSize: 15, fontWeight: 500, cursor: 'pointer',
                }, children: action.label }))] }));
}
// ─── Иконки ──────────────────────────────────────────────────────────────────
function CalendarIcon({ active }) {
    const c = active ? '#2688EB' : '#8E8E93';
    return (_jsxs("svg", { width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", children: [_jsx("rect", { x: "3", y: "4", width: "18", height: "17", rx: "3", stroke: c, strokeWidth: "2" }), _jsx("path", { d: "M8 2v4M16 2v4M3 9h18", stroke: c, strokeWidth: "2", strokeLinecap: "round" }), _jsx("rect", { x: "7", y: "13", width: "3", height: "3", rx: "1", fill: c }), _jsx("rect", { x: "14", y: "13", width: "3", height: "3", rx: "1", fill: c })] }));
}
function AddIcon({ active }) {
    const c = active ? '#2688EB' : '#8E8E93';
    return (_jsxs("svg", { width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", children: [_jsx("circle", { cx: "12", cy: "12", r: "9", stroke: c, strokeWidth: "2" }), _jsx("path", { d: "M12 8v8M8 12h8", stroke: c, strokeWidth: "2", strokeLinecap: "round" })] }));
}
function EditIcon({ active }) {
    const c = active ? '#2688EB' : '#8E8E93';
    return (_jsxs("svg", { width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", children: [_jsx("path", { d: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7", stroke: c, strokeWidth: "2", strokeLinecap: "round" }), _jsx("path", { d: "M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z", stroke: c, strokeWidth: "2", strokeLinecap: "round" })] }));
}
function CatalogIcon({ active }) {
    const c = active ? '#2688EB' : '#8E8E93';
    return (_jsxs("svg", { width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", children: [_jsx("rect", { x: "3", y: "3", width: "13", height: "17", rx: "2", stroke: c, strokeWidth: "2" }), _jsx("path", { d: "M7 8h6M7 12h6M7 16h4", stroke: c, strokeWidth: "1.75", strokeLinecap: "round" }), _jsx("circle", { cx: "19", cy: "19", r: "4", fill: c }), _jsx("path", { d: "M19 17v4M17 19h4", stroke: "white", strokeWidth: "1.75", strokeLinecap: "round" })] }));
}
function MoreIcon({ active }) {
    const c = active ? '#2688EB' : '#8E8E93';
    return (_jsxs("svg", { width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", children: [_jsx("circle", { cx: "5", cy: "12", r: "2", fill: c }), _jsx("circle", { cx: "12", cy: "12", r: "2", fill: c }), _jsx("circle", { cx: "19", cy: "12", r: "2", fill: c })] }));
}
function ChevronRightIcon() {
    return (_jsx("svg", { width: "18", height: "18", viewBox: "0 0 18 18", fill: "none", children: _jsx("path", { d: "M7 5L11 9L7 13", stroke: "#7D7D7F", strokeWidth: "1.75", strokeLinecap: "round", strokeLinejoin: "round" }) }));
}
function ShareIcon({ active }) {
    const c = active ? '#2688EB' : '#8E8E93';
    return (_jsxs("svg", { width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", children: [_jsx("path", { d: "M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8", stroke: c, strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }), _jsx("polyline", { points: "16 6 12 2 8 6", stroke: c, strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }), _jsx("line", { x1: "12", y1: "2", x2: "12", y2: "15", stroke: c, strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" })] }));
}
