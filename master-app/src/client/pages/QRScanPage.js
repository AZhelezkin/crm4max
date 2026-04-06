import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBookingStore } from '@client/store/booking.store';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function extractMasterId(raw) {
    const scanned = typeof raw === 'string' ? raw : (raw.data ?? raw.result ?? raw.text ?? JSON.stringify(raw));
    try {
        const url = new URL(scanned);
        const startapp = url.searchParams.get('startapp');
        if (startapp && UUID_REGEX.test(startapp))
            return startapp;
    }
    catch {
        if (UUID_REGEX.test(scanned))
            return scanned;
    }
    const match = scanned.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    if (match)
        return match[0];
    return null;
}
export default function QRScanPage() {
    const navigate = useNavigate();
    const setMasterId = useBookingStore((s) => s.setMasterId);
    const [scanning, setScanning] = useState(false);
    const handleScan = () => {
        if (!window.WebApp?.openCodeReader || scanning)
            return;
        setScanning(true);
        window.WebApp.openCodeReader(true).then((result) => {
            const masterId = extractMasterId(result);
            if (masterId) {
                setMasterId(masterId);
                navigate(`/?masterId=${masterId}`, { replace: true });
            }
            else {
                setScanning(false);
            }
        }).catch(() => {
            setScanning(false);
        });
    };
    return (_jsxs("div", { style: {
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', height: '100dvh', gap: 16,
            background: 'var(--color-bg)', color: 'var(--color-text)',
            padding: '0 24px', textAlign: 'center',
        }, children: [_jsx("h2", { style: { margin: 0, fontSize: 20 }, children: "\u0421\u043A\u0430\u043D\u0438\u0440\u043E\u0432\u0430\u0442\u044C QR-\u043A\u043E\u0434" }), _jsx("p", { style: { margin: 0, color: 'var(--color-text-secondary)', fontSize: 14 }, children: "\u0414\u043B\u044F \u0437\u0430\u043F\u0438\u0441\u0438 \u043A \u043A\u043E\u043D\u043A\u0440\u0435\u043D\u043E\u043C\u0443 \u043C\u0430\u0441\u0442\u0435\u0440\u0443 \u043F\u043E\u043F\u0440\u043E\u0441\u0438\u0442\u0435 \u0435\u0433\u043E \u043F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u0438\u043B\u0438 \u043F\u0435\u0440\u0435\u0441\u043B\u0430\u0442\u044C \u0432\u0430\u043C QR-\u043A\u043E\u0434." }), _jsx("button", { onClick: handleScan, disabled: scanning, style: {
                    marginTop: 8,
                    background: 'var(--color-primary)', color: '#fff',
                    border: 'none', borderRadius: 12, padding: '14px 40px',
                    fontSize: 16, fontWeight: 600,
                    cursor: scanning ? 'default' : 'pointer',
                    opacity: scanning ? 0.7 : 1,
                }, children: scanning ? 'Открываю камеру…' : 'Сканировать' })] }));
}
