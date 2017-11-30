import { version } from '../../package.json';
import { Router } from 'express';
import facets from './facets';
import { Client } from 'coinbase';
import secrets from '../secrets.json';

var client = new Client({'apiKey': secrets.apiKey, 'apiSecret': secrets.apiSecret});

export default ({ config, db }) => {
    let api = Router();

    console.log('made it');
    // mount the facets resource
    api.use('/facets', facets({ config, db }));

    // perhaps expose some API metadata at the root
    api.get('/historical-prices', (req, res) => {
        res.json({ version });
    });

    return api;
}
