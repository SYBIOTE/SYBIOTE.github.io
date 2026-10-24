// Small stroke icons for the call UI (24px grid, currentColor)
import type { ReactNode, SVGProps } from 'react'

const Icon = ({ children, ...props }: SVGProps<SVGSVGElement> & { children: ReactNode }) => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    {children}
  </svg>
)

export const MicIcon = () => (
  <Icon>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
  </Icon>
)

export const MicOffIcon = () => (
  <Icon>
    <path d="M15 10V6a3 3 0 0 0-5.7-1.3M9 9v2a3 3 0 0 0 4.6 2.5M5 11a7 7 0 0 0 11.3 5.5M19 11a7 7 0 0 1-.6 2.8M12 18v3M3 3l18 18" />
  </Icon>
)

export const ChatIcon = () => (
  <Icon>
    <path d="M4 5h16v11H9l-5 4z" />
  </Icon>
)

export const ScreenIcon = () => (
  <Icon>
    <rect x="3" y="4" width="18" height="13" rx="2" />
    <path d="M12 17v4M8 21h8" />
  </Icon>
)

export const HandIcon = () => (
  <Icon>
    {/* nudged to sit optically centred */}
    <path transform="translate(1.6 0.5)" d="M8 13V5.5a1.5 1.5 0 0 1 3 0V11M11 10V4.5a1.5 1.5 0 0 1 3 0V11M14 10.5V6a1.5 1.5 0 0 1 3 0v8a6 6 0 0 1-6 6h-.5A5.5 5.5 0 0 1 5.6 17L3.8 13a1.5 1.5 0 0 1 2.6-1.5L8 14" />
  </Icon>
)

export const PhoneDownIcon = () => (
  <Icon>
    <path transform="translate(0 -1.9)" d="M3 14.5c5.3-4.7 12.7-4.7 18 0l-2.3 2.7-3.4-1.6v-2.7a10 10 0 0 0-6.6 0v2.7l-3.4 1.6z" />
  </Icon>
)

export const CloseIcon = () => (
  <Icon>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icon>
)

export const BackIcon = () => (
  <Icon>
    <path d="M15 5l-7 7 7 7" />
  </Icon>
)

export const SendIcon = () => (
  <Icon>
    <path d="M5 12h13M13 6l6 6-6 6" />
  </Icon>
)

export const CameraIcon = () => (
  <Icon>
    <rect x="3" y="6" width="13" height="12" rx="2" />
    <path d="M16 10.5 21 7v10l-5-3.5" />
  </Icon>
)

export const CameraOffIcon = () => (
  <Icon>
    <path d="M10 6h4a2 2 0 0 1 2 2v3.5L21 7v10l-3-2.1M16 16a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2M3 3l18 18" />
  </Icon>
)

export const CaptionsIcon = () => (
  <Icon>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M10.5 10.2a2.2 2.2 0 1 0 0 3.6M17 10.2a2.2 2.2 0 1 0 0 3.6" />
  </Icon>
)

export const InfoIcon = () => (
  <Icon>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 8h.01" />
  </Icon>
)

export const PeopleIcon = () => (
  <Icon>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3 19c.6-3.2 3-5 6-5s5.4 1.8 6 5M16 5.2a3 3 0 0 1 0 5.6M18 14.3c1.5.7 2.6 2.3 3 4.7" />
  </Icon>
)

export const MoreIcon = () => (
  <Icon>
    <circle cx="12" cy="5.5" r="1.2" fill="currentColor" />
    <circle cx="12" cy="12" r="1.2" fill="currentColor" />
    <circle cx="12" cy="18.5" r="1.2" fill="currentColor" />
  </Icon>
)
