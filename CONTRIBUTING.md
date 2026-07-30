# Contributing

Thanks for helping improve the project.

## Development workflow

1. Fork the repository and create a focused topic branch.
2. Install dependencies with `npm ci` in both the repository root and
   `agent-j/`.
3. Keep Agent K and Agent J isolated: separate applications, tokens, processes,
   databases, permissions, and command registration.
4. Add or update tests for behavior changes.
5. Run:

   ```powershell
   npm run check
   npm test

   Push-Location .\agent-j
   npm run check
   npm test
   npm run simulate:arena
   npm run simulate:economy
   Pop-Location
   ```

6. Update documentation and `.env.example` whenever configuration changes.

## Public-data rules

- Never commit credentials, `.env`, databases, logs, Discord exports, private
  screenshots, machine-specific paths, or live member/server topology.
- Tests must use obviously synthetic IDs such as `111111111111111111`.
- Do not contribute copied movie stills, logos, dialogue collections, or other
  material you cannot license for redistribution.
- Report security findings privately as described in `SECURITY.md`.

## Content contributions

This project contains mature fictional satire. New material should remain
clearly absurd, should not expose private individuals, and should not make
credible allegations or threats. Review generated combinations—not only
individual fragments—before submitting them.

Keep changes narrowly scoped and explain both user-facing behavior and
validation in the pull request.
