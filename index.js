const axios = require('axios');
const JWT = require('jsonwebtoken');

class Client {

    #clientID;
    #clientSecret;
    #orgID;
    #techAccount;
    #privateKey;
    #accessToken;
    #apiHost;
    #apiEndpoint;
    #imsHost;
    #jwtEndpoint;
    #oauthEndpoint;
    #scopes;

    constructor({
        clientID,
        clientSecret,
        orgID,
        techAccount,
        privateKey,
        apiHost = 'usermanagement.adobe.io',
        apiEndpoint = '/v2/usermanagement',
        imsHost = 'ims-na1.adobelogin.com',
        jwtEndpoint = '/ims/exchange/jwt',
        oauthEndpoint = '/ims/token/v2',
        scopes = ['ent_user_sdk'],
    }) {
        this.#clientID = clientID;
        this.#clientSecret = clientSecret;
        this.#orgID = orgID;
        this.#techAccount = techAccount;
        this.#privateKey = privateKey;
        this.#apiHost = apiHost;
        this.#apiEndpoint = apiEndpoint;
        this.#imsHost = imsHost;
        this.#jwtEndpoint = jwtEndpoint;
        this.#oauthEndpoint = oauthEndpoint;
        this.#scopes = scopes;
    }

    getJWT() {

        const exp = ((new Date()).getTime() / 1000) + (60 * 60 * 24);
        const payload = {
            exp,
            iss: this.#orgID,
            sub: this.#techAccount,
            aud: `https://${this.#imsHost}/c/${this.#clientID}`,
        };
        for (const scope of this.#scopes) {
            payload[`https://${this.#imsHost}/s/${scope}`] = true;
        }
        const jwt = JWT.sign(payload, this.#privateKey, { algorithm: 'RS256' });

        const options = {
            method: 'post',
            url: `https://${this.#imsHost}${this.#jwtEndpoint}`,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cache-Control': 'no-cache',
            },
            data: new URLSearchParams({
                client_id: this.#clientID,
                client_secret: this.#clientSecret,
                jwt_token: jwt,
            }),
        };
        return axios(options);

    }

    getAccessToken() {
        const options = {
            method: 'post',
            url: `https://${this.#imsHost}${this.#oauthEndpoint}`,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cache-Control': 'no-cache',
            },
            data: new URLSearchParams({
                grant_type: 'client_credentials',
                client_id: this.#clientID,
                client_secret: this.#clientSecret,
                scope: this.#scopes,
            }),
        };
        return axios(options);
    }

    reset() {
        this.#accessToken = null;
    }

    async authorize(renew = false) {
        const now = new Date();
        if (!renew && this.#accessToken && this.#accessToken.expires.getTime() > now.getTime()) return;
        const jwt = await this.getJWT();
        now.setTime(now.getTime() + jwt.data.expires - (1000 * 60 * 60)); // Renew an hour early
        this.#accessToken = {
            token: jwt.data.access_token,
            expires: now,
        };
    }

    async oAuthorize(renew = false) {
        this.#scopes = ['openid', 'AdobeID', 'user_management_sdk'];
        const now = new Date();
        if (!renew && this.#accessToken && this.#accessToken.expires.getTime() > now.getTime()) return;
        const auth = await this.getAccessToken();
        this.#accessToken = {
            token: auth.data.access_token,
            expires: new Date(Date.now() + (auth.data.expires_in * 1000)),
        };
    }

    async call(path, data, oauth = true) {
        if (oauth) {
            await this.oAuthorize();
        } else {
            await this.authorize();
        }
        const options = {
            method: data === undefined ? 'get' : 'post',
            url: `https://${this.#apiHost}${this.#apiEndpoint}${path}`,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'x-api-key': this.#clientID,
                'Authorization': `Bearer ${this.#accessToken.token}`,
            },
        };
        if (data !== undefined) options.data = data;
        return axios(options);
    }

    async getUserInformation(userID, oauth) {
        const res = await this.call(`/organizations/${this.#orgID}/users/${userID}`, undefined, oauth);
        if (res.data === undefined) throw new Error('Invalid API response');
        if (res.data.result !== 'success') return { err: new Error(`${res.data.result}: ${res.data.message}`) };
        return res.data.user;
    }

}

module.exports = {
    Client,
};
