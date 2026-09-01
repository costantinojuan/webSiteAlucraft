(function () {
  var JUEGO_ID = "7842687025230";
  var VITRINA_STOCK_URL =
    "https://temporary-snappy-walnut-fsw66dt.vercel.app/public/vitrina-stock";
  var PIECE_DEFS = [
    {
      id: "7840729497678",
      title: "Sillón 1 Cuerpo",
      lead: "Aluminio microtexturado, negro o arena."
    },
    {
      id: "7842184069198",
      title: "Sillón 3 Cuerpos",
      lead: "Aluminio microtexturado, negro o arena."
    },
    {
      id: "7842184888398",
      title: "Reposera",
      lead: "Reclinable, estructura liviana y resistente."
    },
    {
      id: "7842184167502",
      title: "Mesa Ratona",
      lead: "Tapa de aluminio, apta intemperie."
    }
  ];
  var SWATCH = {
    "negro microtexturado": "#1a1a1a",
    arena: "#c9b896",
    "gris oscuro": "#4a4a4a",
    beige: "#e6d5bc",
    tostado: "#8a5a32",
    "gris claro": "#c8c8c8"
  };

  var juegoRoot;
  var piezasRoot;
  var juegoProduct;
  var pieceModels = [];
  var savingsPieces = [];
  var juegoSelected = {};
  var juegoQty = 1;
  var juegoAdding = false;

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
    if (typeof variant.quantityAvailable === "number" && variant.quantityAvailable <= 0) {
      return false;
    }
    if (variant.availableForSale === false) return false;
    if (variant.available === false) return false;
    return true;
  }

  function sizedImage(url, width) {
    if (!url) return "";
    width = width || 800;
    if (url.indexOf("shopify") === -1) return url;
    try {
      var parsed = new URL(url, window.location.href);
      parsed.searchParams.set("width", String(width));
      parsed.searchParams.set("format", "webp");
      return parsed.toString();
    } catch (err) {
      var sep = url.indexOf("?") >= 0 ? "&" : "?";
      return url + sep + "width=" + width + "&format=webp";
    }
  }

  function variantImage(variant, fallback, width) {
    var img = variant && (variant.image || (variant.images && variant.images[0]));
    if (img && (img.src || img.url)) return sizedImage(img.src || img.url, width);
    return fallback;
  }

  function productImage(prod, width) {
    if (!prod) return "";
    if (prod.images && prod.images.length) {
      return sizedImage(prod.images[0].src || prod.images[0].url || "", width);
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

  function optionLabel(value) {
    return typeof value === "string" ? value : value.value || value.name;
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

  function valueAvailable(prod, optionName, value, current) {
    var options = optionsOf(prod);
    var optionIndex = -1;
    for (var o = 0; o < options.length; o++) {
      if (options[o].name === optionName) {
        optionIndex = o;
        break;
      }
    }
    var variants = (prod && prod.variants) || [];
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

  function firstAvailableSelection(prod) {
    var variants = (prod && prod.variants) || [];
    for (var i = 0; i < variants.length; i++) {
      if (isAvailable(variants[i])) return optionMap(variants[i]);
    }
    return variants[0] ? optionMap(variants[0]) : {};
  }

  function reconcileSelection(prod, selected, changedName, value) {
    selected[changedName] = value;
    var options = optionsOf(prod);
    for (var i = 0; i < options.length; i++) {
      var name = options[i].name;
      if (name === changedName) continue;
      if (valueAvailable(prod, name, selected[name], selected)) continue;
      var values = options[i].values || [];
      var next = "";
      for (var v = 0; v < values.length; v++) {
        var label = optionLabel(values[v]);
        if (valueAvailable(prod, name, label, selected)) {
          next = label;
          break;
        }
      }
      if (next) selected[name] = next;
    }
    return selected;
  }

  function matchingPiecePrice(piece, current) {
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
    if (savingsPieces.length < 3 || !juegoPrice) return 0;
    var s1 = matchingPiecePrice(savingsPieces[0], current);
    var s3 = matchingPiecePrice(savingsPieces[1], current);
    var mesa = matchingPiecePrice(savingsPieces[2], current);
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

  function sameVariantId(a, b) {
    if (!a || !b) return false;
    a = String(a);
    b = String(b);
    if (a === b) return true;
    return a.split("/").pop() === b.split("/").pop();
  }

  function cartQtyForVariant(variantId) {
    var cart = getCart(window.AlucraftShopifyUI);
    var items = cart && cart.model && cart.model.lineItems;
    if (!items || !items.length) return 0;
    var total = 0;
    for (var i = 0; i < items.length; i++) {
      var itemVariant = items[i].variant;
      var id = itemVariant && itemVariant.id;
      if (sameVariantId(id, variantId)) {
        total += Number(items[i].quantity) || 0;
      }
    }
    return total;
  }

  function variantStock(variant) {
    if (!variant) return 0;
    if (typeof variant.quantityAvailable === "number") {
      return Math.max(0, variant.quantityAvailable);
    }
    if (!isAvailable(variant)) return 0;
    return null;
  }

  function remainingStock(variant) {
    var stock = variantStock(variant);
    if (stock == null) return null;
    return Math.max(0, stock - cartQtyForVariant(variant.id));
  }

  function clampQty(qty, variant) {
    var remaining = remainingStock(variant);
    qty = Math.max(1, qty);
    if (remaining == null) return qty;
    if (remaining <= 0) return 1;
    return Math.min(qty, remaining);
  }

  function canBuy(variant) {
    var remaining = remainingStock(variant);
    if (remaining != null) return remaining > 0;
    return isAvailable(variant);
  }

  function qtyControlsHtml(qty, variant) {
    var remaining = remainingStock(variant);
    var minusDisabled = qty <= 1 ? " disabled" : "";
    var plusDisabled = remaining != null && qty >= remaining ? " disabled" : "";
    return (
      '<button type="button" class="juegoQtyBtn" data-qty="-1" aria-label="Restar"' +
      minusDisabled +
      ">−</button>" +
      '<span class="juegoQtyValue">' +
      qty +
      "</span>" +
      '<button type="button" class="juegoQtyBtn" data-qty="1" aria-label="Sumar"' +
      plusDisabled +
      ">+</button>"
    );
  }

  function mapVariant(node) {
    var price = node.price;
    var amount =
      price && price.amount != null
        ? price.amount
        : node.priceV2 && node.priceV2.amount != null
          ? node.priceV2.amount
          : node.price;
    var image = node.image || {};
    var qty =
      typeof node.quantityAvailable === "number" && !isNaN(node.quantityAvailable)
        ? Math.max(0, node.quantityAvailable)
        : null;
    return {
      id: node.id,
      title: node.title,
      available: node.available !== false && node.availableForSale !== false,
      availableForSale: node.availableForSale !== false && node.available !== false,
      quantityAvailable: qty,
      price: amount,
      priceV2: { amount: amount },
      image: { src: image.src || image.url || "", url: image.src || image.url || "" },
      selectedOptions: node.selectedOptions || node.optionValues || []
    };
  }

  function mapProduct(node) {
    if (!node) return null;
    var variantNodes = node.variants;
    if (variantNodes && variantNodes.nodes) variantNodes = variantNodes.nodes;
    if (!variantNodes) variantNodes = [];
    var imageNodes = node.images;
    if (imageNodes && imageNodes.nodes) imageNodes = imageNodes.nodes;
    if (!imageNodes) imageNodes = [];
    return {
      title: node.title,
      options: (node.options || []).map(function (option) {
        return {
          name: option.name,
          values: (option.values || []).map(optionLabel)
        };
      }),
      images: imageNodes.map(function (image) {
        return { src: image.src || image.url || "", url: image.src || image.url || "" };
      }),
      variants: Array.prototype.map.call(variantNodes, mapVariant)
    };
  }

  function storefrontQuery(client, query) {
    var domain =
      (client.config && (client.config.domain || client.config.apiHost)) ||
      "v4apub-im.myshopify.com";
    var token =
      (client.config && client.config.storefrontAccessToken) ||
      "e7abe6f448d4477a4827e9884e0cf515";
    domain = String(domain).replace(/^https?:\/\//, "");
    return fetch("https://" + domain + "/api/2024-10/graphql.json", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": token
      },
      body: JSON.stringify({ query: query })
    })
      .then(function (res) {
        if (!res.ok) throw new Error("storefront " + res.status);
        return res.json();
      })
      .then(function (payload) {
        var errors = payload.errors || [];
        var fatal = errors.filter(function (err) {
          var code = err.extensions && err.extensions.code;
          var msg = String(err.message || "");
          return (
            code !== "ACCESS_DENIED" &&
            msg.indexOf("quantityAvailable") === -1 &&
            msg.indexOf("unauthenticated_read_product_inventory") === -1
          );
        });
        if (fatal.length) {
          throw new Error(fatal[0].message || "storefront error");
        }
        return payload.data;
      });
  }

  function productQuery(alias, id) {
    return (
      " " +
      alias +
      ': product(id: "gid://shopify/Product/' +
      id +
      '") { title options { name values } images(first: 2) { nodes { url } } variants(first: 50) { nodes { id title availableForSale quantityAvailable price { amount } image { url } selectedOptions { name value } } } }'
    );
  }

  function applyQuantities(product, quantities) {
    if (!product || !quantities) return product;
    var variants = product.variants || [];
    for (var i = 0; i < variants.length; i++) {
      var variant = variants[i];
      var qty = quantities[variant.id];
      if (qty == null && variant.id) {
        qty = quantities[String(variant.id).split("/").pop()];
      }
      if (typeof qty === "number" && !isNaN(qty)) {
        variant.quantityAvailable = Math.max(0, qty);
      }
    }
    return product;
  }

  function loadVitrinaStock() {
    return fetch(VITRINA_STOCK_URL)
      .then(function (res) {
        if (!res.ok) throw new Error("stock " + res.status);
        return res.json();
      })
      .then(function (payload) {
        return (payload && payload.quantities) || {};
      })
      .catch(function () {
        return {};
      });
  }

  function loadCatalog(client) {
    var query =
      "query {" +
      productQuery("juego", JUEGO_ID) +
      productQuery("s1", PIECE_DEFS[0].id) +
      productQuery("s3", PIECE_DEFS[1].id) +
      productQuery("reposera", PIECE_DEFS[2].id) +
      productQuery("mesa", PIECE_DEFS[3].id) +
      " }";

    return storefrontQuery(client, query).then(function (data) {
      return {
        juego: mapProduct(data && data.juego),
        s1: mapProduct(data && data.s1),
        s3: mapProduct(data && data.s3),
        reposera: mapProduct(data && data.reposera),
        mesa: mapProduct(data && data.mesa)
      };
    });
  }

  function optionsHtml(prod, selected, compact) {
    var options = optionsOf(prod);
    var html = "";
    var swatchClass = compact ? "juegoSwatch juegoSwatch--sm" : "juegoSwatch";
    var chipClass = compact ? "juegoChip juegoChip--sm" : "juegoChip";
    for (var i = 0; i < options.length; i++) {
      var option = options[i];
      var values = option.values || [];
      html += '<div class="juegoBuyOption' + (compact ? " juegoBuyOption--sm" : "") + '">';
      html += '<p class="juegoBuyLabel">' + option.name + ": <strong>" + (selected[option.name] || "") + "</strong></p>";
      html += '<div class="juegoBuyChoices" role="listbox" aria-label="' + option.name + '">';
      for (var v = 0; v < values.length; v++) {
        var label = optionLabel(values[v]);
        var on = selected[option.name] === label;
        var enabled = valueAvailable(prod, option.name, label, selected);
        var cls = on ? " is-selected" : "";
        if (!enabled) cls += " is-disabled";
        if (isSwatchOption(option)) {
          html +=
            '<button type="button" class="' +
            swatchClass +
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
            '<button type="button" class="' +
            chipClass +
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
    return html;
  }

  function addToCart(variant, quantity, done) {
    var cart = getCart(window.AlucraftShopifyUI);
    if (!cart || typeof cart.addVariantToCart !== "function") {
      done(new Error("cart missing"));
      return;
    }
    quantity = clampQty(quantity, variant);
    Promise.resolve(cart.addVariantToCart(variant, quantity, true))
      .then(function () {
        done();
      })
      .catch(function (err) {
        done(err || new Error("add failed"));
      });
  }

  function renderJuego() {
    if (!juegoRoot || !juegoProduct) return;
    var variant = findVariant(juegoProduct, juegoSelected);
    juegoQty = clampQty(juegoQty, variant);
    var available = canBuy(variant);
    var price = variantPrice(variant);
    var save = savingsFor(juegoSelected, price);
    var img = variantImage(variant, productImage(juegoProduct, 1100), 1100);
    var html = "";
    html += '<div class="juegoBuyMedia">';
    html += '<img src="' + img + '" alt="Juego de Living Exterior" width="1100" height="1100" decoding="async" fetchpriority="high">';
    html += "</div>";
    html += '<form class="juegoBuyCard" id="juegoBuyForm">';
    html += '<span class="juegoBuyBadge">El set completo</span>';
    html += "<h2>Juego de Living Exterior</h2>";
    html +=
      '<p class="juegoBuyLead">2 sillones de 1 cuerpo, 1 sillón de 3 cuerpos y mesa ratona — el conjunto para tu terraza.</p>';
    html += optionsHtml(juegoProduct, juegoSelected, false);
    html += '<div class="juegoBuyPriceRow">';
    html += "<span>Precio del juego completo</span>";
    html += "<strong>" + formatARS(price) + "</strong>";
    html += "</div>";
    if (save) {
      html += '<p class="juegoBuySave">Ahorrás ' + formatARS(save) + " comprando el juego completo</p>";
    }
    html += '<div class="juegoBuyQty">';
    html += "<span>Cantidad</span>";
    html += '<div class="juegoQty">';
    html += qtyControlsHtml(juegoQty, variant);
    html += "</div></div>";
    html +=
      '<button type="submit" class="juegoBuySubmit"' +
      (available && !juegoAdding ? "" : " disabled") +
      ">" +
      (juegoAdding ? "Agregando…" : available ? "Comprar" : "Sin stock") +
      "</button>";
    html += "</form>";
    juegoRoot.innerHTML = html;
  }

  function renderPiezas() {
    if (!piezasRoot) return;
    if (!pieceModels.length) {
      piezasRoot.innerHTML = '<p class="juegoBuyStatus">No se pudieron cargar las piezas.</p>';
      return;
    }
    var html = "";
    for (var i = 0; i < pieceModels.length; i++) {
      var card = pieceModels[i];
      var variant = findVariant(card.product, card.selected);
      card.quantity = clampQty(card.quantity, variant);
      var available = canBuy(variant);
      var price = variantPrice(variant);
      var img = variantImage(variant, productImage(card.product, 700), 700);
      html += '<form class="piezaCard" data-piece="' + i + '">';
      html +=
        '<div class="piezaCardMedia"><img src="' +
        img +
        '" alt="' +
        card.title +
        '" width="700" height="525" loading="lazy" decoding="async"></div>';
      html += '<div class="piezaCardBody">';
      html += "<h3>" + card.title + "</h3>";
      html += '<p class="piezaCardLead">' + card.lead + "</p>";
      html += optionsHtml(card.product, card.selected, true);
      html += '<div class="piezaCardPrice"><span>Precio unitario</span><strong>' + formatARS(price) + "</strong></div>";
      html += '<div class="piezaCardQty"><span>Cantidad</span>';
      html += '<div class="piezaQty">';
      html += qtyControlsHtml(card.quantity, variant);
      html += "</div></div>";
      html +=
        '<button type="submit" class="juegoBuySubmit"' +
        (available && !card.adding ? "" : " disabled") +
        ">" +
        (card.adding ? "Agregando…" : available ? "Comprar" : "Sin stock") +
        "</button>";
      html += "</div></form>";
    }
    piezasRoot.innerHTML = html;
  }

  function onJuegoClick(event) {
    var swatch = event.target.closest("[data-option]");
    if (swatch && !swatch.disabled) {
      event.preventDefault();
      reconcileSelection(
        juegoProduct,
        juegoSelected,
        swatch.getAttribute("data-option"),
        swatch.getAttribute("data-value")
      );
      renderJuego();
      return;
    }
    var qtyBtn = event.target.closest("[data-qty]");
    if (qtyBtn) {
      event.preventDefault();
      var variant = findVariant(juegoProduct, juegoSelected);
      var next = juegoQty + Number(qtyBtn.getAttribute("data-qty"));
      juegoQty = clampQty(next, variant);
      renderJuego();
    }
  }

  function onJuegoSubmit(event) {
    event.preventDefault();
    if (juegoAdding) return;
    var variant = findVariant(juegoProduct, juegoSelected);
    if (!canBuy(variant)) return;
    juegoQty = clampQty(juegoQty, variant);
    juegoAdding = true;
    renderJuego();
    addToCart(variant, juegoQty, function () {
      juegoAdding = false;
      renderJuego();
    });
  }

  function onPiezaClick(event) {
    var form = event.target.closest("[data-piece]");
    if (!form) return;
    var card = pieceModels[Number(form.getAttribute("data-piece"))];
    if (!card) return;
    var swatch = event.target.closest("[data-option]");
    if (swatch && !swatch.disabled) {
      event.preventDefault();
      reconcileSelection(
        card.product,
        card.selected,
        swatch.getAttribute("data-option"),
        swatch.getAttribute("data-value")
      );
      renderPiezas();
      return;
    }
    var qtyBtn = event.target.closest("[data-qty]");
    if (qtyBtn) {
      event.preventDefault();
      var variant = findVariant(card.product, card.selected);
      card.quantity = clampQty(card.quantity + Number(qtyBtn.getAttribute("data-qty")), variant);
      renderPiezas();
    }
  }

  function onPiezaSubmit(event) {
    var form = event.target.closest("[data-piece]");
    if (!form) return;
    event.preventDefault();
    var card = pieceModels[Number(form.getAttribute("data-piece"))];
    if (!card || card.adding) return;
    var variant = findVariant(card.product, card.selected);
    if (!canBuy(variant)) return;
    card.quantity = clampQty(card.quantity, variant);
    card.adding = true;
    renderPiezas();
    addToCart(variant, card.quantity, function () {
      card.adding = false;
      renderPiezas();
    });
  }

  var started = false;

  function start() {
    if (started) return;
    juegoRoot = document.getElementById("juegoBuy");
    piezasRoot = document.getElementById("piezasBuy");
    var client = window.AlucraftShopifyClient;
    if (!client || (!juegoRoot && !piezasRoot)) return;
    started = true;

    Promise.all([loadCatalog(client), loadVitrinaStock()])
      .then(function (results) {
        var catalog = results[0];
        var quantities = results[1] || {};
        applyQuantities(catalog.juego, quantities);
        applyQuantities(catalog.s1, quantities);
        applyQuantities(catalog.s3, quantities);
        applyQuantities(catalog.reposera, quantities);
        applyQuantities(catalog.mesa, quantities);
        juegoProduct = catalog.juego;
        savingsPieces = [catalog.s1, catalog.s3, catalog.mesa].filter(Boolean);
        var fetched = [catalog.s1, catalog.s3, catalog.reposera, catalog.mesa];
        pieceModels = [];
        for (var i = 0; i < PIECE_DEFS.length; i++) {
          if (!fetched[i] || !fetched[i].variants.length) continue;
          pieceModels.push({
            title: PIECE_DEFS[i].title,
            lead: PIECE_DEFS[i].lead,
            product: fetched[i],
            selected: firstAvailableSelection(fetched[i]),
            quantity: 1,
            adding: false
          });
        }
        if (juegoRoot) {
          if (!juegoProduct || !juegoProduct.variants.length) {
            juegoRoot.innerHTML = '<p class="juegoBuyStatus">No se pudo cargar el juego.</p>';
          } else {
            juegoSelected = firstAvailableSelection(juegoProduct);
            juegoRoot.addEventListener("click", onJuegoClick);
            juegoRoot.addEventListener("submit", onJuegoSubmit);
            renderJuego();
          }
        }
        if (piezasRoot) {
          piezasRoot.addEventListener("click", onPiezaClick);
          piezasRoot.addEventListener("submit", onPiezaSubmit);
          renderPiezas();
        }
      })
      .catch(function (err) {
        if (typeof console !== "undefined" && console.error) {
          console.error("Alucraft juego card", err);
        }
        if (juegoRoot) juegoRoot.innerHTML = '<p class="juegoBuyStatus">No se pudo cargar el juego.</p>';
        if (piezasRoot) piezasRoot.innerHTML = '<p class="juegoBuyStatus">No se pudieron cargar las piezas.</p>';
      });
  }

  function onReady() {
    document.removeEventListener("alucraft:shopify-ready", onReady);
    start();
  }

  document.addEventListener("alucraft:shopify-ready", onReady);
  if (window.AlucraftShopifyUI && window.AlucraftShopifyClient) start();
})();
