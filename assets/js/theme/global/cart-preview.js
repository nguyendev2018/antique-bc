import 'foundation-sites/js/foundation/foundation';
import 'foundation-sites/js/foundation/foundation.dropdown';
import utils from '@bigcommerce/stencil-utils';
import { inert, initCartPopup } from '../../papathemes/utils';

export const CartPreviewEvents = {
    close: 'closed.fndtn.dropdown',
    open: 'opened.fndtn.dropdown',
};

export default function (secureBaseUrl, cartId, context) {
    const loadingClass = 'is-loading';
    const $cart = $('[data-cart-preview]');
    const $cartDropdown = $('#cart-preview-dropdown');
    const $cartLoading = $('<div class="loadingOverlay"></div>');

    const $body = $('body');

    if (window.ApplePaySession) {
        $cartDropdown.addClass('apple-pay-supported');
    }

    $body.on('cart-quantity-update', (event, quantity) => {
        $('.cart-quantity')
            .text(quantity)
            .toggleClass('countPill--positive', quantity > 0);
        if (utils.tools.storage.localStorageAvailable()) {
            localStorage.setItem('cart-quantity', quantity);
        }
    });

    $cart.on('click', event => {
        const options = {
            template: 'common/cart-preview',
        };

        // Redirect to full cart page
        //
        // https://developer.mozilla.org/en-US/docs/Browser_detection_using_the_user_agent
        // In summary, we recommend looking for the string 'Mobi' anywhere in the User Agent to detect a mobile device.

        // mooncat: comment out to display cart preview popup on mobile
        // if (/Mobi/i.test(navigator.userAgent)) {
        //     return event.stopPropagation();
        // }

        event.preventDefault();

        // mooncat: stop if cart the click event is closing the cart popup
        if ($cart.hasClass('is-open')) return;

        $cartDropdown
            .addClass(loadingClass)
            .html($cartLoading);
        $cartLoading
            .show();

        utils.api.cart.getContent(options, (err, response) => {
            $cartDropdown
                .removeClass(loadingClass)
                .html(response);
            $cartLoading
                .hide();


            // mooncart: full functionality cart popup
            initCartPopup(context, $cartDropdown);

            // mooncat: init slick slider inside
            $cartDropdown.find('[data-slick]').not('.slick-initialized').slick();

            $('body').trigger('cartpreviewshown', [$cartDropdown]); // papathemes-mooncat
        });
    });

    // papathemes-inhealth: close cart preview popup when click outside the cart preview popup or other modal
    $body.on('click', event => {
        if ($cartDropdown.is('.is-open') && $(event.target).closest('[data-cart-preview], #cart-preview-dropdown, [data-reveal]').length === 0) {
            $cart.trigger('click');
        }
    });

    // papathemes-inhealth {{{
    $cartDropdown.on('open.toggle', (event, $toggle) => {
        $('body').addClass('has-previewCartOpened');
        // Accessibility - Make other elements not focusable
        inert($cartDropdown);
        $cartDropdown.data('lastToggle', $toggle);
        $cartDropdown.find('a,button[tabindex!="-1"]').first().each((i, el) => el.focus());
    });

    $cartDropdown.on('close.toggle', () => {
        $('body').removeClass('has-previewCartOpened');
        // Accessibility - Make other elements not focusable
        inert($cartDropdown, false);
        const $toggle = $cartDropdown.data('lastToggle');
        if ($toggle) {
            $toggle.get(0).focus();
            $cartDropdown.data('lastToggle', null);
        }
    });
    // }}}

    let quantity = 0;

    if (cartId) {
        // Get existing quantity from localStorage if found
        if (utils.tools.storage.localStorageAvailable()) {
            if (localStorage.getItem('cart-quantity')) {
                quantity = Number(localStorage.getItem('cart-quantity'));
                $body.trigger('cart-quantity-update', quantity);
            }
        }

        // Get updated cart quantity from the Cart API
        const cartQtyPromise = new Promise((resolve, reject) => {
            utils.api.cart.getCartQuantity({ baseUrl: secureBaseUrl, cartId }, (err, qty) => {
                if (err) {
                    // If this appears to be a 404 for the cart ID, set cart quantity to 0
                    if (err === 'Not Found') {
                        resolve(0);
                    } else {
                        reject(err);
                    }
                }
                resolve(qty);
            });
        });

        // If the Cart API gives us a different quantity number, update it
        cartQtyPromise.then(qty => {
            quantity = qty;
            $body.trigger('cart-quantity-update', quantity);
        });
    } else {
        $body.trigger('cart-quantity-update', quantity);
    }
}
