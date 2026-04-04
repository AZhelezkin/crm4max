import { jsx as _jsx } from "react/jsx-runtime";
export default function Card({ children, style, onClick }) {
    return (_jsx("div", { onClick: onClick, style: {
            background: 'var(--color-card)',
            borderRadius: 'var(--radius)',
            padding: '14px 16px',
            cursor: onClick ? 'pointer' : undefined,
            ...style,
        }, children: children }));
}
