# Changelog

## 1.1.0

- Move the Solid Color fill layer above the icon.
- Clip the Solid Color fill to the icon layer beneath it.
- Use the clipping mask alone so irregular placement selections do not cut away icon color.
- Automatically deselect after all operations complete successfully.
- Add a native Photoshop `File > Scripts > Icon Fast Fit` command for shortcuts that work when the panel is unfocused or closed.
- Persist settings in a shared `settings.ini` file for the panel and global command.
- Replace the panel-only hotkey capture UI with instructions for assigning a Photoshop-native shortcut.
- Avoid success confirmation dialogs; retain error reporting.

## 1.0.0

- Initial CEP panel, selection-bounds fitting, Color Overlay, and Solid Color fill support.


## 1.1.2

- Reworked CEP folder creation and write-access validation using .NET APIs instead of CMD's `NUL` test.
- Added administrator-assisted machine-wide installation fallback if the per-user AppData location is inaccessible.
- Added staging-folder deployment and improved installation diagnostics.

## 1.1.3

- Add editable HEX inputs next to the Color Overlay and Solid Color swatches.
- Support typing and pasting six-digit HEX values with or without a leading `#`.
- Isolate keyboard and clipboard events in the HEX fields from Photoshop keyboard shortcuts.
- Validate active color values before running the fit action.
