const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const path = require('path');
const request = require('request');
const _ = require('lodash');
const moment = require('moment');
const puppeteer = require('puppeteer');

const { selectors, creds } = require('./config');
const personUrl = 'https://taganrog.hh.ru/resume/d92a46ab00036461480039ed1f4e4e73637a36?query=python';
const startListUrl = 'https://irkutsk.hh.ru/search/resume?exp_period=all_time&order_by=relevance&specialization=1.327&no_magic=false&area=113&text=Project+manager&pos=full_text&logic=normal&clusters=true&language=eng.can_pass_interview&from=cluster_language';

const getRandomInt = (min, max) => Math.round(Math.random() * (max - min) + min);

const asyncForEach = async (array, callback, delay) => {
  for (let index = 0; index < array.length; index++) {
    let timeDelta = delay ? getRandomInt(1, 3) : 1
    let startTime = +new Date();
    // console.log('delta is', timeDelta)
    // console.time('iteration');
    while ((+new Date() < timeDelta * 1000 + startTime)) {
      // just waiting
    }
    // console.timeEnd('iteration');
    await callback(array[index], index, array);
  }
};

class Parser {
  constructor() {
    this.browser = null;
    this.currentResumeNumber = 0;
    this.cookies = null;
    this.mainPage = null;
    this.resumeListPage = null;
    this.resumePage = null;
  }

  async run() {
    console.log('Run parser...');
    try {
      this.browser = await puppeteer.launch({ headless: false, args: [], defaultViewport: { width: 1024, height: 1000 } }); // '--no-sandbox'
      this.mainPage = await this.browser.newPage();

      this.mainPage.goto(selectors.HH_INIT_PAGE, { timeout: 100000 });
      await this.mainPage.waitForSelector(selectors.LOGIN_EMAIL_INPUT_SELECTOR, { timeout: 20000 });
      await this.mainPage.type(selectors.LOGIN_EMAIL_INPUT_SELECTOR, creds.userEmail)
      await this.mainPage.type(selectors.LOGIN_PASSWORD_INPUT_SELECTOR, creds.userPassword)
      await this.mainPage.click(selectors.LOGIN_BUTTON_SELECTOR);
      await this.mainPage.waitForNavigation();
      await this.mainPage.waitForSelector('.last-searches-header');

      this.cookies = await this.mainPage.cookies()
      this.resumeListPage = await this.browser.newPage();
      this.resumePage = await this.browser.newPage();

      await this.resumeListPage.setCookie(...this.cookies);
      await this.resumePage.setCookie(...this.cookies);

      await this.resumeListPage.bringToFront();
      await this.resumeListPage.goto(startListUrl);
      await this.goThroughRegions(this.resumeListPage, startListUrl);

      
      await this.browser.close();
      
    } catch (err) {
      console.error('FUCK!!!', err.message);
      this.logger('MAIN ERROR', err)
      await this.browser.close();
      return { error: true };
    }
  }

  async fetchFile(link, folder) {
    const hash = crypto.randomBytes(16).toString('hex');
    if (!fs.existsSync(`./${folder}`)) {
      fs.mkdirSync(`./${folder}`)
    }
    const fileStream = fs.createWriteStream(`./${folder}/${hash}.jpg`);
    const jar = request.jar()
    const cook = this.cookies.map(el => `${el.name}=${el.value}`).join('; ') + ';'
    request({ url: link, headers: { Cookie: cook } }).pipe(fileStream).on('error', (err) => {
      console.log('error is', err);
    })
  }

  async fetchResume(link, folder) {
    try {
      await this.resumePage.bringToFront();
      await this.resumePage.goto(link);
      await this.download(this.resumePage, folder, link);
    } catch (err) {
      this.logger('FETCH RESUME ERRROR', err, link, folder)
    }
  }

  async prepareRegions() {
    try {
      const moreItems = await this.resumeListPage.$(selectors.MORE_ITEM_BTN_SELECTOR)
      await moreItems.click();
      const section = await this.resumeListPage.$(selectors.REGIONS_SECTION_SELECTOR);
      const regions = await section.$$eval(selectors.REGION_BTN_SELECTOR, elems => {
        window.elems = elems;
        const result = [];
        elems.forEach(el => {
          try {
            const skipRegions = extra.skipRegions || [];
            if (!skipRegions.includes(el.children[0].textContent)) {
              result.push({
                link: el.href,
                title: el.children[0].textContent
              })
            }
          } catch (err) {
            console.log('oops... just skip this one :)');
          }
        })
        return result;
      })
      return regions;
    } catch (err) {
      this.logger('prepare region ERROR', err)
    }
  }

  async goThroughRegions(page, link) {
    const regions = await this.prepareRegions();
    console.log('number of regions:', regions.length);
    await asyncForEach(regions, async (region) => {
      try {
        await this.resumeListPage.bringToFront();
        await this.resumeListPage.goto(region.link);
        await this.goThroughPagination(region.title);
      } catch (err) {
        this.logger('goThroughRegions each ERROR', err, region.link, region.title)
      }
    })
  }

  async goThroughPagination(region) {
    try {
      const links = await this.resumeListPage.$$eval(selectors.RESUME_LINK_TITLE_SELECTOR, (elems) => {
        const hrefs = [];
        elems.forEach(el => hrefs.push(el.href));
        return hrefs;
      })
      await asyncForEach(links, link => this.fetchResume(link, region), true)
      const nextBtnExists = await this.resumeListPage.$(selectors.NEXT_PAGE_SELECTOR);
      if (nextBtnExists) {
        const nextPageUrl = await this.resumeListPage.$eval(selectors.NEXT_PAGE_SELECTOR, el => el.href);
        await this.resumeListPage.bringToFront();
        await this.resumeListPage.goto(nextPageUrl);
        await this.goThroughPagination(region);
      }
      return true;
    } catch (err) {
      this.logger('goThroughPaginatoin ERROR', err, 'link', region)
    }
  }

  async download(page, folder, link) {
    try {
      if (!fs.existsSync(`./files/${folder}`)) {
        fs.mkdirSync(`./files/${folder}`)
      }
      const hash = crypto.randomBytes(16).toString('hex');
      fs.mkdirSync(`./files/${folder}/${hash}`)
      await page._client.send('Page.setDownloadBehavior', {
        behavior: 'allow',
        downloadPath: `./files/${folder}/${hash}`
      });
      await page.click(selectors.ARROW_DOWNLOAD_SELECTOR);
      await page.click(selectors.DOWNLOAD_PDF_SELECTOR);
      console.log(`Current resume number was: ${++this.currentResumeNumber}`);
    } catch (err) {
      this.logger('DOWNLOAD ERROR', err, link, folder)
    }
  }

  logger(description, error, link = '--', folder = '--') {
    const timeStamp = moment().format('DD/MM hh:mm');
    console.log(`> was error at ${timeStamp}`);
    const logMessage = `
**********************************************************
> ${timeStamp}. TYPE: ${description}
Error: ${error.message}
Link: ${link}
Fodler: ${folder}
**********************************************************`
    fs.appendFileSync('./logs.txt', logMessage);
  }
}

const parser = new Parser();
parser.run();
