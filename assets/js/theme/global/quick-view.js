import _ from 'lodash';
import 'foundation-sites/js/foundation/foundation';
import 'foundation-sites/js/foundation/foundation.dropdown';
import utils from '@bigcommerce/stencil-utils';
import ProductDetails from '../common/product-details';
import { defaultModal } from './modal';
import 'slick-carousel';

export default function (context) {
    // Supermarket - Instantload feature
    if (context.instantload) {
        return;
    }

    const modal = defaultModal();

    // Fetch widget region by Product ID
    async function fetchWidgetById(productId) {
        if (!productId) return [];
        const resp = await $.ajax({
            url: '/graphql',
            method: 'POST',
            data: JSON.stringify({
                query: `
                    query {
                        site {
                            content {
                                renderedRegionsByPageTypeAndEntityId(entityPageType: PRODUCT, entityId: ${productId}){
                                    regions {
                                        name
                                        html
                                    }
                                }
                            }
                        }
                    }
                `,
                variables: {
                    productId,
                },
            }),
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${context.graphQLToken}`,
            },
            xhrFields: {
                withCredentials: true,
            },
        });
        const listRegion = resp?.data?.site?.content?.renderedRegionsByPageTypeAndEntityId?.regions;

        const productRegion = [];

        $.each(listRegion, (i, el) => {
            if (el.name === 'product_description_tab_content--global' || el.name === 'product_description_tab_content') {
                productRegion.push(el);
            }
        });

        return productRegion;
    }

    // supermarket add .quickview-alt to support Choose Options show quickview
    $('body').on('click', '.quickview, .quickview-alt', event => {
        event.preventDefault();

        const productId = $(event.currentTarget).data('productId');

        // papathemes-inhealth
        const size = $(event.target).hasClass('quickview-alt') ? 'purchaseOptions' : 'large';

        modal.open({ size });

        // papathemes-beautify
        const config = {
            product: {
                videos: context.productpage_videos_count,
                reviews: context.productpage_reviews_count,
                related_products: {
                    limit: context.productpage_related_products_count,
                },
                similar_by_views: {
                    limit: context.productpage_similar_by_views_count,
                },
            },
        };

        // papathemes-inhealth
        const template = $(event.target).hasClass('quickview-alt') ? 'products/quick-view-alt' : 'products/quick-view';

        const fetchWidget = fetchWidgetById(productId);

        utils.api.product.getById(productId, { template, config }, (err, response) => {
            modal.updateContent(response);

            modal.$content.find('.productView').addClass('productView--quickView');

            modal.$content.find('[data-slick]').slick();

            // Papathemes Also Bought MOD {{{
            const $quickView = modal.$content.find('.quickView');
            let product;
            if ($('[data-also-bought] .productView-alsoBought-item', $quickView).length > 0) {
                product = new ProductDetails($quickView, _.extend(context, { enableAlsoBought: true }));
            } else {
                product = new ProductDetails($quickView, context);
            }

            $('body').trigger('loaded.quickview', [product]);

            // Supermarket: Track recently viewed products
            $('body').trigger('productviewed', [Number($quickView.find('input[name="product_id"]').val())]);

            // Get widget region by Product ID
            const $scope = modal.$content.find('.productView--quickView');
            const $tabContentGlobal = $scope.find('[data-content-region="product_description_tab_content--global"]');
            const $tabContent = $scope.find('[data-content-region="product_description_tab_content"]');

            fetchWidget.then(data => {
                $.each(data, (i, el) => {
                    if (el.name === 'product_description_tab_content--global') {
                        $tabContentGlobal.html(el.html);
                    } else {
                        $tabContent.html(el.html);
                    }
                });
            });

            return product;
            // }}}
        });
    });
}
