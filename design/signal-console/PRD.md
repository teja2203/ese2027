# Signal Console — Preview PRD

## Problem

The existing Nothing Premium proof establishes a visual language, but it reads as
a component/celebration lab rather than the primary daily study experience. Too
many red effects compete with the next study action.

## Success criteria

- Within three seconds, a student can identify the current session, completion
  state, and the single next action.
- Starting Focus takes one tap from Today.
- The interface retains the ESE monochrome + red-signal identity without relying
  on decorative motion or visual noise.
- Keyboard users can operate every interactive preview control; focus is visible
  and reduced-motion users receive no nonessential animation.

## Scope

Interactive design preview only: the Today mission view, Focus space, session
completion feedback, and a compact navigation rail. It uses representative ESE
content and does not modify schedules, storage, timers, notifications, or app
production routes.

## Constraints

- Preserve OLED black, warm white, one red signal, mono/display typography,
  hairline geometry, 44px touch controls, and reduced-motion support.
- No gradients, glassmorphism, ornamental backdrops, new dependencies, or data
  model changes.
- The active red signal is reserved for the primary action, active session,
  progress, and earned completion.

## Plan

1. Replace the component-lab presentation with a daily mission screen.
2. Add a distraction-free Focus surface reached from the primary action.
3. Model task completion, session progress, and session completion feedback.
4. Review mobile layout, keyboard operation, and reduced-motion behavior.

## Open questions

- Should Focus include strict/distraction controls in its secondary command rail,
  or only expose them in the main application settings?
- Is the red signal universally preferred, or should the selectable lime/ice
  suits remain visually equal in the production implementation?
