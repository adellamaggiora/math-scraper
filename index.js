const { Builder, Browser, By, Key, until } = require('selenium-webdriver');
const { Options } = require('selenium-webdriver/firefox');
const path = require('path');
const fs = require('fs');

const createFolder = (downloadFolderPath) => {
    if (!fs.existsSync(downloadFolderPath)) {
        fs.mkdirSync(downloadFolderPath, { recursive: true });
    }
}

const buildDriverOptions = (downloadFolderPath) => {
    const options = new Options();
    options.setPreference('browser.download.folderList', 2);
    options.setPreference('browser.download.dir', downloadFolderPath);
    options.setPreference('browser.helperApps.neverAsk.saveToDisk', 'application/pdf');
    options.setPreference('pdfjs.disabled', true);
    return options;
}

const moveFilesToCategoryFolder = (sourceFolder, destinationFolder) => {
    fs.readdir(sourceFolder, (err, files) => {
        if (err) console.log(err);

        files.forEach(file => {
            const sourcePath = path.join(sourceFolder, file);
            const destinationPath = path.join(destinationFolder, file);

            fs.rename(sourcePath, destinationPath, (err) => {
                if (err) console.log(err);
            });
        });
    });
}

(async function scrape() {
    const downloadFolderPath = path.join(__dirname, 'download');
    createFolder(downloadFolderPath);

    const options = buildDriverOptions(downloadFolderPath);

    const driver = await new Builder().forBrowser(Browser.FIREFOX).setFirefoxOptions(options).build();

    try {
        await driver.manage().setTimeouts({ implicit: 2000 });
        await driver.get('https://www.matematika.it');
        await driver.findElement(By.css('div.AccordionPanel:nth-child(3)')).click();

        const menuItemsCount = await driver.findElements(By.css('div.AccordionPanel:nth-child(3) > div:nth-child(2) > ul:nth-child(1) li a'));

        for (let i = 2; i <= menuItemsCount.length; i++) {
            const item = await driver.findElement(By.css(`div.AccordionPanel:nth-child(3) > div:nth-child(2) > ul:nth-child(1) li:nth-child(${i}) a`));
            const category = (await item.getText()).replaceAll(' ', '_');
            const categoryPath = path.join(downloadFolderPath, category);
            createFolder(categoryPath);

            await item.click();
            // await driver.sleep(500);

            const rows = await driver.findElements(By.css('table > tbody > tr > td.link'));

            for (let j = 0; j < rows.length; j++) {
                const refreshedRows = await driver.findElements(By.css('table > tbody > tr > td.link'));
                const row = refreshedRows[j];
                await row.click();
                // await driver.sleep(500);
            }

            // Sposta i file scaricati nella cartella categoria appropriata.
            // Nota: questa operazione assume che tutti i file siano stati scaricati nella cartella di download principale.
            moveFilesToCategoryFolder(downloadFolderPath, categoryPath);
        }
    } finally {
        await driver.quit();
    }
})();
