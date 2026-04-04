import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CategoriesServicesEditor from '@/components/CategoriesServicesEditor';
export default function ServicesPage() {
    const navigate = useNavigate();
    const editorRef = useRef(null);
    const [title, setTitle] = useState('Категории услуг');
    const handleBack = () => {
        if (editorRef.current?.subStep === 'services') {
            editorRef.current.goToCategories();
        }
        else {
            navigate(-1);
        }
    };
    return (_jsxs("div", { style: { height: '100dvh', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', padding: '14px 4px 0', flexShrink: 0 }, children: [_jsx("button", { onClick: handleBack, style: { width: 56, display: 'flex', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', padding: 0 }, children: _jsx(BackArrowIcon, {}) }), _jsx("div", { style: { flex: 1, textAlign: 'center', fontSize: 20, fontWeight: 600, color: 'var(--color-text)', letterSpacing: -0.3 }, children: title }), _jsx("div", { style: { width: 56 } })] }), _jsx(CategoriesServicesEditor, { ref: editorRef, onSubStepChange: (ss, catName) => setTitle(ss === 'services' ? (catName ?? 'Услуги') : 'Категории услуг') })] }));
}
function BackArrowIcon() {
    return (_jsx("svg", { width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", children: _jsx("path", { d: "M15 18l-6-6 6-6", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }) }));
}
