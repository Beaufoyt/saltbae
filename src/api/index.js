import { version } from '../../package.json';
import { Router } from 'express';
import {
    closePositionLimit as bitmexClosePositionLimit,
    closePosition as bitmexClosePosition,
    openOrder as bitmexOpenOrder,
    getAccountBalance as bitmexGetAccountBalance,
    stopMarket as bitmexStopMarket,
    takeProfitMarket as bitmexTakeProfitMarket,
    getPosition,
    setLeverage,
    getOrderBook,
    getOrderBookValues
} from '../clients/bitmexHttp';
import {
    startDataLoop as startRangeDataLoop,
    getRsiRange,
    getAtrRange,
    getMACD,
    getStoch
} from '../clients/gdax';

let tradeOpen = false;
let orderId = 0;
let buyPrice = 0;
const bidSize = 1000;
const orderDepth = 35;

let direction = "";
let accountBalance = 0;

setLeverage(10);

const closePositionLimit = (closePrice) => {
    bitmexClosePositionLimit(closePrice);
}

const closePosition = () => {
    bitmexClosePosition(() => {
        tradeOpen = false;
    });
}

const getAccountBalance = () => {
    bitmexGetAccountBalance((balance) => {
        accountBalance = balance;
    });
}

const stopMarket = (price, amount = bidSize) => {
    bitmexStopMarket(amount, price);
}

const takeProfitMarket = (price, amount = bidSize) => {
    bitmexTakeProfitMarket(amount, price);
}

const openOrder = (tradeDirection, limit, stop) => {
    direction = tradeDirection;
    if (!tradeOpen) {
        tradeOpen = true;
        console.log(`Direction > ${direction}`);
        bitmexOpenOrder(bidSize, direction, (response) => {
            orderId = response.data.orderID;
            buyPrice = response.data.price;

            // Ideal way to set orders
            // const targetPrice = tradeDirection === 'Buy' ? buyPrice + limit : buyPrice - limit;
            // const stopPrice = tradeDirection === 'Buy' ? buyPrice + stop : buyPrice - stop;
            // takeProfitMarket(targetPrice);
            // stopMarket(stopPrice);

            console.log('Order opened! ID:', orderId, 'price:', buyPrice);
        });
    }
 }

const tradeLogic = () => {
    // getAccountBalance();
    let direction = 'sell';
    const stoch = getStoch(9, 3);
    let macd = getMACD(12, 26, 9);
    let atr = getAtrRange(50);
    atr = atr[atr.length - 1];
    const orderLimit = atr * 3;
    const orderStop = -(orderLimit / 2);
    macd = macd[macd.length - 1];
    const thisStoch = stoch[stoch.length - 1].k;
    const lastStoch = stoch[stoch.length - 2].k;

    const longTrend = macd.histogram > 1 && macd.signal > 1;
    const shortTrend = macd.histogram < -1 && macd.signal < -1;
    const currentTrend = longTrend ? 'long' : 'short';

    if (!tradeOpen) {
        console.log('Current trend:', currentTrend, 'Last stoch:', lastStoch, 'This stoch:', thisStoch);
        if (longTrend && lastStoch < 30 && thisStoch > 30) {
            direction = 'buy';
            openOrder('Buy', orderLimit, orderStop);
        }

        if (shortTrend && lastStoch > 70 && thisStoch < 70) {
            direction = 'sell';
            openOrder('Sell', orderLimit, orderStop);
        }
    } else {
        if (buyPrice) {
            const targetPrice = direction === 'buy' ? buyPrice + orderLimit : buyPrice - orderLimit;
            const stopPrice = direction === 'buy' ? buyPrice + orderStop : buyPrice - orderStop;

            getOrderBook(orderDepth, (response) => {

                var orderBookArray = response.data;

                const { askPrice, bidPrice, median } = getOrderBookValues(orderBookArray, orderDepth);

                console.log('Buy Price:', buyPrice, 'Target:', targetPrice, 'Stop:', stopPrice, 'Current price:', median);
                if ((direction === 'buy' && (median > targetPrice || median < stopPrice)) ||
                    (direction === 'sell' && (median < targetPrice || median > stopPrice))) {
                        closePosition();
                }
            });
        }
    }
};

// Params: candleSize, numCandles, interval in seconds
startRangeDataLoop(15, 110, 2);

setInterval(tradeLogic, 2 * 1000);
























// API stuff for when we need it.
export default (/*{ config, db }*/) => {
    let api = Router();

    api.get('/version', (req, res) => {
        res.send(version)
    });

    return api;
}
