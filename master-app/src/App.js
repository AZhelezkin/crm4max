import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
import { HashRouter as BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import ClientApp from '@client/ClientApp';
import MainLayout from '@/components/MainLayout';
import ProfilePage from '@/pages/ProfilePage';
import BookingsPage from '@/pages/BookingsPage';
import ChatsPage from '@/pages/ChatsPage';
import PaymentsPage from '@/pages/PaymentsPage';
import OnboardingPage from '@/pages/OnboardingPage';
import AboutMePage from '@/pages/AboutMePage';
import SchedulePage from '@/pages/SchedulePage';
import ServicesPage from '@/pages/ServicesPage';
import BookingDetailPage from '@/pages/BookingDetailPage';
import CreateBookingPage from '@/pages/CreateBookingPage';
import PaymentSettingsPage from '@/pages/PaymentSettingsPage';
import ShareLinkPage from '@/pages/ShareLinkPage';
// Режимы по start_param из Max WebApp (window.WebApp.initDataUnsafe.start_param):
//   ""      → клиент, QR сканер (нативная кнопка или бот без startapp)
//   <UUID>  → клиент, запись к конкретному мастеру
//   "mmode" → мастер (кабинет / онбординг)
export const startParam = window.WebApp?.initDataUnsafe?.start_param ?? '';
const isClientMode = startParam !== 'mmode';
document.documentElement.dataset.theme = isClientMode ? 'client' : 'master';
export default function App() {
    if (isClientMode)
        return _jsx(ClientApp, {});
    return _jsx(MasterApp, {});
}
function MasterApp() {
    const { init, isLoading, master } = useAuthStore();
    useEffect(() => {
        init();
    }, [init]);
    if (isLoading) {
        return (_jsx("div", { style: {
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                height: '100dvh', background: 'var(--color-bg)',
            }, children: _jsx("span", { style: { color: 'var(--color-text-secondary)' }, children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430..." }) }));
    }
    // Новый мастер, не прошедший онбординг; или мастер не авторизован
    const needsOnboarding = !master || !master.isOnboarded;
    return (_jsx(BrowserRouter, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/onboarding", element: needsOnboarding ? _jsx(OnboardingPage, {}) : _jsx(Navigate, { to: "/", replace: true }) }), _jsxs(Route, { element: needsOnboarding ? _jsx(Navigate, { to: "/onboarding", replace: true }) : _jsx(Outlet, {}), children: [_jsxs(Route, { element: _jsx(MainLayout, {}), children: [_jsx(Route, { index: true, element: _jsx(ProfilePage, {}) }), _jsx(Route, { path: "bookings", element: _jsx(BookingsPage, {}) }), _jsx(Route, { path: "clients", element: _jsx(ChatsPage, {}) }), _jsx(Route, { path: "income", element: _jsx(PaymentsPage, {}) })] }), _jsx(Route, { path: "/bookings/new", element: _jsx(CreateBookingPage, {}) }), _jsx(Route, { path: "/bookings/:id", element: _jsx(BookingDetailPage, {}) }), _jsx(Route, { path: "/about", element: _jsx(AboutMePage, {}) }), _jsx(Route, { path: "/schedule", element: _jsx(SchedulePage, {}) }), _jsx(Route, { path: "/services", element: _jsx(ServicesPage, {}) }), _jsx(Route, { path: "/payment-settings", element: _jsx(PaymentSettingsPage, {}) }), _jsx(Route, { path: "/share", element: _jsx(ShareLinkPage, {}) })] }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/", replace: true }) })] }) }));
}
