import Mustache from 'mustache';

class Card {
    /**
     * @param {Object} options
     * @param {jQuery} options.$scope
     * @param {jQuery} options.$attributesContainer
     * @param {number} options.productId
     * @param {string} options.productViewFile
     * @param {string} options.attributesTemplate
     * @param {string} options.templateCustomTags
     * @param {string} options.addToCartFormSelector
     * @param {jQuery} options.$cardImage
     * @param {string} options.imageSize
     * @param {function} options.inputFinderFunc
     * @param {number} options.swatchesLimit
     * @param {function} options.imageReplacerFunc
     * @param {string[]} options.includeOptions
     * @param {boolean} options.displayInStockOnly
     * @param {boolean} options.autoSelectOptionValues
     * @param {boolean} [options.autoInit]
     * @param {Object} [options.graphQLNode]
     */
    constructor({
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
        autoInit = true,
        graphQLNode,
    }) {
        this.$scope = $scope;
        this.productId = productId;
        this.$attributesContainer = $attributesContainer;
        this.productViewFile = productViewFile;
        this.attributesTemplate = attributesTemplate;
        this.templateCustomTags = templateCustomTags;
        this.addToCartFormSelector = addToCartFormSelector;
        this.$cardImage = $cardImage;
        this.imageSize = imageSize;
        this.inputFinderFunc = inputFinderFunc;
        this.swatchesLimit = swatchesLimit;
        this.imageReplacerFunc = imageReplacerFunc;
        this.includeOptions = includeOptions;
        this.displayInStockOnly = displayInStockOnly;
        this.autoSelectOptionValues = autoSelectOptionValues;
        this.autoInit = autoInit;
        this.graphQLNode = graphQLNode;

        if (this.autoInit) {
            this.init();
        }
    }

    init() {
        if (this.displayInStockOnly) {
            this.requestInStockAttributes();
        } else if (this.graphQLNode) {
            this.buildProductOptions();
        } else {
            this.requestProductOptions();
        }
    }

    requestInStockAttributes() {
        $.ajax({
            url: `/remote/v1/product-attributes/${this.productId}`,
            method: 'POST',
            data: {
                action: 'add',
                product_id: this.productId,
            },
            headers: {
                'stencil-config': '{}',
                'stencil-options': '{}',
                'x-xsrf-token': window.BCData && window.BCData.csrf_token ? window.BCData.csrf_token : '',
            },
            xhrFields: {
                withCredentials: true,
            },
            success: (resp) => {
                const attributesData = resp.data || {};
                if (typeof attributesData.in_stock_attributes === 'object' || attributesData.instock) {
                    if (this.graphQLNode) {
                        this.buildProductOptions(attributesData);
                    } else {
                        this.requestProductOptions(attributesData);
                    }
                }
            },
        });
    }

    requestProductOptions(attributesData) {
        $.ajax({
            url: `/products.php?productId=${this.productId}`,
            method: 'GET',
            headers: {
                'stencil-config': '{}',
                'stencil-options': `{"render_with":"${this.productViewFile}"}`,
                'x-xsrf-token': window.BCData && window.BCData.csrf_token ? window.BCData.csrf_token : '',
            },
            xhrFields: {
                withCredentials: true,
            },
            success: (resp) => {
                this.buildProductOptions(attributesData, resp);
            },
        });
    }

    buildProductOptions(attributesData = {}, resp) {
        const data = {
            attributes: [],
        };


        if (this.graphQLNode) {
            // load attributes from graphQL
            data.attributes = this.graphQLNode.productOptions.edges.reduce((_options, { node: optionNode }) => {
                if (this.includeOptions.length > 0 && !this.includeOptions.includes(String(optionNode.displayName).toLocaleUpperCase())) {
                    return _options;
                }

                // only display swatch or rectangle options if includeOptions is empty
                if ((!this.includeOptions || this.includeOptions.length === 0) && optionNode.displayStyle !== 'Swatch' && optionNode.displayStyle !== 'RectangleBoxes') {
                    return _options;
                }

                if (optionNode.values) {
                    const values = optionNode.values.edges.reduce((_values, { node: valueNode }) => {
                        if (typeof attributesData.in_stock_attributes !== 'object' || attributesData.in_stock_attributes.indexOf(valueNode.entityId) > -1) {
                            if (valueNode.imageUrl || valueNode.hexColors || valueNode.label) {
                                _values.push({
                                    content: valueNode.imageUrl // eslint-disable-line no-nested-ternary
                                        ? `<span class="form-option-variant form-option-variant--pattern" title="${valueNode.label}" style="background-image: url('${valueNode.imageUrl}');"></span>`
                                        : (valueNode.hexColors
                                            ? valueNode.hexColors.map(color => `<span class='form-option-variant form-option-variant--color' title="${valueNode.label}" style="background-color: ${color}"></span>`).join('')
                                            : `<span class="form-option-variant">${valueNode.label}</span>`),
                                    label: valueNode.label,
                                    type: valueNode.imageUrl || valueNode.hexColors ? 'swatch' : 'rectangle',
                                    attributeId: optionNode.entityId,
                                    attributeValue: valueNode.entityId,
                                });
                            }
                        }
                        return _values;
                    }, []);
                    if (values.length > 0) {
                        _options.push(values);
                    }
                }
                return _options;
            }, []);
        } else {
            // load attributes from AJAX request
            $(resp).find('[data-product-attribute="swatch"]').each((i, el) => {
                const $swatches = $(el);
                const swatches = [];

                $swatches.find('[data-product-attribute-value]').each((_i, labelEl) => {
                    const $label = $(labelEl);
                    const $input = this.inputFinderFunc ? this.inputFinderFunc($swatches, $label) : $swatches.find(`[id="${$label.attr('for')}"]`);
                    const attributeValue = Number($input.attr('value'));
                    const attributeId = Number($input.attr('name').replace(/attribute\[([0-9]+)\]/, '$1'));

                    if (typeof attributesData.in_stock_attributes !== 'object' || attributesData.in_stock_attributes.indexOf(attributeValue) > -1) {
                        swatches.push({
                            content: $label.html(),
                            label: $input.data('productAttributeLabel'),
                            attributeId,
                            attributeValue,
                        });
                    }
                });

                if (swatches.length > 0) {
                    data.attributes.push(swatches);
                }
            });
        }

        if (data.attributes.length === 0) {
            return;
        }

        const html = Mustache.render(this.attributesTemplate, data, null, this.templateCustomTags);
        this.$attributesContainer.append(html);

        let $form;

        if (this.graphQLNode) {
            // build Form from graphQL
            $form = $('<form class="productSwatches-hiddenForm"></form>').hide();
            $form.append('<input type="hidden" name="action" value="add">');
            $form.append(`<input type="hidden" name="product_id" value="${this.productId}">`);
            $form.append(`<input type="hidden" name="qty[]" value="${this.graphQLNode.minPurchaseQuantity || 1}">`);
            this.graphQLNode.productOptions.edges.forEach(({ node: optionNode }) => {
                let defaultValue = '';
                if (optionNode.values) {
                    defaultValue = this.autoSelectOptionValues && optionNode.values.edges.length > 0 ? optionNode.values.edges[0].node.entityId : '';
                    defaultValue = optionNode.values.edges.reduce((_defaultValue, { node: valueNode }) => (valueNode.isDefault ? valueNode.entityId : _defaultValue), defaultValue);
                    if (!defaultValue && attributesData && attributesData.in_stock_attributes) {
                        defaultValue = optionNode.values.edges.reduce((_defaultValue, { node: valueNode }) => _defaultValue || (attributesData.in_stock_attributes.indexOf(valueNode.entityId) > -1 ? valueNode.entityId : ''), '');
                    }
                } else if (optionNode.checkedByDefault) {
                    defaultValue = 1;
                }
                $form.append(`<input type="hidden" name="attribute[${optionNode.entityId}]" value="${defaultValue}">`);
            });
        } else {
            // build Form from AJAX request
            const $form2 = $('<div></div>').append(resp).find(this.addToCartFormSelector)
                .addClass('productSwatches-hiddenForm')
                .hide();

            // Remove all 'id' to avoid duplicated label.for in quick-view
            $form2.find('[id]').prop('id', null);
        }

        this.$attributesContainer.append($form);

        this.$attributesContainer.on('click', '[data-attribute-id]', (event) => {
            event.preventDefault();

            const $a = $(event.currentTarget);
            const id = $a.data('attributeId');
            const value = $a.data('attributeValue');

            this.$attributesContainer
                .find(`[data-attribute-id=${id}]`).removeClass('is-active')
                .find('input').prop('checked', false);
            $a.addClass('is-active')
                .find('input').prop('checked', true);

            $form.find(`[name="attribute[${id}]"]`).val([value]);

            this.requestAttributesChange($form);
        });

        if (this.swatchesLimit) {
            this.$attributesContainer.find('[data-more]').each((i, moreEl) => {
                const $more = $(moreEl);
                const $list = $more.closest('[data-swatches]');
                const $less = $list.find('[data-less]');
                const $items = $list.find('[data-attribute-id]');

                if ($items.length > this.swatchesLimit) {
                    const $hiddenItems = $items.filter(j => j >= this.swatchesLimit).hide();
                    $more.on('click', () => {
                        $hiddenItems.show();
                        $more.hide();
                        $less.show();
                    });
                    $less.on('click', () => {
                        $hiddenItems.hide();
                        $less.hide();
                        $more.show();
                    });
                } else {
                    $more.hide();
                }

                $less.hide();
            });
        } else {
            this.$attributesContainer.find('[data-more], [data-less]').hide();
        }
    }

    requestAttributesChange($form) {
        if (!window.FormData) {
            return;
        }

        const data = this.filterEmptyFilesFromForm(new FormData($form.get(0)));

        $.ajax({
            url: `/remote/v1/product-attributes/${this.productId}`,
            method: 'POST',
            contentType: false,
            processData: false,
            data,
            headers: {
                'stencil-config': '{}',
                'stencil-options': '{}',
                'x-xsrf-token': window.BCData && window.BCData.csrf_token ? window.BCData.csrf_token : '',
            },
            xhrFields: {
                withCredentials: true,
            },
            success: (resp) => {
                const { image, price } = resp.data;

                if (this.imageReplacerFunc) {
                    const img = image ? image.data.replace('{:size}', this.imageSize) : null;
                    this.imageReplacerFunc(this.$cardImage, img);
                } else if (image) {
                    const img = image.data.replace('{:size}', this.imageSize);
                    if (!this.$cardImage.data('originalSrc')) {
                        this.$cardImage
                            .data('originalSrc', this.$cardImage.attr('src'))
                            .data('originalSrcset', this.$cardImage.attr('srcset'));
                    }
                    this.$cardImage
                        .attr('src', img)
                        .attr('srcset', '')
                        .attr('data-srcset', '')
                        .addClass('productSwatches-image-optionChanged');
                } else if (this.$cardImage.data('originalSrc')) {
                    this.$cardImage
                        .attr('src', this.$cardImage.data('originalSrc'))
                        .attr('srcset', this.$cardImage.data('originalSrcset'))
                        .attr('data-srcset', this.$cardImage.data('originalSrcset'))
                        .data('originalSrc', null)
                        .data('originalSrcset', null)
                        .removeClass('productSwatches-image-optionChanged');
                }

                if (price) {
                    const viewModel = this.getViewModel(this.$scope);
                    this.updatePriceView(viewModel, price);
                }
            },
        });
    }

    /**
     * https://stackoverflow.com/questions/49672992/ajax-request-fails-when-sending-formdata-including-empty-file-input-in-safari
     * Safari browser with jquery 3.3.1 has an issue uploading empty file parameters. This function removes any empty files from the form params
     * @param formData: FormData object
     * @returns FormData object
     */
    filterEmptyFilesFromForm(formData) {
        try {
            for (const [key, val] of formData) {
                if (val instanceof File && !val.name && !val.size) {
                    formData.delete(key);
                }
            }
        } catch (e) {
            console.error(e); // eslint-disable-line no-console
        }
        return formData;
    }

    /**
     * Since $productView can be dynamically inserted using render_with,
     * We have to retrieve the respective elements
     *
     * @param $scope
     */
    getViewModel($scope) {
        return {
            $priceWithTax: $('[data-product-price-with-tax]', $scope),
            $priceWithoutTax: $('[data-product-price-without-tax]', $scope),
            rrpWithTax: {
                $div: $('.rrp-price--withTax', $scope),
                $span: $('[data-product-rrp-with-tax]', $scope),
            },
            rrpWithoutTax: {
                $div: $('.rrp-price--withoutTax', $scope),
                $span: $('[data-product-rrp-price-without-tax]', $scope),
            },
            nonSaleWithTax: {
                $div: $('.non-sale-price--withTax', $scope),
                $span: $('[data-product-non-sale-price-with-tax]', $scope),
            },
            nonSaleWithoutTax: {
                $div: $('.non-sale-price--withoutTax', $scope),
                $span: $('[data-product-non-sale-price-without-tax]', $scope),
            },
            priceSaved: {
                $div: $('.price-section--saving', $scope),
                $span: $('[data-product-price-saved]', $scope),
            },
            priceNowLabel: {
                $span: $('.price-now-label', $scope),
            },
            priceLabel: {
                $span: $('.price-label', $scope),
            },
        };
    }

    /**
     * Hide the pricing elements that will show up only when the price exists in API
     * @param viewModel
     */
    clearPricingNotFound(viewModel) {
        viewModel.rrpWithTax.$div.hide();
        viewModel.rrpWithoutTax.$div.hide();
        viewModel.nonSaleWithTax.$div.hide();
        viewModel.nonSaleWithoutTax.$div.hide();
        viewModel.priceSaved.$div.hide();
        viewModel.priceNowLabel.$span.hide();
        viewModel.priceLabel.$span.hide();
    }

    /**
     * Update the view of price, messages, SKU and stock options when a product option changes
     * @param  {Object} data Product attribute data
     */
    updatePriceView(viewModel, price) {
        this.clearPricingNotFound(viewModel);

        if (price.with_tax) {
            viewModel.priceLabel.$span.show();
            viewModel.$priceWithTax.html(price.with_tax.formatted);
        }

        if (price.without_tax) {
            viewModel.priceLabel.$span.show();
            viewModel.$priceWithoutTax.html(price.without_tax.formatted);
        }

        if (price.rrp_with_tax) {
            viewModel.rrpWithTax.$div.show();
            viewModel.rrpWithTax.$span.html(price.rrp_with_tax.formatted);
        }

        if (price.rrp_without_tax) {
            viewModel.rrpWithoutTax.$div.show();
            viewModel.rrpWithoutTax.$span.html(price.rrp_without_tax.formatted);
        }

        if (price.saved) {
            viewModel.priceSaved.$div.show();
            viewModel.priceSaved.$span.html(price.saved.formatted);
        }

        if (price.non_sale_price_with_tax) {
            viewModel.priceLabel.$span.hide();
            viewModel.nonSaleWithTax.$div.show();
            viewModel.priceNowLabel.$span.show();
            viewModel.nonSaleWithTax.$span.html(price.non_sale_price_with_tax.formatted);
        }

        if (price.non_sale_price_without_tax) {
            viewModel.priceLabel.$span.hide();
            viewModel.nonSaleWithoutTax.$div.show();
            viewModel.priceNowLabel.$span.show();
            viewModel.nonSaleWithoutTax.$span.html(price.non_sale_price_without_tax.formatted);
        }
    }
}

export default Card;
