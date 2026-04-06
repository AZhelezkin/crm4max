import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { mastersApi } from '@client/api/masters.api';
import { useBookingStore } from '@client/store/booking.store';
import BottomNav from '@client/components/BottomNav';
export default function ContactsPage() {
    const { masterId } = useBookingStore();
    const [master, setMaster] = useState(null);
    useEffect(() => {
        if (masterId)
            mastersApi.getById(masterId).then(setMaster).catch(() => { });
    }, [masterId]);
    const openAddress = () => {
        if (master?.lat && master?.lng)
            window.WebApp?.openLink(`geo:${master.lat},${master.lng}?q=${master.lat},${master.lng}(${encodeURIComponent(master.name)})`);
    };
    const openPhone = () => {
        if (master?.phone)
            window.WebApp?.openLink(`tel:${master.phone.replace(/\D/g, '').replace(/^7/, '+7')}`);
    };
    return (_jsxs("div", { style: { minHeight: '100dvh', background: 'var(--color-bg)', paddingBottom: 80 }, children: [_jsx("div", { style: { padding: '16px 16px 0' }, children: _jsx("h1", { style: { fontSize: 22, fontWeight: 700, margin: 0 }, children: "\u041A\u043E\u043D\u0442\u0430\u043A\u0442\u044B" }) }), !master ? (_jsx("div", { style: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60dvh', color: '#8E8E93' }, children: masterId ? 'Загрузка...' : 'Откройте карточку мастера' })) : (_jsxs("div", { style: { padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }, children: [master.phone && (_jsxs("button", { onClick: openPhone, style: {
                            display: 'flex', alignItems: 'center', gap: 14,
                            background: '#25262B', borderRadius: 20, padding: '16px 16px',
                            border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left',
                        }, children: [_jsx("svg", { width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", children: _jsx("path", { d: "M21.97 18.33C21.97 18.69 21.89 19.06 21.72 19.42C21.55 19.78 21.33 20.12 21.04 20.44C20.55 20.98 20.01 21.37 19.4 21.62C18.8 21.87 18.15 22 17.45 22C16.43 22 15.34 21.76 14.19 21.27C13.04 20.78 11.89 20.12 10.75 19.29C9.6 18.45 8.51 17.52 7.47 16.49C6.44 15.45 5.51 14.36 4.68 13.22C3.86 12.08 3.2 10.94 2.72 9.81C2.24 8.67 2 7.58 2 6.54C2 5.86 2.12 5.21 2.36 4.61C2.6 4 2.98 3.44 3.51 2.94C4.15 2.31 4.85 2 5.59 2C5.87 2 6.15 2.06 6.4 2.18C6.66 2.3 6.89 2.48 7.07 2.74L9.39 6.01C9.57 6.26 9.7 6.49 9.79 6.71C9.88 6.92 9.93 7.13 9.93 7.32C9.93 7.56 9.86 7.8 9.72 8.03C9.59 8.26 9.4 8.5 9.16 8.74L8.4 9.53C8.29 9.64 8.24 9.77 8.24 9.93C8.24 10.01 8.25 10.08 8.27 10.16C8.3 10.24 8.33 10.3 8.35 10.36C8.53 10.69 8.84 11.12 9.28 11.64C9.73 12.16 10.21 12.69 10.73 13.22C11.27 13.75 11.79 14.24 12.32 14.69C12.84 15.13 13.27 15.43 13.61 15.61C13.66 15.63 13.72 15.66 13.79 15.69C13.87 15.72 13.95 15.73 14.04 15.73C14.21 15.73 14.34 15.67 14.45 15.56L15.21 14.81C15.46 14.56 15.7 14.37 15.93 14.25C16.16 14.11 16.39 14.04 16.64 14.04C16.83 14.04 17.03 14.08 17.25 14.17C17.47 14.26 17.7 14.39 17.95 14.56L21.26 16.91C21.52 17.09 21.7 17.3 21.81 17.55C21.91 17.8 21.97 18.05 21.97 18.33Z", stroke: "#007AFE", strokeWidth: "2", strokeMiterlimit: "10" }) }), _jsxs("div", { children: [_jsx("div", { style: { fontSize: 15, fontWeight: 500, color: '#D3D4D6' }, children: "\u0422\u0435\u043B\u0435\u0444\u043E\u043D" }), _jsx("div", { style: { fontSize: 13, color: '#7D7D7F', marginTop: 2 }, children: master.phone })] })] })), master.lat && master.lng && (_jsxs("button", { onClick: openAddress, style: {
                            display: 'flex', alignItems: 'center', gap: 14,
                            background: '#25262B', borderRadius: 20, padding: '16px 16px',
                            border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left',
                        }, children: [_jsxs("svg", { width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", children: [_jsx("path", { d: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Z", stroke: "#007AFE", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }), _jsx("circle", { cx: "12", cy: "9", r: "2.5", stroke: "#007AFE", strokeWidth: "2" })] }), _jsxs("div", { children: [_jsx("div", { style: { fontSize: 15, fontWeight: 500, color: '#D3D4D6' }, children: "\u0410\u0434\u0440\u0435\u0441" }), master.location && (_jsx("div", { style: { fontSize: 13, color: '#7D7D7F', marginTop: 2 }, children: master.location }))] })] })), !master.phone && !master.lat && (_jsx("div", { style: { textAlign: 'center', color: '#8E8E93', marginTop: 40 }, children: "\u041C\u0430\u0441\u0442\u0435\u0440 \u043D\u0435 \u0443\u043A\u0430\u0437\u0430\u043B \u043A\u043E\u043D\u0442\u0430\u043A\u0442\u044B" }))] })), _jsx(BottomNav, {})] }));
}
