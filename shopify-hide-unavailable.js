(function () {
  function optionMap(variant) {
    var map = {};
    var opts = variant.optionValues || variant.selectedOptions || [];
    for (var i = 0; i < opts.length; i++) {
      map[opts[i].name] = opts[i].value;
    }
    return map;
  }

  function matches(variant, required) {
    var map = optionMap(variant);
    for (var name in required) {
      if (!Object.prototype.hasOwnProperty.call(required, name)) continue;
      if (!required[name]) continue;
      if (map[name] !== required[name]) return false;
    }
    return true;
  }

  function optionValueName(value) {
    if (value == null) return "";
    if (typeof value === "string") return value;
    return value.value || value.name || "";
  }

  function hideUnavailableOptions(component) {
    if (!component || component.__alucraftUpdating) return;
    if (!component.model || !component.model.variants || !component.view) return;

    var options = component.model.options || [];
    if (options.length < 2) return;

    var variants = component.model.variants;
    var selected = component.selectedOptions || {};
    var primary = options[0].name;
    var secondary = options[1].name;

    if (!component.selectedVariant) {
      var fallback = null;
      for (var i = 0; i < variants.length; i++) {
        if (optionMap(variants[i])[primary] === selected[primary]) {
          fallback = variants[i];
          break;
        }
      }
      fallback = fallback || variants[0];
      if (fallback && typeof component.updateVariant === "function") {
        var fallbackValue = optionMap(fallback)[secondary];
        if (fallbackValue && fallbackValue !== selected[secondary]) {
          component.__alucraftUpdating = true;
          try {
            component.updateVariant(secondary, fallbackValue);
          } finally {
            component.__alucraftUpdating = false;
          }
        }
      }
    }

    var doc = component.view.document || document;
    var selects = doc.querySelectorAll("select");
    selected = component.selectedOptions || {};

    for (var index = 0; index < options.length; index++) {
      var option = options[index];
      var select =
        doc.querySelector('select[name="' + option.name + '"]') || selects[index];
      if (!select) continue;

      var valid = {};
      var values = option.values || [];
      for (var v = 0; v < values.length; v++) {
        var valueName = optionValueName(values[v]);
        var required = {};
        for (var prev = 0; prev < index; prev++) {
          required[options[prev].name] = selected[options[prev].name];
        }
        required[option.name] = valueName;
        for (var n = 0; n < variants.length; n++) {
          if (matches(variants[n], required)) {
            valid[valueName] = true;
            break;
          }
        }
      }

      var optionEls = Array.prototype.slice.call(select.options);
      for (var o = 0; o < optionEls.length; o++) {
        if (!valid[optionEls[o].value]) {
          optionEls[o].parentNode.removeChild(optionEls[o]);
        }
      }
    }
  }

  function mergeHideEvents(config) {
    if (!config) return;
    config.options = config.options || {};
    ["product", "modalProduct"].forEach(function (key) {
      var block = (config.options[key] = config.options[key] || {});
      block.events = block.events || {};
      if (block.events.afterRender && block.events.afterRender.__alucraftHide) {
        return;
      }
      var previous = block.events.afterRender;
      var wrapped = function (component) {
        if (typeof previous === "function") previous.call(this, component);
        hideUnavailableOptions(this);
      };
      wrapped.__alucraftHide = true;
      block.events.afterRender = wrapped;
    });
  }

  function patchUi(ui) {
    if (!ui || ui.__alucraftPatched) return ui;
    ui.__alucraftPatched = true;
    var original = ui.createComponent.bind(ui);
    ui.createComponent = function (type, config) {
      if (type === "product") mergeHideEvents(config);
      return original(type, config);
    };
    return ui;
  }

  function patchOnReady(UI) {
    if (!UI || typeof UI.onReady !== "function" || UI.__alucraftOnReadyPatched) {
      return;
    }
    UI.__alucraftOnReadyPatched = true;
    var original = UI.onReady.bind(UI);
    UI.onReady = function (client) {
      return original(client).then(patchUi);
    };
  }

  function attach(buy) {
    if (buy && buy.UI) patchOnReady(buy.UI);
  }

  if (window.ShopifyBuy) {
    attach(window.ShopifyBuy);
  } else {
    var current;
    Object.defineProperty(window, "ShopifyBuy", {
      configurable: true,
      enumerable: true,
      get: function () {
        return current;
      },
      set: function (value) {
        current = value;
        attach(value);
      },
    });
  }

  var tries = 0;
  var timer = setInterval(function () {
    tries += 1;
    if (window.ShopifyBuy && window.ShopifyBuy.UI) {
      patchOnReady(window.ShopifyBuy.UI);
      clearInterval(timer);
    } else if (tries > 200) {
      clearInterval(timer);
    }
  }, 25);
})();
