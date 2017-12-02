import { version } from '../../package.json';
import { Router } from 'express';
import facets from './facets';
// import { Client } from 'coinbase';
// import secrets from '../secrets.json';
import axios from 'axios';
import moment from 'moment';
import { ATR } from 'technicalindicators';

let closingPrices = [];
let atrData = {};
let hasMidPrice = false;
let tradeOpen = false;
const candleSize = 5;
const atrPeriod = 50;
const buyPeriod = 21;
const buyBuy = 50;

let previous21RSI = 0;
let previous50RSI = 0;
// var client = new Client({'apiKey': secrets.apiKey, 'apiSecret': secrets.apiSecret});
function getRsi(array, rsiPeriod) {
    const rsi = [];
    let first = true;
    let loss, gain, diff, avgGain, avgLoss;
    for (let i = rsiPeriod - 1; i >= 0; i--) {
        loss = gain = 0;
        if (first) {
            for (let j = i + rsiPeriod - 1; j >= i; j--) {
                diff = array[j + 1] - array[j];
                if (diff > 0) {
                    loss += Math.abs(diff);
                }
                else {
                    gain += Math.abs(diff);
                }


            }
            first = false;
            avgGain = gain / rsiPeriod;
            avgLoss = loss / rsiPeriod;

        }
        else {
            diff = array[i + 1] - array[i];

            if (diff > 0) {
                loss += Math.abs(diff);
            }
            else {
                gain += Math.abs(diff);
            }
            avgGain = ((avgGain * (rsiPeriod - 1)) + gain) / rsiPeriod;
            avgLoss = ((avgLoss * (rsiPeriod - 1)) + loss) / rsiPeriod;
        }
        if (avgLoss == 0) {
            rsi[i] = 100;
        }
        else {
            rsi[i] = 100 - (100 / (1 + (avgGain / avgLoss)));
        }
    }
    return rsi;
}

const openTrade = () => {
    tradeOpen = true;

    if (!tradeOpen) {
        // open logic here
    }
}

const closeTrade = () => {
    tradeOpen = false;
    // close logic here
}

const setClosingPrices = () => {
    const startTime = moment().subtract(110 * candleSize, 'minutes').toISOString();
    const endTime = moment().toISOString();
    const url = `https://api.gdax.com/products/BTC-USD/candles?start=${startTime}end=${endTime}&granularity=${candleSize * 60}`;
    console.log(`=== Saving closing prices === ${url}`);

    axios.get(url).then(response => {
        // For some reason i need to slice the most current 110 as through axios i seem to get the last 400 candles no matter what times i put in.
        // if you log the url and hit it through the browser you get the correct amount back (110) :thinking:
        response.data = response.data.length > 110 ? response.data.slice(0, 110) : response.data;
        closingPrices = [];
        atrData = {
            high: [],
            low: [],
            close: [],
            period: atrPeriod,
        };
        hasMidPrice = false;

        for(var candle in response.data) {
            const close = response.data[candle][4];

            atrData.low.push(response.data[candle][1]);
            atrData.high.push(response.data[candle][2]);
            atrData.close.push(close);
            closingPrices.push(close);
        }


    }, err => console.log(err));
};

const calculateRsi = () => {
    if (closingPrices.length) {
        axios.get('https://api.gdax.com/products/BTC-USD/book?level=1').then(response => {
            const bidPrice = response.data.bids[0][0];
            const askPrice = response.data.asks[0][0];
            const median = (parseInt(bidPrice) + parseInt(askPrice)) / 2
            console.log(`Mid price: ${median}`);

            if (!hasMidPrice) {
                closingPrices.unshift(median);
            } else {
                closingPrices[0] = median;
            }
            hasMidPrice = true

            let shouldBuy = false;
            const rsi21Inidicator = getRsi(closingPrices, buyPeriod)[0]
            const rsi50Inidicator = getRsi(closingPrices, buyBuy)[0]
            const ATRValue = ATR.calculate(atrData)[0];

            if (previous21RSI && previous50RSI) {
                if (rsi21Inidicator > buyBuy && previous21RSI < buyBuy) {
                    if (rsi50Inidicator > previous50RSI) {
                        shouldBuy = true;
                        openTrade();
                    }
                }
            }

            previous21RSI = rsi21Inidicator;
            previous50RSI = rsi50Inidicator;

            console.log('RSI21:', rsi21Inidicator, 'RSI50:', rsi50Inidicator, 'Should Buy:', shouldBuy, 'tradeOpen:', tradeOpen, 'ATR:', ATRValue);
            console.log('==========================================================')


        }, err => console.log(err));
    }
};

setClosingPrices();
setInterval(setClosingPrices, 10 * 1000);
calculateRsi();
setInterval(calculateRsi, 2 * 1000);






// API stuff for when we need it.
export default ({ config, db }) => {
    let api = Router();

    // mount the facets resource
    api.use('/facets', facets({ config, db }));

    // perhaps expose some API metadata at the root
    api.get('/version', (req, res) => {
        res.send(version)
    });

    return api;
}
