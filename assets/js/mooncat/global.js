import initTopCategories from './widgets/top-categories';
import initPageBuilder from '../papathemes/page-builder';
import mediaQueryListFactory from '../theme/common/media-query-list';

const mediumMediaQueryList = mediaQueryListFactory('medium');

export default function (context) {
    initTopCategories(context);

    if ($('.navPages._hasWidgets').length > 0) {
        initPageBuilder(context);
    }

    import('aos').then((AOS) => AOS.init({
        easing: 'ease-out-cubic',
        mirror: true,
    }));

    const menuColumnScreenChange = () => {
        if (mediumMediaQueryList.matches) {
            $('.navPages > ul > li.navPages-item--column').each((_i, el) => {
                const $subMenuUl = $(el).find('ul');
                let maxHeight = 0;
                $subMenuUl.each((_j, ul) => {
                    maxHeight = maxHeight > $(ul).height() ? maxHeight : $(ul).height();
                });
                $subMenuUl.height(maxHeight);
            });
        } else {
            $('.navPages > ul > li.navPages-item--column').each((_i, el) => {
                const $subMenuUl = $(el).find('ul');
                $subMenuUl.css('height', 'auto');
            });
        }
    };

    menuColumnScreenChange();

    mediumMediaQueryList.addListener(menuColumnScreenChange);
}
