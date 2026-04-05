import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBookingStore } from '@client/store/booking.store';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function extractMasterId(scanned) {
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
    return null;
}
export default function QRScanPage() {
    const navigate = useNavigate();
    const setMasterId = useBookingStore((s) => s.setMasterId);
    useEffect(() => {
        if (!window.WebApp?.openCodeReader)
            return;
        window.WebApp.openCodeReader((result) => {
            if (!result)
                return;
            const masterId = extractMasterId(result);
            if (masterId) {
                setMasterId(masterId);
                navigate('/', { replace: true });
            }
        });
    }, [navigate, setMasterId]);
    return (_jsxs("div", { style: {
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', height: '100dvh', gap: 16,
            background: 'var(--color-bg)', color: 'var(--color-text)',
            padding: '0 24px', textAlign: 'center',
        }, children: [_jsx("div", { style: { fontSize: 64 }, children: "\uD83D\uDCF7" }), _jsx("h2", { style: { margin: 0, fontSize: 20 }, children: "\u0421\u043A\u0430\u043D\u0438\u0440\u043E\u0432\u0430\u0442\u044C QR-\u043A\u043E\u0434" }), _jsx("p", { style: { margin: 0, color: 'var(--color-text-secondary)', fontSize: 14 }, children: "\u041F\u043E\u043F\u0440\u043E\u0441\u0438\u0442\u0435 \u043C\u0430\u0441\u0442\u0435\u0440\u0430 \u043F\u043E\u043A\u0430\u0437\u0430\u0442\u044C QR-\u043A\u043E\u0434 \u0438 \u043D\u0430\u043F\u0440\u0430\u0432\u044C\u0442\u0435 \u043A\u0430\u043C\u0435\u0440\u0443 \u043D\u0430 \u043D\u0435\u0433\u043E" })] }));
}
