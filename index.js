#!/usr/bin/env node

import Steamatic from "steamatic";
import minimist from 'minimist';
import dotenv from 'dotenv'
import Joque from 'joque'

dotenv.config()

const jq = new Joque()
const args = minimist(process.argv)
const web = await Steamatic.Basic(args, console.log)

const stats = [0, 0]

const logResults = (results, descr) => {
  results.forEach(card => stats[Number(card.foil)]++)
  console.log(jq.getState(), stats.join(' '), (stats[1] / stats[0] * 100).toFixed(2), '|', descr.name)
}

const openBoosterJ = () => jq.take(item => web.inventory.openBoosterPack(item.data)
  .then(r => {
    logResults(r, item.data.descriptions)
    item.resolve()
  })
  .catch(e => {
    console.log(e)
    item.resolve()
  })
  .finally(() => {
    openBoosterJ()
  })
)

const getType = desc => desc.tags.find(el => el?.localized_category_name === 'Item Type')?.localized_tag_name
const isBooster = el => getType(el.descriptions) === 'Booster Pack'

for await (const chunk of web.inventory.gen({chunkSize: 1000})) {
  const items = web.inventory.tools.mergeAssetsWithDescriptions(chunk)
  const boosters = items.filter(isBooster)
  if(!boosters.length) break
  boosters.forEach(b => jq.add(b))
}

let concurrency = Number(args.c) || 1
console.log('running concurrency:', concurrency)
while(concurrency--) openBoosterJ()
