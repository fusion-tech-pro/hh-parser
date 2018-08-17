module.exports = {
    selectors: {
        LOGIN_EMAIL_INPUT_SELECTOR: '.login-input input[name="username"]',
        LOGIN_PASSWORD_INPUT_SELECTOR: '.login-input input[name="password"]',
        LOGIN_BUTTON_SELECTOR: '.login-submit-form input',
        DOWNLOAD_PDF_SELECTOR: '.list-params__item.list-params__item_download-adobereader .list-params__link',
        ARROW_DOWNLOAD_SELECTOR: '.bloko-button-group button[data-tooltip-message="Скачать резюме"',
        RESUME_LINK_TITLE_SELECTOR: 'div.resume-search-item:not(.resume-search-item_visited) .resume-search-item__header a.search-item-name',
        NEXT_PAGE_SELECTOR: 'a.bloko-button.HH-Pager-Controls-Next.HH-Pager-Control',
        HH_INIT_PAGE: 'https://irkutsk.hh.ru',
        MORE_ITEM_BTN_SELECTOR: '.clusters-group__items .clusters-list__item.clusters-list__item_more span.clusters-items-more:nth-child(1)',
        REGIONS_SECTION_SELECTOR: 'ul.clusters-list:nth-child(1)',
        REGION_BTN_SELECTOR: 'a.clusters-value'
    }, 
    creds: {
        userEmail: '',
        userPassword: ''
    },
    extra: {
        skipRegions: ['Москва', 'Санкт-Петербург', 'Россия', 'Московская область']
    }
}