#target photoshop

/*
 * Icon Fast Fit - Photoshop CEP host functions.
 * ES3-compatible ExtendScript for broad CEP/Photoshop compatibility.
 */
if (typeof IconFastFit === 'undefined') {
    IconFastFit = {};
}

IconFastFit.DEFAULT_SETTINGS = {
    fitPercent: 30,
    overlayEnabled: false,
    overlayColor: '#18BDB5',
    fillEnabled: false,
    fillColor: '#FFFFFF'
};

IconFastFit.getSettingsFile = function () {
    var appData = '';
    try { appData = $.getenv('APPDATA') || ''; } catch (ignore) {}
    if (!appData) {
        try { appData = Folder.userData.fsName; } catch (ignore2) {}
    }
    if (!appData) throw new Error('Could not locate the current user data folder.');
    return new File(appData + '/Adobe/CEP/extensions/IconFastFit/settings.ini');
};

IconFastFit.saveSettings = function (fitPercent, overlayEnabled, overlayHex, fillEnabled, fillHex) {
    try {
        var percent = Number(fitPercent);
        if (isNaN(percent)) percent = 30;
        percent = Math.max(0, Math.min(100, percent));

        var overlayColor = String(overlayHex || '#18BDB5').toUpperCase();
        var fillColor = String(fillHex || '#FFFFFF').toUpperCase();
        if (!/^#[0-9A-F]{6}$/.test(overlayColor)) overlayColor = '#18BDB5';
        if (!/^#[0-9A-F]{6}$/.test(fillColor)) fillColor = '#FFFFFF';

        var file = IconFastFit.getSettingsFile();
        var parent = file.parent;
        if (!parent.exists && !parent.create()) throw new Error('Could not create the Icon Fast Fit settings folder.');
        file.encoding = 'UTF-8';
        if (!file.open('w')) throw new Error('Could not write Icon Fast Fit settings.');
        file.write(
            'fitPercent=' + percent + '\n' +
            'overlayEnabled=' + ((overlayEnabled === true || overlayEnabled === 'true') ? 'true' : 'false') + '\n' +
            'overlayColor=' + overlayColor + '\n' +
            'fillEnabled=' + ((fillEnabled === true || fillEnabled === 'true') ? 'true' : 'false') + '\n' +
            'fillColor=' + fillColor + '\n'
        );
        file.close();
        return 'OK|Settings saved.';
    } catch (error) {
        try { if (file && file.opened) file.close(); } catch (ignore3) {}
        var message = error && error.message ? error.message : String(error);
        return 'ERR|' + message.replace(/[\r\n|]+/g, ' ');
    }
};

IconFastFit.loadSettings = function () {
    var settings = {
        fitPercent: IconFastFit.DEFAULT_SETTINGS.fitPercent,
        overlayEnabled: IconFastFit.DEFAULT_SETTINGS.overlayEnabled,
        overlayColor: IconFastFit.DEFAULT_SETTINGS.overlayColor,
        fillEnabled: IconFastFit.DEFAULT_SETTINGS.fillEnabled,
        fillColor: IconFastFit.DEFAULT_SETTINGS.fillColor
    };

    try {
        var file = IconFastFit.getSettingsFile();
        if (!file.exists || !file.open('r')) return settings;
        file.encoding = 'UTF-8';
        var content = file.read();
        file.close();
        var lines = content.split(/[\r\n]+/);
        for (var i = 0; i < lines.length; i++) {
            var splitAt = lines[i].indexOf('=');
            if (splitAt < 0) continue;
            var key = lines[i].substring(0, splitAt);
            var value = lines[i].substring(splitAt + 1);
            if (key === 'fitPercent') {
                var parsed = Number(value);
                if (!isNaN(parsed)) settings.fitPercent = Math.max(0, Math.min(100, parsed));
            } else if (key === 'overlayEnabled') {
                settings.overlayEnabled = value === 'true';
            } else if (key === 'overlayColor' && /^#[0-9A-Fa-f]{6}$/.test(value)) {
                settings.overlayColor = value.toUpperCase();
            } else if (key === 'fillEnabled') {
                settings.fillEnabled = value === 'true';
            } else if (key === 'fillColor' && /^#[0-9A-Fa-f]{6}$/.test(value)) {
                settings.fillColor = value.toUpperCase();
            }
        }
    } catch (ignore) {}
    return settings;
};

IconFastFit.runFromSettings = function () {
    var settings = IconFastFit.loadSettings();
    return IconFastFit.run(
        settings.fitPercent,
        settings.overlayEnabled,
        settings.overlayColor,
        settings.fillEnabled,
        settings.fillColor
    );
};

IconFastFit.run = function (fitPercent, overlayEnabled, overlayHex, fillEnabled, fillHex) {
    var originalRulerUnits = app.preferences.rulerUnits;

    try {
        if (app.documents.length === 0) {
            throw new Error('Open a Photoshop document first.');
        }

        var doc = app.activeDocument;
        var iconLayer = doc.activeLayer;

        if (!iconLayer || iconLayer.typename !== 'ArtLayer') {
            throw new Error('Select the imported PNG icon layer in the Layers panel. Group layers cannot be fitted.');
        }
        if (iconLayer.isBackgroundLayer) {
            throw new Error('The active layer is a locked Background. Select an unlocked icon layer.');
        }
        try {
            if (iconLayer.allLocked) {
                throw new Error('The active icon layer is locked. Unlock it before fitting.');
            }
        } catch (lockCheckError) {
            if (lockCheckError && lockCheckError.message && lockCheckError.message.indexOf('locked') >= 0) {
                throw lockCheckError;
            }
        }

        app.preferences.rulerUnits = Units.PIXELS;

        var selectionBounds;
        try {
            selectionBounds = doc.selection.bounds;
        } catch (selectionError) {
            throw new Error('No active selection found. Make a rectangular, elliptical or freeform selection first.');
        }

        if (!selectionBounds || selectionBounds.length < 4) {
            throw new Error('Could not read the selection bounds.');
        }

        var selLeft = IconFastFit.toPixels(selectionBounds[0]);
        var selTop = IconFastFit.toPixels(selectionBounds[1]);
        var selRight = IconFastFit.toPixels(selectionBounds[2]);
        var selBottom = IconFastFit.toPixels(selectionBounds[3]);
        var selWidth = selRight - selLeft;
        var selHeight = selBottom - selTop;

        if (selWidth <= 0 || selHeight <= 0) {
            throw new Error('The current selection has no usable width or height.');
        }

        var iconBounds = iconLayer.bounds;
        var iconWidth = IconFastFit.toPixels(iconBounds[2]) - IconFastFit.toPixels(iconBounds[0]);
        var iconHeight = IconFastFit.toPixels(iconBounds[3]) - IconFastFit.toPixels(iconBounds[1]);
        if (iconWidth <= 0 || iconHeight <= 0) {
            throw new Error('The active icon layer appears to be empty or has no measurable pixels.');
        }

        var percentage = Number(fitPercent);
        if (isNaN(percentage)) percentage = 30;
        percentage = Math.max(0, Math.min(100, percentage));

        // Persist the same settings for the global Photoshop Scripts-menu command.
        IconFastFit.saveSettings(percentage, overlayEnabled, overlayHex, fillEnabled, fillHex);

        if (percentage > 0) {
            var targetWidth = selWidth * (percentage / 100);
            var targetHeight = selHeight * (percentage / 100);
            var scaleWidth = (targetWidth / iconWidth) * 100;
            var scaleHeight = (targetHeight / iconHeight) * 100;
            var scalePercent = Math.min(scaleWidth, scaleHeight);
            if (isNaN(scalePercent) || scalePercent <= 0) {
                throw new Error('Could not calculate a valid icon scale.');
            }
            iconLayer.resize(scalePercent, scalePercent, AnchorPosition.MIDDLECENTER);
        }

        // Re-read layer bounds after resizing and align both axes to the selection box centre.
        iconBounds = iconLayer.bounds;
        var iconLeft = IconFastFit.toPixels(iconBounds[0]);
        var iconTop = IconFastFit.toPixels(iconBounds[1]);
        var iconRight = IconFastFit.toPixels(iconBounds[2]);
        var iconBottom = IconFastFit.toPixels(iconBounds[3]);
        var iconCenterX = iconLeft + ((iconRight - iconLeft) / 2);
        var iconCenterY = iconTop + ((iconBottom - iconTop) / 2);
        var selectionCenterX = selLeft + (selWidth / 2);
        var selectionCenterY = selTop + (selHeight / 2);

        iconLayer.translate(
            new UnitValue(selectionCenterX - iconCenterX, 'px'),
            new UnitValue(selectionCenterY - iconCenterY, 'px')
        );

        var overlayApplied = false;
        var fillCreated = false;

        if (overlayEnabled === true || overlayEnabled === 'true') {
            IconFastFit.applyColorOverlay(IconFastFit.hexToRgb(overlayHex));
            overlayApplied = true;
        }

        if (fillEnabled === true || fillEnabled === 'true') {
            // The fill is created without a selection mask, then clipped to the icon's transparency.
            // This colors the entire icon even when the placement selection was irregular.
            IconFastFit.createClippedSolidColorLayer(doc, iconLayer, IconFastFit.hexToRgb(fillHex));
            fillCreated = true;
        }

        // Clear marching ants only after fitting and optional styling/fill creation are complete.
        doc.activeLayer = iconLayer;
        doc.selection.deselect();

        return 'OK|Icon fitted and centered' +
            (overlayApplied ? ' · Color Overlay applied' : '') +
            (fillCreated ? ' · Clipped Solid Color layer created above the icon' : '') +
            '. Selection cleared.';

    } catch (error) {
        var message = error && error.message ? error.message : String(error);
        message = message.replace(/[\r\n|]+/g, ' ');
        return 'ERR|' + message;
    } finally {
        app.preferences.rulerUnits = originalRulerUnits;
    }
};

IconFastFit.toPixels = function (value) {
    try {
        if (value && typeof value.as === 'function') return value.as('px');
    } catch (ignore) {}
    return Number(value);
};

IconFastFit.hexToRgb = function (hex) {
    var value = String(hex || '#FFFFFF').replace('#', '');
    if (!/^[0-9a-fA-F]{6}$/.test(value)) value = 'FFFFFF';
    return {
        r: parseInt(value.substring(0, 2), 16),
        g: parseInt(value.substring(2, 4), 16),
        b: parseInt(value.substring(4, 6), 16)
    };
};

IconFastFit.applyColorOverlay = function (rgb) {
    var s2t = stringIDToTypeID;
    var c2t = charIDToTypeID;
    var setDescriptor = new ActionDescriptor();
    var reference = new ActionReference();
    reference.putProperty(s2t('property'), s2t('layerEffects'));
    reference.putEnumerated(s2t('layer'), s2t('ordinal'), s2t('targetEnum'));
    setDescriptor.putReference(c2t('null'), reference);

    var effectsDescriptor = new ActionDescriptor();
    var overlayDescriptor = new ActionDescriptor();
    var colorDescriptor = new ActionDescriptor();

    overlayDescriptor.putBoolean(s2t('enabled'), true);
    overlayDescriptor.putBoolean(s2t('present'), true);
    overlayDescriptor.putBoolean(s2t('showInDialog'), true);
    overlayDescriptor.putEnumerated(s2t('mode'), s2t('blendMode'), s2t('normal'));
    overlayDescriptor.putUnitDouble(s2t('opacity'), s2t('percentUnit'), 100);

    colorDescriptor.putDouble(s2t('red'), rgb.r);
    colorDescriptor.putDouble(s2t('green'), rgb.g);
    colorDescriptor.putDouble(s2t('blue'), rgb.b);
    overlayDescriptor.putObject(s2t('color'), s2t('RGBColor'), colorDescriptor);

    effectsDescriptor.putObject(s2t('solidFill'), s2t('solidFill'), overlayDescriptor);
    setDescriptor.putObject(s2t('to'), s2t('layerEffects'), effectsDescriptor);
    executeAction(s2t('set'), setDescriptor, DialogModes.NO);
};

IconFastFit.createClippedSolidColorLayer = function (doc, iconLayer, rgb) {
    var descriptor = new ActionDescriptor();
    var reference = new ActionReference();
    reference.putClass(stringIDToTypeID('contentLayer'));
    descriptor.putReference(charIDToTypeID('null'), reference);

    var usingDescriptor = new ActionDescriptor();
    var solidColorDescriptor = new ActionDescriptor();
    var colorDescriptor = new ActionDescriptor();
    colorDescriptor.putDouble(stringIDToTypeID('red'), rgb.r);
    colorDescriptor.putDouble(stringIDToTypeID('green'), rgb.g);
    colorDescriptor.putDouble(stringIDToTypeID('blue'), rgb.b);
    solidColorDescriptor.putObject(stringIDToTypeID('color'), stringIDToTypeID('RGBColor'), colorDescriptor);
    usingDescriptor.putObject(stringIDToTypeID('type'), stringIDToTypeID('solidColorLayer'), solidColorDescriptor);
    descriptor.putObject(stringIDToTypeID('using'), stringIDToTypeID('contentLayer'), usingDescriptor);

    // Clear the placement selection before creating the fill so it does not create
    // an additional selection-shaped mask. The clipping mask below restricts color
    // to the icon's non-transparent pixels. The caller performs the final deselect.
    try { doc.selection.deselect(); } catch (ignoreSelection) {}
    executeAction(charIDToTypeID('Mk  '), descriptor, DialogModes.NO);

    var fillLayer = doc.activeLayer;
    fillLayer.name = 'Icon Fast Fit - Solid Color';
    fillLayer.move(iconLayer, ElementPlacement.PLACEBEFORE);

    // Select the fill layer and group it with the icon beneath (Create Clipping Mask).
    doc.activeLayer = fillLayer;
    executeAction(charIDToTypeID('GrpL'), undefined, DialogModes.NO);

    // Leave the icon as the active layer for the next drag-and-drop operation.
    doc.activeLayer = iconLayer;
};
