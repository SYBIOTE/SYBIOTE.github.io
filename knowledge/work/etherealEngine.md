# The company and my role

Ethereal Engine was an open-source engine for the social spatial web: multiplayer 3D worlds with avatars, world editing, XR support and WebRTC networking, all in the browser, written in TypeScript with React and Three.js on an entity component system. Infinite Reality acquired it, and it became IR Engine. I joined in February 2023 as a full-stack WebXR engineer.

<!-- Who you reported to, team size, why you joined: add if you want. -->

# What I built

- Visual scripting, built on behave-graph, so non-programmers could script scenes in the editor. I wrote much of the node library: nodes to get and set any component or state, query and event nodes, action nodes, spline nodes and XR session nodes, plus making graphs reactive to the engine's state. I also contributed to behave-graph itself.
- A rewrite of the transform gizmo, the move, rotate and scale handles in the editor, later refactored onto the engine's ECS.
- Editor features like primitive geometry, post-processing in the component shelf, and many fixes to the file browser, like pagination and shift and ctrl click selection the way desktop file browsers work.
- Unit tests for scene loading and editor snapshots.
- On the backend, I led the move of platform services from Express to Koa.

# Hard problems and decisions

<!-- Add a story: e.g. designing the visual scripting node model, or the Express to Koa migration (how you measured -60% response time and 3x throughput). -->

# Stack

TypeScript, React, Three.js, an ECS architecture with Hookstate for state, behave-graph for visual scripting, Node.js with Koa.

# What I learned / why I moved on

I didn't move on so much as come along: the engine was acquired by Infinite Reality and I kept building it there.

<!-- Sources: ~80 merged PRs in ir-engine/etherealengine-archive (Aug 2023 - Feb 2024), the resume. -->
