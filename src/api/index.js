import { version } from '../../package.json';
import { Router } from 'express';
import {
    closePositionLimit as bitmexClosePositionLimit,
    closePosition as bitmexClosePosition,
    openOrder as bitmexOpenOrder,
    getPosition,
    setLeverage,
    getOrderBook,
    getOrderBookValues
} from '../clients/bitmexHttp';
import {
    startDataLoop as startRangeDataLoop,
    getRsiRange,
    getAtrRange
} from '../clients/gdax';

let tradeOpen = false;
let orderId = 0;
let buyPrice = 0;
let buyRatio = 0;

const bidSize = 1000;
const orderDepth = 35;

let direction = "";
let trend = "";

setLeverage(100);
// bitmexClosePosition();

const closePositionLimit = () => {
    var closePrice = direction == 'Buy' ? buyPrice + 20 : buyPrice - 20;
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

const tradeLogic = () => {
    const rsi21Indicator = getRsiRange(21)[0];
    const atrIndicator = getAtrRange()[0];

    if (rsi21Indicator && atrIndicator) {
        console.log(`RSI 21: ${rsi21Indicator} ATR: ${atrIndicator}`);

        getOrderBook(orderDepth, (response) => {

            var orderBookArray = response.data;

            const { askPrice, bidPrice, median } = getOrderBookValues(orderBookArray, orderDepth);
            console.log('Bid '+ bidPrice + ' Ask ' + askPrice);
            var buyTotal = 0;
            var sellTotal = 0;
            // see if any positions open
            getPosition((positionResponse) => {
                // if no postiions open
                if (positionResponse != null &&  positionResponse.data != null && positionResponse.data[0].currentQty == 0 ){
                    tradeOpen = false;
                    for (var i = 0; i < orderBookArray.length; i++) {
                        if (orderBookArray[i].side == "Buy"){
                            buyTotal = buyTotal + orderBookArray[i].size;
                        }
                        if (orderBookArray[i].side == "Sell"){
                            sellTotal = sellTotal + orderBookArray[i].size;
                        }
                    }
                    buyRatio = Math.round((buyTotal/sellTotal) * 100);
                    if (buyRatio > 500){ //&& trend == "UP"
                        openOrder('Buy');
                    }
                    if (buyRatio < 20 && trend == "DOWN"){
                        openOrder('Sell');
                    }
                    console.log('Current Price:', median,  ' Buy percentage:', buyRatio );
                    console.log('==========================================================')
                } else {
                    tradeOpen = true;
                    if (positionResponse.data[0].currentQty > 0) {
                        direction = 'Buy';
                    }
                    if (positionResponse.data[0].currentQty < 0) {
                        direction = 'Sell';
                    }
                    var dollarMovement =  direction == 'Buy' ? median - buyPrice :  buyPrice - median;
                    console.log(direction, ' trade open at:', buyPrice, ' Current Price:', median, ' Making:', dollarMovement );
                    console.log('==========================================================')
                    if (dollarMovement < -20 || dollarMovement  > 20) {
                        closePosition();
                    }
                }
            });
        }, err => console.log(err));
    }
};

// Params: candleSize, numCandles, atrPeriod, interval in seconds
startRangeDataLoop(5, 110, 50, 2);

setInterval( tradeLogic, 2 * 1000);
























// API stuff for when we need it.
export default (/*{ config, db }*/) => {
    let api = Router();

    api.get('/version', (req, res) => {
        res.send(version)
    });

    return api;
}
