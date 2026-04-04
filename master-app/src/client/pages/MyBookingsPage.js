import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import { bookingsApi } from '@client/api/bookings.api';
import BottomNav from '@client/components/BottomNav';
dayjs.locale('ru');
const DAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
function buildMonthGrid(year, month) {
    const firstDay = dayjs(new Date(year, month, 1));
    const startOffset = (firstDay.day() || 7) - 1;
    const daysInMonth = firstDay.daysInMonth();
    const cells = [
        ...Array(startOffset).fill(null),
        ...Array.from({ length: daysInMonth }, (_, i) => firstDay.add(i, 'day')),
    ];
    while (cells.length % 7 !== 0)
        cells.push(null);
    const weeks = [];
    for (let i = 0; i < cells.length; i += 7)
        weeks.push(cells.slice(i, i + 7));
    return weeks;
}
export default function MyBookingsPage() {
    const navigate = useNavigate();
    const [bookings, setBookings] = useState([]);
    const today = dayjs();
    const [viewMonth, setViewMonth] = useState(today.startOf('month'));
    const [selectedDate, setSelectedDate] = useState(null);
    useEffect(() => {
        bookingsApi.list().then(setBookings).catch(() => { });
    }, []);
    const bookedDates = new Set(bookings.map((b) => b.date));
    const upcomingCount = bookings.filter((b) => b.status !== 'CANCELLED' && b.status !== 'COMPLETED' && b.date >= today.format('YYYY-MM-DD')).length;
    const sortedBookings = [...bookings].sort((a, b) => (a.date + ' ' + a.time).localeCompare(b.date + ' ' + b.time));
    const displayedBookings = selectedDate
        ? sortedBookings.filter((b) => b.date === selectedDate)
        : sortedBookings;
    const isPast = (b) => dayjs(b.date + ' ' + b.time).isBefore(today) || b.status === 'COMPLETED' || b.status === 'CANCELLED';
    return (_jsxs("div", { style: { minHeight: '100dvh', background: 'var(--color-bg)', paddingBottom: 95 }, children: [_jsxs("div", { style: { padding: '48px 16px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx("div", { style: { fontSize: 22, fontWeight: 700, color: 'var(--color-text)' }, children: today.format('D MMMM, YYYY') }), _jsx("div", { style: { display: 'flex', gap: 8 }, children: _jsx("button", { style: {
                                background: 'var(--color-card)', borderRadius: 'var(--radius-sm)',
                                width: 36, height: 36,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }, children: _jsxs("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", children: [_jsx("circle", { cx: "11", cy: "11", r: "7", stroke: "#7D7D7F", strokeWidth: "2" }), _jsx("path", { d: "M16.5 16.5l4 4", stroke: "#7D7D7F", strokeWidth: "2", strokeLinecap: "round" })] }) }) })] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px 8px' }, children: [_jsx("button", { onClick: () => setViewMonth((m) => m.subtract(1, 'month')), style: { background: 'none', padding: '4px 8px' }, children: _jsx("svg", { width: "9", height: "16", viewBox: "0 0 9 16", fill: "none", children: _jsx("path", { d: "M8 1L1 8l7 7", stroke: "#007AFE", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" }) }) }), _jsx("span", { style: { fontWeight: 600, color: 'var(--color-text-secondary)', fontSize: 15, textTransform: 'capitalize' }, children: viewMonth.format('MMMM YYYY') }), _jsx("button", { onClick: () => setViewMonth((m) => m.add(1, 'month')), style: { background: 'none', padding: '4px 8px' }, children: _jsx("svg", { width: "9", height: "16", viewBox: "0 0 9 16", fill: "none", children: _jsx("path", { d: "M1 1l7 7-7 7", stroke: "#007AFE", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" }) }) })] }), _jsxs("div", { style: { padding: '0 16px 16px' }, children: [_jsx("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }, children: DAY_NAMES.map((d) => (_jsx("div", { style: { textAlign: 'center', fontSize: 13, color: 'var(--color-text-secondary)', padding: '4px 0' }, children: d }, d))) }), buildMonthGrid(viewMonth.year(), viewMonth.month()).map((week, wi) => (_jsx("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 2 }, children: week.map((day, di) => {
                            if (!day)
                                return _jsx("div", {}, di);
                            const val = day.format('YYYY-MM-DD');
                            const isToday = day.isSame(today, 'day');
                            const isSelected = val === selectedDate;
                            const hasBooking = bookedDates.has(val);
                            let bg = 'transparent';
                            if (isSelected)
                                bg = '#007AFE';
                            else if (isToday)
                                bg = 'rgba(0,122,254,0.15)';
                            return (_jsxs("button", { onClick: () => setSelectedDate(isSelected ? null : val), style: {
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                    width: 55, height: 54, borderRadius: '50%', margin: '0 auto',
                                    background: bg,
                                    border: isToday && !isSelected ? '1px solid #007AFE' : 'none',
                                }, children: [_jsx("span", { style: {
                                            fontSize: 15, fontWeight: isToday ? 700 : 400,
                                            color: isSelected ? '#fff' : 'var(--color-text)', lineHeight: 1,
                                        }, children: day.date() }), hasBooking ? (_jsx("span", { style: {
                                            width: 5, height: 5, borderRadius: '50%',
                                            background: isSelected ? '#fff' : 'var(--color-danger)',
                                            marginTop: 2, display: 'block',
                                        } })) : (_jsx("span", { style: { width: 5, height: 5, marginTop: 2, display: 'block' } }))] }, val));
                        }) }, wi)))] }), _jsxs("div", { style: { padding: '0 16px' }, children: [_jsxs("div", { style: {
                            fontSize: 14, color: 'var(--color-text-secondary)', fontWeight: 400, marginBottom: 12,
                            display: 'flex', alignItems: 'center', gap: 8,
                        }, children: ["\u041C\u041E\u0418 \u0417\u0410\u041F\u0418\u0421\u0418", upcomingCount > 0 && (_jsx("span", { style: {
                                    background: 'rgba(0,122,254,0.30)', color: '#007AFE',
                                    borderRadius: 20, padding: '2px 8px',
                                    fontSize: 15, fontWeight: 400, minWidth: 23, textAlign: 'center',
                                }, children: upcomingCount }))] }), displayedBookings.length === 0 ? (_jsx("div", { style: { textAlign: 'center', color: 'var(--color-text-secondary)', marginTop: 32 }, children: selectedDate ? 'Нет записей на этот день' : 'Нет записей' })) : (_jsx("div", { style: { display: 'flex', flexDirection: 'column' }, children: displayedBookings.map((b, idx) => {
                            const past = isPast(b);
                            const dateLabel = dayjs(b.date).format('D MMM');
                            return (_jsxs("button", { onClick: () => navigate(`/my-bookings/${b.id}`), style: {
                                    display: 'flex', alignItems: 'flex-start', gap: 16,
                                    padding: '12px 0',
                                    borderBottom: idx < displayedBookings.length - 1 ? '1px solid var(--color-border)' : 'none',
                                    textAlign: 'left', background: 'none', width: '100%',
                                }, children: [_jsxs("div", { style: { minWidth: 50, flexShrink: 0, color: 'var(--color-text-secondary)' }, children: [_jsx("div", { style: { fontSize: 15, fontWeight: 400 }, children: dateLabel }), _jsx("div", { style: { fontSize: 15, fontWeight: 400 }, children: b.time })] }), _jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsx("div", { style: {
                                                    fontSize: 19, fontWeight: 500,
                                                    color: past ? 'var(--color-text-secondary)' : 'var(--color-text)',
                                                    textDecoration: past ? 'line-through' : 'none',
                                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                }, children: b.service.name }), _jsx("div", { style: { fontSize: 15, fontWeight: 400, color: 'var(--color-text-secondary)', marginTop: 2 }, children: b.master.name })] })] }, b.id));
                        }) }))] }), _jsx(BottomNav, { badge: { bookings: upcomingCount } })] }));
}
