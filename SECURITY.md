# Security policy

## Reporting a vulnerability

Do not open a public issue for a vulnerability, exposed credential, private
Discord identifier set, or exploit technique. Use GitHub's private
vulnerability-reporting / Security Advisory flow for this repository. If that
flow is unavailable, contact the repository owner privately through their
GitHub profile.

Do not include live tokens, `.env` files, databases, logs, Discord exports, or
unredacted screenshots in a report.

## Supported version

Security fixes target the current `main` branch. This is self-hosted community
software; operators are responsible for updating their own deployments.

## Never commit

- Discord bot tokens, OAuth client secrets, MFA seeds, recovery codes, or
  authenticated browser/session material
- OpenAI or other provider API keys
- Real `.env` files
- SQLite databases, logs, caches, Discord exports, or message archives
- Private keys, certificates containing private keys, or credential backups
- Personal machine paths or private member/server identifiers in fixtures

Discord application, guild, channel, role, message, and user IDs are not
authentication credentials, but they can expose a community's topology and
members. Public examples should use blank configuration values or unmistakably
synthetic test IDs.

## Credential storage

The bundled Windows helpers store credentials in the current Windows user's
Credential Manager and clear the clipboard after setting them. Other platforms
should use their service supervisor, container runtime, or cloud secret
manager. Do not place persistent secrets in shell profiles.

Runtime databases and logs may contain Discord identifiers and operational
metadata. Keep them outside Git and encrypt backups.

## If a secret is exposed

1. Revoke or rotate it immediately at Discord, OpenAI, or the relevant
   provider.
2. Stop the affected process until the replacement credential is installed.
3. Review provider usage and Discord audit logs.
4. Remove the secret from Git history; deleting it only from the newest commit
   is insufficient.
5. Re-run a full-history secret scan before publishing again.

## Maintainer checks

Before every public push:

1. Review `git status` and the complete staged diff.
2. Run both syntax and test suites.
3. Confirm `.env`, `data/`, `logs/`, databases, dependency folders, and local
   artwork remain ignored.
4. Scan both reachable Git history and the working tree with a dedicated secret
   scanner.
5. Search for personal paths, real member names, and live Discord snowflakes.
