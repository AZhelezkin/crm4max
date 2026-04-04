import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { mastersApi } from '@/api/masters.api';
import PageHeader from '@/components/PageHeader';
import Input from '@/components/Input';
import Button from '@/components/Button';
import Card from '@/components/Card';
export default function PaymentSettingsPage() {
    const { master, setMaster } = useAuthStore();
    const [cardNumber, setCardNumber] = useState(master?.cardNumber ?? '');
    const [saving, setSaving] = useState(false);
    const handleSaveCard = async () => {
        setSaving(true);
        try {
            const updated = await mastersApi.updatePayment({ cardNumber });
            setMaster({ ...master, ...updated });
        }
        finally {
            setSaving(false);
        }
    };
    const handleLinkVkPay = async () => {
        setSaving(true);
        try {
            const updated = await mastersApi.updatePayment({ vkPayLinked: true });
            setMaster({ ...master, ...updated });
        }
        finally {
            setSaving(false);
        }
    };
    return (_jsxs("div", { style: { minHeight: '100dvh', background: 'var(--color-bg)' }, children: [_jsx(PageHeader, { title: "\u041A\u0430\u0440\u0442\u0430 \u0434\u043B\u044F \u043E\u043F\u043B\u0430\u0442\u044B" }), _jsxs("div", { style: { padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }, children: [_jsxs(Card, { children: [_jsx(Input, { label: "\u041D\u043E\u043C\u0435\u0440 \u043A\u0430\u0440\u0442\u044B", value: cardNumber, onChange: setCardNumber, placeholder: "0000 0000 0000 0000", type: "tel" }), _jsx(Button, { onClick: handleSaveCard, disabled: saving, fullWidth: true, style: { marginTop: 12 }, children: "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C" })] }), _jsxs(Card, { style: { textAlign: 'center' }, children: [_jsx("div", { style: { color: 'var(--color-text-secondary)', fontSize: 14, marginBottom: 12 }, children: master?.vkPayLinked ? '✅ VK Pay привязан' : 'Привяжите VK Pay для приёма оплат' }), !master?.vkPayLinked && (_jsx(Button, { variant: "secondary", onClick: handleLinkVkPay, disabled: saving, fullWidth: true, children: "\u041F\u0440\u0438\u0432\u044F\u0437\u0430\u0442\u044C VK Pay" }))] })] })] }));
}
