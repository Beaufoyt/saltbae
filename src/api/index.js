import { version } from '../../package.json';
import { Router } from 'express';
import {
    closePositionLimit as bitmexClosePositionLimit,
    closePosition as bitmexClosePosition,
    openOrder as bitmexOpenOrder,
    getPosition,
    setLeverage,
    getOrderBook,
    getOrderBookValues,
    getBalance
} from '../clients/bitmexHttp';
import {
    startDataLoop as startRangeDataLoop,
    getRsiRange,
    getAtrRange
} from '../clients/gdax';

// API stuff for when we need it.
export default (/*{ config, db }*/) => {
    let api = Router();

    api.get('/version', (req, res) => {
        res.send(version)
    });

    return api;
}

let tradeOpen = false;
let orderId = 0;
let buyPrice = 0;
let buyRatio = 0;

const leverage = 100;
const candleSize = 5;
const atrPeriod = 50;
const buyPeriod = 21;
const buyBuyPeriod = 50;
const orderDepth = 10;
const profitTarget = 5; //15
let median = 0;
let bidSize = 100;
let balance  = 0;
let direction = "";
let trend = "";

setLeverage(leverage);
// bitmexClosePosition();


const closePositionLimit = () => {
    var closePrice = direction == 'Buy' ? buyPrice + profitTarget : buyPrice - profitTarget;
    bitmexClosePositionLimit(closePrice);
}

const closePosition = (price, direction, openSize) => {
    bidSize = direction == 'Buy' ? -bidSize : bidSize;
    bitmexClosePosition(price, openSize);
}

const openOrder = (tradeDirection, price) => {
    direction = tradeDirection;
      console.log("\x07");
    if (!tradeOpen) {
        console.log(`Direction > ${direction}`);
        bitmexOpenOrder(bidSize, median, direction, (response) => {
            orderId = response.data.orderID;
            buyPrice = response.data.price;
            tradeOpen = true;
          //  closePositionLimit();
            console.log('Order opened! ID:', orderId, 'price:', buyPrice);
        });
    }
}

const tradeLogic = () => {
    // get order book data
    const rsi21Indicator = getRsiRange(21);
    const atrIndicator = getAtrRange()[0];
    trend = rsi21Indicator[0] > rsi21Indicator[1] ? 'UP' : 'DOWN';
    getBidSize();
    if (rsi21Indicator && atrIndicator) {
      //  console.log(`RSI 21: ${rsi21Indicator[0]} ATR: ${atrIndicator}`);
        getOrderBook(orderDepth, (response) => {
            var orderBookArray = response.data;
            const { askPrice, bidPrice, median } = getOrderBookValues(orderBookArray, orderDepth);
            //console.log('Bid '+ bidPrice + ' Ask ' + askPrice);
            var buyTotal = 0;
            var sellTotal = 0;
           
            // see if any positions open
            getPosition((positionResponse) => {
                // if no postiions open
                var openSize = positionResponse.data[0].currentQty;
                
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
                    //500 percent = 5 times more
                    if (buyRatio > 500 ){ //&& trend == 'UP'
                        openOrder('Buy', bidPrice);          
                    }
                    //20% = 5 times less
                    if (buyRatio < 20 ) { // && trend == 'DOWN')
                       openOrder('Sell', askPrice);
                    }
                    console.log('Current Price:', median,  ' Buy percentage:', buyRatio, ' Trend : ', trend, ' Balance: ' + balance);
                    console.log('==========================================================')
                } else {
                    tradeOpen = true;
                    if (openSize > 0) {
                        direction = 'Buy';
                    }
                    if (openSize < 0) {
                        direction = 'Sell';
                    }
                    var dollarMovement =  direction == 'Buy' ? median - buyPrice :  buyPrice - median;
                    console.log(direction , ' trade open at : ', buyPrice, ' Current Price:', median, 'Making:', dollarMovement );
                    console.log('==========================================================')
                    if (dollarMovement < -(profitTarget) || dollarMovement  > profitTarget) {
                        closePosition(bidPrice, direction, openSize);
                    }   
                }
            
            });
        }, err => console.log(err));
    }
};

function getBidSize() {
    getBalance((response) => {
        balance = (response.data.availableMargin / 100000000);
        bidSize = Math.round(((balance / 10) * leverage) * median); // 10% of balance * leverage to give btc value * current btc price to give dollar value
        bidSize = 100;
       // console.log('Balance: ' + balance);
    }, err => console.log(err));
}

// Params: candleSize, numCandles, atrPeriod, interval in seconds
startRangeDataLoop(15, 110, 50, 2);

setInterval(tradeLogic, 2 * 1000);