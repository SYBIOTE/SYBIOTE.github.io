# The company and my role

Infinite Reality acquired Ethereal Engine for 75 million dollars, and the engine became IR Engine, with IR Studio as its browser-based world editor. I was a full-stack WebXR engineer there from February 2024 to August 2025, mostly on IR Studio.

# What I built

- Code scripting in IR Studio: I integrated the Monaco editor, the editor behind VS Code, so creators could write scripts in the browser, then added multi-script editing and example scripts. I also moved visual scripting into its own package and rebuilt it for the new studio.
- Gizmos: a camera gizmo, gizmo presets, helpers that show only for the selected object, new visualizer icons for lights and spawn points, and one standard way to create gizmos across the engine.
- Studio UI: lots of the editor's panels and inputs, from the hierarchy panel (reordering, search, adding directly into it) and the asset panel to inputs like rotation fields that work in quaternions with smooth angle display, keyboard shortcuts and accessibility for dialogs.
- Rendering: lit and unlit view modes, scene complexity checks that warn creators before a scene gets too heavy, thumbnail and environment map generation for publishing, skybox fixes, shadow and particle system fixes.

# Hard problems and decisions

<!-- Add a story: e.g. making gizmos precise (the resume says editing got 50% faster), or the engine-wide refactor behind -20% build size and +15% frame performance. -->

# Stack

TypeScript, React, Three.js, the engine's ECS, Monaco editor, Tailwind.

# What I learned / why I moved on

<!-- Add if you want: why you left in 2025 and moved to AssetHub. -->

<!-- Sources: ~80 merged PRs in ir-engine/ir-engine (Feb 2024 - Jul 2025), the resume. -->
