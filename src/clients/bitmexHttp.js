import { bitmexKey, bitmexSecret } from '../secrets';
import axios from 'axios';
import crypto from 'crypto';

const bitmexAxios = axios.create();
const isLive = true;
// Pre-compute the postBody so we can be sure that we're using *exactly* the same body in the request
// and in the signature. If you don't do this, you might get differently-sorted keys and blow the signature.

export function makeRequest(method, path, payload, cb) {
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

    if (isLive) {
        request(method, payload, `https://www.bitmex.com${path}`, cb);
    } else {
        request(method, payload, `https://testnet.bitmex.com${path}`, cb);
    }
}

function request(method, payload, url, cb) {
    switch(method) {
        case 'get': {
            bitmexAxios.get(url).then(response => {
                return cb(response);
            }, err => console.log(err))
            break;
        }

        case 'post': {
            bitmexAxios.post(url, payload).then(response => {
                return cb(response);
            }, err => console.log(err))
        }
    }
}