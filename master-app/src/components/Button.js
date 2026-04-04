import { jsx as _jsx } from "react/jsx-runtime";
const styles = {
    primary: {
        background: 'var(--color-primary)',
        color: '#fff',
    },
    secondary: {
        background: 'var(--color-primary-light)',
        color: 'var(--color-primary)',
    },
    danger: {
        background: 'transparent',
        color: 'var(--color-danger)',
    },
    ghost: {
        background: 'transparent',
        color: 'var(--color-primary)',
    },
};
export default function Button({ children, onClick, variant = 'primary', fullWidth, disabled, type = 'button', style, }) {
    return (_jsx("button", { type: type, onClick: onClick, disabled: disabled, style: {
            ...styles[variant],
            width: fullWidth ? '100%' : undefined,
            padding: '13px 20px',
            borderRadius: 'var(--radius)',
            fontSize: 15,
            fontWeight: 600,
            opacity: disabled ? 0.5 : 1,
            transition: 'opacity 0.15s',
            ...style,
        }, children: children }));
}
