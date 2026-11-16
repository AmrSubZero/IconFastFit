# Icon Fast Fit — Photoshop CEP Extension

**Version:** 1.1.3  
**Architecture:** Adobe CEP panel + Photoshop ExtendScript  
**Windows installer:** `Install-Windows.bat`  
**Supported host:** Photoshop with CEP / Extensions (Legacy) support

Icon Fast Fit scales the currently active transparent PNG/icon layer proportionally and centers it inside the bounding rectangle of the current Photoshop selection.

## What's new in 1.1.3

- Added editable HEX text fields for Color Overlay and Solid Color, alongside the visual color swatches.
- Supports typing or pasting either `#A50000` or `A50000`; values are normalized to uppercase and saved automatically.
- Stops keyboard and clipboard event propagation from focused HEX fields so Photoshop shortcuts do not consume color-code input.
- Prevents fitting when an enabled color option contains an invalid/incomplete HEX value.

## What's new in 1.1.2

- Replaced the CMD `NUL` directory test with .NET directory creation and a real write-permission test, avoiding false failures when checking the CEP folder.
- Added a fallback: if the current user's AppData CEP folder cannot be created or written, the installer requests administrator permission and tries Adobe's machine-wide Common Files CEP locations.
- Added transactional copying through a staging folder, so an existing panel installation is retained if the replacement copy fails.
- Added more precise error logging to `%TEMP%\IconFastFit-install.log`.

## Features

- Dockable Photoshop panel.
- Fit-size slider from 0% to 100%; default is 30%.
- Proportional scaling; the smaller of the width and height limits is used.
- Horizontal and vertical centering in the selection's bounding rectangle.
- Optional non-destructive Color Overlay layer style with a color swatch and editable HEX field.
- Optional Solid Color fill layer above the icon, clipped to the icon, with a color swatch and editable HEX field.
- Settings persistence between Photoshop sessions.
- Native Photoshop keyboard shortcut support through the File > Scripts command.

## How the fit works

To enter a precise color, click the HEX text box next to either color swatch and type or paste a six-digit value such as `#A50000` (the leading `#` is optional). The value is saved automatically when valid.

The percentage limits the icon to that fraction of both the selection width and selection height. The smaller scale is used, so the icon is not distorted. At 0%, the icon is left at its current size and only centered.

For irregular selections (ellipse, lasso, etc.), the icon is centered using the selection's overall bounding rectangle. The optional Solid Color fill is created without a selection-shaped mask, placed directly above the icon, and clipped to the icon. The active selection is cleared after the operations complete.

### Resulting layer order

```text
Icon Fast Fit - Solid Color   [clipping mask]
Your PNG icon                 [base layer]
```

If Color Overlay is enabled, it is applied to the PNG icon layer itself. The clipped Solid Color fill sits above it.

## Install on Windows without Creative Cloud

1. Extract the ZIP completely; do not run the installer from inside the ZIP preview.
2. Close Photoshop.
3. Double-click `Install-Windows.bat`.
4. The installer first tries `%APPDATA%\Adobe\CEP\extensions\IconFastFit`. If Windows blocks that location, it requests administrator permission and tries the standard machine-wide Adobe CEP extension folders under Common Files.
5. The installer enables CEP debug loading for CSXS runtime registry versions 9–14 for this manually installed unsigned CEP extension.
6. The installer separately launches `Install-Global-Shortcut.ps1`. Windows may request administrator permission because the global script is copied into Photoshop's Program Files installation folder.
7. Restart Photoshop.
8. Open **Window > Extensions (Legacy) > Icon Fast Fit**.

If installation still fails, inspect `%TEMP%\IconFastFit-install.log`. The log records the attempted destination and the underlying Windows/PowerShell exception. Send that log when requesting support.

If Photoshop is installed in a custom directory and is not detected by the global-script installer, manually copy:

```text
IconFastFit\global\Icon Fast Fit.jsx
```

Into:

```text
[Photoshop installation]\Presets\Scripts\
```

Then restart Photoshop.

## Assign a global Photoshop keyboard shortcut

CEP panels cannot reliably intercept keystrokes when they do not have focus. Icon Fast Fit therefore uses a native Photoshop script command for the global shortcut.

After installing and restarting Photoshop:

1. Choose **Edit > Keyboard Shortcuts**.
2. Set **Shortcuts For** to **Application Menus**.
3. Expand **File > Scripts**.
4. Find **Icon Fast Fit**.
5. Click its shortcut field and press your desired combination (for example `Ctrl + Shift + Alt + F`).
6. Click **Accept**, then save the shortcut set if Photoshop asks.

That shortcut is managed by Photoshop itself. It works anywhere inside Photoshop, even when the Icon Fast Fit panel is not focused or is closed.

## Use

1. Open a Photoshop document.
2. Drag a transparent PNG icon into the document.
3. Make a pixel selection (rectangle, ellipse, or freeform).
4. Select the imported PNG layer in the Layers panel.
5. Click **FIT ICON TO SELECTION** or use the Photoshop-native shortcut you assigned.

The active layer must be an unlocked ArtLayer. Group layers and locked Background layers are not accepted.

## Run behavior

- No success confirmation dialog is displayed.
- The selection is deselected after all requested operations complete successfully.
- The icon layer is left active after the operation.
- Errors (no document, no selection, locked/empty layer, or script installation problem) are still reported.

## Uninstall

Close Photoshop and run `Uninstall-Windows.bat`. The uninstall script removes the current-user CEP panel and the global `.jsx` command from detected Photoshop installations. It does not modify Photoshop's saved keyboard shortcut set; remove the shortcut there manually if you no longer need it.

## Project files

- `CSXS/manifest.xml` — CEP manifest.
- `index.html` / `styles.css` — panel UI.
- `js/panel.js` — settings UI, persistence, and action dispatch.
- `js/cep-bridge.js` — CEP-to-Photoshop bridge.
- `host/host.jsx` — fitting, Color Overlay, clipped Solid Color layer, settings persistence, and selection clearing.
- `global/Icon Fast Fit.jsx` — native Photoshop Scripts-menu command for global shortcuts.
- `Install-Windows.bat` / `Install-CEP.ps1` / `Install-Global-Shortcut.ps1` — Windows installers.
- `Uninstall-Windows.bat` — Windows uninstaller.
- `icons/` — plugin artwork.

## Compatibility and testing

This is a CEP extension, not a UXP `.ccx` plugin. It loads from **Window > Extensions (Legacy)**. Adobe classifies CEP as legacy and recommends UXP for new development; CEP is retained here to support the requested manual installation and Scripts-menu shortcut workflow.

The installer is designed to provide detailed diagnostics on Windows. Photoshop itself is not available in this build environment, so Photoshop-specific operations must still be verified in the target Photoshop version.
