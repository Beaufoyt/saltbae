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
const bidSize = 10;

let direction = "";

// var client = new Client({'apiKey': secrets.apiKey, 'apiSecret': secrets.apiSecret});

bitmexHttpRequest('post', '/position/leverage', { symbol: 'XBTUSD', leverage: 1 }, (response) => {//
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


const closePosition = () => {
    bitmexHttpRequest('post', '/order', { symbol: 'XBTUSD', execInst: 'Close', ordType: 'Market' }, (response) => {
        console.log('Position closed:', 'Price:', response.data.price);
        orderId = null;
        tradeOpen = false;
    });
}

const openOrder = (tradeDirection) => {
    direction = tradeDirection;
    
    if (!tradeOpen) {

        bitmexHttpRequest('post', '/order', { symbol: 'XBTUSD', orderQty: 10, ordType: 'Market'}, (response) => {

            orderId = response.data.orderID;
            buyPrice = response.data.price;
            tradeOpen = true;
            console.log('Order opened! ID:', orderId, 'price:', buyPrice);
        });
    }
}


const tradeLogic = () => {
        // open logic here
    var orderDepth = 10;

    axios.get('https://www.bitmex.com/api/v1/orderBook/L2?symbol=XBT&depth=' + orderDepth).then(response => {

        var orderBookArray = response.data;
        const askPrice = orderBookArray[(orderDepth/2) -1].price;
        const bidPrice =  orderBookArray[orderDepth-1].price;
        const median = (bidPrice + askPrice) / 2

        var buyTotal = 0;
        var sellTotal = 0;

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

};

setInterval(tradeLogic, 2 * 1000);


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
