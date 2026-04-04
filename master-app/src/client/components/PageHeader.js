import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useNavigate } from 'react-router-dom';
export default function PageHeader({ title, back = true, right }) {
    const navigate = useNavigate();
    return (_jsxs("header", { style: {
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '16px 16px 12px',
            background: 'var(--color-card)',
            borderBottom: '1px solid var(--color-border)',
            position: 'sticky', top: 0, zIndex: 10,
        }, children: [back && (_jsx("button", { onClick: () => navigate(-1), style: { background: 'none', fontSize: 20, color: 'var(--color-primary)' }, children: "\u2190" })), _jsx("h1", { style: { fontSize: 17, fontWeight: 600, flex: 1 }, children: title }), right] }));
}
