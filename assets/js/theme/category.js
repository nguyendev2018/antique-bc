import { hooks } from '@bigcommerce/stencil-utils';
import CatalogPage from './catalog';
// Supermarket Mod
// import compareProducts from './global/compare-products';
import compareProducts from '../papathemes/compare-products';
import FacetedSearch from './common/faceted-search';
import { createTranslationDictionary } from '../theme/common/utils/translations-utils';
import actionBarFactory from '../papathemes/action-bar'; // Papathemes - Supermarket
// import { autoExpandCategoryMenu } from '../papathemes/theme-utils'; // Supermarket
import bulkOrderFactory from '../papathemes/bulk-order';
import SearchInCategory from '../papathemes/search-in-category';
import initShopByPriceSlider from '../beautify/shop-by-price-slider';
import { StandardInfiniteScroll, FacetedInfiniteScroll } from '../papathemes/faceted-infinite-scroll'; // Chiara

export default class Category extends CatalogPage {
    constructor(context) {
        super(context);
        this.validationDictionary = createTranslationDictionary(context);
    }

    onReady() {
        // Chiara: infinite scroll
        const enableInfiniteScroll = $('#product-listing-container').data('categoryInfiniteScroll');

        // console.log('category onReady');
        // autoExpandCategoryMenu(this.context); // Supermarket

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

        if ($('#facetedSearch').length > 0) {
            // Chiara: init infinite scroll for faceted search
            if (enableInfiniteScroll) {
                this.facetedInfiniteScroll = new FacetedInfiniteScroll(infiniteScrollOptions);
            }

            this.initFacetedSearch();
        } else {
            this.onSortBySubmit = this.onSortBySubmit.bind(this);
            hooks.on('sortBy-submitted', this.onSortBySubmit);

            // papathemes-beautify
            initShopByPriceSlider();
            if (this.context.categorypage_search === 'show') {
                $('body').on('afterupdate.searchincategory', () => initShopByPriceSlider());
            }

            // Chiara: init infinite scroll for standard category page without faceted filters
            if (enableInfiniteScroll) {
                this.standardInfiniteScroll = new StandardInfiniteScroll({
                    requestOptions: {
                        config: {
                            category: {
                                products: {
                                    limit: this.context.categoryProductsPerPage,
                                },
                            },
                        },
                        template: 'category/product-listing',
                    },
                    ...infiniteScrollOptions,
                });
            }
        }

        // Papathemes - Supermarket
        actionBarFactory();

        // Supermarket
        if (this.context.categorypage_search === 'show') {
            this.initSearchInCategory();
        }

        // papathemes-beautify
        $('#categories-navList .navList-action--checkbox').on('click', event => $(event.target).toggleClass('is-selected'));
    }

    // Supermarket
    destroy() {
        if (this.searchInCategory) {
            this.searchInCategory.destroy();
        }
        if (this.facetedSearch) {
            this.facetedSearch.destroy();
        } else {
            hooks.off('sortBy-submitted', this.onSortBySubmit);
        }
    }

    // Supermarket
    initSearchInCategory() {
        this.searchInCategory = new SearchInCategory({
            context: this.context,
            facetedSearch: this.facetedSearch,
            searchCallback: (content, url) => { // papathemes: infinite scroll + search in category compatibility
                if (this.standardInfiniteScroll) {
                    return this.standardInfiniteScroll.refreshView(content, url);
                }

                $('#product-listing-container').html(content.productListing);

                if (this.bulkOrder) {
                    this.bulkOrder.reinit();
                }

                actionBarFactory();

                $('body').triggerHandler('compareReset');

                // mooncat: only scroll to top if not horizontal layout
                if (!$('#faceted-search-container').hasClass('_horizontal')) {
                    $('html, body').animate({
                        scrollTop: 0,
                    }, 100);
                }
            },
        });
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
        const productsPerPage = this.context.categoryProductsPerPage;
        const requestOptions = {
            config: {
                category: {
                    shop_by_price: true,
                    products: {
                        limit: productsPerPage,
                    },
                },
            },
            template: {
                productListing: 'category/product-listing',
                sidebar: 'category/sidebar',
            },
            showMore: 'category/show-more',
        };

        this.facetedSearch = new FacetedSearch(requestOptions, (content, url) => { // chiara mod
            // Chiara: Infinite Scroll mod
            if (this.facetedInfiniteScroll) {
                return this.facetedInfiniteScroll.refreshView(content, url);
            }

            $productListingContainer.html(content.productListing);
            $facetedSearchContainer.html(content.sidebar);

            // Papathemes - Bulk Order
            if (this.bulkOrder) {
                this.bulkOrder.reinit();
            }

            $('body').triggerHandler('compareReset');

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
