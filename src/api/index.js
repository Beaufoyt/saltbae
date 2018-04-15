import { version } from '../../package.json';
import { Router } from 'express';
import Slack from 'slack-node';
import { slackUrl } from '../secrets';
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
    getStoch,
    getMidPrice
} from '../clients/gdax';

const slack = new Slack();
slack.setWebhook(slackUrl);

let tradeOpen = false;
let orderId = 0;
let buyPrice = 0;
const bidSize = 10;
const orderDepth = 35;

let direction = "";
let accountBalance = 0;

setLeverage(10);

const sendSlackMessage = (text) => {
    slack.webhook({
        channel: "#tradingbot",
        text
    }, (err, response) => {
        // console.log(response);
    });
}

const closePositionLimit = (closePrice) => {
    bitmexClosePositionLimit(closePrice);
}

const closePosition = () => {
    tradeOpen = false;
    bitmexClosePosition(() => {
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
            buyPrice = getMidPrice();

            // Ideal way to set orders
            // const targetPrice = tradeDirection === 'Buy' ? buyPrice + limit : buyPrice - limit;
            // const stopPrice = tradeDirection === 'Buy' ? buyPrice + stop : buyPrice - stop;
            // takeProfitMarket(targetPrice);
            // stopMarket(stopPrice);
            sendSlackMessage(`${direction} order opened for ${bidSize} contracts at $${buyPrice}! I am right now independently, financially independently!`)

            console.log('Order opened! ID:', orderId, 'price:', buyPrice);
        });
    }
}

const sendWinMessage = (price) => {
    sendSlackMessage(`Order closed for a WIN at $${price}! BitcoNNEEEEEEEEEEEEEEEEECT!!!!`)
}

const sendLossMessage = (price) => {
    sendSlackMessage(`Order closed for a LOSS at $${price}. The WORLD is not anymore the way it used to be mmh mmh NO NO NOH.`)
}

const tradeLogic = () => {
    getAccountBalance();
    const thisStoch = getStoch(14, 5, 0);
    const lastStoch = getStoch(14, 5, 1);

    let atr = getAtrRange(50);
    atr = atr[atr.length - 1];

    const orderLimit = atr * 1.5;
    const orderStop = -(orderLimit / 2);

    if (!tradeOpen) {
        console.log('Last stoch:', lastStoch, 'This stoch:', thisStoch);
        if (lastStoch < 25 && thisStoch > 25) {
            openOrder('Buy', orderLimit, orderStop);
        }

        if (lastStoch > 75 && thisStoch < 75) {
            openOrder('Sell', orderLimit, orderStop);
        }
    } else {
        if (buyPrice) {
            const targetPrice = direction === 'Buy' ? buyPrice + orderLimit : buyPrice - orderLimit;
            const stopPrice = direction === 'Buy' ? buyPrice + orderStop : buyPrice - orderStop;

            const currentPrice = getMidPrice();

            console.log(direction, 'Price:', buyPrice, 'Target:', targetPrice, 'Stop:', stopPrice, 'Current price:', currentPrice);
            if (direction === 'Buy') {
                if (currentPrice > targetPrice || thisStoch > 78) {
                    closePosition();
                    sendWinMessage(currentPrice);
                }
                if (currentPrice < stopPrice) {
                    closePosition();
                    sendLossMessage(currentPrice);
                }
            } else {
                if (currentPrice < targetPrice || thisStoch < 22) {
                    closePosition();
                    sendWinMessage(currentPrice);
                }
                if (currentPrice > stopPrice) {
                    closePosition();
                    sendLossMessage(currentPrice);
                }
            }
        }
    }
};

// Params: candleSize, numCandles, interval in seconds
startRangeDataLoop(15, 55, 2);

setInterval(tradeLogic, 2 * 1000);

sendSlackMessage("Hey hey hey everybody, My name is Carlos Matos and I am coming from New York City, New York");
























// API stuff for when we need it.
export default (/*{ config, db }*/) => {
    let api = Router();

    api.get('/version', (req, res) => {
        res.send(version)
    });

    return api;
}
