#target photoshop

/*
 * Icon Fast Fit - global Photoshop Scripts-menu command.
 * Install this file in Photoshop/Presets/Scripts to assign a native,
 * panel-independent keyboard shortcut through Edit > Keyboard Shortcuts.
 */
(function () {
    try {
        var appData = '';
        try { appData = $.getenv('APPDATA') || ''; } catch (ignore) {}
        if (!appData) {
            try { appData = Folder.userData.fsName; } catch (ignore2) {}
        }
        if (!appData) throw new Error('Could not locate the current user data folder.');

        var extensionRoot = new Folder(appData + '/Adobe/CEP/extensions/IconFastFit');
        var hostFile = new File(extensionRoot.fsName + '/host/host.jsx');
        if (!hostFile.exists) {
            throw new Error('Icon Fast Fit host script was not found. Reinstall the extension using Install-Windows.bat.');
        }

        $.evalFile(hostFile);
        if (typeof IconFastFit === 'undefined' || typeof IconFastFit.runFromSettings !== 'function') {
            throw new Error('Icon Fast Fit could not initialize its Photoshop host functions.');
        }

        var result = IconFastFit.runFromSettings();
        if (String(result).indexOf('ERR|') === 0) {
            alert(String(result).substring(4), 'Icon Fast Fit');
        }
        // No success dialog: the script performs the full action immediately.
    } catch (error) {
        var message = error && error.message ? error.message : String(error);
        alert(message, 'Icon Fast Fit');
    }
}());
