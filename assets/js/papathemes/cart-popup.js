import utils from '@bigcommerce/stencil-utils';
import Cart from '../theme/cart';

const DATAKEY = 'data-papathemes-cart-popup';

export default class CartPopup extends Cart {
    constructor(context, $scope) {
        super(context);

        this.$scope = $scope;
        this.$cartPageContent = this.$scope.find(`[${DATAKEY}]`).length > 0 ? this.$scope.find(`[${DATAKEY}]`) : this.$scope;
        this.$cartContent = this.$scope.find(`[${DATAKEY}-content]`);
        this.$cartMessages = this.$scope.find(`[${DATAKEY}-status]`);
        this.$cartTotals = this.$scope.find(`[${DATAKEY}-totals]`);
        this.$cartAdditionalCheckoutBtns = this.$scope.find(`[${DATAKEY}-additional-checkout-buttons]`);
        this.$overlay = this.$cartPageContent.find('.loadingOverlay')
            .hide(); // TODO: temporary until roper pulls in his cart components

        this.template = {
            content: 'papathemes/cart-popup/content',
            totals: 'papathemes/cart-popup/totals',
            pageTitle: 'papathemes/cart-popup/page-title',
            statusMessages: 'papathemes/cart-popup/status-messages',
            additionalCheckoutButtons: 'papathemes/cart-popup/additional-checkout-buttons',
        };

        this.requireMainCartReload = false;

        this.setApplePaySupport();
        this.bindEvents();
    }

    onReady() {
        // don't use onReady from parent class
    }

    bindEvents() {
        super.bindEvents();

        // Remove 'cart-update' event for this class
        utils.hooks.off('cart-update', this.onCartUpdate);

        // Trigger 'cart-update' event when closing the cart preview popup if required
        this.$scope.one('close.toggle', () => {
            if (this.requireMainCartReload) {
                utils.hooks.emit('cart-update');
            }
        });
    }

    refreshContent(remove) {
        super.refreshContent(remove);

        // Mark the main cart should be updated
        this.requireMainCartReload = true;
    }
}
