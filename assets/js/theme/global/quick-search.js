import _ from 'lodash';
import utils from '@bigcommerce/stencil-utils';
import StencilDropDown from './stencil-dropdown';
import mediaQueryListFactory from '../common/media-query-list'; // papathemes-beautify
import { RecentlySearch, PopularSearch } from '../../papathemes/recently-search';

// papathemes-beautify
const mediumMediaQueryList = mediaQueryListFactory('medium');

export default function () {
    const TOP_STYLING = 'top: 49px;';
    const $quickSearchResults = $('.quickSearchResults');
    const $quickSearchDiv = $('#quickSearch');
    const $searchQuery = $('#search_query');
    const $quickSearchBox = $('.beautify__quickSearch'); // mooncat
    const $quickSearchBar = $('[data-quick-search-bar]'); // mooncat

    // papathemes-beautify
    const $body = $('body');
    const $header = $('.header');
    const $quickSearchClose = $('[data-quick-search-close]');

    // mooncat
    const recentlySearch = new RecentlySearch(window.PapathemesMooncatRecentlySearchSettings);
    const popularSearch = new PopularSearch(window.PapathemesMooncatPopularSearchSettings); // eslint-disable-line no-unused-vars

    const stencilDropDownExtendables = {
        hide: () => {
            // $searchQuery.trigger('blur'); // mooncat comment out
            if ($body.hasClass('has-quickSearchOpen')) {
                // papathemes-beautify
                $body.removeClass('has-quickSearchOpen');
                $searchQuery.val('');

                // papathemes-supermarket: fix issue when selecting the search text from right to left by mouse
                if ($searchQuery.is(':hidden')) {
                    $searchQuery.trigger('blur');
                }

                // mooncat: enable other links outside the quick search form and quick search popup
                $quickSearchDiv.siblings().not('.header, .modal').prop('inert', false);
                $quickSearchBar.siblings().prop('inert', false);

                $searchQuery.trigger('focus', [{ closing: true }]);
            }
        },
        show: (event) => {
            // $searchQuery.trigger('focus'); // mooncat comment out
            if (typeof event !== 'undefined') { // papathemes: fix for showing dropdown results
                event.stopPropagation();
            }

            // papathemes-beautify {{{
            $body.addClass('has-quickSearchOpen');

            if (mediumMediaQueryList.matches) {
                // mooncat edited
                if ($header.css('position') === 'fixed') {
                    $quickSearchDiv.css('top', `${window.scrollY + $header.outerHeight()}px`);
                } else {
                    $quickSearchDiv.css('top', `${$header.position().top + $header.outerHeight()}px`);
                }
            } else {
                // eslint-disable-next-line no-lonely-if
                if ($header.css('position') === 'fixed') {
                    $quickSearchDiv.css('top', $header.outerHeight());
                } else {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    $quickSearchDiv.css('top', `${$header.position().top + $header.outerHeight()}px`);
                }
            }
            // }}}

            // mooncat: disable other links outside the quick search form and quick search popup
            $quickSearchDiv.siblings().not('.header, .modal').prop('inert', true);
            $quickSearchBar.siblings().prop('inert', true);
        },
    };
    const stencilDropDown = new StencilDropDown(stencilDropDownExtendables);
    stencilDropDown.bind($('[data-search="quickSearch"]'), $quickSearchDiv, TOP_STYLING);

    stencilDropDownExtendables.onBodyClick = (e, $container) => {
        // If the target element has this data tag or one of it's parents, do not close the search results
        // We have to specify `.modal-background` because of limitations around Foundation Reveal not allowing
        if ($(e.target).closest('[data-prevent-quick-search-close], .modal-background').length === 0) {
            stencilDropDown.hide($container);
        }

        // Papathemes - Supermarket: close popup if click on the overlay
        if ($(e.target).is('.papathemes-overlay')) {
            stencilDropDown.hide($container);
        }
    };

    // stagger searching for 1200ms after last input
    const debounceWaitTime = 1200;
    const doSearch = (searchQuery) => {
        $quickSearchBox.addClass('loading'); // mooncat
        utils.api.search.search(searchQuery, { template: 'search/quick-results' }, (err, response) => {
            if (err) {
                return false;
            }

            $quickSearchBox.removeClass('loading'); // mooncat
            $quickSearchResults.html(response);
            stencilDropDown.show($quickSearchDiv); // papathemes: show drop-down results after search results retrieved
            $quickSearchResults.foundation();

            // mooncat
            recentlySearch.addKeyword(searchQuery);
            recentlySearch.displayKeywords(searchQuery);
        });
    };
    const doSearchDebounced = _.debounce(doSearch, debounceWaitTime);

    utils.hooks.on('search-quick', (event, currentTarget) => {
        const searchQuery = $(currentTarget).val();

        // server will only perform search with at least 3 characters
        if (searchQuery.length < 3) {
            return;
        }

        doSearchDebounced(searchQuery);
    });

    // mooncat
    utils.hooks.on('search-quick-immediately', (event, currentTarget) => {
        const searchQuery = $(currentTarget).val();
        doSearch(searchQuery);
    });

    // mooncat: display popup when search input is focused
    $searchQuery.on('focus', (event, { closing = false } = {}) => {
        if (!closing) {
            stencilDropDown.show($quickSearchDiv);
        }
    });

    // Catch the submission of the quick-search
    // $quickSearchDiv.on('submit', (event) => { // papathemes fix bug don't stop form submit
    $searchQuery.closest('form').on('submit', (event) => {
        const searchQuery = $(event.currentTarget).find('input').val();

        if (searchQuery.length === 0) {
            return event.preventDefault();
        }

        return true;
    });

    // mooncat: improve accessibility
    // Close the dropdown when pressing the escape key in the quick search dropdown
    $quickSearchDiv.on('keydown', (event) => {
        if (event.key === 'Escape') {
            stencilDropDown.hide($quickSearchDiv);
        }
    });

    // Add a hidden close button to close the dropdown when focus
    $quickSearchDiv
        .append('<a href="#" class="_a10yClose is-srOnly">Close</a>')
        .find('._a10yClose').on('click focus keydown', (event) => {
            event.preventDefault();
            event.stopPropagation();
            stencilDropDown.hide($quickSearchDiv);
        });

    // papathemes-beautify
    $quickSearchClose.on('click', () => stencilDropDown.hide($quickSearchDiv));

    // Supermarket: close quick search when InstantLoad finish loading
    $('body').on('loaded.instantload', () => stencilDropDown.hide($quickSearchDiv));
}
