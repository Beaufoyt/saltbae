import { version } from '../../package.json';
import { Router } from 'express';
import facets from './facets';
// import { Client } from 'coinbase';
// import secrets from '../secrets.json';
import axios from 'axios';
import moment from 'moment';

let closingPrices = [];
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

const setClosingPrices = () => {
    const startTime = moment().subtract(50 + 30, 'minutes').toISOString();
    const endTime = moment().toISOString();
    const url = `https://api.gdax.com/products/BTC-USD/candles?start=${startTime}end=${endTime}&granularity=1800`;
    console.log(`=== Saving closing prices === ${url}`);

    axios.get(url).then(response => {
        closingPrices = [];

        for(var candle in response.data) {
            closingPrices.push(response.data[candle][4]);
        }

        // For some reason i need to slice the most current 50 as through axios i seem to get the last 400 candles no matter what times i put in.
        // if you log the url and hit it through the browser you get the correct amount back (50) :thinking:
        closingPrices = closingPrices.slice(0, 50);

    }, err => console.log(err));
};

const calculateRsi = () => {
    axios.get('https://api.gdax.com/products/BTC-USD/book?level=1').then(response => {
        const bidPrice = response.data.bids[0][0];
        const askPrice = response.data.asks[0][0];
        const median = (parseInt(bidPrice) + parseInt(askPrice)) / 2
        console.log(`Mid price: ${median}`);
    }, err => console.log(err));
};

calculateRsi();
setInterval(calculateRsi, 2 * 1000);
setClosingPrices();
setInterval(setClosingPrices, 30 * 1000);

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
