# RUN

0. install nodejs: https://nodejs.org/en/download/
1. update your `resources/cards.cdb` to latest
2. move ydk file to `resources/deck/` (`test-deck.ydk` as example)
3. run `npm install`
   * for Chinese user, you can try to use `cnpm` or `yarn` to install the package
   * to use cnpm: `npm install cnpm --global` then run `cnpm install` instead of running `npm install`
   * to use yarn: `npm install yarn --global` then run `yarn install` instead of running `npm install`
5. run `node index.js test-deck`
6. checkout the pdf in `output/test-deck.pdf`

# Multilingual

0. accepted languages: `cn`, `jp`, `en`.
1. find a cdb file with your language, rename it to `cards-${lang}.cdb` and move it to `/resources` folder.
2. run `node index.js test-deck ${lang}`
3. default language is Chinese, `cn` can be passed automatically so you can still run `node index.js test-deck`

# THANKS

Thanks for the inspiration of `https://github.com/ymssx/yugioh-card`, there is lot's unclear params in this lib but I tested out...
