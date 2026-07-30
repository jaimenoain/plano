// The one place email templates may get react-email components from.
//
// Every template imports from here rather than from the `@react-email/components`
// barrel, because that barrel cannot run under Deno at all. Two separate failures
// force this shape:
//
//  1. The barrel side-effect-imports `@react-email/render`, which pulls in `prettier`,
//     which throws at module load under Deno ("The argument 'filename' must be a file
//     URL object…"). That kills the edge function at BOOT with a 500 WORKER_ERROR
//     before any request is served, and writes no function logs — only edge 500s.
//  2. Without `?deps=react@18.3.1`, each subpackage bundles its OWN React copy, so
//     their elements cross instances and rendering dies with React error #31
//     ("Objects are not valid as a React child"). `?deps=` makes esm.sh share one React.
//
// The versions below are the exact ones `@react-email/components@1.0.8` resolves to.
// Adding a component here means adding it with `?deps=react@18.3.1` too — a missing
// `?deps=` fails at send time, not at boot, so it survives a smoke test.
//
// tests/unit/email-templates-no-barrel.test.ts guards the rule.

export { Body } from 'https://esm.sh/@react-email/body@0.2.1?deps=react@18.3.1'
export { Button } from 'https://esm.sh/@react-email/button@0.2.1?deps=react@18.3.1'
export { Container } from 'https://esm.sh/@react-email/container@0.0.16?deps=react@18.3.1'
export { Head } from 'https://esm.sh/@react-email/head@0.0.13?deps=react@18.3.1'
export { Heading } from 'https://esm.sh/@react-email/heading@0.0.16?deps=react@18.3.1'
export { Hr } from 'https://esm.sh/@react-email/hr@0.0.12?deps=react@18.3.1'
export { Html } from 'https://esm.sh/@react-email/html@0.0.12?deps=react@18.3.1'
export { Img } from 'https://esm.sh/@react-email/img@0.0.12?deps=react@18.3.1'
export { Link } from 'https://esm.sh/@react-email/link@0.0.13?deps=react@18.3.1'
export { Preview } from 'https://esm.sh/@react-email/preview@0.0.14?deps=react@18.3.1'
export { Section } from 'https://esm.sh/@react-email/section@0.0.17?deps=react@18.3.1'
export { Text } from 'https://esm.sh/@react-email/text@0.1.6?deps=react@18.3.1'
