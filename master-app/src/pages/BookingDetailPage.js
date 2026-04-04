import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import { bookingsApi } from '@/api/bookings.api';
import { mastersApi } from '@/api/masters.api';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import Button from '@/components/Button';
dayjs.locale('ru');
export default function BookingDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [booking, setBooking] = useState(null);
    const [reschedule, setReschedule] = useState(false);
    const [newDate, setNewDate] = useState('');
    const [newTime, setNewTime] = useState('');
    const [slots, setSlots] = useState([]);
    useEffect(() => {
        if (id)
            bookingsApi.getById(id).then(setBooking).catch(() => { });
    }, [id]);
    useEffect(() => {
        if (reschedule && newDate && booking) {
            mastersApi.getSlots(booking.master.id, newDate, booking.service.id)
                .then(setSlots)
                .catch(() => setSlots([]));
        }
    }, [reschedule, newDate, booking]);
    if (!booking)
        return null;
    const canAct = booking.status === 'PENDING' || booking.status === 'CONFIRMED';
    const handleConfirmPayment = async () => {
        const updated = await bookingsApi.confirmPayment(booking.id);
        setBooking(updated);
    };
    const handleReschedule = async () => {
        if (!newDate || !newTime)
            return;
        const updated = await bookingsApi.reschedule(booking.id, { date: newDate, time: newTime });
        setBooking(updated);
        setReschedule(false);
    };
    const handleCancel = async () => {
        const updated = await bookingsApi.cancel(booking.id);
        setBooking(updated);
        navigate('/bookings');
    };
    return (_jsxs("div", { style: { minHeight: '100dvh', background: 'var(--color-bg)' }, children: [_jsx(PageHeader, { title: "\u0417\u0430\u043F\u0438\u0441\u044C" }), _jsxs("div", { style: { padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }, children: [_jsxs(Card, { children: [_jsx(Row, { label: "\u041A\u043B\u0438\u0435\u043D\u0442", value: booking.client.name }), _jsx(Row, { label: "\u0423\u0441\u043B\u0443\u0433\u0430", value: booking.service.name }), _jsx(Row, { label: "\u0414\u0430\u0442\u0430", value: dayjs(booking.date).format('D MMMM (ddd)') }), _jsx(Row, { label: "\u0412\u0440\u0435\u043C\u044F", value: booking.time }), _jsx(Row, { label: "\u0421\u0442\u043E\u0438\u043C\u043E\u0441\u0442\u044C", value: (booking.service.price / 100).toLocaleString('ru-RU') + ' ₽' }), _jsx(Row, { label: "\u041E\u043F\u043B\u0430\u0442\u0430", value: PAYMENT_LABELS[booking.paymentStatus], last: true })] }), canAct && (_jsxs(_Fragment, { children: [booking.paymentStatus !== 'PAID' && (_jsx(Button, { onClick: handleConfirmPayment, fullWidth: true, children: "\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044C \u043E\u043F\u043B\u0430\u0442\u0443" })), !reschedule ? (_jsx(Button, { variant: "secondary", onClick: () => setReschedule(true), fullWidth: true, children: "\u041F\u0435\u0440\u0435\u043D\u0435\u0441\u0442\u0438" })) : (_jsxs(Card, { children: [_jsx("div", { style: { fontWeight: 600, marginBottom: 12 }, children: "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043D\u043E\u0432\u0443\u044E \u0434\u0430\u0442\u0443 \u0438 \u0432\u0440\u0435\u043C\u044F" }), _jsx("input", { type: "date", value: newDate, onChange: (e) => setNewDate(e.target.value), style: { width: '100%', padding: '12px', borderRadius: 8, border: '1px solid var(--color-border)', marginBottom: 12 } }), slots.length > 0 && (_jsx("div", { style: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }, children: slots.map((s) => (_jsx("button", { onClick: () => setNewTime(s), style: {
                                                padding: '8px 14px', borderRadius: 8, fontSize: 14, fontWeight: 500,
                                                background: newTime === s ? 'var(--color-primary)' : 'var(--color-bg)',
                                                color: newTime === s ? '#fff' : 'var(--color-text)',
                                                border: '1px solid var(--color-border)',
                                            }, children: s }, s))) })), _jsxs("div", { style: { display: 'flex', gap: 8 }, children: [_jsx(Button, { onClick: handleReschedule, fullWidth: true, disabled: !newDate || !newTime, children: "\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044C" }), _jsx(Button, { variant: "secondary", onClick: () => setReschedule(false), fullWidth: true, children: "\u041E\u0442\u043C\u0435\u043D\u0430" })] })] })), _jsx(Button, { variant: "danger", onClick: handleCancel, fullWidth: true, children: "\u041E\u0442\u043C\u0435\u043D\u0438\u0442\u044C \u0437\u0430\u043F\u0438\u0441\u044C" })] }))] })] }));
}
const PAYMENT_LABELS = {
    UNPAID: 'Не оплачено',
    DEPOSIT_PAID: 'Депозит внесён',
    PAID: 'Оплачено',
};
function Row({ label, value, last }) {
    return (_jsxs("div", { style: {
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '10px 0',
            borderBottom: last ? 'none' : '1px solid var(--color-border)',
        }, children: [_jsx("span", { style: { color: 'var(--color-text-secondary)', fontSize: 14 }, children: label }), _jsx("span", { style: { fontWeight: 500 }, children: value })] }));
}
