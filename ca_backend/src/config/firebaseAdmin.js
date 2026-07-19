const {
    applicationDefault,
    cert,
    getApps,
    initializeApp,
} = require('firebase-admin/app');
const { getMessaging } = require('firebase-admin/messaging');

function getServiceAccountFromEnv() {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) return null;

    return {
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n'),
    };
}

function getCredential() {
    const envServiceAccount = getServiceAccountFromEnv();
    if (envServiceAccount) {
        return cert(envServiceAccount);
    }

    return applicationDefault();
}

function getFirebaseMessaging() {
    if (!getApps().length) {
        initializeApp({
            credential: getCredential(),
            projectId: process.env.FIREBASE_PROJECT_ID || undefined,
        });
    }

    return getMessaging();
}

module.exports = {
    getFirebaseMessaging,
};
