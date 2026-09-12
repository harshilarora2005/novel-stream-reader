# Marginal icon and install support

## What will change
- Replace the “CVR” placeholder on books without cover art with a simple book symbol that reads clearly at small sizes.
- Use the uploaded Marginal “M” artwork as the browser favicon and home-screen app icon.
- Add installable web-app metadata so Marginal can be added to a phone or desktop home screen.
- Hide the “Edit with Lovable” badge on the published site.

## Technical details
- Generate optimized 64px, 192px, 512px, and Apple touch icon files from the supplied image without stretching it.
- Add a web app manifest with standalone display and Marginal’s theme colors; no offline caching will be introduced.
- Update the shared page head with favicon, Apple icon, theme color, and manifest links.
- Update route metadata where required and verify the app at desktop and mobile sizes.
