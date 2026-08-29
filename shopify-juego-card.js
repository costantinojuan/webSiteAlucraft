(function () {
  var PRODUCT_ID = "7842687025230";
  var PIECE_IDS = ["7840729497678", "7842184069198", "7842184167502"];
  var SWATCH = {
    "negro microtexturado": "#1a1a1a",
    arena: "#c9b896",
    "gris oscuro": "#4a4a4a",
    beige: "#e6d5bc",
    tostado: "#8a5a32",
    "gris claro": "#c8c8c8"
  };

  var root;
  var product;
  var pieces = [];
  var selected = {};
  var quantity = 1;
  var adding = false;

  function normalize(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function optionMap(variant) {
    var map = {};
    var opts = variant.optionValues;
    if (!opts || !opts.length) {
      opts = variant.selectedOptions || [];
    }
    for (var i = 0; i < opts.length; i++) {
      map[opts[i].name] = opts[i].value;
    }
    return map;
  }

  function isAvailable(variant) {
    if (!variant) return false;
    if (variant.availableForSale === false) return false;
    if (variant.available === false) return false;
    return true;
  }

  function variantImage(variant, fallback) {
    var img = variant && (variant.image || (variant.images && variant.images[0]));
    if (img && (img.src || img.url)) return img.src || img.url;
    return fallback;
  }

  function productImage(prod) {
    if (!prod) return "";
    if (prod.images && prod.images.length) {
      return prod.images[0].src || prod.images[0].url || "";
    }
    return "";
  }

  function variantPrice(variant) {
    if (!variant) return 0;
    if (variant.priceV2 && variant.priceV2.amount != null) {
      return Number(variant.priceV2.amount);
    }
    return Number(variant.price);
  }

  function formatARS(amount) {
    var n = Math.round(Number(amount) || 0);
    return "$ " + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }

  function optionsOf(prod) {
    return (prod && prod.options) || [];
  }

  function findVariant(prod, current) {
    var variants = (prod && prod.variants) || [];
    for (var i = 0; i < variants.length; i++) {
      var map = optionMap(variants[i]);
      var ok = true;
      for (var name in current) {
        if (!Object.prototype.hasOwnProperty.call(current, name)) continue;
        if (map[name] !== current[name]) {
          ok = false;
          break;
        }
      }
      if (ok) return variants[i];
    }
    return null;
  }

  function valueAvailable(optionName, value, current) {
    var options = optionsOf(product);
    var optionIndex = -1;
    for (var o = 0; o < options.length; o++) {
      if (options[o].name === optionName) {
        optionIndex = o;
        break;
      }
    }
    var variants = product.variants || [];
    for (var i = 0; i < variants.length; i++) {
      var variant = variants[i];
      var map = optionMap(variant);
      if (map[optionName] !== value) continue;
      var match = true;
      for (var p = 0; p < optionIndex; p++) {
        var prevName = options[p].name;
        if (current[prevName] && map[prevName] !== current[prevName]) {
          match = false;
          break;
        }
      }
      if (match && isAvailable(variant)) return true;
    }
    return false;
  }

  function firstAvailableSelection() {
    var variants = product.variants || [];
    for (var i = 0; i < variants.length; i++) {
      if (isAvailable(variants[i])) return optionMap(variants[i]);
    }
    return variants[0] ? optionMap(variants[0]) : {};
  }

  function reconcileSelection(changedName, value) {
    selected[changedName] = value;
    var options = optionsOf(product);
    for (var i = 0; i < options.length; i++) {
      var name = options[i].name;
      if (name === changedName) continue;
      if (valueAvailable(name, selected[name], selected)) continue;
      var values = options[i].values || [];
      var next = "";
      for (var v = 0; v < values.length; v++) {
        var label = typeof values[v] === "string" ? values[v] : values[v].value || values[v].name;
        if (valueAvailable(name, label, selected)) {
          next = label;
          break;
        }
      }
      if (next) selected[name] = next;
    }
  }

  function matchingPiecePrice(piece, current) {
    var variants = (piece && piece.variants) || [];
    var needed = {};
    var pieceOptions = optionsOf(piece);
    for (var i = 0; i < pieceOptions.length; i++) {
      var name = pieceOptions[i].name;
      if (current[name]) needed[name] = current[name];
    }
    if (pieceOptions.length === 1 && current.Color) {
      needed[pieceOptions[0].name] = current.Color;
    }
    var variant = findVariant(piece, needed);
    if (!variant) return 0;
    return variantPrice(variant);
  }

  function savingsFor(current, juegoPrice) {
    if (!pieces.length || !juegoPrice) return 0;
    var s1 = matchingPiecePrice(pieces[0], current);
    var s3 = matchingPiecePrice(pieces[1], current);
    var mesa = matchingPiecePrice(pieces[2], current);
    if (!s1 || !s3 || !mesa) return 0;
    var separate = s1 * 2 + s3 + mesa;
    var diff = Math.round(separate - juegoPrice);
    return diff > 0 ? diff : 0;
  }

  function swatchColor(label) {
    return SWATCH[normalize(label)] || "#d0d0d0";
  }

  function isSwatchOption(option) {
    var name = normalize(option.name);
    return name === "color" || name === "almohadones";
  }

  function getCart(ui) {
    if (ui && ui.components && ui.components.cart && ui.components.cart[0]) {
      return ui.components.cart[0];
    }
    return null;
  }

  function render() {
    if (!root || !product) return;
    var variant = findVariant(product, selected);
    var available = isAvailable(variant);
    var price = variantPrice(variant);
    var save = savingsFor(selected, price);
    var img = variantImage(variant, productImage(product));
    var options = optionsOf(product);
    var html = "";
    html += '<div class="juegoBuyMedia">';
    html += '<img src="' + img + '" alt="Juego de Living Exterior">';
    html += "</div>";
    html += '<form class="juegoBuyCard" id="juegoBuyForm">';
    html += '<span class="juegoBuyBadge">El set completo</span>';
    html += "<h2>Juego de Living Exterior</h2>";
    html += "<p class=\"juegoBuyLead\">2 sillones de 1 cuerpo, 1 sillón de 3 cuerpos y mesa ratona — el conjunto para tu terraza.</p>";

    for (var i = 0; i < options.length; i++) {
      var option = options[i];
      var values = option.values || [];
      html += '<div class="juegoBuyOption">';
      html += '<p class="juegoBuyLabel">' + option.name + ": <strong>" + (selected[option.name] || "") + "</strong></p>";
      html += '<div class="juegoBuyChoices" role="listbox" aria-label="' + option.name + '">';
      for (var v = 0; v < values.length; v++) {
        var label = typeof values[v] === "string" ? values[v] : values[v].value || values[v].name;
        var on = selected[option.name] === label;
        var enabled = valueAvailable(option.name, label, selected);
        var cls = on ? " is-selected" : "";
        if (!enabled) cls += " is-disabled";
        if (isSwatchOption(option)) {
          html +=
            '<button type="button" class="juegoSwatch' +
            cls +
            '" data-option="' +
            option.name +
            '" data-value="' +
            label +
            '" style="background:' +
            swatchColor(label) +
            '" aria-label="' +
            option.name +
            " " +
            label +
            '" aria-pressed="' +
            (on ? "true" : "false") +
            '" ' +
            (enabled ? "" : "disabled") +
            "></button>";
        } else {
          html +=
            '<button type="button" class="juegoChip' +
            cls +
            '" data-option="' +
            option.name +
            '" data-value="' +
            label +
            '" aria-pressed="' +
            (on ? "true" : "false") +
            '" ' +
            (enabled ? "" : "disabled") +
            ">" +
            label +
            "</button>";
        }
      }
      html += "</div></div>";
    }

    html += '<div class="juegoBuyPriceRow">';
    html += '<span>Precio del juego completo</span>';
    html += "<strong>" + formatARS(price) + "</strong>";
    html += "</div>";
    if (save) {
      html += '<p class="juegoBuySave">Ahorrás ' + formatARS(save) + " comprando el juego completo</p>";
    }
    html += '<div class="juegoBuyQty">';
    html += "<span>Cantidad</span>";
    html += '<div class="juegoQty">';
    html += '<button type="button" class="juegoQtyBtn" data-qty="-1" aria-label="Restar">−</button>';
    html += '<span class="juegoQtyValue">' + quantity + "</span>";
    html += '<button type="button" class="juegoQtyBtn" data-qty="1" aria-label="Sumar">+</button>';
    html += "</div></div>";
    html +=
      '<button type="submit" class="juegoBuySubmit"' +
      (available && !adding ? "" : " disabled") +
      ">" +
      (adding ? "Agregando…" : available ? "Comprar" : "Sin stock") +
      "</button>";
    html += "</form>";
    root.innerHTML = html;
  }

  function onClick(event) {
    var swatch = event.target.closest("[data-option]");
    if (swatch && !swatch.disabled) {
      event.preventDefault();
      reconcileSelection(swatch.getAttribute("data-option"), swatch.getAttribute("data-value"));
      render();
      return;
    }
    var qtyBtn = event.target.closest("[data-qty]");
    if (qtyBtn) {
      event.preventDefault();
      quantity = Math.max(1, quantity + Number(qtyBtn.getAttribute("data-qty")));
      render();
    }
  }

  function onSubmit(event) {
    event.preventDefault();
    if (adding) return;
    var variant = findVariant(product, selected);
    if (!isAvailable(variant)) return;
    var cart = getCart(window.AlucraftShopifyUI);
    if (!cart || typeof cart.addVariantToCart !== "function") {
      root.querySelector(".juegoBuySubmit").textContent = "No se pudo agregar";
      return;
    }
    adding = true;
    render();
    Promise.resolve(cart.addVariantToCart(variant, quantity, true))
      .catch(function () {
        adding = false;
        render();
      })
      .then(function () {
        adding = false;
        render();
      });
  }

  function bind() {
    root.addEventListener("click", onClick);
    root.addEventListener("submit", onSubmit);
  }

  function showError(message) {
    root.innerHTML = '<p class="juegoBuyStatus">' + message + "</p>";
  }

  var started = false;

  function start() {
    if (started) return;
    root = document.getElementById("juegoBuy");
    var client = window.AlucraftShopifyClient;
    if (!root || !client || !client.product) return;
    started = true;

    var juegoFetch = client.product.fetch(PRODUCT_ID);
    var piecesFetch =
      typeof client.product.fetchMultiple === "function"
        ? client.product.fetchMultiple(PIECE_IDS).catch(function () {
            return [];
          })
        : Promise.resolve([]);

    Promise.all([juegoFetch, piecesFetch])
      .then(function (results) {
        product = results[0];
        pieces = results[1] || [];
        if (!product) {
          showError("No se pudo cargar el juego.");
          return;
        }
        selected = firstAvailableSelection();
        bind();
        render();
      })
      .catch(function () {
        showError("No se pudo cargar el juego.");
      });
  }

  function onReady() {
    document.removeEventListener("alucraft:shopify-ready", onReady);
    start();
  }

  document.addEventListener("alucraft:shopify-ready", onReady);
  if (window.AlucraftShopifyUI && window.AlucraftShopifyClient) start();
})();
