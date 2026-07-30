# Bot artwork

This public template intentionally ships without movie stills, actor photos, or
other third-party artwork.

Create or license your own avatar and banner files, keep them outside Git unless
you have redistribution rights, and provide their local paths when needed:

```dotenv
AGENT_J_AVATAR_PATH=C:\path\to\your-avatar.png
AGENT_J_BANNER_PATH=C:\path\to\your-banner.png
```

Then run `npm run update-profile` from `agent-j/`. Discord also allows profile
artwork to be managed directly in the Developer Portal.
