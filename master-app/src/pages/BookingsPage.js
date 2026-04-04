import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import { bookingsApi } from '@/api/bookings.api';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
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
const sortByDateTime = (a, b) => {
    const cmp = b.date.localeCompare(a.date);
    return cmp !== 0 ? cmp : b.time.localeCompare(a.time);
};
export default function BookingsPage() {
    const navigate = useNavigate();
    const [bookings, setBookings] = useState([]);
    const [view, setView] = useState('list');
    const [refreshing, setRefreshing] = useState(false);
    const load = () => bookingsApi.list().then(setBookings).catch(() => { });
    useEffect(() => { load(); }, []);
    const refresh = () => {
        setRefreshing(true);
        bookingsApi.list().then(setBookings).catch(() => { }).finally(() => setRefreshing(false));
    };
    const today = dayjs().format('YYYY-MM-DD');
    const upcoming = bookings
        .filter((b) => b.status !== 'CANCELLED' && b.status !== 'COMPLETED' && b.date >= today)
        .sort(sortByDateTime);
    const past = bookings
        .filter((b) => b.status === 'COMPLETED' || b.date < today)
        .sort(sortByDateTime);
    const headerRight = (_jsxs(_Fragment, { children: [_jsx("button", { onClick: refresh, style: { background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: 'var(--color-primary)', WebkitTapHighlightColor: 'transparent' }, children: _jsx("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", xmlns: "http://www.w3.org/2000/svg", style: { display: 'block', transform: refreshing ? 'rotate(360deg)' : 'none', transition: refreshing ? 'transform 0.5s linear' : 'none' }, children: _jsx("path", { d: "M2 12C2 6.477 6.477 2 12 2c3.09 0 5.859 1.352 7.75 3.5L22 8M22 2v6h-6M22 12c0 5.523-4.477 10-10 10-3.09 0-5.859-1.352-7.75-3.5L2 16M2 22v-6h6", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }) }) }), _jsx("button", { onClick: () => navigate('/bookings/new'), style: { background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: 'var(--color-primary)', WebkitTapHighlightColor: 'transparent' }, children: _jsx("svg", { width: "22", height: "22", viewBox: "0 0 24 24", fill: "none", xmlns: "http://www.w3.org/2000/svg", style: { display: 'block' }, children: _jsx("path", { d: "M12 5v14M5 12h14", stroke: "currentColor", strokeWidth: "2.5", strokeLinecap: "round" }) }) })] }));
    return (_jsxs("div", { style: { minHeight: '100dvh', background: 'var(--color-bg)' }, children: [_jsx(PageHeader, { title: "\u0417\u0430\u043F\u0438\u0441\u0438", back: false, right: headerRight }), _jsx("div", { style: { padding: '12px 16px', display: 'flex', gap: 8 }, children: ['list', 'calendar'].map((v) => (_jsx("button", { onClick: () => setView(v), style: {
                        flex: 1, padding: '8px 0', borderRadius: 'var(--radius-sm)', fontSize: 14, fontWeight: 500,
                        background: view === v ? 'var(--color-primary)' : 'var(--color-card)',
                        color: view === v ? '#fff' : 'var(--color-text)',
                        border: '1px solid var(--color-border)',
                    }, children: v === 'list' ? 'Список' : 'Календарь' }, v))) }), _jsx("div", { style: { padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }, children: view === 'calendar' ? (_jsx(CalendarView, { bookings: bookings, onBookingClick: (id) => navigate(`/bookings/${id}`) })) : (_jsxs(_Fragment, { children: [upcoming.length > 0 && (_jsx(Section, { title: "\u041F\u0440\u0435\u0434\u0441\u0442\u043E\u044F\u0449\u0438\u0435", children: upcoming.map((b) => _jsx(BookingCard, { booking: b, onClick: () => navigate(`/bookings/${b.id}`) }, b.id)) })), past.length > 0 && (_jsx(Section, { title: "\u041F\u0440\u043E\u0448\u043B\u044B\u0435", children: past.map((b) => _jsx(BookingCard, { booking: b, onClick: () => navigate(`/bookings/${b.id}`) }, b.id)) })), bookings.length === 0 && (_jsx("div", { style: { textAlign: 'center', color: 'var(--color-text-secondary)', marginTop: 40 }, children: "\u041D\u0435\u0442 \u0437\u0430\u043F\u0438\u0441\u0435\u0439" }))] })) })] }));
}
function Section({ title, children }) {
    return (_jsxs("div", { children: [_jsx("div", { style: { fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 8, textTransform: 'uppercase' }, children: title }), _jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 8 }, children: children })] }));
}
function BookingCard({ booking: b, onClick }) {
    return (_jsx(Card, { onClick: onClick, children: _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }, children: [_jsxs("div", { children: [_jsx("div", { style: { fontWeight: 600 }, children: b.client.name }), _jsxs("div", { style: { color: 'var(--color-text-secondary)', fontSize: 14, marginTop: 2 }, children: [b.service.name, " \u00B7 ", dayjs(b.date).format('D MMM'), " \u0432 ", b.time] })] }), _jsx("span", { style: { fontSize: 12, fontWeight: 500, color: STATUS_COLORS[b.status] }, children: STATUS_LABELS[b.status] })] }) }));
}
function CalendarView({ bookings, onBookingClick }) {
    const [current, setCurrent] = useState(dayjs());
    const [selectedDate, setSelectedDate] = useState(null);
    const startOfMonth = current.startOf('month');
    const daysInMonth = current.daysInMonth();
    // ISO: 1=Пн, 7=Вс — сдвиг стартового дня
    const startDow = startOfMonth.day() === 0 ? 6 : startOfMonth.day() - 1;
    const bookingsByDate = bookings.reduce((acc, b) => {
        if (!acc[b.date])
            acc[b.date] = [];
        acc[b.date].push(b);
        return acc;
    }, {});
    const selectedBookings = selectedDate ? (bookingsByDate[selectedDate] ?? []) : [];
    return (_jsxs("div", { children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }, children: [_jsx("button", { onClick: () => setCurrent(c => c.subtract(1, 'month')), style: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--color-primary)', padding: '4px 8px' }, children: "\u2039" }), _jsx("span", { style: { fontWeight: 600, fontSize: 16, textTransform: 'capitalize' }, children: current.format('MMMM YYYY') }), _jsx("button", { onClick: () => setCurrent(c => c.add(1, 'month')), style: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--color-primary)', padding: '4px 8px' }, children: "\u203A" })] }), _jsx("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }, children: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(d => (_jsx("div", { style: { textAlign: 'center', fontSize: 11, color: 'var(--color-text-secondary)', padding: '4px 0' }, children: d }, d))) }), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }, children: [Array.from({ length: startDow }).map((_, i) => _jsx("div", {}, `e${i}`)), Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = i + 1;
                        const date = current.date(day).format('YYYY-MM-DD');
                        const isToday = date === dayjs().format('YYYY-MM-DD');
                        const isSelected = date === selectedDate;
                        const hasBkg = !!bookingsByDate[date];
                        const count = bookingsByDate[date]?.filter(b => b.status !== 'CANCELLED').length ?? 0;
                        return (_jsxs("div", { onClick: () => setSelectedDate(isSelected ? null : date), style: {
                                aspectRatio: '1',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: 8,
                                cursor: 'pointer',
                                background: isSelected
                                    ? 'var(--color-primary)'
                                    : isToday
                                        ? 'var(--color-card2)'
                                        : 'transparent',
                                border: isToday && !isSelected ? '1px solid var(--color-primary)' : '1px solid transparent',
                                position: 'relative',
                            }, children: [_jsx("span", { style: {
                                        fontSize: 14,
                                        fontWeight: isToday || isSelected ? 600 : 400,
                                        color: isSelected ? '#fff' : 'var(--color-text)',
                                    }, children: day }), count > 0 && (_jsx("div", { style: {
                                        width: 5, height: 5, borderRadius: '50%', marginTop: 1,
                                        background: isSelected ? 'rgba(255,255,255,0.8)' : 'var(--color-primary)',
                                    } }))] }, day));
                    })] }), selectedDate && (_jsxs("div", { style: { marginTop: 16 }, children: [_jsx("div", { style: { fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 8, textTransform: 'uppercase' }, children: dayjs(selectedDate).format('D MMMM') }), selectedBookings.length === 0
                        ? _jsx("div", { style: { color: 'var(--color-text-secondary)', fontSize: 14, textAlign: 'center', padding: '12px 0' }, children: "\u041D\u0435\u0442 \u0437\u0430\u043F\u0438\u0441\u0435\u0439" })
                        : selectedBookings.map(b => (_jsx(BookingCard, { booking: b, onClick: () => onBookingClick(b.id) }, b.id)))] }))] }));
}
