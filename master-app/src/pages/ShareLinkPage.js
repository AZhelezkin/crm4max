import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import { useAuthStore } from '@/store/auth.store';
function BackArrowIcon() {
    return (_jsx("svg", { width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", children: _jsx("path", { d: "M15 19l-7-7 7-7", stroke: "var(--color-primary)", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }) }));
}
function CopyIcon() {
    return (_jsxs("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", children: [_jsx("rect", { x: "9", y: "9", width: "13", height: "13", rx: "2", stroke: "var(--color-primary)", strokeWidth: "2" }), _jsx("path", { d: "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1", stroke: "var(--color-primary)", strokeWidth: "2" })] }));
}
function ShareIcon() {
    return (_jsxs("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", children: [_jsx("path", { d: "M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8", stroke: "var(--color-primary)", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }), _jsx("polyline", { points: "16 6 12 2 8 6", stroke: "var(--color-primary)", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }), _jsx("line", { x1: "12", y1: "2", x2: "12", y2: "15", stroke: "var(--color-primary)", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" })] }));
}
function DownloadIcon() {
    return (_jsxs("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", children: [_jsx("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", stroke: "var(--color-primary)", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }), _jsx("polyline", { points: "7 10 12 15 17 10", stroke: "var(--color-primary)", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }), _jsx("line", { x1: "12", y1: "15", x2: "12", y2: "3", stroke: "var(--color-primary)", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" })] }));
}
export default function ShareLinkPage() {
    const navigate = useNavigate();
    const { master } = useAuthStore();
    const [copied, setCopied] = useState(false);
    const canvasRef = useRef(null);
    const masterId = master?.id ?? '';
    const deepLink = `https://max.ru/id9706002253_bot?startapp=${masterId}`;
    const hasLink = masterId.length > 0;
    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(deepLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
        catch {
            // fallback — выделить текст
        }
    };
    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: master?.name ?? 'Записаться ко мне',
                    text: `Записывайтесь ко мне через Max: ${master?.name ?? ''}`,
                    url: deepLink,
                });
            }
            catch {
                // пользователь отменил
            }
        }
        else {
            handleCopy();
        }
    };
    const handleDownloadQR = () => {
        const canvas = canvasRef.current;
        if (!canvas)
            return;
        const url = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = url;
        a.download = 'qr-code.png';
        a.click();
    };
    return (_jsxs("div", { style: { minHeight: '100dvh', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column' }, children: [_jsxs("div", { style: {
                    display: 'flex', alignItems: 'center',
                    padding: '12px 8px 12px 4px',
                    position: 'sticky', top: 0,
                    background: 'var(--color-bg)',
                    zIndex: 10,
                }, children: [_jsx("button", { onClick: () => navigate(-1), style: { background: 'none', border: 'none', cursor: 'pointer', padding: '8px 12px', display: 'flex', alignItems: 'center' }, children: _jsx(BackArrowIcon, {}) }), _jsx("span", { style: { fontSize: 17, fontWeight: 600, flex: 1 }, children: "\u0421\u0441\u044B\u043B\u043A\u0430 \u0434\u043B\u044F \u0437\u0430\u043F\u0438\u0441\u0438" })] }), _jsxs("div", { style: { padding: '8px 16px 40px', display: 'flex', flexDirection: 'column', gap: 16 }, children: [_jsx("p", { style: { margin: 0, fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.5 }, children: "\u041F\u043E\u0434\u0435\u043B\u0438\u0442\u0435\u0441\u044C \u044D\u0442\u043E\u0439 \u0441\u0441\u044B\u043B\u043A\u043E\u0439 \u0438\u043B\u0438 QR-\u043A\u043E\u0434\u043E\u043C \u2014 \u043A\u043B\u0438\u0435\u043D\u0442\u044B \u0441\u043C\u043E\u0433\u0443\u0442 \u0437\u0430\u043F\u0438\u0441\u0430\u0442\u044C\u0441\u044F \u043A \u0432\u0430\u043C \u0447\u0435\u0440\u0435\u0437 \u043C\u0435\u0441\u0441\u0435\u043D\u0434\u0436\u0435\u0440 Max" }), _jsxs("div", { style: {
                            background: 'var(--color-card)',
                            borderRadius: 'var(--radius)',
                            display: 'flex', alignItems: 'center',
                            padding: '12px 16px',
                            gap: 12,
                        }, children: [_jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsx("div", { style: { fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 4 }, children: "\u0421\u0441\u044B\u043B\u043A\u0430" }), _jsx("div", { style: {
                                            fontSize: 13, fontFamily: 'monospace',
                                            color: 'var(--color-primary)',
                                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                        }, children: deepLink })] }), _jsx("button", { onClick: handleShare, style: {
                                    flexShrink: 0,
                                    background: 'none', border: 'none',
                                    cursor: 'pointer', padding: 8,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    borderRadius: 8,
                                    transition: 'background 0.15s',
                                }, title: "\u041F\u043E\u0434\u0435\u043B\u0438\u0442\u044C\u0441\u044F", children: _jsx(ShareIcon, {}) })] }), _jsxs("button", { onClick: handleCopy, style: {
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            background: copied ? 'var(--color-card2)' : 'var(--color-card)',
                            border: `1px solid ${copied ? 'var(--color-primary)' : 'transparent'}`,
                            borderRadius: 'var(--radius)',
                            padding: '12px 16px',
                            cursor: 'pointer',
                            color: copied ? 'var(--color-primary)' : 'var(--color-text)',
                            fontSize: 15, fontWeight: 500,
                            transition: 'all 0.15s',
                        }, children: [_jsx(CopyIcon, {}), copied ? 'Скопировано!' : 'Скопировать ссылку'] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 12 }, children: [_jsx("div", { style: { flex: 1, height: 1, background: 'var(--color-border)' } }), _jsx("span", { style: { fontSize: 13, color: 'var(--color-text-secondary)' }, children: "\u0438\u043B\u0438 QR-\u043A\u043E\u0434" }), _jsx("div", { style: { flex: 1, height: 1, background: 'var(--color-border)' } })] }), _jsxs("div", { style: {
                            background: 'var(--color-card)',
                            borderRadius: 'var(--radius)',
                            display: 'flex', flexDirection: 'column',
                            alignItems: 'center',
                            padding: '24px 16px 20px',
                            gap: 16,
                        }, children: [_jsx("div", { style: {
                                    background: '#ffffff',
                                    borderRadius: 16,
                                    padding: 16,
                                    display: 'inline-flex',
                                }, children: hasLink ? (_jsx(QRCodeCanvas, { ref: canvasRef, value: deepLink, size: 200, bgColor: "#ffffff", fgColor: "#0F0F11", level: "M" })) : (_jsx("div", { style: {
                                        width: 200, height: 200,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: '#aaa', fontSize: 13, textAlign: 'center', padding: 16,
                                    }, children: "QR-\u043A\u043E\u0434 \u043F\u043E\u044F\u0432\u0438\u0442\u0441\u044F \u043F\u043E\u0441\u043B\u0435 \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u0438" })) }), _jsxs("div", { style: { textAlign: 'center' }, children: [_jsx("div", { style: { fontSize: 14, fontWeight: 500, marginBottom: 4 }, children: master?.name ?? 'Мастер' }), _jsx("div", { style: { fontSize: 12, color: 'var(--color-text-secondary)' }, children: "\u041E\u0442\u0441\u043A\u0430\u043D\u0438\u0440\u0443\u0439\u0442\u0435, \u0447\u0442\u043E\u0431\u044B \u0437\u0430\u043F\u0438\u0441\u0430\u0442\u044C\u0441\u044F" })] }), _jsxs("button", { onClick: handleDownloadQR, style: {
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    background: 'none', border: '1px solid var(--color-border)',
                                    borderRadius: 10, padding: '8px 16px',
                                    cursor: 'pointer',
                                    color: 'var(--color-text-secondary)',
                                    fontSize: 13, fontWeight: 500,
                                }, children: [_jsx(DownloadIcon, {}), "\u0421\u043A\u0430\u0447\u0430\u0442\u044C QR-\u043A\u043E\u0434"] })] })] })] }));
}
