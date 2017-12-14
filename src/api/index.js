import { version } from '../../package.json';
import { Router } from 'express';
import moment from 'moment';

import {
    closePositionLimit as bitmexClosePositionLimit,
    closePosition as bitmexClosePosition,
    openMarketOrder as bitmexOpenOrder,
    openLimitOrder as bitmexOpenLimitOrder,
    getPosition,
    setLeverage,
    getOrderBook,
    getOrderBookValues
} from '../clients/bitmexHttp';
import {
    startDataLoop as startRangeDataLoop,
    getRsiRange,
    getAtrRange,
    getMidPrice,
} from '../clients/gdax';

let tradeOpen = false;
let orderId = 0;
let buyPrice = 0;
let buyRatio = 0;

const bidSize = 1000;
const orderDepth = 35;

let direction = 'Buy';
let trend = "";

const recentPrices = [];

// setLeverage(100);
// bitmexClosePosition();

const closePositionLimit = () => {
    var closePrice = direction == 'Buy' ? buyPrice + 30 : buyPrice - 30;
    bitmexClosePositionLimit(closePrice);
}

const closePosition = () => {
    bitmexClosePosition();
}

const openOrder = (tradeDirection) => {
    direction = tradeDirection;
    if (!tradeOpen) {
        console.log(`Direction > ${direction}`);
        bitmexOpenOrder(bidSize, direction, (response) => {
            orderId = response.data.orderID;
            buyPrice = response.data.price;
            tradeOpen = true;
            closePositionLimit();
            console.log('Order opened! ID:', orderId, 'price:', buyPrice);
        });
    }
}

const openLimitOrder = (tradeDirection, price) => {
    if (!tradeOpen) {
        bitmexOpenLimitOrder(bidSize, tradeDirection, price, (response) => {
            orderId = response.data.orderID;
            buyPrice = response.data.price;
            tradeOpen = true;
            closePositionLimit();
            console.log('Order opened! ID:', orderId, 'price:', buyPrice);
        });
    }
}

// const tradeLogic = () => {
//     const rsi21Indicator = getRsiRange(21)[0];
//     const atrIndicator = getAtrRange(21)[0];
//
//     if (rsi21Indicator && atrIndicator) {
//         console.log(`RSI 21: ${rsi21Indicator} ATR: ${atrIndicator}`);
//
//         getOrderBook(orderDepth, (response) => {
//
//             var orderBookArray = response.data;
//
//             const { askPrice, bidPrice, median } = getOrderBookValues(orderBookArray, orderDepth);
//             console.log('Bid '+ bidPrice + ' Ask ' + askPrice);
//             var buyTotal = 0;
//             var sellTotal = 0;
//             // see if any positions open
//             getPosition((positionResponse) => {
//                 // if no postiions open
//                 if (positionResponse != null &&  positionResponse.data != null && positionResponse.data[0].currentQty == 0 ){
//                     tradeOpen = false;
//                     for (var i = 0; i < orderBookArray.length; i++) {
//                         if (orderBookArray[i].side == "Buy"){
//                             buyTotal = buyTotal + orderBookArray[i].size;
//                         }
//                         if (orderBookArray[i].side == "Sell"){
//                             sellTotal = sellTotal + orderBookArray[i].size;
//                         }
//                     }
//                     buyRatio = Math.round((buyTotal/sellTotal) * 100);
//                     if (buyRatio > 500){ //&& trend == "UP"
//                         openOrder('Buy');
//                     }
//                     if (buyRatio < 20 && trend == "DOWN"){
//                         openOrder('Sell');
//                     }
//                     console.log('Current Price:', median,  ' Buy percentage:', buyRatio );
//                     console.log('==========================================================')
//                 } else {
//                     tradeOpen = true;
//                     if (positionResponse.data[0].currentQty > 0) {
//                         direction = 'Buy';
//                     }
//                     if (positionResponse.data[0].currentQty < 0) {
//                         direction = 'Sell';
//                     }
//                     var dollarMovement =  direction == 'Buy' ? median - buyPrice :  buyPrice - median;
//                     console.log(direction, ' trade open at:', buyPrice, ' Current Price:', median, ' Making:', dollarMovement );
//                     console.log('==========================================================')
//                     if (dollarMovement < -20 || dollarMovement  > 20) {
//                         closePosition();
//                     }
//                 }
//             });
//         }, err => console.log(err));
//     }
// };

const tradeLogic = () => {
    const rsi21Indicator = getRsiRange(21)[0];

    const midPrice = getMidPrice();

    if (midPrice) {
        if (tradeOpen) {
            getPosition((positionResponse) => {
                // if no postiions open
                var dollarMovement =  direction == 'Buy' ? positionResponse.lastPrice - buyPrice :  buyPrice - positionResponse.lastPrice;
                console.log(direction, ' trade open at:', buyPrice, ' Current Price:', positionResponse.lastPrice, ' Making:', dollarMovement );
                console.log('==========================================================')
            });
        } else {
            if (recentPrices.length > 4) {
                recentPrices.shift();
                recentPrices.push(midPrice)

                // has the price increased by more than 100$ in the last 10 seconds?
                if (rsi21Indicator > 50 && recentPrices[4] - recentPrices[0] > 100) {
                    getOrderBook(orderDepth, (response) => {
                        var orderBookArray = response.data;
                        const { askPrice, bidPrice, median } = getOrderBookValues(orderBookArray, orderDepth);

                        console.log('Bid', bidPrice, 'Ask', askPrice);
                        openLimitOrder('Buy', median + 5);
                    }, err => console.log(err));
                }
            } else {
                recentPrices.push(midPrice);
            }
        }
    }
}

// Params: candleSize, numCandles, interval in seconds
startRangeDataLoop(5, 110, 2);

setInterval( tradeLogic, 2 * 1000);
























// API stuff for when we need it.
export default (/*{ config, db }*/) => {
    let api = Router();

    api.get('/version', (req, res) => {
        res.send(version)
    });

    return api;
}
