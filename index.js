const { Builder, Browser, By, Key, until } = require('selenium-webdriver');
const { Options } = require('selenium-webdriver/firefox');
const path = require('path');
const fs = require('fs');

const createFolder = (folderPath) => {
    if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
    }
}

const buildDriverOptions = (tmpFolder) => {
    const options = new Options();
    options.setPreference('browser.download.folderList', 2);
    options.setPreference('browser.download.dir', tmpFolder);
    options.setPreference('browser.helperApps.neverAsk.saveToDisk', 'application/pdf');
    options.setPreference('pdfjs.disabled', true);
    return options;
}

const moveFilesToCategoryFolder = (sourceFolder, destinationFolder) => {
    try {
        const files = fs.readdirSync(sourceFolder);
        for (const file of files) {
            const sourcePath = path.join(sourceFolder, file);
            const destinationPath = path.join(destinationFolder, file);
            fs.renameSync(sourcePath, destinationPath);
        }  
    } catch (error) {
        console.error(error);
    }
}

(async function scrape() {

    const tmpFolder = path.join(__dirname, 'tmp');
    createFolder(tmpFolder);

    const options = buildDriverOptions(tmpFolder);
    const driver = await new Builder().forBrowser(Browser.FIREFOX).setFirefoxOptions(options).build();

    try {
        await driver.manage().setTimeouts({ implicit: 2000 });
        await driver.get('https://www.matematika.it');
        await driver.findElement(By.css('div.AccordionPanel:nth-child(3)')).click();

        const menuItemsCount = await driver.findElements(By.css('div.AccordionPanel:nth-child(3) > div:nth-child(2) > ul:nth-child(1) li a'));

        for (let i = 2; i <= menuItemsCount.length; i++) {
            const item = await driver.findElement(By.css(`div.AccordionPanel:nth-child(3) > div:nth-child(2) > ul:nth-child(1) li:nth-child(${i}) a`));
            let category = (await item.getText()).replaceAll(' ', '_');
            category = `${i-1}-${category}` 
            const categoryPath = path.join(__dirname, 'downloads', category);
            createFolder(categoryPath);

            await item.click();

            const rows = await driver.findElements(By.css('table > tbody > tr > td.link'));

            for (let j = 0; j < rows.length; j++) {
                const refreshedRows = await driver.findElements(By.css('table > tbody > tr > td.link'));
                const row = refreshedRows[j];
                await row.click();
            }

            moveFilesToCategoryFolder(tmpFolder, categoryPath);
        }
    } finally {
        await driver.quit();
    }
})();
