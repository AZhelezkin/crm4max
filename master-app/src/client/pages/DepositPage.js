import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useNavigate, useSearchParams } from 'react-router-dom';
import bridge from '@vkontakte/vk-bridge';
import { useBookingStore } from '@client/store/booking.store';
import PageHeader from '@client/components/PageHeader';
import Card from '@client/components/Card';
import Button from '@client/components/Button';
export default function DepositPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { service } = useBookingStore();
    const bookingId = searchParams.get('bookingId') ?? '';
    const depositAmount = Number(searchParams.get('amount') ?? 0);
    const handlePay = async () => {
        try {
            await bridge.send('VKWebAppOpenPayForm', {
                app_id: Number(import.meta.env.VITE_VK_APP_ID),
                action: 'pay-to-service',
                params: {
                    amount: depositAmount,
                    description: `Депозит: ${service?.name ?? ''}`,
                    payload: JSON.stringify({ bookingId }),
                },
            });
            navigate('/book/success');
        }
        catch {
            // Пользователь отменил оплату
        }
    };
    return (_jsxs("div", { style: { minHeight: '100dvh', background: 'var(--color-bg)' }, children: [_jsx(PageHeader, { title: "\u0414\u0435\u043F\u043E\u0437\u0438\u0442" }), _jsxs("div", { style: { padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }, children: [_jsxs(Card, { style: { textAlign: 'center', padding: '24px 16px' }, children: [_jsx("div", { style: { fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 8 }, children: "\u0414\u043B\u044F \u0431\u0440\u043E\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u044F \u0442\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F \u0434\u0435\u043F\u043E\u0437\u0438\u0442" }), _jsxs("div", { style: { fontSize: 32, fontWeight: 700 }, children: [(depositAmount / 100).toLocaleString('ru-RU'), " \u20BD"] })] }), _jsx(Button, { onClick: handlePay, fullWidth: true, children: "\u041E\u043F\u043B\u0430\u0442\u0438\u0442\u044C" }), _jsx("div", { style: { textAlign: 'center' }, children: _jsx("button", { onClick: () => navigate(-1), style: { background: 'none', color: 'var(--color-text-secondary)', fontSize: 14 }, children: "\u041F\u0440\u0430\u0432\u0438\u043B\u0430 \u043E\u0442\u043C\u0435\u043D\u044B" }) })] })] }));
}
