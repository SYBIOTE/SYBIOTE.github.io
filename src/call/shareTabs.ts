/** Sections that open in the call's shared screen */
export const SHARE_TABS = ['portfolio', 'resume', 'services', 'contact'] as const
export type ShareTab = (typeof SHARE_TABS)[number]

export const isShareTab = (id: string | null): id is ShareTab => !!id && (SHARE_TABS as readonly string[]).includes(id)
