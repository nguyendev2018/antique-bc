/* eslint-disable camelcase */
import utils from '@bigcommerce/stencil-utils';

function _formatMoney(_amount, _decimalCount = 2, decimal = '.', thousands = ',') {
    try {
        let decimalCount = Math.abs(_decimalCount);
        decimalCount = Number.isNaN(decimalCount) ? 2 : decimalCount;

        const negativeSign = _amount < 0 ? '-' : '';
        const amount = Math.abs(Number(_amount) || 0).toFixed(decimalCount);

        const i = parseInt(amount, 10).toString();
        const j = (i.length > 3) ? i.length % 3 : 0;

        return negativeSign + (j ? i.substr(0, j) + thousands : '') + i.substr(j).replace(/(\d{3})(?=\d)/g, `$1${thousands}`) + (decimalCount ? decimal + Math.abs(amount - i).toFixed(decimalCount).slice(2) : '');
    } catch (e) {
        return null;
    }
}

export function currencyFormat(value, {
    currency_token = '$',
    currency_location = 'left',
    decimal_token = '.',
    decimal_places = 2,
    thousands_token = ',',
} = {}) {
    const _value = _formatMoney(value, decimal_places, decimal_token, thousands_token);
    return currency_location.toLowerCase() === 'left' ? `${currency_token}${_value}` : `${_value}${currency_token}`;
}

export function extractMoney(price, defaultMoney = {
    currency_token: '$',
    currency_location: 'left',
    decimal_token: '.',
    decimal_places: 2,
    thousands_token: ',',
}) {
    const money = { ...defaultMoney };

    if (!price && price !== 0) {
        return money;
    }

    const m = String(price).trim().match(/^([^0-9]*)([0-9.,]*)([^0-9]*)$/);
    const leftSymbol = String(m[1]).trim();
    const value = String(m[2]);
    const rightSymbol = String(m[3]).trim();
    const commaPosition = value.indexOf(',');
    const commaCount = (value.match(/,/g) || []).length;
    const dotPosition = value.indexOf('.');
    const dotCount = (value.match(/\./g) || []).length;

    if (leftSymbol) {
        money.currency_token = leftSymbol;
        money.currency_location = 'left';
    } else if (rightSymbol) {
        money.currency_token = rightSymbol;
        money.currency_location = 'right';
    }

    if (commaCount.length >= 2) {
        money.thousands_token = ',';
        money.decimal_token = '.';
        money.decimal_places = dotPosition > -1 ? value.length - dotPosition - 1 : 0;
    } else if (dotCount.length >= 2) {
        money.thousands_token = '.';
        money.decimal_token = ',';
        money.decimal_places = commaPosition > -1 ? value.length - commaPosition - 1 : 0;
    } else if (commaPosition > dotPosition && dotPosition > -1) {
        money.thousands_token = '.';
        money.decimal_token = ',';
        money.decimal_places = value.length - commaPosition - 1;
    } else if (dotPosition > commaPosition && commaPosition > -1) {
        money.thousands_token = ',';
        money.decimal_token = '.';
        money.decimal_places = value.length - dotPosition - 1;
    } else if (commaPosition > -1) {
        if ((value.length - commaPosition - 1) % 3 === 0) {
            money.thousands_token = ',';
            money.decimal_token = '.';
            money.decimal_places = 0;
        } else {
            money.thousands_token = '.';
            money.decimal_token = ',';
            money.decimal_places = value.length - commaPosition - 1;
        }
    } else if (dotPosition > -1) {
        if ((value.length - dotPosition - 1) % 3 === 0) {
            money.thousands_token = '.';
            money.decimal_token = ',';
            money.decimal_places = 0;
        } else {
            money.thousands_token = ',';
            money.decimal_token = '.';
            money.decimal_places = value.length - dotPosition - 1;
        }
    } else if (commaPosition === -1 && dotPosition === -1) {
        money.decimal_places = 0;
    }

    return money;
}

export function setCookie(cname, cvalue, sec) {
    const d = new Date();
    d.setTime(d.getTime() + sec * 1000);
    const expires = `expires=${d.toUTCString()}`;
    document.cookie = `${cname}=${cvalue};${expires};path=/`;
}

export function getCookie(cname) {
    const name = `${cname}=`;
    const decodedCookie = decodeURIComponent(document.cookie);
    const ca = decodedCookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) === 0) {
            return c.substring(name.length, c.length);
        }
    }
    return '';
}

export function loadStyle(url) {
    if (Array.from(document.getElementsByTagName('link')).filter(el => el.href === url).length > 0) {
        return;
    }
    $('<link></link>').attr({ rel: 'stylesheet', href: url }).appendTo('head');
}

export function inert($el, inertValue = true) {
    $el.siblings().not('.modal').prop('inert', inertValue);
    const $parent = $el.parent();
    if (!$parent.is('body')) {
        inert($parent, inertValue);
    }
}

// mooncat: full functionality cart popup
export async function initCartPopup(context, $scope) {
    $scope.data('context', context);
    return import('./cart-popup').then(({ default: CartPopup }) => new CartPopup(context, $scope));
}

// papathemes-beautify
export function openCartPreview(cartItemId, context) {
    const loadingClass = 'is-loading';
    const $cart = $('[data-cart-preview]');
    const $cartDropdown = $('#cart-preview-dropdown');
    const $cartLoading = $('<div class="loadingOverlay"></div>');
    const options = {
        template: 'common/cart-preview',
    };

    $cart.addClass('is-open');
    $cartDropdown
        .addClass('is-open')
        .addClass(loadingClass)
        .html($cartLoading)
        .trigger('open.toggle', [$cart]);
    $cartLoading
        .show();

    utils.api.cart.getContent(options, (err, response) => {
        $cartDropdown
            .removeClass(loadingClass)
            .html(response);
        $cartLoading
            .hide();

        // Update cart counter
        const $body = $('body');
        const $cartQuantity = $('[data-cart-quantity]', $cartDropdown);
        const quantity = $cartQuantity.data('cartQuantity') || 0;

        $body.trigger('cart-quantity-update', [quantity]);

        // Animite
        if (cartItemId) {
            const $item = $cartDropdown.find(`[data-cart-itemid="${cartItemId}"]`).first().css('opacity', 0);
            const from = $item.position();
            const width = $item.width();
            const height = $item.height();
            const $clone = $item.clone().addClass('_flying').insertAfter($item);
            $item.parent().prepend($item);
            const to = $item.position();
            $item.css('height', '0').animate({ height: `${height}px` }, 500, () => $item.css('height', ''));
            $clone.css({
                position: 'absolute',
                top: `${from.top}px`,
                left: `${from.left}px`,
                width: `${width}px`,
                height: `${height}px`,
            }).animate({ opacity: 1 }, 200, () => {
                $clone.animate({
                    top: `${to.top}px`,
                    left: `${to.left}px`,
                }, 500, () => {
                    $clone.addClass('_shadowPulse');
                    $clone.one('animationend', () => {
                        $clone.remove();
                        $item.css('opacity', 1);
                    });
                });
            });
        }

        // mooncat: full functionality cart popup
        initCartPopup(context, $cartDropdown);

        // mooncat: init slick slider inside
        $cartDropdown.find('[data-slick]').not('.slick-initialized').slick();

        $('body').trigger('cartpreviewshown', [$cartDropdown]); // papathemes-mooncat
    });
}

// window.testAnimate = (cartItemId) => {
//     const $cartDropdown = $('#cart-preview-dropdown');
//     const $item = $cartDropdown.find(`[data-cart-itemid="${cartItemId}"]`).first().css('opacity', 0);
//     const from = $item.position();
//     const width = $item.width();
//     const height = $item.height();
//     const $clone = $item.clone().addClass('_flying').insertAfter($item);
//     $item.parent().prepend($item);
//     const to = $item.position();
//     $clone.css({
//         position: 'absolute',
//         top: `${from.top}px`,
//         left: `${from.left}px`,
//         width: `${width}px`,
//         height: `${height}px`,
//     }).animate({ opacity: 1 }, 200, () => {
//         $clone.animate({
//             top: `${to.top}px`,
//             left: `${to.left}px`,
//         }, 300, () => {
//             $clone.addClass('_shadowPulse');
//             $clone.one('animationend', () => {
//                 $clone.removeClass('_shadowPulse');
//                 $item.css('opacity', 1);
//             });
//         });
//     });
// }

export function flyToCart(object, fromEl = null, toEl = '[data-cart-preview]') {
    const $object = $(object);
    const $toEl = $(toEl).first();
    const $fromEl = fromEl ? $(fromEl).first() : $object.first();

    if ($toEl.length === 0) {
        return;
    }
    const $el = $object.clone()
        .appendTo('body')
        .css({
            position: 'absolute',
            top: $fromEl.offset().top,
            left: $fromEl.offset().left,
            zIndex: 10000,
            opacity: 0,
        });
    $el.animate({
        top: $toEl.offset().top + $toEl.height() / 2,
        left: $toEl.offset().left + $toEl.width() - $el.width(),
        opacity: 0.5,
    }, 500, () => {
        $el.animate({
            top: $toEl.offset().top + $toEl.height(),
            opacity: 0.2,
        }, 200, () => {
            $el.animate({
                top: $toEl.offset().top,
                opacity: 0,
            }, 100, () => {
                $el.remove();
            });
        });
    });
}


let uidVal = 0;
const uid = (returnLastValue = false) => `papathemesuid${returnLastValue ? uidVal - 1 : uidVal++}`;
export class ProductCardsGraphQLQuery {
    constructor({
        graphQLToken = '',
        currencyCode = 'USD',
        restrictToLogin = false,
        showProductRating = false,
        defaultProductImage = '',

        // theme settings & store settings
        card_show_border = false,
        card_show_button = false,
        show_product_quick_view = false,
        show_product_quantity_box = false,
        card_show_swatches = false,
        ajax_add_to_cart = false,
        product_sale_badges = 'label',
        product_sale_label = 'Sale',
        // ---

        txtQuickView = 'Quick View',
        txtChooseOptions = 'Choose Options',
        txtPreOrder = 'Pre-Order',
        txtAddToCart = 'Add to Cart',
        txtQuantity = 'Quantity',
        txtQuantityDecrease = 'Decrease Quantity of {name}',
        txtQuantityIncrease = 'Increase Quantity of {name}',
        ratingStarHtmlFunc = (isFull = true) => `
            <span class="icon icon--rating${isFull ? 'Full' : 'Empty'}">
                <svg><use xlink:href="#icon-star" /></svg>
            </span>
        `,
        qtyBoxHtmlFunc = (id, min, max, qtyLabel, decLabel, incLabel) => `
            <div class="form-field form-field--increments">
                <label class="form-label form-label--alternate is-srOnly" for="qty_${id}_${uid()}">${qtyLabel}</label>
                <div class="form-increment" data-card-quantity-change>
                    <button class="button button--icon" data-action="dec">
                        <span class="is-srOnly">${decLabel}</span>
                        <i class="icon" aria-hidden="true">
                            <svg>
                                <use xlink:href="#icon-minus"/>
                            </svg>
                        </i>
                    </button>
                    <input class="form-input form-input--incrementTotal"
                        id="qty_${id}_${uid(true)}"
                        name="qty_${id}"
                        type="tel"
                        value="${min || 1}"
                        data-quantity-min="${min}"
                        data-quantity-max="${max}"
                        min="1"
                        pattern="[0-9]*"
                        aria-live="polite">
                    <button class="button button--icon" data-action="inc">
                        <span class="is-srOnly">${incLabel}</span>
                        <i class="icon" aria-hidden="true">
                            <svg>
                                <use xlink:href="#icon-add"/>
                            </svg>
                        </i>
                    </button>
                </div>
            </div>
        `,
    } = {}) {
        this.graphQLToken = graphQLToken;
        this.currencyCode = currencyCode;
        this.restrictToLogin = restrictToLogin;
        this.showProductRating = showProductRating;
        this.card_show_border = card_show_border;
        this.card_show_button = card_show_button;
        this.show_product_quick_view = show_product_quick_view;
        this.show_product_quantity_box = show_product_quantity_box;
        this.card_show_swatches = card_show_swatches;
        this.ajax_add_to_cart = ajax_add_to_cart;
        this.product_sale_badges = product_sale_badges;
        this.product_sale_label = product_sale_label;
        this.defaultProductImage = defaultProductImage;
        this.txtQuickView = txtQuickView;
        this.txtChooseOptions = txtChooseOptions;
        this.txtPreOrder = txtPreOrder;
        this.txtAddToCart = txtAddToCart;
        this.txtQuantity = txtQuantity;
        this.txtQuantityDecrease = txtQuantityDecrease;
        this.txtQuantityIncrease = txtQuantityIncrease;
        this.ratingStarHtmlFunc = ratingStarHtmlFunc;
        this.qtyBoxHtmlFunc = qtyBoxHtmlFunc;
        this.cachedProducts = {};
    }

    formatPrice(prices, currency) {
        return prices.priceRange.min.value !== prices.priceRange.max.value ? `
            <div class="price-section">
                <span class="price price--main">${currencyFormat(prices.priceRange.min.value, currency)}  - ${currencyFormat(prices.priceRange.max.value, currency)}</span>
            </div>
        ` : `
            <div class="price-section">
                <span class="price price--main">${currencyFormat(prices.price.value, currency)}</span>
            </div>
            ${prices.basePrice.value !== prices.price.value ? `
                <div class="price-section non-sale-price">
                    <span class="price price--non-sale">
                        ${currencyFormat(prices.basePrice.value)}
                    </span>
                </div>
            ` : ''}
        `;
    }

    async load(productIds) {
        const cacheKey = `${this.currencyCode}_${productIds.join(',')}`;

        if (!this.cachedProducts[cacheKey]) {
            this.cachedProducts[cacheKey] = await new Promise(resolve => {
                $.ajax({
                    url: '/graphql',
                    method: 'POST',
                    data: JSON.stringify({
                        query: `
                            query recentlyViewedProducts(
                                $productIds: [Int!]
                                $first: Int
                                $currencyCode: currencyCode!
                            ) {
                                site {
                                    products(entityIds: $productIds, first: $first) {
                                        edges {
                                            node {
                                                entityId
                                                name
                                                sku
                                                path
                                                addToCartUrl
                                                minPurchaseQuantity
                                                maxPurchaseQuantity
                                                pricesWithTax: prices(includeTax: true, currencyCode: $currencyCode) {
                                                    price {
                                                        ...MoneyFields
                                                    }
                                                    basePrice {
                                                        ...MoneyFields
                                                    }
                                                    salePrice {
                                                        ...MoneyFields
                                                    }
                                                    retailPrice {
                                                        ...MoneyFields
                                                    }
                                                    priceRange {
                                                        min {
                                                            ...MoneyFields
                                                        }
                                                        max {
                                                            ...MoneyFields
                                                        }
                                                    }
                                                }
                                                pricesWithoutTax: prices(includeTax: false, currencyCode: $currencyCode) {
                                                    price {
                                                        ...MoneyFields
                                                    }
                                                    basePrice {
                                                        ...MoneyFields
                                                    }
                                                    salePrice {
                                                        ...MoneyFields
                                                    }
                                                    retailPrice {
                                                        ...MoneyFields
                                                    }
                                                    priceRange {
                                                        min {
                                                            ...MoneyFields
                                                        }
                                                        max {
                                                            ...MoneyFields
                                                        }
                                                    }
                                                }
                                                defaultImage {
                                                    ...ImageFields
                                                }
                                                brand {
                                                    name
                                                }
                                                reviewSummary {
                                                    averageRating
                                                }
                                                productOptions(first: 1) {
                                                    edges {
                                                        node {
                                                            entityId
                                                        }
                                                    }
                                                }
                                                availabilityV2 {
                                                    status
                                                }
                                                inventory {
                                                    isInStock
                                                }
                                            }
                                        }
                                    }
                                    settings {
                                        tax {
                                            plp
                                        }
                                        inventory {
                                            defaultOutOfStockMessage
                                        }
                                    }
                                    currency(currencyCode: $currencyCode) {
                                        display {
                                            symbol
                                            symbolPlacement
                                            decimalToken
                                            thousandsToken
                                            decimalPlaces
                                        }
                                    }
                                }
                            }
                            fragment MoneyFields on Money {
                                value
                                currencyCode
                            }
                            fragment ImageFields on Image {
                                url80wide: url(width: 80)
                                url160wide: url(width: 160)
                                url320wide: url(width: 320)
                                url640wide: url(width: 640)
                            }
                        `,
                        variables: {
                            productIds,
                            first: productIds.length,
                            currencyCode: this.currencyCode,
                        },
                    }),
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${this.graphQLToken}`,
                    },
                    xhrFields: {
                        withCredentials: true,
                    },
                    success: (resp) => {
                        const currency = {
                            currency_token: resp.data.site.currency.display.symbol,
                            currency_location: String(resp.data.site.currency.display.symbolPlacement).toLowerCase(),
                            decimal_token: resp.data.site.currency.display.decimalToken,
                            decimal_places: resp.data.site.currency.display.decimalPlaces,
                            thousands_token: resp.data.site.currency.display.thousandsToken,
                        };

                        const ratingHtml = (rating) => (!rating ? '' : Array.from(Array(5).keys())
                            .map(i => this.ratingStarHtmlFunc(rating > i))
                            .join(''));

                        const saleBadge = prices => {
                            // return '' if no sale price
                            if (!prices?.salePrice || prices.salePrice.value === prices.basePrice.value) return '';

                            // return 'sale' badge
                            if (this.product_sale_badges === 'label') return this.product_sale_label;

                            const n = prices.salePrice ? Math.round((prices.basePrice.value - prices.salePrice.value) / prices.basePrice.value * 100) : 0;
                            const percent = n > 0 ? `${n}%` : '';

                            // return 'sale {percent}' badge
                            if (this.product_sale_label.includes('{percent}')) return this.product_sale_label.replace('{percent}', percent);

                            // recent 'sale ...%' badge
                            return `${this.product_sale_label}<span>${percent}</span>`;
                        };

                        const products = resp.data.site.products.edges
                            .map(({ node }, index) => ({
                                index,
                                id: node.entityId,
                                name: node.name,
                                url: node.path,
                                defaultImage: node.defaultImage,
                                defaultProductImage: this.defaultProductImage,
                                restrictToLogin: this.restrictToLogin,
                                price: !this.restrictToLogin && node.pricesWithoutTax && node.pricesWithTax ? {
                                    value: resp.data.site.settings.tax.plp === 'EX' ? node.pricesWithoutTax.price.value : node.pricesWithTax.price.value,
                                    formatted: this.formatPrice(resp.data.site.settings.tax.plp === 'EX' ? node.pricesWithoutTax : node.pricesWithTax, currency),
                                } : null,
                                saleBadge: saleBadge(resp.data.site.settings.tax.plp === 'EX' ? node.pricesWithoutTax : node.pricesWithTax),
                                brand: node.brand,
                                ratingHtml: this.showProductRating ? ratingHtml(node.reviewSummary?.averageRating) : '',
                                cardExtraClass: `${this.card_show_border ? '_border' : ''} ${!this.card_show_button ? '_hideBtn' : ''}`,
                                show_product_quick_view: this.show_product_quick_view,
                                card_show_swatches: this.card_show_swatches,
                                ajax_add_to_cart: this.ajax_add_to_cart,
                                product_sale_badges: this.product_sale_badges,
                                product_sale_label: this.product_sale_label,
                                txtQuickView: this.txtQuickView,
                                txtChooseOptions: this.txtChooseOptions,
                                txtPreOrder: this.txtPreOrder,
                                txtAddToCart: this.txtAddToCart,
                                txtQuantity: this.txtQuantity,
                                txtQuantityDecrease: this.txtQuantityDecrease.replace('{name}', node.name),
                                txtQuantityIncrease: this.txtQuantityIncrease.replace('{name}', node.name),
                                preOrder: node.availabilityV2.status === 'Preorder',
                                hasOptions: node.availabilityV2.status === 'Available' && node.productOptions.edges.length > 0,
                                addToCartUrl: node.availabilityV2.status !== 'Unavailable' && node.productOptions.edges.length === 0 && node.inventory.isInStock ? node.addToCartUrl : '',
                                outOfStockMessage: !node.inventory.isInStock ? resp.data.site.settings.inventory.defaultOutOfStockMessage : '',
                                qtyBoxHtml: this.show_product_quantity_box ? this.qtyBoxHtmlFunc(node.entityId, node.minPurchaseQuantity, node.maxPurchaseQuantity, this.txtQuantity, this.txtQuantityDecrease, this.txtQuantityIncrease) : '',
                            }));
                        resolve(products);
                    },
                    error: () => {
                        resolve('');
                    },
                });
            });
        }

        return this.cachedProducts[cacheKey];
    }
}

export function parseJSON(str) {
    try {
        return JSON.parse(str);
    } catch (e) {
        return null;
    }
}

export default {};
