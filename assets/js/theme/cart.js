import PageManager from '../page-manager';
import _ from 'lodash';
import checkIsGiftCertValid from './common/gift-certificate-validator';
import { createTranslationDictionary } from './common/utils/translations-utils';
import utils from '@bigcommerce/stencil-utils';
import ShippingEstimator from './cart/shipping-estimator';
import { defaultModal } from './global/modal';
import swal from './global/sweet-alert';

export default class Cart extends PageManager {
    onReady() {
        // mooncat
        this.onCartUpdate = this.onCartUpdate.bind(this);

        this.$cartPageContent = $('[data-cart]');
        this.$cartContent = $('[data-cart-content]');
        this.$cartMessages = $('[data-cart-status]');
        this.$cartTotals = $('[data-cart-totals]');
        this.$cartAdditionalCheckoutBtns = $('[data-cart-additional-checkout-buttons]');
        this.$overlay = $('[data-cart] .loadingOverlay')
            .hide(); // TODO: temporary until roper pulls in his cart components

        // mooncat
        this.template = {
            content: 'cart/content',
            totals: 'cart/totals',
            pageTitle: 'cart/page-title',
            statusMessages: 'cart/status-messages',
            additionalCheckoutButtons: 'cart/additional-checkout-buttons',
        };

        this.setApplePaySupport();
        this.bindEvents();
    }

    setApplePaySupport() {
        if (window.ApplePaySession) {
            this.$cartPageContent.addClass('apple-pay-supported');
        }
    }

    cartUpdate($target) {
        const itemId = $target.data('cartItemid');
        const $el = this.$cartPageContent.find(`input[name="qty-${itemId}"]`); // mooncat edited
        const oldQty = parseInt($el.val(), 10);
        const maxQty = parseInt($el.data('quantityMax'), 10);
        const minQty = parseInt($el.data('quantityMin'), 10);
        const minError = $el.data('quantityMinError');
        const maxError = $el.data('quantityMaxError');
        const newQty = $target.data('action') === 'inc' ? oldQty + 1 : oldQty - 1;

        // Does not quality for min/max quantity
        if (newQty < minQty) {
            return swal.fire({
                text: minError,
                icon: 'error',
            });
        } else if (maxQty > 0 && newQty > maxQty) {
            return swal.fire({
                text: maxError,
                icon: 'error',
            });
        }

        this.$overlay.show();

        utils.api.cart.itemUpdate(itemId, newQty, (err, response) => {
            this.$overlay.hide();

            if (response.data.status === 'succeed') {
                // if the quantity is changed "1" from "0", we have to remove the row.
                const remove = (newQty === 0);

                this.refreshContent(remove);
            } else {
                $el.val(oldQty);
                swal.fire({
                    text: response.data.errors.join('\n'),
                    icon: 'error',
                });
            }
        });
    }

    cartRemoveItem(itemId) {
        this.$overlay.show();
        utils.api.cart.itemRemove(itemId, (err, response) => {
            if (response.data.status === 'succeed') {
                this.refreshContent(true);
            } else {
                this.$overlay.hide();
                swal.fire({
                    text: response.data.errors.join('\n'),
                    icon: 'error',
                });
            }
        });
    }

    cartEditOptions(itemId) {
        const modal = defaultModal();
        const options = {
            template: 'cart/modals/configure-product',
        };

        modal.open();

        utils.api.productAttributes.configureInCart(itemId, options, (err, response) => {
            modal.updateContent(response.content);

            this.bindGiftWrappingForm();
        });

        utils.hooks.on('product-option-change', (event) => {
            const $changedOption = $(event.target); // papathemes-supermarket fix Cornerstone bug
            const $form = $changedOption.parents('form');
            const $submit = $('input.button', $form);
            const $messageBox = $('.alertMessageBox');
            const item = $('[name="item_id"]', $form).attr('value');

            // Supermarket: display selected swatch title
            if ($changedOption.data('productAttributeLabel')) {
                $changedOption
                    .closest('[data-product-attribute]')
                    .find('[data-option-value]')
                    .html($changedOption.data('productAttributeLabel'));
            }

            utils.api.productAttributes.optionChange(item, $form.serialize(), 'products/bulk-discount-rates', (err, result) => {
                const data = result.data || {};

                if (err) {
                    swal.fire({
                        text: err,
                        icon: 'error',
                    });
                    return false;
                }

                if (data.purchasing_message) {
                    $('.alertBox-message', $messageBox).text(data.purchasing_message);
                    $submit.prop('disabled', true);
                    $messageBox.show();
                } else {
                    $submit.prop('disabled', false);
                    $messageBox.hide();
                }

                if (!data.purchasable || !data.instock) {
                    $submit.prop('disabled', true);
                } else {
                    $submit.prop('disabled', false);
                }
            });
        });
    }

    refreshContent(remove) {
        const $cartItemsRows = $('[data-item-row]', this.$cartContent);
        const $cartPageTitle = this.$cartPageContent.find('[data-cart-page-title]');
        // mooncat edited
        const options = {
            template: this.template,
        };

        this.$overlay.show();

        // Remove last item from cart? Reload
        if (remove && $cartItemsRows.length === 1) {
            return window.location.reload();
        }

        utils.api.cart.getContent(options, (err, response) => {
            this.$cartContent.html(response.content);
            this.$cartTotals.html(response.totals);
            this.$cartMessages.html(response.statusMessages);
            this.$cartAdditionalCheckoutBtns.html(response.additionalCheckoutButtons);

            $cartPageTitle.replaceWith(response.pageTitle);
            this.bindEvents();
            this.$overlay.hide();

            const quantity = $('[data-cart-quantity]', this.$cartContent).data('cartQuantity') || 0;

            $('body').trigger('cart-quantity-update', quantity);
        });
    }

    bindCartEvents() {
        const debounceTimeout = 400;
        const cartUpdate = _.bind(_.debounce(this.cartUpdate, debounceTimeout), this);
        const cartRemoveItem = _.bind(_.debounce(this.cartRemoveItem, debounceTimeout), this);

        // cart update
        $('[data-cart-update]', this.$cartContent).on('click', event => {
            const $target = $(event.currentTarget);

            event.preventDefault();

            // update cart quantity
            cartUpdate($target);
        });

        // --------------------------------------------------------------------
        // Giao - supermarket:
        // Fix problem when manually input quality input on the cart page
        // don't update
        // --------------------------------------------------------------------

        $('input[name^="qty-"]', this.$cartContent).on('change', event => { // mooncat edited
            const $el = $(event.currentTarget);
            const itemId = $el.attr('name').replace('qty-', '');
            const oldQty = parseInt($el.data('oldValue'), 10);
            const maxQty = parseInt($el.data('quantityMax'), 10);
            const minQty = parseInt($el.data('quantityMin'), 10);
            const minError = $el.data('quantityMinError');
            const maxError = $el.data('quantityMaxError');
            const newQty = parseInt($el.val(), 10);

            event.preventDefault();

            // Does not quality for min/max quantity
            if (newQty < minQty) {
                $el.val(oldQty);
                return alert(minError);
            } else if (newQty > maxQty) {
                $el.val(oldQty);
                return alert(maxError);
            }

            this.$overlay.show();

            utils.api.cart.itemUpdate(itemId, newQty, (err, response) => {
                this.$overlay.hide();

                if (response.data.status === 'succeed') {
                    // if the quantity is changed "1" from "0", we have to remove the row.
                    const remove = (newQty === 0);

                    this.refreshContent(remove);
                } else {
                    $el.val(oldQty);
                    alert(response.data.errors.join('\n'));
                }
            });
        }).on('focusin', (event) => {
            const $el = $(event.currentTarget);
            $el.data('oldValue', $el.val());
        });

        // --------------------------------------------------------------------

        $('.cart-remove', this.$cartContent).on('click', event => {
            const itemId = $(event.currentTarget).data('cartItemid');
            const string = $(event.currentTarget).data('confirmDelete');
            swal.fire({
                text: string,
                icon: 'warning',
                showCancelButton: true,
                cancelButtonText: this.context.cancelButtonText,
            }).then((result) => {
                if (result.value) {
                    // remove item from cart
                    cartRemoveItem(itemId);
                }
            });
            event.preventDefault();
        });

        $('[data-item-edit]', this.$cartContent).on('click', event => {
            const itemId = $(event.currentTarget).data('itemEdit');

            event.preventDefault();
            // edit item in cart
            this.cartEditOptions(itemId);
        });

        // mooncat: attach 'cart-update' event to refresh the cart
        utils.hooks.on('cart-update', this.onCartUpdate);
    }

    // mooncat
    onCartUpdate() {
        this.refreshContent();
    }

    bindPromoCodeEvents() {
        // mooncat edited
        const $couponContainer = this.$cartPageContent.find('.coupon-code');
        const $couponForm = this.$cartPageContent.find('.coupon-form');
        const $codeInput = $('[name="couponcode"]', $couponForm);

        this.$cartPageContent.find('.coupon-code-add').on('click', event => {
            event.preventDefault();

            $(event.currentTarget).hide();
            $couponContainer.show();
            this.$cartPageContent.find('.coupon-code-cancel').show().focus(); // papathemes-beautify mod
            $codeInput.trigger('focus');
        });

        this.$cartPageContent.find('.coupon-code-cancel').on('click', event => {
            event.preventDefault();

            $couponContainer.hide();
            this.$cartPageContent.find('.coupon-code-cancel').hide();
            this.$cartPageContent.find('.coupon-code-add').show().focus(); // papathemes-beautify mod
        });

        $couponForm.on('submit', event => {
            const code = $codeInput.val();

            event.preventDefault();

            // Empty code
            if (!code) {
                return swal.fire({
                    text: $codeInput.data('error'),
                    icon: 'error',
                });
            }

            utils.api.cart.applyCode(code, (err, response) => {
                if (response.data.status === 'success') {
                    this.refreshContent();
                } else {
                    swal.fire({
                        html: response.data.errors.join('\n'),
                        icon: 'error',
                    });
                }
            });
        });
    }

    bindGiftCertificateEvents() {
        // mooncat edited
        const $certContainer = this.$cartPageContent.find('.gift-certificate-code');
        const $certForm = this.$cartPageContent.find('.cart-gift-certificate-form');
        const $certInput = $('[name="certcode"]', $certForm);

        this.$cartPageContent.find('.gift-certificate-add').on('click', event => {
            event.preventDefault();
            $(event.currentTarget).toggle();
            $certContainer.toggle();
            this.$cartPageContent.find('.gift-certificate-cancel').toggle();
            this.$cartPageContent.find('.gift-certificate-cancel:visible').focus(); // papathemes-beautify
        });

        $('.gift-certificate-cancel').on('click', event => {
            event.preventDefault();
            $certContainer.toggle();
            this.$cartPageContent.find('.gift-certificate-add').toggle();
            this.$cartPageContent.find('.gift-certificate-cancel').toggle();
            this.$cartPageContent.find('.gift-certificate-add:visible').focus(); // papathemes-beautify
        });

        $certForm.on('submit', event => {
            const code = $certInput.val();

            event.preventDefault();

            if (!checkIsGiftCertValid(code)) {
                const validationDictionary = createTranslationDictionary(this.context);
                return swal.fire({
                    text: validationDictionary.invalid_gift_certificate,
                    icon: 'error',
                });
            }

            utils.api.cart.applyGiftCertificate(code, (err, resp) => {
                if (resp.data.status === 'success') {
                    this.refreshContent();
                } else {
                    swal.fire({
                        html: resp.data.errors.join('\n'),
                        icon: 'error',
                    });
                }
            });
        });
    }

    bindGiftWrappingEvents() {
        const modal = defaultModal();

        this.$cartContent.find('[data-item-giftwrap]').on('click', event => { // mooncat edited
            const itemId = $(event.currentTarget).data('itemGiftwrap');
            const options = {
                template: 'cart/modals/gift-wrapping-form',
            };

            event.preventDefault();

            modal.open();

            utils.api.cart.getItemGiftWrappingOptions(itemId, options, (err, response) => {
                modal.updateContent(response.content);

                this.bindGiftWrappingForm();
            });
        });
    }

    bindGiftWrappingForm() {
        $('.giftWrapping-select').on('change', event => {
            const $select = $(event.currentTarget);
            const id = $select.val();
            const index = $select.data('index');

            if (!id) {
                return;
            }

            const allowMessage = $select.find(`option[value=${id}]`).data('allowMessage');

            $(`.giftWrapping-image-${index}`).hide();
            $(`#giftWrapping-image-${index}-${id}`).show();

            if (allowMessage) {
                $(`#giftWrapping-message-${index}`).show();
            } else {
                $(`#giftWrapping-message-${index}`).hide();
            }
        });

        $('.giftWrapping-select').trigger('change');

        function toggleViews() {
            const value = $('input:radio[name ="giftwraptype"]:checked').val();
            const $singleForm = $('.giftWrapping-single');
            const $multiForm = $('.giftWrapping-multiple');

            if (value === 'same') {
                $singleForm.show();
                $multiForm.hide();
            } else {
                $singleForm.hide();
                $multiForm.show();
            }
        }

        $('[name="giftwraptype"]').on('click', toggleViews);

        toggleViews();
    }

    bindEvents() {
        this.bindCartEvents();
        this.bindPromoCodeEvents();
        this.bindGiftWrappingEvents();
        this.bindGiftCertificateEvents();

        // initiate shipping estimator module
        const shippingErrorMessages = {
            country: this.context.shippingCountryErrorMessage,
            province: this.context.shippingProvinceErrorMessage,
        };
        this.shippingEstimator = new ShippingEstimator(this.$cartPageContent.find('[data-shipping-estimator]'), shippingErrorMessages); // mooncat edited
    }
}
