import { debounce } from 'lodash';
import Card from './Card';

class ProductSwatches {
    constructor({
        cardSelector = '.product .card, .productCarousel-slide .card',
        productIdSelector = '[data-product-id]',
        findProductIdByImg = false,
        swatchesContainerSelector = '.card-text--colorswatches',
        cardImageSelector = '.card-image',
        addToCartFormSelector = 'form[data-cart-item-add]',
        productViewFile = 'products/product-view',
        attributesTemplate = `
            <div class="productSwatches-attributes">
                {{#attributes}}
                    <div class="productSwatches-swatches" data-swatches>
                        {{#.}}
                            <a href="#" class="productSwatches-swatches-item productSwatches-swatches-item--{{type}}" title="{{label}}"
                                data-attribute-id="{{attributeId}}"
                                data-attribute-value="{{attributeValue}}">{{&content}}</a>
                        {{/.}}
                        <button type="button" class="productSwatches-swatches-more" data-more>+ More</button>
                        <button type="button" class="productSwatches-swatches-less" data-less>- Less</button>
                    </div>
                {{/attributes}}
            </div>
        `,
        templateCustomTags = null,
        imageSize = '590x590',
        inputFinderFunc = null,
        swatchesLimit = 5,
        imageReplacerFunc = null,
        includeOptions = [],
        displayInStockOnly = false,
        autoSelectOptionValues = true,
        graphQLToken = '',
    } = {}) {
        this.config = {
            cardSelector,
            productIdSelector,
            findProductIdByImg,
            swatchesContainerSelector,
            cardImageSelector,
            addToCartFormSelector,
            productViewFile,
            attributesTemplate,
            templateCustomTags,
            imageSize,
            inputFinderFunc,
            swatchesLimit,
            imageReplacerFunc,
            includeOptions: includeOptions.map(s => String(s).trim().toLocaleUpperCase()),
            displayInStockOnly,
            autoSelectOptionValues,
            graphQLToken,
        };

        this.bindEvents();
    }

    bindEvents() {
        const MutationObserver = window.MutationObserver || window.WebKitMutationObserver;
        if (MutationObserver) {
            this.mutationObserver = new MutationObserver(debounce(() => {
                this.onWindowScroll();
            }, 200));
            this.mutationObserver.observe(document.documentElement, {
                childList: true,
                subtree: true,
            });
        }
    }

    unbindEvents() {
        if (this.mutationObserver) {
            this.mutationObserver.disconnect();
            this.mutationObserver = null;
        }
    }

    onWindowScroll($body = null) {
        /**
         * @type {Card[]}
         */
        const cards = [];

        $(this.config.cardSelector, $body).not('.productSwatchesLoaded').each((i, el) => {
            const $scope = $(el).addClass('productSwatchesLoaded');
            if ($scope.data('productSwatchesCard')) {
                return;
            }

            let productId = Number($scope.data('productId') || $scope.find(this.config.productIdSelector).data('productId'));
            if (!productId) {
                // try to find product ID by img src
                if (!this.config.findProductIdByImg) {
                    return;
                }
                productId = $scope.find('img').get().reduce((id, img) => {
                    if (id) {
                        return id;
                    }
                    const m = String(img.src).match(/products\/([0-9]+)\//);
                    return m ? Number(m[1]) : id;
                }, null);
                if (!productId) {
                    return;
                }
            }

            const $attributesContainer = $scope.find(this.config.swatchesContainerSelector);
            if ($attributesContainer.length === 0) {
                return;
            }

            const {
                productViewFile,
                attributesTemplate,
                templateCustomTags,
                addToCartFormSelector,
                imageSize,
                inputFinderFunc,
                swatchesLimit,
                imageReplacerFunc,
                includeOptions,
                displayInStockOnly,
                autoSelectOptionValues,
                graphQLToken,
            } = this.config;

            const $cardImage = $scope.find(this.config.cardImageSelector).first();

            const card = new Card({
                $scope,
                $attributesContainer,
                productId,
                productViewFile,
                attributesTemplate,
                templateCustomTags,
                addToCartFormSelector,
                $cardImage,
                imageSize,
                inputFinderFunc,
                swatchesLimit,
                imageReplacerFunc,
                includeOptions,
                displayInStockOnly,
                autoSelectOptionValues,
                autoInit: !graphQLToken,
            });
            cards.push(card);

            $scope.data('productSwatchesCard', card);
        });

        if (this.config.graphQLToken && cards.length > 0) {
            const ids = Array.from(new Set(cards.map(card => card.productId)));
            this.fetchGraphQLProducts(ids).then(edges => {
                edges.forEach(edge => {
                    cards.filter(card => card.productId === edge.node.entityId).forEach(card => {
                        card.graphQLNode = edge.node; // eslint-disable-line no-param-reassign
                        card.init();
                    });
                });
            });
        }
    }

    async fetchGraphQLProducts(ids) {
        let edges = [];
        for (let i = 0; i < ids.length; i += 50) {
            const _ids = ids.slice(i, i + 50);
            const resp = await $.ajax({
                url: '/graphql',
                method: 'POST',
                data: JSON.stringify({
                    query: `
                        query {
                            site {
                                products (entityIds: ${JSON.stringify(_ids)}, first: ${_ids.length}) {
                                    edges {
                                        node {
                                            entityId
                                            name
                                            minPurchaseQuantity
                                            productOptions {
                                                edges {
                                                    node {
                                                        entityId
                                                        displayName
                                                        ... on CheckboxOption {
                                                            checkedByDefault
                                                        }
                                                        ... on MultipleChoiceOption {
                                                            displayStyle
                                                            values {
                                                                edges {
                                                                    node {
                                                                        entityId
                                                                        isDefault
                                                                        ... on SwatchOptionValue {
                                                                            label
                                                                            hexColors
                                                                            imageUrl(width: 100)
                                                                        }
                                                                        ... on MultipleChoiceOptionValue {
                                                                            label
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    `,
                }),
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.config.graphQLToken}`,
                },
                xhrFields: {
                    withCredentials: true,
                },
            });
            edges = edges.concat(resp.data.site.products.edges);
        }
        return edges;
    }
}

export default ProductSwatches;
