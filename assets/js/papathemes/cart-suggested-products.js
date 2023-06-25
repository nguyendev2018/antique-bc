import utils from '@bigcommerce/stencil-utils';
import { shuffle } from 'lodash';
import Mustache from 'mustache';
import { ProductCardsGraphQLQuery } from './utils';

let observer;

class CartSuggestedProductsObserver {
    constructor(options = {}) {
        this.onCartChanged = this.onCartChanged.bind(this);

        this.loaded = false;
        this.products = [];
        this.options = options;
        this.query = new ProductCardsGraphQLQuery(options);

        this.unbindEvents();
        this.bindEvents();
    }

    bindEvents() {
        utils.hooks.on('cart-item-add-remote', this.onCartChanged);
        utils.hooks.on('cart-item-update-remote', this.onCartChanged);
        utils.hooks.on('cart-item-remove-remote', this.onCartChanged);
    }

    unbindEvents() {
        utils.hooks.off('cart-item-add-remote', this.onCartChanged);
        utils.hooks.off('cart-item-update-remote', this.onCartChanged);
        utils.hooks.off('cart-item-remove-remote', this.onCartChanged);
    }

    onCartChanged() {
        this.loaded = false;
        this.products = [];
        utils.hooks.emit('cart-suggested-products-change');
    }

    async load() {
        if (this.loaded) return this.products;

        const cart = await new Promise(resolve => {
            utils.api.cart.getCart({}, (err, response) => {
                resolve(response);
            });
        });

        const cartProductIds = [...cart.lineItems.physicalItems, ...cart.lineItems.digitalItems].map(item => item.productId).filter(productId => productId).slice(0, 50);
        this.products = this.fetchRelatedProducts(cartProductIds);
        this.loaded = true;
        return this.products;
    }

    async fetchRelatedProducts(productIds) {
        if (!productIds || productIds.length === 0) return [];

        const relatedProductIds = await new Promise(resolve => {
            $.ajax({
                url: '/graphql',
                method: 'POST',
                data: JSON.stringify({
                    query: `
                        query relatedProducts(
                            $productIds: [Int!]
                            $first: Int
                        ) {
                            site {
                                products(entityIds: $productIds, first: $first) {
                                    edges {
                                        node {
                                            relatedProducts(hideOutOfStock: true) {
                                                edges {
                                                    node {
                                                        entityId
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    `,
                    variables: {
                        productIds,
                        first: productIds.length,
                    },
                }),
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.options.graphQLToken}`,
                },
                xhrFields: {
                    withCredentials: true,
                },
                success: (resp) => {
                    const ids = resp.data.site.products.edges.reduce((_ids, { node: { relatedProducts } }) =>
                        relatedProducts.edges.reduce(
                            (_ids2, { node: { entityId } }) => (_ids2.includes(entityId) ? _ids2 : [..._ids2, entityId]),
                            _ids,
                        ), []);

                    resolve(ids);
                },
                error: () => {
                    resolve([]);
                },
            });
        });

        return this.query.load(relatedProductIds);
    }
}

class CartSuggestedProducts {
    constructor({
        $scope,
        template = `
            <div>
            {{#products}}
                <article class="card {{cardExtraClass}}"
                    data-event-type="list"
                    data-entity-id="{{id}}"
                    data-position="{{index}}"
                    data-name="{{name}}"
                    data-product-price="{{price.value}}">
                    <figure class="card-figure">
                        {{#saleBadge}}
                            <div class="sale-flag-side {{#product_sale_badges}}_percent{{/product_sale_badges}}">
                                <span class="sale-text">{{&saleBadge}}</span>
                            </div>
                        {{/saleBadge}}
                        <a class="card-img-container" href="{{url}}">
                            <img
                                {{#defaultImage}}
                                    src="{{url320wide}}"
                                    srcset="{{url80wide}} 80w, {{url160wide}} 160w, {{url320wide}} 320w, {{url640wide}} 640w"
                                {{/defaultImage}}
                                {{^defaultImage}}
                                    src="{{defaultProductImage}}"
                                {{/defaultImage}}
                                data-sizes="auto"
                                class="card-image lazyload"
                                alt="{{name}}"
                                title="{{name}}">
                        </a>
                        <figcaption class="card-figcaption">
                            <div class="card-figcaption-body">
                                <div class="card-buttons card-buttons--alt">
                                    {{#show_product_quick_view}}
                                        <a class="button card-figcaption-button quickview" tabindex="0" data-event-type="product-click" data-product-id="{{id}}"><svg class="icon"><use xlink:href="#icon-bs-search"></use></svg>{{txtQuickView}}</a>
                                    {{/show_product_quick_view}}
                                </div>
                            </div>
                        </figcaption>
                    </figure>
                    <div class="card-body">
                        <div class="card-badges">
                            {{#saleBadge}}
                                <div class="sale-flag-side {{#product_sale_badges}}_percent{{/product_sale_badges}}">
                                    <span class="sale-text">{{&saleBadge}}</span>
                                </div>
                            {{/saleBadge}}
                        </div>
                        <h3 class="card-title">
                            <a href="{{url}}" data-event-type="product-click">{{name}}</a>
                        </h3>
                        {{#ratingHtml}}
                            <p class="card-text card-text--rating" data-test-info-type="productRating">
                                <span class="rating--small">
                                    {{&ratingHtml}}
                                </span>
                            </p>
                        {{/ratingHtml}}
                        {{#brand}}
                            <div class="card-text card-text--brand" data-test-info-type="brandName">
                                {{brand.name}}
                            </div>
                        {{/brand}}
                        {{#card_show_swatches}}
                            <div class="card-text card-text--colorswatches"></div>
                        {{/card_show_swatches}}
                        {{#price}}
                            <div class="card-text--price">
                                {{&price.formatted}}
                            </div>
                        {{/price}}
                    </div>
                    <div class="card-footer{{#card_show_button}} _show{{/card_show_button}}" {{^card_show_button}}tabindex="0"{{/card_show_button}}>
                        <div class="card-buttons">
                            {{^restrictToLogin}}
                                {{#hasOptions}}
                                    <div class="_qtyAdd">
                                        {{&qtyBoxHtml}}
                                        <a href="{{url}}" target="_blank" data-event-type="product-click" class="button button--primary card-figcaption-button{{#show_product_quick_view}}{{#ajax_add_to_cart}} quickview-alt{{/ajax_add_to_cart}}{{/show_product_quick_view}}" data-product-id="{{id}}">{{txtChooseOptions}}</a>
                                    </div>
                                {{/hasOptions}}
                                {{#preOrder}}
                                    <div class="_qtyAdd">
                                        {{&qtyBoxHtml}}
                                        <a href="{{url}}" data-event-type="product-click" class="button button--primary card-figcaption-button">{{txtPreOrder}}</a>
                                    </div>
                                {{/preOrder}}
                                {{#addToCartUrl}}
                                    <div class="_qtyAdd">
                                    {{&qtyBoxHtml}}
                                        <a href="{{addToCartUrl}}"{{^ajax_add_to_cart}} data-event-type="product-click"{{/ajax_add_to_cart}} class="button button--primary card-figcaption-button"{{#ajax_add_to_cart}} data-papathemes-cart-item-add{{/ajax_add_to_cart}}>{{txtAddToCart}}</a>
                                    </div>
                                {{/addToCartUrl}}
                                {{#outOfStockMessage}}
                                    <a href="{{url}}" data-event-type="product-click" class="button button--outstock card-figcaption-button" data-product-id="{{id}}">{{outOfStockMessage}}</a>
                                {{/outOfStockMessage}}
                            {{/restrictToLogin}}
                        </div>
                    </div>
                </article>
            {{/products}}
            </div>
        `,
    } = {}) {
        if (!observer) return;

        this.onRemove = this.onRemove.bind(this);
        this.onViewport = this.onViewport.bind(this);
        this.onCartChanged = this.onCartChanged.bind(this);
        this.template = template;
        this.loaded = false;
        this.$scope = $scope;

        if (this.$scope.length === 0) return;

        this.unbindEvents();
        this.bindEvents();
    }

    bindEvents() {
        this.viewportObserver = new IntersectionObserver(this.onViewport);
        this.$scope.get().forEach(el => this.viewportObserver.observe(el));
        this.$scope.on('remove', this.onRemove);
        utils.hooks.on('cart-suggested-products-change', this.onCartChanged);
    }

    unbindEvents() {
        if (this.viewportObserver) {
            this.$scope.get().forEach(el => this.viewportObserver.disconnect(el));
        }
        this.$scope.off('remove', this.onRemove);
        utils.hooks.off('cart-suggested-products-change', this.onCartChanged);
    }

    onRemove(event) {
        if (this.viewportObserver) {
            this.viewportObserver.disconnect(event.currentTarget);
        }
    }

    async onViewport() {
        if (this.loaded) return;

        this.loaded = true;
        this.$scope.show();

        const products = shuffle(await observer.load());
        const html = Mustache.render(this.template, { products });
        const $cards = $(html).children();

        if ($cards.length === 0) {
            this.$scope.hide();
            return;
        }

        const $carousel = this.$scope.find('.productCarousel');

        if ($carousel.length > 0) {
            $carousel.filter('.slick-initialized[data-slick]').slick('unslick');
            $carousel.html($cards.get().map(el => $('<div class="productCarousel-slide"></div>').append(el)));
            $carousel.filter('[data-slick]').slick();
        }
    }

    onCartChanged(productId) {
        if (productId && !observer.productIds.includes(productId)) {
            this.loaded = false;
        }
    }
}

function initObserver(context) {
    const restrictToLogin = !context.customerId && context.restrict_to_login;

    if (!observer) {
        observer = new CartSuggestedProductsObserver({
            ...context,
            restrictToLogin,
        });
    }
}

export default function initCartSuggestedProducts(
    context,
    $scope = $('[data-cart-suggested-products]'),
) {
    try {
        initObserver(context);
        const $el = $scope.filter((i, el) => !$(el).data('cartSuggestedProductsInstance'));

        if ($el.length > 0) {
            const instance = new CartSuggestedProducts({
                $scope: $el,
            });
            $el.data('cartSuggestedProductsInstance', instance);
            return instance;
        }
    } catch (e) {
        console.error(e);
    }
}
