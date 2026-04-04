import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import { paymentsApi } from '@/api/payments.api';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
dayjs.locale('ru');
const METHOD_LABELS = {
    CARD: 'Карта',
    VK_PAY: 'VK Pay',
};
const STATUS_COLORS = {
    PAID: 'var(--color-success)',
    DEPOSIT_PAID: '#FF9500',
    UNPAID: 'var(--color-text-secondary)',
};
export default function PaymentsPage() {
    const [payments, setPayments] = useState([]);
    useEffect(() => {
        paymentsApi.list().then(setPayments).catch(() => { });
    }, []);
    const total = payments
        .filter((p) => p.status === 'PAID')
        .reduce((sum, p) => sum + p.amount, 0);
    return (_jsxs("div", { style: { minHeight: '100dvh', background: 'var(--color-bg)' }, children: [_jsx(PageHeader, { title: "\u0414\u043E\u0445\u043E\u0434", back: false }), _jsxs("div", { style: { padding: 16 }, children: [_jsxs(Card, { style: { marginBottom: 16, textAlign: 'center' }, children: [_jsx("div", { style: { color: 'var(--color-text-secondary)', fontSize: 13 }, children: "\u0418\u0442\u043E\u0433\u043E \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u043E" }), _jsxs("div", { style: { fontSize: 28, fontWeight: 700, marginTop: 4 }, children: [(total / 100).toLocaleString('ru-RU'), " \u20BD"] })] }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 8 }, children: [payments.map((p) => (_jsx(Card, { children: _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsxs("div", { children: [_jsxs("div", { style: { fontWeight: 500 }, children: [(p.amount / 100).toLocaleString('ru-RU'), " \u20BD"] }), _jsxs("div", { style: { color: 'var(--color-text-secondary)', fontSize: 13, marginTop: 2 }, children: [METHOD_LABELS[p.method], " \u00B7 ", dayjs(p.createdAt).format('D MMM HH:mm')] })] }), _jsx("span", { style: { fontSize: 12, fontWeight: 500, color: STATUS_COLORS[p.status] }, children: p.status === 'PAID' ? 'Оплачено' : p.status === 'DEPOSIT_PAID' ? 'Депозит' : 'Не оплачено' })] }) }, p.id))), payments.length === 0 && (_jsx("div", { style: { textAlign: 'center', color: 'var(--color-text-secondary)', marginTop: 40 }, children: "\u041D\u0435\u0442 \u043F\u043B\u0430\u0442\u0435\u0436\u0435\u0439" }))] })] })] }));
}
