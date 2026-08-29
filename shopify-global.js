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
    window.AlucraftShopifyClient = client;

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
            templates: {
              icon: '<svg class="shopify-buy__icon-cart" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><path fill="currentColor" d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2zM7.17 14.75l.03.01L19 14.5c.7 0 1.31-.4 1.59-1.03l3.24-7.38A1 1 0 0 0 22.92 4.8H6.21l-.94-2H1v2h2l3.6 7.59-1.35 2.44C4.52 15.87 5.48 17.5 7 17.5h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.11.97-1.39z"/></svg>'
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

      function parseCartCount(text) {
        var n = parseInt(String(text || '').replace(/[^\d]/g, ''), 10);
        return isNaN(n) ? 0 : n;
      }

      function syncCartCountVisibility(root) {
        if (!root) return;
        var counts = root.querySelectorAll('.shopify-buy__cart-toggle__count');
        for (var i = 0; i < counts.length; i++) {
          if (parseCartCount(counts[i].textContent) > 0) {
            counts[i].classList.add('is-visible');
          } else {
            counts[i].classList.remove('is-visible');
          }
        }
      }

      function watchCartCount(root) {
        if (!root || root.getAttribute('data-alucraft-count-watch') === '1') return;
        root.setAttribute('data-alucraft-count-watch', '1');
        syncCartCountVisibility(root);
        var observer = new MutationObserver(function () {
          syncCartCountVisibility(root);
        });
        observer.observe(root, {
          childList: true,
          subtree: true,
          characterData: true
        });
      }

      if (toggleNode) {
        watchCartCount(toggleNode);
        requestAnimationFrame(function () {
          syncCartCountVisibility(toggleNode);
        });
        setTimeout(function () {
          syncCartCountVisibility(toggleNode);
        }, 400);
      }

      signalReady(ui);

    });

  }

  if (window.ShopifyBuy && window.ShopifyBuy.UI) {
    initShopify();
  } else {
    loadScript();
  }

})();
