import { hooks } from '@bigcommerce/stencil-utils';
import CatalogPage from './catalog';
// Supermarket Mod
// import compareProducts from './global/compare-products';
import compareProducts from '../papathemes/compare-products';
import FacetedSearch from './common/faceted-search';
import { createTranslationDictionary } from '../theme/common/utils/translations-utils';
import actionBarFactory from '../papathemes/action-bar'; // Papathemes - Supermarket
import bulkOrderFactory from '../papathemes/bulk-order';
import { StandardInfiniteScroll, FacetedInfiniteScroll } from '../papathemes/faceted-infinite-scroll'; // Chiara

export default class Brand extends CatalogPage {
    constructor(context) {
        super(context);
        this.validationDictionary = createTranslationDictionary(context);
    }

    onReady() {
        // Chiara: infinite scroll
        const enableInfiniteScroll = $('#product-listing-container').data('brandInfiniteScroll');

        // Papathemes - Bulk Order
        if (this.context && (this.context.show_bulk_order_mode || this.context.useBulkOrder)) {
            this.bulkOrder = bulkOrderFactory(this.context);
        }

        // Supermarket Mod
        // compareProducts(this.context.urls);
        compareProducts(this.context);

        // Papathemes: infinite scroll
        const infiniteScrollOptions = {
            bulkOrder: this.bulkOrder,
            enableInfiniteScroll,
            txtLoadMore: this.context.txtLoadMore,
            insertTopPaginationFunc: ($pagination, $productListingContainer) => $productListingContainer.find('.productGrid').before($pagination),
            insertBottomPaginationFunc: ($pagination, $productListingContainer) => $productListingContainer.find('.productGrid').after($pagination),
        };

        actionBarFactory(); // Papathemes - Supermarket
        if ($('#facetedSearch').length > 0) {
            // Chiara: init infinite scroll for faceted search
            if (enableInfiniteScroll) {
                this.facetedInfiniteScroll = new FacetedInfiniteScroll(infiniteScrollOptions);
            }

            this.initFacetedSearch();
        } else {
            this.onSortBySubmit = this.onSortBySubmit.bind(this);
            hooks.on('sortBy-submitted', this.onSortBySubmit);

            // Chiara: init infinite scroll for standard category page without faceted filters
            if (enableInfiniteScroll) {
                this.standardInfiniteScroll = new StandardInfiniteScroll({
                    requestOptions: {
                        config: {
                            brand: {
                                products: {
                                    limit: this.context.brandProductsPerPage,
                                },
                            },
                        },
                        template: 'brand/product-listing',
                    },
                    ...infiniteScrollOptions,
                });
            }
        }
    }

    // Supermarket
    destroy() {
        if (this.facetedSearch) {
            this.facetedSearch.destroy();
        } else {
            hooks.off('sortBy-submitted', this.onSortBySubmit);
        }
    }

    initFacetedSearch() {
        const {
            price_min_evaluation: onMinPriceError,
            price_max_evaluation: onMaxPriceError,
            price_min_not_entered: minPriceNotEntered,
            price_max_not_entered: maxPriceNotEntered,
            price_invalid_value: onInvalidPrice,
        } = this.validationDictionary;
        const $productListingContainer = $('#product-listing-container');
        const $facetedSearchContainer = $('#faceted-search-container');
        const productsPerPage = this.context.brandProductsPerPage;
        const requestOptions = {
            template: {
                productListing: 'brand/product-listing',
                sidebar: 'brand/sidebar',
            },
            config: {
                shop_by_brand: true,
                brand: {
                    products: {
                        limit: productsPerPage,
                    },
                },
            },
            showMore: 'brand/show-more',
        };

        this.facetedSearch = new FacetedSearch(requestOptions, (content, url) => {
            // Chiara: Infinite Scroll mod
            if (this.facetedInfiniteScroll) {
                return this.facetedInfiniteScroll.refreshView(content, url);
            }

            $productListingContainer.html(content.productListing);
            $facetedSearchContainer.html(content.sidebar);

            $('body').triggerHandler('compareReset');

            // Papathemes - Bulk Order
            if (this.bulkOrder) {
                this.bulkOrder.reinit();
            }

            // mooncat: only scroll to top if not horizontal layout
            if (!$facetedSearchContainer.hasClass('_horizontal')) {
                $('html, body').animate({
                    scrollTop: 0,
                }, 100);
            }
        }, {
            validationErrorMessages: {
                onMinPriceError,
                onMaxPriceError,
                minPriceNotEntered,
                maxPriceNotEntered,
                onInvalidPrice,
            },
        });
    }
}
