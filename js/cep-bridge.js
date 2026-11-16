/* Minimal CEP host bridge. Photoshop executes the supplied ExtendScript in its host engine. */
(function (global) {
  'use strict';
  global.IconFastFitBridge = {
    evalScript: function (script, callback) {
      var done = typeof callback === 'function' ? callback : function () {};
      try {
        if (global.__adobe_cep__ && typeof global.__adobe_cep__.evalScript === 'function') {
          global.__adobe_cep__.evalScript(script, done);
        } else {
          done('ERR|CEP host bridge is unavailable. Open this panel inside Photoshop.');
        }
      } catch (error) {
        done('ERR|' + (error && error.message ? error.message : String(error)));
      }
    }
  };
}(window));
