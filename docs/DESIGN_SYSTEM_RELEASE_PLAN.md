# Design System Release Plan

Phase-based rollout release plan for the web redesign.

## Release Cadence

- **Cycle length:** 2 weeks per phase (Sprint A + Sprint B)
- **Promotion flow:** Dev branch -> QA validation -> release candidate -> production
- **Rollback policy:** Revert the phase batch if token/shell regressions affect core flows

## Freeze Windows

- **Token freeze:** after Phase 1 completion, token changes require explicit approval
- **Shell freeze:** after unified nav/shell rollout, shared shell changes require QA sign-off
- **Pre-release freeze:** 48 hours before each production promotion

## Phase Shipping Order

1. Shell + global primitives
2. Landing/feed/building detail
3. Search/explore/maps/locality
4. Profile/credits/events/awards
5. Embassy workspace
6. Admin console
7. Final hardening + release

## Per-Phase Release Gates

- Design QA checklist complete (`docs/DESIGN_SYSTEM_QA_CHECKLIST.md`)
- Route family smoke tests complete
- Build/typecheck/lint all passing
- Stakeholder sign-off recorded

## Rollback Criteria

Trigger rollback if any of the following are detected after deployment:

- Navigation or shell regressions that block route access
- Major visual regressions on primary surfaces (landing/feed/building detail)
- Accessibility regressions on critical actions
- Operational regressions in Embassy or Admin high-throughput flows

## Ownership

- **Design system owner:** visual rules, token governance
- **Frontend owner:** implementation consistency, shared primitives
- **QA owner:** checklist enforcement and regression verification
- **Product owner:** milestone sign-off and rollout acceptance
