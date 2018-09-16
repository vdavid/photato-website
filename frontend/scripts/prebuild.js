const auth0 = require('auth0');
const axios = require('axios');
const authConfig = require('../src/_config').config;

// TODO fix branch with same name conflict.

const SITE_URL = process.env.URL;
const AUTH0_DOMAIN = authConfig.auth0.domain;
const AUTH0_CLIENT_ID = authConfig.auth0.clientId; // app to update
const AUTH0_CALLBACK_PATH = authConfig.auth0.callbackPath;

/* secrets. Must add to https://app.netlify.com/sites/{your-site}/settings/deploys */
const NETLIFY_API_TOKEN = process.env.NETLIFY_API_TOKEN;
const AUTH0_MANAGEMENT_CLIENT_ID = process.env.AUTH0_MANAGEMENT_CLIENT_ID;
const AUTH0_MANAGEMENT_CLIENT_SECRET = process.env.AUTH0_MANAGEMENT_CLIENT_SECRET;

const errMsg = `Unable to sync allowed callback urls with auth0 client.

Set these environment variables inside of your netlify deploy settings https://app.netlify.com/sites/{your-site}/settings/deploys

Doing so will automatically lock down allowed callback URLS in your auth0 client
for enhanced security`;

if (!NETLIFY_API_TOKEN) {
    console.log('NETLIFY_API_TOKEN environment variable not found.');
    console.log(errMsg);
    return false;
}

if (!AUTH0_MANAGEMENT_CLIENT_ID) {
    console.log('AUTH0_MANAGEMENT_CLIENT_ID environment variable not found.');
    console.log(errMsg);
    return false;
}

if (!AUTH0_MANAGEMENT_CLIENT_SECRET) {
    console.log('AUTH0_MANAGEMENT_CLIENT_SECRET environment variable not found.');
    console.log(errMsg);
    return false;
}

/* Automatically update auth0 client with netlify URLS */
getSiteId(SITE_URL).then((id) => {
    console.log(`Get live netlify urls for site ${id}`);
    const deployUrls = getDeployUrls(id);
    const branchUrls = getBranchUrls(id);
    const lastSixDeployUrls = getRecentDeployUrls(id);

    // return array of active urls
    return Promise.all([branchUrls, deployUrls, lastSixDeployUrls]).then(values => {
        return values.reduce((accumulator, currentValue) => {
            let acc = accumulator;
            if (currentValue && Array.isArray(currentValue)) {
                acc = accumulator.concat(currentValue);
            }
            return acc;
        }, []);
    });
}).then((urls) => {
    // use SSL urls only
    const netlifyCallbackUrls = urls.map((u) => {
        return `${u.ssl_url}${AUTH0_CALLBACK_PATH}`;
    });
    // get token from auth0 to allow for updating auth0 client urls
    getAuthClientToken(
        AUTH0_DOMAIN,
        AUTH0_MANAGEMENT_CLIENT_ID,
        AUTH0_MANAGEMENT_CLIENT_SECRET,
    ).then((accessToken) => {
        // connect to auth0 ManagementClient
        const auth0Management = new auth0.ManagementClient({
            token: accessToken,
            domain: AUTH0_DOMAIN,
        });

        const clientToUpdateId = {
            client_id: AUTH0_CLIENT_ID,
        };
        auth0Management.getClient(clientToUpdateId, (err, client) => {
            if (err) {
                console.log('auth0Management.getClient err', err);
            }
            // get current list and remove everything but localhost
            const callbackUrls = client.callbacks.filter((url) => {
                return url.match(/http:\/\/localhost/);
            }).concat(netlifyCallbackUrls);
            // pull duplicates out of array
            const finalCallbackUrls = callbackUrls.filter((item, pos) => {
                return callbackUrls.indexOf(item) === pos;
            });
            const data = {
                callbacks: finalCallbackUrls,
            };
            console.log('set allowed auth0 callback urls', finalCallbackUrls);
            auth0Management.updateClient(clientToUpdateId, data, (err, updatedClient) => {
                if (err) {
                    console.log('auth0Management.updateClient err', err);
                }
                console.log('updated client URLs!');
                console.log(updatedClient.callbacks);  // 'newClientName'
            });
        });
    });
});

/* get list of all netlify sites */
function getAllSites() {
    return new Promise(resolve => {
        axios({
            url: `https://api.netlify.com/api/v1/sites/?access_token\=${NETLIFY_API_TOKEN}`,
            method: 'get',
            headers: {
                'content-type': 'application/json',
            },
        }).then((response) => {
            resolve(response.data);
        }).catch((err) => {
            console.log(err);
        });
    });
}

// Get netlify site branch preview URLs
function getBranchUrls(siteId) {
    return new Promise(resolve => {
        axios({
            url: `https://api.netlify.com/api/v1/sites/${siteId}/deployed-branches?access_token\=${NETLIFY_API_TOKEN}`,
            method: 'get',
            headers: {
                'content-type': 'application/json',
            },
        }).then((response) => {
            const data = response.data.map((d) => {
                return {
                    url: d.url,
                    ssl_url: d.ssl_url,
                };
            });
            resolve(data);
        }).catch((err) => {
            console.log(err);
        });
    });
}

// Get netlify site deployed URLS
function getDeployUrls(siteId) {
    return new Promise(resolve => {
        axios({
            url: `https://api.netlify.com/api/v1/sites/${siteId}?access_token\=${NETLIFY_API_TOKEN}`,
            method: 'get',
            headers: {
                'content-type': 'application/json',
            },
        }).then((response) => {
            const data = [{
                url: response.data.url,
                ssl_url: response.data.ssl_url,
            }];
            resolve(data);
        }).catch((err) => {
            console.log(err);
        });
    });
}

// Get last 6 netlify deploy URLS
function getRecentDeployUrls(siteId) {
    return new Promise(resolve => {
        axios({
            url: `https://api.netlify.com/api/v1/sites/${siteId}/deploys?access_token\=${NETLIFY_API_TOKEN}`,
            method: 'get',
            headers: {
                'content-type': 'application/json',
            },
        }).then((response) => {
            let lastDeployUrls = [];
            if (response && response.data) {
                lastDeployUrls = response.data.slice(0, 6).filter((deploy) => {
                    return deploy.branch !== 'master';
                }).map((d) => {
                    return {
                        // branch: d.branch,
                        // url: d.url,
                        // ssl_url: d.ssl_url,
                        // deploy_url: d.deploy_url,
                        // deploy_ssl_url: d.deploy_ssl_url,
                        // created_at: d.created_at,
                        // updated_at: d.updated_at
                        url: d.deploy_url,
                        ssl_url: d.deploy_ssl_url,
                    };
                });
            }
            resolve(lastDeployUrls);
        }).catch((err) => {
            console.log(err);
        });
    });
}

// Get netlify site id from URL
function getSiteId(siteUrl) {
    return getAllSites().then((sites) => {
        const matchingSites = sites.filter((site) => {
            return site.ssl_url === siteUrl;
        });
        if (matchingSites && !matchingSites.length) {
            console.log(`no site matches ${siteUrl}`);
            return null;
        }
        return matchingSites[0].site_id;
    });
}

/* Get auth0 client token */
function getAuthClientToken(domain, clientId, secret) {
    return axios({
        url: `https://${domain}/oauth/token`,
        method: 'post',
        headers: {
            'content-type': 'application/json',
        },
        data: {
            "grant_type": "client_credentials",
            "client_id": clientId,
            "client_secret": secret,
            "audience": `https://serverlessqa.auth0.com/api/v2/`,
        },
    }).then((response) => {
        return response.data.access_token;
    }).catch((error) => {
        console.log(error);
    });
}

/*
debug
console.log('process.env.DEPLOY_URL', process.env.DEPLOY_URL)
console.log('process.env.DEPLOY_PRIME_URL', process.env.DEPLOY_PRIME_URL)
console.log('process.env.BRANCH', process.env.BRANCH)
console.log('COMMIT_REF', process.env.COMMIT_REF)
console.log('URL', process.env.URL)
console.log('auth0 config', authConfig)
*/
