import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';

console.error = (message, ...optionalParams) => {
    if (message.includes('Could not parse CSS stylesheet')) return;
    originalConsoleError(message, ...optionalParams);
};

const folderPath = "C:\\Users\\uz1584gj\\AppData\\Roaming\\.minecraft\\mods";
const downloadDir = path.join(process.env.USERPROFILE, 'Downloads\\UpdatedMods');

const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36'
];

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const getRandomUserAgent = () => userAgents[Math.floor(Math.random() * userAgents.length)];

const fetchUrl = async url => {
    const fetch = (await import('node-fetch')).default;
    const userAgent = getRandomUserAgent();
    return fetch(url, { headers: { 'User-Agent': userAgent } })
        .then(response => response.text())
        .catch(error => { console.log('Error fetching HTML:', error); return false; });
};

const returnModNames = folderPath => {
    try {
        let files = fs.readdirSync(folderPath);
        let jarFiles = files.filter(file => path.extname(file) === '.jar');
        let fileNames = jarFiles.map(file => path.parse(file).name);
        return fileNames.map(mod => mod.replace(/^(fabric|forge|neoforge|quilt)|([-_]?fabric|[-_]?noeforge|[-_]?forge|[-_]?quilt|[-_]?mc\d+(\.\d+)*|[-_]?v?\d+(\.\d+)*(\.\d+)?)/gi, (match, p1) => p1 ? p1 : '').replace(/[-_]+$/, ''));
    } catch (error) {
        console.log('Error reading directory:', error);
        return [];
    }
};

const getModUrl = async (modSlug, version, platform) => {
    let modrinthUrl = `https://modrinth.com/mod/${modSlug}/versions?`;
    if (version) modrinthUrl += "g=" + version;
    if (platform) modrinthUrl += "&l=" + platform;
    const dom = new JSDOM(await fetchUrl(modrinthUrl)).window.document;
    const downloadLink = dom.querySelector(`a[aria-label="Download"]`);
    if (!downloadLink && dom.querySelector("h1") != null) return "noVersion";
    return downloadLink ? downloadLink.href : false;
};

const getModSlug = async modName => {
    try {
        let json = JSON.parse(await fetchUrl(`https://api.modrinth.com/v2/search?limit=1&index=relevance&query=${modName}`));
        return json ? json["hits"][0].slug : false;
    } catch { }
};

const downloadFile = async (url, downloadPath) => {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(url);
    const fileStream = fs.createWriteStream(downloadPath);
    return new Promise((resolve, reject) => {
        response.body.pipe(fileStream);
        response.body.on('error', reject);
        fileStream.on('finish', resolve);
    });
};

const main = async (version, platform) => {
    let fileNames = returnModNames(folderPath);
    if (version == "") version = null;
    if (platform == "") platform = null;

    if (!fs.existsSync(downloadDir)) fs.mkdirSync(downloadDir);

    for (let i = 0; i < fileNames.length; i++) {
        let modSlug = await getModSlug(fileNames[i]);
        let link = await getModUrl(modSlug, version, platform);
        let timeToWait = Math.floor(Math.random() * 3000) + 2000;
        if (typeof modSlug != "undefined") {
            if (link == "noVersion") console.log(`${modSlug} has no matching mod for the selected version or/and platform.`);
            else {
                if (link) {
                    if (link.substring(0, 4) == "http" && link.substring(link.length - 3, link.length) != "jar") {
                        console.log(`Unable to Find a JAR File For ${modSlug}`);
                        break;
                    }
                    console.log(`${modSlug} Link: ${link}`);
                    const fileName = path.basename(link);
                    const downloadPath = path.join(downloadDir, fileName);
                    await downloadFile(link, downloadPath);
                    console.log(`Downloaded ${fileName} to ${downloadPath}`);
                } else --i;
            }
        }
        await sleep(timeToWait);
    }
};

const [,, version, platform, getSlugNames] = process.argv;
main("1.21.1", "fabric");
