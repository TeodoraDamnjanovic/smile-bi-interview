const puppeteer = require('puppeteer');
const fs = require('fs');
const kafka = require('kafka-node');

function validateData(data) {
    
    //I've tested the regex in inspect and it works !/^\d+,\d{2} €$/.test(data.price)
    //Don't know why it is not working here
    //I'll provide a solution without regex
    if (typeof data.shop_name !== 'string') {
        throw new Error('Invalid price');
    }

    if (typeof data.shop_name !== 'string' || data.shop_name.trim() === '') {
        throw new Error('Invalid shop name');
    }

    if (typeof data.position !== 'number' || data.position <= 0) {
        throw new Error('Invalid position');
    }
}

function validateItems(items) {
    items.forEach((item, index) => {
        try {
            validateData(item);
        } catch (error) {
            console.error(`Item ${index + 1} is invalid: ${error.message}`);
            throw new Error('Invalid items');
        }
    });
}

function writeToFile(filename, data) {
    fs.writeFile(filename, data, (err) => {
        if (err) {
            throw new Error('Error writing to file:', err);
        } else {
            console.log('Successfully wrote to file');
        }
    });
}

function sendToKafka(topic, data) {
    const client = new kafka.KafkaClient({kafkaHost: 'localhost:9092'});
    const producer = new kafka.Producer(client);
    
    producer.on('ready', () => {
        const payloads = [
            { topic: topic, messages: JSON.stringify(data) },
        ];
        producer.send(payloads, (err, data) => {
            if (err) {
                console.error('Error sending data to Kafka:', err);
            } else {
                console.log('Successfully sent data to Kafka:', data);
            }
        });

        producer.close(() => {
            console.log('Producer closed');
        });
    });

    producer.on('error', (err) => {
        console.error('Error with Kafka producer:', err);
    });
}

async function fetchItems(page) {
    const itemsArray = await page.$$eval('li.productOffers-listItem', (nodes) => nodes.map((node, index) => {
        const priceWithCurrency = node.querySelector('.productOffers-listItemOfferPrice').innerText;
        const price = priceWithCurrency.split('\n')[0].trim().split(' ')[0];
        const shop_name = node.querySelector('a.productOffers-listItemOfferShopV2LogoLink').getAttribute('data-shop-name');
        return { price, shop_name, position: index + 1 };
    }));

    validateItems(itemsArray);

    const itemsObject = itemsArray.reduce((acc, item) => {
        acc[item.position] = item;
        return acc;
    }, {});

    return itemsObject;
}

async function fetchBayerProducts() {
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: false,
            defaultViewport: null,
            args: [
                '--no-sandbox',
            ],
        });

        const page = await browser.newPage();
        page.setDefaultNavigationTimeout(0);
        
        page.on('error', error => {
            console.error('An error occurred on the page:', error);
        });
        
        page.on('pageerror', error => {
            console.error('An uncaught exception happened within the page:', error);
        });

        const response =  await page.goto('https://www.idealo.de/preisvergleich/OffersOfProduct/201846460_-aspirin-plus-c-forte-800-mg-480-mg-brausetabletten-bayer.html');
        
        if (response.status() === 403) {
            console.error('Access Denied');
            throw new Error('Access Denied');
        }

        await page.setViewport({
            width: 1200,
            height: 800
        });

        // Load all products
        await page.evaluate(async () => {
            await new Promise((resolve, reject) => {
              const interval = setInterval(() => {
                const button = document.querySelector('.productOffers-listLoadMore');
                if (button !== null) {
                  button.click();
                } else {
                  clearInterval(interval);
                  resolve();
                }
              }, 100);
            });
        });

        const items = await fetchItems(page);
        console.log(items);

        writeToFile('output.json', JSON.stringify(items));

        sendToKafka('bayer-data', items);
    } catch (error) {
        console.error(error);
    } finally {
        if(browser) {
            console.log("Browser closed");
            browser.close();
        }
    }
}

fetchBayerProducts();