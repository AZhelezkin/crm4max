import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { bookingsApi } from '@/api/bookings.api';
import { servicesApi } from '@/api/services.api';
import { useAuthStore } from '@/store/auth.store';
import PageHeader from '@/components/PageHeader';
import Input from '@/components/Input';
import Button from '@/components/Button';
export default function CreateBookingPage() {
    const navigate = useNavigate();
    const { master } = useAuthStore();
    const [services, setServices] = useState([]);
    const [serviceId, setServiceId] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [clientName, setClientName] = useState('');
    const [slots, setSlots] = useState([]);
    const [saving, setSaving] = useState(false);
    useEffect(() => {
        servicesApi.list().then(setServices).catch(() => { });
    }, []);
    useEffect(() => {
        if (master?.id && serviceId && date) {
            fetch(`/api/schedule/${master.id}/slots?date=${date}&serviceId=${serviceId}`)
                .then((r) => r.json())
                .then(setSlots)
                .catch(() => { });
        }
    }, [master?.id, serviceId, date]);
    const handleSave = async () => {
        if (!master || !serviceId || !date || !time)
            return;
        setSaving(true);
        try {
            await bookingsApi.create({
                masterId: master.id,
                serviceId,
                date,
                time,
            });
            navigate('/bookings');
        }
        finally {
            setSaving(false);
        }
    };
    return (_jsxs("div", { style: { minHeight: '100dvh', background: 'var(--color-bg)' }, children: [_jsx(PageHeader, { title: "\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u0437\u0430\u043F\u0438\u0441\u044C" }), _jsxs("div", { style: { padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }, children: [_jsxs("div", { children: [_jsx("div", { style: { fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 6, fontWeight: 500 }, children: "\u0423\u0441\u043B\u0443\u0433\u0430" }), _jsxs("select", { value: serviceId, onChange: (e) => setServiceId(e.target.value), style: { width: '100%', padding: '12px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', fontSize: 15 }, children: [_jsx("option", { value: "", children: "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0443\u0441\u043B\u0443\u0433\u0443" }), services.map((s) => (_jsxs("option", { value: s.id, children: [s.name, " \u2014 ", s.durationMin, " \u043C\u0438\u043D"] }, s.id)))] })] }), _jsx(Input, { label: "\u041A\u043B\u0438\u0435\u043D\u0442", value: clientName, onChange: setClientName, placeholder: "\u0418\u043C\u044F \u043A\u043B\u0438\u0435\u043D\u0442\u0430" }), _jsxs("div", { children: [_jsx("div", { style: { fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 6, fontWeight: 500 }, children: "\u0414\u0430\u0442\u0430" }), _jsx("input", { type: "date", value: date, onChange: (e) => setDate(e.target.value), style: { width: '100%', padding: '12px', borderRadius: 8, border: '1px solid var(--color-border)', fontSize: 15 } })] }), slots.length > 0 && (_jsxs("div", { children: [_jsx("div", { style: { fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 6, fontWeight: 500 }, children: "\u0412\u0440\u0435\u043C\u044F" }), _jsx("div", { style: { display: 'flex', flexWrap: 'wrap', gap: 8 }, children: slots.map((s) => (_jsx("button", { onClick: () => setTime(s), style: {
                                        padding: '10px 16px', borderRadius: 8, fontSize: 15, fontWeight: 500,
                                        background: time === s ? 'var(--color-primary)' : 'var(--color-card)',
                                        color: time === s ? '#fff' : 'var(--color-text)',
                                        border: '1px solid var(--color-border)',
                                    }, children: s }, s))) })] })), _jsx(Button, { onClick: handleSave, disabled: saving || !serviceId || !date || !time, fullWidth: true, children: saving ? 'Сохраняем...' : 'Сохранить' })] })] }));
}
