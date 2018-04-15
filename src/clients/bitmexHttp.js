import { bitmexKey, bitmexSecret } from '../secrets';
import axios from 'axios';
import crypto from 'crypto';

const bitmexAxios = axios.create();
const isLive = true;
// Pre-compute the postBody so we can be sure that we're using *exactly* the same body in the request
// and in the signature. If you don't do this, you might get differently-sorted keys and blow the signature.

const authenticatedRequest = (method, path, payload, cb) => {
    payload = payload ? JSON.stringify(payload) : null;
    path = `/api/v1${path}`;

    const expires = new Date().getTime() + (60 * 1000);
    const signatureDetails = method.toUpperCase() + path + expires + (payload ? payload : '');
    var signature = crypto.createHmac('sha256', bitmexSecret).update(signatureDetails).digest('hex');

    bitmexAxios.defaults.headers = {
      'content-type' : 'application/json',
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      // This example uses the 'expires' scheme. You can also use the 'nonce' scheme. See
      // https://www.bitmex.com/app/apiKeysUsage for more details.
      'api-nonce': expires,
      'api-key': bitmexKey,
      'api-signature': signature
    };

    request(method, path, payload, cb);
}

const request = (method, path, payload, cb) => {
    bitmexAxios[method](`https://${isLive ? 'www' : 'testnet'}.bitmex.com${path}`, payload).then((response) => {
        return cb(response);
    }, (err) => console.log(`Saltbae Error: Method: ${method.toUpperCase()} path: ${path}`, err))
};

export const closePositionLimit = (amount, closePrice) => {
    authenticatedRequest('post', '/order', { symbol: 'XBTUSD', orderQty: amount, execInst: 'Close', price: closePrice}, (response) => {
        console.log('Position close set at:', response.data.price);
    });
};

export const closePosition = (callback) => {
    authenticatedRequest('post', '/order', { symbol: 'XBTUSD', execInst: 'Close'}, (response) => {
        console.log('Position closed at:', response.data.price);
        callback();
    });
}

export const stopMarket = (amount, price) => {
    authenticatedRequest('post', '/order', { symbol: 'XBTUSD', orderQty: amount, ordType: 'Stop', stopPx: price }, () => {
        console.log('Stop set for', amount, 'contracts at', price);
    });
}

export const takeProfitMarket = (amount, price) => {
    authenticatedRequest('post', '/order', { symbol: 'XBTUSD', orderQty: amount, ordType: 'MarketIfTouched', stopPx: price }, () => {
        console.log('Take profit set for', amount, 'contracts at', price);
    });
}

export const setLeverage = (amount) => {
    authenticatedRequest('post', '/position/leverage', { symbol: 'XBTUSD', leverage: amount }, () => {//
       console.log(`>>>> Leverage set at ${amount} <<<<`);
   });
};

export const openOrder = (bidSize, direction, cb) => {
    authenticatedRequest('post', '/order', { symbol: 'XBTUSD', orderQty: bidSize, ordType: 'Market', side: direction}, (response) => {
        cb(response);
    });
}

export const getPosition = (cb) => {
    authenticatedRequest('get', '/position', null, (response) => {
        cb(response);
    });
}

export const getAccountBalance = (callback) => {
    authenticatedRequest('get', '/user/wallet?currency=XBt', null,  (response) => {
        callback(response.data.amount);
    });
}

export const getOrderBook = (orderDepth, cb) => {
    delete bitmexAxios.defaults.headers['api-key'];
    delete bitmexAxios.defaults.headers['api-signature'];
    delete bitmexAxios.defaults.headers['api-nonce'];
    request('get', `/api/v1/orderBook/L2?symbol=XBT&depth=${orderDepth}`, null, cb);
};

export const getOrderBookValues = (orderBook, orderDepth) => {
    const askPrice = orderBook[orderDepth-1].price;
    const bidPrice = orderBook[orderDepth].price;
    const median = (bidPrice + askPrice) / 2;

    return {
        askPrice,
        bidPrice,
        median
    }
}
