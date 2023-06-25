import { throttle, debounce } from 'lodash';
import utils from '@bigcommerce/stencil-utils';
import './jquery-ui';
import mobileMenuToggleFactory from '../theme/global/mobile-menu-toggle';
import mediaQueryListFactory from '../theme/common/media-query-list';
import { inert } from '../papathemes/utils';

const isTopInViewport = (elem) => {
    const distance = elem.getBoundingClientRect();
    return (
        distance.top >= 0 &&
        distance.top <= (window.innerHeight || document.documentElement.clientHeight)
    );
};

const mediumMediaQueryList = mediaQueryListFactory('medium');

function inhealth() {
    const $shopByCategoryRow = $('[data-layout-name="SHOP BY CATEGORY"] .beautify__calloutIcons ._row');
    const initShopByCategory = () => {
        if (!mediumMediaQueryList.matches) {
            $shopByCategoryRow.not('.slick-initialized').slick({
                arrows: true,
                dots: true,
                mobileFirst: true,
                slidesToScroll: 3,
                slidesToShow: 3,
                lazyLoad: 'progressive',
                // variableWidth: true,
                responsive: [{
                    breakpoint: 551,
                    settings: {
                        slidesToScroll: 4,
                        slidesToShow: 4,
                    },
                }, {
                    breakpoint: 801,
                    settings: 'unslick',
                }],
            });
        }
    };
    mediumMediaQueryList.addListener(initShopByCategory);
    initShopByCategory();

    // const initMarquee = () => {
    //     const animateEl = (el) => {
    //         const $el = $(el);
    //         if (el.scrollWidth <= $el.width()) {
    //             return;
    //         }
    //         const speed = (el.scrollWidth - $el.scrollLeft() - Math.round($el.outerWidth())) / el.scrollWidth * 8000;
    //         $el.animate({
    //             opacity: 1,
    //         }, 1000, () => {
    //             $el.animate({
    //                 scrollLeft: el.scrollWidth - Math.round($el.outerWidth()),
    //             }, speed, 'linear', () => {
    //                 $el.animate({
    //                     opacity: 0,
    //                 }, 1000, () => {
    //                     $el.scrollLeft(0);
    //                     $el.animate({
    //                         opacity: 1,
    //                     }, 500, () => {
    //                         animateEl(el);
    //                     });
    //                 });
    //             });
    //         });
    //     };
    //     $('[data-marquee]')
    //         .off('mouseenter touchstart mouseleave touchend')
    //         .stop()
    //         .each((i, el) => {
    //             const $el = $(el);
    //             if (el.scrollWidth <= Math.round($el.outerWidth())) {
    //                 return;
    //             }
    //             $el.on('mouseenter touchstart', () => $el.stop());
    //             $el.on('mouseleave touchend', () => animateEl(el));
    //             animateEl(el);
    //         });
    // };
    const animateMarquee = el => {
        const $el = $(el);
        if (el.scrollWidth <= Math.round($el.outerWidth()) + 5) {
            return;
        }
        const speed = (el.scrollWidth - $el.scrollLeft() - Math.round($el.outerWidth())) / el.scrollWidth * 8000;
        $el.stop().animate({
            opacity: 1,
        }, 1000, () => {
            $el.animate({
                scrollLeft: el.scrollWidth - Math.round($el.outerWidth()),
            }, speed, 'linear', () => {
                $el.animate({
                    opacity: 0,
                }, 1000, () => {
                    $el.scrollLeft(0);
                    $el.animate({
                        opacity: 1,
                    }, 500, () => {
                        animateMarquee(el);
                    });
                });
            });
        });
    };
    $(window).on('resize load', debounce(() => {
        $('[data-marquee]').get().filter(el => isTopInViewport(el)).forEach(el => animateMarquee(el));
    }, 500));
    $('body').on('touchstart', () => {
        $('[data-marquee]').stop();
    });
    $('body').on('touchend', () => {
        $('[data-marquee]').get().filter(el => isTopInViewport(el)).forEach(el => animateMarquee(el));
    });
}

export default function (context) {
    // const $header = $('.header').first();
    // const $navPagesRootMenuList = $('.navPages-rootMenu-list');
    const $body = $('body');
    const $menuToggle = $('[data-mobile-menu-toggle]');
    const $searchToggle = $('[data-mobile-search-toggle]');
    const $quickSearch = $('.papathemes-quickSearch');
    const mobileMenu = mobileMenuToggleFactory();

    // Init Card Color Swatches
    if (context.card_show_swatches && context.graphQLToken) {
        import('../papathemes/card-swatches/ProductSwatches').then(({ default: ProductSwatches }) => new ProductSwatches({
            graphQLToken: context.graphQLToken,
            imageSize: context.productgallery_size,
            includeOptions: context.card_swatch_name.split(',').map(s => s.trim()).filter(s => s !== ''),
        }));
    }

    // const updateHeaderPaddingDependingNavHeight = () => {
    //     const updateFunc = () => {
    //         if (mediumMediaQueryList.matches) {
    //             const height = $navPagesRootMenuList.filter('.is-open').not('.navPages-rootMenu-list--standard').outerHeight() || '';
    //             $header.css('padding-bottom', height);
    //             $('.stickyHeader-placeholder').css('height', $header.outerHeight());
    //         } else {
    //             $header.css('padding-bottom', '');
    //         }
    //     };
    //     updateFunc();
    //     $(window).on('resize', throttle(updateFunc, 300, { leading: false }));
    //     $('.navPages-rootMenu-action[data-collapsible]').on('toggle.collapsible', debounce(updateFunc));
    // };

    const stickyHeader = () => {
        const threshold = 100;

        $('[data-sticky-header]').not('.sticky-header-loaded').each((i, el) => {
            const $el = $(el).addClass('sticky-header-loaded', true);
            const $placeholder = $('<div class="stickyHeader-placeholder"></div>').show().css('height', $el.outerHeight()).insertAfter($el);
            let lastScrollTop = 0;

            const onScroll = throttle((_event) => {
                const st = window.pageYOffset || document.documentElement.scrollTop; // Credits: "https://github.com/qeremy/so/blob/master/so.dom.js#L426"
                const headerHeight = $el.outerHeight();
                const placeholderTop = $placeholder.offset().top;
                let ignoreUpdateLastScrollTop = false;

                $placeholder.css('height', headerHeight);

                if (st > lastScrollTop) {
                    // scroll down
                    if (st > placeholderTop + headerHeight + threshold) {
                        if (!$el.hasClass('_scrollDown')) {
                            $el.removeClass('_scrollUp').addClass('_scrollDown');
                            $el.one('transitionend', () => {
                                // still scroll down?
                                if ($el.hasClass('_scrollDown')) {
                                    const newSt = window.pageYOffset || document.documentElement.scrollTop;
                                    $el.addClass('_shadow');
                                    $el.css({
                                        top: newSt - $el.outerHeight() - threshold,
                                        position: 'absolute',
                                        transition: 'none',
                                    });
                                    $el.stop().animate({}, 10, () => {
                                        $el.css({
                                            transition: '',
                                        });
                                    });
                                }
                            }).css({
                                top: -$el.outerHeight(),
                            });
                        }
                    }
                } else if (!$body.hasClass('_skipCheckScrollUpStickyHeader')) {
                    // scroll up
                    // eslint-disable-next-line no-lonely-if
                    if (st > placeholderTop + headerHeight && lastScrollTop - st > threshold) {
                        $el.removeClass('_scrollDown').addClass('_shadow');
                        if (!$el.hasClass('_scrollUp')) {
                            $el.addClass('_scrollUp');
                            $el.css({
                                top: -$el.outerHeight(),
                                position: '',
                                transition: 'none',
                            });
                            $el.stop().animate({}, 10, () => {
                                $el.css({
                                    top: 0,
                                    transition: '',
                                });
                            });
                        }
                    } else if (st <= placeholderTop) {
                        $el.removeClass('_shadow _scrollDown').css({
                            top: '',
                            position: '',
                        });
                    } else if ($el.hasClass('_shadow') && $el.offset().top < 0) {
                        $el.removeClass('_shadow _scrollDown').css({
                            top: '',
                            position: '',
                        });
                    } else {
                        ignoreUpdateLastScrollTop = true;
                    }
                }


                if (!ignoreUpdateLastScrollTop) {
                    lastScrollTop = st <= 0 ? 0 : st; // For Mobile or negative scrolling
                }
            }, 100, { leading: false });

            const onResize = throttle(() => {
                const headerHeight = $el.outerHeight();
                $placeholder.css('height', headerHeight);
            }, 300, { leading: false });

            $(window).on('scroll', onScroll);
            $(window).on('resize', onResize);
        });
    };

    const onScroll = throttle(() => {
        if (mediumMediaQueryList.matches && !$body.hasClass('has-quickSearchOpen')) {
            // Auto click the tab when scrolling to a section in viewport on PDP
            $('.productView-description').get().map(el => $(el))
                .forEach($el => {
                    const arr = $el.find('.tab-content').get()
                        .map(el => $(el).find('> *:visible').get(0));
                    for (let i = 0; i < arr.length; i++) {
                        if (arr[i] && isTopInViewport(arr[i])) {
                            const id = $(arr[i]).closest('.tab-content').attr('id');
                            const $tab = $el.find(`.tab-title[href="#${id}"]`).closest('.tab');
                            if ($tab.not('.is-active')) {
                                $tab.siblings().removeClass('is-active');
                                $tab.addClass('is-active');
                            }
                            break;
                        }
                    }
                });
        }
    }, 500, { leading: false });

    $menuToggle.on('click', (event) => {
        event.preventDefault();
        $searchToggle.removeClass('is-open');
        $quickSearch.removeClass('is-open');
    });

    $searchToggle.on('click', (event) => {
        event.preventDefault();
        if (mobileMenu.isOpen) {
            mobileMenu.hide();
        }
        $searchToggle.toggleClass('is-open');
        $quickSearch.toggleClass('is-open');
    });

    // updateHeaderPaddingDependingNavHeight();
    stickyHeader();

    $('body').on('click', '[data-toggle]', (event) => {
        event.preventDefault();

        const $el = $(event.currentTarget);
        const id = $el.data('toggle');
        const $otherEls = $(`[data-toggle=${id}]`).not($el);
        const $target = $(`#${id}`);

        $el.toggleClass('is-open');

        if ($el.hasClass('is-open')) {
            $el.attr('aria-expanded', true);
            $target.addClass('is-open');
            $otherEls.addClass('is-open').attr('aria-expanded', true);
            $target.trigger('open.toggle', [$el]);
        } else {
            $el.attr('aria-expanded', false);
            $target.removeClass('is-open');
            $otherEls.removeClass('is-open').attr('aria-expanded', false);
            $target.trigger('close.toggle', [$el]);
        }
    });
    const $sidebarTop = $('#sidebar-top');

    $sidebarTop.on('open.toggle', (event, $toggle) => {
        $('body').addClass('has-sidebarTopOpened');
        // papathemes-inhealth: Accessibility - Make other elements not focusable
        inert($sidebarTop);
        $sidebarTop.data('lastToggle', $toggle);
        $sidebarTop.find('a,button[tabindex!="-1"]').first().each((i, el) => el.focus());
    });
    $sidebarTop.on('close.toggle', () => {
        $('body').removeClass('has-sidebarTopOpened');
        // papathemes-inhealth: Accessibility - Make other elements not focusable
        inert($sidebarTop, false);
        const $toggle = $sidebarTop.data('lastToggle');
        if ($toggle) {
            $toggle.get(0).focus();
            $sidebarTop.data('lastToggle', null);
        }
    });

    $(document).on('scroll', onScroll);
    $('body').on('loaded.quickview', () => {
        $('.modal-body.quickView').off('scroll').on('scroll', onScroll);
    });

    // open quick search form on homepage
    // if (!$searchToggle.hasClass('is-open')) {
    //     $searchToggle.trigger('click');
    // }

    const fixMobileMenuShiftedWhenClickCollapsible = () => {
        const $el = $('#bf-fix-menu-mobile');
        const el = $el.get(0);
        let openEl;
        let openElTop;

        $el.on('open.collapsible', (event) => {
            openEl = event.target;
            openElTop = $(openEl).offset().top;
        });

        $el.on('close.collapsible', () => {
            if (mediumMediaQueryList.matches || !openEl) {
                return;
            }
            const relY = $(openEl).offset().top - $el.offset().top + el.scrollTop;
            const scrollTop = relY - openElTop + $el.offset().top;
            el.scrollTop = Math.max(0, scrollTop);
        });
    };

    fixMobileMenuShiftedWhenClickCollapsible();

    const initContactFormUrl = () => {
        $('[data-contact-form-url]').each((i, el) => {
            const $el = $(el);

            if ($el.data('contactFormUrlLoaded')) {
                return;
            }

            $el.data('contactFormUrlLoaded', true);

            const url = $el.data('contactFormUrl');
            const template = 'beautify/contact-form-remote';

            utils.api.getPage(url, { template }, (err, resp) => {
                if (err || !resp) {
                    return;
                }
                $el.append(resp);
            });
        });
    };

    initContactFormUrl();

    // --------------------------------------------------------------------------------------------
    // Product Card quantity input changes
    // --------------------------------------------------------------------------------------------
    $('body').on('click', '[data-card-quantity-change] button', event => {
        event.preventDefault();
        const $target = $(event.currentTarget);
        const $input = $target.closest('[data-card-quantity-change]').find('input');
        const quantityMin = parseInt($input.data('quantityMin'), 10);
        const quantityMax = parseInt($input.data('quantityMax'), 10);

        let qty = parseInt($input.val(), 10);

        // If action is incrementing
        if ($target.data('action') === 'inc') {
            // If quantity max option is set
            if (quantityMax > 0) {
                // Check quantity does not exceed max
                if ((qty + 1) <= quantityMax) {
                    qty++;
                }
            } else {
                qty++;
            }
        } else if (qty > 1) {
            // If quantity min option is set
            if (quantityMin > 0) {
                // Check quantity does not fall below min
                if ((qty - 1) >= quantityMin) {
                    qty--;
                }
            } else {
                qty--;
            }
        }

        // update hidden input
        $input.val(qty);
    });

    // --------------------------------------------------------------------------------------------
    // Product Cart cart-footer focus visibility
    // --------------------------------------------------------------------------------------------
    function checkCardFooterFocus(event) {
        let $cardFooter = $(event.target).filter('.card-footer');
        if ($cardFooter.length === 0) {
            $cardFooter = $(event.target).closest('.card-footer');
        }
        if ($cardFooter.length > 0) {
            if (event.type === 'focusin') {
                $cardFooter.addClass('_focus');
            } else {
                $cardFooter.removeClass('_focus');
            }
        }
    }
    $('body').attr('tabindex', 0).on('focus blur', '*', checkCardFooterFocus);
    $('body').on('init reInit', '[data-slick]', (_event, slick) => {
        slick.$slides.on('focus blur', '*', checkCardFooterFocus);
    });
    $('[data-slick] .slick-slide').on('focus blur', '*', checkCardFooterFocus);


    // --------------------------------------------------------------------------------------------
    // brand quick view
    // --------------------------------------------------------------------------------------------
    $('body').on('click', '[data-brand-quick-view]', (event) => {
        const $button = $(event.currentTarget);
        const $brand = $button.closest('.brand');
        $button.toggleClass('is-open');
        const isOpen = $button.hasClass('is-open');
        if (isOpen) {
            $brand.addClass('is-open');
            utils.api.getPage($button.data('brandQuickView'), { template: 'beautify/bottom-banner' }, (err, resp) => {
                $brand.find('[data-brand-quick-view-body]').html(resp);
            });
        } else {
            $brand.removeClass('is-open');
        }
        $('[data-brand-quick-view].is-open').not(event.currentTarget).each((i, el) => {
            $(el).removeClass('is-open');
            $(el).closest('.brand').removeClass('is-open');
        });
    });

    inhealth();
}
