const Discord = require('discord.js'),
    synchronizeSlashCommands = require('discord-sync-commands'),
    fetch = require('node-fetch'),
    puppeteer = require('puppeteer'),
    config = require('./config.json');
const client = new Discord.Client({
    intents: []
});

synchronizeSlashCommands(client, [
    {
        name: 'vitemonprenom',
        description: 'Votre nouveau prénom pour 2022 simplement et rapidement.',
        options: [
            {
                "name": "prénom",
                "description": "Prénom actuel",
                "type": 3,
                "required": true,
            }
        ]
    }
], {});

client.on('ready', () => {
    setInterval(async () => {
        const response = await fetch('https://www.vitemonprenom.com/already.php').then(async (res) => await res.json()).catch((O_o) => { O_o })
        if (!response.result || !response.already) return;
        client.user.setActivity({
            type: "WATCHING",
            name: `${numberWithCommas(response.already)} prénoms ont déjà été obtenus.`
        });
    }, 10000)
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    await interaction.deferReply();

    if (interaction.commandName === 'vitemonprenom') {

        const browser = await puppeteer.launch({
            args: ['--no-sandbox']
        });
        const page = await browser.newPage();
        await page.goto('https://www.vitemonprenom.com/', {
            waitUntil: 'networkidle2',
        });

        const name = interaction.options._hoistedOptions.find(x => x.name === "prénom")?.value
        await page.type("input[id='search-searchbar']", name)
        await page.waitForSelector("span[class='small']");

        const text = await page.evaluate(() => {
            return document.querySelector('div[class="search-result mt-5"]').innerHTML
        })

        console.log(text)

        await screenshotDOMElement(page, {
            selector: 'div[class="container mt-5"]',
            padding: 16
        }).then(async (buffer) => {
            const img = new Discord.MessageAttachment(buffer, `${interaction.user.id}.png`)

            await interaction.editReply({
                embeds: [{
                    files: [
                        img
                    ],
                    author: {
                        name: `${client.user.username}`,
                        iconURL: client.user.displayAvatarURL(),
                        url: "https://www.vitemonprenom.com/"
                    },
                    color: '#5561D9',
                    image: {
                        url: `attachment://${interaction.user.id}.png`
                    }

                }], files: [img]
            })
        });

        await browser.close();
    }
});

async function screenshotDOMElement(page, opts = {}) {
    const padding = 'padding' in opts ? opts.padding : 0;
    const path = 'path' in opts ? opts.path : null;
    const selector = opts.selector;

    if (!selector)
        throw Error('Please provide a selector.');

    const rect = await page.evaluate(selector => {
        const element = document.querySelector(selector);
        if (!element)
            return null;
        const { x, y, width, height } = element.getBoundingClientRect();
        return { left: x, top: y, width, height, id: element.id };
    }, selector);

    if (!rect)
        throw Error(`Could not find element that matches selector: ${selector}.`);

    return await page.screenshot({
        type: 'png',
        clip: {
            x: rect.left - padding,
            y: rect.top - padding,
            width: rect.width + padding * 2,
            height: rect.height + padding * 2
        }
    });
}

function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

client.login(config.token);