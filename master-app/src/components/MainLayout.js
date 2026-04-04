import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';
export default function MainLayout() {
    return (_jsxs("div", { style: { minHeight: '100dvh', background: 'var(--color-bg)', paddingBottom: 60 }, children: [_jsx(Outlet, {}), _jsx(BottomNav, {})] }));
}
