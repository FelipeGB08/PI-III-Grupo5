const express = require('express');
const { configurarTrustProxy } = require('../../src/config/trustProxy');

describe('trust proxy', () => {
    test('confia somente no numero explicito de saltos em producao', () => {
        const app = express();
        const hops = configurarTrustProxy(app, {
            NODE_ENV: 'production',
            TRUST_PROXY_HOPS: '1',
        });

        expect(hops).toBe(1);
        expect(app.get('trust proxy')).toBe(1);
    });

    test('recusa configuracao ampla ou invalida', () => {
        expect(() => configurarTrustProxy(express(), {
            NODE_ENV: 'production',
            TRUST_PROXY_HOPS: '99',
        })).toThrow(/entre 0 e 5/);
    });
});
