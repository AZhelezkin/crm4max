import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useNavigate } from 'react-router-dom';
export default function PageHeader({ title, back = true, onBack, right }) {
    const navigate = useNavigate();
    const handleBack = () => {
        if (onBack)
            onBack();
        else
            navigate(-1);
    };
    return (_jsxs("header", { style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 16px 12px',
            background: 'var(--color-card)',
            borderBottom: '1px solid var(--color-border)',
            position: 'sticky',
            top: 0,
            zIndex: 10,
        }, children: [_jsx("div", { style: { display: 'flex', alignItems: 'center' }, children: back && (_jsx("button", { onClick: handleBack, style: { background: 'none', fontSize: 20, color: 'var(--color-primary)', lineHeight: 1 }, children: "\u2190" })) }), _jsx("h1", { style: { fontSize: 17, fontWeight: 600, position: 'absolute', left: 0, right: 0, textAlign: 'center', pointerEvents: 'none' }, children: title }), _jsx("div", { style: { display: 'flex', gap: 4, alignItems: 'center' }, children: right })] }));
}
