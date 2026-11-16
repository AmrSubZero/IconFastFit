(function () {
  'use strict';

  var DEFAULTS = {
    fitPercent: 30,
    overlayEnabled: false,
    overlayColor: '#18BDB5',
    fillEnabled: false,
    fillColor: '#FFFFFF'
  };
  var STORAGE_KEY = 'iconFastFitCepSettings_v2';
  var settings = loadSettings();
  var persistTimer = null;
  var runButton = document.getElementById('runFit');
  var statusMessage = document.getElementById('statusMessage');

  function loadSettings() {
    var result = {};
    var saved = null;
    try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch (ignore) {}
    for (var key in DEFAULTS) {
      if (Object.prototype.hasOwnProperty.call(DEFAULTS, key)) {
        result[key] = saved && saved[key] !== undefined ? saved[key] : DEFAULTS[key];
      }
    }
    result.fitPercent = Math.max(0, Math.min(100, parseInt(result.fitPercent, 10) || 0));
    result.overlayEnabled = !!result.overlayEnabled;
    result.fillEnabled = !!result.fillEnabled;
    result.overlayColor = /^#[0-9A-F]{6}$/i.test(result.overlayColor) ? result.overlayColor.toUpperCase() : DEFAULTS.overlayColor;
    result.fillColor = /^#[0-9A-F]{6}$/i.test(result.fillColor) ? result.fillColor.toUpperCase() : DEFAULTS.fillColor;
    return result;
  }

  function hostSettingsCall() {
    return 'IconFastFit.saveSettings(' + [
      String(settings.fitPercent),
      settings.overlayEnabled ? 'true' : 'false',
      JSON.stringify(settings.overlayColor),
      settings.fillEnabled ? 'true' : 'false',
      JSON.stringify(settings.fillColor)
    ].join(',') + ')';
  }

  function persistSettingsToHost() {
    if (persistTimer) { window.clearTimeout(persistTimer); persistTimer = null; }
    window.IconFastFitBridge.evalScript(hostSettingsCall(), function (result) {
      var text = String(result || '');
      if (text.indexOf('ERR|') === 0) {
        setStatus('Settings could not be synced for the global shortcut: ' + text.substring(4), true);
      }
    });
  }

  function saveSettings() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch (ignore) {}
    if (persistTimer) window.clearTimeout(persistTimer);
    persistTimer = window.setTimeout(persistSettingsToHost, 180);
  }

  function setStatus(message, isError) {
    statusMessage.textContent = message;
    statusMessage.className = isError ? 'status-message error' : 'status-message';
  }

  function normalizeHex(value) {
    var hex = String(value || '').replace(/\s+/g, '').toUpperCase();
    if (hex && hex.charAt(0) !== '#') hex = '#' + hex;
    return /^#[0-9A-F]{6}$/.test(hex) ? hex : null;
  }

  // CEP panels share keyboard handling with Photoshop. Keep text-editing and
  // clipboard events inside the focused hex field so Photoshop shortcuts do
  // not consume the keystrokes intended for the color value.
  function isolateHexFieldKeyboard(hexField) {
    var eventNames = ['keydown', 'keypress', 'keyup', 'beforeinput', 'input', 'paste', 'cut', 'copy'];
    eventNames.forEach(function (eventName) {
      hexField.addEventListener(eventName, function (event) {
        event.stopPropagation();
      }, false);
    });
    hexField.addEventListener('focus', function () {
      hexField.setAttribute('data-editing-hex', 'true');
    });
    hexField.addEventListener('blur', function () {
      hexField.removeAttribute('data-editing-hex');
    });
  }

  function bindColorControl(colorInput, hexField, settingName) {
    isolateHexFieldKeyboard(hexField);

    // The visual swatch remains available as a conventional color picker.
    colorInput.addEventListener('input', function () {
      var color = normalizeHex(colorInput.value);
      if (!color) return;
      settings[settingName] = color;
      hexField.value = color;
      hexField.classList.remove('invalid');
      saveSettings();
    });
    colorInput.addEventListener('change', persistSettingsToHost);

    // The adjacent text field accepts both #A50000 and A50000, including paste.
    hexField.addEventListener('input', function () {
      var color = normalizeHex(hexField.value);
      if (color) {
        settings[settingName] = color;
        colorInput.value = color;
        hexField.classList.remove('invalid');
        saveSettings();
      } else {
        hexField.classList.toggle('invalid', hexField.value.length > 0);
      }
    });
    hexField.addEventListener('change', function () {
      var color = normalizeHex(hexField.value);
      if (color) {
        settings[settingName] = color;
        colorInput.value = color;
        hexField.value = color;
        hexField.classList.remove('invalid');
        saveSettings();
        persistSettingsToHost();
      } else {
        hexField.value = settings[settingName];
        hexField.classList.remove('invalid');
      }
    });
    hexField.addEventListener('paste', function () {
      // Let the browser perform the paste; validation runs on the input event.
      // The event propagation is stopped by isolateHexFieldKeyboard().
    });
  }

  function updateOptionVisibility() {
    document.getElementById('overlayOptions').className = settings.overlayEnabled ? 'color-options' : 'color-options is-disabled';
    document.getElementById('fillOptions').className = settings.fillEnabled ? 'color-options' : 'color-options is-disabled';
  }

  function initializeControls() {
    var fit = document.getElementById('fitSize');
    var overlay = document.getElementById('enableOverlay');
    var overlayColor = document.getElementById('overlayColor');
    var fill = document.getElementById('enableSolidFill');
    var fillColor = document.getElementById('fillColor');

    fit.value = settings.fitPercent;
    document.getElementById('fitSizeValue').textContent = settings.fitPercent + '%';
    overlay.checked = settings.overlayEnabled;
    overlayColor.value = settings.overlayColor;
    fill.checked = settings.fillEnabled;
    fillColor.value = settings.fillColor;
    document.getElementById('overlayHex').value = settings.overlayColor;
    document.getElementById('fillHex').value = settings.fillColor;
    bindColorControl(overlayColor, document.getElementById('overlayHex'), 'overlayColor');
    bindColorControl(fillColor, document.getElementById('fillHex'), 'fillColor');
    updateOptionVisibility();

    fit.addEventListener('input', function () {
      settings.fitPercent = parseInt(fit.value, 10);
      document.getElementById('fitSizeValue').textContent = settings.fitPercent + '%';
      saveSettings();
    });
    fit.addEventListener('change', persistSettingsToHost);
    overlay.addEventListener('change', function () {
      settings.overlayEnabled = overlay.checked;
      updateOptionVisibility();
      saveSettings();
    });
    fill.addEventListener('change', function () {
      settings.fillEnabled = fill.checked;
      updateOptionVisibility();
      saveSettings();
    });
  }

  function runFit() {
    if (runButton.disabled) return;

    if (settings.overlayEnabled && !normalizeHex(document.getElementById('overlayHex').value)) {
      setStatus('Enter a valid 6-digit HEX value for Color Overlay (for example, #A50000).', true);
      document.getElementById('overlayHex').focus();
      return;
    }
    if (settings.fillEnabled && !normalizeHex(document.getElementById('fillHex').value)) {
      setStatus('Enter a valid 6-digit HEX value for Solid Color (for example, #A50000).', true);
      document.getElementById('fillHex').focus();
      return;
    }

    runButton.disabled = true;
    setStatus('Applying fit to the active Photoshop layer…', false);

    // Pass the live panel settings directly; host.jsx also persists them for the global command.
    var script = 'IconFastFit.run(' + [
      String(settings.fitPercent),
      settings.overlayEnabled ? 'true' : 'false',
      JSON.stringify(settings.overlayColor),
      settings.fillEnabled ? 'true' : 'false',
      JSON.stringify(settings.fillColor)
    ].join(',') + ')';

    window.IconFastFitBridge.evalScript(script, function (result) {
      runButton.disabled = false;
      var text = String(result || '');
      if (text.indexOf('OK|') === 0) {
        setStatus(text.substring(3) || 'Icon fitted successfully.', false);
      } else if (text.indexOf('ERR|') === 0) {
        setStatus(text.substring(4) || 'Photoshop could not complete the action.', true);
      } else if (text === 'EvalScript error.') {
        setStatus('Photoshop could not run the host script. Check the extension installation.', true);
      } else {
        setStatus(text || 'Photoshop returned no result.', !!text);
      }
    });
  }

  runButton.addEventListener('click', runFit);
  initializeControls();
  saveSettings();
}());
