import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function Input({ label, value, onChange, placeholder, type = 'text', multiline }) {
    const inputStyle = {
        width: '100%',
        padding: '12px 14px',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-sm)',
        fontSize: 15,
        background: '#fff',
        color: 'var(--color-text)',
        resize: 'none',
    };
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 6 }, children: [label && _jsx("label", { style: { fontSize: 13, color: 'var(--color-text-secondary)', fontWeight: 500 }, children: label }), multiline ? (_jsx("textarea", { value: value, onChange: (e) => onChange(e.target.value), placeholder: placeholder, rows: 3, style: inputStyle })) : (_jsx("input", { type: type, value: value, onChange: (e) => onChange(e.target.value), placeholder: placeholder, style: inputStyle }))] }));
}
