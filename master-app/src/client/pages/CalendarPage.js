import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import { mastersApi } from '@client/api/masters.api';
import { useBookingStore } from '@client/store/booking.store';
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
function isWorkingDay(day, schedule) {
    if (!schedule)
        return true;
    const isoDay = day.day() || 7;
    return schedule.workingDays.includes(isoDay);
}
export default function CalendarPage() {
    const navigate = useNavigate();
    const { masterId, service, date, time, remind, setDateTime, setRemind } = useBookingStore();
    const today = dayjs().startOf('day');
    const [step, setStep] = useState('date');
    const [schedule, setSchedule] = useState(null);
    const [selectedDate, setSelectedDate] = useState(date || today.format('YYYY-MM-DD'));
    const [slots, setSlots] = useState([]);
    const [slotsLoading, setSlotsLoading] = useState(false);
    useEffect(() => {
        if (masterId) {
            mastersApi.getById(masterId)
                .then((m) => setSchedule(m.schedule))
                .catch(() => { });
        }
    }, [masterId]);
    useEffect(() => {
        if (step === 'time' && masterId && service && selectedDate) {
            setSlotsLoading(true);
            mastersApi.getSlots(masterId, selectedDate, service.id)
                .then(setSlots)
                .catch(() => setSlots([]))
                .finally(() => setSlotsLoading(false));
        }
    }, [step, masterId, service, selectedDate]);
    const handleSelectDate = (d) => {
        const val = d.format('YYYY-MM-DD');
        setSelectedDate(val);
        setDateTime(val, '');
        setStep('time');
    };
    const handleSelectTime = (t) => {
        setDateTime(selectedDate, t);
    };
    const handleNext = () => navigate('/book/confirm');
    const selectedTime = time && date === selectedDate ? time : '';
    const selectedDayjs = dayjs(selectedDate);
    const months = [0, 1, 2].map((offset) => today.startOf('month').add(offset, 'month'));
    return (_jsxs("div", { style: { minHeight: '100dvh', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column' }, children: [_jsxs("div", { style: {
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '48px 16px 12px',
                    background: 'var(--color-bg)',
                    position: 'sticky', top: 0, zIndex: 10,
                }, children: [_jsx("button", { onClick: () => step === 'time' ? setStep('date') : navigate(-1), style: { width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none' }, children: _jsx("svg", { width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", children: _jsx("path", { d: "M9.57 5.93L3.5 12l6.07 6.07M20.5 12H3.67", stroke: "#007AFE", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" }) }) }), _jsxs("div", { style: { textAlign: 'center' }, children: [_jsx("div", { style: { fontWeight: 600, fontSize: 17, color: 'var(--color-text)' }, children: step === 'date' ? 'Выберите дату' : 'Выберите время' }), service && (_jsx("div", { style: { color: 'var(--color-text-secondary)', fontSize: 13 }, children: service.name }))] }), _jsx("button", { onClick: () => navigate('/'), style: {
                            width: 30, height: 30,
                            background: 'var(--color-card)', borderRadius: 8,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }, children: _jsx("svg", { width: "14", height: "14", viewBox: "0 0 14 14", fill: "none", children: _jsx("path", { d: "M1 1l12 12M13 1L1 13", stroke: "#7D7D7F", strokeWidth: "1.5", strokeLinecap: "round" }) }) })] }), step === 'date' && (_jsx("div", { style: { flex: 1, overflowY: 'auto', padding: '0 16px 32px' }, children: months.map((monthStart) => (_jsxs("div", { style: { marginBottom: 28 }, children: [_jsx("div", { style: {
                                fontSize: 15, fontWeight: 600, color: 'var(--color-text)',
                                marginBottom: 10, textTransform: 'capitalize',
                            }, children: monthStart.format('MMMM YYYY') }), _jsx("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }, children: DAY_NAMES.map((d) => (_jsx("div", { style: { textAlign: 'center', fontSize: 13, color: 'var(--color-text-secondary)', padding: '4px 0' }, children: d }, d))) }), buildMonthGrid(monthStart.year(), monthStart.month()).map((week, wi) => (_jsx("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 2 }, children: week.map((day, di) => {
                                if (!day)
                                    return _jsx("div", {}, di);
                                const val = day.format('YYYY-MM-DD');
                                const isPast = day.isBefore(today);
                                const isToday = day.isSame(today);
                                const isSelected = val === selectedDate;
                                const working = isWorkingDay(day, schedule);
                                const disabled = isPast || !working;
                                let bg = 'transparent';
                                if (isSelected)
                                    bg = '#007AFE';
                                else if (!disabled)
                                    bg = 'rgba(0,122,254,0.12)';
                                return (_jsxs("button", { onClick: () => !disabled && handleSelectDate(day), disabled: disabled, style: {
                                        width: 55, height: 54, borderRadius: '50%', margin: '0 auto',
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 15, fontWeight: isToday ? 700 : 400,
                                        background: bg,
                                        color: disabled ? '#3A3A3C' : isSelected ? '#fff' : 'var(--color-text)',
                                        border: isToday && !isSelected ? '1px solid #007AFE' : 'none',
                                        position: 'relative',
                                    }, children: [day.date(), isToday && !isSelected && (_jsx("span", { style: {
                                                position: 'absolute', bottom: 6, left: '50%', transform: 'translateX(-50%)',
                                                width: 4, height: 4, borderRadius: '50%', background: 'var(--color-danger)',
                                            } }))] }, val));
                            }) }, wi)))] }, monthStart.format('YYYY-MM')))) })), step === 'time' && (_jsxs("div", { style: { flex: 1, overflowY: 'auto', padding: '0 16px 24px' }, children: [_jsxs("div", { style: {
                            background: 'var(--color-card)', borderRadius: 'var(--radius)',
                            padding: '14px 16px',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            marginBottom: 24,
                        }, children: [_jsxs("div", { children: [_jsx("div", { style: { fontWeight: 600, fontSize: 17, color: 'var(--color-text)' }, children: selectedDayjs.format('D MMMM, dddd') }), _jsx("div", { style: { color: 'var(--color-text-secondary)', fontSize: 13, marginTop: 2 }, children: "\u0414\u0430\u0442\u0430" })] }), _jsx("button", { onClick: () => setStep('date'), style: { background: 'none' }, children: _jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", children: [_jsx("path", { d: "M12 20h9", stroke: "#7D7D7F", strokeWidth: "2", strokeLinecap: "round" }), _jsx("path", { d: "M16.5 3.5l4 4L7 21H3v-4L16.5 3.5z", stroke: "#7D7D7F", strokeWidth: "2", strokeLinejoin: "round" })] }) })] }), _jsx("div", { style: { fontSize: 14, color: 'var(--color-text-secondary)', fontWeight: 400, marginBottom: 12, letterSpacing: 0.5 }, children: "\u0421\u0412\u041E\u0411\u041E\u0414\u041D\u042B\u0415 \u0421\u041B\u041E\u0422\u042B" }), slotsLoading ? (_jsx("div", { style: { textAlign: 'center', color: 'var(--color-text-secondary)', padding: '32px 0' }, children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430..." })) : slots.length === 0 ? (_jsx("div", { style: { textAlign: 'center', color: 'var(--color-text-secondary)', padding: '32px 0' }, children: "\u041D\u0435\u0442 \u0441\u0432\u043E\u0431\u043E\u0434\u043D\u044B\u0445 \u0441\u043B\u043E\u0442\u043E\u0432" })) : (_jsx("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 24 }, children: slots.map((s) => {
                            const isSel = selectedTime === s;
                            return (_jsx("button", { onClick: () => handleSelectTime(s), style: {
                                    padding: '14px 0', borderRadius: 'var(--radius-sm)',
                                    fontSize: 15, fontWeight: 500,
                                    background: isSel ? '#007AFE' : 'var(--color-card)',
                                    color: isSel ? '#fff' : 'var(--color-text)',
                                }, children: s }, s));
                        }) })), _jsxs("div", { style: {
                            background: 'var(--color-card)', borderRadius: 'var(--radius)',
                            padding: '14px 16px',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            marginBottom: 24,
                        }, children: [_jsxs("div", { children: [_jsx("div", { style: { fontWeight: 500, fontSize: 17, color: 'var(--color-text)' }, children: "\u041D\u0430\u043F\u043E\u043C\u043D\u0438\u0442\u044C \u0437\u0430 1 \u0447\u0430\u0441" }), _jsx("div", { style: { color: 'var(--color-text-secondary)', fontSize: 13, marginTop: 2 }, children: "\u0411\u043E\u0442 \u043D\u0430\u043F\u0438\u0448\u0435\u0442 \u0432 MAX" })] }), _jsx("button", { onClick: () => setRemind(!remind), style: {
                                    width: 51, height: 31, borderRadius: 16,
                                    background: remind ? '#007AFE' : '#3A3A3C',
                                    position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                                }, children: _jsx("span", { style: {
                                        position: 'absolute', top: 3,
                                        left: remind ? 23 : 3,
                                        width: 25, height: 25, borderRadius: '50%',
                                        background: '#fff', transition: 'left 0.2s',
                                    } }) })] }), _jsx("button", { onClick: handleNext, disabled: !selectedTime, style: {
                            width: '100%', padding: 16, borderRadius: 'var(--radius-btn)',
                            background: selectedTime ? '#007AFE' : 'var(--color-card)',
                            color: selectedTime ? '#fff' : 'var(--color-text-secondary)',
                            fontWeight: 600, fontSize: 17,
                        }, children: "\u041F\u0440\u043E\u0434\u043E\u043B\u0436\u0438\u0442\u044C" })] }))] }));
}
