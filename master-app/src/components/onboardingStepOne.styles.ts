import type { CSSProperties } from 'react'

export const stepOneIntroTextStyle: CSSProperties = {
  fontSize: 14,
  color: 'var(--color-text-secondary)',
  textAlign: 'center',
  marginBottom: 4,
}

export const stepOnePhotoContainerStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  marginBottom: 8,
}

export const stepOnePhotoButtonBaseStyle: CSSProperties = {
  width: 110,
  height: 110,
  borderRadius: '50%',
  border: 'none',
  padding: 0,
  background: '#2C2D31',
  position: 'relative',
  overflow: 'hidden',
}

export const stepOnePhotoPlaceholderStyle: CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
}

export const stepOnePhotoPreviewStyle: CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
}

export const stepOneTextareaWrapStyle: CSSProperties = {
  position: 'relative',
}

export const stepOneTextareaStyle: CSSProperties = {
  width: '100%',
  background: 'none',
  border: 'none',
  padding: '14px 16px 24px',
  fontSize: 16,
  color: 'var(--color-text)',
  resize: 'none',
  display: 'block',
  outline: 'none',
}

export const stepOneCounterStyle: CSSProperties = {
  position: 'absolute',
  bottom: 8,
  right: 12,
  fontSize: 12,
  color: 'var(--color-text-secondary)',
}

export const stepOneAddressButtonStyle: CSSProperties = {
  width: '100%',
  background: 'var(--color-card2)',
  border: 'none',
  cursor: 'pointer',
  textAlign: 'left',
  padding: '15px 20px 17px',
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  borderRadius: 10,
}

export const stepOneAddressContentStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
}

export const stepOneAddressTitleStyle: CSSProperties = {
  fontWeight: 500,
  fontSize: 16,
  color: 'var(--color-text)',
  letterSpacing: -0.16,
  lineHeight: '22px',
}

export const stepOneAddressHintStyle: CSSProperties = {
  fontSize: 13,
  color: 'var(--color-text-secondary)',
  letterSpacing: 0.15,
  lineHeight: '16px',
  marginTop: 1,
}
