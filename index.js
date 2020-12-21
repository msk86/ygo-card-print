const { CardNode } = require('ygo-card');
const sqlite3 = require('sqlite3');
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs')
const { Card } = CardNode;

const DEFAULT_IMAGE_BASE = 'https://gitee.com/ymssx/pics/raw/master/500';
const OUTPUT_PATH = './output';
const YDK_PATH = './resources/deck';
const MOLD_PATH = './resources/mold';
const CDB_PATH = './resources/cards.cdb';
function printCardWithData(data, ydkFile) {
    return new Promise(function(resolve) {
        // console.log(data);
        const id = data._id;
        const name = data.name;
        let card = new Card({ data, moldPath: `${MOLD_PATH}/`, picPath: `${DEFAULT_IMAGE_BASE}/${id}.jpg`});
        card.render().then((canvas) => {
            renderCanvasToFile(canvas, id, name, ydkFile, resolve);
        }).catch((error) => {
            console.log(`Image for ${id} cannot be found, use local placeholder card image instead...`);
            card = new Card({ data, moldPath: `${MOLD_PATH}/`, picPath: `${MOLD_PATH}/pic.jpg`});
            card.render().then((canvas) => {
                renderCanvasToFile(canvas, id, name, ydkFile, resolve);
            });
        });
    });
}

function renderCanvasToFile(canvas, id, name, ydkFile, resolve) {
    const out = fs.createWriteStream(`${OUTPUT_PATH}/${ydkFile}/${id}.jpg`);
    const stream = canvas.createJPEGStream();
    stream.pipe(out);
    out.on('finish', () =>  {console.log(`${name}(${id}.jpg) was created.`); resolve();});
}

function searchForCardsById(ids) {
    console.log(`query cards info from ${CDB_PATH}`);
    return new Promise(function (resolve) {
        const cardsDb = new sqlite3.Database(CDB_PATH);
        cardsDb.serialize(function() {
            var data = [];
            cardsDb.each(`SELECT t.id, t.name, d.type, d.atk, d.def, d.level, t.desc, d.race, d.attribute FROM texts t, datas d where t.id = d.id and t.id in (${ids.join(', ')})`, function (err, row) {
                const types = formatType(row.type);
                const attr = formatAttr(row.attribute);
                const race = formatRace(row.race)
                const link = formatLink(types, row.def);
                const level = formatLevel(row.level);
                const pendulum = formatPendulum(types, row.desc);
                data.push({
                    _id: row.id,
                    name: row.name,
                    ...types,
                    attack: row.atk,
                    defend: row.def,
                    level: level,
                    desc: row.desc,
                    ...race,
                    ...attr,
                    ...pendulum,
                    ...link
                });
            }, function() {
                resolve(data);
            });
        });

        cardsDb.close();
    });
}

function formatLevel(level) {
    return level & 0xF;
}

function formatType(type) {
    const TYPE_MONSTER = 0x1;
    const TYPE_SPELL = 0x2;
    const TYPE_TRAP = 0x4;

    const TYPE_NORMAL = 0x10;
    const TYPE_EFFECT = 0x20;
    const TYPE_FUSION = 0x40;
    const TYPE_RITUAL = 0x80;
    const TYPE_SYNCHRO = 0x2000;
    const TYPE_TOKEN = 0x4000;
    const TYPE_XYZ = 0x800000;
    const TYPE_LINK = 0x4000000;

    // const TYPE_TRAPMONSTER = 0x100;
    const TYPE_SPIRIT = 0x200;
    const TYPE_UNION = 0x400;
    const TYPE_DUAL = 0x800;
    const TYPE_TUNER = 0x1000;
    const TYPE_QUICKPLAY = 0x10000;
    const TYPE_CONTINUOUS = 0x20000;
    const TYPE_EQUIP = 0x40000;
    const TYPE_FIELD = 0x80000;
    const TYPE_COUNTER = 0x100000;
    const TYPE_FLIP = 0x200000;
    const TYPE_TOON = 0x400000;
    const TYPE_PENDULUM = 0x1000000;

    //type1
    const TYPE1 = [TYPE_MONSTER, TYPE_SPELL, TYPE_TRAP];
    const TYPE1_CODE = { [TYPE_MONSTER]: 'monster', [TYPE_SPELL]: 'spell', [TYPE_TRAP]: 'trap' };

    //type2
    const TYPE2 = [TYPE_FUSION, TYPE_RITUAL, TYPE_SYNCHRO, TYPE_TOKEN, TYPE_XYZ, TYPE_LINK, TYPE_NORMAL, TYPE_EFFECT, TYPE_QUICKPLAY, TYPE_CONTINUOUS, TYPE_EQUIP, TYPE_FIELD, TYPE_COUNTER];
    const TYPE2_CODE = { [TYPE_NORMAL]: 'tc', [TYPE_EFFECT]: 'xg', [TYPE_FUSION]: 'rh', [TYPE_RITUAL]: 'ys', [TYPE_SYNCHRO]: 'tt', [TYPE_TOKEN]: 'tk', [TYPE_XYZ]: 'cl', [TYPE_LINK]: 'lj', [TYPE_QUICKPLAY]: 'sg', [TYPE_CONTINUOUS]: 'yx', [TYPE_EQUIP]: 'zb', [TYPE_FIELD]: 'cd', [TYPE_COUNTER]: 'fj'};

    //type3-4
    const TYPE34 = [TYPE_NORMAL, TYPE_PENDULUM, TYPE_SPIRIT, TYPE_UNION, TYPE_DUAL, TYPE_TUNER, TYPE_FLIP, TYPE_TOON];
    const TYPE34_CODE = {[TYPE_NORMAL]: 'tc', [TYPE_PENDULUM]: 'lb', [TYPE_SPIRIT]: 'lh', [TYPE_UNION]: 'tm', [TYPE_DUAL]: 'ec', [TYPE_TUNER]: 'tz', [TYPE_FLIP]: 'fz', [TYPE_TOON]: 'kt'};

    let types = {type: '', type2: '', type3: '', type4: ''};

    for(const TYPE of TYPE1) {
        if((type & TYPE) === TYPE) {
            types['type'] = TYPE1_CODE[TYPE];
            break;
        }
    }

    for(const TYPE of TYPE2) {
        if((type & TYPE) === TYPE) {
            types['type2'] = TYPE2_CODE[TYPE];
            break;
        }
    }
    if ((types.type === TYPE1_CODE[TYPE_SPELL] || types.type === TYPE1_CODE[TYPE_TRAP]) && types.type2 === '') {
        types.type2 = 'tc';
    }

    for(const TYPE of TYPE34) {
        if(types.type2 === TYPE34_CODE[TYPE]) {
            continue;
        }
        if((type & TYPE) === TYPE) {
            if(!types['type3']) {
                types['type3'] = TYPE34_CODE[TYPE];
                break;
            }
            
            if(!types['type4']) {
                types['type4'] = TYPE34_CODE[TYPE];
                break;
            }
        }
    }
    
    return types;
}

function formatRace(race) {
    const RACE_WARRIOR = 0x1;
    const RACE_SPELLCASTER = 0x2;
    const RACE_FAIRY = 0x4;
    const RACE_FIEND = 0x8;
    const RACE_ZOMBIE = 0x10;
    const RACE_MACHINE = 0x20;
    const RACE_AQUA = 0x40;
    const RACE_PYRO = 0x80;
    const RACE_ROCK = 0x100;
    const RACE_WINDBEAST = 0x200;
    const RACE_PLANT = 0x400;
    const RACE_INSECT = 0x800;
    const RACE_THUNDER = 0x1000;
    const RACE_DRAGON = 0x2000;
    const RACE_BEAST = 0x4000;
    const RACE_BEASTWARRIOR = 0x8000;
    const RACE_DINOSAUR = 0x10000;
    const RACE_FISH = 0x20000;
    const RACE_SEASERPENT = 0x40000;
    const RACE_REPTILE = 0x80000;
    const RACE_WYRMS = 0x800000;
    const RACE_PSYCHO = 0x100000;
    const RACE_CYBERSE = 0x1000000;
    const RACE_DEVINE = 0x200000;
    const RACE_CREATORGOD = 0x400000;
    const RACES = [RACE_WARRIOR, RACE_SPELLCASTER, RACE_FAIRY, RACE_FIEND, RACE_ZOMBIE, RACE_MACHINE, RACE_AQUA, RACE_PYRO, RACE_ROCK, RACE_WINDBEAST, RACE_PLANT, RACE_INSECT, RACE_THUNDER, RACE_DRAGON, RACE_BEAST, RACE_BEASTWARRIOR, RACE_DINOSAUR, RACE_FISH, RACE_SEASERPENT, RACE_REPTILE, RACE_WYRMS, RACE_PSYCHO, RACE_CYBERSE, RACE_DEVINE, RACE_CREATORGOD];
    const RACES_CODE = {[RACE_WARRIOR]: '战士', [RACE_SPELLCASTER]: '魔法师', [RACE_FAIRY]: '天使', [RACE_FIEND]: '恶魔', [RACE_ZOMBIE]: '不死', [RACE_MACHINE]: '机械', [RACE_AQUA]: '水', [RACE_PYRO]: '炎', [RACE_ROCK]: '岩石', [RACE_WINDBEAST]: '鸟兽', [RACE_PLANT]: '植物', [RACE_INSECT]: '昆虫', [RACE_THUNDER]: '雷', [RACE_DRAGON]: '龙', [RACE_BEAST]: '兽', [RACE_BEASTWARRIOR]: '兽战士', [RACE_DINOSAUR]: '恐龙', [RACE_FISH]: '鱼', [RACE_SEASERPENT]: '海龙', [RACE_REPTILE]: '爬虫', [RACE_WYRMS]: '幻龙', [RACE_PSYCHO]: '念动力', [RACE_CYBERSE]: '电子界', [RACE_DEVINE]: '幻神兽', [RACE_CREATORGOD]: '创世神'}

    for(const RACE of RACES) {
        if((race & RACE) === RACE) {
            return { race: RACES_CODE[RACE] };
        }
    }
    return {};
}

function formatAttr(attr) {
    const ATTRIBUTE_EARTH = 0x01;
    const ATTRIBUTE_WATER = 0x02;
    const ATTRIBUTE_FIRE = 0x04;
    const ATTRIBUTE_WIND = 0x08;
    const ATTRIBUTE_LIGHT = 0x10;
    const ATTRIBUTE_DARK = 0x20;
    const ATTRIBUTE_DEVINE = 0x40;
    const ATTRS = [ATTRIBUTE_EARTH, ATTRIBUTE_WATER, ATTRIBUTE_FIRE, ATTRIBUTE_WIND, ATTRIBUTE_LIGHT, ATTRIBUTE_DARK, ATTRIBUTE_DEVINE];
    const ATTRS_CODE = { [ATTRIBUTE_EARTH]: 'earth', [ATTRIBUTE_WATER]: 'water', [ATTRIBUTE_FIRE]: 'fire', [ATTRIBUTE_WIND]: 'wind', [ATTRIBUTE_LIGHT]: 'light', [ATTRIBUTE_DARK]: 'dark', [ATTRIBUTE_DEVINE]: 'devine' };

    for(const ATTR of ATTRS) {
        if((attr & ATTR) === ATTR) {
            return { attribute: ATTRS_CODE[ATTR] };
        }
    }

    return {};
}

function formatLink(types, linkInt) {
    const LINK_DIRECTION_SOUTHWEST = 0x1;
    const LINK_DIRECTION_SOUTH = 0x2;
    const LINK_DIRECTION_SOUTHEAST = 0x4;
    const LINK_DIRECTION_WEST = 0x8;
    const LINK_DIRECTION_EAST = 0x20;
    const LINK_DIRECTION_NORTHWEST = 0x40;
    const LINK_DIRECTION_NORTH = 0x80;
    const LINK_DIRECTION_NORTHEAST = 0x100;
    const MARKER_POSITIONS = [LINK_DIRECTION_NORTHWEST, LINK_DIRECTION_NORTH, LINK_DIRECTION_NORTHEAST, LINK_DIRECTION_WEST, LINK_DIRECTION_EAST, LINK_DIRECTION_SOUTHWEST, LINK_DIRECTION_SOUTH, LINK_DIRECTION_SOUTHEAST];

    const link = [];
    if(types.type2 === 'lj') {
        for(const i in MARKER_POSITIONS) {
            link.push((linkInt & MARKER_POSITIONS[i]) === MARKER_POSITIONS[i]);
        }
    }
    return { link };
}

function formatPendulum(types, desc) {
    let pendulum = {};
    if(types.type3 === 'lb') {
        const descSplit = desc.split('\r\n【怪兽效果】\r\n');
        pendulum.lb_desc = descSplit[0].replace(/^.*?\r\n/g, '');
        pendulum.lb_num = +descSplit[0].match(/^←(\d+) 【灵摆】/)[1];
        pendulum.desc = descSplit[1];
    }
    return pendulum;
}

function notExist(cards, ids) {
    const notInDB = [];
    for(var id of ids) {
        let idExist = false;
        for (var card of cards) {
            if(`${card._id}` === id) {
                idExist = true;
                break;
            }
        }
        if(!idExist) {
            notInDB.push(id);
        }
    }
    return notInDB;
}

function readYdk(ydkFile) {
    console.log(`load ${YDK_PATH}/${ydkFile}.ydk`)
    const path = `${YDK_PATH}/${ydkFile}.ydk`;
    const ydk = fs.readFileSync(path).toString();
    const idsWithDummy = ydk.split(/\r?\n/);
    const ids = [];
    for(const id of idsWithDummy) {
        if(/^\d+$/.test(id)) {
            ids.push(id);
        }
    }
    return ids;
}

async function createPDF(ydkFile, cards, notCreated) {
    console.log(`start to generate ${ydkFile}.pdf...`);
    const PER_ROW = 3;
    const PER_PAGE = 9;
    const CARD_W = 697, CARD_H = 1016;
    const INIT_X = 193, INIT_Y = 229;
    const pdfCanvas = createCanvas(2480, 3508, 'pdf'); //210 297  // 59x86  //697x1016
    const ctx = pdfCanvas.getContext('2d');
    for (const i in cards) {
        if(i != 0 && i % PER_PAGE === 0 && i !== cards.length - 1) {
            await ctx.addPage();
        }
        const card = cards[i];
        if (notCreated.includes(card)) continue;
        const cardImg = await loadImage(`${OUTPUT_PATH}/${ydkFile}/${card}.jpg`);
        const x = (i % PER_PAGE) % PER_ROW, y = Math.floor((i % PER_PAGE) / PER_ROW);
        ctx.drawImage(cardImg, INIT_X + x * (CARD_W + 1), INIT_Y + y * (CARD_H + 1), CARD_W, CARD_H);

    }

    return new Promise(function(resolve) {
        const out = fs.createWriteStream(`${OUTPUT_PATH}/${ydkFile}.pdf`);
        const stream = pdfCanvas.createPDFStream();
        stream.pipe(out);
        out.on('finish', () =>  {console.log(`${ydkFile}.pdf was created.`);resolve();});
    });
}

function preClearImageOutput(ydkFile) {
    console.log(`clean ${OUTPUT_PATH}/${ydkFile}/`);
    fs.rmdirSync(`${OUTPUT_PATH}/${ydkFile}/`, {recursive: true});
    fs.mkdirSync(`${OUTPUT_PATH}/${ydkFile}/`, {recursive: true});
}

function postClearImageOutput(ydkFile) {
    console.log(`clean ${OUTPUT_PATH}/${ydkFile}/`);
    fs.rmdirSync(`${OUTPUT_PATH}/${ydkFile}/`, {recursive: true});
}

async function run(ydkFile) {
    preClearImageOutput(ydkFile);
    const ids = readYdk(ydkFile);
    const cards = await searchForCardsById(ids);
    for (const card of cards) {
        await printCardWithData(card, ydkFile);
    }
    const notCreated = notExist(cards, ids);
    await createPDF(ydkFile, ids, notCreated);
    postClearImageOutput(ydkFile);
}

run(process.argv[2]);