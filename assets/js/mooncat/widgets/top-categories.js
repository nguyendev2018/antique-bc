export default function () {
    $('[data-layout-name="TOP CATEGORIES"] .beautify__calloutIcons ._row').slick({
        arrows: false,
        slidesToShow: 6,
        slidesToScroll: 4,
        dots: true,
        responsive: [
            {
                breakpoint: 800,
                settings: {
                    dots: true,
                    arrows: false,
                    slidesToShow: 4,
                    slidesToScroll: 4,
                },
            },
        ],
    });
}
