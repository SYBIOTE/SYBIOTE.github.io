
# autoV

autoV is prompt-to-VFX for real-time games that stays editable. I built it as an engineer on Team V for the TAI x OpenAI 100-Hour Game Builder Challenge in 2026, in the game dev tools track, where it won second place and $25,000 in OpenAI credits. Most prompt-to-VFX tools give you a video, and a video isn't a visual effect: you can't retime it, recolor it or drop it into an engine. In autoV the model never writes code. It designs a bounded, declarative effect document, with layers, tracks, colors, emission shapes and timing, and a fixed Three.js renderer runs it. Every effect is rendered and critiqued before you see it, a chat edit only touches one layer in one time window, and effects export as JSON or a single-file HTML player. I worked on the agent pipeline and its tools, the reference canvas, the UI and projects page, and the exporters and plugins for Godot, Unity and Unreal Engine.

Built with Next.js, Three.js, OpenAI structured outputs and Supabase.

<!-- Sources: the autoV README and your merged PRs (Sep 2026). -->
