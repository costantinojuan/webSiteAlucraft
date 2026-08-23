(function () {

  var scriptURL = 'https://sdks.shopifycdn.com/buy-button/latest/buy-button-storefront.min.js';

  if (window.__alucraftShopifyInit) return;
  window.__alucraftShopifyInit = true;

  function signalReady(ui) {
    window.AlucraftShopifyUI = ui;
    document.dispatchEvent(new Event('alucraft:shopify-ready'));
  }

  function loadScript() {
    var existing = document.querySelector('script[src="' + scriptURL + '"]');
    if (existing) {
      if (window.ShopifyBuy && window.ShopifyBuy.UI) {
        initShopify();
      } else if (existing.readyState === 'complete' || existing.readyState === 'loaded') {
        initShopify();
      } else {
        existing.addEventListener('load', initShopify);
      }
      return;
    }
    var script = document.createElement('script');
    script.async = true;
    script.src = scriptURL;
    document.head.appendChild(script);
    script.onload = initShopify;
  }

  var initPending = false;

  function initShopify() {

    if (window.AlucraftShopifyUI) return;
    if (initPending) return;
    initPending = true;

    var client = ShopifyBuy.buildClient({
      domain: 'v4apub-im.myshopify.com',
      storefrontAccessToken: 'e7abe6f448d4477a4827e9884e0cf515',
    });

    ShopifyBuy.UI.onReady(client).then(function (ui) {

      var toggleNode = document.getElementById('navCartToggle');
      var cartConfig = {
        node: document.body.appendChild(document.createElement('div')),
        options: {

          toggle: {
            iframe: false,
            sticky: false,
            contents: {
              icon: true,
              count: true,
              title: false
            },
            styles: {
              toggle: {
                "font-family": "Roboto, sans-serif",
                "background-color": "transparent",
                ":hover": {
                  "background-color": "#f0f0f0"
                },
                ":focus": {
                  "background-color": "#f0f0f0"
                }
              },
              count: {
                "font-size": "11px"
              },
              icon: {
                "fill": "#111111"
              },
              iconPath: {
                "fill": "#111111"
              }
            },
            text: {
              title: "Carrito"
            },
            googleFonts: ["Roboto"]
          },

          cart: {
            popup: false,
            styles: {
              button: {
                "font-family": "Roboto, sans-serif",
                "font-size": "18px",
                "padding-top": "17px",
                "padding-bottom": "17px",
                ":hover": {
                  "background-color": "#424242"
                },
                "background-color": "#272727",
                ":focus": {
                  "background-color": "#424242"
                },
                "border-radius": "10px"
              }
            },
            text: {
              title: "Carrito de compras",
              total: "Subtotal",
              empty: "Tu carrito está vacío",
              notice: "Envio Gratis a TODO el país",
              button: "Pagar"
            },
            googleFonts: ["Roboto"]
          }

        }
      };

      if (toggleNode) {
        cartConfig.toggles = [{ node: toggleNode }];
      } else {
        cartConfig.toggles = [];
      }

      ui.createComponent('cart', cartConfig);

      signalReady(ui);

    });

  }

  if (window.ShopifyBuy && window.ShopifyBuy.UI) {
    initShopify();
  } else {
    loadScript();
  }

})();
