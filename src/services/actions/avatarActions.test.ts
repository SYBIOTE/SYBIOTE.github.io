import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AvatarUIState, parseActions, runAvatarAction } from './avatarActions'

const projects = new Set(['assetHub', 'nirvanaAnimate'])

describe('parseActions', () => {
  it('strips tags and returns actions in order', () => {
    const { text, actions } = parseActions('Here is AssetHub [[show_project:assetHub]]. Also my resume [[open:resume]]!', projects)
    expect(text).toBe('Here is AssetHub. Also my resume!')
    expect(actions).toEqual([
      { type: 'show_project', id: 'assetHub' },
      { type: 'open_section', section: 'resume' }
    ])
  })

  it('keeps the leading space breaths rely on when concatenated', () => {
    expect(parseActions(' Sure thing [[emote:happy]].').text).toBe(' Sure thing.')
  })

  it('drops invalid or unknown tags without reading them out', () => {
    const { text, actions } = parseActions('Look [[show_project:madeUp]] here [[dance]] and [[open:kitchen]].', projects)
    expect(text).toBe('Look here and.')
    expect(actions).toEqual([])
  })

  it('is lenient about spacing and case', () => {
    expect(parseActions('x [[ OPEN : contact ]]').actions).toEqual([{ type: 'open_section', section: 'contact' }])
  })

  it('leaves text without tags untouched', () => {
    expect(parseActions('No tags, [just brackets].')).toEqual({ text: 'No tags, [just brackets].', actions: [] })
  })
})

describe('runAvatarAction', () => {
  beforeEach(() => AvatarUIState.set({ openSectionId: null, focusProjectId: null }))
  const context = { performEmotion: vi.fn() }

  it('show_project opens the portfolio focused on the project', () => {
    runAvatarAction({ type: 'show_project', id: 'assetHub' }, context)
    expect(AvatarUIState.get()).toEqual({ openSectionId: 'portfolio', focusProjectId: 'assetHub' })
  })

  it('close resets everything', () => {
    runAvatarAction({ type: 'open_section', section: 'resume' }, context)
    runAvatarAction({ type: 'close' }, context)
    expect(AvatarUIState.get()).toEqual({ openSectionId: null, focusProjectId: null })
  })

  it('emote is forwarded to the emotion system', () => {
    runAvatarAction({ type: 'emote', emotion: 'happy' }, context)
    expect(context.performEmotion).toHaveBeenCalledWith('happy')
  })
})
