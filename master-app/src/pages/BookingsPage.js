import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import { bookingsApi } from '@/api/bookings.api';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import Button from '@/components/Button';
dayjs.locale('ru');
const STATUS_LABELS = {
    PENDING: 'Ожидает',
    CONFIRMED: 'Подтверждена',
    COMPLETED: 'Завершена',
    CANCELLED: 'Отменена',
};
const STATUS_COLORS = {
    PENDING: '#FF9500',
    CONFIRMED: 'var(--color-primary)',
    COMPLETED: 'var(--color-success)',
    CANCELLED: 'var(--color-text-secondary)',
};
export default function BookingsPage() {
    const navigate = useNavigate();
    const [bookings, setBookings] = useState([]);
    const [view, setView] = useState('list');
    useEffect(() => {
        bookingsApi.list().then(setBookings).catch(() => { });
    }, []);
    const upcoming = bookings.filter((b) => b.status !== 'CANCELLED' && b.status !== 'COMPLETED' && b.date >= dayjs().format('YYYY-MM-DD'));
    const past = bookings.filter((b) => b.status === 'COMPLETED' || b.date < dayjs().format('YYYY-MM-DD'));
    return (_jsxs("div", { style: { minHeight: '100dvh', background: 'var(--color-bg)' }, children: [_jsx(PageHeader, { title: "\u0417\u0430\u043F\u0438\u0441\u0438", back: false }), _jsx("div", { style: { padding: '12px 16px', display: 'flex', gap: 8 }, children: ['list', 'calendar'].map((v) => (_jsx("button", { onClick: () => setView(v), style: {
                        flex: 1, padding: '8px 0', borderRadius: 'var(--radius-sm)', fontSize: 14, fontWeight: 500,
                        background: view === v ? 'var(--color-primary)' : 'var(--color-card)',
                        color: view === v ? '#fff' : 'var(--color-text)',
                        border: '1px solid var(--color-border)',
                    }, children: v === 'list' ? 'Список' : 'Календарь' }, v))) }), _jsxs("div", { style: { padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }, children: [_jsx(Button, { variant: "secondary", onClick: () => navigate('/bookings/new'), fullWidth: true, children: "+ \u0421\u043E\u0437\u0434\u0430\u0442\u044C \u0437\u0430\u043F\u0438\u0441\u044C" }), upcoming.length > 0 && (_jsx(Section, { title: "\u041F\u0440\u0435\u0434\u0441\u0442\u043E\u044F\u0449\u0438\u0435", children: upcoming.map((b) => _jsx(BookingCard, { booking: b, onClick: () => navigate(`/bookings/${b.id}`) }, b.id)) })), past.length > 0 && (_jsx(Section, { title: "\u041F\u0440\u043E\u0448\u043B\u044B\u0435", children: past.map((b) => _jsx(BookingCard, { booking: b, onClick: () => navigate(`/bookings/${b.id}`) }, b.id)) })), bookings.length === 0 && (_jsx("div", { style: { textAlign: 'center', color: 'var(--color-text-secondary)', marginTop: 40 }, children: "\u041D\u0435\u0442 \u0437\u0430\u043F\u0438\u0441\u0435\u0439" }))] })] }));
}
function Section({ title, children }) {
    return (_jsxs("div", { children: [_jsx("div", { style: { fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 8, textTransform: 'uppercase' }, children: title }), _jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 8 }, children: children })] }));
}
function BookingCard({ booking: b, onClick }) {
    return (_jsx(Card, { onClick: onClick, children: _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }, children: [_jsxs("div", { children: [_jsx("div", { style: { fontWeight: 600 }, children: b.client.name }), _jsxs("div", { style: { color: 'var(--color-text-secondary)', fontSize: 14, marginTop: 2 }, children: [b.service.name, " \u00B7 ", dayjs(b.date).format('D MMM'), " \u0432 ", b.time] })] }), _jsx("span", { style: { fontSize: 12, fontWeight: 500, color: STATUS_COLORS[b.status] }, children: STATUS_LABELS[b.status] })] }) }));
}
