import { version } from '../../package.json';
import { ATR } from 'technicalindicators';
import { Router } from 'express';
import axios from 'axios';
import moment from 'moment';

import facets from './facets';
import { makeRequest as bitmexHttpRequest } from '../clients/bitmexHttp';
// import { Client } from 'coinbase';
// import secrets from '../secrets.json';

let closingPrices = [];
let atrData = {};
let hasMidPrice = false;
let tradeOpen = false;
let orderId = 0;
let buyPrice = 0;
let sellProfitPrice = 0;
let sellLossPrice = 0;
let ATRValue = 0;
let buyRatio = 0;
let highestBuyRatio = 0;
let lowestBuyRatio = 100;

const candleSize = 5;
const atrPeriod = 50;
const buyPeriod = 21;
const buyBuyPeriod = 50;
const bidSize = 1000;
const orderDepth = 35;
let median = 0;

let direction = "";
let trend = "";


// var client = new Client({'apiKey': secrets.apiKey, 'apiSecret': secrets.apiSecret});

bitmexHttpRequest('post', '/position/leverage', { symbol: 'XBTUSD', leverage: 100 }, (response) => {//
   console.log(response);
 });

// bitmexHttpRequest('post', '/order', { symbol: 'XBTUSD', orderQty: 100, ordType: 'Market' }, (response) => {
//     console.log(response);
// });

// bitmexHttpRequest('post', '/order', { symbol: 'XBTUSD', execInst: 'Close', ordType: 'Market' }, (response) => {
//     console.log(response);
// });

// bitmexHttpRequest('post', '/order', { symbol: 'XBTUSD', orderQty: 100, ordType: 'Market' }, (response) => {
//     console.log(response);
// });

// bitmexHttpRequest('get', '/position', null, (response) => {
//     console.log(response);
// });

const setClosePosition = () => {
    var closePrice = direction == 'Buy' ? buyPrice + 20 : buyPrice - 20;
    bitmexHttpRequest('post', '/order', { symbol: 'XBTUSD', execInst: 'Close', price:  closePrice}, (response) => {
        console.log('Position close set at :', response.data.price);
    });
}

const closePosition = () => {
<<<<<<< b1e09498037b6cc9740ff7055a7db68131c6eeb1
    bitmexHttpRequest('post', '/order', { symbol: 'XBTUSD', execInst: 'Close', ordType: 'Market' }, (response) => {
        console.log('Position closed:', 'Price:', response.data.price);
        orderId = null;
        tradeOpen = false;
=======
    var closePrice = direction == 'Buy' ? buyPrice + 20 : buyPrice - 20;
    bitmexHttpRequest('post', '/order', { symbol: 'XBTUSD', execInst: 'Close'}, (response) => {
        console.log('Position closed  at :', response.data.price);
>>>>>>> fixes and tweaks
    });
}

const openOrder = (tradeDirection) => {
    direction = tradeDirection;
    if (!tradeOpen) {
<<<<<<< b1e09498037b6cc9740ff7055a7db68131c6eeb1

        bitmexHttpRequest('post', '/order', { symbol: 'XBTUSD', orderQty: 10, ordType: 'Market'}, (response) => {
=======
        console.log(direction);
        bitmexHttpRequest('post', '/order', { symbol: 'XBTUSD', orderQty: bidSize, ordType: 'Market', side: direction}, (response) => {
>>>>>>> fixes and tweaks

            orderId = response.data.orderID;
            buyPrice = response.data.price;
            tradeOpen = true;
            setClosePosition();
            console.log('Order opened! ID:', orderId, 'price:', buyPrice);
        });
    }
}


const tradeLogic = () => {
       
    // get order book data
    axios.get('https://www.bitmex.com/api/v1/orderBook/L2?symbol=XBT&depth=' + orderDepth).then(response => {

        var orderBookArray = response.data;
        const askPrice = orderBookArray[orderDepth-1].price;
        const bidPrice =  orderBookArray[orderDepth].price;
        median = (bidPrice + askPrice) / 2
        console.log('Bid '+ bidPrice + ' Ask ' + askPrice);
        var buyTotal = 0;
        var sellTotal = 0;
<<<<<<< b1e09498037b6cc9740ff7055a7db68131c6eeb1

        for (var i = 0; i < orderBookArray.length; i++) {
            if (orderBookArray[i].side == "Buy"){
                buyTotal = buyTotal + orderBookArray[i].size;
            }
            if (orderBookArray[i].side == "Sell"){
                sellTotal = sellTotal + orderBookArray[i].size;
            }
        }

        buyRatio = Math.round((buyTotal/sellTotal) * 100);

        if (buyRatio > 500){
            openOrder('Buy');          
        }

        if (buyRatio < 20){
            openOrder('Sell');
        }

        if (tradeOpen) {
            var dollarMovement =  direction == 'Buy' ? median - buyPrice :  buyPrice - median;
            console.log('Making:', dollarMovement , ' dollars');
            console.log('==========================================================')
            if (dollarMovement > 8 || dollarMovement < -8) {
                 closePosition();
            }
        } else {
            console.log('Current Price:', median,  ' Buy percentage:', buyRatio );
            console.log('==========================================================')
        }
    }, err => console.log(err));

=======
        // see if any positions open
        bitmexHttpRequest('get', '/position',null, (positionResponse) => {
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
                if (buyRatio > 500 ){ //&& trend == "UP"
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
                console.log(direction , ' trade open at : ', buyPrice, ' Current Price:', median, 'Making:', dollarMovement );
                console.log('==========================================================')
                if (dollarMovement < -20 || dollarMovement  > 20) {
                    closePosition();
                }   
            }   
        });
    }, err => console.log(err));
>>>>>>> fixes and tweaks
};


setInterval( tradeLogic, 2 * 1000);


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
