const puppeteer = require('puppeteer');

const LOGIN_EMAIL_INPUT_SELECTOR = '.login-input input[name="username"]';
const LOGIN_PASSWORD_INPUT_SELECTOR = '.login-input input[name="password"]';
const LOGIN_BUTTON_SELECTOR = '.login-submit-form input';
const DOWNLOAD_PDF_SELECTOR = '.list-params__item.list-params__item_download-adobereader .list-params__link';
const ARROW_DOWNLOAD_SELECTOR = '.bloko-button-group button[data-tooltip-message="Скачать резюме"'
const RESUME_LINK_TITLE_SELECTOR = '.resume-search-item__header a.search-item-name';
const userEmail = '';
const userPassword = '';
const HH_INIT_PAGE = 'https://irkutsk.hh.ru';
const personUrl = 'https://taganrog.hh.ru/resume/d92a46ab00036461480039ed1f4e4e73637a36?query=python';


class Parser {
    constructor() {
        this.browser = null;
    }

    async run() {
        console.log('Run parser...');
        try {
            this.browser = await puppeteer.launch({ headless: true, args: [], defaultViewport: { width: 1024, height: 1000 } }); // '--no-sandbox'
            const page = await this.browser.newPage();
            await page.goto(HH_INIT_PAGE);
            await page.type(LOGIN_EMAIL_INPUT_SELECTOR, userEmail)
            await page.type(LOGIN_PASSWORD_INPUT_SELECTOR, userPassword)
            await page.click(LOGIN_BUTTON_SELECTOR);
            await page.waitForNavigation();
            await page.waitForSelector('.last-searches-header');

            const cookies = await page.cookies()
            const page2 = await this.browser.newPage();
            await page2.setCookie(...cookies);
            await page2.goto(personUrl);

            await this.download(page2, 'folder');

            // await browser.close();
            // return vehicle;
        } catch (err) {
            console.error('BOOM!!!', err.message);
            await this.browser.close();
            return { error: true };
        }
    }

    async download(page, folder) {
        await page._client.send('Page.setDownloadBehavior', {
            behavior: 'allow',
            downloadPath: './'
        });
        await page.click(ARROW_DOWNLOAD_SELECTOR)
        await page.click(DOWNLOAD_PDF_SELECTOR);
    }
}

const parser = new Parser();
parser.run();
