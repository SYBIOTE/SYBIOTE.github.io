import { Bone, Quaternion, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'

import { attachHeadMotion, createHeadMotion, nod, updateHeadMotion } from './headMotion'

const still = { x: 0, y: 0 }

describe('headMotion', () => {
  it('nods down and comes back to rest', () => {
    const head = createHeadMotion()
    expect(nod(head, 1000, 'short')).toBe(true)
    const pitches = Array.from({ length: 40 }, (_, i) => updateHeadMotion(head, 1000 + i * 16, 0.016, still).pitch)
    expect(Math.max(...pitches)).toBeGreaterThan((2 * Math.PI) / 180)
    expect(updateHeadMotion(head, 3000, 0.016, still).pitch).toBe(0)
  })

  it('does not stack nods that come too close together', () => {
    const head = createHeadMotion()
    nod(head, 1000, 'beat', 900)
    expect(nod(head, 1500, 'beat', 900)).toBe(false)
    expect(nod(head, 2000, 'beat', 900)).toBe(true)
  })

  it('turns the head a little towards where the eyes look', () => {
    const head = createHeadMotion()
    let pose = updateHeadMotion(head, 0, 0.016, still)
    for (let t = 0; t < 2000; t += 16) pose = updateHeadMotion(head, t, 0.016, { x: 0.4, y: 0.3 })
    expect(pose.yaw).toBeGreaterThan(0)
    expect(pose.pitch).toBeLessThan(0)
  })

  it('does not build up on frames where the clip leaves the bone alone', () => {
    const head = new Bone()
    head.name = 'head'
    new Bone().add(head)
    // A paused or held clip: the mixer writes nothing
    const mixer = { update: () => undefined }
    const renderer = { mixer, viewer: { skinModel: { skeleton: { bones: [head] } } } }
    attachHeadMotion(renderer, () => ({ pitch: 0.1, yaw: 0, roll: 0 }))
    for (let i = 0; i < 50; i++) mixer.update()
    expect(head.quaternion.angleTo(new Quaternion())).toBeCloseTo(0.1, 6)
  })

  it('applies the pose after the mixer has posed the skeleton', () => {
    const neck = new Bone()
    const head = new Bone()
    head.name = 'head'
    neck.add(head)
    // The parent is turned, so the world-space nod has to be converted into its space
    neck.quaternion.setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2)
    const mixer = { update: () => head.quaternion.identity() }
    const renderer = { mixer, viewer: { skinModel: { skeleton: { bones: [neck, head] } } } }
    expect(attachHeadMotion(renderer, () => ({ pitch: 0.1, yaw: 0, roll: 0 }))).toBe(true)
    mixer.update()
    const world = head.getWorldQuaternion(new Quaternion())
    const parent = neck.getWorldQuaternion(new Quaternion())
    // World rotation = nod about world x, then the parent's turn
    const expected = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), 0.1).multiply(parent)
    expect(world.angleTo(expected)).toBeLessThan(1e-6)
  })
})
