const admin = require('firebase-admin');

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
        return admin.credential.cert(envServiceAccount);
    }

    return admin.credential.applicationDefault();
}

function getFirebaseMessaging() {
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: getCredential(),
            projectId: process.env.FIREBASE_PROJECT_ID || undefined,
        });
    }

    return admin.messaging();
}

module.exports = {
    getFirebaseMessaging,
};
