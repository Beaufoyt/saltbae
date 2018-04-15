import axios from 'axios';
import moment from 'moment';
import { getAtr, getRsi, getMACD as getMACDIndicator, getStoch as getStochIndicator } from '../lib/ranges';

let closingPrices = [];
let candles = [];
let midPrice = null;

const _resetAtrData = () => {
    return {
        high: [],
        low: [],
        close: [],
        period: 0,
    };
}

const _resetMACDData = () => {
    return {
        values: [],
        fastPeriod: 5,
        slowPeriod: 8,
        signalPeriod: 3 ,
        SimpleMAOscillator: true,
        SimpleMASignal: true
    };
}

const _resetStochData = () => {
    return {
        high: [],
        low: [],
        close: [],
        period: 0,
        signalPeriod: 0,
    };
}

let atrData = _resetAtrData();
let macdData = _resetMACDData();
let stochData = _resetStochData();

const request = (method, path, payload, cb) => {
    axios[method](`https://api.gdax.com/${path}`, payload).then((response) => {
        cb(response);
    }, () => console.log(`Saltbae Error: Method: ${method.toUpperCase()} path: ${path}`));
}

const requestOrderBook = (cb) => {
    request('get', '/products/BTC-USD/book?level=1', null, cb ? cb : (response) => {
        const bidPrice = response.data.bids[0][0];
        const askPrice = response.data.asks[0][0];
        const median = (parseInt(bidPrice) + parseInt(askPrice)) / 2

        midPrice = median;
   });
}

const requestCandles = (candleSize, amount, cb) => {
    amount = amount < 1 ? 1 : amount;
    const startTime = moment().subtract(110 * candleSize, 'minutes').toISOString();
    const endTime = moment().toISOString();

    request('get', `/products/BTC-USD/candles?start=${startTime}end=${endTime}&granularity=${candleSize * 60}`, null, cb ? cb : (response) => {
        response.data = response.data.length > 51 ? response.data.slice(0, 51) : response.data;
        candles = response.data;
        closingPrices = [];
        atrData = _resetAtrData();
        macdData = _resetMACDData();
        stochData = _resetStochData();

        for(var candle in response.data) {
            const close = response.data[candle][4];

            atrData.low.push(response.data[candle][1]);
            atrData.high.push(response.data[candle][2]);
            atrData.close.push(close);

            stochData.low.push(response.data[candle][1]);
            stochData.high.push(response.data[candle][2]);
            stochData.close.push(close);

            macdData.values.push(close);
            closingPrices.push(close);
        }
    });
}

export const getMidPrice = () => {
    return midPrice;
}

export const getAtrRange = (atrPeriod) => {
    atrData.period = atrPeriod;
    return (atrData.high && atrData.high.length) ? getAtr(atrData) : [];
}

export const getMACD = (fast, slow, signal) => {
    macdData.fastPeriod = fast;
    macdData.slowPeriod = slow;
    macdData.signalPeriod = signal;
    macdData.values = macdData.values.slice(0, 50);

    return (macdData.values && macdData.values.length) ? getMACDIndicator(macdData) : [];
}

export const getStoch = (period, signalPeriod, index) => {
    period = 14;
    signalPeriod = 3;
    var low = getLow(period, stochData.low.slice(index, period));
    var high = getHigh(period, stochData.high.slice(index, period));

    var stochasticResultK = ( (stochData.close[index] - low) / ( high - low ) ) * 100;
    //console.log(" CURRENT PRICE " + stochData.close[index] + " HIGH :" + high + " LOW: " + low + "STOCHASTIC : " + stochasticResultK);

    return stochasticResultK;
}

function getLow(period, lows) {
    var low = lows[0];
    for (var i = 0; i < period; i++){
        if (  lows[i] <  low) {
            low = lows[i];
        }
    }
    return low;
}

function getHigh(period, highs) {
    var high = highs[0];
    for (var i = 0; i < period; i++){
        if (  highs[i]  >   high) {
            high = highs[i];
        }
    }
    return high;
}

export const getCandles = () => {
    return candles;
}

export const getRsiRange = (period) => {
    if (midPrice) {
       closingPrices.unshift(midPrice);
    } else {
       closingPrices[0] = midPrice;
    }

    return (midPrice && closingPrices && closingPrices.length > 1) ? getRsi(closingPrices, period) : [];
}

export const startDataLoop = (candleSize, numCandles, intervalSeconds) => {
    requestCandles(candleSize, numCandles, null);
    setInterval(() => requestCandles(candleSize, numCandles, null), intervalSeconds * 1000);
    requestOrderBook();
    setInterval(requestOrderBook, intervalSeconds * 1000);
}
