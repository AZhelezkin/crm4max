import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { scheduleApi } from '@/api/schedule.api';
import PageHeader from '@/components/PageHeader';
import Button from '@/components/Button';
import Input from '@/components/Input';
const DAYS = [
    { value: 1, label: 'Пн' },
    { value: 2, label: 'Вт' },
    { value: 3, label: 'Ср' },
    { value: 4, label: 'Чт' },
    { value: 5, label: 'Пт' },
    { value: 6, label: 'Сб' },
    { value: 7, label: 'Вс' },
];
export default function SchedulePage() {
    const [schedule, setSchedule] = useState(null);
    const [workingDays, setWorkingDays] = useState([1, 2, 3, 4, 5]);
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('20:00');
    const [breakStart, setBreakStart] = useState('');
    const [breakEnd, setBreakEnd] = useState('');
    const [buffer, setBuffer] = useState('0');
    const [saving, setSaving] = useState(false);
    useEffect(() => {
        scheduleApi.get().then((s) => {
            if (!s)
                return;
            setSchedule(s);
            setWorkingDays(s.workingDays);
            setStartTime(s.startTime);
            setEndTime(s.endTime);
            setBreakStart(s.breakStart ?? '');
            setBreakEnd(s.breakEnd ?? '');
            setBuffer(String(s.bufferMinutes));
        }).catch(() => { });
    }, []);
    const toggleDay = (day) => {
        setWorkingDays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort());
    };
    const handleSave = async () => {
        setSaving(true);
        try {
            const updated = await scheduleApi.upsert({
                workingDays,
                startTime,
                endTime,
                breakStart: breakStart || undefined,
                breakEnd: breakEnd || undefined,
                bufferMinutes: Number(buffer),
            });
            setSchedule(updated);
        }
        finally {
            setSaving(false);
        }
    };
    return (_jsxs("div", { style: { minHeight: '100dvh', background: 'var(--color-bg)' }, children: [_jsx(PageHeader, { title: "\u0413\u0440\u0430\u0444\u0438\u043A \u0440\u0430\u0431\u043E\u0442\u044B" }), _jsxs("div", { style: { padding: 16, display: 'flex', flexDirection: 'column', gap: 20 }, children: [_jsxs("div", { children: [_jsx("div", { style: { fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 8, fontWeight: 500 }, children: "\u0420\u0430\u0431\u043E\u0447\u0438\u0435 \u0434\u043D\u0438" }), _jsx("div", { style: { display: 'flex', gap: 8 }, children: DAYS.map((d) => (_jsx("button", { onClick: () => toggleDay(d.value), style: {
                                        flex: 1,
                                        padding: '10px 0',
                                        borderRadius: 'var(--radius-sm)',
                                        fontSize: 14,
                                        fontWeight: 500,
                                        background: workingDays.includes(d.value) ? 'var(--color-primary)' : 'var(--color-card)',
                                        color: workingDays.includes(d.value) ? '#fff' : 'var(--color-text)',
                                        border: '1px solid var(--color-border)',
                                    }, children: d.label }, d.value))) })] }), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }, children: [_jsx(Input, { label: "\u041D\u0430\u0447\u0430\u043B\u043E", value: startTime, onChange: setStartTime, placeholder: "09:00" }), _jsx(Input, { label: "\u041A\u043E\u043D\u0435\u0446", value: endTime, onChange: setEndTime, placeholder: "20:00" })] }), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }, children: [_jsx(Input, { label: "\u041F\u0435\u0440\u0435\u0440\u044B\u0432 \u0441", value: breakStart, onChange: setBreakStart, placeholder: "13:00" }), _jsx(Input, { label: "\u041F\u0435\u0440\u0435\u0440\u044B\u0432 \u0434\u043E", value: breakEnd, onChange: setBreakEnd, placeholder: "14:00" })] }), _jsx(Input, { label: "\u0411\u0443\u0444\u0435\u0440 \u043C\u0435\u0436\u0434\u0443 \u043A\u043B\u0438\u0435\u043D\u0442\u0430\u043C\u0438 (\u043C\u0438\u043D)", value: buffer, onChange: setBuffer, placeholder: "0", type: "number" }), _jsx(Button, { onClick: handleSave, disabled: saving, fullWidth: true, children: saving ? 'Сохраняем...' : 'Сохранить' })] })] }));
}
