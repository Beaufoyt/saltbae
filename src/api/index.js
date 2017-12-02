import { version } from '../../package.json';
import { Router } from 'express';
import facets from './facets';
import BitMEXClient from '../clients/bitmex';
// import { Client } from 'coinbase';
// import secrets from '../secrets.json';
import axios from 'axios';
import moment from 'moment';
import { ATR } from 'technicalindicators';

const bitmexClient = new BitMEXClient({testnet: false});

let closingPrices = [];
let atrData = {};
let hasMidPrice = false;
let tradeOpen = false;
const tradeId = 0;
const candleSize = 5;
const atrPeriod = 50;
const buyPeriod = 21;
const buyBuyPeriod = 50;
let rsi21Time = null;

let previous21RSI = 0;
let previous50RSI = 0;
// var client = new Client({'apiKey': secrets.apiKey, 'apiSecret': secrets.apiSecret});

bitmexClient.on('error', console.error);
bitmexClient.on('open', () => console.log('Connection opened.'));
bitmexClient.on('close', () => console.log('Connection closed.'));
bitmexClient.on('initialize', () => console.log('Client initialized, data is flowing.'));

bitmexClient.addStream('XBTUSD', 'instrument', function(data, symbol, tableName) {
  console.log(`Got update for ${tableName}:${symbol}. Current state:\n${JSON.stringify(data).slice(0, 100)}...`);
  // Do something with the table data...
});

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

    // set trade and save tradeId
}

const getCurrentTradeDetails = (tradeId) => {
    // get trade from bitmex
    console.log('Trade details... profit etc', tradeId);
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

const getTimeUnder50 = (rsi21Inidicator) => {
    let rsi21TimeDiff = null;

    if (!rsi21Time) {
        if (rsi21Inidicator < 50) {
            rsi21Time = moment();
        }
    } else {
        const now = moment();
        const duration = moment.duration(now.diff(rsi21Time));
        rsi21TimeDiff = duration.asSeconds();

         if (rsi21TimeDiff < candleSize * 60 && rsi21Inidicator > 50) {
             rsi21TimeDiff = null;
             rsi21Time = null;
         }
    }

    return rsi21TimeDiff;
}

const calculateRsi = () => {
    if (!tradeOpen) {
        // open logic here
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
                const rsi21Inidicator = getRsi(closingPrices, buyPeriod)[0];
                const rsi50Inidicator = getRsi(closingPrices, buyBuyPeriod)[0];
                const ATRValue = ATR.calculate(atrData)[0];
                const rsi21TimeDiff = getTimeUnder50(rsi21Inidicator);

                console.log('RSI21 seconds under 50:', rsi21TimeDiff);

                if (previous21RSI && previous50RSI && rsi21TimeDiff && rsi21TimeDiff > candleSize * 60) {
                    if (rsi21Inidicator > buyBuyPeriod && previous21RSI < buyBuyPeriod) {
                        if (rsi50Inidicator > previous50RSI) {
                            rsi21Time = null;
                            shouldBuy = true;
                            openTrade();
                        }
                    }
                }

                previous21RSI = rsi21Inidicator;
                previous50RSI = rsi50Inidicator;

                console.log('RSI21:', rsi21Inidicator, 'RSI50:', rsi50Inidicator, 'Should Buy:', shouldBuy, 'Trade Open:', tradeOpen, 'ATR:', ATRValue);
                console.log('==========================================================')


            }, err => console.log(err));
        }
    } else {
        getCurrentTradeDetails(tradeId);
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
