# ESE2027 parity audit

The repository web app is the source of truth. The tablet reference package is
a Trusted Web Activity, so the Android APK now follows the same model: it
packages `index.html`, `css/`, `js/`, `fonts/`, and `icons/` locally and renders
them in a WebView. There is no second Compose renderer to drift from the web UI.

The detailed interaction and geometry baseline is in
[`WEB_REFERENCE_AUDIT.md`](WEB_REFERENCE_AUDIT.md).

## Verified on Samsung SM-T220 (800x1340)

- shared Nothing command deck, five-tab fixed navigation, and fixed timer dock;
- Today hero, task checkbox persistence, shaky flags, red pixel burst, quote cycle;
- Plan phase/day/session structure, collapsible task lists, and scrolling;
- Focus timer, drawer, Brown/Pink/528Hz audio controls, and full-focus overlay;
- Progress long-scroll analytics/achievement surface;
- splash animation and route scroll reset in the packaged WebView.

The debug build is `android/app/build/outputs/apk/debug/app-debug.apk`. Gradle
syncs the web source into Android assets on every build, so subsequent web UI
changes are what the APK receives.
