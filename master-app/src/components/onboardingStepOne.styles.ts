import type { CSSProperties } from 'react'
import { text } from '@/styles/typography'

export const stepOneIntroTextStyle: CSSProperties = {
  ...text.action,
  color: 'var(--color-on-surface-secondary)',
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
  background: 'var(--color-divider-low)',
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

export const servicePhotoPlaceholderStyle: CSSProperties = {
  width: '112%',
  height: '112%',
  objectFit: 'cover',
}

export const serviceWorkPhotoAddIconStyle: CSSProperties = {
  width: 46,
  height: 46,
}

export const stepOneTextareaWrapStyle: CSSProperties = {
  position: 'relative',
}

export const stepOneTextareaStyle: CSSProperties = {
  width: '100%',
  background: 'none',
  border: 'none',
  padding: '14px 16px 24px',
  ...text.subheadRegular,
  color: 'var(--color-on-surface)',
  resize: 'none',
  display: 'block',
  outline: 'none',
}

export const stepOneCounterStyle: CSSProperties = {
  position: 'absolute',
  bottom: 8,
  right: 12,
  ...text.caption,
  color: 'var(--color-on-surface-secondary)',
}

export const onboardingFieldWrapStyle: CSSProperties = {
  width: '100%',
  background: 'var(--color-secondary-surface)',
  borderRadius: 10,
}

export const onboardingFieldWithSuffixWrapStyle: CSSProperties = {
  width: '100%',
  background: 'var(--color-secondary-surface)',
  borderRadius: 10,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  paddingRight: 16,
}

export const onboardingFieldInputStyle: CSSProperties = {
  width: '100%',
  border: 'none',
  outline: 'none',
  background: 'transparent',
  color: 'var(--color-on-surface)',
  ...text.subheadRegular,
  fontWeight: 500,
  lineHeight: '22px',
  letterSpacing: -0.16,
  padding: '15px 16px 17px',
}

export const onboardingFieldSuffixStyle: CSSProperties = {
  flexShrink: 0,
  ...text.subheadRegular,
  fontWeight: 500,
  lineHeight: '22px',
  letterSpacing: -0.16,
  color: 'var(--color-on-surface-secondary)',
}

export const onboardingSectionCardStyle: CSSProperties = {
  background: 'var(--color-surface)',
  borderRadius: 20,
  padding: '16px 14px 14px',
}

export const onboardingSectionLabelStyle: CSSProperties = {
  ...text.caption,
  fontWeight: 600,
  color: 'var(--color-on-surface-secondary)',
  letterSpacing: 0.5,
  marginBottom: 12,
}

export const onboardingPortalContentStyle: CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: '16px 16px 0',
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
}

export const onboardingSplitFieldsStyle: CSSProperties = {
  display: 'flex',
  gap: 8,
}

export const onboardingInlineFieldStyle: CSSProperties = {
  flex: 1,
}

export const onboardingSelectWrapStyle: CSSProperties = {
  position: 'relative',
}

export const onboardingSelectStyle: CSSProperties = {
  width: '100%',
  background: 'var(--color-secondary-surface)',
  border: 'none',
  borderRadius: 10,
  padding: '15px 44px 17px 16px',
  ...text.subheadRegular,
  fontWeight: 500,
  lineHeight: '22px',
  letterSpacing: -0.16,
  color: 'var(--color-on-surface)',
  cursor: 'pointer',
  appearance: 'none',
  outline: 'none',
}

export const onboardingSelectChevronStyle: CSSProperties = {
  position: 'absolute',
  right: 14,
  top: '50%',
  transform: 'translateY(-50%)',
  color: 'var(--color-on-surface-secondary)',
  pointerEvents: 'none',
}

export const onboardingTimeSelectWrapStyle: CSSProperties = {
  flex: 1,
  background: 'var(--color-secondary-surface)',
  borderRadius: 10,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 4,
  padding: '15px 8px 17px',
}

export const onboardingTimeSelectStyle: CSSProperties = {
  background: 'none',
  border: 'none',
  ...text.subheadRegular,
  fontWeight: 500,
  lineHeight: '22px',
  letterSpacing: -0.16,
  color: 'var(--color-on-surface)',
  cursor: 'pointer',
  outline: 'none',
}

export const onboardingToggleRowStyle: CSSProperties = {
  background: 'var(--color-surface)',
  borderRadius: 20,
  padding: '14px 16px',
  display: 'flex',
  alignItems: 'center',
  gap: 12,
}

export const onboardingToggleLabelStyle: CSSProperties = {
  ...text.subheadRegular,
  fontWeight: 500,
  lineHeight: '22px',
  letterSpacing: -0.16,
  color: 'var(--color-on-surface)',
}

export const onboardingListCardStyle: CSSProperties = {
  width: '100%',
  background: 'var(--color-surface)',
  borderRadius: 20,
  overflow: 'hidden',
}

export const onboardingListButtonStyle: CSSProperties = {
  width: '100%',
  background: 'var(--color-surface)',
  border: 'none',
  borderRadius: 20,
  padding: '14px 16px',
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  cursor: 'pointer',
  textAlign: 'left',
}

export const onboardingListMediaStyle: CSSProperties = {
  width: 48,
  height: 48,
  borderRadius: 24,
  overflow: 'hidden',
  background: 'var(--color-secondary-surface)',
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

export const onboardingListTitleStyle: CSSProperties = {
  ...text.subheadRegular,
  fontWeight: 500,
  lineHeight: '22px',
  letterSpacing: -0.16,
  color: 'var(--color-on-surface)',
}

export const onboardingListSubtitleStyle: CSSProperties = {
  ...text.footnote,
  color: 'var(--color-on-surface-secondary)',
  letterSpacing: 0.15,
  lineHeight: '16px',
  marginTop: 1,
}

export const onboardingListActionButtonStyle: CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: 4,
  flexShrink: 0,
}

export const onboardingPriceRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  marginTop: 6,
  flexWrap: 'wrap',
}

export const onboardingDiscountBadgeStyle: CSSProperties = {
  background: 'var(--color-error-surface-accented)',
  color: 'var(--color-on-primary-surface)',
  fontSize: 10,
  fontWeight: 700,
  borderRadius: 6,
  padding: '2px 6px',
}

export const stepOneAddressButtonStyle: CSSProperties = {
  width: '100%',
  background: 'var(--color-secondary-surface)',
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
  ...text.subhead,
  color: 'var(--color-on-surface)',
  letterSpacing: -0.16,
}

export const stepOneAddressHintStyle: CSSProperties = {
  ...text.footnote,
  color: 'var(--color-on-surface-secondary)',
  letterSpacing: 0.15,
  lineHeight: '16px',
  marginTop: 1,
}

export const stepOneAddressInputWrapStyle: CSSProperties = {
  width: '100%',
  background: 'var(--color-secondary-surface)',
  borderRadius: 10,
  position: 'relative',
}

export const stepOneAddressInputStyle: CSSProperties = {
  width: '100%',
  border: 'none',
  outline: 'none',
  background: 'transparent',
  color: 'var(--color-on-surface)',
  ...text.subheadRegular,
  fontWeight: 500,
  lineHeight: '22px',
  letterSpacing: -0.16,
  padding: '15px 20px 17px 52px',
}

export const stepOneAddressInputIconStyle: CSSProperties = {
  position: 'absolute',
  left: 20,
  top: '50%',
  transform: 'translateY(-50%)',
  pointerEvents: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

export const primaryActionButtonBaseStyle: CSSProperties = {
  width: '100%',
  height: 48,
  border: 'none',
  borderRadius: 20,
  ...text.subheadRegular,
  fontWeight: 600,
}
