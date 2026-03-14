(function () {

  var scriptURL = 'https://sdks.shopifycdn.com/buy-button/latest/buy-button-storefront.min.js';

  function loadScript() {
    var script = document.createElement('script');
    script.async = true;
    script.src = scriptURL;
    document.head.appendChild(script);
    script.onload = initShopify;
  }

  if (window.ShopifyBuy && window.ShopifyBuy.UI) {
    initShopify();
  } else {
    loadScript();
  }

  function initShopify() {

    var client = ShopifyBuy.buildClient({
      domain: 'v4apub-im.myshopify.com',
      storefrontAccessToken: 'e7abe6f448d4477a4827e9884e0cf515',
    });

    ShopifyBuy.UI.onReady(client).then(function (ui) {

      // 🔹 CARRITO GLOBAL
      ui.createComponent('cart', {
        node: document.body.appendChild(document.createElement('div')),
        options: {

          toggle: {
            styles: {
              toggle: {
                "background-color": "#272727",
                "font-family": "Roboto, sans-serif",
                ":hover": {
                  "background-color": "#424242"
                },
                ":focus": {
                  "background-color": "#424242"
                }
              },
              count: {
                "font-size": "16px"
              }
            }
          },

          cart: {
            popup: false,
            styles: {
              button: {
                "background-color": "#272727",
                "font-family": "Roboto, sans-serif",
                ":hover": {
                  "background-color": "#424242"
                },
                ":focus": {
                  "background-color": "#424242"
                },
                "border-radius": "36px"
              }
            },
            text: {
              title: "Carrito de compras",
              total: "Subtotal",
              empty: "Tu carrito está vacío",
              button: "Checkout"
            }
          }

        }
      });

    });

  }

})();