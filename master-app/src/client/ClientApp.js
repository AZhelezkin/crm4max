import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@client/store/auth.store';
import { startParam } from '@/App';
import MasterCardPage from '@client/pages/MasterCardPage';
import ServiceSelectPage from '@client/pages/ServiceSelectPage';
import CalendarPage from '@client/pages/CalendarPage';
import ConfirmPage from '@client/pages/ConfirmPage';
import DepositPage from '@client/pages/DepositPage';
import SuccessPage from '@client/pages/SuccessPage';
import MyBookingsPage from '@client/pages/MyBookingsPage';
import BookingDetailPage from '@client/pages/BookingDetailPage';
import MessagesPage from '@client/pages/MessagesPage';
import ContactsPage from '@client/pages/ContactsPage';
import QRScanPage from '@client/pages/QRScanPage';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Если startParam — UUID, пришли от мастера напрямую → карточка мастера
// Иначе — QR-сканер, пока masterId не появится в URL после скана
function HomeRoute() {
    const [params] = useSearchParams();
    const masterId = UUID_REGEX.test(startParam) ? startParam : params.get('masterId');
    if (!masterId)
        return _jsx(QRScanPage, {});
    return _jsx(MasterCardPage, {});
}
export default function ClientApp() {
    const { init, isLoading } = useAuthStore();
    useEffect(() => { init(); }, [init]);
    if (isLoading) {
        return (_jsx("div", { style: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100dvh', background: 'var(--color-bg)' }, children: _jsx("span", { style: { color: 'var(--color-text-secondary)' }, children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430..." }) }));
    }
    return (_jsx(HashRouter, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(HomeRoute, {}) }), _jsx(Route, { path: "/book/services", element: _jsx(ServiceSelectPage, {}) }), _jsx(Route, { path: "/book/calendar", element: _jsx(CalendarPage, {}) }), _jsx(Route, { path: "/book/confirm", element: _jsx(ConfirmPage, {}) }), _jsx(Route, { path: "/book/deposit", element: _jsx(DepositPage, {}) }), _jsx(Route, { path: "/book/success", element: _jsx(SuccessPage, {}) }), _jsx(Route, { path: "/my-bookings", element: _jsx(MyBookingsPage, {}) }), _jsx(Route, { path: "/my-bookings/:id", element: _jsx(BookingDetailPage, {}) }), _jsx(Route, { path: "/messages", element: _jsx(MessagesPage, {}) }), _jsx(Route, { path: "/contacts", element: _jsx(ContactsPage, {}) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/", replace: true }) })] }) }));
}
