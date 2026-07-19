jest.mock('firebase-admin/app', () => ({
    applicationDefault: jest.fn(),
    cert: jest.fn(),
    getApps: jest.fn(),
    initializeApp: jest.fn(),
}));

jest.mock('firebase-admin/messaging', () => ({
    getMessaging: jest.fn(),
}));

const {
    applicationDefault,
    cert,
    getApps,
    initializeApp,
} = require('firebase-admin/app');
const { getMessaging } = require('firebase-admin/messaging');
const { getFirebaseMessaging } = require('../../src/config/firebaseAdmin');

describe('firebaseAdmin', () => {
    const envOriginal = process.env;

    beforeEach(() => {
        process.env = { ...envOriginal };
        delete process.env.FIREBASE_PROJECT_ID;
        delete process.env.FIREBASE_CLIENT_EMAIL;
        delete process.env.FIREBASE_PRIVATE_KEY;

        getApps.mockReturnValue([]);
        applicationDefault.mockReturnValue('credencial-padrao');
        cert.mockReturnValue('credencial-service-account');
        getMessaging.mockReturnValue('messaging');
    });

    afterAll(() => {
        process.env = envOriginal;
    });

    test('inicializa com service account definida por variaveis de ambiente', () => {
        process.env.FIREBASE_PROJECT_ID = 'conecta-amauc';
        process.env.FIREBASE_CLIENT_EMAIL = 'firebase@example.com';
        process.env.FIREBASE_PRIVATE_KEY = 'linha-1\\nlinha-2';

        const messaging = getFirebaseMessaging();

        expect(cert).toHaveBeenCalledWith({
            projectId: 'conecta-amauc',
            clientEmail: 'firebase@example.com',
            privateKey: 'linha-1\nlinha-2',
        });
        expect(initializeApp).toHaveBeenCalledWith({
            credential: 'credencial-service-account',
            projectId: 'conecta-amauc',
        });
        expect(messaging).toBe('messaging');
    });

    test('usa Application Default Credentials sem service account completa', () => {
        process.env.FIREBASE_PROJECT_ID = 'conecta-amauc';

        getFirebaseMessaging();

        expect(applicationDefault).toHaveBeenCalledTimes(1);
        expect(cert).not.toHaveBeenCalled();
        expect(initializeApp).toHaveBeenCalledWith({
            credential: 'credencial-padrao',
            projectId: 'conecta-amauc',
        });
    });

    test('reutiliza app Firebase ja inicializado', () => {
        getApps.mockReturnValue([{ name: '[DEFAULT]' }]);

        getFirebaseMessaging();

        expect(initializeApp).not.toHaveBeenCalled();
        expect(getMessaging).toHaveBeenCalledTimes(1);
    });
});
